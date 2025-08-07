import { Loader2, Plus } from "lucide-react";
import { useState } from "react";

interface MCPServerFormProps {
  onAddServer: (name: string, url: string) => Promise<void>;
}

export const MCPServerForm = ({ onAddServer }: MCPServerFormProps) => {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && url.trim()) {
      setIsLoading(true);
      setError(null);

      try {
        await onAddServer(name.trim(), url.trim());
        setName("");
        setUrl("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add server");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mb-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div>
        <input
          type="text"
          placeholder="Server name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      <div>
        <input
          type="url"
          placeholder="Server URL (e.g., http://localhost:3000/mcp or https://api.example.com/mcp)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isLoading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      <button
        type="submit"
        disabled={!name.trim() || !url.trim() || isLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Connecting
          </>
        ) : (
          <>
            <Plus size={16} />
            Add Server
          </>
        )}
      </button>
    </form>
  );
};
