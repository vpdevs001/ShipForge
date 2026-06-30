# Deploying ShipForge — VPS + Docker + Caddy + GitHub Actions

This sets up `shipforge.vedpandey.in` on a single VPS: Postgres, the app, and
Caddy (automatic HTTPS) all run as Docker containers, and every push to
`main` that passes CI rebuilds and redeploys automatically over SSH.

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

## 1. One-time VPS setup

SSH into a fresh VPS (Ubuntu 22.04/24.04 assumed) as a user with sudo access.

```bash
# Install Docker + the Compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Create a dedicated deploy user (recommended over using root)
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy
```

### DNS

Point an A record for `shipforge.vedpandey.in` at the VPS's public IP
before starting Caddy — it needs to resolve correctly for Let's Encrypt's
HTTP-01 challenge to succeed.

### Clone the repo

```bash
sudo su - deploy
git clone https://github.com/<your-username>/shipforge.git
cd shipforge
```

This path (e.g. `/home/deploy/shipforge`) is what you'll put in the
`DEPLOY_PATH` GitHub secret below.

### Create the production `.env`

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

## 2. Generate a deploy SSH key

On your **local machine** (not the VPS):

```bash
ssh-keygen -t ed25519 -f shipforge_deploy_key -N ""
```

Add the **public** key to the VPS:

```bash
ssh-copy-id -i shipforge_deploy_key.pub deploy@<vps-ip>
# or manually append shipforge_deploy_key.pub to
# /home/deploy/.ssh/authorized_keys on the VPS
```

Keep the **private** key (`shipforge_deploy_key`) — its contents go into
the `VPS_SSH_KEY` GitHub secret below. Delete the local copy afterward.

---

## 3. GitHub repository secrets

Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|---|---|
| `VPS_HOST` | The VPS's IP address or hostname |
| `VPS_USERNAME` | `deploy` |
| `VPS_SSH_KEY` | Contents of the private key generated above |
| `VPS_PORT` | `22` (or your custom SSH port) |
| `DEPLOY_PATH` | `/home/deploy/shipforge` |

That's all the workflow needs — application secrets (`OPENAI_API_KEY`,
`DATABASE_URL`, etc.) live only in the VPS's `.env` file, never in GitHub.

---

## 4. Point your external services at the production domain

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

## 5. Ongoing deploys

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

## 6. What `scripts/deploy.sh` actually does

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

## 7. Notes on what's NOT covered here

- **Database backups** — `postgres_data` is a named Docker volume with no
  backup strategy configured. At minimum, set up a cron job running
  `docker exec <postgres-container> pg_dump ...` to an off-VPS location
  before relying on this in any serious capacity.
- **Zero-downtime deploys** — `docker compose up -d` briefly stops and
  recreates the `app` container; there's a few seconds of downtime per
  deploy. Fine for early-stage usage; if that matters later, look at
  blue-green via two app containers behind Caddy or a tool like Kamal.
- **Horizontal scaling** — this is a single-VPS, single-container setup.
  Fine until the VPS itself becomes the bottleneck.
