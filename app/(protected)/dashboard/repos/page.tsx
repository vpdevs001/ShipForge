import type { Metadata } from "next";

import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { ReposList } from "@/features/dashboard/components/repos-list";

export const metadata: Metadata = {
  title: "Repositories · Dashboard",
};

export default function DashboardReposPage() {
  return (
    <>
      <DashboardHeader
        title="Repositories"
        description="All public and private repositories available to the GitHub App."
      />
      <ReposList />
    </>
  );
}
