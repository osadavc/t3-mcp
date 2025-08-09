import type { PlasmoCSConfig } from "plasmo";
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import { sendToBackground } from "@plasmohq/messaging";

import type {
  MCPOperationRequest,
  MCPOperationResponse
} from "~background/messages/mcp-operations";
import type { MCPServer } from "~types/mcp";
import { MCPStorage } from "~utils/mcp-storage";

export const config: PlasmoCSConfig = {
  matches: ["https://t3.chat/*"],
  all_frames: false
};

type ToolCallPayload = {
  __t3_mcp_call?: boolean;
  tool: string;
  parameters?: Record<string, unknown>;
};

type ToolResultPayload = {
  __t3_mcp_result?: boolean;
  tool?: string;
  server?: string;
  result?: unknown;
};

const CHAT_INPUT_SELECTOR = "#chat-input";
const SEND_BTN_SELECTOR =
  '#chat-input-form button[type="submit"], #chat-input-form button:has(svg[data-lucide="send"]), #chat-input-form button[aria-label*="send" i]';

const sendMessage = (text: string) => {
  const input =
    document.querySelector<HTMLTextAreaElement>(CHAT_INPUT_SELECTOR);
  if (!input) return false;

  input.value = text;
  input.dispatchEvent(new Event("input", { bubbles: true }));

  const sendBtn = document.querySelector<HTMLButtonElement>(SEND_BTN_SELECTOR);
  if (sendBtn && !sendBtn.disabled) {
    sendBtn.click();
    return true;
  }

  // trying to submit the form if send button didn't work
  const form = document.querySelector<HTMLFormElement>("#chat-input-form");
  if (form) {
    form.requestSubmit?.();
    form.dispatchEvent(new Event("submit", { bubbles: true }));
    return true;
  }
  return false;
};

const parseToolCallJson = (raw: string): ToolCallPayload | null => {
  try {
    const parsed = JSON.parse(raw);

    if (parsed && parsed.__t3_mcp_call === true) {
      return parsed as ToolCallPayload;
    }
  } catch {}

  return null;
};

const parseToolResultJson = (raw: string): ToolResultPayload | null => {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.__t3_mcp_result === true) {
      return parsed as ToolResultPayload;
    }
  } catch {}
  return null;
};

const findServersForTool = async (toolName: string): Promise<MCPServer[]> => {
  const servers = await MCPStorage.getServers();
  const enabled = servers.filter((server) => server.isEnabled);

  return enabled.filter((server) =>
    (server.tools || []).some((tool) => tool.name === toolName)
  );
};

const getTopMessageAncestor = (node: HTMLElement): HTMLElement | null => {
  let currentElement: HTMLElement | null = node;
  let depth = 0;
  while (currentElement && depth < 10) {
    if (currentElement.hasAttribute("data-message-id")) return currentElement;
    currentElement = currentElement.parentElement as HTMLElement | null;
    depth += 1;
  }
  return null;
};

const extractJsonTextFromContainer = (
  container: HTMLElement
): string | null => {
  const code = container.querySelector("pre code") as HTMLElement | null;
  const raw = (code?.innerText || container.innerText || "").trim();

  if (!raw) return null;
  if (raw.startsWith("```") && raw.includes("\n")) {
    const idx = raw.indexOf("\n");
    let jsonText = raw.slice(idx + 1);
    if (jsonText.endsWith("```")) jsonText = jsonText.slice(0, -3);
    return jsonText;
  }

  return raw;
};

const findNextResultAfter = (
  host: HTMLElement,
  toolName?: string
): string | null => {
  const message = getTopMessageAncestor(host);
  if (!message) return null;
  let probe: HTMLElement | null =
    message.nextElementSibling as HTMLElement | null;
  let steps = 0;
  const maxSteps = 50;
  while (probe && steps < maxSteps) {
    const userArticle = probe.querySelector(
      '[role="article"][aria-label="Your message"]'
    ) as HTMLElement | null;
    if (
      userArticle &&
      (userArticle as any).dataset.t3McpResultProcessed !== "true"
    ) {
      const extractedJsonText = extractJsonTextFromContainer(userArticle);
      if (extractedJsonText) {
        const toolResult = parseToolResultJson(extractedJsonText);
        if (
          toolResult &&
          (!toolResult.tool || !toolName || toolResult.tool === toolName)
        ) {
          userArticle.style.display = "none";
          (userArticle as any).dataset.t3McpHiddenResponse = "true";
          (userArticle as any).dataset.t3McpResultProcessed = "true";
          return "```json\n" + JSON.stringify(toolResult, null, 2) + "\n```";
        }
      }
    }
    probe = probe.nextElementSibling as HTMLElement | null;
    steps += 1;
  }
  return null;
};

const ToolCallCard = ({
  payload,
  container,
  initialResponse
}: {
  payload: ToolCallPayload;
  container: HTMLElement;
  initialResponse?: string | null;
}) => {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responsePreview, setResponsePreview] = useState<string | null>(
    initialResponse ?? null
  );
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isCalled, setIsCalled] = useState<boolean>(!!initialResponse);
  const [autoCallTools, setAutoCallTools] = useState<boolean>(false);

  // Get the primary color from CSS custom properties
  const getPrimaryColor = () => "hsl(320 100% 75%)";
  const getPrimaryColorDisabled = () => "hsl(320 100% 75% / 0.6)";

  const selectedServer = useMemo(
    () => servers.find((server) => server.id === selectedServerId) || null,
    [servers, selectedServerId]
  );

  useEffect(() => {
    (async () => {
      const matches = await findServersForTool(payload.tool);
      setServers(matches);
      setSelectedServerId(matches[0]?.id ?? null);
    })();
  }, [payload.tool]);

  // Load and subscribe to settings
  useEffect(() => {
    let mounted = true;
    (async () => {
      const settings = await MCPStorage.getSettings();
      if (mounted) setAutoCallTools(!!settings.autoCallTools);
    })();
    const listener = (message: any) => {
      if (message?.action === "mcp-settings-updated") {
        MCPStorage.getSettings().then((settings) =>
          setAutoCallTools(!!settings.autoCallTools)
        );
      }
    };
    chrome.runtime?.onMessage?.addListener(listener);
    return () => {
      mounted = false;
      chrome.runtime?.onMessage?.removeListener(listener);
    };
  }, []);

  const handleCall = async () => {
    if (!selectedServer) {
      setError("No server selected for this tool");
      return;
    }
    setIsCalling(true);
    setError(null);
    try {
      const res = await sendToBackground<
        MCPOperationRequest,
        MCPOperationResponse
      >({
        name: "mcp-operations",
        body: {
          operation: "call-tool",
          serverUrl: selectedServer.url,
          toolName: payload.tool,
          arguments: (payload.parameters as Record<string, any>) || {}
        }
      });

      if (!res.success) {
        setError(res.error || "Tool call failed");
        setIsCalling(false);
        return;
      }

      const tryFormatMCPResponseToText = (data: any): string | null => {
        try {
          if (data && typeof data === "object" && Array.isArray(data.content)) {
            const texts = data.content
              .filter(
                (contentItem: any) =>
                  contentItem &&
                  typeof contentItem === "object" &&
                  typeof contentItem.text === "string"
              )
              .map((contentItem: any) => contentItem.text.trim())
              .filter(Boolean);
            if (texts.length > 0) return texts.join("\n\n");
          }
        } catch {}
        return null;
      };

      const textResult = tryFormatMCPResponseToText(res.data);
      const responseObj: ToolResultPayload = {
        __t3_mcp_result: true,
        tool: payload.tool,
        server: selectedServer.name,
        result: typeof res.data === "string" ? res.data : textResult ?? res.data
      };
      const responseText =
        "```json\n" + JSON.stringify(responseObj, null, 2) + "\n```";

      const sent = sendMessage(responseText);
      if (!sent) {
        setError("Unable to send message to chat");
      } else {
        setResponsePreview(responseText);
        setIsCalling(false);
        setIsCalled(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsCalling(false);
    }
  };

  // Auto-call when enabled
  useEffect(() => {
    if (autoCallTools && selectedServer && !isCalling && !isCalled) {
      // Slight delay to allow UI to settle
      const timeoutId = setTimeout(() => {
        handleCall();
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [autoCallTools, selectedServer, isCalling, isCalled]);

  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.08)",
        background: "rgba(0,0,0,0.03)",
        borderRadius: 8,
        padding: 12,
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial",
        fontSize: 14,
        color: "#111827"
      }}>
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 600 }}>MCP Tool Call</div>
          <div style={{ color: "#111827", marginTop: 2 }}>
            <span>Function:</span> <code>{payload.tool}</code>
          </div>
          <div style={{ color: "#111827", marginTop: 2 }}>
            <span>Server:</span>{" "}
            {servers.length <= 1 ? (
              <code>{servers[0]?.name ?? "No match"}</code>
            ) : (
              <select
                value={selectedServerId ?? ""}
                onChange={(e) => setSelectedServerId(e.target.value)}
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  padding: "2px 6px",
                  fontSize: 12
                }}>
                {servers.map((server) => (
                  <option key={server.id} value={server.id}>
                    {server.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div>
          <button
            type="button"
            onClick={handleCall}
            disabled={isCalling || !selectedServer || isCalled}
            style={{
              padding: "6px 10px",
              fontSize: 12,
              borderRadius: 8,
              border:
                isCalling || isCalled
                  ? `1px solid ${getPrimaryColorDisabled()}`
                  : `1px solid ${getPrimaryColor()}`,
              color: "#fff",
              background: isCalling || isCalled ? getPrimaryColorDisabled() : getPrimaryColor(),
              cursor: isCalling || isCalled ? "default" : "pointer"
            }}>
            {isCalling ? "Calling…" : isCalled ? "Called" : "Call tool"}
          </button>
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>Parameters</div>
        <pre
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            background: "transparent",
            color: "#111827"
          }}>
          {JSON.stringify(payload.parameters ?? {}, null, 2)}
        </pre>
      </div>
      {responsePreview ? (
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              borderTop: "1px solid rgba(0,0,0,0.08)",
              paddingTop: 8,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
            <div style={{ fontWeight: 600 }}>Response</div>
            <button
              type="button"
              onClick={() => setIsExpanded((prevExpanded) => !prevExpanded)}
              style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                background: "#ffffff",
                cursor: "pointer"
              }}>
              {isExpanded ? "Hide" : "View"}
            </button>
          </div>
          {isExpanded ? (
            <pre
              style={{
                marginTop: 8,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                background: "transparent",
                color: "#111827",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 6,
                padding: 8,
                maxHeight: 320,
                overflow: "auto"
              }}>
              {responsePreview}
            </pre>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <div style={{ color: "#dc2626", marginTop: 8, fontSize: 12 }}>
          {error}
        </div>
      ) : null}
    </div>
  );
};

const replaceCodeBlockWithUI = (
  codeEl: HTMLElement,
  payload: ToolCallPayload
) => {
  // Identify the full code widget wrapper that contains both the language header and the code body
  const isWrapper = (el: HTMLElement): boolean => {
    return (
      !!el.querySelector?.("[data-language-id]") &&
      !!el.querySelector?.(".shiki, pre")
    );
  };

  let host: HTMLElement | null = null;
  let node: HTMLElement | null = codeEl;
  let depth = 0;
  while (node && depth < 15) {
    if (isWrapper(node)) {
      host = node;
      break;
    }
    node = node.parentElement as HTMLElement | null;
    depth += 1;
  }

  // Fallbacks
  if (!host) {
    const pre = codeEl.closest("pre") as HTMLElement | null;
    const shiki = codeEl.closest(".shiki") as HTMLElement | null;
    host =
      (pre &&
        (pre.parentElement?.querySelector?.("[data-language-id]")
          ? pre.parentElement
          : pre)) ||
      (shiki &&
        (shiki.parentElement?.querySelector?.("[data-language-id]")
          ? shiki.parentElement
          : shiki)) ||
      codeEl;
  }

  if ((host as any).dataset.t3McpToolUi === "true") return;

  const container = document.createElement("div");
  (container as any).dataset.t3McpToolUi = "true";
  const initialResponse: string | null = findNextResultAfter(
    host,
    payload.tool
  );
  host.replaceWith(container);
  const root = createRoot(container);
  root.render(
    <ToolCallCard
      payload={payload}
      container={container}
      initialResponse={initialResponse}
    />
  );
};

const scanForToolCalls = () => {
  const log = document.querySelector(
    '[role="log"][aria-label="Chat messages"]'
  );
  if (!log) return;

  const assistantArticles = log.querySelectorAll(
    '[role="article"][aria-label="Assistant message"]'
  );

  assistantArticles.forEach((article) => {
    const codeBlocks = article.querySelectorAll("pre code");

    codeBlocks.forEach((code) => {
      const text = (code as HTMLElement).innerText.trim();
      if (!text) return;
      // Attempt to detect JSON fence and extract
      let jsonText = text;

      if (jsonText.startsWith("```") && jsonText.includes("\n")) {
        const firstLineEnd = jsonText.indexOf("\n");
        jsonText = jsonText.slice(firstLineEnd + 1);
        if (jsonText.endsWith("```")) jsonText = jsonText.slice(0, -3);
      }

      const payload = parseToolCallJson(jsonText);
      if (payload) {
        replaceCodeBlockWithUI(code as HTMLElement, payload);
      }

      const result = parseToolResultJson(jsonText);

      if (result) {
        const pre = (code as HTMLElement).closest("pre") as HTMLElement | null;
        const wrapper = pre?.parentElement?.parentElement as HTMLElement | null;
        (wrapper || pre || (code as HTMLElement)).style.display = "none";
        const article = (code as HTMLElement).closest(
          '[role="article"]'
        ) as HTMLElement | null;
        if (article) (article as any).dataset.t3McpResultProcessed = "true";
      }
    });
  });

  // Additionally hide any user-side message that contains a tool-result block
  const userArticles = log.querySelectorAll(
    '[role="article"][aria-label="Your message"]'
  );
  userArticles.forEach((article) => {
    if ((article as HTMLElement).dataset.t3McpHiddenResponse === "true") return;
    const codeBlocks = article.querySelectorAll("pre code");
    for (const code of Array.from(codeBlocks)) {
      const text = (code as HTMLElement).innerText.trim();
      if (!text) continue;
      let jsonText = text;
      if (jsonText.startsWith("```") && jsonText.includes("\n")) {
        const firstLineEnd = jsonText.indexOf("\n");
        jsonText = jsonText.slice(firstLineEnd + 1);
        if (jsonText.endsWith("```")) jsonText = jsonText.slice(0, -3);
      }
      const result = parseToolResultJson(jsonText);
      if (result) {
        const host = article as HTMLElement;
        host.style.display = "none";
        host.dataset.t3McpHiddenResponse = "true";
        break;
      }
    }
  });
};

const start = () => {
  const observer = new MutationObserver(() => scanForToolCalls());
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: false
  });
  scanForToolCalls();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}

export {};
