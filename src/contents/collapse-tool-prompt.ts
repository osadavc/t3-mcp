import type { PlasmoCSConfig } from "plasmo";

export const config: PlasmoCSConfig = {
  matches: ["https://t3.chat/*"],
  all_frames: false
};

const TOOL_PROMPT_MARKERS = [
  "[Start Fresh Session]",
  "User interaction begins here:"
];

const isToolPromptText = (text: string): boolean => {
  if (!text) return false;
  const t = text.trim();
  return TOOL_PROMPT_MARKERS.every((m) => t.includes(m));
};

const processArticle = (article: Element) => {
  if ((article as HTMLElement).dataset.t3McpProcessed === "true") return;
  const aria = article.getAttribute("aria-label") || "";
  if (!/your message/i.test(aria)) return;

  const prose = article.querySelector(".prose") as HTMLElement | null;
  const contentHost: HTMLElement | null = prose || (article as HTMLElement);
  const text = contentHost?.innerText || "";
  if (!isToolPromptText(text)) return;

  contentHost.innerHTML = "";
  const placeholder = document.createElement("div");
  placeholder.textContent = "Tool prompt inserted";
  placeholder.setAttribute("role", "note");
  placeholder.style.fontSize = "12px";
  placeholder.style.color = "#6b7280"; // gray-500
  placeholder.style.fontStyle = "italic";
  contentHost.appendChild(placeholder);
  (article as HTMLElement).dataset.t3McpProcessed = "true";
};

const scanAll = () => {
  const log = document.querySelector(
    '[role="log"][aria-label="Chat messages"]'
  );
  if (!log) return;
  const articles = log.querySelectorAll('[role="article"]');
  articles.forEach((a) => processArticle(a));
};

const start = () => {
  const observer = new MutationObserver(() => {
    scanAll();
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: false
  });

  scanAll();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}

export {};
