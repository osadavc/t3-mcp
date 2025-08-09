import * as Switch from "@radix-ui/react-switch";
import cssText from "data-text:~style.css";
import { Trash2, X } from "lucide-react";
import type {
  PlasmoCSConfig,
  PlasmoGetOverlayAnchor,
  PlasmoGetStyle
} from "plasmo";
import { useEffect, useState } from "react";

import { MCPServerForm } from "~components/mcp-server-form";
import { MCPServerList } from "~components/mcp-server-list";
import { useOutsideClick } from "~hooks/use-outside-click";
import type { MCPServer } from "~types/mcp";
import { MCPStorage } from "~utils/mcp-storage";

export const config: PlasmoCSConfig = {
  matches: ["https://t3.chat/*"]
};

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style");
  style.textContent = cssText;
  return style;
};

export const getOverlayAnchor: PlasmoGetOverlayAnchor = async () => {
  return document.body;
};

const Sidebar = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [autoCallTools, setAutoCallTools] = useState<boolean>(false);

  const handleClose = () => {
    setIsVisible(false);
  };

  const sidebarRef = useOutsideClick(handleClose);

  useEffect(() => {
    const messageListener = (message: any, sender: any, sendResponse: any) => {
      if (message.action === "toggle-sidebar-visibility") {
        setIsVisible((prev) => !prev);
        sendResponse({ success: true });
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  useEffect(() => {
    if (isVisible) {
      loadServers();
      loadSettings();
    }
  }, [isVisible]);

  const loadServers = async () => {
    const servers = await MCPStorage.getServers();
    setMcpServers(servers);
  };

  const loadSettings = async () => {
    const settings = await MCPStorage.getSettings();
    setAutoCallTools(settings.autoCallTools);
  };

  const handleAddServer = async (name: string, url: string): Promise<void> => {
    await MCPStorage.addServer(name, url);
    await loadServers();
  };

  const handleRemoveServer = async (id: string) => {
    await MCPStorage.removeServer(id);
    await loadServers();
  };

  const handleToggleServer = async (id: string, enabled: boolean) => {
    await MCPStorage.updateServer(id, { isEnabled: enabled });
    await loadServers();
  };

  const handleClearAll = async () => {
    if (window.confirm("Are you sure you want to clear all MCP servers?")) {
      await MCPStorage.clearAll();
      await loadServers();
    }
  };

  const handleToggleAutoCall = async (checked: boolean) => {
    setAutoCallTools(checked);
    await MCPStorage.updateSettings({ autoCallTools: checked });
  };

  if (!isVisible) return null;

  return (
    <div
      ref={sidebarRef}
      className="fixed top-0 right-0 h-full w-96 bg-white border-l z-[9999] flex flex-col shadow-sm">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-lg font-semibold">T3 MCP</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearAll}
            className="p-1 hover:bg-red-100 rounded-md transition-colors"
            title="Clear all servers">
            <Trash2 size={18} className="text-red-600" />
          </button>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Close sidebar">
            <X size={20} className="text-gray-600" />
          </button>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-700">
              Auto-run tool calls
            </div>
            <div className="text-xs text-gray-500">
              Automatically execute detected tool calls
            </div>
          </div>
          <Switch.Root
            checked={autoCallTools}
            onCheckedChange={handleToggleAutoCall}
            className="w-10 h-6 bg-gray-200 rounded-full relative data-[state=checked]:mcp-primary-bg outline-none cursor-pointer transition-all duration-200 focus:ring-2 mcp-primary-ring focus:ring-offset-1 shadow-inner p-0.5"
            title={autoCallTools ? "Disable auto-run" : "Enable auto-run"}>
            <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 translate-x-0 data-[state=checked]:translate-x-4 ring-0 border border-gray-300" />
          </Switch.Root>
        </div>
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            Add MCP Server
          </h2>
          <MCPServerForm onAddServer={handleAddServer} />
        </div>

        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            MCP Servers ({mcpServers.length})
          </h2>
          <MCPServerList
            servers={mcpServers}
            onRemoveServer={handleRemoveServer}
            onToggleServer={handleToggleServer}
          />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
