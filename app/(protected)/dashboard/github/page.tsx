import type { Metadata } from "next";

import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { GithubConnectCard } from "@/features/dashboard/components/github-connect-card";

export const metadata: Metadata = {
  title: "GitHub App · Dashboard",
};

export default function DashboardGithubPage() {
  return (
    <>
      <DashboardHeader
        title="GitHub App"
        description="Install or disconnect the reviewer app on your GitHub account."
      />
      <GithubConnectCard />
    </>
  );
}
