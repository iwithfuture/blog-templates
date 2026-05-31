# SEO/AEO/GEO 内容规划工具

这是一个纯前端 MVP。打开 `index.html` 后，输入核心词和业务信息，即可生成：

- Hub 规划
- Spoke 内容地图
- 第一批优先内容
- 单篇文章结构
- FAQ/AEO/GEO 建议
- Schema 建议
- Hub-Spoke 内链方案
- Markdown 复制和 CSV 下载
- SERP 分析（需要 `SERPAPI_KEY`）
- 关键词数据/搜索意图校准
- 深度内容 Brief
- E-E-A-T / GEO 可信度检查
- 内容资产库和更新频率
- 内容质量评分
- 工作流导出建议
- OpenAI 文章初稿生成（需要 `OPENAI_API_KEY`）
- 客户项目本地保存
- Landing Page 结构生成
- SEO/GEO/AEO 网站审计框架
- 多竞品 URL 抓取、手动粘贴兜底与内容差距分析
- 客户报告模板
- OpenAI 文章生成配置状态检测

当前版本的策略规划使用规则模板生成。SERP 分析通过 Vercel Serverless Function 调用 SerpApi；搜索量、竞争度、CPC 支持手填，后续可接 DataForSEO、Ahrefs、Semrush 或 Google Keyword Planner。

## SERP 分析

项目包含 Vercel Serverless Function：`/api/serp`。

要启用真实 SERP 数据，需要在 Vercel 项目环境变量中添加：

```text
SERPAPI_KEY=你的 SerpApi API Key
```

添加后重新部署，即可在前端 `SERP` Tab 中拉取 Google 前 10、People Also Ask 和相关搜索。

## 竞品 URL 分析

项目包含 Vercel Serverless Function：`/api/competitor`。

在 `竞品差距` Tab 输入 1-5 个竞品页面 URL 后，工具会抓取页面 HTML，并提取 Title、Meta Description、H1-H3、JSON-LD Schema 类型和 FAQPage 问题。若竞品网站屏蔽服务器抓取，或页面内容必须通过浏览器 JavaScript 渲染，可以在手动区粘贴 HTML、正文或 H1/H2/H3 大纲继续分析。

多竞品结果会汇总：

- 重复出现的 H2/H3
- 页面类型分布
- Schema 使用情况
- FAQ 问题汇总
- 抓取失败原因
- 内容差距建议

## 文章生成

要启用完整 SEO 文章初稿生成，需要在 Vercel 项目环境变量中添加：

```text
OPENAI_API_KEY=你的 OpenAI API Key
```

可选指定模型：

```text
OPENAI_MODEL=gpt-5.4-mini
```

添加后重新部署，即可在 `页面结构` 或 `文章初稿` Tab 中生成 Markdown 文章初稿。

项目也包含 `/api/openai-status`，用于在前端显示 OpenAI 是否已经配置。
