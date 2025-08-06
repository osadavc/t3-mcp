# Claude Guidelines

## Project Overview
This is an MCP (Model Context Protocol) Chrome extension that gives MCP capabilities to t3.chat, which doesn't natively support MCP.

## Development Guidelines
- always use context7 mcp to search about plasmo to build this chrome extension
- use tailwind css v3 for styling
- maintain consistent component structure and organization
- use kebab-case for all component file names and server names
- prefer named imports over default imports for consistency

## Styling Guidelines
- Use Tailwind CSS utility classes for consistent spacing and colors
- Form inputs: `px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`
- Buttons: Primary `bg-blue-600 hover:bg-blue-700`, Danger `bg-red-100 hover:bg-red-200` 
- Gray scale: text-gray-500 for secondary text, text-gray-700 for labels
- Consistent spacing: `gap-2` for small spacing, `gap-3` for medium, `p-3` for padding
- Use Radix UI components for complex interactions (accordions, dialogs, etc.)