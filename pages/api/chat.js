const OLLAMA_URL =
  "http://127.0.0.1:11434/api/chat";

const MODEL = "qwen3:4b";

// =====================================================
// CLEAN RESPONSE
// =====================================================

function cleanText(text) {
  if (!text) {
    return "";
  }

  return text
    .replace(
      /<think>[\s\S]*?<\/think>/gi,
      ""
    )
    .replace(
      /<thinking>[\s\S]*?<\/thinking>/gi,
      ""
    )
    .trim();
}

// =====================================================
// EXACT DECIMAL ADDITION
// =====================================================

function addDecimalStrings(values) {
  if (!values || values.length === 0) {
    return "0";
  }

  let maxDecimals = 0;

  const numbers = values.map((value) => {
    const stringValue =
      String(value ?? "0").trim();

    const parts = stringValue.split(".");

    const integerPart =
      parts[0] || "0";

    const decimalPart =
      parts[1] || "";

    maxDecimals = Math.max(
      maxDecimals,
      decimalPart.length
    );

    return {
      integerPart,
      decimalPart,
    };
  });

  let scale = 1n;

  for (
    let i = 0;
    i < maxDecimals;
    i++
  ) {
    scale *= 10n;
  }

  let total = 0n;

  for (const number of numbers) {
    const integerPart =
      number.integerPart.replace(
        /[^0-9]/g,
        ""
      ) || "0";

    const decimalPart =
      number.decimalPart.replace(
        /[^0-9]/g,
        ""
      );

    const paddedDecimal =
      decimalPart.padEnd(
        maxDecimals,
        "0"
      );

    total +=
      BigInt(integerPart) * scale +
      BigInt(
        paddedDecimal || "0"
      );
  }

  let result = total.toString();

  if (maxDecimals === 0) {
    return result;
  }

  result = result.padStart(
    maxDecimals + 1,
    "0"
  );

  const split =
    result.length - maxDecimals;

  const integerPart =
    result.slice(0, split);

  const decimalPart =
    result.slice(split);

  const cleaned =
    decimalPart.replace(
      /0+$/,
      ""
    );

  if (!cleaned) {
    return integerPart;
  }

  return `${integerPart}.${cleaned}`;
}

// =====================================================
// BUILD GENERIC ASSET TRANSFER STATS
// =====================================================

function buildAssetTransferStats(
  transactions
) {
  const map = new Map();

  for (const tx of transactions || []) {
    const asset =
      String(
        tx?.asset || ""
      )
        .trim()
        .toUpperCase();

    const direction =
      String(
        tx?.direction || ""
      ).toUpperCase();

    if (!asset) {
      continue;
    }

    if (
      direction !== "IN" &&
      direction !== "OUT"
    ) {
      continue;
    }

    if (!map.has(asset)) {
      map.set(asset, {
        asset,
        received: "0",
        sent: "0",
        receivedTransactions: 0,
        sentTransactions: 0,
      });
    }

    const item = map.get(asset);

    if (direction === "IN") {
      item.received =
        addDecimalStrings([
          item.received,
          tx?.value,
        ]);

      item.receivedTransactions += 1;
    }

    if (direction === "OUT") {
      item.sent =
        addDecimalStrings([
          item.sent,
          tx?.value,
        ]);

      item.sentTransactions += 1;
    }
  }

  return Array.from(
    map.values()
  );
}

// =====================================================
// FIND TOKEN
// =====================================================

function findToken(
  tokens,
  asset
) {
  if (
    !asset ||
    !Array.isArray(tokens)
  ) {
    return null;
  }

  const query =
    String(asset)
      .trim()
      .toUpperCase();

  return (
    tokens.find(
      (token) =>
        String(
          token?.symbol || ""
        ).toUpperCase() ===
        query
    ) ||

    tokens.find(
      (token) =>
        String(
          token?.name || ""
        ).toUpperCase() ===
        query
    ) ||

    tokens.find(
      (token) =>
        String(
          token?.contractAddress ||
            token?.address ||
            ""
        ).toUpperCase() ===
        query
    ) ||

    null
  );
}

// =====================================================
// FIND ASSET STATS
// =====================================================

function findAssetStats(
  assetTransferStats,
  asset
) {
  if (
    !asset ||
    !Array.isArray(
      assetTransferStats
    )
  ) {
    return null;
  }

  const query =
    String(asset)
      .trim()
      .toUpperCase();

  return (
    assetTransferStats.find(
      (item) =>
        String(
          item?.asset || ""
        ).toUpperCase() ===
        query
    ) || null
  );
}

// =====================================================
// QWEN INTENT SCHEMA
// =====================================================

const intentSchema = {
  type: "object",

  properties: {
    intent: {
      type: "string",

      enum: [
        "conversation",
        "current_eth_balance",
        "holding",
        "all_holdings",
        "received",
        "sent",
        "transaction_count",
        "incoming_transaction_count",
        "outgoing_transaction_count",
        "asset_transaction_count",
        "incoming_transactions",
        "outgoing_transactions",
        "recent_transactions",
        "overview",
        "unknown",
      ],
    },

    asset: {
      anyOf: [
        {
          type: "string",
        },
        {
          type: "null",
        },
      ],
    },
  },

  required: [
    "intent",
    "asset",
  ],
};

// =====================================================
// FINAL ANSWER SCHEMA
// =====================================================

const answerSchema = {
  type: "object",

  properties: {
    answer: {
      type: "string",
    },
  },

  required: [
    "answer",
  ],
};

// =====================================================
// SAFE JSON PARSER
// =====================================================

function parseJsonObject(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// =====================================================
// UNDERSTAND USER QUESTION
// =====================================================

async function understandQuestion(
  message
) {
  const prompt = `
You are the intent understanding layer of an AI Wallet Analyst.

Understand the user's meaning semantically.

The user can write:
- English
- Marathi
- Hindi
- Hinglish
- Marathi-English
- Hindi-English
- informal mixed language
- spelling mistakes
- different sentence structures

There are TWO broad types of user messages:

1. WALLET QUESTIONS
2. NORMAL CONVERSATION

Do NOT answer the question.

Return ONLY JSON matching the required schema.

==================================================
NORMAL CONVERSATION
==================================================

If the user is simply greeting, saying hello/hi/hey,
thanking you, saying okay, or making normal conversation
without asking for wallet information, use:

{
  "intent": "conversation",
  "asset": null
}

Examples:

User:
"hello"

Return:
{
  "intent": "conversation",
  "asset": null
}

User:
"hi"

Return:
{
  "intent": "conversation",
  "asset": null
}

User:
"hey how are you?"

Return:
{
  "intent": "conversation",
  "asset": null
}

User:
"thanks"

Return:
{
  "intent": "conversation",
  "asset": null
}

==================================================
WALLET QUESTIONS
==================================================

The asset field must contain the actual asset/token
mentioned or clearly implied by the user's question.

User:
"How much USDC did this wallet receive?"

Return:
{
  "intent": "received",
  "asset": "USDC"
}

User:
"hello ya wallet madhe USDC kiti recieved zalele ahe?"

Return:
{
  "intent": "received",
  "asset": "USDC"
}

User:
"ya wallet la kiti USDT aale?"

Return:
{
  "intent": "received",
  "asset": "USDT"
}

User:
"या wallet ने किती USDC पाठवले?"

Return:
{
  "intent": "sent",
  "asset": "USDC"
}

User:
"How much USDC do I currently hold?"

Return:
{
  "intent": "holding",
  "asset": "USDC"
}

User:
"माझ्या wallet मध्ये किती ETH आहे?"

Return:
{
  "intent": "current_eth_balance",
  "asset": "ETH"
}

User:
"Which tokens does this wallet hold?"

Return:
{
  "intent": "all_holdings",
  "asset": null
}

User:
"How many transactions does this wallet have?"

Return:
{
  "intent": "transaction_count",
  "asset": null
}

User:
"show incoming transactions"

Return:
{
  "intent": "incoming_transactions",
  "asset": null
}

IMPORTANT:

If the user asks a wallet-related question,
do NOT classify it as conversation.

Do NOT return explanations.

Do NOT return markdown.

Do NOT return reasoning.

Return JSON only.

USER QUESTION:
${message}
`;

  const response = await fetch(
    OLLAMA_URL,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        model: MODEL,

        messages: [
          {
            role: "system",
            content: prompt,
          },

          {
            role: "user",
            content: message,
          },
        ],

        format: intentSchema,

        think: false,

        stream: false,

        options: {
          temperature: 0,

          num_predict: 150,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `Intent model error: ${errorText}`
    );
  }

  const data =
    await response.json();

  const parsed =
    parseJsonObject(
      data?.message?.content
    );

  if (!parsed) {
    return {
      intent: "unknown",
      asset: null,
    };
  }

  return {
    intent:
      parsed.intent ||
      "unknown",

    asset:
      parsed.asset ||
      null,
  };
}

// =====================================================
// RESOLVE WALLET DATA
// =====================================================

function resolveWalletAnswer(
  intentData,
  walletData
) {
  const intent =
    intentData?.intent ||
    "unknown";

  const asset =
    intentData?.asset ||
    null;

  const transactions =
    Array.isArray(
      walletData?.transactions
    )
      ? walletData.transactions
      : [];

  const tokens =
    Array.isArray(
      walletData?.tokens
    )
      ? walletData.tokens
      : [];

  const stats =
    walletData?.stats || {};

  const assetTransferStats =
    Array.isArray(
      walletData?.assetTransferStats
    )
      ? walletData.assetTransferStats
      : buildAssetTransferStats(
          transactions
        );

  // ===================================================
  // CURRENT ETH BALANCE
  // ===================================================

  if (
    intent ===
    "current_eth_balance"
  ) {
    return {
      status: "available",

      type:
        "current_eth_balance",

      asset: "ETH",

      value:
        walletData?.balanceEth ??
        null,
    };
  }

  // ===================================================
  // ALL HOLDINGS
  // ===================================================

  if (
    intent ===
    "all_holdings"
  ) {
    return {
      status: "available",

      type:
        "all_holdings",

      ethBalance:
        walletData?.balanceEth ??
        null,

      holdings:
        tokens,
    };
  }

  // ===================================================
  // CURRENT TOKEN HOLDING
  // ===================================================

  if (
    intent === "holding"
  ) {
    if (!asset) {
      return {
        status:
          "unavailable",

        reason:
          "No specific asset was identified.",
      };
    }

    if (
      String(asset)
        .trim()
        .toUpperCase() ===
      "ETH"
    ) {
      return {
        status: "available",

        type:
          "current_eth_balance",

        asset: "ETH",

        value:
          walletData?.balanceEth ??
          null,
      };
    }

    const token =
      findToken(
        tokens,
        asset
      );

    if (!token) {
      return {
        status:
          "unavailable",

        reason:
          `${asset} is not present in the current wallet holding data.`,
      };
    }

    return {
      status: "available",

      type:
        "holding",

      asset:
        token.symbol ||
        asset,

      tokenName:
        token.name ||
        null,

      value:
        token.balance,
    };
  }

  // ===================================================
  // RECEIVED
  // ===================================================

  if (
    intent ===
    "received"
  ) {
    if (!asset) {
      return {
        status:
          "unavailable",

        reason:
          "No specific asset was identified.",
      };
    }

    const item =
      findAssetStats(
        assetTransferStats,
        asset
      );

    if (!item) {
      return {
        status:
          "unavailable",

        reason:
          `${asset} is not present in the available transaction data.`,
      };
    }

    if (
      item.receivedTransactions ===
      0
    ) {
      return {
        status:
          "available",

        type:
          "received",

        asset:
          item.asset,

        value:
          "0",

        transactionCount:
          0,
      };
    }

    return {
      status: "available",

      type:
        "received",

      asset:
        item.asset,

      value:
        item.received,

      transactionCount:
        item.receivedTransactions,
    };
  }

  // ===================================================
  // SENT
  // ===================================================

  if (
    intent === "sent"
  ) {
    if (!asset) {
      return {
        status:
          "unavailable",

        reason:
          "No specific asset was identified.",
      };
    }

    const item =
      findAssetStats(
        assetTransferStats,
        asset
      );

    if (!item) {
      return {
        status:
          "unavailable",

        reason:
          `${asset} is not present in the available transaction data.`,
      };
    }

    if (
      item.sentTransactions ===
      0
    ) {
      return {
        status:
          "available",

        type:
          "sent",

        asset:
          item.asset,

        value:
          "0",

        transactionCount:
          0,
      };
    }

    return {
      status: "available",

      type:
        "sent",

      asset:
        item.asset,

      value:
        item.sent,

      transactionCount:
        item.sentTransactions,
    };
  }

  // ===================================================
  // TRANSACTION COUNT
  // ===================================================

  if (
    intent ===
    "transaction_count"
  ) {
    return {
      status: "available",

      type:
        "transaction_count",

      value:
        stats.transactionCount ??
        transactions.length,
    };
  }

  // ===================================================
  // INCOMING COUNT
  // ===================================================

  if (
    intent ===
    "incoming_transaction_count"
  ) {
    return {
      status: "available",

      type:
        "incoming_transaction_count",

      value:
        stats.incomingTransactions ??
        transactions.filter(
          (tx) =>
            tx.direction ===
            "IN"
        ).length,
    };
  }

  // ===================================================
  // OUTGOING COUNT
  // ===================================================

  if (
    intent ===
    "outgoing_transaction_count"
  ) {
    return {
      status: "available",

      type:
        "outgoing_transaction_count",

      value:
        stats.outgoingTransactions ??
        transactions.filter(
          (tx) =>
            tx.direction ===
            "OUT"
        ).length,
    };
  }

  // ===================================================
  // SPECIFIC ASSET TRANSACTION COUNT
  // ===================================================

  if (
    intent ===
    "asset_transaction_count"
  ) {
    if (!asset) {
      return {
        status:
          "unavailable",

        reason:
          "No specific asset was identified.",
      };
    }

    const item =
      findAssetStats(
        assetTransferStats,
        asset
      );

    if (!item) {
      return {
        status:
          "unavailable",

        reason:
          `${asset} is not present in the available transaction data.`,
      };
    }

    return {
      status: "available",

      type:
        "asset_transaction_count",

      asset:
        item.asset,

      value:
        item.receivedTransactions +
        item.sentTransactions,
    };
  }

  // ===================================================
  // INCOMING TRANSACTIONS
  // ===================================================

  if (
    intent ===
    "incoming_transactions"
  ) {
    let filtered =
      transactions.filter(
        (tx) =>
          String(
            tx?.direction ||
              ""
          ).toUpperCase() ===
          "IN"
      );

    if (asset) {
      filtered =
        filtered.filter(
          (tx) =>
            String(
              tx?.asset || ""
            ).toUpperCase() ===
            String(
              asset
            ).toUpperCase()
        );
    }

    return {
      status:
        "available",

      type:
        "incoming_transactions",

      asset:
        asset || null,

      count:
        filtered.length,

      transactions:
        filtered.slice(
          0,
          25
        ),
    };
  }

  // ===================================================
  // OUTGOING TRANSACTIONS
  // ===================================================

  if (
    intent ===
    "outgoing_transactions"
  ) {
    let filtered =
      transactions.filter(
        (tx) =>
          String(
            tx?.direction ||
              ""
          ).toUpperCase() ===
          "OUT"
      );

    if (asset) {
      filtered =
        filtered.filter(
          (tx) =>
            String(
              tx?.asset || ""
            ).toUpperCase() ===
            String(
              asset
            ).toUpperCase()
        );
    }

    return {
      status:
        "available",

      type:
        "outgoing_transactions",

      asset:
        asset || null,

      count:
        filtered.length,

      transactions:
        filtered.slice(
          0,
          25
        ),
    };
  }

  // ===================================================
  // RECENT TRANSACTIONS
  // ===================================================

  if (
    intent ===
    "recent_transactions"
  ) {
    return {
      status:
        transactions.length >
        0
          ? "available"
          : "unavailable",

      type:
        "recent_transactions",

      transactions:
        transactions.slice(
          0,
          10
        ),
    };
  }

  // ===================================================
  // OVERVIEW
  // ===================================================

  if (
    intent === "overview"
  ) {
    return {
      status: "available",

      type:
        "overview",

      address:
        walletData?.address ||
        null,

      network:
        walletData?.network ||
        null,

      currentEthBalance:
        walletData?.balanceEth ||
        null,

      holdings:
        tokens,

      stats,
    };
  }

  // ===================================================
  // UNKNOWN
  // ===================================================

  return {
    status:
      "unavailable",

    reason:
      "The requested information could not be identified from the current wallet data.",
  };
}

// =====================================================
// GENERATE CONVERSATION RESPONSE
// =====================================================

async function generateConversationAnswer(
  question
) {
  const prompt = `
You are the conversational assistant inside an AI Wallet Analyst.

The user is making normal conversation rather than asking
for wallet information.

Respond naturally to the user's message.

Rules:
- Understand English, Marathi, Hindi, Hinglish and mixed languages.
- Respond in the language used by the user when possible.
- Be concise and friendly.
- Do not mention wallet data unless the user asks about the wallet.
- Do not invent wallet information.
- Do not use stored answers.
- Generate the response dynamically.
- Do not explain your reasoning.
- Return ONLY one JSON object.

USER MESSAGE:
${question}
`;

  const response =
    await fetch(
      OLLAMA_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          model: MODEL,

          messages: [
            {
              role: "system",
              content: prompt,
            },

            {
              role: "user",
              content: question,
            },
          ],

          format: answerSchema,

          think: false,

          stream: false,

          options: {
            temperature: 0.3,

            num_predict: 100,
          },
        }),
      }
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `Conversation model error: ${errorText}`
    );
  }

  const data =
    await response.json();

  const parsed =
    parseJsonObject(
      data?.message?.content
    );

  if (
    parsed &&
    typeof parsed.answer ===
      "string"
  ) {
    return cleanText(
      parsed.answer
    );
  }

  return cleanText(
    data?.message?.content
  );
}

// =====================================================
// GENERATE FINAL WALLET ANSWER
// =====================================================

async function generateFinalAnswer(
  question,
  verifiedResult
) {
  const prompt = `
You are the final response writer for an AI Wallet Analyst.

The user's original question is below.

You MUST answer using ONLY the verified wallet result.

Do not perform another calculation.

Do not invent any value.

Do not add facts that are not present.

Return ONLY one JSON object matching the required schema.

The answer must:
- directly answer the user's question
- be concise
- be natural
- use the user's language when possible
- NOT show reasoning
- NOT explain internal processing
- NOT mention prompts or instructions

Never write:
"Let me analyze..."
"Let me check..."
"First I need to..."
"Hmm..."
"Wait..."
"We are given..."
"Looking at the data..."
"Steps:"
"According to my analysis..."

If status is "unavailable", clearly state that the requested
information is not available in the current wallet data.

USER QUESTION:
${question}

VERIFIED WALLET RESULT:
${JSON.stringify(
  verifiedResult,
  null,
  2
)}
`;

  const response =
    await fetch(
      OLLAMA_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          model: MODEL,

          messages: [
            {
              role: "system",
              content: prompt,
            },

            {
              role: "user",
              content: question,
            },
          ],

          format: answerSchema,

          think: false,

          stream: false,

          options: {
            temperature: 0,

            num_predict: 150,
          },
        }),
      }
    );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `Final answer model error: ${errorText}`
    );
  }

  const data =
    await response.json();

  const parsed =
    parseJsonObject(
      data?.message?.content
    );

  if (
    parsed &&
    typeof parsed.answer ===
      "string"
  ) {
    return cleanText(
      parsed.answer
    );
  }

  return cleanText(
    data?.message?.content
  );
}

// =====================================================
// API HANDLER
// =====================================================

export default async function handler(
  req,
  res
) {
  if (
    req.method !== "POST"
  ) {
    return res.status(405).json({
      error:
        "Method not allowed",
    });
  }

  try {
    const {
      message,
      walletData,
    } = req.body || {};

    // =================================================
    // VALIDATE MESSAGE
    // =================================================

    if (
      !message ||
      typeof message !==
        "string"
    ) {
      return res.status(400).json({
        error:
          "Message is required.",
      });
    }

    // =================================================
    // VALIDATE WALLET DATA
    // =================================================

    if (
      !walletData ||
      typeof walletData !==
        "object"
    ) {
      return res.status(400).json({
        error:
          "Wallet data is required. Analyze a wallet first.",
      });
    }

    // =================================================
    // STEP 1
    // UNDERSTAND USER INTENT
    // =================================================

    const intent =
      await understandQuestion(
        message.trim()
      );

    console.log(
      "AI intent:",
      intent
    );

    // =================================================
    // STEP 2
    // NORMAL CONVERSATION
    // =================================================

    if (
      intent.intent ===
      "conversation"
    ) {
      const answer =
        await generateConversationAnswer(
          message.trim()
        );

      if (!answer) {
        return res.status(500).json({
          error:
            "AI returned an empty response.",
        });
      }

      return res.status(200).json({
        response:
          answer,

        intent,
      });
    }

    // =================================================
    // STEP 3
    // WALLET DATA RESOLUTION
    // =================================================

    const verifiedResult =
      resolveWalletAnswer(
        intent,
        walletData
      );

    console.log(
      "Verified wallet result:",
      verifiedResult
    );

    // =================================================
    // STEP 4
    // FINAL WALLET ANSWER
    // =================================================

    const answer =
      await generateFinalAnswer(
        message.trim(),
        verifiedResult
      );

    if (!answer) {
      return res.status(500).json({
        error:
          "AI returned an empty response.",
      });
    }

    return res.status(200).json({
      response:
        answer,

      intent,

      verifiedResult,
    });
  } catch (error) {
    console.error(
      "Chat API error:",
      error
    );

    return res.status(500).json({
      error:
        error.message ||
        "Failed to process AI request.",
    });
  }
  
}