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

function normalizeHeading(value = "") {
  return decodeEntities(stripTags(value))
    .replace(/^\d+[\.\、]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
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

function extractManualHeadings(content, limit = 60) {
  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const headings = [];

  lines.forEach(line => {
    const markdown = line.match(/^(#{1,3})\s+(.+)$/);
    if (markdown) {
      headings.push({ level: `H${markdown[1].length}`, text: normalizeHeading(markdown[2]) });
      return;
    }

    const hLabel = line.match(/^(H[1-3])[:：]\s*(.+)$/i);
    if (hLabel) {
      headings.push({ level: hLabel[1].toUpperCase(), text: normalizeHeading(hLabel[2]) });
    }
  });

  return headings.filter(item => item.text).slice(0, limit);
}

function extractTextFaq(content) {
  const questions = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => !/^(H[1-3]|#{1,3})[:：\s]/i.test(line))
    .filter(line => /[?？]$/.test(line) || /^(Q|问)[:：]/i.test(line))
    .map(line => normalizeHeading(line.replace(/^(Q|问)[:：]\s*/i, "")));
  return unique(questions).slice(0, 30);
}

function analyzeHtml({ html, parsedUrl, label, keyword, source }) {
  const title = matchFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescription = matchFirst(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i)
    || matchFirst(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i);
  const h1 = matchAllText(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi, 10).map(normalizeHeading);
  const h2 = matchAllText(html, /<h2[^>]*>([\s\S]*?)<\/h2>/gi, 40).map(normalizeHeading);
  const h3 = matchAllText(html, /<h3[^>]*>([\s\S]*?)<\/h3>/gi, 40).map(normalizeHeading);
  const schemas = extractSchemas(html);
  const headings = [
    ...h1.map(text => ({ level: "H1", text })),
    ...h2.map(text => ({ level: "H2", text })),
    ...h3.map(text => ({ level: "H3", text }))
  ].filter(item => item.text);

  const competitor = {
    url: parsedUrl?.toString() || "",
    domain: parsedUrl?.hostname?.replace(/^www\./, "") || label || "手动粘贴内容",
    label: label || parsedUrl?.hostname?.replace(/^www\./, "") || "手动粘贴内容",
    source,
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

  return {
    ...competitor,
    suggestions: compareWithTarget(keyword, competitor)
  };
}

function analyzeManual({ content, label, keyword }) {
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(content);
  if (looksLikeHtml) {
    return analyzeHtml({
      html: content,
      parsedUrl: null,
      label,
      keyword,
      source: "manual-html"
    });
  }

  const headings = extractManualHeadings(content);
  const faqQuestions = extractTextFaq(content);
  const h1 = headings.filter(item => item.level === "H1").map(item => item.text);
  const h2 = headings.filter(item => item.level === "H2").map(item => item.text);
  const h3 = headings.filter(item => item.level === "H3").map(item => item.text);
  const title = h1[0] || h2[0] || label || "手动粘贴内容";
  const competitor = {
    url: "",
    domain: label || "手动粘贴内容",
    label: label || "手动粘贴内容",
    source: "manual-text",
    title,
    metaDescription: "",
    pageType: detectPageType(title, headings.map(item => item.text), []),
    headings,
    h1,
    h2,
    h3,
    schemaTypes: [],
    faqQuestions
  };

  return {
    ...competitor,
    suggestions: compareWithTarget(keyword, competitor)
  };
}

function frequency(items) {
  const map = new Map();
  items.forEach(item => {
    const normalized = normalizeHeading(item).toLowerCase();
    if (!normalized) return;
    map.set(normalized, {
      text: item,
      count: (map.get(normalized)?.count || 0) + 1
    });
  });
  return [...map.values()].sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));
}

function compareCompetitors(keyword, competitors) {
  const headings = competitors.flatMap(item => item.headings.filter(heading => heading.level !== "H1").map(heading => heading.text));
  const schemaTypes = competitors.flatMap(item => item.schemaTypes);
  const faqQuestions = competitors.flatMap(item => item.faqQuestions);
  const pageTypes = competitors.map(item => item.pageType);
  const topHeadings = frequency(headings).slice(0, 12);
  const topSchemas = frequency(schemaTypes).slice(0, 12);
  const topFaq = frequency(faqQuestions).slice(0, 12);
  const dominantPageTypes = frequency(pageTypes).slice(0, 5);
  const suggestions = [];

  if (competitors.length > 1) suggestions.push(`已对比 ${competitors.length} 个竞品页面，优先参考重复出现的 H2/H3，而不是照抄单个页面。`);
  if (topHeadings.length) suggestions.push(`高频内容角度：${topHeadings.slice(0, 5).map(item => item.text).join(" / ")}。`);
  if (!topSchemas.some(item => /FAQPage/i.test(item.text))) suggestions.push("多数竞品没有 FAQPage，你可以补 FAQ Schema 抢 AEO/答案位。");
  if (!topSchemas.some(item => /BreadcrumbList/i.test(item.text))) suggestions.push("竞品 BreadcrumbList 覆盖弱，你可以补面包屑 Schema 帮助搜索引擎理解层级。");
  if (!headings.some(item => /案例|case|结果|客户|证明/i.test(item))) suggestions.push("竞品案例/经验证明不足，可以把真实案例、匿名场景或数据截图作为差异化资产。");
  if (/服务|代运营|agency|service/i.test(keyword) && !headings.some(item => /价格|费用|报价|多少钱|cost|price/i.test(item))) suggestions.push("商业型关键词建议补价格/报价判断模块，竞品覆盖不足时更容易形成转化差异。");

  return {
    competitorCount: competitors.length,
    topHeadings,
    topSchemas,
    topFaq,
    dominantPageTypes,
    suggestions: suggestions.slice(0, 8)
  };
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

  const { url, urls, manualPages = [], keyword = "" } = req.body || {};
  const urlList = unique([
    ...(Array.isArray(urls) ? urls : []),
    ...(url ? [url] : [])
  ]).slice(0, 5);
  const manualList = Array.isArray(manualPages)
    ? manualPages.filter(item => String(item?.content || "").trim()).slice(0, 3)
    : [];

  if (!urlList.length && !manualList.length) return res.status(400).json({ error: "请先输入竞品 URL，或粘贴竞品 HTML/正文。" });

  try {
    const competitors = [];
    const errors = [];

    for (const targetUrl of urlList) {
      let parsedUrl;
      try {
        parsedUrl = new URL(targetUrl);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("Invalid protocol");
      } catch {
        errors.push({ url: targetUrl, error: "URL 格式不正确，请输入完整的 https:// 页面地址。" });
        continue;
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
          errors.push({
            url: parsedUrl.toString(),
            error: fetchErrorMessage(response.status),
            detail: `HTTP ${response.status}`
          });
          continue;
        }
        if (!contentType.includes("text/html")) {
          errors.push({ url: parsedUrl.toString(), error: "这个 URL 返回的不是 HTML 页面，无法提取 H2、FAQ 和 Schema。" });
          continue;
        }

        const html = await response.text();
        competitors.push(analyzeHtml({
          html,
          parsedUrl,
          keyword,
          source: "url"
        }));
      } catch (error) {
        errors.push({
          url: parsedUrl.toString(),
          error: "竞品 URL 分析失败，请换一个页面 URL 后重试。",
          detail: error.message
        });
      }
    }

    manualList.forEach((item, index) => {
      competitors.push(analyzeManual({
        content: String(item.content || ""),
        label: String(item.label || "").trim() || `手动竞品 ${index + 1}`,
        keyword
      }));
    });

    if (!competitors.length) {
      return res.status(422).json({
        error: errors[0]?.error || "没有成功解析任何竞品页面。",
        errors
      });
    }

    const comparison = compareCompetitors(keyword, competitors);

    return res.status(200).json({
      competitor: competitors[0],
      competitors,
      errors,
      comparison,
      suggestions: comparison.suggestions
    });
  } catch (error) {
    return res.status(500).json({
      error: "竞品 URL 分析失败，请换一个页面 URL 后重试。",
      detail: error.message
    });
  }
};
