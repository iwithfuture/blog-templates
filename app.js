const form = document.querySelector("#plannerForm");
const tabContent = document.querySelector("#tabContent");
const resultTitle = document.querySelector("#resultTitle");
const copyButton = document.querySelector("#copyMarkdown");
const csvButton = document.querySelector("#downloadCsv");
const tabs = Array.from(document.querySelectorAll(".tab"));

let activeTab = "hubs";
let currentPlan = null;
let selectedBriefKeyword = null;
let currentSerp = null;
let serpState = "idle";
let serpMessage = "";
let currentExpansion = null;
let expansionState = "idle";
let expansionMessage = "";
let currentArticle = null;
let articleState = "idle";
let articleMessage = "";
let savedProjects = loadProjects();

const pageTypeByIntent = {
  "定义认知": "百科/指南页",
  "教程执行": "教程型文章",
  "问题解决": "问题解决页",
  "商业调查": "价格/决策指南",
  "交易转化": "服务页/Landing Page",
  "工具需求": "工具清单页",
  "比较决策": "对比页",
  "资源下载": "模板/清单页"
};

const schemaByPageType = {
  "百科/指南页": ["BlogPosting", "BreadcrumbList", "FAQPage", "Organization", "Person"],
  "教程型文章": ["BlogPosting", "BreadcrumbList", "FAQPage", "HowTo", "Organization", "Person"],
  "问题解决页": ["BlogPosting", "BreadcrumbList", "FAQPage", "Organization", "Person"],
  "价格/决策指南": ["BlogPosting", "BreadcrumbList", "FAQPage", "Organization", "Person"],
  "服务页/Landing Page": ["Service", "Organization", "BreadcrumbList", "FAQPage"],
  "工具清单页": ["BlogPosting", "BreadcrumbList", "FAQPage", "SoftwareApplication"],
  "对比页": ["BlogPosting", "BreadcrumbList", "FAQPage", "Organization"],
  "模板/清单页": ["CreativeWork", "BlogPosting", "BreadcrumbList", "FAQPage"]
};

function slugify(value) {
  return encodeURIComponent(value.trim().toLowerCase().replace(/\s+/g, "-"));
}

function loadProjects() {
  try {
    return JSON.parse(localStorage.getItem("seoGrowthProjects") || "[]");
  } catch {
    localStorage.removeItem("seoGrowthProjects");
    return [];
  }
}

function saveProjects() {
  localStorage.setItem("seoGrowthProjects", JSON.stringify(savedProjects));
}

function getFormData() {
  const data = new FormData(form);
  const numberOrNull = value => {
    const number = Number(value);
    return Number.isFinite(number) && value !== "" ? number : null;
  };
  return {
    keyword: String(data.get("keyword") || "").trim(),
    market: String(data.get("market") || "中文市场"),
    stage: String(data.get("stage") || "新站"),
    audience: String(data.get("audience") || "").trim() || "目标用户",
    businessType: String(data.get("businessType") || "服务"),
    monetization: String(data.get("monetization") || "询盘"),
    brandName: String(data.get("brandName") || "").trim() || "你的品牌",
    websiteUrl: String(data.get("websiteUrl") || "").trim(),
    authorName: String(data.get("authorName") || "").trim() || "作者/专家",
    coreOffer: String(data.get("coreOffer") || "").trim() || "免费诊断/咨询",
    region: String(data.get("region") || "").trim() || "目标市场",
    proofPoints: String(data.get("proofPoints") || "").trim(),
    searchVolume: numberOrNull(data.get("searchVolume")),
    difficulty: numberOrNull(data.get("difficulty")),
    cpc: numberOrNull(data.get("cpc")),
    depth: String(data.get("depth") || "标准版")
  };
}

function buildHubs(input) {
  const k = input.keyword;
  const serviceHub = input.businessType === "服务" || input.businessType === "咨询";
  const hubs = [
    {
      name: `${k}指南`,
      url: `/${slugify(k)}-guide/`,
      intent: "定义认知 + 教程执行",
      audience: input.audience,
      monetization: "资料下载 / 咨询引导",
      reason: "适合作为主题入口，承接新手、学习型和初步评估用户。"
    },
    {
      name: `${k}策略`,
      url: `/${slugify(k)}-strategy/`,
      intent: "教程执行 + 问题解决",
      audience: input.audience,
      monetization: `${input.monetization} / 诊断`,
      reason: "能拆出方法、流程、清单、常见错误和案例，利于建立主题权威。"
    },
    {
      name: serviceHub ? `${k}服务` : `${k}解决方案`,
      url: serviceHub ? `/${slugify(k)}-service/` : `/${slugify(k)}-solution/`,
      intent: "交易转化 + 商业调查",
      audience: input.audience,
      monetization: input.monetization,
      reason: "最接近业务转化，适合作为所有商业型内容的主要落点。"
    },
    {
      name: `${k}工具与模板`,
      url: `/${slugify(k)}-tools/`,
      intent: "工具需求 + 资源下载",
      audience: input.audience,
      monetization: "注册 / 下载资料 / 线索收集",
      reason: "适合承接工具、模板、清单类搜索，也容易获得自然引用。"
    },
    {
      name: `${k}问题诊断`,
      url: `/${slugify(k)}-audit/`,
      intent: "问题解决 + 商业调查",
      audience: input.audience,
      monetization: "免费诊断 / 咨询",
      reason: "围绕痛点内容建立信任，适合把低效、没效果、成本高等问题导向转化。"
    }
  ];

  return hubs;
}

function makeSpoke(hub, title, intent, value, priority, cta) {
  const pageType = pageTypeByIntent[intent] || "指南页";
  return {
    hub: hub.name,
    keyword: title,
    intent,
    pageType,
    businessValue: value,
    priority,
    cta,
    schema: schemaByPageType[pageType] || ["BlogPosting", "BreadcrumbList", "FAQPage"]
  };
}

function buildSpokes(input, hubs) {
  const k = input.keyword;
  const ctaMain = input.monetization === "资料下载" ? `下载${k}清单` : `获取${k}诊断`;
  const ctaQuote = input.monetization === "购买" ? "查看方案" : "获取报价/方案";
  const ctaConsult = input.monetization === "注册" ? "注册体验" : "预约咨询";
  const [guide, strategy, service, tools, audit] = hubs;
  const all = [
    makeSpoke(guide, `${k}是什么`, "定义认知", "低", "低", `查看${k}完整指南`),
    makeSpoke(guide, `${k}为什么重要`, "定义认知", "中", "中", `获取${k}评估表`),
    makeSpoke(guide, `${k}适合哪些企业`, "商业调查", "中高", "高", ctaConsult),
    makeSpoke(guide, `${k}新手入门指南`, "教程执行", "中", "中", `下载${k}入门清单`),
    makeSpoke(strategy, `${k}怎么做`, "教程执行", "中高", "高", ctaMain),
    makeSpoke(strategy, `${k}完整流程`, "教程执行", "中高", "高", `下载${k}流程图`),
    makeSpoke(strategy, `高质量${k}怎么判断`, "问题解决", "高", "高", ctaMain),
    makeSpoke(strategy, `${k}常见错误`, "问题解决", "中", "中", `获取${k}避坑清单`),
    makeSpoke(strategy, `${k}案例分析`, "商业调查", "中高", "中", "查看案例/预约复盘"),
    makeSpoke(service, `${k}服务`, "交易转化", "高", "高", ctaConsult),
    makeSpoke(service, `${k}多少钱`, "商业调查", "高", "高", ctaQuote),
    makeSpoke(service, `${k}公司怎么选`, "商业调查", "高", "高", ctaConsult),
    makeSpoke(service, `${k}外包和自己做哪个好`, "比较决策", "高", "高", ctaConsult),
    makeSpoke(service, `${k}服务包含哪些内容`, "商业调查", "高", "高", ctaQuote),
    makeSpoke(tools, `${k}工具推荐`, "工具需求", "中", "中", "查看工具清单"),
    makeSpoke(tools, `${k}模板`, "资源下载", "中", "中", `下载${k}模板`),
    makeSpoke(tools, `${k}检查清单`, "资源下载", "中高", "高", `下载${k}Checklist`),
    makeSpoke(tools, `${k}数据怎么看`, "教程执行", "中", "中", "获取数据分析模板"),
    makeSpoke(audit, `${k}没效果怎么办`, "问题解决", "高", "高", ctaMain),
    makeSpoke(audit, `${k}效果怎么评估`, "商业调查", "高", "高", "获取效果评估"),
    makeSpoke(audit, `${k}成本太高怎么办`, "问题解决", "高", "高", ctaMain),
    makeSpoke(audit, `${k}审计怎么做`, "教程执行", "中高", "高", `下载${k}审计表`)
  ];

  if (input.depth === "简版") return all.slice(0, 12);
  if (input.depth === "深度版") {
    all.push(
      makeSpoke(strategy, `${k}白帽方法和黑帽方法区别`, "比较决策", "中高", "中", "获取风险评估"),
      makeSpoke(strategy, `${k}策略如何制定`, "教程执行", "中高", "高", ctaMain),
      makeSpoke(tools, `${k}工具怎么用`, "教程执行", "中", "中", "查看工具教程"),
      makeSpoke(audit, `${k}风险有哪些`, "问题解决", "中高", "中", "预约风险诊断")
    );
  }
  return all;
}

function rankSpokes(spokes) {
  const score = item => {
    const value = item.businessValue === "高" ? 3 : item.businessValue === "中高" ? 2.5 : item.businessValue === "中" ? 2 : 1;
    const priority = item.priority === "高" ? 3 : item.priority === "中" ? 2 : 1;
    const intent = item.intent === "交易转化" || item.intent === "商业调查" || item.intent === "问题解决" ? 1 : 0;
    return value + priority + intent;
  };
  return [...spokes].sort((a, b) => score(b) - score(a)).slice(0, 10);
}

function buildBrief(input, priority, selectedItem = null) {
  const focus = selectedItem || priority[0];
  const k = input.keyword;
  const title = focus.keyword;
  const problemLine = `${title}的核心不是只追求数量或表面动作，而是先确认目标、质量标准、执行流程和转化承接。`;
  const proof = input.proofPoints || "真实案例、执行经验、数据截图或客户反馈";

  return {
    targetKeyword: title,
    secondaryKeywords: [
      `${k}流程`,
      `${k}费用`,
      `${k}案例`,
      `${k}工具`,
      `${k}常见问题`
    ],
    requiredEntities: [
      "Google Search Console",
      "关键词意图",
      "内容质量",
      "内链",
      "Schema",
      input.brandName
    ],
    wordCount: input.depth === "深度版" ? "2500-3500 字" : input.depth === "简版" ? "1200-1800 字" : "1800-2600 字",
    tone: `专业、直接、面向${input.audience}，少讲概念，多给判断标准和执行动作。`,
    sourceNeeds: [
      "至少 2 个权威来源或官方文档",
      "至少 1 个真实案例或匿名场景",
      "价格/数据/平台规则类内容必须标注更新时间"
    ],
    avoid: [
      "不要堆关键词",
      "不要编造搜索量、案例数字或客户结果",
      "不要把交易型关键词写成纯科普",
      "不要在 FAQ 中重复正文已有小标题"
    ],
    h1: `${title}：适合${input.audience}的完整方法和避坑指南`,
    metaTitle: `${title}｜流程、标准、费用与常见问题`,
    metaDescription: `本文围绕${title}，说明适合人群、执行流程、判断标准、常见错误、案例和FAQ，帮助${input.audience}制定可落地的${k}计划。`,
    summary: `${problemLine} 如果你想通过${k}获得稳定的 Google 流量，需要把关键词意图、页面类型、内容质量、内链和持续更新放在同一套计划里。${input.brandName}可以把这篇内容导向「${input.coreOffer}」。`,
    outline: [
      `H2：${title}的直接答案`,
      `H2：${k}是什么，为什么会影响 Google 流量`,
      `H2：${title}适合谁，不适合谁`,
      `H2：${title}的完整步骤`,
      `H3：第一步，确认目标页面和转化动作`,
      `H3：第二步，拆分关键词和用户问题`,
      `H3：第三步，制定质量判断标准`,
      `H3：第四步，执行、记录和复盘`,
      `H2：${k}质量判断标准`,
      `H2：常见错误和风险`,
      `H2：案例或场景示例`,
      `H2：${k}执行 Checklist`,
      `H2：FAQ：${title}常见问题`,
      `H2：总结和下一步建议`
    ],
    tableIdeas: [
      "质量判断标准表：标准、好表现、差表现、处理建议",
      "执行流程表：步骤、负责人、产出物、复盘指标",
      "费用/成本表：成本项、适合阶段、注意事项"
    ],
    caseIdea: `用一个匿名案例说明${input.audience}在做${k}时遇到的问题、调整动作和结果。可信证明可以来自：${proof}。没有真实数字时只写过程，不编造数据。`
  };
}

function buildFaq(input, brief) {
  const k = input.keyword;
  return [
    `${brief.targetKeyword}一般要多久能看到效果？`,
    `${k}适合新站做吗？`,
    `${k}自己做和找服务商有什么区别？`,
    `判断${k}质量要看哪些指标？`,
    `${k}没效果通常是什么原因？`,
    `${k}预算应该怎么设置？`,
    `${k}有哪些常见风险？`,
    `${k}和内容/内链/技术 SEO 有什么关系？`
  ];
}

function buildSchema(input, brief) {
  return [
    { name: "Organization", level: "必须", use: "建立品牌实体，声明品牌名称、官网、logo、sameAs 社交账号。" },
    { name: "BlogPosting", level: "必须", use: "用于教程、指南、问题解决类页面，标明标题、作者、发布时间和更新时间。" },
    { name: "BreadcrumbList", level: "必须", use: "表达 Hub -> Spoke 的页面层级，帮助搜索引擎理解主题结构。" },
    { name: "FAQPage", level: "建议", use: "页面确实显示 FAQ 时使用。它不保证富结果，但利于 AEO 抽取直接答案。" },
    { name: "Person/ProfilePage", level: "建议", use: "用于作者页或顾问页，强化经验、案例和可信度。" },
    { name: "Service", level: input.businessType === "服务" || input.businessType === "咨询" ? "建议" : "可选", use: `服务页可标记${input.keyword}相关服务、服务区域和提供方。` },
    { name: "HowTo", level: "可选", use: "只有当正文有明确步骤、工具和执行结果时才使用。" },
    { name: "VideoObject", level: "可选", use: "有视频教程或讲解视频时使用，可连接 YouTube 或自托管视频。" }
  ];
}

function buildLinks(hubs, spokes, priority) {
  return {
    hubToSpoke: hubs.map(hub => ({
      hub: hub.name,
      spokes: spokes.filter(item => item.hub === hub.name).slice(0, 6).map(item => item.keyword)
    })),
    spokeToHub: priority.map(item => `${item.keyword} -> 链接回「${item.hub}」Hub 页面`),
    crossLinks: [
      "价格/费用页链接到服务页和案例页。",
      "问题解决页链接到教程页、Checklist 页和诊断 CTA。",
      "工具/模板页链接到完整指南页和服务页。",
      "对比页链接到费用页、服务内容页和案例页。"
    ]
  };
}

function buildPublishingCalendar(input, hubs, spokes, priority) {
  const weekCount = input.depth === "深度版" ? 24 : input.depth === "简版" ? 16 : 20;
  const contentPool = [
    ...priority,
    ...spokes.filter(item => !priority.some(priorityItem => priorityItem.keyword === item.keyword))
  ];
  const phases = [
    "基础权威",
    "痛点解决",
    "商业决策",
    "工具模板",
    "案例信任",
    "更新扩展"
  ];
  const weeks = Array.from({ length: weekCount }, (_, index) => {
    const first = contentPool[(index * 2) % contentPool.length];
    const second = contentPool[(index * 2 + 1) % contentPool.length];
    const phase = phases[Math.min(Math.floor(index / 4), phases.length - 1)];
    return {
      week: `第 ${index + 1} 周`,
      phase,
      articleA: first.keyword,
      articleB: second.keyword,
      hubFocus: first.hub === second.hub ? first.hub : `${first.hub} / ${second.hub}`,
      action: index < 4
        ? "先覆盖核心问题和高商业意图页面，建立主题入口。"
        : index < 8
          ? "补充教程、问题解决和对比内容，强化 Hub 内链。"
          : index < 12
            ? "加入价格、服务、案例和 CTA，提升转化承接。"
            : index < 16
              ? "发布模板、清单和工具页，增加可引用资产。"
              : index < 20
                ? "复盘 Search Console 数据，更新有展现但点击低的页面。"
                : "扩展长尾问题，合并低价值页面，刷新高价值内容。"
    };
  });

  return {
    cadence: "每周 2 篇，连续 4-6 个月",
    minimumWeeks: 16,
    recommendedWeeks: weekCount,
    weeklyOutput: 2,
    goal: `让网站在「${input.keyword}」主题下持续表现为一个能稳定回答用户问题的行业资源。`,
    rules: [
      "每篇内容必须对应一个明确搜索意图，不为了凑数量发布弱内容。",
      "每周至少 1 篇链接到核心服务页或转化页。",
      "每篇新内容至少链接 1 个 Hub 和 2 个相关 Spoke。",
      "第 8 周开始复查已发布页面的标题、摘要、FAQ 和 CTA。",
      "第 12 周开始用 Search Console 数据调整后续选题顺序。",
      "价格、规则、工具、平台政策类页面至少每季度更新一次。"
    ],
    team: [
      "SEO 策略：确定关键词、搜索意图、页面类型和内链。",
      "作者/专家：提供真实经验、案例、判断标准和行业语境。",
      "编辑：统一结构、标题、FAQ、CTA 和事实校验。",
      "设计/运营：制作表格、清单、图片、模板和下载资产。",
      "技术：保证速度、移动端、索引、Schema 和站点健康。"
    ],
    weeks,
    hubCoverage: hubs.map(hub => {
      const related = spokes.filter(item => item.hub === hub.name);
      return {
        hub: hub.name,
        target: related.length,
        firstMonth: related.slice(0, 3).map(item => item.keyword).join(" / "),
        role: hub.intent.includes("交易") ? "承接转化" : hub.intent.includes("工具") ? "获得引用和线索" : "建立主题权威"
      };
    })
  };
}

function buildDataIntent(input, spokes) {
  const dataQuality = input.searchVolume === null && input.difficulty === null && input.cpc === null
    ? "未接入真实关键词数据"
    : "已录入部分关键词数据";
  const opportunity = input.searchVolume === null
    ? "待验证"
    : input.difficulty !== null && input.difficulty >= 70
      ? "高竞争，需要长周期和更强内容资产"
      : input.searchVolume >= 500
        ? "有明确搜索需求，适合优先验证"
        : "搜索量可能较小，需依赖商业价值判断";

  return {
    keywordData: [
      { metric: "月搜索量", value: input.searchVolume ?? "待接入/手填", note: "可来自 Google Keyword Planner、DataForSEO、Ahrefs、Semrush。" },
      { metric: "竞争度", value: input.difficulty ?? "待接入/手填", note: "用于判断短期可排名性，不应单独决定是否写。" },
      { metric: "CPC", value: input.cpc ?? "待接入/手填", note: "可辅助判断商业价值，尤其适合服务/询盘型业务。" },
      { metric: "数据状态", value: dataQuality, note: opportunity }
    ],
    intentRows: spokes.slice(0, 12).map(item => ({
      keyword: item.keyword,
      hubOrSpoke: item.priority === "高" && item.businessValue === "高" ? "核心 Spoke / 可做独立落地页" : "Spoke",
      intent: item.intent,
      pageType: item.pageType,
      confidence: item.intent === "交易转化" || item.intent === "商业调查" ? "高" : item.intent === "问题解决" ? "中高" : "中",
      validation: "用 SERP 前 10 页面类型校准"
    })),
    decisionRules: [
      "搜索量高但商业价值低：作为主题权威内容，不优先承接转化。",
      "搜索量低但商业价值高：仍值得写，尤其适合服务页、价格页、案例页。",
      "竞争度高：先写长尾 Spoke 和问题解决页，再冲 Hub。",
      "SERP 多为服务页：你的页面也要有服务范围、价格线索、案例和 CTA。",
      "SERP 多为教程页：先做深度指南，再用内链导向服务页。"
    ]
  };
}

function buildEeat(input) {
  return {
    identity: [
      { item: "品牌实体", recommendation: `${input.brandName} 在首页、关于页、作者页、社媒资料中保持同一名称和定位。`, status: input.brandName === "你的品牌" ? "待补" : "已输入" },
      { item: "作者身份", recommendation: `使用 ${input.authorName} 的作者页，说明经验、行业背景和可验证成果。`, status: input.authorName === "作者/专家" ? "待补" : "已输入" },
      { item: "服务地区", recommendation: `在服务页和 Organization/Service Schema 中标明 ${input.region}。`, status: input.region === "目标市场" ? "待补" : "已输入" },
      { item: "可信证明", recommendation: input.proofPoints || "补充案例、客户类型、数据截图、流程截图、评价或第三方提及。", status: input.proofPoints ? "已输入" : "待补" }
    ],
    checklist: [
      "页面顶部显示作者和更新时间。",
      "关键判断给出原因，不只给结论。",
      "涉及费用、规则、工具和平台政策时写明更新时间。",
      "案例没有真实数字时，只写过程和方法，不编造结果。",
      "关于页说明品牌、团队、服务范围、联系方式和社媒账号。",
      "在 YouTube、LinkedIn、知乎或行业平台建立一致的品牌提及。"
    ],
    geoActions: [
      `让「${input.brandName}」和「${input.keyword}」在站内页面、作者页、社交资料和第三方内容中共同出现。`,
      "把案例、模板、报告做成可被引用的内容资产。",
      "发布第三方投稿、访谈、播客或行业回答，增加非链接品牌提及。",
      "建立 sameAs 链接：LinkedIn、YouTube、X、知乎、公众号或行业目录。"
    ]
  };
}

function buildAssets(input, spokes, priority) {
  const pool = [...priority, ...spokes.filter(item => !priority.some(priorityItem => priorityItem.keyword === item.keyword))];
  return pool.slice(0, 16).map((item, index) => {
    const updateFrequency = /费用|多少钱|价格|工具|数据|平台|规则/.test(item.keyword) ? "每季度" : item.businessValue === "高" ? "每季度" : "每半年";
    const status = index < 4 ? "待写" : index < 10 ? "排期中" : "候选";
    return {
      keyword: item.keyword,
      hub: item.hub,
      pageType: item.pageType,
      status,
      owner: input.authorName,
      publishWindow: index < 8 ? `第 ${Math.floor(index / 2) + 1} 周` : `第 ${Math.floor(index / 2) + 1} 周后`,
      updateFrequency,
      updateTrigger: "排名下降、CTR 低、规则变化、案例过期、SERP 页面类型变化",
      conversion: item.cta
    };
  });
}

function buildQualityScore(input, planPieces) {
  const hasData = input.searchVolume !== null || input.difficulty !== null || input.cpc !== null;
  const hasBrand = input.brandName !== "你的品牌";
  const hasAuthor = input.authorName !== "作者/专家";
  const hasProof = Boolean(input.proofPoints);
  const scores = [
    { name: "SEO 完整度", score: 84, reason: "Hub、Spoke、内链、Schema 和发布节奏已覆盖。" },
    { name: "AEO 友好度", score: 82, reason: "Brief 包含直接答案、步骤、表格、FAQ 和摘要。" },
    { name: "GEO 可信度", score: 62 + (hasBrand ? 8 : 0) + (hasAuthor ? 8 : 0) + (hasProof ? 10 : 0), reason: "取决于品牌实体、作者身份、案例和第三方提及。" },
    { name: "转化承接", score: 76 + (input.coreOffer !== "免费诊断/咨询" ? 8 : 0), reason: "已按 CTA 规划，但还需要真实落地页和表单数据验证。" },
    { name: "数据可信度", score: hasData ? 72 : 45, reason: hasData ? "已录入部分关键词数据，但仍需 SERP/搜索量 API 校准。" : "未接入搜索量、难度、CPC 等真实关键词数据。" },
    { name: "内容运营度", score: 86, reason: "已有发布日历、资产状态、更新频率和维护触发器。" }
  ];
  const average = Math.round(scores.reduce((sum, item) => sum + item.score, 0) / scores.length);
  const fixes = [
    hasData ? "继续用 API 批量校准关键词数据。" : "接入 DataForSEO/Ahrefs/Semrush 或手填搜索量、难度、CPC。",
    hasBrand ? "保持品牌 sameAs 和第三方提及一致。" : "补充品牌名、官网、社媒和关于页信息。",
    hasAuthor ? "完善作者页和专家经历。" : "补充作者/专家身份。",
    hasProof ? "把案例证明放进正文和服务页。" : "补充真实案例、截图、评价或行业经验。",
    "发布后接入 Search Console 数据，按 CTR、排名和转化更新资产库。"
  ];
  return { average, scores, fixes };
}

function buildWorkflow(input) {
  return {
    exports: [
      { name: "Markdown Brief", status: "已支持", note: "用于交给作者、编辑或 AI 写作工具。" },
      { name: "CSV 内容地图", status: "已支持", note: "用于 Google Sheets、Notion、Airtable 导入。" },
      { name: "JSON-LD Schema", status: "可复制示例", note: "Schema Tab 已生成基础示例，后续可做一键复制。" },
      { name: "WordPress 草稿", status: "未接", note: "需要 WordPress REST API 和站点应用密码。" },
      { name: "Notion 数据库", status: "未接", note: "需要 Notion Integration Token 和数据库字段映射。" },
      { name: "Google Sheets", status: "未接", note: "需要 Google OAuth 或服务账号。" }
    ],
    productionFlow: [
      "策略：生成 Hub/Spoke、SERP、数据/意图。",
      "Brief：确认页面类型、H2/H3、FAQ、表格、案例和 CTA。",
      "写作：作者补充经验、数据、来源和截图。",
      "编辑：检查事实、结构、重复、内链、Schema。",
      "发布：提交索引，记录 URL、发布时间和负责人。",
      "维护：4-8 周后检查 GSC 数据，进入更新队列。"
    ],
    requiredFields: [
      "Keyword",
      "Hub",
      "URL",
      "Page Type",
      "Intent",
      "Owner",
      "Status",
      "Publish Date",
      "Update Frequency",
      "CTA",
      "Internal Links",
      "Schema"
    ]
  };
}

function buildLandingPage(plan) {
  const input = plan.input;
  const serviceName = plan.priority.find(item => item.intent === "交易转化")?.keyword || `${input.keyword}服务`;
  return {
    title: `${serviceName}｜${input.brandName}`,
    url: `/${slugify(serviceName)}/`,
    sections: [
      { section: "Hero 首屏", goal: "3 秒内说清服务和结果", content: `H1：${serviceName}。副标题说明服务对象：${input.audience}。主 CTA：${input.coreOffer}。` },
      { section: "适合谁", goal: "筛选客户", content: `列出适合 ${input.audience} 的 4-6 种场景，也说明不适合的人群。` },
      { section: "痛点诊断", goal: "让用户觉得你懂他", content: `围绕 ${input.keyword} 没效果、成本高、转化差、缺人手等痛点展开。` },
      { section: "服务内容", goal: "说明交付范围", content: "用表格列出策略、内容、技术、转化、复盘等服务模块。" },
      { section: "执行流程", goal: "降低不确定性", content: "诊断 -> 策略 -> 执行 -> 周报/月报 -> 调整。" },
      { section: "案例/证明", goal: "建立信任", content: input.proofPoints || "放匿名案例、行业经验、截图、客户评价或过程证明。" },
      { section: "价格因素", goal: "承接商业调查", content: "不一定公开报价，但要说明影响价格的因素和预算区间判断方法。" },
      { section: "FAQ", goal: "处理异议", content: plan.faq.slice(0, 6).join(" / ") },
      { section: "最终 CTA", goal: "转化", content: `再次引导：${input.coreOffer}。` }
    ],
    schema: ["Service", "Organization", "BreadcrumbList", "FAQPage"],
    assets: ["客户案例截图", "流程图", "服务范围表", "报价影响因素表", "FAQ"]
  };
}

function buildAuditFramework(plan) {
  return [
    { category: "索引", item: "robots.txt / sitemap.xml / canonical / noindex", priority: "高", evidence: "Search Console 或手动检查", output: "索引问题清单" },
    { category: "页面基础", item: "Title、Meta Description、唯一 H1、URL 结构", priority: "高", evidence: "抓取页面或手动抽查", output: "页面元信息优化表" },
    { category: "内容质量", item: "搜索意图、首段答案、H2/H3、FAQ、表格、案例", priority: "高", evidence: "对照 SERP 和 Brief", output: "内容改写建议" },
    { category: "内链", item: "Hub -> Spoke、Spoke -> Hub、转化页入口", priority: "高", evidence: "站内链接结构", output: "内链补充计划" },
    { category: "结构化数据", item: "Organization、Article、Breadcrumb、FAQ、Service", priority: "中高", evidence: "Rich Results Test", output: "Schema 修复清单" },
    { category: "速度体验", item: "移动端、Core Web Vitals、图片体积、JS/CSS", priority: "中高", evidence: "PageSpeed Insights", output: "性能优化建议" },
    { category: "转化", item: "CTA、表单、联系方式、案例、信任元素", priority: "高", evidence: "页面首屏和转化路径", output: "转化优化清单" },
    { category: "GEO/AEO", item: "作者页、品牌实体、直接答案、第三方提及", priority: "中", evidence: "站内外品牌一致性", output: "可信度建设计划" }
  ];
}

function buildGapFramework(plan) {
  return [
    { dimension: "页面类型", check: "竞品是服务页、博客、工具页还是列表页？", action: "用 SERP 主导类型校准你的页面类型。" },
    { dimension: "标题角度", check: "竞品标题是否集中在价格、教程、服务、对比？", action: "补一个更贴近搜索意图的 H1 和 Meta Title。" },
    { dimension: "内容结构", check: "竞品覆盖了哪些 H2/H3？", action: "列出缺失问题，补进正文或 FAQ。" },
    { dimension: "可信证明", check: "竞品是否有案例、作者、数据、评价？", action: "补充你的经验、案例和可验证证据。" },
    { dimension: "转化路径", check: "竞品 CTA 是咨询、报价、下载还是注册？", action: `围绕「${plan.input.coreOffer}」做更具体 CTA。` },
    { dimension: "Schema", check: "竞品是否有 Article/FAQ/Service/Breadcrumb？", action: "把页面类型对应的 Schema 加完整。" },
    { dimension: "内容资产", check: "竞品是否有模板、清单、工具或报告？", action: "做一个可下载资源提升引用和转化。" }
  ];
}

function buildClientReport(plan) {
  return {
    title: `${plan.input.brandName}｜${plan.input.keyword} SEO/GEO/AEO 月度报告`,
    sections: [
      "本月目标：围绕核心 Hub 建立主题权威，并推进高商业价值页面。",
      `核心 Hub：${plan.input.keyword}`,
      `本月优先内容：${plan.priority.slice(0, 5).map(item => item.keyword).join("、")}`,
      `主要 CTA：${plan.input.coreOffer}`,
      "已完成工作：内容规划、SERP 分析、页面 Brief、内链规划、发布节奏。",
      "下月计划：发布第一批页面，补充案例和 FAQ，建立 Hub-Spoke 内链。",
      "需要客户配合：确认服务范围、提供案例/截图/报价口径、确认作者信息。",
      "风险提醒：搜索量和竞争度仍需第三方关键词数据库或 GSC 数据校准。"
    ],
    metrics: ["发布页面数", "索引页面数", "展示量", "点击量", "CTR", "平均排名", "询盘数", "转化率"]
  };
}

function buildPlan(input) {
  const hubs = buildHubs(input);
  const spokes = buildSpokes(input, hubs);
  const priority = rankSpokes(spokes);
  const brief = buildBrief(input, priority);
  const faq = buildFaq(input, brief);
  const schema = buildSchema(input, brief);
  const links = buildLinks(hubs, spokes, priority);
  const calendar = buildPublishingCalendar(input, hubs, spokes, priority);
  const dataIntent = buildDataIntent(input, spokes);
  const eeat = buildEeat(input);
  const assets = buildAssets(input, spokes, priority);
  const workflow = buildWorkflow(input);
  const plan = { input, hubs, spokes, priority, brief, faq, schema, links, calendar, dataIntent, eeat, assets, workflow };
  plan.quality = buildQualityScore(input, plan);
  return plan;
}

function classifySerpResult(result) {
  const text = `${result.title} ${result.link} ${result.snippet}`.toLowerCase();
  if (/reddit|quora|zhihu|forum|community|bbs/.test(text)) return "社区/论坛";
  if (/tool|calculator|checker|generator|template|模板|工具|生成器|检测/.test(text)) return "工具/模板";
  if (/service|agency|company|consulting|pricing|quote|服务|公司|代运营|报价|价格/.test(text)) return "服务/商业页";
  if (/best|top|compare|vs|alternative|list|推荐|排行|对比|区别/.test(text)) return "列表/对比页";
  if (/guide|how to|what is|tutorial|learn|指南|教程|是什么|怎么|如何/.test(text)) return "指南/教程";
  if (/blog|article|insights|news|百科|知识/.test(text)) return "博客/文章";
  return "其他";
}

function analyzeSerp(data) {
  const results = data?.organicResults || [];
  const types = results.reduce((acc, result) => {
    const type = classifySerpResult(result);
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  const sortedTypes = Object.entries(types).sort((a, b) => b[1] - a[1]);
  const dominantType = sortedTypes[0]?.[0] || "未知";
  const domains = [...new Set(results.map(item => item.domain).filter(Boolean))];
  const hasCommercial = Boolean(types["服务/商业页"]);
  const hasForums = Boolean(types["社区/论坛"]);
  const hasTools = Boolean(types["工具/模板"]);
  const recommendedPageType = dominantType === "服务/商业页"
    ? "服务页或商业型指南页"
    : dominantType === "工具/模板"
      ? "工具页/模板页 + 指南说明"
      : dominantType === "列表/对比页"
        ? "对比/清单型文章"
        : "深度指南/教程型文章";

  const gaps = [
    "标题下第一段直接回答搜索问题，避免只写铺垫。",
    "把竞品分散的信息整理成表格、步骤和 FAQ。",
    hasCommercial ? "如果 SERP 已有商业页，页面里要明确价格、服务范围、案例和 CTA。" : "可以用商业调查段落承接后续咨询，不要让文章只停留在科普。",
    hasForums ? "社区结果出现说明用户有真实疑问，建议增加经验型回答和避坑段落。" : "补充真实案例和作者经验，避免内容像通用百科。",
    hasTools ? "如果工具页占位明显，考虑提供模板、Checklist 或可下载资源。" : "加入可下载清单或执行模板，提升可引用性。"
  ];

  return { types, sortedTypes, dominantType, domains, recommendedPageType, gaps };
}

function normalizeKeyword(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function classifyExpandedKeyword(keyword, source, rootKeyword) {
  const text = normalizeKeyword(keyword);
  const lower = text.toLowerCase();
  const isQuestion = /怎么|如何|为什么|怎么办|多少钱|哪家|靠谱吗|是什么|区别|适合|多久|how|what|why|cost|price|best|vs/.test(lower);
  const commercial = /代运营|服务|公司|报价|费用|多少钱|价格|顾问|咨询|agency|service|pricing|quote|company/.test(lower);
  const broadTopic = /运营|推广|p4p|开店|费用|代运营|询盘|关键词|广告|工具|模板|策略/.test(lower);
  const isRoot = text === rootKeyword;

  if (source === "People Also Ask" || isQuestion) {
    return {
      use: commercial ? "Spoke / FAQ" : "FAQ / H2",
      pageType: commercial ? "商业调查页 / FAQ" : "问题型段落 / FAQ",
      priority: commercial ? "高" : "中"
    };
  }

  if (!isRoot && broadTopic && text.length <= rootKeyword.length + 8 && !/多少钱|怎么办|怎么|如何|哪家|靠谱吗/.test(lower)) {
    return {
      use: "候选 Hub",
      pageType: "二级 Hub / 主题入口页",
      priority: commercial ? "高" : "中高"
    };
  }

  return {
    use: "Spoke",
    pageType: commercial ? "服务/价格/决策页" : "教程/指南页",
    priority: commercial ? "高" : "中"
  };
}

function buildExpansionCandidates(plan) {
  const rows = [];
  const seen = new Set();
  const add = (keyword, source) => {
    const normalized = normalizeKeyword(keyword);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    const classified = classifyExpandedKeyword(normalized, source, plan.input.keyword);
    rows.push({
      keyword: normalized,
      source,
      ...classified
    });
  };

  if (currentExpansion?.suggestions) {
    currentExpansion.suggestions.forEach(item => add(item, "Autocomplete"));
  }

  if (currentSerp?.relatedSearches) {
    currentSerp.relatedSearches.forEach(item => add(item, "Related Searches"));
  }

  if (currentSerp?.relatedQuestions) {
    currentSerp.relatedQuestions.forEach(item => add(item.question, "People Also Ask"));
  }

  return rows;
}

function badge(value) {
  const className = value === "高" || value === "中高" ? "high" : value === "中" ? "medium" : "low";
  return `<span class="badge ${className}">${escapeHtml(value)}</span>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderTable(headers, rows) {
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function findContentItem(keyword) {
  if (!currentPlan) return null;
  return [...currentPlan.spokes, ...currentPlan.priority].find(item => item.keyword === keyword) || null;
}

function makeBriefFromKeyword(keyword, fallback = {}) {
  const existing = findContentItem(keyword);
  if (existing) return buildBrief(currentPlan.input, currentPlan.priority, existing);

  return buildBrief(currentPlan.input, currentPlan.priority, {
    hub: fallback.hub || `${currentPlan.input.keyword}指南`,
    keyword,
    intent: fallback.intent || "教程执行",
    pageType: fallback.pageType || "教程/指南页",
    businessValue: fallback.businessValue || "中",
    priority: fallback.priority || "中",
    cta: fallback.cta || currentPlan.input.coreOffer
  });
}

function briefButton(keyword) {
  return `<button class="inline-action" type="button" data-brief-keyword="${escapeHtml(keyword)}">生成 Brief</button>`;
}

function addSpokeButton(keyword, use) {
  if (use.includes("FAQ") && !use.includes("Spoke")) return "";
  return `<button class="inline-action secondary" type="button" data-add-spoke="${escapeHtml(keyword)}">加入 Spoke</button>`;
}

function selectBrief(keyword) {
  if (!currentPlan) return;
  selectedBriefKeyword = keyword;
  currentPlan.brief = makeBriefFromKeyword(keyword);
  currentPlan.faq = buildFaq(currentPlan.input, currentPlan.brief);
  currentPlan.schema = buildSchema(currentPlan.input, currentPlan.brief);
  activeTab = "brief";
  tabs.forEach(item => item.classList.toggle("is-active", item.dataset.tab === activeTab));
  renderPlan();
  showToast(`已切换到「${keyword}」的页面结构`);
}

function addKeywordToSpokes(keyword) {
  if (!currentPlan) return;
  if (currentPlan.spokes.some(item => item.keyword === keyword)) {
    showToast("这个关键词已经在 Spoke 里了", "warning");
    return;
  }
  const hub = currentPlan.hubs[1] || currentPlan.hubs[0];
  const classified = classifyExpandedKeyword(keyword, "Manual", currentPlan.input.keyword);
  const intent = classified.pageType.includes("服务") || classified.pageType.includes("价格") ? "商业调查" : classified.use.includes("FAQ") ? "问题解决" : "教程执行";
  const businessValue = classified.priority === "高" ? "高" : classified.priority === "中高" ? "中高" : "中";
  const newItem = makeSpoke(hub, keyword, intent, businessValue, classified.priority === "高" ? "高" : "中", currentPlan.input.coreOffer);
  currentPlan.spokes = [newItem, ...currentPlan.spokes];
  currentPlan.priority = rankSpokes(currentPlan.spokes);
  currentPlan.dataIntent = buildDataIntent(currentPlan.input, currentPlan.spokes);
  currentPlan.assets = buildAssets(currentPlan.input, currentPlan.spokes, currentPlan.priority);
  showToast(`已加入 Spoke：${keyword}`);
  renderPlan();
}

function renderHubs(plan) {
  const metrics = `
    <div class="grid-cards">
      <div class="metric-card"><span>核心词</span><strong>${escapeHtml(plan.input.keyword)}</strong></div>
      <div class="metric-card"><span>推荐 Hub</span><strong>${plan.hubs.length}</strong></div>
      <div class="metric-card"><span>候选 Spoke</span><strong>${plan.spokes.length}</strong></div>
    </div>
  `;
  const rows = plan.hubs.map(hub => [
    escapeHtml(hub.name),
    escapeHtml(hub.url),
    escapeHtml(hub.intent),
    escapeHtml(hub.audience),
    escapeHtml(hub.monetization),
    escapeHtml(hub.reason)
  ]);
  return `${metrics}<div class="content-card"><h3>Hub 规划</h3>${renderTable(["Hub", "URL", "搜索意图", "目标用户", "变现方式", "为什么适合"], rows)}</div>`;
}

function renderSpokes(plan) {
  const rows = plan.spokes.map(item => [
    escapeHtml(item.hub),
    escapeHtml(item.keyword),
    escapeHtml(item.intent),
    escapeHtml(item.pageType),
    badge(item.businessValue),
    badge(item.priority),
    escapeHtml(item.cta),
    briefButton(item.keyword)
  ]);
  return `<div class="content-card"><h3>Spoke 内容地图</h3>${renderTable(["Hub", "Spoke", "搜索意图", "页面类型", "商业价值", "优先级", "CTA", "操作"], rows)}</div>`;
}

function renderPriority(plan) {
  const rows = plan.priority.map((item, index) => [
    String(index + 1),
    escapeHtml(item.keyword),
    escapeHtml(item.hub),
    escapeHtml(item.intent),
    escapeHtml(item.pageType),
    badge(item.businessValue),
    escapeHtml(item.cta),
    briefButton(item.keyword)
  ]);
  return `<div class="content-card"><h3>第一批优先内容</h3><p>这批内容优先考虑商业价值、痛点强度、可转化性和主题权威，不等同于真实搜索量排序。发布前仍建议用 Keyword Planner、Ahrefs、SEMrush 或 Search Console 校准。</p>${renderTable(["顺序", "关键词/标题", "Hub", "搜索意图", "页面类型", "商业价值", "CTA", "操作"], rows)}</div>`;
}

function renderSerp(plan) {
  const query = escapeHtml(plan.input.keyword);
  const market = escapeHtml(plan.input.market);

  if (serpState === "loading") {
    return `
      <div class="content-card serp-hero">
        <h3>SERP 分析</h3>
        <p>正在分析「${query}」的 Google 搜索结果...</p>
      </div>
    `;
  }

  if (serpState === "error") {
    return `
      <div class="brief-block">
        <div class="content-card serp-hero">
          <h3>SERP 分析未启用</h3>
          <p>${escapeHtml(serpMessage || "暂时无法获取 SERP 数据。")}</p>
          <button id="runSerpAnalysis" class="primary-action compact-action" type="button"><span aria-hidden="true">↻</span>重新分析 SERP</button>
        </div>
        <div class="content-card">
          <h3>配置方式</h3>
          <ol class="brief-list">
            <li>注册 SerpApi 并获取 API Key。</li>
            <li>在 Vercel 项目 Settings -> Environment Variables 添加 <strong>SERPAPI_KEY</strong>。</li>
            <li>重新部署项目，然后回到这里点击分析。</li>
          </ol>
        </div>
      </div>
    `;
  }

  if (!currentSerp || currentSerp.query !== plan.input.keyword || currentSerp.market !== plan.input.market) {
    return `
      <div class="brief-block">
        <div class="content-card serp-hero">
          <h3>SERP 竞争分析</h3>
          <p>拉取「${query}」在 ${market} 下的 Google 前 10 结果，判断页面类型、PAA 问题和内容缺口。</p>
          <button id="runSerpAnalysis" class="primary-action compact-action" type="button"><span aria-hidden="true">→</span>分析 SERP</button>
        </div>
        <div class="section-grid">
          <div class="content-card">
            <h3>会分析什么</h3>
            <ul class="brief-list">
              <li>前 10 排名页面标题、URL、摘要和域名。</li>
              <li>SERP 页面类型分布：指南、服务页、工具页、论坛等。</li>
              <li>People Also Ask 和相关搜索。</li>
              <li>建议页面类型和内容缺口。</li>
            </ul>
          </div>
          <div class="content-card">
            <h3>数据来源</h3>
            <p>当前版本通过后端 API 调用 SerpApi Google Search API，API Key 只保存在 Vercel 环境变量中。</p>
          </div>
        </div>
      </div>
    `;
  }

  const analysis = analyzeSerp(currentSerp);
  const resultRows = currentSerp.organicResults.map(result => [
    String(result.position || ""),
    escapeHtml(classifySerpResult(result)),
    `<a href="${escapeHtml(result.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(result.title)}</a>`,
    escapeHtml(result.domain),
    escapeHtml(result.snippet)
  ]);
  const typeRows = analysis.sortedTypes.map(([type, count]) => [
    escapeHtml(type),
    String(count),
    `${Math.round((count / Math.max(currentSerp.organicResults.length, 1)) * 100)}%`
  ]);
  const questionRows = currentSerp.relatedQuestions.map(item => [
    escapeHtml(item.question),
    escapeHtml(item.snippet || "SERP 未返回摘要")
  ]);
  const relatedRows = currentSerp.relatedSearches.map(item => [escapeHtml(item)]);

  return `
    <div class="brief-block">
      <div class="grid-cards">
        <div class="metric-card"><span>主导页面类型</span><strong>${escapeHtml(analysis.dominantType)}</strong></div>
        <div class="metric-card"><span>建议页面类型</span><strong>${escapeHtml(analysis.recommendedPageType)}</strong></div>
        <div class="metric-card"><span>竞争域名数</span><strong>${analysis.domains.length}</strong></div>
      </div>
      <div class="content-card serp-hero">
        <h3>SERP 分析：${escapeHtml(currentSerp.query)}</h3>
        <p>位置：${escapeHtml(currentSerp.location)}。${currentSerp.searchInformation.totalResults ? `估算结果数：${escapeHtml(currentSerp.searchInformation.totalResults)}。` : ""}</p>
        <button id="runSerpAnalysis" class="ghost-button" type="button"><span aria-hidden="true">↻</span>刷新 SERP</button>
      </div>
      <div class="section-grid">
        <div class="content-card">
          <h3>页面类型分布</h3>
          ${renderTable(["类型", "数量", "占比"], typeRows)}
        </div>
        <div class="content-card">
          <h3>内容缺口建议</h3>
          <ul class="brief-list">${analysis.gaps.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </div>
      </div>
      <div class="content-card"><h3>Google 前 10</h3>${renderTable(["排名", "类型", "标题", "域名", "摘要"], resultRows)}</div>
      ${questionRows.length ? `<div class="content-card"><h3>People Also Ask</h3>${renderTable(["问题", "摘要"], questionRows)}</div>` : ""}
      ${relatedRows.length ? `<div class="content-card"><h3>相关搜索</h3>${renderTable(["Query"], relatedRows)}</div>` : ""}
    </div>
  `;
}

function renderExpansion(plan) {
  if (expansionState === "loading") {
    return `
      <div class="content-card serp-hero">
        <h3>关键词扩展</h3>
        <p>正在拉取「${escapeHtml(plan.input.keyword)}」的 Google Autocomplete 下拉词...</p>
      </div>
    `;
  }

  if (expansionState === "error") {
    return `
      <div class="brief-block">
        <div class="content-card serp-hero">
          <h3>关键词扩展未启用</h3>
          <p>${escapeHtml(expansionMessage || "暂时无法获取关键词扩展数据。")}</p>
          <button id="runExpansion" class="primary-action compact-action" type="button"><span aria-hidden="true">↻</span>重新扩展</button>
        </div>
      </div>
    `;
  }

  const candidates = buildExpansionCandidates(plan);
  if (!currentExpansion || currentExpansion.query !== plan.input.keyword || currentExpansion.market !== plan.input.market) {
    return `
      <div class="brief-block">
        <div class="content-card serp-hero">
          <h3>关键词扩展</h3>
          <p>从 Google 下拉词生成真实用户搜索候选，并可合并 SERP 的相关搜索和 People Also Ask。</p>
          <button id="runExpansion" class="primary-action compact-action" type="button"><span aria-hidden="true">→</span>获取下拉词</button>
        </div>
        <div class="section-grid">
          <div class="content-card">
            <h3>它会怎么用</h3>
            <ul class="brief-list">
              <li>短而能继续拆分的词，标成候选 Hub。</li>
              <li>具体问题、价格、服务、对比词，标成 Spoke。</li>
              <li>People Also Ask 适合作为 FAQ 或 H2。</li>
              <li>Related Searches 适合作为 Spoke 或二级 Hub 候选。</li>
            </ul>
          </div>
          <div class="content-card">
            <h3>建议流程</h3>
            <ol class="brief-list">
              <li>先点这里获取下拉词。</li>
              <li>再去 SERP Tab 跑一次分析。</li>
              <li>回到这里合并查看所有候选。</li>
              <li>把高优先级候选加入内容表。</li>
            </ol>
          </div>
        </div>
      </div>
    `;
  }

  const rows = candidates.map(item => [
    escapeHtml(item.keyword),
    escapeHtml(item.source),
    escapeHtml(item.use),
    escapeHtml(item.pageType),
    badge(item.priority),
    `<div class="inline-actions">${addSpokeButton(item.keyword, item.use)}${briefButton(item.keyword)}</div>`
  ]);
  const hubCount = candidates.filter(item => item.use.includes("Hub")).length;
  const spokeCount = candidates.filter(item => item.use.includes("Spoke")).length;
  const faqCount = candidates.filter(item => item.use.includes("FAQ")).length;

  return `
    <div class="brief-block">
      <div class="grid-cards">
        <div class="metric-card"><span>候选 Hub</span><strong>${hubCount}</strong></div>
        <div class="metric-card"><span>候选 Spoke</span><strong>${spokeCount}</strong></div>
        <div class="metric-card"><span>FAQ/H2 问题</span><strong>${faqCount}</strong></div>
      </div>
      <div class="content-card serp-hero">
        <h3>关键词扩展：${escapeHtml(plan.input.keyword)}</h3>
        <p>已合并 Autocomplete${currentSerp ? "、Related Searches 和 People Also Ask" : ""}。如果想补充相关搜索和 PAA，请先跑 SERP。</p>
        <button id="runExpansion" class="ghost-button" type="button"><span aria-hidden="true">↻</span>刷新下拉词</button>
      </div>
      <div class="content-card">
        <h3>扩展候选池</h3>
        ${rows.length ? renderTable(["关键词/问题", "来源", "建议用途", "页面类型", "优先级", "操作"], rows) : "<p>暂时没有返回候选词。</p>"}
      </div>
    </div>
  `;
}

function renderDataIntent(plan) {
  const dataRows = plan.dataIntent.keywordData.map(item => [
    escapeHtml(item.metric),
    escapeHtml(item.value),
    escapeHtml(item.note)
  ]);
  const intentRows = plan.dataIntent.intentRows.map(item => [
    escapeHtml(item.keyword),
    escapeHtml(item.hubOrSpoke),
    escapeHtml(item.intent),
    escapeHtml(item.pageType),
    badge(item.confidence),
    escapeHtml(item.validation)
  ]);
  return `
    <div class="brief-block">
      <div class="content-card">
        <h3>关键词数据</h3>
        <p>这里支持手填搜索量、竞争度和 CPC；真实批量数据仍需要接 DataForSEO、Ahrefs、Semrush 或 Google Keyword Planner。</p>
        ${renderTable(["指标", "值", "说明"], dataRows)}
      </div>
      <div class="content-card">
        <h3>搜索意图校准</h3>
        ${renderTable(["关键词", "Hub/Spoke 判断", "搜索意图", "页面类型", "置信度", "验证方式"], intentRows)}
      </div>
      <div class="content-card">
        <h3>决策规则</h3>
        <ul class="brief-list">${plan.dataIntent.decisionRules.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
    </div>
  `;
}

function renderBrief(plan) {
  const brief = plan.brief;
  return `
    <div class="brief-block">
      <div class="content-card brief-switcher">
        <h3>当前写作对象</h3>
        <p>${escapeHtml(selectedBriefKeyword || brief.targetKeyword)}</p>
        <p>可以在 Spoke、优先内容或关键词扩展里点击“生成 Brief”，这里会切换成对应文章的写作结构。</p>
      </div>
      <div class="content-card">
        <h3>单篇页面结构：${escapeHtml(brief.targetKeyword)}</h3>
        <p><strong>H1：</strong>${escapeHtml(brief.h1)}</p>
        <p><strong>Meta Title：</strong>${escapeHtml(brief.metaTitle)}</p>
        <p><strong>Meta Description：</strong>${escapeHtml(brief.metaDescription)}</p>
        <p><strong>AEO 开头摘要：</strong>${escapeHtml(brief.summary)}</p>
        <p><strong>建议字数：</strong>${escapeHtml(brief.wordCount)}</p>
        <p><strong>写作语气：</strong>${escapeHtml(brief.tone)}</p>
        <button id="generateArticle" class="primary-action compact-action" type="button"><span aria-hidden="true">→</span>生成完整文章</button>
      </div>
      <div class="section-grid">
        <div class="content-card">
          <h3>H2/H3 大纲</h3>
          <ol class="brief-list">${brief.outline.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
        </div>
        <div class="content-card">
          <h3>表格和案例</h3>
          <ul class="brief-list">${brief.tableIdeas.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          <p>${escapeHtml(brief.caseIdea)}</p>
        </div>
      </div>
      <div class="section-grid">
        <div class="content-card">
          <h3>次级关键词和实体</h3>
          <p><strong>次级关键词：</strong>${escapeHtml(brief.secondaryKeywords.join(" / "))}</p>
          <p><strong>必须覆盖实体：</strong>${escapeHtml(brief.requiredEntities.join(" / "))}</p>
        </div>
        <div class="content-card">
          <h3>来源和避免事项</h3>
          <ul class="brief-list">${brief.sourceNeeds.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          <ul class="brief-list">${brief.avoid.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </div>
      </div>
    </div>
  `;
}

function renderArticle(plan) {
  if (articleState === "loading") {
    return `
      <div class="content-card serp-hero">
        <h3>正在生成文章初稿</h3>
        <p>正在基于「${escapeHtml(plan.brief.targetKeyword)}」的 Brief、SERP 和关键词扩展生成 Markdown 初稿...</p>
      </div>
    `;
  }

  if (articleState === "error") {
    return `
      <div class="brief-block">
        <div class="content-card serp-hero">
          <h3>文章生成未启用</h3>
          <p>${escapeHtml(articleMessage || "暂时无法生成文章。")}</p>
          <button id="generateArticle" class="primary-action compact-action" type="button"><span aria-hidden="true">↻</span>重新生成</button>
        </div>
        <div class="content-card">
          <h3>配置方式</h3>
          <ol class="brief-list">
            <li>在 Vercel 项目 Settings -> Environment Variables 添加 <strong>OPENAI_API_KEY</strong>。</li>
            <li>可选添加 <strong>OPENAI_MODEL</strong>，默认使用 <strong>gpt-5.4-mini</strong>。</li>
            <li>重新部署项目，再回到这里生成文章。</li>
          </ol>
        </div>
      </div>
    `;
  }

  if (!currentArticle || currentArticle.keyword !== plan.brief.targetKeyword) {
    return `
      <div class="brief-block">
        <div class="content-card serp-hero">
          <h3>文章初稿</h3>
          <p>基于当前页面结构生成一篇可编辑的 SEO Markdown 初稿。生成后仍需要你补充真实案例、图片、数据来源和内链。</p>
          <button id="generateArticle" class="primary-action compact-action" type="button"><span aria-hidden="true">→</span>生成完整文章</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="brief-block">
      <div class="content-card serp-hero">
        <h3>文章初稿：${escapeHtml(currentArticle.keyword)}</h3>
        <p>模型：${escapeHtml(currentArticle.model || "OpenAI")}。请人工核实案例、价格、数据和事实后再发布。</p>
        <div class="toolbar-actions article-actions">
          <button id="copyArticle" class="ghost-button" type="button"><span aria-hidden="true">⧉</span>复制文章</button>
          <button id="downloadArticle" class="ghost-button" type="button"><span aria-hidden="true">↓</span>下载 Markdown</button>
          <button id="generateArticle" class="ghost-button" type="button"><span aria-hidden="true">↻</span>重新生成</button>
        </div>
      </div>
      <textarea id="articleEditor" class="article-preview article-editor" spellcheck="false">${escapeHtml(currentArticle.article)}</textarea>
    </div>
  `;
}

function renderAeo(plan) {
  return `
    <div class="section-grid">
      <div class="content-card">
        <h3>FAQ 问题库</h3>
        <ul class="brief-list">${plan.faq.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
      <div class="content-card">
        <h3>AEO/GEO 写法检查</h3>
        <ul class="brief-list">
          <li>标题下面第一段直接给结论，避免长铺垫。</li>
          <li>每个 H2 下面先回答问题，再展开解释。</li>
          <li>流程用步骤，判断标准用表格，价格/成本用区间和影响因素。</li>
          <li>加入作者、更新时间、案例、经验判断和可验证来源。</li>
          <li>在品牌介绍、作者页、社媒和第三方平台保持一致的实体信息。</li>
          <li>用 FAQ 覆盖真实用户问题，但不要为了 Schema 堆重复问答。</li>
        </ul>
      </div>
    </div>
  `;
}

function renderEeat(plan) {
  const identityRows = plan.eeat.identity.map(item => [
    escapeHtml(item.item),
    badge(item.status === "已输入" ? "高" : "中"),
    escapeHtml(item.recommendation)
  ]);
  return `
    <div class="brief-block">
      <div class="content-card"><h3>品牌和作者可信度</h3>${renderTable(["项目", "状态", "建议"], identityRows)}</div>
      <div class="section-grid">
        <div class="content-card">
          <h3>E-E-A-T 检查清单</h3>
          <ul class="brief-list">${plan.eeat.checklist.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </div>
        <div class="content-card">
          <h3>GEO 品牌实体动作</h3>
          <ul class="brief-list">${plan.eeat.geoActions.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </div>
      </div>
    </div>
  `;
}

function renderSchema(plan) {
  const rows = plan.schema.map(item => [
    escapeHtml(item.name),
    badge(item.level === "必须" ? "高" : item.level === "建议" ? "中" : "低"),
    escapeHtml(item.use)
  ]);
  const sample = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: plan.brief.h1,
    description: plan.brief.metaDescription,
    author: { "@type": "Person", name: plan.input.authorName },
    publisher: { "@type": "Organization", name: plan.input.brandName, url: plan.input.websiteUrl || undefined },
    datePublished: "2026-05-30",
    dateModified: "2026-05-30"
  };
  return `
    <div class="brief-block">
      <div class="content-card"><h3>结构化数据建议</h3>${renderTable(["Schema", "优先级", "用途"], rows)}</div>
      <pre class="code-panel">${escapeHtml(JSON.stringify(sample, null, 2))}</pre>
    </div>
  `;
}

function renderLinks(plan) {
  const rows = plan.links.hubToSpoke.map(item => [
    escapeHtml(item.hub),
    escapeHtml(item.spokes.join(" / "))
  ]);
  return `
    <div class="brief-block">
      <div class="content-card"><h3>Hub -> Spoke</h3>${renderTable(["Hub 页面", "建议链接的 Spoke"], rows)}</div>
      <div class="section-grid">
        <div class="content-card">
          <h3>Spoke -> Hub</h3>
          <ul class="brief-list">${plan.links.spokeToHub.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </div>
        <div class="content-card">
          <h3>Spoke 之间互链</h3>
          <ul class="brief-list">${plan.links.crossLinks.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </div>
      </div>
    </div>
  `;
}

function renderCalendar(plan) {
  const rows = plan.calendar.weeks.map(item => [
    escapeHtml(item.week),
    escapeHtml(item.phase),
    escapeHtml(item.articleA),
    escapeHtml(item.articleB),
    escapeHtml(item.hubFocus),
    escapeHtml(item.action)
  ]);
  const coverageRows = plan.calendar.hubCoverage.map(item => [
    escapeHtml(item.hub),
    escapeHtml(item.role),
    String(item.target),
    escapeHtml(item.firstMonth || "后续补充")
  ]);
  return `
    <div class="brief-block">
      <div class="grid-cards">
        <div class="metric-card"><span>建议节奏</span><strong>${escapeHtml(plan.calendar.cadence)}</strong></div>
        <div class="metric-card"><span>规划周期</span><strong>${plan.calendar.recommendedWeeks} 周</strong></div>
        <div class="metric-card"><span>周发布量</span><strong>${plan.calendar.weeklyOutput} 篇</strong></div>
      </div>
      <div class="content-card">
        <h3>News Website Bonus 目标</h3>
        <p>${escapeHtml(plan.calendar.goal)}</p>
      </div>
      <div class="section-grid">
        <div class="content-card">
          <h3>执行规则</h3>
          <ul class="brief-list">${plan.calendar.rules.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </div>
        <div class="content-card">
          <h3>团队分工</h3>
          <ul class="brief-list">${plan.calendar.team.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </div>
      </div>
      <div class="content-card"><h3>Hub 覆盖计划</h3>${renderTable(["Hub", "角色", "候选 Spoke 数", "首月优先覆盖"], coverageRows)}</div>
      <div class="content-card"><h3>4-6 个月发布日历</h3>${renderTable(["周次", "阶段", "文章 A", "文章 B", "Hub 重点", "执行重点"], rows)}</div>
    </div>
  `;
}

function renderAssets(plan) {
  const rows = plan.assets.map(item => [
    escapeHtml(item.keyword),
    escapeHtml(item.hub),
    escapeHtml(item.pageType),
    escapeHtml(item.status),
    escapeHtml(item.owner),
    escapeHtml(item.publishWindow),
    escapeHtml(item.updateFrequency),
    escapeHtml(item.conversion),
    escapeHtml(item.updateTrigger)
  ]);
  return `
    <div class="content-card">
      <h3>内容资产库</h3>
      <p>这不是只用来“发新文章”的表，而是后续维护、更新、合并和转化优化的运营底表。</p>
      ${renderTable(["关键词", "Hub", "页面类型", "状态", "负责人", "发布时间", "更新频率", "CTA", "更新触发器"], rows)}
    </div>
  `;
}

function renderScore(plan) {
  const rows = plan.quality.scores.map(item => [
    escapeHtml(item.name),
    `<div class="score-bar" aria-label="${escapeHtml(item.name)} ${item.score}分"><span style="width: ${item.score}%"></span><strong>${item.score}</strong></div>`,
    escapeHtml(item.reason)
  ]);
  return `
    <div class="brief-block">
      <div class="grid-cards">
        <div class="metric-card"><span>综合评分</span><strong>${plan.quality.average}/100</strong></div>
        <div class="metric-card"><span>品牌</span><strong>${escapeHtml(plan.input.brandName)}</strong></div>
        <div class="metric-card"><span>核心 CTA</span><strong>${escapeHtml(plan.input.coreOffer)}</strong></div>
      </div>
      <div class="content-card"><h3>质量评分</h3>${renderTable(["维度", "分数", "原因"], rows)}</div>
      <div class="content-card">
        <h3>优先修复</h3>
        <ul class="brief-list">${plan.quality.fixes.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
    </div>
  `;
}

function renderWorkflow(plan) {
  const exportRows = plan.workflow.exports.map(item => [
    escapeHtml(item.name),
    escapeHtml(item.status),
    escapeHtml(item.note)
  ]);
  return `
    <div class="brief-block">
      <div class="content-card"><h3>导出和集成</h3>${renderTable(["工作流", "状态", "说明"], exportRows)}</div>
      <div class="section-grid">
        <div class="content-card">
          <h3>生产流程</h3>
          <ol class="brief-list">${plan.workflow.productionFlow.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
        </div>
        <div class="content-card">
          <h3>推荐内容表字段</h3>
          <ul class="brief-list">${plan.workflow.requiredFields.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </div>
      </div>
    </div>
  `;
}

function renderProjects(plan) {
  const rows = savedProjects.map((project, index) => [
    escapeHtml(project.clientName),
    escapeHtml(project.keyword),
    escapeHtml(project.market),
    escapeHtml(project.businessType),
    escapeHtml(project.status),
    escapeHtml(project.createdAt),
    `<div class="inline-actions"><button class="inline-action" type="button" data-load-project="${index}">载入</button><button class="inline-action danger" type="button" data-delete-project="${index}">删除</button></div>`
  ]);
  return `
    <div class="brief-block">
      <div class="content-card serp-hero">
        <h3>客户项目框架</h3>
        <p>把当前输入保存成一个客户项目，后续可以围绕不同客户反复生成内容地图、落地页、审计和报告。</p>
        <button id="saveProject" class="primary-action compact-action" type="button"><span aria-hidden="true">＋</span>保存当前项目</button>
      </div>
      <div class="content-card">
        <h3>已保存项目</h3>
        ${rows.length ? renderTable(["客户/品牌", "核心词", "市场", "业务类型", "状态", "创建时间", "操作"], rows) : "<p>还没有保存项目。先在左侧填好客户信息，再点击保存当前项目。</p>"}
      </div>
    </div>
  `;
}

function renderLanding(plan) {
  const landing = buildLandingPage(plan);
  const sectionRows = landing.sections.map(item => [
    escapeHtml(item.section),
    escapeHtml(item.goal),
    escapeHtml(item.content)
  ]);
  return `
    <div class="brief-block">
      <div class="grid-cards">
        <div class="metric-card"><span>页面标题</span><strong>${escapeHtml(landing.title)}</strong></div>
        <div class="metric-card"><span>建议 URL</span><strong>${escapeHtml(landing.url)}</strong></div>
        <div class="metric-card"><span>主 CTA</span><strong>${escapeHtml(plan.input.coreOffer)}</strong></div>
      </div>
      <div class="content-card"><h3>Landing Page 结构</h3>${renderTable(["模块", "作用", "内容建议"], sectionRows)}</div>
      <div class="section-grid">
        <div class="content-card"><h3>建议 Schema</h3><ul class="brief-list">${landing.schema.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
        <div class="content-card"><h3>需要素材</h3><ul class="brief-list">${landing.assets.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
      </div>
    </div>
  `;
}

function renderAudit(plan) {
  const rows = buildAuditFramework(plan).map(item => [
    escapeHtml(item.category),
    escapeHtml(item.item),
    badge(item.priority),
    escapeHtml(item.evidence),
    escapeHtml(item.output)
  ]);
  return `
    <div class="brief-block">
      <div class="content-card serp-hero">
        <h3>SEO/GEO/AEO 网站审计框架</h3>
        <p>这是给客户做建站或推广前的基础审计清单。当前版本是手动审计框架，后续可接 PageSpeed、GSC、爬虫和站点扫描。</p>
      </div>
      <div class="content-card">${renderTable(["分类", "检查项", "优先级", "证据来源", "交付物"], rows)}</div>
    </div>
  `;
}

function renderGap(plan) {
  const rows = buildGapFramework(plan).map(item => [
    escapeHtml(item.dimension),
    escapeHtml(item.check),
    escapeHtml(item.action)
  ]);
  return `
    <div class="brief-block">
      <div class="content-card serp-hero">
        <h3>竞品内容差距框架</h3>
        <p>先用 SERP 找到前 10 竞品，再用这张表逐项对比。后续可以升级成输入竞品 URL 后自动抓取 H2、FAQ、Schema。</p>
      </div>
      <div class="content-card">${renderTable(["维度", "检查问题", "你的动作"], rows)}</div>
    </div>
  `;
}

function renderReport(plan) {
  const report = buildClientReport(plan);
  const markdown = [
    `# ${report.title}`,
    "",
    "## 摘要",
    ...report.sections.map(item => `- ${item}`),
    "",
    "## 建议追踪指标",
    ...report.metrics.map(item => `- ${item}`)
  ].join("\n");
  return `
    <div class="brief-block">
      <div class="content-card serp-hero">
        <h3>客户报告模板</h3>
        <p>适合月度汇报、项目启动报告或阶段复盘。可以先复制给客户，后续再接 GSC 数据自动填指标。</p>
        <button id="copyReport" class="ghost-button" type="button"><span aria-hidden="true">⧉</span>复制报告</button>
      </div>
      <pre class="article-preview">${escapeHtml(markdown)}</pre>
    </div>
  `;
}

function renderPlan() {
  if (!currentPlan) {
    tabContent.innerHTML = `<div class="empty-state">输入核心词后生成内容规划</div>`;
    return;
  }

  resultTitle.textContent = `${currentPlan.input.keyword} 内容规划`;

  const views = {
    hubs: renderHubs,
    spokes: renderSpokes,
    priority: renderPriority,
    serp: renderSerp,
    expansion: renderExpansion,
    dataIntent: renderDataIntent,
    brief: renderBrief,
    article: renderArticle,
    aeo: renderAeo,
    eeat: renderEeat,
    schema: renderSchema,
    links: renderLinks,
    calendar: renderCalendar,
    assets: renderAssets,
    score: renderScore,
    workflow: renderWorkflow,
    projects: renderProjects,
    landing: renderLanding,
    audit: renderAudit,
    gap: renderGap,
    report: renderReport
  };

  tabContent.innerHTML = (views[activeTab] || renderHubs)(currentPlan);
  const runButton = document.querySelector("#runSerpAnalysis");
  if (runButton) {
    runButton.addEventListener("click", runSerpAnalysis);
  }
  const expansionButton = document.querySelector("#runExpansion");
  if (expansionButton) {
    expansionButton.addEventListener("click", runExpansion);
  }
  document.querySelectorAll("[data-brief-keyword]").forEach(button => {
    button.addEventListener("click", () => selectBrief(button.dataset.briefKeyword));
  });
  const generateArticleButton = document.querySelector("#generateArticle");
  if (generateArticleButton) {
    generateArticleButton.addEventListener("click", generateArticle);
  }
  const copyArticleButton = document.querySelector("#copyArticle");
  if (copyArticleButton) {
    copyArticleButton.addEventListener("click", async () => {
      if (!currentArticle?.article) return;
      const editor = document.querySelector("#articleEditor");
      const articleText = editor?.value || currentArticle.article;
      currentArticle.article = articleText;
      const copied = await copyText(articleText);
      showToast(copied ? "文章已复制" : "当前浏览器禁止自动复制", copied ? "success" : "warning");
    });
  }
  const downloadArticleButton = document.querySelector("#downloadArticle");
  if (downloadArticleButton) {
    downloadArticleButton.addEventListener("click", () => {
      if (!currentArticle?.article) return;
      const editor = document.querySelector("#articleEditor");
      const articleText = editor?.value || currentArticle.article;
      currentArticle.article = articleText;
      downloadFile(`${currentArticle.keyword}-article.md`, articleText, "text/markdown;charset=utf-8");
      showToast("Markdown 已生成，浏览器会开始下载");
    });
  }
  const saveProjectButton = document.querySelector("#saveProject");
  if (saveProjectButton) {
    saveProjectButton.addEventListener("click", saveCurrentProject);
  }
  document.querySelectorAll("[data-load-project]").forEach(button => {
    button.addEventListener("click", () => loadProject(Number(button.dataset.loadProject)));
  });
  document.querySelectorAll("[data-delete-project]").forEach(button => {
    button.addEventListener("click", () => deleteProject(Number(button.dataset.deleteProject)));
  });
  document.querySelectorAll("[data-add-spoke]").forEach(button => {
    button.addEventListener("click", () => addKeywordToSpokes(button.dataset.addSpoke));
  });
  const copyReportButton = document.querySelector("#copyReport");
  if (copyReportButton) {
    copyReportButton.addEventListener("click", async () => {
      const report = buildClientReport(currentPlan);
      const markdown = [
        `# ${report.title}`,
        "",
        "## 摘要",
        ...report.sections.map(item => `- ${item}`),
        "",
        "## 建议追踪指标",
        ...report.metrics.map(item => `- ${item}`)
      ].join("\n");
      const copied = await copyText(markdown);
      showToast(copied ? "客户报告已复制" : "当前浏览器禁止自动复制", copied ? "success" : "warning");
    });
  }
}

function saveCurrentProject() {
  if (!currentPlan) return;
  const project = {
    ...currentPlan.input,
    clientName: currentPlan.input.brandName,
    status: "策略规划中",
    createdAt: new Date().toLocaleDateString("zh-CN")
  };
  savedProjects = [
    project,
    ...savedProjects.filter(item => !(item.clientName === project.clientName && item.keyword === project.keyword))
  ].slice(0, 20);
  saveProjects();
  showToast("客户项目已保存到本地");
  renderPlan();
}

function loadProject(index) {
  const project = savedProjects[index];
  if (!project) return;
  Object.entries(project).forEach(([key, value]) => {
    const element = form.elements.namedItem(key);
    if (!element || value === undefined || value === null) return;
    if (key === "depth") {
      const radio = form.querySelector(`input[name="depth"][value="${CSS.escape(value)}"]`);
      if (radio) radio.checked = true;
    } else if ("value" in element) {
      element.value = value;
    }
  });
  selectedBriefKeyword = null;
  currentPlan = buildPlan(getFormData());
  activeTab = "hubs";
  tabs.forEach(item => item.classList.toggle("is-active", item.dataset.tab === activeTab));
  showToast("项目已载入");
  renderPlan();
}

function deleteProject(index) {
  const project = savedProjects[index];
  if (!project) return;
  const confirmed = window.confirm(`确定删除项目「${project.clientName} / ${project.keyword}」吗？`);
  if (!confirmed) return;
  savedProjects = savedProjects.filter((_, itemIndex) => itemIndex !== index);
  saveProjects();
  showToast("客户项目已删除");
  renderPlan();
}

async function runSerpAnalysis() {
  if (!currentPlan || serpState === "loading") return;
  serpState = "loading";
  serpMessage = "";
  renderPlan();

  const params = new URLSearchParams({
    q: currentPlan.input.keyword,
    market: currentPlan.input.market
  });

  try {
    const response = await fetch(`/api/serp?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.setup || data.error || "SERP request failed.");
    }
    currentSerp = data;
    serpState = "ready";
  } catch (error) {
    currentSerp = null;
    serpState = "error";
    serpMessage = error.message;
  }

  renderPlan();
}

async function runExpansion() {
  if (!currentPlan || expansionState === "loading") return;
  expansionState = "loading";
  expansionMessage = "";
  renderPlan();

  const params = new URLSearchParams({
    q: currentPlan.input.keyword,
    market: currentPlan.input.market
  });

  try {
    const response = await fetch(`/api/expand?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.setup || data.error || "Autocomplete request failed.");
    }
    currentExpansion = data;
    expansionState = "ready";
  } catch (error) {
    currentExpansion = null;
    expansionState = "error";
    expansionMessage = error.message;
  }

  renderPlan();
}

async function generateArticle() {
  if (!currentPlan || articleState === "loading") return;
  articleState = "loading";
  articleMessage = "";
  activeTab = "article";
  tabs.forEach(item => item.classList.toggle("is-active", item.dataset.tab === activeTab));
  renderPlan();

  try {
    const response = await fetch("/api/generate-article", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: currentPlan.input,
        brief: currentPlan.brief,
        faq: currentPlan.faq,
        serp: currentSerp,
        expansion: currentExpansion,
        options: {
          length: currentPlan.input.depth === "深度版" ? "deep" : currentPlan.input.depth === "简版" ? "short" : "standard"
        }
      })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.setup || data.error || "Article generation failed.");
    }
    currentArticle = {
      keyword: currentPlan.brief.targetKeyword,
      article: data.article,
      model: data.model,
      usage: data.usage
    };
    articleState = "ready";
  } catch (error) {
    currentArticle = null;
    articleState = "error";
    articleMessage = error.message;
  }

  renderPlan();
}

function toMarkdown(plan) {
  const lines = [];
  lines.push(`# ${plan.input.keyword} SEO/AEO/GEO 内容规划`);
  lines.push("");
  lines.push(`- 目标市场：${plan.input.market}`);
  lines.push(`- 目标用户：${plan.input.audience}`);
  lines.push(`- 业务类型：${plan.input.businessType}`);
  lines.push(`- 变现方式：${plan.input.monetization}`);
  lines.push(`- 品牌名：${plan.input.brandName}`);
  lines.push(`- 作者/专家：${plan.input.authorName}`);
  lines.push(`- 核心 CTA：${plan.input.coreOffer}`);
  lines.push("");
  lines.push("## 数据/意图");
  plan.dataIntent.keywordData.forEach(item => lines.push(`- ${item.metric}：${item.value}，${item.note}`));
  lines.push("");
  lines.push("## Hub 规划");
  plan.hubs.forEach(hub => {
    lines.push(`- ${hub.name}：${hub.url}，${hub.intent}，${hub.reason}`);
  });
  lines.push("");
  lines.push("## Spoke 内容地图");
  lines.push("| Hub | Spoke | 搜索意图 | 页面类型 | 商业价值 | 优先级 | CTA |");
  lines.push("|---|---|---|---|---|---|---|");
  plan.spokes.forEach(item => {
    lines.push(`| ${item.hub} | ${item.keyword} | ${item.intent} | ${item.pageType} | ${item.businessValue} | ${item.priority} | ${item.cta} |`);
  });
  lines.push("");
  lines.push("## 第一批优先内容");
  plan.priority.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.keyword} - ${item.pageType} - ${item.cta}`);
  });
  lines.push("");
  lines.push("## 单篇页面结构");
  lines.push(`- H1：${plan.brief.h1}`);
  lines.push(`- Meta Title：${plan.brief.metaTitle}`);
  lines.push(`- Meta Description：${plan.brief.metaDescription}`);
  lines.push(`- AEO 摘要：${plan.brief.summary}`);
  lines.push(`- 建议字数：${plan.brief.wordCount}`);
  lines.push(`- 次级关键词：${plan.brief.secondaryKeywords.join(" / ")}`);
  lines.push(`- 必须覆盖实体：${plan.brief.requiredEntities.join(" / ")}`);
  plan.brief.outline.forEach(item => lines.push(`- ${item}`));
  lines.push("");
  lines.push("## FAQ");
  plan.faq.forEach(item => lines.push(`- ${item}`));
  lines.push("");
  lines.push("## Schema");
  plan.schema.forEach(item => lines.push(`- ${item.name}：${item.level}，${item.use}`));
  lines.push("");
  lines.push("## E-E-A-T");
  plan.eeat.checklist.forEach(item => lines.push(`- ${item}`));
  lines.push("");
  lines.push("## 内容资产库");
  lines.push("| 关键词 | Hub | 页面类型 | 状态 | 更新频率 | CTA |");
  lines.push("|---|---|---|---|---|---|");
  plan.assets.forEach(item => lines.push(`| ${item.keyword} | ${item.hub} | ${item.pageType} | ${item.status} | ${item.updateFrequency} | ${item.conversion} |`));
  lines.push("");
  lines.push("## 质量评分");
  lines.push(`- 综合评分：${plan.quality.average}/100`);
  plan.quality.scores.forEach(item => lines.push(`- ${item.name}：${item.score}/100，${item.reason}`));
  lines.push("");
  lines.push("## News Website Bonus 发布节奏");
  lines.push(`- 建议节奏：${plan.calendar.cadence}`);
  lines.push(`- 规划周期：${plan.calendar.recommendedWeeks} 周`);
  lines.push(`- 目标：${plan.calendar.goal}`);
  lines.push("");
  lines.push("| 周次 | 阶段 | 文章 A | 文章 B | Hub 重点 |");
  lines.push("|---|---|---|---|---|");
  plan.calendar.weeks.forEach(item => {
    lines.push(`| ${item.week} | ${item.phase} | ${item.articleA} | ${item.articleB} | ${item.hubFocus} |`);
  });
  return lines.join("\n");
}

function toCsv(plan) {
  const headers = ["Hub", "Spoke", "Intent", "Page Type", "Business Value", "Priority", "CTA"];
  const rows = plan.spokes.map(item => [item.hub, item.keyword, item.intent, item.pageType, item.businessValue, item.priority, item.cta]);
  return [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function downloadFile(filename, content, type) {
  const link = document.createElement("a");
  const safeContent = type.includes("csv") ? `\uFEFF${content}` : content;
  try {
    const blob = new Blob([safeContent], { type });
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    const dataUrl = `data:${type},${encodeURIComponent(safeContent)}`;
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  }
}

function showToast(message, tone = "success") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast ${tone}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("is-visible"));
  setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 180);
  }, 2400);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the textarea fallback for embedded browsers.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  const ok = document.execCommand("copy");
  textarea.remove();
  return ok;
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const input = getFormData();
  if (!input.keyword) return;
  selectedBriefKeyword = null;
  currentPlan = buildPlan(input);
  currentSerp = null;
  serpState = "idle";
  serpMessage = "";
  currentExpansion = null;
  expansionState = "idle";
  expansionMessage = "";
  currentArticle = null;
  articleState = "idle";
  articleMessage = "";
  localStorage.setItem("lastSeoPlan", JSON.stringify(currentPlan.input));
  renderPlan();
});

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    activeTab = tab.dataset.tab;
    tabs.forEach(item => item.classList.toggle("is-active", item === tab));
    renderPlan();
  });
});

copyButton.addEventListener("click", async () => {
  if (!currentPlan) {
    showToast("请先生成规划", "warning");
    return;
  }

  const copied = await copyText(toMarkdown(currentPlan));
  if (copied) {
    copyButton.textContent = "已复制";
    showToast("Markdown 已复制，可以粘贴到文档里");
    setTimeout(() => {
      copyButton.innerHTML = `<span aria-hidden="true">⧉</span>复制 Markdown`;
    }, 1400);
  } else {
    showToast("当前浏览器禁止自动复制，请换浏览器或手动选择内容", "warning");
  }
});

csvButton.addEventListener("click", () => {
  if (!currentPlan) {
    showToast("请先生成规划", "warning");
    return;
  }

  downloadFile(`${currentPlan.input.keyword}-content-plan.csv`, toCsv(currentPlan), "text/csv;charset=utf-8");
  showToast("CSV 已生成，浏览器会开始下载");
});

function restoreLastInput() {
  const saved = localStorage.getItem("lastSeoPlan");
  if (!saved) return;
  try {
    const input = JSON.parse(saved);
    Object.entries(input).forEach(([key, value]) => {
      const element = form.elements.namedItem(key);
      if (!element) return;
      if (key === "depth") {
        const radio = form.querySelector(`input[name="depth"][value="${CSS.escape(value)}"]`);
        if (radio) radio.checked = true;
      } else {
        element.value = value;
      }
    });
  } catch {
    localStorage.removeItem("lastSeoPlan");
  }
}

restoreLastInput();
currentPlan = buildPlan(getFormData());
renderPlan();
