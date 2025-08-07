import * as z from "zod";

// MCP Tool schema from SDK
export const MCPToolInputSchema = z.record(z.string(), z.any());

export const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  inputSchema: z
    .object({
      type: z.literal("object").optional(),
      properties: z.record(z.string(), z.any()).optional(),
      required: z.array(z.string()).optional(),
      additionalProperties: z.boolean().optional()
    })
    .optional()
});

// Our extended server schema with tools and connection status
export const MCPServerSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  createdAt: z.number(),
  tools: z.array(MCPToolSchema).optional().default([]),
  isConnected: z.boolean().optional().default(false),
  isEnabled: z.boolean().optional().default(true),
  connectionError: z.string().optional(),
  lastConnected: z.number().optional()
});

// Derive TypeScript types from Zod schemas
export type MCPTool = z.infer<typeof MCPToolSchema>;
export type MCPServer = z.infer<typeof MCPServerSchema>;
