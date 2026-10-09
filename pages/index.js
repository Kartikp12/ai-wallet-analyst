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
  const [transactions, setTransactions] = useState([]);
  const [transactionError, setTransactionError] = useState("");
  const [showAllTokens, setShowAllTokens] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  // Store all messages for the current page session.
  const [chatHistory, setChatHistory] = useState([]);

  // Validate Ethereum wallet address.
  const validateWallet = (address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // Handle wallet input.
  const handleWalletChange = (e) => {
    const value = e.target.value.trim();

    setWalletAddress(value);
    setWalletData(null);
    setTransactions([]);
    setResponse("");
    setChatHistory([]);
    setMessage("");
    setWalletError("");
    setTransactionError("");
    setShowAllTokens(false);
    setShowAllTransactions(false);

    if (!value) {
      setWalletValid(null);
      return;
    }

    setWalletValid(validateWallet(value));
  };

  // Analyze wallet.
  const analyzeWallet = async () => {
    if (!walletValid) {
      setWalletError(
        "Please enter a valid Ethereum wallet address."
      );
      return;
    }

    setWalletLoading(true);
    setWalletError("");
    setTransactionError("");
    setWalletData(null);
    setTransactions([]);
    setResponse("");
    setChatHistory([]);
    setMessage("");
    setShowAllTokens(false);
    setShowAllTransactions(false);

    try {
      const walletRes = await fetch("/api/wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: walletAddress,
        }),
      });

      const walletResult = await walletRes.json();

      if (!walletRes.ok) {
        throw new Error(
          walletResult.error || "Failed to fetch wallet data"
        );
      }

      setWalletData(walletResult);
      setTransactions(walletResult.transactions || []);
    } catch (error) {
      console.error("Wallet analysis error:", error);

      setWalletError(
        error.message || "Failed to analyze wallet"
      );
    } finally {
      setWalletLoading(false);
    }
  };

  // Ask AI and retain every question-answer pair.
  const askAI = async () => {
    const question = message.trim();

    if (!question || loading) {
      return;
    }

    const chatId = `${Date.now()}-${Math.random()}`;

    if (!walletData) {
      setChatHistory((previous) => [
        ...previous,
        {
          id: chatId,
          question,
          answer:
            "Please analyze a wallet first so the AI can analyze its on-chain data.",
          loading: false,
        },
      ]);

      setMessage("");
      return;
    }

    // Add the new question immediately.
    setChatHistory((previous) => [
      ...previous,
      {
        id: chatId,
        question,
        answer: "",
        loading: true,
      },
    ]);

    setMessage("");
    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: question,
          walletData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Something went wrong"
        );
      }

      const answer = data.response || "No response received.";

      setResponse(answer);

      // Update only this question's answer.
      setChatHistory((previous) =>
        previous.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                answer,
                loading: false,
              }
            : chat
        )
      );
    } catch (error) {
      console.error("AI error:", error);

      const errorMessage = `Error: ${
        error.message || "Could not get AI response"
      }`;

      setResponse(errorMessage);

      setChatHistory((previous) =>
        previous.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                answer: errorMessage,
                loading: false,
              }
            : chat
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // Enter to send; Shift + Enter for a new line.
  const handleChatKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      if (!loading && message.trim()) {
        askAI();
      }
    }
  };

  // Format transaction date.
  const formatDate = (timestamp) => {
    if (!timestamp) {
      return "Unknown";
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }

    return date.toLocaleString();
  };

  // Shorten wallet address.
  const shortenAddress = (address) => {
    if (!address) {
      return "Unknown";
    }

    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Format token and transaction amounts.
  const formatAmount = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "0";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
      return String(value);
    }

    return number.toLocaleString(undefined, {
      maximumFractionDigits: 6,
    });
  };

  return (
    <main className="min-h-screen bg-[#0A0F0D] text-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto py-8 md:py-12">
        {/* Dashboard header */}
        <header className="relative overflow-hidden mb-8 rounded-3xl border border-emerald-900/50 bg-gradient-to-br from-[#17251D] via-[#111815] to-[#0D1210] p-7 md:p-10 shadow-2xl shadow-black/30">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800/60 bg-emerald-950/40 px-3 py-1.5 mb-5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold tracking-widest text-emerald-300">
                BLOCKCHAIN INTELLIGENCE
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white">
              AI Wallet Analyst
            </h1>

            <p className="text-slate-400 mt-4 max-w-2xl text-base md:text-lg leading-7">
              Analyze blockchain wallets, explore on-chain activity,
              understand transaction behavior, and investigate wallet
              data with AI.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-7">
              <span className="inline-flex items-center gap-2 rounded-lg border border-[#34443A] bg-[#0A0F0D]/70 px-3 py-2 text-sm text-slate-300">
                <span className="text-emerald-400">◆</span>
                On-chain analytics
              </span>

              <span className="inline-flex items-center gap-2 rounded-lg border border-[#34443A] bg-[#0A0F0D]/70 px-3 py-2 text-sm text-slate-300">
                <span className="text-emerald-400">✦</span>
                AI-powered insights
              </span>
            </div>
          </div>
        </header>

        {/* Wallet search */}
        <section className="rounded-2xl border border-[#29372F] bg-[#121916] p-5 md:p-7 shadow-xl shadow-black/20">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-900/60 bg-emerald-950/40 text-emerald-400 text-xl">
              ⌕
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white">
                Analyze a Wallet
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Enter an Ethereum-compatible wallet address
              </p>
            </div>
          </div>

          <label
            htmlFor="wallet-address"
            className="block text-sm font-medium text-slate-300 mb-3"
          >
            Wallet Address
          </label>

          <input
            id="wallet-address"
            type="text"
            value={walletAddress}
            onChange={handleWalletChange}
            placeholder="0x..."
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-[#0A0F0D] border border-[#34443A] rounded-xl px-4 py-4 text-white placeholder:text-slate-600 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 font-mono text-sm"
          />

          {walletValid === true && (
            <p className="text-emerald-400 text-sm mt-3">
              ✓ Valid EVM wallet address
            </p>
          )}

          {walletValid === false && (
            <p className="text-rose-400 text-sm mt-3">
              ✕ Invalid wallet address
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 mt-5">
            <button
              onClick={analyzeWallet}
              disabled={!walletValid || walletLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-3 font-semibold text-[#07110B] shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {walletLoading && (
                <span className="h-4 w-4 rounded-full border-2 border-[#07110B]/30 border-t-[#07110B] animate-spin" />
              )}

              {walletLoading ? "Analyzing..." : "Analyze Wallet"}

              {!walletLoading && <span aria-hidden="true">→</span>}
            </button>

            <p className="text-xs text-slate-500">
              Wallet data will appear after analysis.
            </p>
          </div>
        </section>

        {/* Wallet error */}
        {walletError && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-rose-900/70 bg-rose-950/30 p-4"
          >
            <p className="text-rose-400">{walletError}</p>
          </div>
        )}

        {/* Wallet overview */}
        {walletData && (
          <>
            <section className="mt-8">
              <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-semibold tracking-widest text-emerald-500 uppercase">
                    Overview
                  </p>
                  <h2 className="text-2xl font-semibold text-white mt-1">
                    Wallet Summary
                  </h2>
                </div>

                <span className="rounded-full border border-emerald-900/60 bg-emerald-950/30 px-3 py-1.5 text-xs text-emerald-300">
                  Analysis complete
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-[#29372F] bg-[#121916] p-5 transition hover:border-emerald-800/70">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-400">Network</p>
                    <span className="text-emerald-400">◈</span>
                  </div>

                  <p className="text-xl md:text-2xl font-semibold text-white mt-4 break-words">
                    {walletData.network}
                  </p>

                  <p className="text-xs text-slate-500 mt-2">
                    Connected blockchain
                  </p>
                </div>

                <div className="rounded-2xl border border-[#29372F] bg-[#121916] p-5 transition hover:border-emerald-800/70">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-400">ETH Balance</p>
                    <span className="text-emerald-400">Ξ</span>
                  </div>

                  <p className="text-xl md:text-2xl font-semibold text-white mt-4 break-words">
                    {walletData.balanceEth} ETH
                  </p>

                  <p className="text-xs text-slate-500 mt-2">
                    Native asset balance
                  </p>
                </div>

                <div className="rounded-2xl border border-[#29372F] bg-[#121916] p-5 transition hover:border-emerald-800/70">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-400">Wallet Address</p>
                    <span className="text-emerald-400">⌘</span>
                  </div>

                  <p className="text-sm font-mono text-emerald-300 mt-4 break-all">
                    {walletData.address}
                  </p>

                  <p className="text-xs text-slate-500 mt-2">
                    Analyzed account
                  </p>
                </div>
              </div>
            </section>

            {/* Wallet statistics */}
            {walletData.stats && (
              <section className="mt-6">
                <div className="mb-4">
                  <p className="text-xs font-semibold tracking-widest text-emerald-500 uppercase">
                    Activity Metrics
                  </p>
                  <h2 className="text-xl font-semibold text-white mt-1">
                    Transaction Statistics
                  </h2>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-2xl border border-[#29372F] bg-[#121916] p-4 md:p-5">
                    <p className="text-sm text-slate-400">
                      Transactions
                    </p>
                    <p className="text-2xl md:text-3xl font-bold text-white mt-3 break-words">
                      {walletData.stats.transactionCount}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Total recorded
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-950 bg-[#121916] p-4 md:p-5">
                    <p className="text-sm text-slate-400">
                      Incoming
                    </p>
                    <p className="text-2xl md:text-3xl font-bold text-emerald-400 mt-3 break-words">
                      {walletData.stats.incomingTransactions}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Received transactions
                    </p>
                  </div>

                  <div className="rounded-2xl border border-rose-950 bg-[#121916] p-4 md:p-5">
                    <p className="text-sm text-slate-400">
                      Outgoing
                    </p>
                    <p className="text-2xl md:text-3xl font-bold text-rose-400 mt-3 break-words">
                      {walletData.stats.outgoingTransactions}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Sent transactions
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#29372F] bg-[#121916] p-4 md:p-5">
                    <p className="text-sm text-slate-400">
                      ETH Transfers
                    </p>
                    <p className="text-2xl md:text-3xl font-bold text-white mt-3 break-words">
                      {walletData.stats.ethTransactionCount}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Native asset transfers
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Token holdings */}
            {walletData.tokens && walletData.tokens.length > 0 && (
              <section className="mt-8 rounded-2xl border border-[#29372F] bg-[#121916] p-5 md:p-7 shadow-xl shadow-black/10">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <div>
                    <p className="text-xs font-semibold tracking-widest text-emerald-500 uppercase">
                      Portfolio
                    </p>
                    <h2 className="text-2xl font-semibold text-white mt-1">
                      Token Holdings
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      ERC-20 tokens held by this wallet
                    </p>
                  </div>

                  <span className="rounded-lg border border-[#34443A] bg-[#0A0F0D] px-3 py-2 text-sm text-slate-300">
                    {walletData.tokens.length} tokens
                  </span>
                </div>

                <div className="space-y-3">
                  {(showAllTokens
                    ? walletData.tokens
                    : walletData.tokens.slice(0, 5)
                  ).map((token, index) => (
                    <div
                      key={
                        token.contractAddress ||
                        token.address ||
                        index
                      }
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-[#26342C] bg-[#0D1310] p-4 md:p-5 transition hover:border-emerald-900/70"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-900/50 bg-emerald-950/40 text-emerald-400 font-bold">
                          {(token.symbol || "?")
                            .slice(0, 1)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-white break-words">
                            {token.symbol || "Unknown"}
                          </p>
                          <p className="text-sm text-slate-500 mt-1 break-words">
                            {token.name || "Unknown Token"}
                          </p>
                        </div>
                      </div>

                      <div className="sm:text-right sm:shrink-0">
                        <p className="text-lg font-semibold text-emerald-300 break-words">
                          {formatAmount(token.balance)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Token Balance
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {walletData.tokens.length > 5 && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={() =>
                        setShowAllTokens(!showAllTokens)
                      }
                      className="rounded-xl border border-[#34443A] bg-[#0A0F0D] px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-emerald-500 hover:text-emerald-300"
                    >
                      {showAllTokens
                        ? "Show Less"
                        : `Show More (${walletData.tokens.length - 5})`}
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* Transaction activity */}
            <section className="mt-8 rounded-2xl border border-[#29372F] bg-[#121916] p-5 md:p-7 shadow-xl shadow-black/10">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                  <p className="text-xs font-semibold tracking-widest text-emerald-500 uppercase">
                    On-chain history
                  </p>
                  <h2 className="text-2xl font-semibold text-white mt-1">
                    Transaction Activity
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Recent activity available from the wallet data
                  </p>
                </div>

                <span className="rounded-lg border border-[#34443A] bg-[#0A0F0D] px-3 py-2 text-sm text-slate-300">
                  {transactions.length} transactions
                </span>
              </div>

              {transactionError && (
                <div className="rounded-xl border border-rose-900/70 bg-rose-950/30 p-4">
                  <p className="text-rose-400">
                    {transactionError}
                  </p>
                </div>
              )}

              {!transactionError && transactions.length === 0 && (
                <div className="rounded-xl border border-dashed border-[#34443A] py-12 text-center">
                  <div className="text-3xl text-slate-600 mb-3">
                    ◷
                  </div>
                  <p className="text-slate-400">
                    No transaction activity found.
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Transaction records will appear here when available.
                  </p>
                </div>
              )}

              {transactions.length > 0 && (
                <>
                  <div className="space-y-3">
                    {(showAllTransactions
                      ? transactions
                      : transactions.slice(0, 5)
                    ).map((tx, index) => (
                      <div
                        key={`${tx.hash || "tx"}-${index}`}
                        className="rounded-xl border border-[#26342C] bg-[#0D1310] p-4 md:p-5 transition hover:border-emerald-900/70"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                                  tx.direction === "IN"
                                    ? "border-emerald-900 bg-emerald-950/70 text-emerald-400"
                                    : "border-rose-900 bg-rose-950/50 text-rose-400"
                                }`}
                              >
                                {tx.direction}
                              </span>

                              <span className="text-slate-200 font-medium">
                                {tx.asset || "ETH"}
                              </span>

                              <span className="text-slate-500 text-sm">
                                {tx.category || "transfer"}
                              </span>
                            </div>

                            <div className="mt-4 space-y-2 text-sm">
                              <p className="text-slate-500 break-all">
                                From:{" "}
                                <span className="text-slate-300 font-mono">
                                  {shortenAddress(tx.from)}
                                </span>
                              </p>

                              <p className="text-slate-500 break-all">
                                To:{" "}
                                <span className="text-slate-300 font-mono">
                                  {shortenAddress(tx.to)}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="sm:text-right sm:shrink-0">
                            <p className="text-base sm:text-lg font-semibold text-white break-words">
                              {formatAmount(tx.value)}{" "}
                              {tx.asset || "ETH"}
                            </p>

                            <p className="text-slate-500 text-sm mt-1">
                              {formatDate(tx.timestamp)}
                            </p>
                          </div>
                        </div>

                        {tx.hash && (
                          <div className="mt-4 pt-4 border-t border-[#26342C]">
                            <p className="text-slate-500 text-xs font-mono break-all">
                              TX: {tx.hash}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {transactions.length > 5 && (
                    <div className="flex justify-center mt-6">
                      <button
                        onClick={() =>
                          setShowAllTransactions(
                            !showAllTransactions
                          )
                        }
                        className="rounded-xl border border-[#34443A] bg-[#0A0F0D] px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-emerald-500 hover:text-emerald-300"
                      >
                        {showAllTransactions
                          ? "Show Less"
                          : `Show More (${transactions.length - 5})`}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* Planned analysis modules */}
            <section className="mt-8">
              <div className="mb-4">
                <p className="text-xs font-semibold tracking-widest text-emerald-500 uppercase">
                  Intelligence modules
                </p>
                <h2 className="text-2xl font-semibold text-white mt-1">
                  Explore Wallet Insights
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Additional analysis modules planned for this project
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    title: "Portfolio",
                    description: "Asset allocation and portfolio insights",
                    icon: "◈",
                  },
                  {
                    title: "Activity",
                    description: "Wallet transaction activity patterns",
                    icon: "↗",
                  },
                  {
                    title: "Behavior",
                    description: "Understand wallet interaction patterns",
                    icon: "⌘",
                  },
                  {
                    title: "Counterparties",
                    description: "Explore connected wallet addresses",
                    icon: "◎",
                  },
                  {
                    title: "AI Analysis",
                    description: "AI-assisted interpretation of wallet data",
                    icon: "✦",
                  },
                  {
                    title: "Risk",
                    description: "Future wallet risk analysis tools",
                    icon: "△",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="group rounded-2xl border border-[#29372F] bg-[#121916] p-5 transition hover:-translate-y-0.5 hover:border-emerald-800/80"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-900/50 bg-emerald-950/40 text-xl text-emerald-400">
                        {item.icon}
                      </div>

                      <span className="rounded-full border border-[#34443A] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Planned
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-white mt-5">
                      {item.title}
                    </h3>

                    <p className="text-sm leading-6 text-slate-500 mt-2">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* AI chat with complete conversation history */}
            <section className="mt-12">
              <div className="mb-4">
                <h2 className="text-2xl font-semibold">
                  AI Analyst
                </h2>
                <p className="text-gray-500 mt-1">
                  Ask anything about this wallet.
                </p>
              </div>

              <div className="rounded-2xl overflow-hidden border border-gray-800 bg-gray-950">
                {/* Chat header */}
                <div className="px-5 py-4 bg-gray-900 border-b border-gray-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-lg">
                    AI
                  </div>

                  <div>
                    <p className="font-semibold">
                      AI Wallet Analyst
                    </p>
                    <p className="text-xs text-green-400">
                      Online
                    </p>
                  </div>
                </div>

                {/* Conversation history */}
                <div className="min-h-[300px] max-h-[600px] overflow-y-auto p-5 space-y-6 bg-black">
                  {chatHistory.length === 0 && (
                    <div className="h-[260px] flex items-center justify-center text-center">
                      <div>
                        <div className="w-14 h-14 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center mx-auto mb-4">
                          🤖
                        </div>

                        <p className="text-gray-300 font-medium">
                          Ask the AI about this wallet
                        </p>

                        <p className="text-gray-600 text-sm mt-2">
                          Your questions and answers will appear here.
                        </p>
                      </div>
                    </div>
                  )}

                  {chatHistory.map((chat) => (
                    <div key={chat.id} className="space-y-4">
                      {/* User question */}
                      <div className="flex justify-end">
                        <div className="max-w-[85%]">
                          <div className="bg-white text-black rounded-2xl rounded-br-md px-4 py-3">
                            <p className="whitespace-pre-wrap leading-6">
                              {chat.question}
                            </p>
                          </div>

                          <p className="text-[11px] text-gray-600 text-right mt-1">
                            You
                          </p>
                        </div>
                      </div>

                      {/* AI answer */}
                      <div className="flex justify-start">
                        <div className="max-w-[90%]">
                          <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
                            {chat.loading ? (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400 text-sm">
                                  Thinking
                                </span>

                                <span className="flex gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" />

                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce"
                                    style={{
                                      animationDelay: "150ms",
                                    }}
                                  />

                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce"
                                    style={{
                                      animationDelay: "300ms",
                                    }}
                                  />
                                </span>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap text-gray-300 leading-7">
                                {chat.answer}
                              </p>
                            )}
                          </div>

                          <p className="text-[11px] text-gray-600 mt-1">
                            AI Wallet Analyst
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chat input */}
                <div className="p-4 bg-gray-900 border-t border-gray-800">
                  <div className="flex items-end gap-3">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={handleChatKeyDown}
                      disabled={loading}
                      rows={1}
                      placeholder="Type a message..."
                      className="flex-1 resize-none bg-black border border-gray-700 rounded-2xl px-4 py-3 text-white outline-none focus:border-gray-400 disabled:opacity-50"
                    />

                    <button
                      onClick={askAI}
                      disabled={loading || !message.trim()}
                      className="w-12 h-12 shrink-0 rounded-full bg-white text-black flex items-center justify-center font-bold text-lg disabled:opacity-40 hover:bg-gray-200 transition"
                      aria-label="Send message"
                    >
                      ↑
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-600 mt-2 px-1">
                    Enter to send · Shift + Enter for a new line
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}