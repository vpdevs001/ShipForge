import type { OverviewActivityItem } from "@/features/overview/types/overview";

export async function getRecentReviewActivity(
  _userId: string
): Promise<OverviewActivityItem[]> {
  // Replace when per-repo PR pages and AI comments are implemented.
  return [];
}

export async function getReviewsThisWeek(_userId: string): Promise<number> {
  // Replace when review tracking is implemented.
  return 0;
}
