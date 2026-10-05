import { useState } from "react";

export default function Home() {
  const [walletAddress, setWalletAddress] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [response, setResponse] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [walletValid, setWalletValid] =
    useState(null);

  const [walletData, setWalletData] =
    useState(null);

  const [walletLoading, setWalletLoading] =
    useState(false);

  const [walletError, setWalletError] =
    useState("");

  const [transactions, setTransactions] =
    useState([]);

  const [transactionError, setTransactionError] =
    useState("");

  // =====================================================
  // UI ONLY
  // SHOW MORE / SHOW LESS
  // =====================================================

  const [showAllTokens, setShowAllTokens] =
    useState(false);

  const [showAllTransactions, setShowAllTransactions] =
    useState(false);

  // =====================================================
  // VALIDATE WALLET
  // =====================================================

  const validateWallet = (address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(
      address
    );
  };

  // =====================================================
  // WALLET INPUT
  // =====================================================

  const handleWalletChange = (e) => {
    const value =
      e.target.value.trim();

    setWalletAddress(value);

    setWalletData(null);
    setTransactions([]);

    setResponse("");

    setWalletError("");
    setTransactionError("");

    setShowAllTokens(false);
    setShowAllTransactions(false);

    if (!value) {
      setWalletValid(null);
      return;
    }

    setWalletValid(
      validateWallet(value)
    );
  };

  // =====================================================
  // ANALYZE WALLET
  // =====================================================

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

    setShowAllTokens(false);
    setShowAllTransactions(false);

    try {
      const walletRes =
        await fetch(
          "/api/wallet",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              address:
                walletAddress,
            }),
          }
        );

      const walletResult =
        await walletRes.json();

      if (!walletRes.ok) {
        throw new Error(
          walletResult.error ||
            "Failed to fetch wallet data"
        );
      }

      setWalletData(
        walletResult
      );

      setTransactions(
        walletResult.transactions ||
          []
      );
    } catch (error) {
      console.error(
        "Wallet analysis error:",
        error
      );

      setWalletError(
        error.message ||
          "Failed to analyze wallet"
      );
    } finally {
      setWalletLoading(false);
    }
  };

  // =====================================================
  // ASK AI
  // =====================================================

  const askAI = async () => {
    if (!message.trim()) {
      return;
    }

    if (!walletData) {
      setResponse(
        "Please analyze a wallet first so the AI can analyze its on-chain data."
      );
      return;
    }

    setLoading(true);
    setResponse("");

    try {
      const res =
        await fetch(
          "/api/chat",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              message:
                message.trim(),

              walletData,
            }),
          }
        );

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Something went wrong"
        );
      }

      setResponse(
        data.response || ""
      );
    } catch (error) {
      console.error(
        "AI error:",
        error
      );

      setResponse(
        `Error: ${
          error.message ||
          "Could not get AI response"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // ENTER KEY FOR CHAT
  // =====================================================

  const handleChatKeyDown = (e) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();

      if (
        !loading &&
        walletData &&
        message.trim()
      ) {
        askAI();
      }
    }
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (
    timestamp
  ) => {
    if (!timestamp) {
      return "Unknown";
    }

    const date =
      new Date(timestamp);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "Unknown";
    }

    return date.toLocaleString();
  };

  // =====================================================
  // SHORT ADDRESS
  // =====================================================

  const shortenAddress = (
    address
  ) => {
    if (!address) {
      return "Unknown";
    }

    return `${address.slice(
      0,
      6
    )}...${address.slice(-4)}`;
  };

  // =====================================================
  // FORMAT AMOUNT
  // =====================================================

  const formatAmount = (
    value
  ) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "0";
    }

    const number =
      Number(value);

    if (
      Number.isNaN(number)
    ) {
      return String(value);
    }

    return number.toLocaleString(
      undefined,
      {
        maximumFractionDigits: 6,
      }
    );
  };

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto py-16">

        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="mb-12">
          <p className="text-sm text-gray-500 mb-3">
            AI-POWERED BLOCKCHAIN INTELLIGENCE
          </p>

          <h1 className="text-5xl font-bold tracking-tight">
            AI Wallet Analyst
          </h1>

          <p className="text-gray-400 mt-4 max-w-2xl">
            Analyze blockchain wallets,
            understand their activity,
            behavior, transactions and
            risk using AI.
          </p>
        </div>

        {/* ================================================= */}
        {/* WALLET INPUT */}
        {/* ================================================= */}

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">

          <label className="block text-sm text-gray-400 mb-3">
            Wallet Address
          </label>

          <input
            type="text"
            value={walletAddress}
            onChange={
              handleWalletChange
            }
            placeholder="0x..."
            className="w-full bg-black border border-gray-700 rounded-xl px-4 py-4 text-white outline-none focus:border-gray-400"
          />

          {walletValid ===
            true && (
            <p className="text-green-400 text-sm mt-3">
              ✓ Valid EVM wallet address
            </p>
          )}

          {walletValid ===
            false && (
            <p className="text-red-400 text-sm mt-3">
              ✕ Invalid wallet address
            </p>
          )}

          <button
            onClick={
              analyzeWallet
            }
            disabled={
              !walletValid ||
              walletLoading
            }
            className="mt-5 px-6 py-3 rounded-xl bg-white text-black font-medium disabled:opacity-40"
          >
            {walletLoading
              ? "Analyzing..."
              : "Analyze Wallet"}
          </button>
        </div>

        {/* ================================================= */}
        {/* WALLET ERROR */}
        {/* ================================================= */}

        {walletError && (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-4">
            <p className="text-red-400">
              {walletError}
            </p>
          </div>
        )}

        {/* ================================================= */}
        {/* WALLET SUMMARY */}
        {/* ================================================= */}

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

        {/* ================================================= */}
        {/* WALLET STATS */}
        {/* ================================================= */}

        {walletData?.stats && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-gray-500 text-sm">
                Transactions
              </p>

              <p className="text-xl font-semibold mt-2">
                {
                  walletData.stats
                    .transactionCount
                }
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-gray-500 text-sm">
                Incoming
              </p>

              <p className="text-xl font-semibold mt-2 text-green-400">
                {
                  walletData.stats
                    .incomingTransactions
                }
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-gray-500 text-sm">
                Outgoing
              </p>

              <p className="text-xl font-semibold mt-2 text-red-400">
                {
                  walletData.stats
                    .outgoingTransactions
                }
              </p>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-gray-500 text-sm">
                ETH Transfers
              </p>

              <p className="text-xl font-semibold mt-2">
                {
                  walletData.stats
                    .ethTransactionCount
                }
              </p>
            </div>

          </div>
        )}

        {/* ================================================= */}
        {/* TOKEN HOLDINGS */}
        {/* ================================================= */}

        {walletData?.tokens &&
          walletData.tokens.length >
            0 && (
          <div className="mt-6 bg-gray-900 border border-gray-800 rounded-2xl p-6">

            <div className="flex items-center justify-between mb-6">

              <div>
                <h2 className="text-2xl font-semibold">
                  Token Holdings
                </h2>

                <p className="text-gray-500 mt-1">
                  ERC-20 tokens held by
                  this wallet
                </p>
              </div>

              <p className="text-gray-500">
                {
                  walletData.tokens
                    .length
                }{" "}
                tokens
              </p>

            </div>

            <div className="space-y-4">

              {(showAllTokens
                ? walletData.tokens
                : walletData.tokens.slice(
                    0,
                    5
                  )
              ).map(
                (
                  token,
                  index
                ) => (
                  <div
                    key={
                      token.contractAddress ||
                      token.address ||
                      index
                    }
                    className="bg-black border border-gray-800 rounded-xl p-5 flex items-center justify-between"
                  >

                    <div>
                      <p className="text-lg font-medium">
                        {
                          token.symbol ||
                          "Unknown"
                        }
                      </p>

                      <p className="text-gray-500 text-sm mt-1">
                        {
                          token.name ||
                          "Unknown Token"
                        }
                      </p>
                    </div>

                    <div className="text-right">

                      <p className="text-lg">
                        {
                          formatAmount(
                            token.balance
                          )
                        }
                      </p>

                      <p className="text-gray-500 text-sm">
                        Token Balance
                      </p>

                    </div>

                  </div>
                )
              )}

            </div>

            {walletData.tokens.length >
              5 && (
              <div className="flex justify-center mt-6">

                <button
                  onClick={() =>
                    setShowAllTokens(
                      !showAllTokens
                    )
                  }
                  className="px-5 py-2.5 rounded-xl border border-gray-700 bg-black text-gray-300 hover:border-gray-500 hover:text-white transition"
                >
                  {showAllTokens
                    ? "Show Less"
                    : `Show More (${walletData.tokens.length - 5})`}
                </button>

              </div>
            )}

          </div>
        )}

        {/* ================================================= */}
        {/* TRANSACTION ACTIVITY */}
        {/* ================================================= */}

        {walletData && (
          <div className="mt-6 bg-gray-900 border border-gray-800 rounded-2xl p-6">

            <div className="flex items-center justify-between mb-6">

              <div>
                <h2 className="text-2xl font-semibold">
                  Transaction Activity
                </h2>

                <p className="text-gray-500 mt-1">
                  Recent on-chain activity
                  available from the
                  wallet data
                </p>
              </div>

              <p className="text-gray-500">
                {
                  transactions.length
                }{" "}
                transactions
              </p>

            </div>

            {transactionError && (
              <div className="rounded-xl border border-red-900 bg-red-950/30 p-4">
                <p className="text-red-400">
                  {
                    transactionError
                  }
                </p>
              </div>
            )}

            {!transactionError &&
              transactions.length ===
                0 && (
                <div className="py-10 text-center">
                  <p className="text-gray-500">
                    No transaction
                    activity found.
                  </p>
                </div>
              )}

            {transactions.length >
              0 && (
              <>
                <div className="space-y-3">

                  {(showAllTransactions
                    ? transactions
                    : transactions.slice(
                        0,
                        5
                      )
                  ).map(
                    (
                      tx,
                      index
                    ) => (
                      <div
                        key={`${tx.hash || "tx"}-${index}`}
                        className="bg-black border border-gray-800 rounded-xl p-5"
                      >

                        <div className="flex items-start justify-between gap-4">

                          <div className="min-w-0">

                            <div className="flex items-center gap-3 flex-wrap">

                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  tx.direction ===
                                  "IN"
                                    ? "bg-green-950 text-green-400 border border-green-900"
                                    : "bg-red-950 text-red-400 border border-red-900"
                                }`}
                              >
                                {
                                  tx.direction
                                }
                              </span>

                              <span className="text-gray-300">
                                {
                                  tx.asset ||
                                  "ETH"
                                }
                              </span>

                              <span className="text-gray-500 text-sm">
                                {
                                  tx.category ||
                                  "transfer"
                                }
                              </span>

                            </div>

                            <div className="mt-4 space-y-2 text-sm">

                              <p className="text-gray-500">
                                From:{" "}
                                <span className="text-gray-300 font-mono">
                                  {shortenAddress(
                                    tx.from
                                  )}
                                </span>
                              </p>

                              <p className="text-gray-500">
                                To:{" "}
                                <span className="text-gray-300 font-mono">
                                  {shortenAddress(
                                    tx.to
                                  )}
                                </span>
                              </p>

                            </div>

                          </div>

                          <div className="text-right shrink-0">

                            <p className="text-lg font-semibold">
                              {
                                formatAmount(
                                  tx.value
                                )
                              }{" "}
                              {
                                tx.asset ||
                                "ETH"
                              }
                            </p>

                            <p className="text-gray-500 text-sm mt-1">
                              {
                                formatDate(
                                  tx.timestamp
                                )
                              }
                            </p>

                          </div>

                        </div>

                        {tx.hash && (
                          <div className="mt-4 pt-4 border-t border-gray-800">

                            <p className="text-gray-600 text-xs font-mono break-all">
                              TX:{" "}
                              {
                                tx.hash
                              }
                            </p>

                          </div>
                        )}

                      </div>
                    )
                  )}

                </div>

                {transactions.length >
                  5 && (
                  <div className="flex justify-center mt-6">

                    <button
                      onClick={() =>
                        setShowAllTransactions(
                          !showAllTransactions
                        )
                      }
                      className="px-5 py-2.5 rounded-xl border border-gray-700 bg-black text-gray-300 hover:border-gray-500 hover:text-white transition"
                    >
                      {showAllTransactions
                        ? "Show Less"
                        : `Show More (${transactions.length - 5})`}
                    </button>

                  </div>
                )}

              </>
            )}

          </div>
        )}

        {/* ================================================= */}
        {/* ANALYSIS SECTIONS */}
        {/* ================================================= */}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">

          {[
            "Portfolio",
            "Activity",
            "Behavior",
            "Counterparties",
            "AI Analysis",
            "Risk",
          ].map(
            (item) => (
              <div
                key={item}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5"
              >
                <p className="text-gray-300">
                  {item}
                </p>

                <p className="text-xs text-gray-600 mt-2">
                  Coming soon
                </p>
              </div>
            )
          )}

        </div>

        {/* ================================================= */}
        {/* WHATSAPP STYLE AI CHAT */}
        {/* ================================================= */}

        {walletData && (
          <div className="mt-12">

            <div className="mb-4">
              <h2 className="text-2xl font-semibold">
                AI Analyst
              </h2>

              <p className="text-gray-500 mt-1">
                Ask anything about this
                wallet.
              </p>
            </div>

            <div className="rounded-2xl overflow-hidden border border-gray-800 bg-gray-950">

              {/* CHAT HEADER */}

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

              {/* CHAT AREA */}

              <div className="min-h-[300px] max-h-[500px] overflow-y-auto p-5 space-y-5 bg-black">

                {/* EMPTY CHAT */}

                {!message &&
                  !response &&
                  !loading && (
                    <div className="h-[260px] flex items-center justify-center text-center">

                      <div>
                        <div className="w-14 h-14 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center mx-auto mb-4">
                          🤖
                        </div>

                        <p className="text-gray-300 font-medium">
                          Ask the AI about
                          this wallet
                        </p>

                        <p className="text-gray-600 text-sm mt-2">
                          Try asking about
                          balances,
                          transactions or
                          token activity.
                        </p>
                      </div>

                    </div>
                  )}

                {/* USER MESSAGE */}

                {message && (
                  <div className="flex justify-end">

                    <div className="max-w-[80%]">

                      <div className="bg-white text-black rounded-2xl rounded-br-md px-4 py-3">

                        <p className="whitespace-pre-wrap leading-6">
                          {message}
                        </p>

                      </div>

                      <p className="text-[11px] text-gray-600 text-right mt-1">
                        You
                      </p>

                    </div>

                  </div>
                )}

                {/* AI LOADING */}

                {loading && (
                  <div className="flex justify-start">

                    <div className="max-w-[80%]">

                      <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-bl-md px-4 py-3">

                        <div className="flex items-center gap-2">

                          <span className="text-gray-400 text-sm">
                            Thinking
                          </span>

                          <span className="flex gap-1">

                            <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" />

                            <span
                              className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce"
                              style={{
                                animationDelay:
                                  "150ms",
                              }}
                            />

                            <span
                              className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce"
                              style={{
                                animationDelay:
                                  "300ms",
                              }}
                            />

                          </span>

                        </div>

                      </div>

                      <p className="text-[11px] text-gray-600 mt-1">
                        AI
                      </p>

                    </div>

                  </div>
                )}

                {/* AI RESPONSE */}

                {response &&
                  !loading && (
                    <div className="flex justify-start">

                      <div className="max-w-[80%]">

                        <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-bl-md px-4 py-3">

                          <p className="whitespace-pre-wrap text-gray-300 leading-7">
                            {response}
                          </p>

                        </div>

                        <p className="text-[11px] text-gray-600 mt-1">
                          AI Wallet Analyst
                        </p>

                      </div>

                    </div>
                  )}

              </div>

              {/* CHAT INPUT */}

              <div className="p-4 bg-gray-900 border-t border-gray-800">

                <div className="flex items-end gap-3">

                  <textarea
                    value={message}
                    onChange={(e) =>
                      setMessage(
                        e.target.value
                      )
                    }
                    onKeyDown={
                      handleChatKeyDown
                    }
                    disabled={loading}
                    rows={1}
                    placeholder="Type a message..."
                    className="flex-1 resize-none bg-black border border-gray-700 rounded-2xl px-4 py-3 text-white outline-none focus:border-gray-400 disabled:opacity-50"
                  />

                  <button
                    onClick={askAI}
                    disabled={
                      loading ||
                      !message.trim()
                    }
                    className="w-12 h-12 shrink-0 rounded-full bg-white text-black flex items-center justify-center font-bold text-lg disabled:opacity-40 hover:bg-gray-200 transition"
                    aria-label="Send message"
                  >
                    ↑
                  </button>

                </div>

                <p className="text-[11px] text-gray-600 mt-2 px-1">
                  Enter to send · Shift + Enter
                  for a new line
                </p>

              </div>

            </div>

          </div>
        )}

      </div>
    </main>
  );
}