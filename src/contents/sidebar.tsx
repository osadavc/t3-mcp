import cssText from "data-text:~style.css"
import { X } from "lucide-react"
import type {
  PlasmoCSConfig,
  PlasmoGetOverlayAnchor,
  PlasmoGetStyle
} from "plasmo"
import { useEffect, useState } from "react"

export const config: PlasmoCSConfig = {
  matches: ["https://t3.chat/*"]
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

export const getOverlayAnchor: PlasmoGetOverlayAnchor = async () => {
  return document.body
}

const Sidebar = () => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const messageListener = (message, sender, sendResponse) => {
      if (message.name === "toggle-sidebar") {
        setIsVisible((prev) => !prev)
        sendResponse({ success: true })
      }
    }

    chrome.runtime.onMessage.addListener(messageListener)

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener)
    }
  }, [])

  const handleClose = () => {
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-white border-l z-[9999] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-lg font-semibold">T3 MCP</h1>
        <button
          onClick={handleClose}
          className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Close sidebar">
          <X size={20} className="text-gray-600" />
        </button>
      </div>
      <div className="flex-1 p-4">
        <p>hey there</p>
      </div>
    </div>
  )
}

export default Sidebar
