import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import type { PlasmoMessaging } from "@plasmohq/messaging";

import { MCPToolSchema } from "~types/mcp";
import type { MCPTool } from "~types/mcp";

// Generic MCP operation types
export type MCPOperationType = "test-connection" | "list-tools" | "call-tool";

export type MCPOperationRequest = {
  operation: MCPOperationType;
  serverUrl: string;
  toolName?: string;
  arguments?: Record<string, any>;
};

export type MCPOperationResponse = {
  success: boolean;
  data?: any;
  tools?: MCPTool[];
  error?: string;
};

class BackgroundMCPClient {
  private async createConnection(serverUrl: string): Promise<{
    client: Client;
    transport: StreamableHTTPClientTransport;
  }> {
    const url = new URL(serverUrl);

    const client = new Client({
      name: "t3-mcp-extension-bg",
      version: "1.0.0"
    });

    let transport: StreamableHTTPClientTransport;

    if (url.protocol === "http:" || url.protocol === "https:") {
      try {
        transport = new StreamableHTTPClientTransport(url);
      } catch (streamableError) {
        console.log(`[Background MCP] StreamableHTTP failed`, streamableError);
      }
    } else {
      throw new Error(`Unsupported protocol: ${url.protocol}`);
    }

    const connectPromise = client.connect(transport);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Connection timeout after 15 seconds")),
        15000
      )
    );

    await Promise.race([connectPromise, timeoutPromise]);
    console.log(`[Background MCP] ✅ Successfully connected`);

    return { client, transport };
  }

  private async executeWithConnection<T>(
    serverUrl: string,
    operation: (client: Client) => Promise<T>
  ): Promise<T> {
    let transport: StreamableHTTPClientTransport | null = null;

    try {
      const { client, transport: conn } =
        await this.createConnection(serverUrl);
      transport = conn;
      return await operation(client);
    } finally {
      try {
        if (transport) {
          transport.close();
        }
      } catch (cleanupError) {
        console.error(`[Background MCP] Error during cleanup:`, cleanupError);
      }
    }
  }

  async testConnection(serverUrl: string): Promise<MCPOperationResponse> {
    try {
      const tools = await this.executeWithConnection(
        serverUrl,
        async (client) => {
          const response = await client.listTools();

          const tools: MCPTool[] = [];

          for (const tool of response.tools) {
            try {
              const parsedTool = MCPToolSchema.parse(tool);
              tools.push(parsedTool);
            } catch (parseError) {
              console.warn(
                `[Background MCP] ⚠️ Failed to parse tool ${tool.name}:`,
                parseError
              );
            }
          }

          return tools;
        }
      );

      return { success: true, tools };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown connection error";
      console.error(`[Background MCP] ❌ Test failed:`, errorMessage);
      return { success: false, tools: [], error: errorMessage };
    }
  }

  async listTools(serverUrl: string): Promise<MCPOperationResponse> {
    try {
      const tools = await this.executeWithConnection(
        serverUrl,
        async (client) => {
          const response = await client.listTools();
          const tools: MCPTool[] = [];

          for (const tool of response.tools) {
            try {
              const parsedTool = MCPToolSchema.parse(tool);
              tools.push(parsedTool);
            } catch (parseError) {
              console.warn(
                `[Background MCP] ⚠️ Failed to parse tool ${tool.name}:`,
                parseError
              );
            }
          }

          return tools;
        }
      );

      return { success: true, tools };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error listing tools";
      console.error(`[Background MCP] ❌ List tools failed:`, errorMessage);
      return { success: false, tools: [], error: errorMessage };
    }
  }

  async callTool(
    serverUrl: string,
    toolName: string,
    arguments_: Record<string, any> = {}
  ): Promise<MCPOperationResponse> {
    try {
      const data = await this.executeWithConnection(
        serverUrl,
        async (client) => {
          const response = await client.callTool({
            name: toolName,
            arguments: arguments_
          });
          return response;
        }
      );

      console.log(`[Background MCP] ✅ Tool call successful`);
      return { success: true, data };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error calling tool";
      console.error(`[Background MCP] ❌ Tool call failed:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  async handleOperation(
    request: MCPOperationRequest
  ): Promise<MCPOperationResponse> {
    switch (request.operation) {
      case "test-connection":
        return this.testConnection(request.serverUrl);

      case "list-tools":
        return this.listTools(request.serverUrl);

      case "call-tool":
        if (!request.toolName) {
          return {
            success: false,
            error: "Tool name is required for call-tool operation"
          };
        }
        return this.callTool(
          request.serverUrl,
          request.toolName,
          request.arguments
        );

      default:
        return {
          success: false,
          error: `Unknown operation: ${request.operation}`
        };
    }
  }
}

const backgroundMCPClient = new BackgroundMCPClient();

const handler: PlasmoMessaging.MessageHandler<
  MCPOperationRequest,
  MCPOperationResponse
> = async (req, res) => {
  const result = await backgroundMCPClient.handleOperation(req.body);
  res.send(result);
};

export default handler;
