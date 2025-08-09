import { z } from "zod";

export const MCPSettingsSchema = z.object({
  autoCallTools: z
    .boolean()
    .default(false)
    .describe(
      "Automatically trigger the tool call when it is requested by the llm without user confirmation"
    )
});

export type MCPSettings = z.infer<typeof MCPSettingsSchema>;
