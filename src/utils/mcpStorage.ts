import { kebabCase } from "lodash";

import { Storage } from "@plasmohq/storage";

import type { MCPServer, MCPTool } from "~types/mcp";
import { MCPServerSchema } from "~types/mcp";
import { mcpClient } from "./mcpClient";

const storage = new Storage();
const MCP_SERVERS_KEY = "mcp_servers";

export class MCPStorage {
  static async getServers(): Promise<MCPServer[]> {
    const servers = await storage.get<MCPServer[]>(MCP_SERVERS_KEY);
    return servers || [];
  }

  static async addServer(name: string, url: string): Promise<MCPServer> {
    // Test MCP connection and fetch tools before saving
    const connectionResult = await mcpClient.testConnection(url.trim());
    
    if (!connectionResult.success) {
      throw new Error(`Failed to connect to MCP server: ${connectionResult.error}`);
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
      lastConnected: Date.now()
    };

    // Validate with Zod schema
    const newServer = MCPServerSchema.parse(serverData);

    const updatedServers = [...servers, newServer];
    await storage.set(MCP_SERVERS_KEY, updatedServers);
    return newServer;
  }

  static async removeServer(id: string): Promise<void> {
    const servers = await this.getServers();
    const filteredServers = servers.filter((server) => server.id !== id);
    await storage.set(MCP_SERVERS_KEY, filteredServers);
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
  }

  static async clearAll(): Promise<void> {
    await storage.remove(MCP_SERVERS_KEY);
  }
}
