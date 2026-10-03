export default async function handler(req, res) {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method not allowed",
      });
    }
  
    try {
      const response = await fetch("http://127.0.0.1:11434/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen3:4b",
          prompt: req.body.message,
          stream: false,
          think: false,
          options: {
            num_predict: 300,
          },
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Ollama returned ${response.status}`);
      }
  
      const data = await response.json();
  
      return res.status(200).json({
        response: data.response,
      });
    } catch (error) {
      console.error("Ollama error:", error);
  
      return res.status(500).json({
        error: "Could not connect to Ollama",
      });
    }
  }