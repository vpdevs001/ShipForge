import { z } from "zod";

export const PrdSchema = z.object({
  problemStatement: z.string().min(50),
  goals: z.array(z.string()).min(2),
  nonGoals: z.array(z.string()).min(1),
  userStories: z
    .array(
      z.object({
        actor: z.string(),
        action: z.string(),
        benefit: z.string(),
      })
    )
    .min(3),
  acceptanceCriteria: z.array(z.string()).min(3),
  edgeCases: z.array(z.string()).min(1),
  successMetrics: z.array(z.string()).min(1),
});

export type PrdContent = z.infer<typeof PrdSchema>;
