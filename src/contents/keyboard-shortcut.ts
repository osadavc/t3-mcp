import type { PlasmoCSConfig } from "plasmo";

export const config: PlasmoCSConfig = {
  matches: ["https://t3.chat/*"],
  all_frames: false
};

const SHORTCUT_KEY = "KeyM";
const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

const handleKeyDown = (event: KeyboardEvent) => {
  const modifierPressed = isMac ? event.metaKey : event.ctrlKey;

  if (event.code === SHORTCUT_KEY && modifierPressed && event.shiftKey) {
    event.preventDefault();

    chrome.runtime.sendMessage({ action: "toggle-sidebar" });
  }
};

document.addEventListener("keydown", handleKeyDown);

export {};
