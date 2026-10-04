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
  
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({
          error: "Invalid Ethereum wallet address",
        });
      }
  
      const apiKey =
        process.env.ALCHEMY_API_KEY;
  
      if (!apiKey) {
        return res.status(500).json({
          error:
            "ALCHEMY_API_KEY is missing from .env.local",
        });
      }
  
      const url =
        `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;
  
      async function getTransfers(
        id,
        params
      ) {
        const response =
          await fetch(url, {
            method: "POST",
  
            headers: {
              "Content-Type":
                "application/json",
            },
  
            body: JSON.stringify({
              jsonrpc: "2.0",
              id,
              method:
                "alchemy_getAssetTransfers",
              params: [params],
            }),
          });
  
        if (!response.ok) {
          throw new Error(
            `Alchemy request failed with status ${response.status}`
          );
        }
  
        const data =
          await response.json();
  
        if (data.error) {
          throw new Error(
            data.error.message ||
              "Failed to fetch transactions"
          );
        }
  
        return (
          data.result?.transfers || []
        );
      }
  
      const outgoing =
        await getTransfers(1, {
          fromBlock: "0x0",
          toBlock: "latest",
  
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
  
          maxCount: "0x64",
  
          order: "desc",
        });
  
      const incoming =
        await getTransfers(2, {
          fromBlock: "0x0",
          toBlock: "latest",
  
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
  
          maxCount: "0x64",
  
          order: "desc",
        });
  
      const all = [
        ...outgoing.map((tx) => ({
          ...tx,
          direction: "OUT",
        })),
  
        ...incoming.map((tx) => ({
          ...tx,
          direction: "IN",
        })),
      ];
  
      const unique =
        Array.from(
          new Map(
            all.map((tx) => {
              const key = [
                tx.hash || "",
                tx.from || "",
                tx.to || "",
                tx.value ?? "",
                tx.asset || "",
                tx.category || "",
                tx.direction || "",
              ].join("|");
  
              return [key, tx];
            })
          ).values()
        );
  
      unique.sort((a, b) => {
        const dateA =
          new Date(
            a.metadata?.blockTimestamp || 0
          ).getTime();
  
        const dateB =
          new Date(
            b.metadata?.blockTimestamp || 0
          ).getTime();
  
        return dateB - dateA;
      });
  
      const transactions =
        unique.map((tx) => ({
          hash:
            tx.hash || null,
  
          direction:
            tx.direction || null,
  
          from:
            tx.from || null,
  
          to:
            tx.to || null,
  
          asset:
            tx.asset || "ETH",
  
          value:
            tx.value ?? "0",
  
          category:
            tx.category || "unknown",
  
          blockNum:
            tx.blockNum || null,
  
          timestamp:
            tx.metadata?.blockTimestamp ||
            null,
        }));
  
      return res.status(200).json({
        address,
        count: transactions.length,
        transactions,
      });
    } catch (error) {
      console.error(
        "Transaction API error:",
        error
      );
  
      return res.status(500).json({
        error:
          error.message ||
          "Failed to fetch transactions",
      });
    }
  }