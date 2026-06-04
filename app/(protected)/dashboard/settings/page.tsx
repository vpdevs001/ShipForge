import type { Metadata } from "next";

import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { SettingsContent } from "@/features/dashboard/components/settings-content";

export const metadata: Metadata = {
  title: "Settings · Dashboard",
};

export default function DashboardSettingsPage() {
  return (
    <>
      <DashboardHeader
        title="Settings"
        description="Manage your profile and subscription."
      />
      <SettingsContent />
    </>
  );
}
