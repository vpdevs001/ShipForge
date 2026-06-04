import type { ComponentType } from "react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  FolderGit2Icon,
  GitPullRequestIcon,
} from "lucide-react";

import { GithubIcon } from "@/features/dashboard/components/icons/github-icon";
import { MOCK_ACTIVITY, MOCK_REPOS } from "@/features/dashboard/lib/mock-data";
import {
  statusBadge,
  statusBadgeClass,
} from "@/features/dashboard/lib/status-styles";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ACTIVITY_STATUS = {
  approved: { label: "Approved", tone: "success" as const },
  "changes requested": { label: "Changes requested", tone: "warning" as const },
  "rate limited": { label: "Rate limited", tone: "danger" as const },
};

export function OverviewContent() {
  const publicCount = MOCK_REPOS.filter((r) => r.visibility === "public").length;
  const privateCount = MOCK_REPOS.filter((r) => r.visibility === "private").length;

  const stats: {
    title: string;
    value: string;
    description: string;
    icon: ComponentType<{ className?: string }>;
    accent?: keyof typeof statusBadgeClass;
  }[] = [
    {
      title: "Repositories",
      value: String(MOCK_REPOS.length),
      description: `${publicCount} public · ${privateCount} private`,
      icon: FolderGit2Icon,
      accent: "info",
    },
    {
      title: "Reviews this week",
      value: "24",
      description: "Across connected repos",
      icon: GitPullRequestIcon,
    },
    {
      title: "GitHub App",
      value: "Connected",
      description: "Installation active",
      icon: GithubIcon,
      accent: "success",
    },
    {
      title: "Pass rate",
      value: "92%",
      description: "Last 30 days",
      icon: CheckCircle2Icon,
      accent: "success",
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className={cn(
              stat.accent === "success" && "border-green-500/25",
              stat.accent === "info" && "border-blue-500/25"
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon
                className={cn(
                  "size-4",
                  stat.accent === "success" && "text-green-600 dark:text-green-400",
                  stat.accent === "info" && "text-blue-600 dark:text-blue-400",
                  !stat.accent && "text-muted-foreground"
                )}
              />
            </CardHeader>
            <CardContent>
              <p
                className={cn(
                  "text-2xl font-semibold tracking-tight",
                  stat.accent === "success" && "text-green-700 dark:text-green-400",
                  stat.accent === "info" && "text-blue-700 dark:text-blue-400"
                )}
              >
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="flex flex-row items-start gap-3 pb-2">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <CardTitle className="text-sm text-amber-800 dark:text-amber-300">
              Rate limit notice
            </CardTitle>
            <CardDescription>
              You have used 80% of your monthly review quota. Upgrade to Pro for
              higher limits.
            </CardDescription>
          </div>
          <span className={statusBadge("warning", "ml-auto shrink-0")}>
            80% used
          </span>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>
            Latest AI review summaries from your repositories.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {MOCK_ACTIVITY.map((item) => {
            const config = ACTIVITY_STATUS[item.status];

            return (
              <div
                key={`${item.repo}-${item.pr}`}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4 last:border-0 last:pb-0"
              >
                <div>
                  <p className="text-xs font-medium">
                    {item.repo}{" "}
                    <span className="text-muted-foreground">{item.pr}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
                <span className={statusBadge(config.tone)}>{config.label}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
