import { kebabCase } from "lodash";

import { sendToBackground } from "@plasmohq/messaging";
import { Storage } from "@plasmohq/storage";

import type {
  MCPOperationRequest,
  MCPOperationResponse
} from "~background/messages/mcp-operations";
import type { MCPServer } from "~types/mcp";
import { MCPServerSchema } from "~types/mcp";

const storage = new Storage();
const MCP_SERVERS_KEY = "mcp_servers";

export class MCPStorage {
  private static notifyServersChanged = () => {
    try {
      chrome.runtime?.sendMessage?.({ action: "mcp-servers-updated" });
    } catch {}
  };
  static async getServers(): Promise<MCPServer[]> {
    const servers = await storage.get<MCPServer[]>(MCP_SERVERS_KEY);
    return servers || [];
  }

  static async addServer(name: string, url: string): Promise<MCPServer> {
    const connectionResult = await sendToBackground<
      MCPOperationRequest,
      MCPOperationResponse
    >({
      name: "mcp-operations",
      body: {
        operation: "test-connection",
        serverUrl: url.trim()
      }
    });

    if (!connectionResult.success) {
      throw new Error(
        `Failed to connect to MCP server: ${connectionResult.error}`
      );
    }

    const servers = await this.getServers();

    // Create server with connection results
    const serverData = {
      id: crypto.randomUUID(),
      name: kebabCase(name.trim()),
      url: url.trim(),
      createdAt: Date.now(),
      tools: connectionResult.tools,
      isConnected: true,
      isEnabled: true,
      lastConnected: Date.now()
    };

    // Validate with Zod schema
    const newServer = MCPServerSchema.parse(serverData);

    const updatedServers = [...servers, newServer];
    await storage.set(MCP_SERVERS_KEY, updatedServers);
    this.notifyServersChanged();

    return newServer;
  }

  static async removeServer(id: string): Promise<void> {
    const servers = await this.getServers();
    const filteredServers = servers.filter((server) => server.id !== id);
    await storage.set(MCP_SERVERS_KEY, filteredServers);
    this.notifyServersChanged();
  }

  static async updateServer(
    id: string,
    updates: Partial<Omit<MCPServer, "id">>
  ): Promise<void> {
    const servers = await this.getServers();
    const updatedServers = servers.map((server) =>
      server.id === id ? { ...server, ...updates } : server
    );
    await storage.set(MCP_SERVERS_KEY, updatedServers);
    this.notifyServersChanged();
  }

  static async clearAll(): Promise<void> {
    await storage.remove(MCP_SERVERS_KEY);
    this.notifyServersChanged();
  }
}
