import { Storage } from "@plasmohq/storage"
import { kebabCase } from "lodash"
import type { MCPServer } from "~types/mcp"

const storage = new Storage()
const MCP_SERVERS_KEY = "mcp_servers"

export class MCPStorage {
  static async getServers(): Promise<MCPServer[]> {
    const servers = await storage.get(MCP_SERVERS_KEY)
    return servers || []
  }

  static async addServer(name: string, url: string): Promise<MCPServer> {
    const servers = await this.getServers()
    const newServer: MCPServer = {
      id: crypto.randomUUID(),
      name: kebabCase(name.trim()),
      url: url.trim(),
      createdAt: Date.now()
    }
    
    const updatedServers = [...servers, newServer]
    await storage.set(MCP_SERVERS_KEY, updatedServers)
    return newServer
  }

  static async removeServer(id: string): Promise<void> {
    const servers = await this.getServers()
    const filteredServers = servers.filter(server => server.id !== id)
    await storage.set(MCP_SERVERS_KEY, filteredServers)
  }

  static async updateServer(id: string, updates: Partial<Omit<MCPServer, 'id'>>): Promise<void> {
    const servers = await this.getServers()
    const updatedServers = servers.map(server => 
      server.id === id ? { ...server, ...updates } : server
    )
    await storage.set(MCP_SERVERS_KEY, updatedServers)
  }

  static async clearAll(): Promise<void> {
    await storage.remove(MCP_SERVERS_KEY)
  }
}