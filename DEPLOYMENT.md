# Deploying ShipForge — Hostinger KVM 2 + Docker + Caddy + GitHub Actions

This sets up `shipforge.vedpandey.in` on a Hostinger KVM 2 VPS: Postgres,
the app, and Caddy (automatic HTTPS) all run as Docker containers, and
every push to `main` that passes CI rebuilds and redeploys automatically
over SSH.

## How it fits together

```
GitHub push to main
  → CI job (type-check, lint)
  → deploy job SSHes into the VPS
  → runs scripts/deploy.sh on the VPS:
      git pull → docker build → run migrations → docker compose up -d
```

No image registry is involved — the VPS builds the image itself from the
pulled source, which is why `appleboy/ssh-action` (not a registry push) is
the deploy mechanism.

---

## 1. Provision the VPS (hPanel)

1. **hPanel → VPS → your KVM 2 plan → Setup** (skip this if it's already
   provisioned).
2. **Operating system**: choose the **Applications** or **OS** tab and pick
   a clean **Ubuntu 24.04 LTS** image — not one of Hostinger's
   pre-bundled templates (CyberPanel, AI Assistant, etc.). Those install a
   web/control panel that will fight with Docker + Caddy for ports 80/443.
3. **SSH key**: while still in the setup wizard, Hostinger lets you paste a
   public key to install during provisioning — do this now if you have one
   ready (see step 2 below), it saves a password-auth round trip.
4. Wait for provisioning (a few minutes), then note the **public IPv4
   address** shown on the VPS Overview page.

If you ever get locked out, hPanel's **Terminal** button (top right of the
VPS Overview page) opens a browser-based root shell with no SSH client
needed — useful as a recovery path throughout this guide.

---

## 2. Generate a deploy SSH key

On your **local machine**:

```bash
ssh-keygen -t ed25519 -f shipforge_deploy_key -N ""
```

If you didn't add it during provisioning (step 1.3), add it now:

```bash
ssh-copy-id -i shipforge_deploy_key.pub root@<vps-ip>
```

If `ssh-copy-id` isn't available (e.g. Windows without WSL), open the
hPanel **Terminal**, and manually append the contents of
`shipforge_deploy_key.pub` to `~/.ssh/authorized_keys`.

Keep the **private** key (`shipforge_deploy_key`) — its contents go into
the `VPS_SSH_KEY` GitHub secret in step 6. Delete the local copy afterward.

---

## 3. Harden SSH + open the firewall

SSH in as root and run through this once:

```bash
ssh root@<vps-ip>

# Disable password auth now that key auth works — confirm key login
# succeeds in a SEPARATE terminal before closing this session.
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
systemctl restart ssh

# Create a dedicated, non-root deploy user
adduser --disabled-password --gecos "" deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
```

**Firewall** — Hostinger VPS plans have their own firewall layer in
**hPanel → VPS → Manage → Security → Firewall**, separate from the OS-level
one. Create (or attach) a firewall rule set there allowing inbound:

| Port                         | Protocol | Purpose                                   |
| ---------------------------- | -------- | ----------------------------------------- |
| 22 (or your custom SSH port) | TCP      | SSH                                       |
| 80                           | TCP      | HTTP (Let's Encrypt challenge + redirect) |
| 443                          | TCP      | HTTPS                                     |

This hPanel firewall sits in front of the VPS at the network level — `ufw`
on the box itself is optional on top of it, but if you do enable `ufw`,
make sure SSH is allowed before turning it on, or you'll lock yourself out.

---

## 4. DNS — point the subdomain at the VPS (hPanel)

Since `vedpandey.in` is a Hostinger-managed domain, DNS lives in the same
panel as the VPS:

1. **hPanel → Domains → vedpandey.in → DNS / Nameservers → DNS Zone
   Editor**.
2. Add a record:
   - Type: `A`
   - Name: `shipforge`
   - Points to: `<vps-ip>`
   - TTL: leave default (or 300/3600, doesn't matter much)
3. Save. Propagation is usually fast on Hostinger's own nameservers
   (minutes), but give it up to an hour before assuming something's wrong.

Verify before moving on:

```bash
dig +short shipforge.vedpandey.in
# should print the VPS's IPv4 address
```

Caddy's automatic HTTPS (step 6) depends on this resolving correctly —
don't start Caddy until `dig` returns the right IP.

---

## 5. Install Docker, clone the repo, configure `.env`

```bash
ssh deploy@<vps-ip>

# Docker + Compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

git clone https://github.com/<your-username>/shipforge.git
cd shipforge
```

This path (`/home/deploy/shipforge`) is what goes in the `DEPLOY_PATH`
GitHub secret in step 6.

```bash
cp .env.production.example .env
nano .env   # fill in every value — see comments in the file
```

Generate a strong Postgres password and `BETTER_AUTH_SECRET`:

```bash
openssl rand -base64 32
```

### First deploy (manual, to confirm everything works before wiring CI)

```bash
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f caddy
```

Caddy will attempt to provision a TLS certificate as soon as it starts —
watch the logs for `certificate obtained successfully`. Once that's done,
`https://shipforge.vedpandey.in` should load the app.

---

## 6. GitHub repository secrets

Settings → Secrets and variables → Actions → New repository secret:

| Secret         | Value                                           |
| -------------- | ----------------------------------------------- |
| `VPS_HOST`     | The VPS's IPv4 address (from hPanel)            |
| `VPS_USERNAME` | `deploy`                                        |
| `VPS_SSH_KEY`  | Contents of the private key generated in step 2 |
| `VPS_PORT`     | `22` (or your custom SSH port)                  |
| `DEPLOY_PATH`  | `/home/deploy/shipforge`                        |

That's all the workflow needs — application secrets (`OPENAI_API_KEY`,
`DATABASE_URL`, etc.) live only in the VPS's `.env` file, never in GitHub.

---

## 7. Point your external services at the production domain

These are one-time updates in each service's own dashboard, not in code:

- **GitHub App** (`github.com/settings/apps/ship-forge-reviewer`):
  - Webhook URL → `https://shipforge.vedpandey.in/api/github/webhook`
  - Callback URL / Post-installation URL →
    `https://shipforge.vedpandey.in/api/github/callback`
- **GitHub OAuth App** — same callback domain update if you're still on a
  separate OAuth app; if you migrated to the GitHub App's own OAuth
  credentials (as done earlier), this is the same app as above.
- **Inngest** (`app.inngest.com`) — sync your app at
  `https://shipforge.vedpandey.in/api/inngest` (same flow as the ngrok
  step during local dev, just with the real domain).
- **Razorpay** — webhook URL →
  `https://shipforge.vedpandey.in/api/razorpay/webhook`

---

## 8. Ongoing deploys

From here on, every push to `main` that passes the `ci` job triggers the
`deploy` job automatically — no manual steps. To watch a deploy happen:

```bash
# on the VPS, tail the app's logs during/after a deploy
docker compose -f docker-compose.prod.yml logs -f app
```

### Rolling back

```bash
# on the VPS
cd /home/deploy/shipforge
git log --oneline -5        # find the commit to roll back to
git reset --hard <commit-sha>
bash scripts/deploy.sh
```

### Manually triggering a deploy without a new commit

Re-run the `deploy` job from the GitHub Actions UI (Actions tab → select
the latest successful run → "Re-run jobs"), or SSH in and run
`bash scripts/deploy.sh` directly.

---

## 9. What `scripts/deploy.sh` actually does

1. `git fetch` + hard reset to `origin/main` — the VPS checkout always
   matches `main` exactly, no local drift.
2. Rebuilds the `app` image (Docker layer caching makes this fast unless
   `package.json`/`bun.lock` changed).
3. Runs `bun run db:migrate` in a one-off container built from the
   `builder` stage (has the full toolchain, unlike the slim runtime image).
4. `docker compose up -d` — recreates only the containers whose image
   actually changed; Postgres and Caddy are untouched unless their own
   config changed.
5. Prunes dangling old images so disk usage doesn't grow unbounded.

---

## 10. Notes specific to Hostinger KVM 2

- **8 GB RAM / 2 vCPU / 100 GB NVMe** is comfortable headroom for this
  stack (Postgres + Next.js + Caddy) at low-to-moderate traffic. The
  Postgres container has no memory limit set in `docker-compose.prod.yml`;
  add one (`mem_limit:`) if you ever run other workloads on the same box.
- Hostinger's **hPanel Firewall** (step 3) is enforced at the hypervisor
  level, separate from anything you configure inside the VM — if
  `https://shipforge.vedpandey.in` times out but the app works when you
  curl `localhost:3000` from inside the VPS, check the hPanel firewall
  rules first, before debugging Caddy or Docker.
- Hostinger doesn't snapshot or back up your data automatically on KVM
  plans — see the backup note below.

## 11. What's NOT covered here

- **Database backups** — `postgres_data` is a named Docker volume with no
  backup strategy configured. At minimum, set up a cron job running
  `docker exec <postgres-container> pg_dump ...` to an off-VPS location
  (Hostinger also sells optional VPS backups/snapshots in hPanel if you'd
  rather not manage this yourself) before relying on this in any serious
  capacity.
- **Zero-downtime deploys** — `docker compose up -d` briefly stops and
  recreates the `app` container; there's a few seconds of downtime per
  deploy. Fine for early-stage usage; if that matters later, look at
  blue-green via two app containers behind Caddy or a tool like Kamal.
- **Horizontal scaling** — this is a single-VPS, single-container setup.
  Fine until the VPS itself becomes the bottleneck — Hostinger's larger
  KVM plans (4/8) are a vertical-scaling option before reaching for
  multi-server architecture.
