const MARKET_SETTINGS = {
  "中文市场": { hl: "zh-cn", gl: "us", location: "United States" },
  "英文市场": { hl: "en", gl: "us", location: "United States" },
  "全球市场": { hl: "en", gl: "us", location: "United States" }
};

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function simplifyOrganicResult(item) {
  return {
    position: item.position,
    title: item.title || "",
    link: item.link || "",
    domain: getDomain(item.link || ""),
    snippet: item.snippet || "",
    displayedLink: item.displayed_link || "",
    sitelinks: Array.isArray(item.sitelinks?.inline)
      ? item.sitelinks.inline.map(link => link.title).filter(Boolean)
      : []
  };
}

function simplifyQuestion(item) {
  return {
    question: item.question || item.title || "",
    snippet: item.snippet || "",
    link: item.link || ""
  };
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
  const location = String(req.query.location || settings.location);
  const params = new URLSearchParams({
    engine: "google",
    q,
    api_key: apiKey,
    num: "10",
    hl: settings.hl,
    gl: settings.gl,
    location
  });

  try {
    const serpResponse = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
    const data = await serpResponse.json();

    if (!serpResponse.ok || data.error) {
      return res.status(serpResponse.status || 502).json({
        error: data.error || "SerpApi request failed."
      });
    }

    return res.status(200).json({
      query: q,
      market,
      location,
      searchInformation: {
        totalResults: data.search_information?.total_results || null,
        timeTaken: data.search_information?.time_taken_displayed || null
      },
      answerBox: data.answer_box || null,
      organicResults: Array.isArray(data.organic_results)
        ? data.organic_results.slice(0, 10).map(simplifyOrganicResult)
        : [],
      relatedQuestions: Array.isArray(data.related_questions)
        ? data.related_questions.slice(0, 8).map(simplifyQuestion)
        : [],
      relatedSearches: Array.isArray(data.related_searches)
        ? data.related_searches.slice(0, 8).map(item => item.query || item.title || "").filter(Boolean)
        : []
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch SERP data.",
      detail: error.message
    });
  }
};
