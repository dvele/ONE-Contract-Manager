import { z } from "zod";

export const stateDisclosureSchema = z.object({
  state: z.string().length(2, "Use the 2-letter state code"),
  // Same pattern the generator resolves: [STATE_DISCLOSURE:CODE]
  code: z.string().regex(/^[A-Z0-9_]+$/, "Use capitals, digits and underscores"),
  content: z.string().min(1, "Content is required"),
  isActive: z.boolean().default(true),
});

export type StateDisclosureFormValues = z.infer<typeof stateDisclosureSchema>;

export function contentPreview(content: string | null | undefined, max = 80): string {
  const text = (content ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? text.slice(0, max) : text;
}
