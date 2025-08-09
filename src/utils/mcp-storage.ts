import { kebabCase } from "lodash";

import { sendToBackground } from "@plasmohq/messaging";
import { Storage } from "@plasmohq/storage";

import type {
  MCPOperationRequest,
  MCPOperationResponse
} from "~background/messages/mcp-operations";
import type { MCPServer } from "~types/mcp";
import { MCPServerSchema } from "~types/mcp";
import type { MCPSettings } from "~types/settings";
import { MCPSettingsSchema } from "~types/settings";

const storage = new Storage({
  area: "local"
});
const MCP_SERVERS_KEY = "mcp_servers";
const MCP_SETTINGS_KEY = "mcp_settings";

export class MCPStorage {
  private static notifyServersChanged = () => {
    try {
      chrome.runtime?.sendMessage?.({ action: "mcp-servers-updated" });
    } catch {}
  };

  private static notifySettingsChanged = () => {
    try {
      chrome.runtime?.sendMessage?.({ action: "mcp-settings-updated" });
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

  // Settings helpers
  static async getSettings(): Promise<MCPSettings> {
    const raw = await storage.get<Partial<MCPSettings>>(MCP_SETTINGS_KEY);
    const parsed = MCPSettingsSchema.safeParse(raw || {});

    if (parsed.success) return parsed.data;
    return { autoCallTools: false };
  }

  static async updateSettings(
    update: Partial<MCPSettings>
  ): Promise<MCPSettings> {
    const current = await this.getSettings();
    const next = { ...current, ...update } as MCPSettings;

    await storage.set(MCP_SETTINGS_KEY, next);
    this.notifySettingsChanged();

    return next;
  }
}
