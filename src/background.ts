chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, {
      action: "toggle-sidebar-visibility"
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggle-sidebar") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "toggle-sidebar-visibility"
        });
      }
    });
  } else if (message.action === "mcp-servers-updated") {
    chrome.tabs.query(
      { url: ["https://t3.chat/*", "http://t3.chat/*"] },
      (tabs) => {
        for (const tab of tabs) {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { action: "mcp-servers-updated" });
          }
        }
      }
    );
  }
  return true;
});

export {};
