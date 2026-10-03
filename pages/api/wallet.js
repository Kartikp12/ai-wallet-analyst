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
  
      const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(address);
  
      if (!isValidAddress) {
        return res.status(400).json({
          error: "Invalid Ethereum wallet address",
        });
      }
  
      const response = await fetch(
        "https://eth-mainnet.g.alchemy.com/public",
        {
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
        }
      );
  
      if (!response.ok) {
        throw new Error("Blockchain RPC request failed");
      }
  
      const data = await response.json();
  
      if (data.error) {
        throw new Error(data.error.message);
      }
  
      const balanceWei = BigInt(data.result);
  
      const balanceEth =
        Number(balanceWei) / 1000000000000000000;
  
      return res.status(200).json({
        success: true,
        address,
        balanceWei: balanceWei.toString(),
        balanceEth: balanceEth.toFixed(6),
        network: "Ethereum Mainnet",
      });
    } catch (error) {
      console.error("Wallet API error:", error);
  
      return res.status(500).json({
        error: "Failed to fetch wallet data",
      });
    }
  }