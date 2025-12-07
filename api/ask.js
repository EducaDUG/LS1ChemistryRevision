// api/ask.js — runs on Vercel server, NOT in the browser

export default async function handler(req, res) {
  // --- CORS: allow your sites to call this function ---
  const allowedOrigins = [
    "https://educadug.github.io",
    "https://mrguevaracga.github.io",
  ];

  const origin = req.headers.origin || "";
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    // Preflight request
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // --- Read message from body ---
  try {
    const { message } = req.body || {};

    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "No API key configured on server" });
    }

    // --- Call Gemini ---
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
      apiKey;

    const geminiResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: message }],
          },
        ],
      }),
    });

    const data = await geminiResponse.json();

    // If Gemini itself returns an error, bubble it up clearly
    if (!geminiResponse.ok || data.error) {
      const msg = data.error?.message || geminiResponse.statusText;
      return res
        .status(500)
        .json({ error: `Gemini API error: ${msg}` });
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || null;

    if (!text) {
      return res
        .status(500)
        .json({ error: "Empty response from Gemini (no text field found)." });
    }

    // Everything OK
    return res.status(200).json({ reply: text });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
