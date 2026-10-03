# Open Source Radar + Learning Workspace 设计规格

## 1. 产品定位

这是一个面向个人开发者的软件，把开源项目的真实变化转化为可理解、可练习、可复习的学习内容。

```text
Project → Change Event → Change Brief → Learning Task → Review Card
```

它不是 GitHub 阅读器，也不是普通 AI 摘要工具。每条重要变化必须回答：发生了什么、为什么需要关心、怎样证明自己理解了。

## 2. V0 范围

### 必须包含

- 添加和管理 GitHub 项目
- Release、Issue、Pull Request 同步
- 官方文档和 Changelog 接入
- 去重、变化分类和事件聚类
- Radar Inbox
- Project 页面
- Change Brief
- Evidence 面板
- Before / After 代码示例
- 代码阅读、Diff 判断或迁移选择题
- Learning Workspace
- 本地学习状态、笔记和复习卡
- 失败状态、来源冲突和不确定性标记

### 明确排除

- 团队协作和共享空间
- 自动提交 PR 或自动修改用户代码
- 全功能 IDE
- 社区、私信和排行榜
- 全网搜索
- 账号、云端同步和付费系统
- 任意用户代码执行

## 3. 用户流程

```text
添加项目
  ↓
Radar 发现变化
  ↓
Change Brief 解释变化
  ↓
用户保存到 Workspace
  ↓
阅读背景和代码示例
  ↓
完成练习
  ↓
生成 Review Card
```

## 4. 领域模型

### Project

- `id`
- `provider`
- `owner`
- `repo`
- `name`
- `description`
- `default_branch`
- `language`
- `topics`
- `watch_rules`
- `last_synced_at`

### ChangeEvent

- `id`
- `project_id`
- `event_type`: `release | breaking_change | deprecation | security | api_change | documentation | performance | ecosystem`
- `title`
- `source_url`
- `published_at`
- `detected_at`
- `version_from`
- `version_to`
- `importance`
- `change_status`

### ChangeBrief

- `event_id`
- `what_changed`
- `why_it_matters`
- `affected_users`
- `migration_required`
- `before_after`
- `risks`
- `related_concepts`
- `evidence`
- `generated_at`
- `model_version`

### LearningTask

- `id`
- `event_id`
- `task_type`
- `question`
- `starter_code`
- `expected_concept`
- `solution`
- `difficulty`

### ReviewCard

- `id`
- `event_id`
- `misconception_code`
- `review_due_at`
- `mastery_state`
- `user_note`

## 5. 数据管道

第一批只接 GitHub Release、GitHub Issue / Pull Request、官方文档和 Changelog。

```text
GitHub / Docs
  → Source Adapter
  → Raw Snapshot
  → Normalize
  → Deduplicate
  → Change Classification
  → Impact Scoring
  → Change Brief
  → Learning Task
```

每次读取保存原始 URL、来源类型、抓取时间、发布时间、内容哈希、原始内容和项目版本信息。

规则负责判断版本、弃用、安全、公共 API 和默认行为变化；模型负责解释原因、影响、迁移需求、相关概念和练习设计。模型不能单独决定来源事实。

Release、Changelog、PR、提交和迁移文档属于同一变化时，必须聚成一个 Change Event，并保留主来源和支持来源。

## 6. AIHOT 复用边界

### 保留

- 信源接入框架
- 抓取、去重和任务队列
- 内容评分和事件聚类
- 时间线
- API / MCP 出口
- Docker、PostgreSQL 和运行记录

### 重做

- `industry/` 改为开发者领域配置
- 新闻文章模型改为开发者变化事件
- 热点分数改为个性化重要性
- 日报改为 Radar Inbox
- 新闻摘要改为 Change Brief
- 主题页改为 Project Workspace
- 新闻阅读改为 Learning Task
- 周报改为 Personal Review

## 7. 页面结构

### Radar Inbox

显示项目、变化类型、影响等级、迁移需求、阅读状态和学习状态。首页只展示摘要，不堆叠完整文章。

### Projects

支持正在使用、正在学习、以后关注和已暂停四种状态，并展示未阅读变化和未完成任务。

### Change Brief

内容顺序固定为：发生了什么、为什么重要、谁受到影响、旧写法与新写法、是否需要迁移、原始证据、学习练习。

### Learning Workspace

保存变化说明、背景概念、代码示例、用户笔记、练习结果、相关项目和复习时间。

### Review

展示错误回答、未完成任务、经常跳过的概念和即将到期的复习卡片；每张卡都能回到原始事件。

## 8. 内容可信规则

- 每个事实必须绑定原始来源。
- 事实、解释和推断必须有不同标签。
- 来源读取失败时不能生成确定性 Change Brief。
- 来源冲突时标记为 `disputed` 并列展示。
- 生成内容保存时间、模型版本和来源集合。
- 第一版不执行任意用户代码。

## 9. 实现顺序

### V0.1 Radar

完成项目添加、GitHub 同步、去重、聚类、Radar Inbox 和 Project 页面。

### V0.2 Change Brief

完成变化分类、影响等级、迁移判断、Before / After、Evidence 面板和模型版本记录。

### V0.3 Learning Workspace

完成背景知识卡、代码阅读题、Diff 判断题、迁移选择题、笔记和学习状态。

### V0.4 Review Loop

完成错误记录、Misconception、Review Card、复习时间和跨项目知识关系。

## 10. 第一批样例

建议样例项目为 FastAPI、React 和 Docker Compose，但 V0.1 只启用一个项目。首条验收链路为：

```text
添加 FastAPI
  → 发现 Release
  → 聚类 Changelog 和 PR
  → 生成 Change Brief
  → 展示旧 API / 新 API
  → 完成迁移练习
  → 记录错误概念
  → 生成复习卡
```

## 11. 验收标准

- 添加项目后可以看到真实变化。
- 同一变化不会重复出现。
- 每条记录可以打开原始来源。
- 重要变化优先展示。
- Change Brief 的事实可以回到来源。
- 不能确认时显示不确定状态。
- 用户可以完成至少一种学习练习。
- 学习状态刷新后不会丢失。
- 错题可以再次出现并回到原始事件。
- 失败任务不会污染已发布内容。

