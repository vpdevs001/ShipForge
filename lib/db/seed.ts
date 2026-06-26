import { db } from "./index";
import { billingPlan } from "./schema/billing";

async function main() {
  await db
    .insert(billingPlan)
    .values([
      {
        name: "free",
        monthlyTokenLimit: 50_000,
        reviewLimit: 5,
        repositoryLimit: 1,
        priceInPaise: 0,
      },
      {
        name: "pro",
        monthlyTokenLimit: 500_000,
        reviewLimit: 100,
        repositoryLimit: 10,
        priceInPaise: 99900, // ₹999/month
      },
    ])
    .onConflictDoNothing();

  console.log("Seeding complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
