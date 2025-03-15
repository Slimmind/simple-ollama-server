const express = require("express");
const axios = require("axios");
const morgan = require("morgan");

const app = express();
const port = 3000;

app.use(express.json());
app.use(morgan("combined"));

app.post("/ask", async (req, res) => {
  const { model, prompt } = req.body;

  if (!model) {
    return res.status(400).json({ error: "Model is required" });
  }

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    console.log("Sending request to Ollama:", { model, prompt });

    const response = await axios.post("http://127.0.0.1:11434/api/generate", {
      model: model,
      prompt: prompt,
      stream: false,
    });

    console.log("Received response from Ollama:", response.data);

    res.json({ response: response.data.response });
  } catch (error) {
    console.error("Error communicating with Ollama:", error);
    res.status(500).json({ error: "Failed to communicate with Ollama" });
  }
});

app.listen(port, () => {
  console.log(`Server is  running on http://localhost:${port}`);
});
