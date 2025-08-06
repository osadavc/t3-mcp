import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown, Trash2 } from "lucide-react";

import type { MCPServer } from "~types/mcp";

interface MCPServerListProps {
  servers: MCPServer[];
  onRemoveServer: (id: string) => void;
}

export const MCPServerList = ({
  servers,
  onRemoveServer
}: MCPServerListProps) => {
  if (servers.length === 0) {
    return (
      <div className="text-gray-500 text-sm text-center py-8">
        No MCP servers added yet
      </div>
    );
  }

  return (
    <Accordion.Root type="single" collapsible className="space-y-2">
      {servers.map((server) => (
        <Accordion.Item
          key={server.id}
          value={server.id}
          className="border border-gray-200 rounded-md overflow-hidden">
          <Accordion.Header>
            <Accordion.Trigger className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 text-left">
              <div className="flex-1">
                <div className="font-medium text-sm">{server.name}</div>
                <div className="text-xs text-gray-500 truncate">
                  {server.url}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveServer(server.id);
                  }}
                  className="p-1 hover:bg-red-100 rounded transition-colors"
                  title="Remove server">
                  <Trash2 size={14} className="text-red-600" />
                </button>
                <ChevronDown
                  size={16}
                  className="text-gray-400 transition-transform group-data-[state=open]:rotate-180"
                />
              </div>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="p-3 bg-white">
            <div className="text-sm text-gray-600">
              <p>
                <strong>URL:</strong> {server.url}
              </p>
              <p>
                <strong>Added:</strong>{" "}
                {new Date(server.createdAt).toLocaleString()}
              </p>
              <div className="mt-3 text-gray-500 text-xs">
                Tools will be displayed here once connected
              </div>
            </div>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
};
