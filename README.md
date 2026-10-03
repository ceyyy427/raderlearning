<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/banner-dark.png">
    <img src="docs/assets/banner-light.png" alt="RaderLearning：把开源项目的变化变成自己的学习路径，从 Release、PR 和 Docs 走向 Change Brief、Learning Task 和 Review Card" width="100%">
  </picture>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-c55a20?style=flat-square" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/Node.js-24-c55a20?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js 24">
  <img src="https://img.shields.io/badge/PostgreSQL-17-c55a20?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL 17">
  <img src="https://img.shields.io/badge/Docker-Compose-c55a20?style=flat-square&logo=docker&logoColor=white" alt="Docker Compose">
  <a href="https://github.com/ceyyy427/raderlearning"><img src="https://img.shields.io/badge/demo-github.com/ceyyy427/raderlearning-202a30?style=flat-square" alt="github.com/ceyyy427/raderlearning"></a>
</p>

<p align="center">
  <b>把开源项目的真实变化，变成可理解、可练习、可复习的学习路径。</b><br>
  从项目雷达开始，到 Change Brief、Learning Task 和 Review Card，形成一条可追溯的学习闭环。
</p>

<p align="center">
  <a href="#跑起来">跑起来</a> ·
  <a href="docs/customize.md">改成你的行业</a> ·
  <a href="#它是怎么工作的">它是怎么工作的</a> ·
  <a href="#文档">文档</a> ·
  <a href="https://github.com/ceyyy427/raderlearning/discussions">社区交流</a>
</p>

<br>

## 这是什么

[RaderLearning](https://github.com/ceyyy427/raderlearning) 是一个面向个人开发者的开源学习工作区。它跟踪 GitHub Release、Issue、Pull Request、官方文档和 Changelog，把项目变化整理成有证据的学习内容：

```text
Project → Change Event → Change Brief → Learning Task → Review Card
```

它关注的不是“再生成一篇摘要”，而是让每条重要变化回答三个问题：发生了什么、为什么需要关心、怎样证明自己理解了。Radar 负责发现变化，Change Brief 解释影响，Learning Task 让读者完成一次安全练习，Review Card 把错误和复习时间留在自己的 Workspace 里。

这个仓库保留了完整的采集、判重、归组、来源快照、公开 API 和 Web 界面。内容必须能回到原始来源，来源冲突会显示为 `disputed`，证据不足时不会生成看似确定的结论。

### 我们坚持的设计

- **来源先于模型。** 模型可以帮助分类和解释，但不能补写来源没有说过的事实；每个 Change Brief 都保留来源链接和证据片段。
- **学习先于消费。** 页面按“变化 → 影响 → 练习 → 复习”组织，而不是让读者停在一段摘要上。
- **本地优先。** 项目和公开变化存放在服务端，个人保存项、任务结果、复习卡和笔记存放在当前浏览器；V0 不需要账号，也不做云端同步。
- **安全边界清晰。** V0 不执行用户代码；读者打开页面不会触发模型调用，模型只在后端任务中运行。

```mermaid
flowchart LR
  P[Project] --> E[Change Event]
  E --> B[Change Brief]
  B --> T[Learning Task]
  T --> R[Review Card]
  R --> W[(Browser Workspace)]
```

<p align="center">
  <img src="docs/assets/design-network.png" alt="RaderLearning 设计网络图：项目变化经过证据、Change Brief、安全练习和本地复习，学习方向与深度由自己决定" width="100%">
</p>

这张图把设计原则放回一条真实的学习路径：你选择项目和目标，RaderLearning 保存可追溯证据，把相关变化归成事件，解释影响，提供不执行代码的练习，再把你的理解留在本地复习里。你用什么、怎么用、愿意回看多深，决定了最后能学到什么。

## 为什么开源

开源是因为每个人关注的项目和学习目标都不一样。你知道哪些信源值得盯、哪些变化会影响自己的系统，也知道哪些概念需要反复练习；RaderLearning 把采集、证据和学习循环交给你配置。

## 说在前面

- **这是一份快照。** 它来自 RaderLearning 正在线上跑的代码，不是精心打磨的通用框架。以后 RaderLearning 的更新，我会尽量同步过来，但没法保证每一次都同步。
- **里面没有 RaderLearning 的运营数据。** 仓库带了公开信源和示范配置，够你跑起来看效果；发布自己的站点前，请在 `industry/` 中确认站名、条款和品牌资源。

## 它是怎么工作的

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/how-dark.png">
  <img src="docs/assets/how-light.png" alt="六步：选择项目、保存来源快照、归组变化、理解 Change Brief、完成安全练习、回到 Review Card" width="100%">
</picture>

一条资料从信源进来，先判重，再保留原始快照；可能重要的变化会被归组为 Change Event，经过证据检查后进入 Radar。读者从 Radar 打开 Change Brief，先看发生了什么和为什么重要，再完成一项不执行代码的 Learning Task，最后由本地 Review Card 安排复习。每一步的提示词都在 [`industry/prompts/`](industry/prompts/)，改标准不用改代码；完整运行方式见 [V0 runbook](docs/open-source-radar-v0-runbook.md)。

### 聚簇与热点

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/cluster-dark.png">
  <img src="docs/assets/cluster-light.png" alt="Release、Pull Request、Changelog 和官方文档归成一个有证据的 Change Event，再进入 Change Brief" width="100%">
</picture>

同一个项目变化可能同时出现在 Release、Pull Request、Changelog 和官方文档里，读者只需要看到一次。RaderLearning 把它们聚成一个**Change Event**：先用标题摘要的向量（没配向量服务时比文字重合度）找候选，再判断是同一变化、后续进展，还是两件事；拿不准的合并会保留不确定性，不会把猜测写成事实。

**重要性**按事件算，不按重复快照算：同一来源的重复抓取不会重复计入，独立来源和变化类型会影响排序。每个事件都保留主来源和支持来源，读者可以从 Change Brief 回到原始证据。

### 本地优先与安全边界

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/perf-dark.png">
  <img src="docs/assets/perf-light.png" alt="RaderLearning 的本地优先设计：来源可追溯、学习记录保存在浏览器、安全练习不执行用户代码" width="100%">
</picture>

项目变化与来源快照由服务端保存，个人保存项、任务结果、复习卡和笔记留在当前浏览器。学习任务只做代码阅读、Diff 判断和迁移选择，不执行任意用户代码；页面阅读也不会触发模型调用。

## 你会得到什么

| | |
|---|---|
| **项目雷达** | 关注 GitHub Release、Issue、Pull Request、官方文档和 Changelog；同一个项目变化只保留一个可追踪的 Change Event |
| **Change Brief** | 用原始来源回答“发生了什么、为什么重要、谁会受影响”；证据不足或来源冲突时明确显示不确定性 |
| **Learning Task** | 从变化中生成代码阅读、Diff 判断或迁移选择练习；只展示安全材料，不执行任意用户代码 |
| **Workspace / Review** | 在当前浏览器保存变化、任务结果、复习卡和纯文本笔记；错误回答会更快进入复习，掌握后延后复习 |
| **来源快照** | 保存来源 URL、内容哈希、抓取时间和状态；失败来源不会被伪装成成功内容 |
| **项目来源** | GitHub Release、Issue、Pull Request、官方文档和 Changelog；适配器保留 URL、发布时间、抓取时间、版本和失败状态 |
| **去重与归组** | 同一个项目变化只保留一个可追踪的 Change Event，支持后续进展、来源冲突和不确定性标记 |
| **重要性排序** | 规则先识别 breaking change、deprecation、security、API change、documentation 和 performance，再结合项目关注关系排序 |
| **公开出口** | Radar、Project 页面、公开 API、RSS、Agent Markdown 和 MCP 共用同一份来源发布读取层 |
| **管理员工作台** | 管理项目与来源、运行同步、查看失败快照和任务日志；页面阅读不会触发模型调用 |
| **运行产物** | 继承的日报、周报、月报出口仍可按配置使用，但核心阅读路径是 Radar → Change Brief → Learning Task → Review Card |

## 你能从中学到什么

RaderLearning 不预设一套所有人都一样的课程。你选择关注什么项目、使用什么工具、打开哪些原始证据、完成哪些练习，决定了你会学到什么。

学习的深度和能力的成长，也取决于你怎样使用它：是只看一眼变化，还是继续读 Change Brief、完成 Learning Task、记录自己的理解，并在 Review 中回来验证。RaderLearning 提供变化、背景、练习和复习的结构，学习的方向、节奏和深度由你自己决定。

> What you learn depends on what you use. How deeply you learn depends on you.

## 看一眼

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/shots-dark.png">
  <img src="docs/assets/shots-light.png" alt="RaderLearning 的 Radar Inbox 与 Learning Workspace 学习闭环" width="100%">
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/board-dark.png">
  <img src="docs/assets/board-light.png" alt="RaderLearning 的个人复习卡与本地笔记" width="100%">
</picture>

<p align="center"><sub>截图来自用示范信源跑起来的本地站，站名是默认的 RaderLearning。</sub></p>

## 跑起来

想创建自己的独立站点，可以先点 [Use this template](https://github.com/ceyyy427/raderlearning/generate)，再克隆你生成的仓库。想持续合并上游更新或贡献代码，建议先 Fork。下面的命令适合直接试用。

需要 [Docker](https://docs.docker.com/get-docker/)，和一个 OpenAI 兼容的模型 API Key（DeepSeek、千问、智谱都可以）。

```bash
git clone https://github.com/ceyyy427/raderlearning.git raderlearning
cd raderlearning
node scripts/init-env.ts --llm-key <你的模型 API Key>
docker compose up -d --build
```

打开 <http://localhost:3000>。后台在 `/admin`，管理员密码在 `.env` 的 `ADMIN_PASSWORD` 里。一两分钟后开始有内容，第一次导入的资料大约半小时处理完。

机器上没有 Node、服务器在中国大陆、要配域名和 HTTPS，见 [部署](docs/deploy.md)。

## 把它改成你的行业

部署后打开 `/agent`，可以复制 Agent Markdown、MCP、RSS 或 API 的接入方式（默认打开 Agent Markdown，MCP 在 `/agent?tab=mcp`）。只支持网页读取的 Agent 从 `/api/v1/agent` 开始，那里列出精选、搜索、热点、事件、日报、周报和月报的 Markdown 地址。结构化数据用 `/api/v1/`，周报与月报在 `/api/v1/weeklies`、`/api/v1/monthlies`，追加 `/latest` 或一期的 ISO 周、月份即可读取；接口契约在 `/openapi-v1.json`。这些出口共同遵循文章撤回与全文许可，站名、链接和分类取自你的行业配置。

最省事的办法：打开你的 Agent（Claude Code、Codex 都可以），把这个仓库交给它，然后说：

```text
请读 AGENTS.md 和 docs/customize.md，把这个站改成「法律」行业的热点站。
我关心的是：……（你想盯哪些信源，你觉得什么消息重要、什么不重要，越具体越好）。
```

要改的东西几乎都在 [`industry/`](industry/) 这一个文件夹里，代码基本不用动：

| 文件 | 改什么 |
|---|---|
| `site.ts` | 站名、行业词、首页文案、关于页 |
| `taxonomy.ts`、`topics.json` | 分类、标签、主题 |
| `chronicle.ts` | 主题页“大事记”的规则；公司的人工历史放 `chronicles/`（可选） |
| `sources.json` | 首次启动时导入的信源 |
| `prompts/` | 精选标准和写作要求。**你的行业 KnowHow，就写在这里** |
| `selection.ts` | 入选门槛 |
| `features.ts` | 模型榜、Codex 重置监控的开关 |
| `brand/`、`pages/` | 图标、使用规则和隐私说明 |

最值得花时间的是评分标准（`prompts/selection-score.md`）和门槛：拿一两百条你自己标注过的资料，用 `scripts/eval-selection.ts` 跑一遍，看它选得准不准，再回去改。怎么做写在 [精选与校准](docs/selection.md) 里。

## 文档

| 文档 | 内容 |
|---|---|
| [把它改成你的行业](docs/customize.md) | 站名、分类、主题与大事记、信源、提示词、门槛、品牌，一步一步来 |
| [信源](docs/sources.md) | 六种信源怎么配，分级和全文，外部推送接口 |
| [精选与校准](docs/selection.md) | 一条资料怎么变成精选、怎么编进日报周报月报，怎么用自己的样本校准 |
| [事件归组与关系评测](docs/grouping.md) | 事件关系怎么判断，怎么用自己的 pairwise gold set 评测 |
| [部署](docs/deploy.md) | Docker、域名和 HTTPS、中国大陆、更新、备份、花多少钱 |
| [架构](docs/architecture.md) | 三个进程、几条不变的规则、目录、对外出口 |
| [模型榜与 Codex 重置监控](docs/leaderboard.md) | 两个 AI 专属模块 |

技术栈：Node.js 24 · TypeScript · React Router（服务端渲染）· Fastify · PostgreSQL · pg-boss · Tailwind CSS · Docker Compose。

## 交流与贡献

部署和使用问题到 [问答区](https://github.com/ceyyy427/raderlearning/discussions/categories/q-a)，新想法到 [想法交流区](https://github.com/ceyyy427/raderlearning/discussions/categories/ideas)，欢迎在 [作品展示区](https://github.com/ceyyy427/raderlearning/discussions/categories/show-and-tell) 分享你做出的行业热点站。

发现 Bug 或有明确的功能建议，可以 [提交 Issue](https://github.com/ceyyy427/raderlearning/issues/new/choose)。准备改代码前，先看 [贡献说明](CONTRIBUTING.md)；安全漏洞请走 [私密报告入口](SECURITY.md)。

## 许可

代码使用 [MIT 许可证](LICENSE)。品牌资产和第三方标志各有自己的许可和商标归属。字体、模型厂商和评测来源的标志各有自己的许可和商标归属，见 [NOTICE](NOTICE)。

---

<sub>**In English:** RaderLearning ([github.com/ceyyy427/raderlearning](https://github.com/ceyyy427/raderlearning)) is a local-first learning workspace for individual developers. It tracks open-source project changes, keeps source-backed snapshots, groups them into Change Events, and turns important changes into Change Briefs, safe Learning Tasks, and browser-local Review Cards. Evidence stays linked to the original source, disputed or failed evidence remains visibly uncertain, and V0 executes no arbitrary user code or cloud sync. Use `AGENTS.md`, `docs/customize.md`, and the V0 runbook to adapt the workspace to your own projects and learning goals.</sub>
