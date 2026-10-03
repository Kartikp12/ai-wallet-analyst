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
  
      const apiKey = process.env.ALCHEMY_API_KEY;
  
      if (!apiKey) {
        return res.status(500).json({
          error: "ALCHEMY_API_KEY is missing from .env.local",
        });
      }
  
      const alchemyUrl =
        `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;
  
      // =====================================================
      // 1. GET ETH BALANCE
      // =====================================================
  
      const ethResponse = await fetch(alchemyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getBalance",
          params: [address, "latest"],
        }),
      });
  
      const ethData = await ethResponse.json();
  
      if (ethData.error) {
        throw new Error(
          ethData.error.message || "Failed to fetch ETH balance"
        );
      }
  
      const balanceWei = BigInt(ethData.result);
  
      const balanceEth =
        Number(balanceWei) / 1e18;
  
      // =====================================================
      // 2. GET ERC-20 TOKEN BALANCES
      // =====================================================
  
      const tokenResponse = await fetch(alchemyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "alchemy_getTokenBalances",
          params: [address, "erc20"],
        }),
      });
  
      const tokenData = await tokenResponse.json();
  
      if (tokenData.error) {
        throw new Error(
          tokenData.error.message ||
            "Failed to fetch token balances"
        );
      }
  
      const rawTokens = tokenData.result?.tokenBalances || [];
  
      // =====================================================
      // 3. GET TOKEN METADATA
      // =====================================================
  
      const tokens = await Promise.all(
        rawTokens.map(async (token) => {
          try {
            const metadataResponse = await fetch(alchemyUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                jsonrpc: "2.0",
                id: 3,
                method: "alchemy_getTokenMetadata",
                params: [token.contractAddress],
              }),
            });
  
            const metadataData =
              await metadataResponse.json();
  
            const metadata = metadataData.result || {};
  
            const rawBalance = BigInt(
              token.tokenBalance || "0x0"
            );
  
            const decimals =
              Number(metadata.decimals || 0);
  
            let formattedBalance = "0";
  
            if (decimals > 0) {
              const divisor = 10 ** decimals;
  
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
              address: token.contractAddress,
  
              name:
                metadata.name ||
                "Unknown Token",
  
              symbol:
                metadata.symbol ||
                "Unknown",
  
              decimals,
  
              balance: formattedBalance,
            };
          } catch (error) {
            console.error(
              "Token metadata error:",
              token.contractAddress,
              error
            );
  
            return {
              address: token.contractAddress,
              name: "Unknown Token",
              symbol: "Unknown",
              decimals: 0,
              balance: "0",
            };
          }
        })
      );
  
      // =====================================================
      // 4. RETURN WALLET DATA
      // =====================================================
  
      return res.status(200).json({
        address,
        network: "Ethereum Mainnet",
        balanceEth: balanceEth.toFixed(6),
        tokens,
      });
  
    } catch (error) {
      console.error("Wallet API error:", error);
  
      return res.status(500).json({
        error:
          error.message ||
          "Failed to analyze wallet",
      });
    }
  }