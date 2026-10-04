export default async function handler(req, res) {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method not allowed",
      });
    }
  
    try {
      const { address } = req.body;
  
      // =====================================================
      // VALIDATE ADDRESS
      // =====================================================
  
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
  
      const apiKey = process.env.ALCHEMY_API_KEY;
  
      if (!apiKey) {
        return res.status(500).json({
          error: "ALCHEMY_API_KEY is missing from .env.local",
        });
      }
  
      const alchemyUrl =
        `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;
  
      // =====================================================
      // HELPER
      // =====================================================
  
      async function alchemyRequest(id, method, params) {
        const response = await fetch(alchemyUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id,
            method,
            params,
          }),
        });
  
        if (!response.ok) {
          throw new Error(
            `Alchemy request failed with status ${response.status}`
          );
        }
  
        const data = await response.json();
  
        if (data.error) {
          throw new Error(
            data.error.message ||
              `Alchemy ${method} request failed`
          );
        }
  
        return data.result;
      }
  
      // =====================================================
      // 1. CURRENT ETH BALANCE
      // =====================================================
  
      const balanceResult = await alchemyRequest(
        1,
        "eth_getBalance",
        [address, "latest"]
      );
  
      const balanceWei = BigInt(balanceResult);
  
      const WEI_PER_ETH = 1000000000000000000n;
  
      const wholeEth =
        balanceWei / WEI_PER_ETH;
  
      const fractionalWei =
        balanceWei % WEI_PER_ETH;
  
      const fractionalPart =
        fractionalWei
          .toString()
          .padStart(18, "0")
          .slice(0, 18);
  
      const balanceEthRaw =
        `${wholeEth}.${fractionalPart}`;
  
      const balanceEth =
        balanceEthRaw
          .replace(/(\.\d*?[1-9])0+$/, "$1")
          .replace(/\.0+$/, "");
  
      // =====================================================
      // 2. TOKEN BALANCES
      // =====================================================
  
      const tokenResult = await alchemyRequest(
        2,
        "alchemy_getTokenBalances",
        [address, "erc20"]
      );
  
      const rawTokens =
        tokenResult?.tokenBalances || [];
  
      // Only keep tokens with a non-zero balance.
      const nonZeroTokens =
        rawTokens.filter((token) => {
          try {
            return BigInt(
              token.tokenBalance || "0x0"
            ) !== 0n;
          } catch {
            return false;
          }
        });
  
      // =====================================================
      // 3. TOKEN METADATA
      // =====================================================
  
      const tokens = await Promise.all(
        nonZeroTokens.map(async (token, index) => {
          try {
            const metadata =
              await alchemyRequest(
                100 + index,
                "alchemy_getTokenMetadata",
                [token.contractAddress]
              );
  
            const rawBalance = BigInt(
              token.tokenBalance || "0x0"
            );
  
            const decimals =
              Number(metadata?.decimals ?? 0);
  
            let formattedBalance = "0";
  
            if (decimals > 0) {
              const divisor =
                10 ** decimals;
  
              const balanceNumber =
                Number(rawBalance) / divisor;
  
              formattedBalance =
                balanceNumber.toLocaleString(
                  "en-US",
                  {
                    maximumFractionDigits: 6,
                  }
                );
            } else {
              formattedBalance =
                rawBalance.toString();
            }
  
            return {
              address:
                token.contractAddress,
  
              contractAddress:
                token.contractAddress,
  
              name:
                metadata?.name ||
                "Unknown Token",
  
              symbol:
                metadata?.symbol ||
                "Unknown",
  
              decimals,
  
              balance:
                formattedBalance,
            };
          } catch (error) {
            console.error(
              "Token metadata error:",
              token.contractAddress,
              error
            );
  
            return {
              address:
                token.contractAddress,
  
              contractAddress:
                token.contractAddress,
  
              name: "Unknown Token",
  
              symbol: "Unknown",
  
              decimals: 0,
  
              balance: "Unknown",
            };
          }
        })
      );
  
      // =====================================================
      // 4. FETCH OUTGOING TRANSFERS
      // =====================================================
  
      const outgoingResult =
        await alchemyRequest(
          3,
          "alchemy_getAssetTransfers",
          [
            {
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
            },
          ]
        );
  
      // =====================================================
      // 5. FETCH INCOMING TRANSFERS
      // =====================================================
  
      const incomingResult =
        await alchemyRequest(
          4,
          "alchemy_getAssetTransfers",
          [
            {
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
            },
          ]
        );
  
      const outgoingTransfers =
        outgoingResult?.transfers || [];
  
      const incomingTransfers =
        incomingResult?.transfers || [];
  
      // =====================================================
      // 6. ADD DIRECTIONS
      // =====================================================
  
      const outgoing =
        outgoingTransfers.map((tx) => ({
          ...tx,
          direction: "OUT",
        }));
  
      const incoming =
        incomingTransfers.map((tx) => ({
          ...tx,
          direction: "IN",
        }));
  
      // =====================================================
      // 7. COMBINE
      // =====================================================
  
      const allTransfers = [
        ...outgoing,
        ...incoming,
      ];
  
      // =====================================================
      // 8. REMOVE DUPLICATES
      // =====================================================
  
      const uniqueTransfers =
        Array.from(
          new Map(
            allTransfers.map((tx) => {
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
  
      // =====================================================
      // 9. SORT NEWEST FIRST
      // =====================================================
  
      uniqueTransfers.sort((a, b) => {
        const dateA = new Date(
          a.metadata?.blockTimestamp || 0
        ).getTime();
  
        const dateB = new Date(
          b.metadata?.blockTimestamp || 0
        ).getTime();
  
        return dateB - dateA;
      });
  
      // =====================================================
      // 10. FORMAT TRANSACTIONS
      // =====================================================
  
      const transactions =
        uniqueTransfers.map((tx) => ({
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
  
      // =====================================================
      // 11. OBJECTIVE STATISTICS
      // =====================================================
  
      const incomingTransactions =
        transactions.filter(
          (tx) =>
            tx.direction === "IN"
        );
  
      const outgoingTransactions =
        transactions.filter(
          (tx) =>
            tx.direction === "OUT"
        );
  
      const ethTransactions =
        transactions.filter(
          (tx) =>
            String(tx.asset || "")
              .toUpperCase() === "ETH"
        );
  
      const incomingEthTransactions =
        ethTransactions.filter(
          (tx) =>
            tx.direction === "IN"
        );
  
      const outgoingEthTransactions =
        ethTransactions.filter(
          (tx) =>
            tx.direction === "OUT"
        );
  
      const erc20Transactions =
        transactions.filter(
          (tx) =>
            String(tx.category || "")
              .toLowerCase() === "erc20"
        );
  
      // =====================================================
      // EXACT DECIMAL ADDITION
      // =====================================================
  
      function addDecimalStrings(values) {
        if (!values.length) {
          return "0";
        }
  
        let maxDecimals = 0;
  
        const numbers =
          values.map((value) => {
            const stringValue =
              String(value ?? "0").trim();
  
            const parts =
              stringValue.split(".");
  
            const integerPart =
              parts[0] || "0";
  
            const decimalPart =
              parts[1] || "";
  
            maxDecimals =
              Math.max(
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
  
        let result =
          total.toString();
  
        if (maxDecimals === 0) {
          return result;
        }
  
        result =
          result.padStart(
            maxDecimals + 1,
            "0"
          );
  
        const split =
          result.length -
          maxDecimals;
  
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
      // ETH TOTALS FROM PROVIDED TRANSACTIONS
      // =====================================================
  
      const totalEthReceived =
        addDecimalStrings(
          incomingEthTransactions.map(
            (tx) => tx.value
          )
        );
  
      const totalEthSent =
        addDecimalStrings(
          outgoingEthTransactions.map(
            (tx) => tx.value
          )
        );
  
      // =====================================================
      // UNIQUE DATA
      // =====================================================
  
      const uniqueAssets = [
        ...new Set(
          transactions
            .map((tx) => tx.asset)
            .filter(Boolean)
        ),
      ];
  
      const uniqueSenders = [
        ...new Set(
          transactions
            .map((tx) => tx.from)
            .filter(Boolean)
        ),
      ];
  
      const uniqueRecipients = [
        ...new Set(
          transactions
            .map((tx) => tx.to)
            .filter(Boolean)
        ),
      ];
  
      // =====================================================
      // RETURN
      // =====================================================
  
      return res.status(200).json({
        address,
  
        network:
          "Ethereum Mainnet",
  
        // REAL CURRENT ETH BALANCE
        balanceEth,
  
        tokens,
  
        transactions,
  
        stats: {
          transactionCount:
            transactions.length,
  
          incomingTransactions:
            incomingTransactions.length,
  
          outgoingTransactions:
            outgoingTransactions.length,
  
          ethTransactionCount:
            ethTransactions.length,
  
          incomingEthTransactionCount:
            incomingEthTransactions.length,
  
          outgoingEthTransactionCount:
            outgoingEthTransactions.length,
  
          erc20TransactionCount:
            erc20Transactions.length,
  
          totalEthReceived:
            totalEthReceived,
  
          totalEthSent:
            totalEthSent,
  
          uniqueAssetCount:
            uniqueAssets.length,
  
          uniqueAssets,
  
          uniqueSenderCount:
            uniqueSenders.length,
  
          uniqueRecipientCount:
            uniqueRecipients.length,
        },
  
        dataSource: {
          balance:
            "Ethereum Mainnet via Alchemy eth_getBalance",
  
          tokenBalances:
            "Alchemy alchemy_getTokenBalances",
  
          transactions:
            "Alchemy alchemy_getAssetTransfers",
        },
      });
    } catch (error) {
      console.error(
        "Wallet API error:",
        error
      );
  
      return res.status(500).json({
        error:
          error.message ||
          "Failed to analyze wallet",
      });
    }
  }