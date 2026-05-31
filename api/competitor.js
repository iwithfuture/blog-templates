function stripTags(value = "") {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(value = "") {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#039;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(items) {
  return [...new Set(items.map(item => decodeEntities(item)).filter(Boolean))];
}

function matchFirst(html, regex) {
  const match = html.match(regex);
  return decodeEntities(stripTags(match?.[1] || ""));
}

function matchAllText(html, regex, limit = 40) {
  return unique([...html.matchAll(regex)].map(match => stripTags(match[1]))).slice(0, limit);
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function collectSchemaNodes(node, nodes = []) {
  if (!node) return nodes;
  if (Array.isArray(node)) {
    node.forEach(item => collectSchemaNodes(item, nodes));
    return nodes;
  }
  if (typeof node !== "object") return nodes;
  nodes.push(node);
  if (node["@graph"]) collectSchemaNodes(node["@graph"], nodes);
  Object.values(node).forEach(value => {
    if (value && typeof value === "object") collectSchemaNodes(value, nodes);
  });
  return nodes;
}

function schemaType(type) {
  if (Array.isArray(type)) return type.join(", ");
  return type || "";
}

function extractSchemas(html) {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const parsed = blocks.map(block => safeJsonParse(block[1].trim())).filter(Boolean);
  const nodes = parsed.flatMap(item => collectSchemaNodes(item, []));
  const types = unique(nodes.map(item => schemaType(item["@type"]))).filter(Boolean);
  const faqQuestions = [];

  nodes.forEach(node => {
    const type = schemaType(node["@type"]);
    if (!type.includes("FAQPage")) return;
    const entities = Array.isArray(node.mainEntity) ? node.mainEntity : [];
    entities.forEach(entity => {
      if (entity?.name) faqQuestions.push(entity.name);
    });
  });

  return {
    types,
    faqQuestions: unique(faqQuestions)
  };
}

function detectPageType(title, headings, schemas) {
  const text = `${title} ${headings.join(" ")} ${schemas.join(" ")}`.toLowerCase();
  if (/service|agency|consulting|服务|代运营|报价|价格|多少钱/.test(text)) return "服务/商业页";
  if (/tool|calculator|template|checker|工具|模板|清单/.test(text)) return "工具/资源页";
  if (/best|top|vs|compare|alternative|推荐|对比|区别/.test(text)) return "列表/对比页";
  if (/how|guide|tutorial|what|指南|教程|怎么|如何|是什么/.test(text)) return "指南/教程页";
  return "内容页";
}

function compareWithTarget(targetKeyword, competitor) {
  const target = targetKeyword.toLowerCase();
  const headingsText = competitor.headings.map(item => item.text).join(" ").toLowerCase();
  const suggestions = [];

  if (!competitor.metaDescription) suggestions.push("竞品没有明显 Meta Description，你可以写更强的摘要和点击理由。");
  if (!competitor.schemaTypes.length) suggestions.push("竞品没有检测到 JSON-LD Schema，你可以补齐 Article/Breadcrumb/FAQ/Service。");
  if (!competitor.faqQuestions.length) suggestions.push("竞品没有检测到 FAQ Schema，你可以用 FAQ 做 AEO 覆盖。");
  if (!/案例|case|客户|证明|结果|经验/.test(headingsText)) suggestions.push("竞品标题结构里案例/经验证明较弱，你可以补真实案例或匿名场景。");
  if (!/价格|费用|多少钱|报价|cost|price/.test(headingsText) && /代运营|服务|agency|service/.test(target)) suggestions.push("竞品费用/报价角度不明显，你可以增加价格因素和预算判断表。");
  if (!/流程|步骤|process|step/.test(headingsText)) suggestions.push("竞品流程结构不明显，你可以加入清晰步骤和执行流程图。");
  if (!/工具|模板|清单|checklist|template/.test(headingsText)) suggestions.push("竞品缺少工具/模板型资产，你可以提供下载清单提升转化。");

  return suggestions.slice(0, 8);
}

function fetchErrorMessage(status) {
  const messages = {
    401: "这个页面需要登录或授权，暂时无法直接抓取。",
    403: "这个竞品页面拒绝服务器抓取（403 Forbidden）。通常是网站开启了反爬、Cloudflare、防火墙，或屏蔽了 Vercel 这类服务器 IP。",
    404: "这个竞品页面不存在或 URL 写错了（404）。",
    408: "竞品页面响应超时，请稍后重试或换一个 URL。",
    429: "竞品网站限制访问频率（429），请稍后再试。"
  };
  return messages[status] || `竞品页面返回 ${status}，暂时无法抓取。`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "只支持 POST 请求。" });
  }

  const { url, keyword = "" } = req.body || {};
  if (!url) return res.status(400).json({ error: "请先输入竞品 URL。" });

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("Invalid protocol");
  } catch {
    return res.status(400).json({ error: "URL 格式不正确，请输入完整的 https:// 页面地址。" });
  }

  try {
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; iwithfuture-seo-workspace/1.0)",
        "Accept": "text/html,application/xhtml+xml"
      },
      redirect: "follow"
    });

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) {
      return res.status(response.status).json({
        error: fetchErrorMessage(response.status),
        detail: `HTTP ${response.status}`
      });
    }
    if (!contentType.includes("text/html")) return res.status(415).json({ error: "这个 URL 返回的不是 HTML 页面，无法提取 H2、FAQ 和 Schema。" });

    const html = await response.text();
    const title = matchFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const metaDescription = matchFirst(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i)
      || matchFirst(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i);
    const h1 = matchAllText(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi, 10);
    const h2 = matchAllText(html, /<h2[^>]*>([\s\S]*?)<\/h2>/gi, 30);
    const h3 = matchAllText(html, /<h3[^>]*>([\s\S]*?)<\/h3>/gi, 30);
    const schemas = extractSchemas(html);
    const headings = [
      ...h1.map(text => ({ level: "H1", text })),
      ...h2.map(text => ({ level: "H2", text })),
      ...h3.map(text => ({ level: "H3", text }))
    ];

    const competitor = {
      url: parsedUrl.toString(),
      domain: parsedUrl.hostname.replace(/^www\./, ""),
      title,
      metaDescription,
      pageType: detectPageType(title, headings.map(item => item.text), schemas.types),
      headings,
      h1,
      h2,
      h3,
      schemaTypes: schemas.types,
      faqQuestions: schemas.faqQuestions
    };

    return res.status(200).json({
      competitor,
      suggestions: compareWithTarget(keyword, competitor)
    });
  } catch (error) {
    return res.status(500).json({
      error: "竞品 URL 分析失败，请换一个页面 URL 后重试。",
      detail: error.message
    });
  }
};
