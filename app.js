const form = document.querySelector("#plannerForm");
const tabContent = document.querySelector("#tabContent");
const resultTitle = document.querySelector("#resultTitle");
const copyButton = document.querySelector("#copyMarkdown");
const csvButton = document.querySelector("#downloadCsv");
const tabs = Array.from(document.querySelectorAll(".tab"));

let activeTab = "hubs";
let currentPlan = null;

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

function getFormData() {
  const data = new FormData(form);
  return {
    keyword: String(data.get("keyword") || "").trim(),
    market: String(data.get("market") || "中文市场"),
    stage: String(data.get("stage") || "新站"),
    audience: String(data.get("audience") || "").trim() || "目标用户",
    businessType: String(data.get("businessType") || "服务"),
    monetization: String(data.get("monetization") || "询盘"),
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

function buildBrief(input, priority) {
  const focus = priority[0];
  const k = input.keyword;
  const title = focus.keyword;
  const problemLine = `${title}的核心不是只追求数量或表面动作，而是先确认目标、质量标准、执行流程和转化承接。`;

  return {
    targetKeyword: title,
    h1: `${title}：适合${input.audience}的完整方法和避坑指南`,
    metaTitle: `${title}｜流程、标准、费用与常见问题`,
    metaDescription: `本文围绕${title}，说明适合人群、执行流程、判断标准、常见错误、案例和FAQ，帮助${input.audience}制定可落地的${k}计划。`,
    summary: `${problemLine} 如果你想通过${k}获得稳定的 Google 流量，需要把关键词意图、页面类型、内容质量、内链和持续更新放在同一套计划里。`,
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
    caseIdea: `用一个匿名案例说明${input.audience}在做${k}时遇到的问题、调整动作和结果。没有真实数字时只写过程，不编造数据。`
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

function buildPlan(input) {
  const hubs = buildHubs(input);
  const spokes = buildSpokes(input, hubs);
  const priority = rankSpokes(spokes);
  const brief = buildBrief(input, priority);
  const faq = buildFaq(input, brief);
  const schema = buildSchema(input, brief);
  const links = buildLinks(hubs, spokes, priority);
  const calendar = buildPublishingCalendar(input, hubs, spokes, priority);
  return { input, hubs, spokes, priority, brief, faq, schema, links, calendar };
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
    escapeHtml(item.cta)
  ]);
  return `<div class="content-card"><h3>Spoke 内容地图</h3>${renderTable(["Hub", "Spoke", "搜索意图", "页面类型", "商业价值", "优先级", "CTA"], rows)}</div>`;
}

function renderPriority(plan) {
  const rows = plan.priority.map((item, index) => [
    String(index + 1),
    escapeHtml(item.keyword),
    escapeHtml(item.hub),
    escapeHtml(item.intent),
    escapeHtml(item.pageType),
    badge(item.businessValue),
    escapeHtml(item.cta)
  ]);
  return `<div class="content-card"><h3>第一批优先内容</h3><p>这批内容优先考虑商业价值、痛点强度、可转化性和主题权威，不等同于真实搜索量排序。发布前仍建议用 Keyword Planner、Ahrefs、SEMrush 或 Search Console 校准。</p>${renderTable(["顺序", "关键词/标题", "Hub", "搜索意图", "页面类型", "商业价值", "CTA"], rows)}</div>`;
}

function renderBrief(plan) {
  const brief = plan.brief;
  return `
    <div class="brief-block">
      <div class="content-card">
        <h3>单篇页面结构：${escapeHtml(brief.targetKeyword)}</h3>
        <p><strong>H1：</strong>${escapeHtml(brief.h1)}</p>
        <p><strong>Meta Title：</strong>${escapeHtml(brief.metaTitle)}</p>
        <p><strong>Meta Description：</strong>${escapeHtml(brief.metaDescription)}</p>
        <p><strong>AEO 开头摘要：</strong>${escapeHtml(brief.summary)}</p>
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
    author: { "@type": "Person", name: "作者名" },
    publisher: { "@type": "Organization", name: "你的品牌名" },
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
    brief: renderBrief,
    aeo: renderAeo,
    schema: renderSchema,
    links: renderLinks,
    calendar: renderCalendar
  };

  tabContent.innerHTML = views[activeTab](currentPlan);
}

function toMarkdown(plan) {
  const lines = [];
  lines.push(`# ${plan.input.keyword} SEO/AEO/GEO 内容规划`);
  lines.push("");
  lines.push(`- 目标市场：${plan.input.market}`);
  lines.push(`- 目标用户：${plan.input.audience}`);
  lines.push(`- 业务类型：${plan.input.businessType}`);
  lines.push(`- 变现方式：${plan.input.monetization}`);
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
  plan.brief.outline.forEach(item => lines.push(`- ${item}`));
  lines.push("");
  lines.push("## FAQ");
  plan.faq.forEach(item => lines.push(`- ${item}`));
  lines.push("");
  lines.push("## Schema");
  plan.schema.forEach(item => lines.push(`- ${item.name}：${item.level}，${item.use}`));
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
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const input = getFormData();
  if (!input.keyword) return;
  currentPlan = buildPlan(input);
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
  if (!currentPlan) return;
  await navigator.clipboard.writeText(toMarkdown(currentPlan));
  copyButton.textContent = "已复制";
  setTimeout(() => {
    copyButton.textContent = "复制 Markdown";
  }, 1400);
});

csvButton.addEventListener("click", () => {
  if (!currentPlan) return;
  downloadFile(`${currentPlan.input.keyword}-content-plan.csv`, toCsv(currentPlan), "text/csv;charset=utf-8");
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
