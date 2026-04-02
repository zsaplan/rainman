import { z } from "zod";

export const queryRequestSchema = z.object({
  question: z.string().trim().min(1, "question is required"),
});
