import { useState } from "react"

import "./style.css"

const IndexPopup = () => {
  const [data, setData] = useState("")

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">
        <h1 className="text-7xl font-bold mb-4">Hey there</h1>
        Welcome to your{" "}
        <a
          href="https://www.plasmo.com"
          target="_blank"
          className="text-blue-600 hover:text-blue-800">
          Plasmo
        </a>{" "}
        Extension!
      </h2>
      <input
        onChange={(e) => setData(e.target.value)}
        value={data}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        placeholder="Type something..."
      />
      <a
        href="https://docs.plasmo.com"
        target="_blank"
        className="text-blue-600 hover:text-blue-800 underline">
        View Docs
      </a>
    </div>
  )
}

export default IndexPopup
