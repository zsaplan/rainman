import { z } from "zod";

export const citationSchema = z.object({
  path: z.string().startsWith("/data", "citation path must target /data"),
  file: z.string().min(1),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  quote: z.string(),
});

export const queryResponseSchema = z.object({
  status: z.enum(["answered", "insufficient_evidence", "conflict"]),
  data: z.record(z.unknown()),
  citations: z.array(citationSchema),
  missingInformation: z.array(z.string()),
  warnings: z.array(z.string()),
  meta: z.object({
    requestId: z.string().min(1),
    model: z.string().min(1),
    kbVersion: z.string().min(1),
  }),
});

export const queryResponseDraftSchema = queryResponseSchema.partial({ meta: true });
