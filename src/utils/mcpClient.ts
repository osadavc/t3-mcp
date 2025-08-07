import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

import type { MCPTool } from "~types/mcp";
import { MCPToolSchema } from "~types/mcp";

export class MCPClient {
  private client: Client | null = null;
  private transport: SSEClientTransport | null = null;

  async connect(serverUrl: string): Promise<void> {
    try {
      // Parse the server URL to determine connection method
      const url = new URL(serverUrl);

      this.client = new Client({
        name: "t3-mcp-extension",
        version: "1.0.0"
      });

      // Support HTTP/HTTPS URLs for browser environment
      if (url.protocol === "http:" || url.protocol === "https:") {
        this.transport = new SSEClientTransport(url);
      } else {
        throw new Error(
          `Unsupported protocol: ${url.protocol}. Only HTTP/HTTPS URLs are supported in browser environment.`
        );
      }

      await this.client.connect(this.transport);
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  async listTools(): Promise<MCPTool[]> {
    if (!this.client) {
      throw new Error("Client not connected. Call connect() first.");
    }

    try {
      const response = await this.client.listTools();

      // Validate and parse tools using Zod schema
      const tools: MCPTool[] = [];
      for (const tool of response.tools) {
        try {
          const parsedTool = MCPToolSchema.parse(tool);
          tools.push(parsedTool);
        } catch (parseError) {
          console.warn(`Failed to parse tool ${tool.name}:`, parseError);
          // Skip invalid tools but continue with others
        }
      }

      return tools;
    } catch (error) {
      console.error("Failed to list tools:", error);
      throw new Error(
        `Failed to fetch tools: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async testConnection(
    serverUrl: string
  ): Promise<{ success: boolean; tools: MCPTool[]; error?: string }> {
    try {
      await this.connect(serverUrl);
      const tools = await this.listTools();
      return { success: true, tools };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown connection error";
      return { success: false, tools: [], error: errorMessage };
    } finally {
      this.disconnect();
    }
  }

  disconnect(): void {
    this.cleanup();
  }

  private cleanup(): void {
    try {
      if (this.transport) {
        this.transport.close();
        this.transport = null;
      }
      if (this.client) {
        // Client doesn't have a close method in the current SDK version
        this.client = null;
      }
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }
}

// Singleton instance for reuse
export const mcpClient = new MCPClient();
