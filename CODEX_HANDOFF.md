# Codex 执行交接：Open Source Radar + Learning Workspace

## 任务

把当前仓库从现有 RaderLearning/AIHOT 基础重构为面向个人开发者的 **Open Source Radar + Learning Workspace**。产品链路必须是：

```text
关注 GitHub 项目
→ 发现 Release / Issue / PR / 官方文档变化
→ 去重、聚类、分类、影响评分
→ Change Brief
→ Before / After 与 Evidence
→ Learning Task
→ 本地学习记录
→ Review Card
```

## 先读这些文件

1. `OPEN_SOURCE_RADAR_SPEC.md`
2. `OPEN_SOURCE_RADAR_PLAN.md`
3. `README.md`
4. `NOTICE` 与 `LICENSE`
5. 现有 `package.json`、`packages/`、`tests/` 和数据库迁移

## 执行规则

- 直接在当前仓库工作，不要凭空重写，不要删除现有能力，先建立迁移边界。
- 不使用 computer use；优先使用终端、代码、测试和已有 API/MCP 能力。
- 保留原项目许可证和 NOTICE；产品名称、Logo、UI 文案必须使用新品牌，不得使用 AIHOT 品牌资产。
- 第一版面向个人开发者，本地优先，无账号、团队协作、社区、自动修改用户代码和全功能 IDE。
- 不把模型推断当作来源事实。所有 Change Brief 必须能回到原始来源和抓取快照。
- 不执行任意用户代码；学习任务先做代码阅读、Diff 判断和迁移选择题。
- 每完成一个任务都运行相关测试、类型检查和格式检查，并记录结果。
- 遇到结构不一致时，以当前仓库实际结构为准，补充迁移说明，不要假造文件。

## 任务顺序（Subagent-driven）

### Task 1：领域模型
建立 Project、ChangeEvent、SourceSnapshot、ChangeBrief、LearningTask、ReviewCard、PersonalNote 及状态枚举；补充数据库迁移、类型和最小测试。

### Task 2：信源适配器
接入 GitHub Release、Issue、Pull Request，以及官方文档/Changelog；保存 URL、来源类型、抓取时间、发布时间、哈希、原始内容和版本信息；失败时保留失败状态。

### Task 3：事件处理
实现规范化、去重、事件聚类、变化分类和个性化重要性评分；支持 release、breaking change、deprecation、security、api change、documentation、performance。

### Task 4：Radar API 与 Inbox
实现添加/管理项目、同步变化、Radar Inbox、Project 页面、原始来源查看和阅读状态；保证同一变化不会重复展示。

### Task 5：Change Brief 与学习任务
实现固定顺序的 Change Brief：发生了什么、为什么重要、谁受影响、旧写法/新写法、是否需要迁移、证据、练习；事实与模型推断分开，保存生成时间和模型版本。

### Task 6：Workspace 与 Review
实现保存到 Workspace、背景知识、代码阅读题、Diff 判断题、迁移选择题、个人笔记、学习状态、错误概念、Review Card 和复习时间；状态刷新后不丢失。

### Task 7：端到端验收
用一个真实 GitHub 项目跑通：

```text
添加项目
→ 发现 Release
→ 聚类 Changelog/PR
→ Change Brief
→ Before/After
→ 完成练习
→ 记录错误概念
→ 生成 Review Card
```

补充发布门禁：测试、类型检查、构建、数据库迁移检查、许可证/NOTICE 检查、文档更新。

## 协作循环

每个 Task 都按以下循环执行：

```text
Implementation Agent 完成
→ Review Agent 检查架构、数据可信性、安全、测试和范围
→ 若有问题返回 Implementation Agent 修复
→ 最多 3 轮；仍失败则停止并生成阻塞报告
→ 进入下一个 Task
```

## 完成输出

最后输出：

- 改动文件清单
- 每个 Task 的完成状态
- 测试/构建命令和结果
- 已知限制
- 尚未完成的阻塞项
- 本地启动命令
- 第一条真实验收链路的复现步骤
