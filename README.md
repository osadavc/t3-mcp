# t3-mcp

Experimental chrome extension that adds MCP (Model Context Protocol) support to t3.chat.
Enables MCP server tools and capabilities in chat clients without backend access.

## Quick Start

1. Install dependencies: `npm install`
2. Build the extension: `npm run build`
3. Load the built extension in Chrome from `build/chrome-mv3-dev`
4. Go to t3.chat and press `Cmd+Shift+M` or click the extension icon to open the MCP sidebar

## Limitations

- Only supports streamable HTTP servers
- Experimental implementation (Because everything is running on browser and layout changes on t3.chat could break it)

## Note

This concept can be replicated in any chat client without backend access.
