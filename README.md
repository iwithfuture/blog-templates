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

当前版本使用规则模板生成，不依赖后端和 API。后续可以把 `app.js` 里的 `buildPlan` 生成逻辑替换为 OpenAI API 或自己的关键词数据库。

## SERP 分析

项目包含 Vercel Serverless Function：`/api/serp`。

要启用真实 SERP 数据，需要在 Vercel 项目环境变量中添加：

```text
SERPAPI_KEY=你的 SerpApi API Key
```

添加后重新部署，即可在前端 `SERP` Tab 中拉取 Google 前 10、People Also Ask 和相关搜索。
