import { Plus } from "lucide-react"
import { useState } from "react"

interface MCPServerFormProps {
  onAddServer: (name: string, url: string) => void
}

export const MCPServerForm = ({ onAddServer }: MCPServerFormProps) => {
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim() && url.trim()) {
      onAddServer(name.trim(), url.trim())
      setName("")
      setUrl("")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mb-6">
      <div>
        <input
          type="text"
          placeholder="Server name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div>
        <input
          type="url"
          placeholder="Server URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <button
        type="submit"
        disabled={!name.trim() || !url.trim()}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Plus size={16} />
        Add Server
      </button>
    </form>
  )
}