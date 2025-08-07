import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import type { MCPTool } from "~types/mcp";
import { MCPToolSchema } from "~types/mcp";

export class MCPClient {
  private client: Client | null = null;
  private transport: SSEClientTransport | StreamableHTTPClientTransport | null = null;

  async connect(serverUrl: string): Promise<void> {
    console.log(`[MCP Client] Attempting to connect to: ${serverUrl}`);
    
    try {
      // Parse the server URL to determine connection method
      console.log(`[MCP Client] Parsing URL: ${serverUrl}`);
      const url = new URL(serverUrl);
      console.log(`[MCP Client] Parsed URL - protocol: ${url.protocol}, host: ${url.host}, pathname: ${url.pathname}`);

      console.log(`[MCP Client] Creating client instance`);
      this.client = new Client({
        name: "t3-mcp-extension",
        version: "1.0.0"
      });

      // Support HTTP/HTTPS URLs for browser environment
      if (url.protocol === "http:" || url.protocol === "https:") {
        console.log(`[MCP Client] Trying StreamableHTTP transport first for ${url.href}`);
        try {
          this.transport = new StreamableHTTPClientTransport(url);
        } catch (streamableError) {
          console.log(`[MCP Client] StreamableHTTP failed, falling back to SSE transport:`, streamableError);
          this.transport = new SSEClientTransport(url);
        }
      } else {
        const errorMsg = `Unsupported protocol: ${url.protocol}. Only HTTP/HTTPS URLs are supported in browser environment.`;
        console.error(`[MCP Client] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      console.log(`[MCP Client] Attempting to connect client to transport...`);
      
      // Add timeout to prevent hanging forever
      const connectPromise = this.client.connect(this.transport);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Connection timeout after 10 seconds")), 10000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      console.log(`[MCP Client] ✅ Successfully connected to ${serverUrl}`);
    } catch (error) {
      console.error(`[MCP Client] ❌ Connection failed:`, error);
      this.cleanup();
      throw error;
    }
  }

  async listTools(): Promise<MCPTool[]> {
    console.log(`[MCP Client] Listing tools...`);
    
    if (!this.client) {
      const errorMsg = "Client not connected. Call connect() first.";
      console.error(`[MCP Client] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    try {
      console.log(`[MCP Client] Calling client.listTools()...`);
      const response = await this.client.listTools();
      console.log(`[MCP Client] Received tools response:`, response);

      // Validate and parse tools using Zod schema
      const tools: MCPTool[] = [];
      console.log(`[MCP Client] Processing ${response.tools.length} tools...`);
      
      for (const tool of response.tools) {
        console.log(`[MCP Client] Processing tool: ${tool.name}`, tool);
        try {
          const parsedTool = MCPToolSchema.parse(tool);
          tools.push(parsedTool);
          console.log(`[MCP Client] ✅ Successfully parsed tool: ${tool.name}`);
        } catch (parseError) {
          console.warn(`[MCP Client] ⚠️ Failed to parse tool ${tool.name}:`, parseError);
          // Skip invalid tools but continue with others
        }
      }

      console.log(`[MCP Client] ✅ Successfully processed ${tools.length} valid tools`);
      return tools;
    } catch (error) {
      console.error(`[MCP Client] ❌ Failed to list tools:`, error);
      throw new Error(
        `Failed to fetch tools: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async testConnection(
    serverUrl: string
  ): Promise<{ success: boolean; tools: MCPTool[]; error?: string }> {
    console.log(`[MCP Client] 🧪 Testing connection to: ${serverUrl}`);
    
    try {
      console.log(`[MCP Client] Step 1: Connecting...`);
      await this.connect(serverUrl);
      
      console.log(`[MCP Client] Step 2: Listing tools...`);
      const tools = await this.listTools();
      
      console.log(`[MCP Client] ✅ Test successful! Found ${tools.length} tools`);
      return { success: true, tools };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown connection error";
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
