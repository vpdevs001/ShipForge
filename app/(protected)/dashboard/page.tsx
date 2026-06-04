import type { Metadata } from "next";

import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { OverviewContent } from "@/features/dashboard/components/overview-content";

export const metadata: Metadata = {
  title: "Overview · Dashboard",
};

export default function DashboardOverviewPage() {
  return (
    <>
      <DashboardHeader
        title="Overview"
        description="Summary of reviews and connected repositories."
      />
      <OverviewContent />
    </>
  );
}
