# AgentBench — AI Agent 可观测性与回归测试平台

[English](README.md) | [中文](README.zh.md)

> 面向 AI Agent 的回归测试、漂移检测与质量保障平台。
> **完全由 Claude Code 构建** — AI 编程既是手段，也是产品本身。

> ⚠️ **命名声明**：本项目与清华大学 [THUDM/AgentBench](https://github.com/THUDM/AgentBench)（用于评估 LLM-as-Agent 能力的学术基准测试框架）**无任何关联**。名称重合纯属无意。如果你在寻找学术研究基准（涵盖操作系统、数据库、知识图谱、网购等环境），请访问 [THUDM 仓库](https://github.com/THUDM/AgentBench)。本仓库是一个独立的 **EvalOps 仪表盘**，帮助团队对自身 AI Agent 进行回归测试。

## 它能做什么

## 截图预览

| 仪表盘 | 测试套件 | 版本对比 |
|---|---|---|
| ![仪表盘](screenshots/dashboard.png) | ![套件](screenshots/suites.png) | ![对比](screenshots/compare.png) |

AgentBench 是一个 EvalOps 平台，帮助团队交付可靠的 AI Agent，提供以下核心能力：

- **测试套件管理** — 为 AI Agent 定义测试用例，包含输入与预期输出
- **回归测试** — 运行评估并在不同 Agent 版本间追踪质量变化
- **版本对比** — 并排对比两次运行结果，在部署前捕获退化
- **AI 智能分析** — Claude 自动分析失败原因并给出修复建议
- **API Key 透明机制** — Key 存储在 localStorage，仅在你触发测试或分析时发送到本应用的 server route，由服务端转发至配置的 provider。如需完全本地控制，请自行部署。

## 为什么做这个项目？

本项目是从 45+ 份每日机会报告中筛选出的、最具验证价值的黑客松创意：

1. **EvalOps / Agent 回归测试** 在 46 天的机会分析中出现了 **12 次以上** — 是出现频率最高的主题
2. 它完美体现了"AI 编程既是手段也是产品"：我们用 AI（Claude Code）构建了一个测试 AI Agent 的平台
3. "用 AI 测试 AI" 的范式在技术上有趣，在商业上也极具价值，因为 Agent 正在进入生产环境

## 技术栈

- **Next.js 16**（App Router、Turbopack）
- **React 19** + TypeScript
- **Tailwind CSS 4** — 暗色主题仪表盘 UI
- **多 Provider AI** — Anthropic / OpenAI / OpenAI 兼容 API

## 快速开始

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看仪表盘。

### 使用 Claude API（可选）

设置 Anthropic API 密钥以启用 AI 智能分析：

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run dev
```

未提供 API 密钥时，应用将使用内置的演示分析数据。

## 页面

| 路由 | 说明 |
|------|------|
| `/` | 仪表盘 — 指标概览、测试套件总览、最近运行记录 |
| `/suites` | 测试套件管理 — 可展开查看测试用例详情 |
| `/compare` | 并排回归分析 — 对比两个 Agent 版本 |
| `/run/[id]` | 测试运行详情 — 可展开查看单条用例分析 |

## 架构

```
src/
├── app/
│   ├── page.tsx          # 仪表盘
│   ├── layout.tsx        # 根布局（含侧边栏）
│   ├── globals.css       # 暗色主题样式
│   ├── suites/page.tsx   # 测试套件管理
│   ├── compare/page.tsx  # 版本对比
│   ├── run/[id]/page.tsx # 运行详情页
│   └── api/analyze/route.ts  # Claude API 集成
├── components/
│   ├── Sidebar.tsx       # 导航侧边栏
│   ├── StatusBadge.tsx   # 通过/失败/警告状态标签
│   └── MetricCard.tsx    # 仪表盘指标卡片
└── lib/
    ├── types.ts          # TypeScript 类型定义
    └── demo-data.ts      # 演示数据（3 个测试套件及运行记录）
```

## 常见问题

### 这是清华大学（THUDM）的那个 AgentBench 吗？

**不是。** 这是一个在黑客松期间创建的独立项目，名称重合纯属无意。

| | THUDM/AgentBench | 本项目 |
|---|---|---|
| **目的** | 学术基准测试，横向对比不同 LLM 的 Agent 能力 | EvalOps 仪表盘，帮助团队对自身 Agent 做回归测试 |
| **目标用户** | AI 研究者、模型开发者 | 工程团队、产品经理 |
| **测试内容** | 8 个通用环境（操作系统、数据库、网购等） | 你自己的 Agent 测试套件（客服、代码审查、数据提取等） |
| **产出物** | 排行榜、学术论文数据 | 回归报告、质量趋势图 |
| **技术栈** | Python + Docker + conda | Next.js + React + TypeScript |

如果你需要的是学术基准测试，请前往 [github.com/THUDM/AgentBench](https://github.com/THUDM/AgentBench)。

## 许可证

MIT — 详见 [LICENSE](./LICENSE)。

## 黑客松演讲稿

**问题：** 部署 AI Agent 的团队在修改提示词、模型或工具时，缺乏可靠手段来检测质量退化。一次微小的提示词调整就可能悄无声息地破坏下游行为。

**解决方案：** AgentBench 提供了一套面向 AI Agent 的、CI 友好的回归测试框架 —— 定义黄金测试用例，每次变更都运行评估，在问题进入生产环境前捕获退化。

**元叙事：** 本项目完全由 AI（Claude Code）在单次会话中构建完成，验证了"AI 编程能够产出生产级开发者工具"这一命题。
