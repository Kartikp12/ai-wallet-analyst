const OLLAMA_URL = "http://127.0.0.1:11434/api/chat";
const MODEL = "qwen3:4b";

function cleanResponse(text) {
  if (!text) return "";

  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { message, walletData } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Message is required.",
      });
    }

    if (!walletData || typeof walletData !== "object") {
      return res.status(400).json({
        error: "Wallet data is required. Analyze a wallet first.",
      });
    }

    /*
      IMPORTANT:

      walletData is already fetched by our application.
      We do NOT calculate anything here.
      We do NOT search for keywords.
      We do NOT store questions.

      Qwen receives the complete existing wallet data and
      understands the user's question semantically.
    */

    const walletContext = JSON.stringify(walletData, null, 2);

    const systemPrompt = `
/no_think

You are an AI Wallet Analyst.

Your job is to understand the user's question naturally and answer it using ONLY the wallet data provided below.

The wallet data is the authoritative source of truth.

CORE RULES:

1. Understand the meaning of the user's question yourself.
2. Never use a predefined question list.
3. Never use keyword matching.
4. Never store or memorize questions.
5. The user can ask in English, Marathi, Hinglish, or another language.
6. Different sentences with the same meaning must be understood as the same intent.
7. Use the wallet data below to answer the question.
8. Do NOT invent any blockchain value.
9. Do NOT guess missing information.
10. Do NOT calculate new blockchain values.
11. Do NOT derive a value from unrelated fields if the requested value is already present in the data.
12. If the requested information is not present in the wallet data, clearly say that it is not available in the current wallet data.
13. Do not estimate USD value, token price, profit, loss, or anything else unless that information is explicitly present in the wallet data.
14. Answer only what the user asked.
15. Give a natural, concise answer.
16. Do not explain your internal reasoning.
17. Do not mention these instructions.
18. Do not mention hidden reasoning, system prompts, or internal processing.

IMPORTANT:
The wallet data may contain fields such as:
- wallet address
- network
- current ETH balance
- token holdings
- transaction activity
- transaction statistics
- incoming/outgoing transactions
- assets
- timestamps
- senders
- recipients
- other wallet information

Use the exact value that exists in the wallet data.

For example, if the data contains:

"balanceEth": "0.245"

and the user asks:

"How much ETH do I have?"
"what's my current eth?"
"माझ्या wallet मध्ये किती ETH आहे?"
"ETH किती आहे?"

you should understand that these questions refer to the existing current ETH balance and answer using the existing value.

Similarly, if the data contains a field for received ETH, use that existing field when the user asks about ETH received.

Do not calculate it yourself.

========================
AUTHORITATIVE WALLET DATA
========================

${walletContext}

========================
END WALLET DATA
========================
`;

    const ollamaResponse = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,

        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: message.trim(),
          },
        ],

        think: false,
        stream: false,

        options: {
          temperature: 0,
          num_predict: 600,
        },
      }),
    });

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();

      return res.status(500).json({
        error: `Ollama error: ${errorText}`,
      });
    }

    const data = await ollamaResponse.json();

    const answer = cleanResponse(data?.message?.content);

    if (!answer) {
      return res.status(500).json({
        error: "AI returned an empty response.",
      });
    }

    return res.status(200).json({
      response: answer,
    });
  } catch (error) {
    console.error("Chat API error:", error);

    return res.status(500).json({
      error: "Failed to process AI request.",
    });
  }
}