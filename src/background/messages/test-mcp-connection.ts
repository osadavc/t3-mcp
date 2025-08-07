import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import { MCPToolSchema } from "~types/mcp"
import type { MCPTool } from "~types/mcp"

export type TestMCPConnectionRequest = {
  serverUrl: string
}

export type TestMCPConnectionResponse = {
  success: boolean
  tools: MCPTool[]
  error?: string
}

class BackgroundMCPClient {
  async testConnection(serverUrl: string): Promise<TestMCPConnectionResponse> {
    console.log(`[Background MCP] 🧪 Testing connection to: ${serverUrl}`)
    
    let client: Client | null = null
    let transport: StreamableHTTPClientTransport | SSEClientTransport | null = null
    
    try {
      console.log(`[Background MCP] Parsing URL: ${serverUrl}`)
      const url = new URL(serverUrl)
      console.log(`[Background MCP] Parsed URL - protocol: ${url.protocol}, host: ${url.host}, pathname: ${url.pathname}`)

      console.log(`[Background MCP] Creating client instance`)
      client = new Client({
        name: "t3-mcp-extension-bg",
        version: "1.0.0"
      })

      // Try StreamableHTTP first, then fall back to SSE
      if (url.protocol === "http:" || url.protocol === "https:") {
        console.log(`[Background MCP] Trying StreamableHTTP transport for ${url.href}`)
        try {
          transport = new StreamableHTTPClientTransport(url)
        } catch (streamableError) {
          console.log(`[Background MCP] StreamableHTTP failed, falling back to SSE:`, streamableError)
          transport = new SSEClientTransport(url)
        }
      } else {
        throw new Error(`Unsupported protocol: ${url.protocol}`)
      }

      console.log(`[Background MCP] Attempting to connect...`)
      // Add timeout to prevent hanging
      const connectPromise = client.connect(transport)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Connection timeout after 15 seconds")), 15000)
      )
      
      await Promise.race([connectPromise, timeoutPromise])
      console.log(`[Background MCP] ✅ Successfully connected`)

      console.log(`[Background MCP] Listing tools...`)
      const response = await client.listTools()
      console.log(`[Background MCP] Received tools response:`, response)

      const tools: MCPTool[] = []
      console.log(`[Background MCP] Processing ${response.tools.length} tools...`)
      
      for (const tool of response.tools) {
        console.log(`[Background MCP] Processing tool: ${tool.name}`, tool)
        try {
          const parsedTool = MCPToolSchema.parse(tool)
          tools.push(parsedTool)
          console.log(`[Background MCP] ✅ Successfully parsed tool: ${tool.name}`)
        } catch (parseError) {
          console.warn(`[Background MCP] ⚠️ Failed to parse tool ${tool.name}:`, parseError)
        }
      }

      console.log(`[Background MCP] ✅ Test successful! Found ${tools.length} tools`)
      return { success: true, tools }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown connection error"
      console.error(`[Background MCP] ❌ Test failed:`, errorMessage)
      return { success: false, tools: [], error: errorMessage }
    } finally {
      // Cleanup
      console.log(`[Background MCP] 🧹 Cleaning up connection...`)
      try {
        if (transport) {
          transport.close()
        }
      } catch (cleanupError) {
        console.error(`[Background MCP] Error during cleanup:`, cleanupError)
      }
    }
  }
}

const backgroundMCPClient = new BackgroundMCPClient()

const handler: PlasmoMessaging.MessageHandler<TestMCPConnectionRequest, TestMCPConnectionResponse> = async (req, res) => {
  const result = await backgroundMCPClient.testConnection(req.body.serverUrl)
  res.send(result)
}

export default handler