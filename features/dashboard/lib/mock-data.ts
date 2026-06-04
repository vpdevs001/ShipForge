import type { DashboardRepo } from "@/features/dashboard/lib/types";

export const MOCK_REPOS: DashboardRepo[] = [
  {
    id: "1",
    name: "chai-ai-code-reviewer",
    fullName: "acme/chai-ai-code-reviewer",
    visibility: "private",
    defaultBranch: "main",
    updatedAt: "2026-06-03T14:22:00Z",
    language: "TypeScript",
    stars: 12,
  },
  {
    id: "2",
    name: "design-system",
    fullName: "acme/design-system",
    visibility: "public",
    defaultBranch: "main",
    updatedAt: "2026-06-01T09:10:00Z",
    language: "TypeScript",
    stars: 48,
  },
  {
    id: "3",
    name: "api-gateway",
    fullName: "acme/api-gateway",
    visibility: "private",
    defaultBranch: "develop",
    updatedAt: "2026-05-28T18:45:00Z",
    language: "Go",
    stars: 5,
  },
  {
    id: "4",
    name: "docs",
    fullName: "acme/docs",
    visibility: "public",
    defaultBranch: "main",
    updatedAt: "2026-05-20T11:00:00Z",
    language: "MDX",
    stars: 3,
  },
];

export const MOCK_ACTIVITY = [
  {
    repo: "acme/chai-ai-code-reviewer",
    pr: "#42",
    status: "approved" as const,
    time: "2 hours ago",
  },
  {
    repo: "acme/design-system",
    pr: "#18",
    status: "changes requested" as const,
    time: "5 hours ago",
  },
  {
    repo: "acme/api-gateway",
    pr: "#7",
    status: "rate limited" as const,
    time: "Yesterday",
  },
];
