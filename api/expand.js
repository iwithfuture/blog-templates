const MARKET_SETTINGS = {
  "中文市场": { hl: "zh-cn", gl: "us" },
  "英文市场": { hl: "en", gl: "us" },
  "全球市场": { hl: "en", gl: "us" }
};

function simplifySuggestion(item) {
  if (typeof item === "string") return item;
  return item.value || item.suggestion || item.term || item.query || "";
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Only GET requests are supported." });
  }

  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    return res.status(501).json({
      error: "SERPAPI_KEY is not configured.",
      setup: "Add SERPAPI_KEY in Vercel Project Settings > Environment Variables, then redeploy."
    });
  }

  const q = String(req.query.q || "").trim();
  if (!q) {
    return res.status(400).json({ error: "Missing q parameter." });
  }

  const market = String(req.query.market || "中文市场");
  const settings = MARKET_SETTINGS[market] || MARKET_SETTINGS["中文市场"];
  const params = new URLSearchParams({
    engine: "google_autocomplete",
    q,
    api_key: apiKey,
    hl: settings.hl,
    gl: settings.gl
  });

  try {
    const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
    const data = await response.json();

    if (!response.ok || data.error) {
      return res.status(response.status || 502).json({
        error: data.error || "SerpApi autocomplete request failed."
      });
    }

    const suggestions = Array.isArray(data.suggestions)
      ? data.suggestions.map(simplifySuggestion).filter(Boolean)
      : [];

    return res.status(200).json({
      query: q,
      market,
      suggestions: [...new Set(suggestions)]
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch autocomplete data.",
      detail: error.message
    });
  }
};
