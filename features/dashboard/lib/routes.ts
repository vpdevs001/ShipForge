export const DASHBOARD_ROUTES = {
  overview: "/dashboard",
  requests: "/dashboard/requests",
  reviews: "/dashboard/reviews",
  repos: "/dashboard/repos",
  github: "/dashboard/github",
  billing: "/dashboard/billing",
  settings: "/dashboard/settings",
} as const;

export type DashboardRoute =
  (typeof DASHBOARD_ROUTES)[keyof typeof DASHBOARD_ROUTES];

export const DASHBOARD_NAV_ITEMS = [
  {
    title: "Overview",
    href: DASHBOARD_ROUTES.overview,
    icon: "layout-dashboard" as const,
  },
  {
    title: "Feature Requests",
    href: DASHBOARD_ROUTES.requests,
    icon: "chats" as const,
  },
  {
    title: "Pull Requests",
    href: DASHBOARD_ROUTES.reviews,
    icon: "git-branch" as const,
  },
  {
    title: "Repositories",
    href: DASHBOARD_ROUTES.repos,
    icon: "folder-git-2" as const,
  },
  {
    title: "GitHub App",
    href: DASHBOARD_ROUTES.github,
    icon: "github" as const,
  },
  {
    title: "Billing",
    href: DASHBOARD_ROUTES.billing,
    icon: "credit-card" as const,
  },
  {
    title: "Settings",
    href: DASHBOARD_ROUTES.settings,
    icon: "settings" as const,
  },
] as const;
