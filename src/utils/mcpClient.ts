import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import type { MCPTool } from "~types/mcp";
import { MCPToolSchema } from "~types/mcp";

export class MCPClient {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;

  async connect(serverUrl: string): Promise<void> {
    try {
      const url = new URL(serverUrl);

      this.client = new Client({
        name: "t3-mcp-extension",
        version: "1.0.0"
      });

      if (url.protocol === "http:" || url.protocol === "https:") {
        try {
          this.transport = new StreamableHTTPClientTransport(url);
        } catch (streamableError) {
          console.log(
            `[MCP Client] StreamableHTTP failed, falling back to SSE transport:`,
            streamableError
          );
        }
      } else {
        const errorMsg = `Unsupported protocol: ${url.protocol}. Only HTTP/HTTPS URLs are supported in browser environment.`;
        console.error(`[MCP Client] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      const connectPromise = this.client.connect(this.transport);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Connection timeout after 10 seconds")),
          10000
        )
      );

      await Promise.race([connectPromise, timeoutPromise]);
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  async listTools(): Promise<MCPTool[]> {
    if (!this.client) {
      const errorMsg = "Client not connected. Call connect() first.";
      console.error(`[MCP Client] ${errorMsg}`);
      throw new Error(errorMsg);
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
          console.warn(
            `[MCP Client] ⚠️ Failed to parse tool ${tool.name}:`,
            parseError
          );
          // Skip invalid tools but continue with others
        }
      }

      return tools;
    } catch (error) {
      console.error(`[MCP Client]  ❌ Failed to list tools:`, error);
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
      console.error(`[MCP Client] ❌ Test failed:`, errorMessage);
      return { success: false, tools: [], error: errorMessage };
    } finally {
      console.log(`[MCP Client] 🧹 Cleaning up connection...`);
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
