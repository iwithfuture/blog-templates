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

当前版本的策略规划使用规则模板生成。SERP 分析通过 Vercel Serverless Function 调用 SerpApi；搜索量、竞争度、CPC 支持手填，后续可接 DataForSEO、Ahrefs、Semrush 或 Google Keyword Planner。

## SERP 分析

项目包含 Vercel Serverless Function：`/api/serp`。

要启用真实 SERP 数据，需要在 Vercel 项目环境变量中添加：

```text
SERPAPI_KEY=你的 SerpApi API Key
```

添加后重新部署，即可在前端 `SERP` Tab 中拉取 Google 前 10、People Also Ask 和相关搜索。
