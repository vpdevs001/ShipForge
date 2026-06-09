---
name: chai-code-style
description: >-
  Writes and refactors code in Suraj's preferred style for this Next.js app:
  simple, beginner-friendly, feature-folder structure, minimal dependencies,
  early returns over ternaries, and no over-engineering. Use when implementing
  features, integrating packages, refactoring logic, or when the user mentions
  code taste, simplicity, or steps-to-integrate-new-feature.md.
---

# Chai Code Style

Code should read like a clear tutorial — a junior dev should follow it without decoding nested logic.

## Before writing code

1. Read [steps-to-integrate-new-feature.md](../../../steps-to-integrate-new-feature.md) when adding a new feature or integration.
2. Research first: official docs, GitHub examples, one focused blog post. Pick **one** npm package that solves the job — do not stack overlapping libraries.
3. Read the package's implementation patterns before wiring it in.
4. Read surrounding files in this repo and match naming, imports, and folder layout.

## Feature workflow

```
Research → install one package → create feature folder → wire UI + server → done
```

Checklist:

- [ ] Feature lives under `features/<name>/` (not scattered in `lib/` unless shared infra)
- [ ] Only the files the feature actually needs (types, utils, server, components, hooks)
- [ ] Thin `lib/actions/*.ts` server actions that delegate to `features/*/server/`
- [ ] API routes in `app/api/` only when the client must call HTTP directly (e.g. infinite scroll fetch)
- [ ] Env vars server-side only; never expose secrets to client bundles

## Folder layout

```
features/<feature>/
├── types/           # Feature-specific types
├── utils/           # Pure helpers, singletons (e.g. getGithubApp)
├── server/          # DB + external API logic ("use server" callers import from here)
└── components/      # Feature UI (or under features/dashboard/components if dashboard-only)

lib/actions/         # Thin server actions: auth check → call feature server → redirect
app/api/<feature>/   # Route handlers when client fetch is required
```

Cross-feature types shared by dashboard UI live in `features/dashboard/lib/types.ts`.

## Core principles

### Simple and beginner-friendly

- Prefer **named functions** over inline logic, ternaries, and chained `&&` / `||`.
- Use **early `if` returns** instead of nested `if/else` blocks.
- Extract small helpers when a function does more than one obvious thing (`getAccountLogin`, `buildDisconnectedStatus`, `doesRepoMatchFilter`).
- One clear export per file for the main capability; private helpers stay unexported above it.
- Constants at the top (`REPOS_PER_PAGE`), not magic numbers inline.

### Do not over-engineer

- No abstractions for one-time use (no generic factories, no extra wrapper layers).
- No defensive error handling on every line — only where failure is real and user-facing (auth redirect, fetch failure message).
- No try/catch unless you have something meaningful to do with the error.
- No tests unless asked or they cover real behavior worth guarding.
- No comments on obvious code; comments only for non-obvious business rules.

### Minimal library usage

- Use the **simplest API** of a library. Example: TanStack Query → `useInfiniteQuery` with `queryKey`, `queryFn`, `getNextPageParam`, `initialPageParam` only. No prefetch, suspense, or optimistic updates unless asked.
- One package per concern (`octokit` for GitHub App, not octokit + multiple auth helpers).

### Next.js conventions

- `"use server"` only in `lib/actions/` and route handlers where needed.
- `import "server-only"` in server-only modules like `lib/db.ts`.
- `redirect()` for auth failures in server actions — don't return error objects the UI must parse.
- Read `AGENTS.md` and `node_modules/next/dist/docs/` when unsure about Next.js APIs in this repo.

## Code patterns

### Prefer early returns over ternaries

```typescript
// Good
function getRepoVisibility(isPrivate?: boolean): "public" | "private" {
  if (isPrivate) {
    return "private";
  }
  return "public";
}

// Avoid
const visibility = isPrivate ? "private" : "public";
```

### Named builders for repeated shapes

```typescript
function buildDisconnectedStatus(): GithubInstallationStatus {
  return { connected: false, accountLogin: null, installedAt: null };
}
```

### Thin server actions

```typescript
"use server";

export async function disconnectGithubApp() {
  const session = await getServerSession();
  if (!session) {
    redirect("/sign-in");
  }
  await deleteInstallation(session.user.id);
  redirect(DASHBOARD_ROUTES.github);
}
```

### Singleton for expensive clients

```typescript
let githubApp: App | null = null;

export function getGithubApp() {
  if (!githubApp) {
    githubApp = new App({ /* env */ });
  }
  return githubApp;
}
```

### React components: split by responsibility

- Data fetching hook at top of client component.
- Small filter/match helpers as plain functions above the component.
- Sub-components for table body states (loading / error / empty / data) using plain `if` blocks, not nested ternaries in JSX.

## Imports

- Use `@/` path aliases.
- Order: external packages → internal types → internal modules → UI components.
- `import type` for type-only imports.

## What to avoid

| Avoid | Prefer |
|-------|--------|
| Nested ternaries in JSX or logic | Named helper + early return |
| `foo ? bar : baz` for multi-step decisions | `if` blocks |
| Generic `utils.ts` dumping ground | Feature-scoped `utils/` |
| Multiple packages for one integration | One well-chosen package |
| Returning `{ error: string }` from actions | `redirect()` or throw on real failures |
| Over-abstracted hooks | Inline `useInfiniteQuery` with simple options |
| Editing unrelated files | Smallest diff that solves the task |

## Additional examples

See [examples.md](examples.md) for before/after refactors from this codebase.
