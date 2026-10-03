import { useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const askAI = async () => {
    if (!message.trim()) return;

    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setResponse(data.response);
    } catch (error) {
      setResponse(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold mb-2">
          AI Wallet Analyst
        </h1>

        <p className="text-gray-400 mb-8">
          Local AI powered by Ollama + Qwen3
        </p>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask something..."
          className="w-full h-32 rounded-xl bg-gray-900 border border-gray-700 p-4 outline-none"
        />

        <button
          onClick={askAI}
          disabled={loading}
          className="mt-4 px-6 py-3 rounded-xl bg-white text-black font-medium disabled:opacity-50"
        >
          {loading ? "Thinking..." : "Ask AI"}
        </button>

        {response && (
          <div className="mt-8 rounded-xl bg-gray-900 border border-gray-700 p-6">
            <h2 className="font-semibold mb-3">
              AI Response
            </h2>

            <p className="whitespace-pre-wrap text-gray-300">
              {response}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}