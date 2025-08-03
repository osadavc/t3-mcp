export {}

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url?.includes("t3.chat")) {
    try {
      await chrome.tabs.sendMessage(tab.id, { name: "toggle-sidebar" })
    } catch (error) {
      console.error("Error sending message to content script:", error)
    }
  }
})