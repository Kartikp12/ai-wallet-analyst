import { useState } from "react";

export default function Home() {
  const [walletAddress, setWalletAddress] = useState("");
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [walletValid, setWalletValid] = useState(null);
  const [walletData, setWalletData] = useState(null);
const [walletLoading, setWalletLoading] = useState(false);
const [walletError, setWalletError] = useState("");

  const validateWallet = (address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const handleWalletChange = (e) => {
    const value = e.target.value;

    setWalletAddress(value);

    if (!value) {
      setWalletValid(null);
      return;
    }

    setWalletValid(validateWallet(value));
  };
  const analyzeWallet = async () => {
    if (!walletValid) {
      setWalletError("Please enter a valid Ethereum wallet address.");
      return;
    }
  
    setWalletLoading(true);
    setWalletError("");
    setWalletData(null);
  
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: walletAddress,
        }),
      });
  
      const data = await res.json();
  
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch wallet data");
      }
  
      setWalletData(data);
    } catch (error) {
      setWalletError(error.message);
    } finally {
      setWalletLoading(false);
    }
  };

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
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto py-16">

        {/* Header */}
        <div className="mb-12">
          <p className="text-sm text-gray-500 mb-3">
            AI-POWERED BLOCKCHAIN INTELLIGENCE
          </p>

          <h1 className="text-5xl font-bold tracking-tight">
            AI Wallet Analyst
          </h1>

          <p className="text-gray-400 mt-4 max-w-2xl">
            Analyze blockchain wallets, understand their activity,
            behavior, transactions and risk using AI.
          </p>
        </div>

        {/* Wallet Input */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <label className="block text-sm text-gray-400 mb-3">
            Wallet Address
          </label>

          <input
            type="text"
            value={walletAddress}
            onChange={handleWalletChange}
            placeholder="0x..."
            className="w-full bg-black border border-gray-700 rounded-xl px-4 py-4 text-white outline-none focus:border-gray-400"
          />

          {walletValid === true && (
            <p className="text-green-400 text-sm mt-3">
              ✓ Valid EVM wallet address
            </p>
          )}

          {walletValid === false && (
            <p className="text-red-400 text-sm mt-3">
              ✕ Invalid wallet address
            </p>
          )}
          <button
  onClick={analyzeWallet}
  disabled={!walletValid || walletLoading}
  className="mt-5 px-6 py-3 rounded-xl bg-white text-black font-medium disabled:opacity-40"
>
  {walletLoading ? "Analyzing..." : "Analyze Wallet"}
</button>
        </div>
{/* Wallet Result */}
{walletError && (
  <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-4">
    <p className="text-red-400">
      {walletError}
    </p>
  </div>
)}

{walletData && (
  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
    
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-gray-500 text-sm">
        Network
      </p>

      <p className="text-xl font-semibold mt-2">
        {walletData.network}
      </p>
    </div>

    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-gray-500 text-sm">
        ETH Balance
      </p>

      <p className="text-xl font-semibold mt-2">
        {walletData.balanceEth} ETH
      </p>
    </div>

    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-gray-500 text-sm">
        Wallet
      </p>

      <p className="text-sm font-mono mt-2 break-all">
        {walletData.address}
      </p>
    </div>

  </div>
)}
        {/* Analysis Sections */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
          {[
            "Portfolio",
            "Activity",
            "Behavior",
            "Counterparties",
            "AI Analysis",
            "Risk",
          ].map((item) => (
            <div
              key={item}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5"
            >
              <p className="text-gray-300">{item}</p>
              <p className="text-xs text-gray-600 mt-2">
                Coming soon
              </p>
            </div>
          ))}
        </div>

        {/* AI Chat */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-2">
            AI Analyst
          </h2>

          <p className="text-gray-500 mb-5">
            Ask the AI about blockchain wallets and on-chain activity.
          </p>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask something..."
            className="w-full h-32 rounded-xl bg-gray-900 border border-gray-700 p-4 outline-none focus:border-gray-400"
          />

          <button
            onClick={askAI}
            disabled={loading}
            className="mt-4 px-6 py-3 rounded-xl bg-white text-black font-medium disabled:opacity-50"
          >
            {loading ? "Thinking..." : "Ask AI"}
          </button>

          {response && (
            <div className="mt-6 rounded-xl bg-gray-900 border border-gray-700 p-6">
              <h3 className="font-semibold mb-3">
                AI Response
              </h3>

              <p className="whitespace-pre-wrap text-gray-300 leading-7">
                {response}
              </p>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}