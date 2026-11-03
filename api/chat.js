export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, history = [] } = req.body || {};

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "API key missing" });
    }

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const previous = Array.isArray(history)
      ? history.slice(-12).filter(item =>
          item &&
          ["user", "assistant"].includes(item.role) &&
          typeof item.text === "string"
        )
      : [];

    const contents = previous.map(item => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.text.slice(0, 4000) }]
    }));

    contents.push({
      role: "user",
      parts: [{ text: message.trim().slice(0, 4000) }]
    });

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: 1024
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "AI request failed"
      });
    }

    const reply =
      data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("") || "No reply";

    return res.status(200).json({ reply });

  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
}
