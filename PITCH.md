# AgentBench 路演 PPT 大纲

---

## 第 1 页 — 封面

**AgentBench — AI Agent EvalOps Platform**

副标题：AI Agent 回归测试 & 质量监控平台

> "用 AI 构建，为 AI 而建"

- 团队名称 / 成员
- 黑客松名称 / 日期

---

## 第 2 页 — 问题定义

### AI Agent 上线容易，守住质量难

- 企业 AI Agent 迭代速度快（改 prompt、换模型、加工具）
- **一次 prompt 微调可能静默破坏下游行为**，无法被单元测试捕获
- 当前团队的做法：
  - ❌ 人工抽检 → 覆盖率低、不可持续
  - ❌ 无回归检测 → 上线后才发现问题
  - ❌ 无版本对比 → 不知道变好了还是变差了

**核心矛盾：AI Agent 的迭代速度远超传统 QA 的响应速度**

---

## 第 3 页 — 解决方案

### AgentBench：AI Agent 的 CI/CD 质量关卡

一张架构图：

```
定义测试用例 → 运行评估 → 版本对比 → AI 分析 → 发布决策
    ↑                                    ↓
    ←←←←← 持续回归，闭环反馈 ←←←←←←←←←←←
```

四个核心能力：

| 能力 | 价值 |
|------|------|
| 测试套件管理 | 将"期望行为"结构化，不再依赖人工判断 |
| 回归测试 | 每次变更后自动运行，量化质量分数 |
| 版本对比 | 两个版本并排 diff，一眼看出回归/改善 |
| AI 智能分析 | AI 自动诊断失败原因、提出修复建议 |

---

## 第 4 页 — 产品演示（Dashboard）

截图或录屏：Dashboard 页面

讲解要点：
- **全局指标卡片**：总测试数、通过率、平均分数、总成本 — 一眼看懂整体健康度
- **测试套件概览**：每个套件附带最新分数环（Score Ring）
- **分数趋势图**：跨版本的分数变化柱状图，回归一目了然
- **最近运行表**：每次运行的版本、分数、延迟、成本、相对时间

---

## 第 5 页 — 产品演示（测试套件管理）

截图或录屏：Suites 页面

讲解要点：
- 展开查看每个测试用例的输入/期望输出
- **一键创建新套件**：模态框表单，支持动态添加测试用例
- **一键运行测试**：动画化的逐条执行过程
- 运行结果**持久化保存**，自动出现在侧边栏和 Dashboard

---

## 第 6 页 — 产品演示（版本对比）

截图或录屏：Compare 页面

讲解要点：
- **双版本选择器**：下拉切换 Baseline / Candidate
- **分数差值指标**：Score、Pass Rate、Latency、Cost 四维对比
- **可视化柱状对比**：每个测试用例的分数差异
- **回归/改善面板**：自动分类，哪些变好了、哪些变差了
- **AI 分析**：一键触发，AI 给出失败模式分析和修复建议

---

## 第 7 页 — 技术架构

一张系统架构图：

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Settings  │  │   Data   │  │    AI         │  │
│  │ Context   │  │ Context  │  │  Provider     │  │
│  │(localStorage)│(localStorage)│ (Abstraction) │  │
│  └─────┬────┘  └─────┬────┘  └───────┬───────┘  │
│        │             │                │          │
│  ┌─────┴─────────────┴────────────────┴───────┐  │
│  │          React 19 + TypeScript              │  │
│  │          (useSyncExternalStore)              │  │
│  └──────────────────┬──────────────────────────┘  │
│                     │ fetch                        │
│              ┌──────┴──────┐                       │
│              │ /api/analyze│                       │
│              └──────┬──────┘                       │
└─────────────────────┼──────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────┴────┐  ┌────┴────┐  ┌────┴────┐
   │Anthropic│  │ OpenAI  │  │ Custom  │
   │Messages │  │ Chat    │  │ OpenAI- │
   │   API   │  │Complet. │  │ compat. │
   └─────────┘  └─────────┘  └─────────┘
   DeepSeek / Mistral / Groq / Together / OpenRouter / SiliconFlow
```

关键技术选型：

| 层级 | 技术 | 选择理由 |
|------|------|----------|
| 框架 | Next.js 16 (App Router + Turbopack) | 最新的 React SSR 框架，Turbopack 编译快 |
| UI | React 19 + Tailwind CSS 4 | React Compiler 优化，CSS 变量暗色主题 |
| 状态 | useSyncExternalStore + Context | 零依赖，React 原生外部存储同步 |
| 持久化 | localStorage | 本地优先，无需后端数据库 |
| AI 集成 | 原生 fetch（无 SDK） | 零依赖，支持所有 OpenAI 兼容 API |
| 类型安全 | TypeScript strict | 全量类型覆盖 |

---

## 第 8 页 — 技术亮点 1：多 Provider AI 抽象

### 统一接口，覆盖所有主流 AI API

```typescript
// 一个函数，三种 API 格式
export async function callAI(
  config: AIProviderConfig,
  systemPrompt: string,
  messages: AIMessage[],
  maxTokens?: number
): Promise<string>

// 自动路由：
switch (config.provider) {
  case "anthropic":  → POST {baseUrl}/v1/messages
  case "openai":     → POST {baseUrl}/v1/chat/completions
  case "custom":     → 同 OpenAI 格式，自定义 baseUrl
}
```

设计原则：
- **零 SDK 依赖** — 纯 fetch 实现，不锁定任何供应商
- **请求格式自适应** — Anthropic 用 `system` 字段 + `x-api-key` header；OpenAI 用 `messages[0].role="system"` + `Bearer` token
- **响应格式自适应** — Anthropic 解析 `content[0].text`；OpenAI 解析 `choices[0].message.content`
- **用户只需在 Settings 页切换 Provider** — 页面代码无需感知差异

---

## 第 9 页 — 技术亮点 2：响应式 localStorage 数据层

### useSyncExternalStore 实现零 useEffect 的响应式本地存储

传统方案的问题：
```typescript
// ❌ React Compiler 禁止 effect 内调用 setState
useEffect(() => {
  const data = localStorage.getItem(key);
  setState(JSON.parse(data));  // lint error!
}, []);
```

AgentBench 的方案：
```typescript
// ✅ useSyncExternalStore — React 官方推荐的外部存储同步方式
const listeners = new Set<() => void>();
function emitChange() { listeners.forEach(cb => cb()); }

function getSnapshot(): string {
  ensureSeeded();  // 首次加载自动填充样本数据
  return localStorage.getItem(KEY) || "[]";
}

// 在 Provider 中：
const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
const data = useMemo(() => JSON.parse(raw), [raw]);
```

优势：
- **零 useEffect** — 完全通过 React Compiler strict lint
- **SSR 安全** — `getServerSnapshot` 返回空数组，避免水合不匹配
- **实时响应** — `emitChange()` 触发所有订阅者重新读取，UI 立即更新
- **幂等初始化** — `ensureSeeded()` 在 snapshot 函数内调用，安全且只执行一次

---

## 第 10 页 — 技术亮点 3：组件级质量

### React 19 + React Compiler 的工程实践

| 挑战 | 解决方案 |
|------|----------|
| Effect 内不能调 setState | 全部改用 useSyncExternalStore + 事件处理函数 |
| Render 时不能读 ref | 用 setInterval 在 handler 内管理定时器状态 |
| useCallback 自引用 | 用 useRef 持有 interval，避免递归声明 |
| 表格行点击导航 | `onClick + router.push()` 代替 `<Link>` 嵌套 `<tr>` |
| 测试执行动画 | RunSimulation 组件用 setInterval + useRef 累积器模式 |

SVG 可视化：
- **ScoreRing** — 纯 SVG donut chart，`stroke-dasharray` 动态渲染分数
- **Progress Bar** — CSS 变量控制颜色的分段进度条
- **Glass Card** — 半透明毛玻璃卡片，统一视觉语言

---

## 第 11 页 — 数据模型

```
TestSuite  1───*  TestCase
    │
    │ 1
    │
    * │
TestRun  1───*  TestResult
```

```typescript
interface TestSuite {
  id: string;
  name: string;
  description: string;
  agentType: string;       // "chatbot" | "code-review" | "extraction" | "other"
  cases: TestCase[];       // 测试用例集合
}

interface TestCase {
  id: string;
  name: string;
  input: string;           // Agent 输入
  expectedOutput: string;  // 期望行为描述
  category: string;        // 分类标签
}

interface TestRun {
  id: string;
  suiteId: string;          // 关联测试套件
  timestamp: string;
  results: TestResult[];    // 每个用例的执行结果
  summary: {
    total: number; passed: number; failed: number;
    avgScore: number;       // 0-1 加权分数
    totalLatencyMs: number;
    totalTokenCost: number;
  };
  agentVersion: string;    // 被测 Agent 版本号
  modelVersion: string;    // 底层模型版本
}

interface TestResult {
  testCaseId: string;
  actualOutput: string;
  passed: boolean;          // score >= 0.6
  score: number;            // 0-1 质量分数
  latencyMs: number;
  tokenCost: number;
  error?: string;           // 失败原因
}
```

---

## 第 12 页 — 商业场景

### 谁在用？怎么用？

| 角色 | 场景 |
|------|------|
| **AI 产品经理** | 定义"好的 Agent 回答"长什么样，量化追踪迭代效果 |
| **Prompt 工程师** | 改完 prompt 后一键回归测试，确认没有回归 |
| **后端工程师** | 换模型前跑一遍对比（如 Claude → GPT-4o），看分数变化 |
| **DevOps/SRE** | 接入 CI 流水线，每次部署前自动跑评估，低于阈值则阻断 |
| **合规团队** | 审计 AI 输出质量，留存每次评估记录 |

扩展路径：
- 🔄 CI/CD 集成（GitHub Action / GitLab CI）
- 📊 历史趋势 & SLA 报告
- 🔔 回归告警（Webhook / Slack 通知）
- 🏢 团队协作（多用户 + 云端存储）

---

## 第 13 页 — Meta：AI 构建的 AI 工具

### 这个项目本身就是 AI Coding 的证明

| 指标 | 数据 |
|------|------|
| 项目来源 | 从 45+ 份每日机会报告中，AI 分析选出最高频方向（出现 12+ 次） |
| 开发方式 | 全程 Claude Code，人类只给出需求方向 |
| 代码量 | ~2500 行 TypeScript/TSX，0 外部状态管理依赖 |
| 组件数 | 6 个自定义组件 + 6 个页面 + 1 个 API Route |
| 迭代轮次 | 多轮对话，每轮自动 build + lint 验证 |
| AI 集成 | 支持 6+ AI 供应商的统一抽象层 |

**"用 AI 构建一个测试 AI 的工具" — 这就是最好的 Demo**

---

## 第 14 页 — Demo 演示

现场操作流程：

1. 打开 Dashboard → 展示样本数据和全局指标
2. 进入 Settings → 展示多 Provider 配置
3. 进入 Suites → 创建一个新的测试套件
4. 运行测试 → 展示动画化执行过程
5. 回到 Dashboard → 新运行已出现
6. 进入 Compare → 选择两个版本对比
7. 点击 AI Analysis → 展示 AI 智能分析
8. 进入 Settings → 清除数据 → 展示空状态 → 重置样本数据

---

## 第 15 页 — 路线图

### 短期（1-2 周）
- [ ] 真实 Agent 执行（连接实际 AI Agent，而非模拟）
- [ ] 自定义评分规则（正则匹配 / 相似度 / LLM-as-Judge）

### 中期（1-2 月）
- [ ] 后端持久化（SQLite / PostgreSQL）
- [ ] CI/CD 集成（CLI 工具 + GitHub Action）
- [ ] 回归告警（Webhook / 邮件通知）

### 长期（3-6 月）
- [ ] 团队协作（多用户、权限管理）
- [ ] Agent 市场（共享测试套件模板）
- [ ] 多模态测试（图片、语音 Agent）

---

## 第 16 页 — 团队 & Q&A

- 团队成员介绍
- 联系方式
- GitHub 链接
- 在线 Demo 地址

**Q&A**

---

## 附录：PPT 设计建议

- **配色**：与产品暗色主题一致 — 深色背景 `#0b0d11`，主色调 Indigo `#6366f1`
- **字体**：等宽字体展示代码片段，无衬线字体展示正文
- **图表**：直接截取产品界面截图，比抽象图更有说服力
- **动画**：Demo 录屏比截图更直观，建议准备 60 秒操作视频
- **节奏**：前 3 页讲清楚"为什么"，中间 5 页展示"是什么"和"怎么做到的"，最后 3 页讲"未来"
