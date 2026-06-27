import { z } from "zod";

export const TaskSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  priority: z.enum(["low", "medium", "high", "critical"]),
  order: z.number().int().positive(),
});

export const TaskListSchema = z.array(TaskSchema).min(3).max(20);
export type GeneratedTask = z.infer<typeof TaskSchema>;
