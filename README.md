# 🤖 AI Wallet Analyst


![Wallet Analysis](./screenshots/wallet-search)

AI-powered blockchain wallet intelligence platform that allows users to analyze an Ethereum wallet using real on-chain data and interact with an AI assistant.

The project combines **Next.js, Ethereum blockchain data, Alchemy API, Ollama and Qwen3 LLM** to provide an AI-powered conversational interface for wallet analysis.

Users can enter an Ethereum wallet address, fetch its blockchain data, and ask natural-language questions about the wallet.

---

## 🚀 Project Overview

AI Wallet Analyst is designed to make blockchain wallet data easier to understand through an AI chat interface.

Instead of manually checking blockchain explorers and transaction data, users can:

- Enter an Ethereum wallet address
- Fetch the wallet's current ETH balance
- View ERC-20 token holdings
- View incoming and outgoing transactions
- Analyze wallet activity
- Ask the AI questions about the wallet
- Ask questions using natural language
- Ask questions in different sentence structures
- Use English, Marathi, Hinglish and other natural-language queries

The AI receives the wallet data fetched by the application and uses that data to answer the user's questions.

---

# ✨ Features

## 🔐 Wallet Analysis

Enter any valid Ethereum wallet address and analyze it.

The application fetches:

- Wallet address
- Ethereum Mainnet information
- Current ETH balance
- ERC-20 token holdings
- Token names
- Token symbols
- Token balances
- Token decimals
- Transaction activity

---

## 💰 ETH Balance

The application retrieves the wallet's current ETH balance directly from Ethereum using Alchemy.

The balance is fetched using:

`eth_getBalance`

The application converts the returned Wei value into ETH while preserving precision.

---

## 🪙 ERC-20 Token Holdings

The application retrieves ERC-20 token balances using Alchemy.

For each token, the application attempts to retrieve:

- Token name
- Token symbol
- Token decimals
- Token balance
- Contract address

---

## 📊 Transaction Activity

The application retrieves wallet transaction activity including:

- Incoming transactions
- Outgoing transactions
- ETH transfers
- ERC-20 transfers
- Internal transfers
- Transaction hash
- Sender address
- Recipient address
- Transaction value
- Block number
- Block timestamp
- Asset
- Transaction category

Transactions are displayed in the wallet dashboard.

---

# 🧠 AI Wallet Analyst

The main feature of this project is the AI-powered wallet chat.

The user can ask questions naturally instead of using predefined commands.

For example:

```text
What is my current ETH balance?





This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/pages/api-reference/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.js`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/pages/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn-pages-router) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.
# ai-wallet-analyst
