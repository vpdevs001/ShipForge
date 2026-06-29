/**
 * Dashboard-specific layout — sidebar shell and React Query provider.
 *
 * Runs after the parent `(protected)` layout auth check. Loads subscription
 * plan label for the sidebar user menu and wraps pages in `DashboardShell`.
 */

import { requireAuth } from "@/features/auth/utils/require-auth";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  return (
    <DashboardShell user={session.user} plan="Pro">
      {children}
    </DashboardShell>
  );
}
