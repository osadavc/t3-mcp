import { kebabCase } from "lodash";

import { Storage } from "@plasmohq/storage";
import { sendToBackground } from "@plasmohq/messaging";

import type { MCPServer, MCPTool } from "~types/mcp";
import { MCPServerSchema } from "~types/mcp";
import type { TestMCPConnectionRequest, TestMCPConnectionResponse } from "~background/messages/test-mcp-connection";

const storage = new Storage();
const MCP_SERVERS_KEY = "mcp_servers";

export class MCPStorage {
  static async getServers(): Promise<MCPServer[]> {
    const servers = await storage.get<MCPServer[]>(MCP_SERVERS_KEY);
    return servers || [];
  }

  static async addServer(name: string, url: string): Promise<MCPServer> {
    console.log(`[MCP Storage] Testing connection via background script...`);
    
    // Test MCP connection via background script to avoid CORS issues
    const connectionResult = await sendToBackground<TestMCPConnectionRequest, TestMCPConnectionResponse>({
      name: "test-mcp-connection",
      body: {
        serverUrl: url.trim()
      }
    });
    
    console.log(`[MCP Storage] Background connection result:`, connectionResult);
    
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
      isEnabled: true,
      lastConnected: Date.now()
    };

    console.log(`[MCP Storage] Creating server with data:`, serverData);

    // Validate with Zod schema
    const newServer = MCPServerSchema.parse(serverData);

    const updatedServers = [...servers, newServer];
    await storage.set(MCP_SERVERS_KEY, updatedServers);
    
    console.log(`[MCP Storage] ✅ Successfully added server: ${newServer.name}`);
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
