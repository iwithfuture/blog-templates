function extractOutputText(data) {
  if (data.output_text) return data.output_text;
  if (!Array.isArray(data.output)) return "";

  return data.output
    .flatMap(item => item.content || [])
    .map(content => content.text || "")
    .filter(Boolean)
    .join("\n");
}

function trimList(items, limit) {
  return Array.isArray(items) ? items.slice(0, limit) : [];
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Only POST requests are supported." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(501).json({
      error: "OPENAI_API_KEY is not configured.",
      setup: "Add OPENAI_API_KEY in Vercel Project Settings > Environment Variables, then redeploy."
    });
  }

  const {
    input,
    brief,
    faq,
    serp,
    expansion,
    options = {}
  } = req.body || {};

  if (!input?.keyword || !brief?.targetKeyword) {
    return res.status(400).json({ error: "Missing input.keyword or brief.targetKeyword." });
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const length = options.length || "standard";
  const outputTokens = length === "deep" ? 9000 : length === "short" ? 3500 : 6500;

  const context = {
    keyword: input.keyword,
    targetKeyword: brief.targetKeyword,
    market: input.market,
    audience: input.audience,
    businessType: input.businessType,
    monetization: input.monetization,
    brandName: input.brandName,
    websiteUrl: input.websiteUrl,
    authorName: input.authorName,
    coreOffer: input.coreOffer,
    region: input.region,
    proofPoints: input.proofPoints,
    h1: brief.h1,
    metaTitle: brief.metaTitle,
    metaDescription: brief.metaDescription,
    summary: brief.summary,
    outline: brief.outline,
    tableIdeas: brief.tableIdeas,
    caseIdea: brief.caseIdea,
    secondaryKeywords: brief.secondaryKeywords,
    requiredEntities: brief.requiredEntities,
    sourceNeeds: brief.sourceNeeds,
    avoid: brief.avoid,
    faq,
    serp: serp ? {
      organicResults: trimList(serp.organicResults, 10).map(item => ({
        position: item.position,
        title: item.title,
        domain: item.domain,
        snippet: item.snippet
      })),
      relatedQuestions: trimList(serp.relatedQuestions, 8),
      relatedSearches: trimList(serp.relatedSearches, 8)
    } : null,
    expansion: expansion ? {
      suggestions: trimList(expansion.suggestions, 15)
    } : null
  };

  const developerPrompt = [
    "你是资深中文 SEO 内容策略师和 B2B 内容编辑。",
    "请根据用户提供的 Brief、SERP 和业务信息，生成一篇可编辑的 SEO 文章 Markdown 初稿。",
    "要求：",
    "1. 不要编造具体客户、数字、排名、收入或案例结果；没有真实数据时用“示例/匿名场景”表达。",
    "2. 开头 120 字内直接回答搜索意图，适合 AEO 摘取。",
    "3. 保留清晰 H2/H3、表格、FAQ、结尾 CTA。",
    "4. 内容面向真实读者，不要堆关键词。",
    "5. 如果 SERP 信息不足，也要基于 Brief 写，但标注需要人工补充的地方。",
    "6. 输出只要 Markdown，不要解释你做了什么。"
  ].join("\n");

  const userPrompt = [
    `生成长度：${length}`,
    "请输出以下结构：",
    "- SEO Title",
    "- Meta Description",
    "- 正文 Markdown",
    "- FAQ",
    "- 建议内链位置",
    "- 需要人工补充/核实的事项",
    "",
    "上下文 JSON：",
    JSON.stringify(context, null, 2)
  ].join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        reasoning: { effort: "low" },
        max_output_tokens: outputTokens,
        input: [
          { role: "developer", content: developerPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      return res.status(response.status || 502).json({
        error: data.error?.message || data.error || "OpenAI request failed."
      });
    }

    const article = extractOutputText(data);
    return res.status(200).json({
      model,
      article,
      usage: data.usage || null
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to generate article.",
      detail: error.message
    });
  }
};
