import cssText from "data-text:~style.css";
import type {
  PlasmoCSConfig,
  PlasmoGetInlineAnchor,
  PlasmoGetStyle
} from "plasmo";
import { useEffect, useMemo, useState } from "react";

import type { MCPTool } from "~types/mcp";
import { MCPStorage } from "~utils/mcp-storage";
import { generateToolPrompt } from "~utils/tool-prompt-generator";

export const config: PlasmoCSConfig = {
  matches: ["https://t3.chat/*"]
};

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style");
  style.textContent = cssText;
  return style;
};

const SIMPLE_ANCHOR_SELECTOR = "#chat-input-form label";
const FALLBACK_ANCHOR_SELECTORS = [
  '#chat-input-form label:has(svg[data-lucide="paperclip"])',
  '#chat-input-form label[aria-label*="attach" i]',
  '#chat-input-form label[title*="attach" i]'
];

const CHAT_INPUT_SELECTOR = "#chat-input";
const SEND_BTN_SELECTOR =
  '#chat-input-form button[type="submit"], #chat-input-form button:has(svg[data-lucide="send"]), #chat-input-form button[aria-label*="send" i]';

export const getInlineAnchor: PlasmoGetInlineAnchor = async () => {
  return {
    element:
      document.querySelector(SIMPLE_ANCHOR_SELECTOR) ||
      FALLBACK_ANCHOR_SELECTORS.map((s) => document.querySelector(s)).find(
        Boolean
      ) ||
      null,
    insertPosition: "afterend"
  };
};

const hasPromptAlready = (): boolean => {
  const text = document.body?.innerText || "";
  if (!text) return false;
  return (
    text.includes("[Start Fresh Session]") &&
    text.includes("User interaction begins here:")
  );
};

const collectEnabledTools = async (): Promise<MCPTool[]> => {
  const servers = await MCPStorage.getServers();
  const enabled = servers.filter((s) => s.isEnabled);
  const tools = enabled.flatMap((s) => s.tools ?? []);
  const nameToTool = new Map<string, MCPTool>();

  for (const tool of tools) {
    if (!nameToTool.has(tool.name)) nameToTool.set(tool.name, tool);
  }

  return Array.from(nameToTool.values());
};

const PromptInjectButton = () => {
  const [isDisabled, setIsDisabled] = useState(false);
  const [availableTools, setAvailableTools] = useState<MCPTool[]>([]);

  const baseClass = useMemo(
    () =>
      [
        "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        "hover:bg-muted/40 hover:text-foreground",
        "disabled:hover:bg-transparent disabled:hover:text-foreground/50",
        "px-3 text-xs -mb-1.5 h-auto gap-2 rounded-full",
        "border border-solid border-secondary-foreground/10",
        "py-1.5 pl-2 pr-2.5 text-muted-foreground",
        "max-sm:p-2"
      ].join(" "),
    []
  );

  useEffect(() => {
    setIsDisabled(hasPromptAlready());
    const observer = new MutationObserver(() => {
      setIsDisabled(hasPromptAlready());
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true
    });

    const runtimeListener = (message: any) => {
      if (message?.action === "mcp-servers-updated") {
        window.setTimeout(async () => {
          const tools = await collectEnabledTools();
          setAvailableTools(tools);
          setIsDisabled(hasPromptAlready());
        }, 50);
      }
    };
    chrome.runtime?.onMessage?.addListener(runtimeListener);

    return () => {
      observer.disconnect();
      chrome.runtime?.onMessage?.removeListener(runtimeListener);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const tools = await collectEnabledTools();
        if (isMounted) setAvailableTools(tools);
      } catch {
        if (isMounted) setAvailableTools([] as MCPTool[]);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleClick = async () => {
    try {
      const prompt = generateToolPrompt(availableTools);

      if (!prompt) {
        return;
      }
      const input =
        document.querySelector<HTMLTextAreaElement>(CHAT_INPUT_SELECTOR);

      if (!input) {
        return;
      }
      input.value = prompt;
      input.dispatchEvent(new Event("input", { bubbles: true }));

      const sendBtn =
        document.querySelector<HTMLButtonElement>(SEND_BTN_SELECTOR);
      if (sendBtn && !sendBtn.disabled) {
        sendBtn.click();
      } else {
        const form =
          document.querySelector<HTMLFormElement>("#chat-input-form");
        form.requestSubmit?.();
        form.dispatchEvent(new Event("submit", { bubbles: true }));
      }
    } finally {
      setIsDisabled(hasPromptAlready());
    }
  };

  if (availableTools.length === 0) {
    return null;
  }

  return (
    <button
      type="button"
      className={baseClass}
      title="Insert MCP tool prompt and send"
      disabled={isDisabled}
      onClick={handleClick}>
      MCP Prompt
    </button>
  );
};

export default PromptInjectButton;
