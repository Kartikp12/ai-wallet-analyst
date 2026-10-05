export default async function handler(req, res) {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method not allowed",
      });
    }
  
    try {
      const { address } = req.body || {};
  
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
  
      const apiKey =
        process.env.ALCHEMY_API_KEY;
  
      if (!apiKey) {
        return res.status(500).json({
          error:
            "ALCHEMY_API_KEY is missing from .env.local",
        });
      }
  
      const alchemyUrl =
        `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;
  
      // =====================================================
      // ALCHEMY REQUEST
      // =====================================================
  
      async function alchemyRequest(
        id,
        method,
        params
      ) {
        const response =
          await fetch(alchemyUrl, {
            method: "POST",
  
            headers: {
              "Content-Type":
                "application/json",
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
  
        const data =
          await response.json();
  
        if (data.error) {
          throw new Error(
            data.error.message ||
              `Alchemy ${method} request failed`
          );
        }
  
        return data.result;
      }
  
      // =====================================================
      // GET ALL PAGES
      // =====================================================
  
      async function getAllTransfers(
        baseParams,
        startingId
      ) {
        const allTransfers = [];
  
        let pageKey = null;
        let requestId = startingId;
  
        do {
          const params = {
            ...baseParams,
  
            maxCount: "0x3e8",
  
            ...(pageKey
              ? { pageKey }
              : {}),
          };
  
          const result =
            await alchemyRequest(
              requestId,
              "alchemy_getAssetTransfers",
              [params]
            );
  
          requestId++;
  
          const transfers =
            result?.transfers || [];
  
          allTransfers.push(
            ...transfers
          );
  
          pageKey =
            result?.pageKey || null;
        } while (pageKey);
  
        return allTransfers;
      }
  
      // =====================================================
      // FETCH IN + OUT IN PARALLEL
      // =====================================================
  
      const [
        outgoingTransfers,
        incomingTransfers,
      ] = await Promise.all([
        getAllTransfers(
          {
            fromBlock: "0x0",
            toBlock: "latest",
  
            fromAddress:
              address,
  
            category: [
              "external",
              "internal",
              "erc20",
              "erc721",
              "erc1155",
            ],
  
            withMetadata: true,
  
            excludeZeroValue: true,
  
            order: "desc",
          },
          1
        ),
  
        getAllTransfers(
          {
            fromBlock: "0x0",
            toBlock: "latest",
  
            toAddress:
              address,
  
            category: [
              "external",
              "internal",
              "erc20",
              "erc721",
              "erc1155",
            ],
  
            withMetadata: true,
  
            excludeZeroValue: true,
  
            order: "desc",
          },
          100000
        ),
      ]);
  
      // =====================================================
      // ADD DIRECTION
      // =====================================================
  
      const outgoing =
        outgoingTransfers.map(
          (tx) => ({
            ...tx,
            direction: "OUT",
          })
        );
  
      const incoming =
        incomingTransfers.map(
          (tx) => ({
            ...tx,
            direction: "IN",
          })
        );
  
      // =====================================================
      // COMBINE
      // =====================================================
  
      const allTransfers = [
        ...outgoing,
        ...incoming,
      ];
  
      // =====================================================
      // REMOVE DUPLICATES
      // =====================================================
  
      const uniqueTransfers =
        Array.from(
          new Map(
            allTransfers.map(
              (tx) => {
                const key = [
                  tx.uniqueId ||
                    "",
                  tx.hash ||
                    "",
                  tx.from ||
                    "",
                  tx.to ||
                    "",
                  tx.value ??
                    "",
                  tx.asset ||
                    "",
                  tx.category ||
                    "",
                  tx.direction ||
                    "",
                ].join("|");
  
                return [
                  key,
                  tx,
                ];
              }
            )
          ).values()
        );
  
      // =====================================================
      // SORT NEWEST FIRST
      // =====================================================
  
      uniqueTransfers.sort(
        (a, b) => {
          const dateA =
            new Date(
              a.metadata
                ?.blockTimestamp ||
                0
            ).getTime();
  
          const dateB =
            new Date(
              b.metadata
                ?.blockTimestamp ||
                0
            ).getTime();
  
          return dateB - dateA;
        }
      );
  
      // =====================================================
      // FORMAT TRANSACTIONS
      // =====================================================
  
      const transactions =
        uniqueTransfers.map(
          (tx) => ({
            hash:
              tx.hash ||
              null,
  
            direction:
              tx.direction ||
              null,
  
            from:
              tx.from ||
              null,
  
            to:
              tx.to ||
              null,
  
            asset:
              tx.asset ||
              "ETH",
  
            value:
              tx.value ??
              "0",
  
            category:
              tx.category ||
              "unknown",
  
            blockNum:
              tx.blockNum ||
              null,
  
            timestamp:
              tx.metadata
                ?.blockTimestamp ||
              null,
          })
        );
  
      // =====================================================
      // EXACT DECIMAL ADDITION
      // =====================================================
  
      function addDecimalStrings(
        values
      ) {
        if (
          !values ||
          values.length === 0
        ) {
          return "0";
        }
  
        let maxDecimals = 0;
  
        const numbers =
          values.map(
            (value) => {
              const stringValue =
                String(
                  value ?? "0"
                ).trim();
  
              const parts =
                stringValue.split(
                  "."
                );
  
              const integerPart =
                parts[0] ||
                "0";
  
              const decimalPart =
                parts[1] ||
                "";
  
              maxDecimals =
                Math.max(
                  maxDecimals,
                  decimalPart.length
                );
  
              return {
                integerPart,
                decimalPart,
              };
            }
          );
  
        let scale = 1n;
  
        for (
          let i = 0;
          i < maxDecimals;
          i++
        ) {
          scale *= 10n;
        }
  
        let total = 0n;
  
        for (
          const number
          of numbers
        ) {
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
            BigInt(
              integerPart
            ) *
              scale +
            BigInt(
              paddedDecimal ||
                "0"
            );
        }
  
        let result =
          total.toString();
  
        if (
          maxDecimals === 0
        ) {
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
          result.slice(
            0,
            split
          );
  
        const decimalPart =
          result.slice(
            split
          );
  
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
  
      const assetMap =
        new Map();
  
      for (
        const tx of
        transactions
      ) {
        const asset =
          String(
            tx.asset || ""
          )
            .trim()
            .toUpperCase();
  
        const direction =
          String(
            tx.direction || ""
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
  
        if (
          !assetMap.has(asset)
        ) {
          assetMap.set(
            asset,
            {
              asset,
  
              received:
                "0",
  
              sent:
                "0",
  
              receivedTransactions:
                0,
  
              sentTransactions:
                0,
            }
          );
        }
  
        const item =
          assetMap.get(
            asset
          );
  
        if (
          direction === "IN"
        ) {
          item.received =
            addDecimalStrings([
              item.received,
              tx.value,
            ]);
  
          item.receivedTransactions++;
        }
  
        if (
          direction === "OUT"
        ) {
          item.sent =
            addDecimalStrings([
              item.sent,
              tx.value,
            ]);
  
          item.sentTransactions++;
        }
      }
  
      const assetTransferStats =
        Array.from(
          assetMap.values()
        );
  
      // =====================================================
      // ETH STATS
      // =====================================================
  
      const ethTransactions =
        transactions.filter(
          (tx) =>
            String(
              tx.asset || ""
            ).toUpperCase() ===
            "ETH"
        );
  
      const incomingEth =
        ethTransactions.filter(
          (tx) =>
            tx.direction ===
            "IN"
        );
  
      const outgoingEth =
        ethTransactions.filter(
          (tx) =>
            tx.direction ===
            "OUT"
        );
  
      const totalEthReceived =
        addDecimalStrings(
          incomingEth.map(
            (tx) =>
              tx.value
          )
        );
  
      const totalEthSent =
        addDecimalStrings(
          outgoingEth.map(
            (tx) =>
              tx.value
          )
        );
  
      // =====================================================
      // COUNTS
      // =====================================================
  
      const incoming =
        transactions.filter(
          (tx) =>
            tx.direction ===
            "IN"
        );
  
      const outgoing =
        transactions.filter(
          (tx) =>
            tx.direction ===
            "OUT"
        );
  
      const erc20 =
        transactions.filter(
          (tx) =>
            String(
              tx.category || ""
            ).toLowerCase() ===
            "erc20"
        );
  
      const uniqueAssets =
        [
          ...new Set(
            transactions
              .map(
                (tx) =>
                  tx.asset
              )
              .filter(Boolean)
              .map(
                (asset) =>
                  String(
                    asset
                  ).toUpperCase()
              )
          ),
        ];
  
      const uniqueSenders =
        [
          ...new Set(
            transactions
              .map(
                (tx) =>
                  tx.from
              )
              .filter(Boolean)
          ),
        ];
  
      const uniqueRecipients =
        [
          ...new Set(
            transactions
              .map(
                (tx) =>
                  tx.to
              )
              .filter(Boolean)
          ),
        ];
  
      // =====================================================
      // RESPONSE
      // =====================================================
  
      return res.status(200).json({
        address,
  
        count:
          transactions.length,
  
        transactions,
  
        assetTransferStats,
  
        stats: {
          transactionCount:
            transactions.length,
  
          incomingTransactions:
            incoming.length,
  
          outgoingTransactions:
            outgoing.length,
  
          ethTransactionCount:
            ethTransactions.length,
  
          incomingEthTransactionCount:
            incomingEth.length,
  
          outgoingEthTransactionCount:
            outgoingEth.length,
  
          erc20TransactionCount:
            erc20.length,
  
          totalEthReceived,
  
          totalEthSent,
  
          uniqueAssetCount:
            uniqueAssets.length,
  
          uniqueAssets,
  
          uniqueSenderCount:
            uniqueSenders.length,
  
          uniqueRecipientCount:
            uniqueRecipients.length,
        },
  
        dataCoverage: {
          complete: true,
  
          transactionRecords:
            transactions.length,
  
          source:
            "Alchemy alchemy_getAssetTransfers with pagination",
        },
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