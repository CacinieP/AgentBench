# AgentBench 用户手册

> 面向 AI Agent 的回归测试、漂移检测与质量保障平台

---

## 目录

- [项目简介](#项目简介)
- [快速开始](#快速开始)
- [核心概念](#核心概念)
- [页面功能](#页面功能)
  - [Dashboard 仪表盘](#dashboard-仪表盘)
  - [Test Suites 测试套件](#test-suites-测试套件)
  - [Run Detail 运行详情](#run-detail-运行详情)
  - [Compare 对比分析](#compare-对比分析)
  - [Settings 设置](#settings-设置)
- [评估器详解](#评估器详解)
- [Agent Adapter 适配器](#agent-adapter-适配器)
- [完整工作流示例](#完整工作流示例)
- [数据存储说明](#数据存储说明)
- [常见问题](#常见问题)

---

## 项目简介

AgentBench 是一个 Web 端工具，帮助你：

1. **定义测试套件** — 编写 AI Agent 的输入和期望输出
2. **执行真实测试** — 调用你的 Agent endpoint，获取真实响应
3. **自动评分** — 用多种评估器对输出打分
4. **回归对比** — 对比不同版本之间的表现变化
5. **AI 分析** — 用 LLM 分析测试结果，发现规律和修复建议

### 技术栈

| 组件 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router, Turbopack) |
| UI | React 19 + Tailwind CSS 4 |
| 语言 | TypeScript 5 |
| 图标 | Lucide React |
| 数据存储 | 浏览器 localStorage |

---

## 快速开始

### 安装与启动

```bash
# 进入项目目录
cd agentbench

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

浏览器打开 `http://localhost:3000` 即可使用。

### 其他命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | 运行 ESLint 检查 |

### 首次访问

首次打开时，系统自动加载示例数据：

- 3 个测试套件（客服 Agent / 代码审查 Agent / 数据提取 Agent）
- 4 条历史运行记录

你可以直接浏览这些数据来了解平台功能，也可以清除后从零开始。

---

## 核心概念

### 术语表

| 术语 | 说明 |
|------|------|
| **Test Suite** | 测试套件，包含一组相关的测试用例 |
| **Test Case** | 测试用例，包含输入（input）和期望输出（expectedOutput） |
| **Test Run** | 一次完整执行，对套件中所有用例逐一测试 |
| **Test Result** | 单个用例的测试结果，包含实际输出、分数、耗时等 |
| **Evaluator** | 评估器，对比实际输出与期望输出，给出 0-1 分数 |
| **Agent Endpoint** | 被测试的 AI Agent 的 HTTP 接口地址 |
| **Simulation Mode** | 模拟模式，未配置 endpoint 时使用伪随机数据演示 |

### 两种运行模式

| 模式 | 触发条件 | 行为 |
|------|----------|------|
| **Live** | Settings 中配置了 Agent Endpoint URL | 真实调用你的 Agent，获取实际响应，用评估器评分 |
| **Simulation** | 未配置 Agent Endpoint | 用确定性哈希生成模拟分数，仅用于演示 |

两种模式在界面上有明确标识：

- 运行过程中标题显示 "Testing"（Live）或 "Simulating"（Simulation）
- 运行详情页显示绿色 LIVE 或黄色 SIMULATED 徽章
- Dashboard 最近运行表格中每条记录标注 LIVE 或 SIM

---

## 页面功能

### Dashboard 仪表盘

路径：`/`

总览全局数据，包含四个区域：

**指标卡片**（4 个）：
- Total Tests — 所有运行的总测试用例数
- Pass Rate — 总通过率百分比
- Avg Score — 所有运行的平均分数
- Total Cost — 所有运行的总花费

**测试套件概览**：
- 以卡片网格展示每个套件
- 显示最新一次运行的分数环（ScoreRing）
- 显示平均分、总耗时、总花费
- 点击跳转到运行详情

**分数趋势图**：
- 最近 6 次运行的柱状图
- 颜色编码：绿色（高分）、黄色（中等）、红色（低分）
- 最新一次运行高亮显示

**最近运行表格**：
- 列：套件名、版本号（带 LIVE/SIM 标记）、通过率、分数、耗时、花费、时间
- 点击任意行跳转到运行详情页

---

### Test Suites 测试套件

路径：`/suites`

管理测试套件的核心页面。

#### 查看套件列表

- 所有套件以可展开卡片形式排列
- 折叠时显示：套件名、用例数、Agent 类型、最新运行分数和通过率
- 点击展开查看详细信息

#### 展开的套件卡片

展开后显示三部分：

1. **描述信息** — 套件描述文字
2. **测试用例列表** — 每个用例显示名称、分类、最新运行状态和分数
3. **运行按钮** — 点击 "Run Tests" 开始执行

#### 创建新套件

点击右上角 "New Suite" 按钮，弹出创建模态框：

| 字段 | 是否必填 | 说明 |
|------|----------|------|
| Suite Name | 必填 | 套件名称 |
| Description | 必填 | 套件描述 |
| Agent Type | 可选 | 选择：Chatbot / Code Review / Data Extraction / Other |
| Test Cases | 必填至少 1 个 | 每个用例包含以下字段 |

每个测试用例包含：

| 字段 | 说明 |
|------|------|
| Name | 用例名称 |
| Input | 发送给 Agent 的输入文本 |
| Expected Output | 期望的输出/行为描述 |
| Category | 分类标签（如 billing, security） |
| Evaluator | 评估器类型（可选，默认使用全局设置） |

可用的按用例评估器：Default / Contains / Exact Match / Regex / JSON Schema / LLM Judge

#### 执行测试

点击 "Run Tests" 后进入运行界面：

1. 显示待执行的用例列表
2. 提示当前模式（Live 或 Simulation）
3. 点击 "Start Run" 开始执行
4. 用例按顺序逐一执行，显示实时进度：
   - 旋转图标 = 正在执行
   - 绿色勾 = 通过
   - 红色叉 = 失败
   - 灰色圆 = 等待中
5. 运行完成后显示 "Run Complete" 摘要
6. 点击 "Run Again" 可重新运行

---

### Run Detail 运行详情

路径：`/run/[id]`

查看单次运行的完整结果。

#### 顶部概览

- 返回按钮
- 套件名称 + 版本号 + LIVE/SIMULATED 标记
- 时间和模式信息
- AI Analysis 按钮

#### 分数卡片区域

- Score Ring — 大号分数环
- Pass Rate — 通过率百分比
- Failed — 失败用例数
- Latency — 总耗时
- Cost — 总花费

#### AI 分析面板

点击 "AI Analysis" 按钮后展开：

- 当配置了 AI Provider 时：调用配置的 LLM 分析测试数据，返回实时分析
- 未配置时：显示预置的演示分析
- 显示：分析摘要、回归规律、修复建议、风险等级（Low/Medium/High）

#### 测试结果列表

每个用例可展开查看详细信息：

| 区域 | 说明 |
|------|------|
| Input | 发送给 Agent 的输入（可滚动，最高 160px） |
| Expected | 期望输出（可滚动） |
| Actual Output | Agent 的实际输出（可滚动，最高 240px），通过为绿色背景，失败为红色 |
| Failure Analysis | 失败原因（仅失败时显示） |
| Evaluator Rationale | 评估器的评判理由（真实运行时显示） |
| Score / Latency / Cost / Evaluator | 指标详情 |

---

### Compare 对比分析

路径：`/compare`

对比两次运行之间的差异，需要至少 2 次运行。

#### 版本选择器

- 左侧 BASELINE — 选择基线版本
- 右侧 CANDIDATE — 选择候选版本
- 中间显示两个 Score Ring 和分数差值

> 如果两次运行来自不同套件，页面顶部显示黄色警告，提示测试用例 ID 可能不重叠。

#### 变化指标

4 个指标卡片，每个显示变化值和方向箭头：

| 指标 | 好的方向 | 说明 |
|------|----------|------|
| Score | 上升（绿色） | 平均分数变化 |
| Pass Rate | 上升（绿色） | 通过率变化 |
| Latency | 下降（绿色） | 总耗时变化 |
| Cost | 下降（绿色） | 总花费变化 |

#### 可视化对比条

每个测试用例显示两条横条：
- 浅色条 = Baseline 分数
- 深色条 = Candidate 分数
- 右侧显示 delta 值

#### 逐条对比表

| 列 | 说明 |
|----|------|
| Test Case | 用例名称 |
| Baseline | 基线分数 |
| Candidate | 候选分数 |
| Delta | 分数变化 |
| Status | 状态标记 |

状态判定规则：

| 状态 | 条件 | 颜色 |
|------|------|------|
| Improved | delta > +0.05 | 绿色 |
| Regression | delta < -0.05 | 红色 |
| Flaky | pass/fail 翻转且 |delta| < 0.15 | 黄色 |
| Missing | candidate 中无此用例 | 黄色 |
| Unchanged | 其他情况 | 黄色 |

#### 改进/回归/Flaky 面板

三列布局分别列出：
- **Improvements** — 显著提升的用例
- **Regressions** — 显著退化的用例
- **Flaky** — pass/fail 状态翻转但不稳定的用例

#### AI 分析

与运行详情页的 AI 分析功能相同，但分析的是两次运行的对比数据。

---

### Settings 设置

路径：`/settings`

#### AI Provider 配置

配置用于 AI 分析功能的 LLM 提供商。

| 提供商 | 默认模型 | 可选模型 |
|--------|----------|----------|
| Anthropic | claude-sonnet-4-6 | claude-opus-4-7, claude-haiku-4-5-20251001 |
| OpenAI | gpt-4o | gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, o4-mini |
| Custom | 自定义 | 自定义（手动输入） |

Custom 模式的快速预设：

| 服务商 | Base URL |
|--------|----------|
| DeepSeek | https://api.deepseek.com |
| Mistral | https://api.mistral.ai |
| Groq | https://api.groq.com/openai |
| Together | https://api.together.xyz/v1 |
| OpenRouter | https://openrouter.ai/api/v1 |
| SiliconFlow | https://api.siliconflow.cn/v1 |

> API Key 仅保存在浏览器 localStorage 中，不会发送到第三方服务器（除了你配置的 AI 提供商 API）。

#### Agent Endpoint 配置

配置被测试的 AI Agent 接口。这是启用 Live 模式的关键。

| 类型 | 协议 | 说明 |
|------|------|------|
| OpenAI Chat | POST {url} | 兼容 `/v1/chat/completions` 格式 |
| Anthropic | POST {url} | 兼容 `/v1/messages` 格式 |
| Custom HTTP | POST {url} | 通用 POST 端点 |

配置字段：

| 字段 | 必填 | 说明 |
|------|------|------|
| Endpoint URL | 是 | Agent 的 HTTP 地址 |
| API Key | 否 | 如需鉴权则填写 |
| Model | 否 | 指定模型名称 |

配置完成后，运行界面会显示绿色 "Real mode" 提示。

#### Default Evaluator 默认评估器

选择全局默认的评估器类型和通过阈值。

评估器类型：

| 类型 | 说明 |
|------|------|
| Contains | 检查期望输出中的关键短语是否出现在实际输出中 |
| Exact Match | 要求实际输出与期望输出完全匹配（或高度相似） |
| Regex | 用正则表达式匹配实际输出 |
| JSON Schema | 验证输出是否为合法 JSON，并检查结构和字段类型 |
| LLM Judge | 调用 AI 对比实际输出和期望输出，给出 0-1 分数 |

通过阈值滑块：0.1（宽松）到 1.0（严格），默认 0.6。

#### Test Connection 测试连接

点击 "Test" 按钮验证 AI Provider 配置是否正确：
- 成功：显示绿色 "Connected!"
- 失败：显示红色错误信息

#### Data Management 数据管理

| 按钮 | 说明 |
|------|------|
| Reset to Sample Data | 恢复为初始示例数据 |
| Clear All Data | 删除所有套件和运行记录（需确认） |

---

## 评估器详解

### Contains（短语包含）

**工作原理**：将期望输出按换行符或分号拆分为关键短语，检查每个短语是否作为子串出现在实际输出中。

**评分规则**：`score = 匹配的短语数 / 总短语数`

**适用场景**：检查 Agent 响应是否覆盖了关键信息点。

**配置选项**：
- `threshold` — 通过阈值（默认 0.6）
- `caseInsensitive` — 是否忽略大小写

**示例**：
- 期望：`"退款将在3-5个工作日到账;请保留退款凭证"`
- 实际：`"您的退款已提交，预计3-5个工作日到账。请保留退款凭证以备查询。"`
- 短语 1 `"退款将在3-5个工作日到账"` → 不匹配（表述不同）
- 短语 2 `"请保留退款凭证"` → 匹配
- 分数：1/2 = 0.5

### Exact Match（精确匹配）

**工作原理**：比较实际输出和期望输出是否完全一致。不完全一致时使用 Jaccard 词语相似度作为部分分数。

**评分规则**：
- 完全匹配：1.0
- 部分匹配：Jaccard 相似度（`交集词数 / 并集词数`）

**适用场景**：期望输出是固定格式（如 JSON 键值、命令输出）。

**配置选项**：
- `caseInsensitive` — 是否忽略大小写

### Regex（正则匹配）

**工作原理**：用正则表达式测试实际输出。

**评分规则**：
- 匹配：1.0
- 不匹配：0.0

**适用场景**：输出需要符合特定模式（如邮箱、日期、URL 格式）。

**配置选项**：
- `pattern` — 正则表达式字符串

### JSON Schema（JSON 结构验证）

**工作原理**：解析实际输出为 JSON，验证结构符合要求。

**验证内容**：
1. 是否为合法 JSON
2. 是否为对象或数组（不是 null）
3. 如提供 schema，检查：
   - `type` — 顶层类型是否匹配
   - `required` — 必填字段是否存在
   - `properties` — 各属性的类型是否匹配

**评分规则**：`score = 通过的检查数 / 总检查数`

**适用场景**：Agent 输出结构化数据（如提取实体、生成配置）。

### LLM Judge（AI 评判）

**工作原理**：将实际输出和期望输出发送给配置的 AI Provider，让 LLM 给出 0-1 分数和评判理由。

**评判提示词**：
- 1.0 — 完美匹配或语义等价
- 0.8-0.9 — 覆盖所有要点，有细微差异
- 0.6-0.7 — 覆盖大部分要点，缺少部分细节
- 0.3-0.5 — 部分覆盖，有明显缺失
- 0.0-0.2 — 基本不正确或无关

**前置条件**：
- 必须在 Settings 中配置 AI Provider（API Key + Model）
- 如未配置，自动降级为 Contains 评估，并在评判理由中说明

**适用场景**：需要语义理解的开放式问答、对话质量评估。

---

## Agent Adapter 适配器

AgentBench 通过 HTTP POST 调用你的 AI Agent。支持三种协议：

### OpenAI Chat

```
POST {endpoint-url}
Content-Type: application/json
Authorization: Bearer {api-key}

{
  "model": "your-model",
  "messages": [{"role": "user", "content": "{test-input}"}],
  "max_tokens": 2048
}
```

响应提取路径：`choices.0.message.content`

适用：OpenAI、DeepSeek、Groq、Together、OpenRouter 等兼容接口。

### Anthropic Messages

```
POST {endpoint-url}
Content-Type: application/json
x-api-key: {api-key}
anthropic-version: 2023-06-01

{
  "model": "your-model",
  "max_tokens": 2048,
  "messages": [{"role": "user", "content": "{test-input}"}]
}
```

响应提取路径：`content.0.text`

### Custom HTTP

```
POST {endpoint-url}
Content-Type: application/json
Authorization: Bearer {api-key} (如有)

{
  "model": "your-model",
  "messages": [{"role": "user", "content": "{test-input}"}],
  "max_tokens": 2048
}
```

响应自动尝试以下字段：`output` → `response` → `text` → `content` → `choices[0].message.content` → `content[0].text` → `result`

### 超时与错误处理

- 默认超时：30 秒（可在 Settings 中配置）
- 超时或网络错误时：该用例标记为失败，score = 0，error 字段包含错误信息
- Token 费用根据实际 usage 数据计算；无 usage 数据时使用估算值

---

## 完整工作流示例

### 场景：测试一个客服 Agent

#### 第 1 步：配置 Agent Endpoint

1. 进入 Settings 页面
2. 在 "Agent Endpoint" 区域选择 **OpenAI Chat**
3. 填入你的 Agent URL（如 `https://your-agent.example.com/v1/chat/completions`）
4. 填入 API Key（如需要）
5. 填入模型名称（如 `customer-support-v2`）

#### 第 2 步：配置评估器

1. 在 "Default Evaluator" 区域选择 **Contains**
2. 将阈值滑块调到 **0.8**（较严格）
3. 在 "AI Provider" 区域配置你的 LLM（如 Anthropic + API Key），用于 AI 分析功能

#### 第 3 步：创建测试套件

1. 进入 Test Suites 页面
2. 点击 "New Suite"
3. 填写：
   - Suite Name: `Customer Support Agent v2`
   - Description: `测试客服 Agent 的退款、退货、物流查询能力`
   - Agent Type: `Chatbot`
4. 添加测试用例：

| Name | Input | Expected Output | Category | Evaluator |
|------|-------|----------------|----------|-----------|
| 退款时效 | 客户问：我昨天退货了，多久能收到退款？ | 3-5个工作日;退款原路返回 | billing | Default |
| 退货条件 | 超过30天还能退货吗 | 30天内;特殊情况请联系客服 | returns | Default |
| 物流查询 | 我的订单到哪了 | 物流单号;当前状态 | shipping | Default |

5. 点击 "Create Suite"

#### 第 4 步：执行测试

1. 展开刚创建的套件
2. 确认显示绿色 "Real mode" 提示
3. 点击 "Run Tests"
4. 观察 Agent 逐一被调用，实时显示通过/失败
5. 运行完成后点击 "Run Again" 如需重跑

#### 第 5 步：查看结果

1. 点击运行详情（Dashboard 或侧边栏的 Recent Runs）
2. 展开每个用例查看实际输出
3. 查看 Evaluator Rationale 了解评分理由
4. 点击 "AI Analysis" 获取 LLM 分析

#### 第 6 步：对比版本

1. 部署新版本 Agent
2. 再次运行同一套件
3. 进入 Compare 页面
4. 选择旧版本为 Baseline，新版本为 Candidate
5. 查看改进/回归/Flaky 面板
6. 点击 "AI Analysis" 获取版本间变化的智能分析

---

## 数据存储说明

所有数据保存在浏览器 localStorage 中，不会上传到任何服务器。

### 存储键

| Key | 内容 |
|-----|------|
| `agentbench-suites` | 所有测试套件（JSON 数组） |
| `agentbench-runs` | 所有运行记录（JSON 数组） |
| `agentbench-initialized` | 是否已加载示例数据（标记值 `"1"`） |
| `agentbench-settings` | 所有设置项（AI Provider、Agent Endpoint、评估器配置） |

### 数据特点

- **仅本地**：关闭浏览器后数据保留，但清除浏览器数据会丢失
- **无同步**：不同浏览器/设备之间不共享数据
- **容量限制**：localStorage 通常有 5-10MB 限制，足够存储数百次运行

### API Key 安全

- API Key 存储在 localStorage 中
- 仅在你主动触发测试或 AI 分析时发送给配置的 API 端点
- 不会发送到 AgentBench 自身或其他第三方

---

## 常见问题

### Q: 首次打开看到的数据是真的吗？

A: 首次访问自动加载的 3 个套件和 4 次运行是预置的演示数据。其中的运行结果是静态数据，不是实时调用生成的。你可以通过 "Clear All Data" 清除，或 "Reset to Sample Data" 恢复。

### Q: 什么是 Simulation Mode？

A: 当你没有配置 Agent Endpoint 时，运行测试会进入模拟模式。模拟模式使用确定性哈希生成伪随机分数和输出，仅用于了解平台界面和流程，不代表真实测试结果。

### Q: 如何从 Simulation 切换到 Live 模式？

A: 进入 Settings 页面，在 "Agent Endpoint" 区域填写你的 Agent URL，保存后返回 Test Suites 页面即可。运行界面会显示绿色 "Real mode" 提示。

### Q: LLM Judge 评估器需要额外配置吗？

A: 需要。LLM Judge 会调用你配置的 AI Provider（Settings 中的 API Key + Model）来进行评判。如果未配置 AI Provider，LLM Judge 会自动降级为 Contains 评估，并在结果中说明。

### Q: 为什么 Compare 页面显示所有用例都是 "Missing"？

A: 你选择了来自不同测试套件的两次运行。不同套件的测试用例 ID 不同，无法匹配。建议选择同一套件的两次运行进行对比。页面会显示黄色警告提示。

### Q: 可以同时配置多个 Agent Endpoint 吗？

A: 目前不支持。Settings 中只有一个 Agent Endpoint 配置。如需测试不同 Agent，需要手动切换配置。

### Q: 数据量大了会变慢吗？

A: 数据保存在 localStorage 中，通过 `useSyncExternalStore` 响应式读取。在数百条运行记录以内不会有性能问题。如数据量过大，可通过 "Clear All Data" 清理。

### Q: 可以把 AgentBench 部署到服务器吗？

A: 可以用 `npm run build && npm run start` 部署为生产服务。但请注意：
- 数据仍保存在每个用户的浏览器 localStorage 中，不同用户不共享
- API Key 保存在客户端，公开部署时需注意安全风险
- 建议仅在本地或内部网络使用

### Q: 与 THUDM/AgentBench 学术项目有什么关系？

A: 没有关系。本项目是面向 Agent 质量保障的 Web 工具，不是 THUDM 的学术基准测试框架。名称相似纯属巧合。
