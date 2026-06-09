# Code Style Examples

Concrete patterns from this repo.

## Installation status — step-by-step account lookup

```typescript
function getAccountLogin(
  account: { login?: string; slug?: string } | null | undefined
): string | null {
  if (!account) {
    return null;
  }
  if ("login" in account && account.login) {
    return account.login;
  }
  if (account.slug) {
    return account.slug;
  }
  return null;
}
```

Not: `account?.login ?? account?.slug ?? null` chained with optional types the reader must untangle.

## Callback URL — helper instead of inline ternary

```typescript
function buildSignInCallbackUrl(installationId: string | null): string {
  if (installationId) {
    return `/api/github/callback?installation_id=${installationId}`;
  }
  return DASHBOARD_ROUTES.github;
}
```

## Repos pagination — minimal server + client split

**Server** (`features/github/server/repos.ts`): one function per page, explicit `hasMore`.

**Client** (`features/dashboard/components/repos-list.tsx`):

```typescript
const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
  useInfiniteQuery({
    queryKey: ["installation-repos"],
    queryFn: ({ pageParam }) => fetchReposPage(pageParam),
    initialPageParam: 1,
    getNextPageParam,
  });
```

No `placeholderData`, `select`, `staleTime` tuning, or custom cache layers unless asked.

## GitHub integration — minimal file set

What was enough for GitHub App connect + list repos:

```
features/github/
├── types/github.ts
├── utils/github-app.ts      # getGithubApp, getGithubInstallUrl
└── server/
    ├── installation.ts      # save, delete, status
    └── repos.ts             # paginated fetch

lib/actions/github.ts        # disconnectGithubApp
app/api/github/callback/     # OAuth-style callback
app/api/github/repos/        # client fetch for infinite scroll
```

No separate `api/`, `services/`, `repositories/`, or `dto/` layers.

## Table UI — state sub-component with plain if blocks

```typescript
function ReposTableBody({ isLoading, isError, repos }: Props) {
  if (isLoading) {
    return <TableRow>...</TableRow>;
  }
  if (isError) {
    return <TableRow>...</TableRow>;
  }
  if (repos.length === 0) {
    return <TableRow>...</TableRow>;
  }
  return (
    <>
      {repos.map((repo) => (
        <TableRow key={repo.id}>...</TableRow>
      ))}
    </>
  );
}
```

Not: `{isLoading ? ... : isError ? ... : repos.length === 0 ? ... : ...}` in one expression.
