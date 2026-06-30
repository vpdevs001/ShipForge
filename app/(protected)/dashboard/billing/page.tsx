/**
 * Billing page — workspace plan, token usage, and subscription management.
 *
 * Shows:
 *  - Current plan (Free / Pro) with feature list
 *  - Monthly AI review usage with visual progress bar
 *  - Upgrade or cancel subscription actions
 *
 * Route: /dashboard/billing
 * Server Component — subscription and usage data loaded server-side.
 */

import { requireAuth } from "@/features/auth/utils/require-auth";
import { getUserSubscription } from "@/features/billing/server/subscription";
import { getUsageSummary, FREE_MONTHLY_LIMIT } from "@/features/billing/server/usage";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { PLAN_DETAILS } from "@/features/settings/lib/plan-details";
import { statusBadge } from "@/features/dashboard/lib/status-style";
import { UpgradeButton } from "@/features/billing/components/upgrade-button";
import { CancelSubscriptionButton } from "@/features/billing/components/cancel-subscription-button";
import {
  CheckIcon,
  LightningIcon,
  ShieldCheckIcon,
  CreditCardIcon,
} from "@phosphor-icons/react/ssr";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatRenewal(renewsAt: string | null): string | null {
  if (!renewsAt) return null;
  return format(new Date(renewsAt), "MMMM d, yyyy");
}

// ── page ─────────────────────────────────────────────────────────────────────

export default async function BillingPage() {
  const session = await requireAuth();

  const [subscription, usage] = await Promise.all([
    getUserSubscription(session.user.id),
    getUsageSummary(session.user.id),
  ]);

  const planDetails = PLAN_DETAILS[subscription.plan];
  const isActive =
    subscription.status === "active" || subscription.status === "trialing";
  const renewalDate = formatRenewal(subscription.renewsAt);

  // Usage percentage (cap at 100 to avoid overflow on Pro unlimited plan)
  const usagePct =
    usage.limit != null
      ? Math.min(100, Math.round((usage.used / usage.limit) * 100))
      : null;

  return (
    <div className="flex flex-1 flex-col">
      <DashboardHeader
        title="Billing"
        description="Manage your workspace plan and monitor token usage"
      />

      <div className="flex flex-1 flex-col gap-6 p-6 max-w-3xl">
        {/* ── Current plan card ──────────────────────────────────────── */}
        <div
          className={cn(
            "rounded-lg border bg-card",
            isActive ? "border-green-500/30" : "border-border"
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-4 p-5">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <CreditCardIcon className="size-5 text-muted-foreground" />
                <h2 className="font-heading font-semibold text-foreground">
                  {planDetails.label} Plan
                </h2>
                <span
                  className={statusBadge(
                    subscription.status === "active" ||
                      subscription.status === "trialing"
                      ? "success"
                      : "neutral"
                  )}
                >
                  {subscription.status}
                </span>
              </div>
              {renewalDate && (
                <p className="text-xs text-muted-foreground">
                  {subscription.status === "active"
                    ? `Renews ${renewalDate}`
                    : `Access until ${renewalDate}`}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {subscription.plan === "free" && <UpgradeButton />}
              {subscription.plan === "pro" && (
                <CancelSubscriptionButton
                  disabled={subscription.status === "canceled"}
                />
              )}
            </div>
          </div>

          {/* Feature list */}
          <div className="border-t border-border px-5 py-4">
            <ul className="flex flex-col gap-2">
              {planDetails.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <CheckIcon className="size-4 text-primary shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Usage card ─────────────────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LightningIcon className="size-5 text-primary" />
              <h2 className="font-heading font-semibold text-foreground">
                AI Review Usage — This Month
              </h2>
            </div>
            <span className="font-mono text-sm text-foreground">
              {usage.used}
              {usage.limit != null ? ` / ${usage.limit}` : " reviews"}
            </span>
          </div>

          {/* Progress bar (only shown on Free plan with a limit) */}
          {usagePct != null && (
            <div className="mt-4">
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-2 rounded-full transition-all",
                    usagePct >= 90
                      ? "bg-red-500"
                      : usagePct >= 70
                      ? "bg-amber-500"
                      : "bg-primary"
                  )}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                <span>{usagePct}% used</span>
                <span>{usage.limit! - usage.used} remaining</span>
              </div>

              {usagePct >= 80 && subscription.plan === "free" && (
                <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                  <ShieldCheckIcon className="size-4 mt-0.5 shrink-0 text-amber-500" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    You&apos;re approaching your monthly limit. Upgrade to Pro
                    for unlimited AI code reviews.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Pro unlimited message */}
          {usage.limit == null && (
            <p className="mt-3 text-xs text-muted-foreground">
              Pro plan: unlimited AI reviews. {usage.used} completed this month.
            </p>
          )}
        </div>

        {/* ── Plan comparison table ───────────────────────────────────── */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-3">
            <h2 className="font-heading text-sm font-semibold">
              Plan Comparison
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Feature
                </th>
                <th className="px-5 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Free
                </th>
                <th className="px-5 py-3 text-center text-xs font-medium text-primary uppercase tracking-wider">
                  Pro
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                {
                  feature: "AI code reviews / month",
                  free: `${FREE_MONTHLY_LIMIT}`,
                  pro: "Unlimited",
                },
                {
                  feature: "Feature request pipeline",
                  free: "✓",
                  pro: "✓",
                },
                {
                  feature: "PRD generation",
                  free: "✓",
                  pro: "✓",
                },
                {
                  feature: "Task breakdown (Kanban)",
                  free: "✓",
                  pro: "✓",
                },
                { feature: "Priority support", free: "—", pro: "✓" },
              ].map(({ feature, free, pro }) => (
                <tr key={feature}>
                  <td className="px-5 py-3 text-foreground">{feature}</td>
                  <td className="px-5 py-3 text-center text-muted-foreground">
                    {free}
                  </td>
                  <td className="px-5 py-3 text-center font-medium text-primary">
                    {pro}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
