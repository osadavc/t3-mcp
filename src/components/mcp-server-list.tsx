import * as Accordion from "@radix-ui/react-accordion";
import * as Switch from "@radix-ui/react-switch";
import { CheckCircle, ChevronDown, Trash2, XCircle } from "lucide-react";
import { useState } from "react";

import type { MCPServer } from "~types/mcp";

interface MCPServerListProps {
  servers: MCPServer[];
  onRemoveServer: (id: string) => void;
  onToggleServer: (id: string, enabled: boolean) => void;
}

export const MCPServerList = ({
  servers,
  onRemoveServer,
  onToggleServer
}: MCPServerListProps) => {
  const [openAccordion, setOpenAccordion] = useState<string | undefined>();

  const handleToggleServer = (serverId: string, enabled: boolean) => {
    // Close accordion if disabling the server
    if (!enabled && openAccordion === serverId) {
      setOpenAccordion(undefined);
    }
    onToggleServer(serverId, enabled);
  };
  if (servers.length === 0) {
    return (
      <div className="text-gray-500 text-sm text-center py-8">
        No MCP servers added yet
      </div>
    );
  }

  return (
    <Accordion.Root 
      type="single" 
      collapsible 
      className="space-y-2"
      value={openAccordion}
      onValueChange={setOpenAccordion}>
      {servers.map((server) => (
        <Accordion.Item
          key={server.id}
          value={server.id}
          className={`border border-gray-200 rounded-md overflow-hidden ${!server.isEnabled ? 'opacity-50' : ''}`}>
          <Accordion.Header>
            <Accordion.Trigger 
              className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
                server.isEnabled 
                  ? 'bg-gray-50 hover:bg-gray-100' 
                  : 'bg-gray-100 cursor-not-allowed'
              }`}
              onClick={(e) => {
                if (!server.isEnabled) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{server.name}</span>
                  {server.isConnected ? (
                    <CheckCircle size={12} className="text-green-600" />
                  ) : (
                    <XCircle size={12} className="text-red-600" />
                  )}
                  {!server.isEnabled && (
                    <span className="text-xs bg-gray-300 text-gray-500 px-2 py-0.5 rounded">Disabled</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {server.url}
                </div>
                <div className="text-xs text-gray-400">
                  {server.tools?.length || 0} tools available
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch.Root
                  checked={server.isEnabled}
                  onCheckedChange={(checked) => {
                    handleToggleServer(server.id, checked);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-9 h-5 bg-gray-200 rounded-full relative data-[state=checked]:bg-blue-500 outline-none cursor-pointer transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 shadow-inner p-0.5"
                  title={server.isEnabled ? "Disable server" : "Enable server"}>
                  <Switch.Thumb className="block w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 translate-x-0 data-[state=checked]:translate-x-4 ring-0 border border-gray-300" />
                </Switch.Root>
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
            <div className="text-sm text-gray-600 space-y-3">
              <div>
                <p><strong>URL:</strong> {server.url}</p>
                {server.connectionError && (
                  <p className="text-red-600"><strong>Error:</strong> {server.connectionError}</p>
                )}
              </div>

              {server.tools && server.tools.length > 0 ? (
                <div>
                  <h4 className="font-medium mb-2">Available Tools ({server.tools.length}):</h4>
                  <div className="space-y-2">
                    {server.tools.map((tool, index) => (
                      <div key={index} className="p-2 bg-gray-50 rounded border">
                        <div className="font-medium text-sm">{tool.name}</div>
                        {tool.description && (
                          <div className="text-xs text-gray-600 mt-1">
                            {tool.description.length > 100 
                              ? `${tool.description.slice(0, 100)}...` 
                              : tool.description}
                          </div>
                        )}
                        {tool.inputSchema?.properties && (
                          <div className="text-xs text-gray-500 mt-1">
                            Parameters: {Object.keys(tool.inputSchema.properties).join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-xs">No tools available</div>
              )}
            </div>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
};
