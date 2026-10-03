export default async function handler(req, res) {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method not allowed",
      });
    }
  
    try {
      const { address } = req.body;
  
      if (!address) {
        return res.status(400).json({
          error: "Wallet address is required",
        });
      }
  
      const apiKey = process.env.ALCHEMY_API_KEY;
  
      if (!apiKey) {
        return res.status(500).json({
          error: "Alchemy API key is missing",
        });
      }
  
      const url = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;
  
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "alchemy_getAssetTransfers",
          params: [
            {
              fromAddress: address,
              category: [
                "external",
                "internal",
                "erc20",
                "erc721",
                "erc1155",
              ],
              withMetadata: true,
              excludeZeroValue: true,
              maxCount: "0x14",
              order: "desc",
            },
          ],
        }),
      });
  
      const outgoingData = await response.json();
  
      if (outgoingData.error) {
        throw new Error(
          outgoingData.error.message || "Failed to fetch outgoing transactions"
        );
      }
  
      const incomingResponse = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "alchemy_getAssetTransfers",
          params: [
            {
              toAddress: address,
              category: [
                "external",
                "internal",
                "erc20",
                "erc721",
                "erc1155",
              ],
              withMetadata: true,
              excludeZeroValue: true,
              maxCount: "0x14",
              order: "desc",
            },
          ],
        }),
      });
  
      const incomingData = await incomingResponse.json();
  
      if (incomingData.error) {
        throw new Error(
          incomingData.error.message || "Failed to fetch incoming transactions"
        );
      }
  
      const outgoing = (outgoingData.result?.transfers || []).map((tx) => ({
        ...tx,
        direction: "OUT",
      }));
  
      const incoming = (incomingData.result?.transfers || []).map((tx) => ({
        ...tx,
        direction: "IN",
      }));
  
      const transactions = [...outgoing, ...incoming]
        .sort((a, b) => {
          const dateA = new Date(a.metadata?.blockTimestamp || 0);
          const dateB = new Date(b.metadata?.blockTimestamp || 0);
  
          return dateB - dateA;
        })
        .slice(0, 20);
  
      return res.status(200).json({
        address,
        count: transactions.length,
        transactions,
      });
    } catch (error) {
      console.error("Transaction API error:", error);
  
      return res.status(500).json({
        error: error.message || "Failed to fetch transactions",
      });
    }
  }