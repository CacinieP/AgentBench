import { TestSuite, TestRun } from "./types";

export function createSeedSuites(): TestSuite[] {
  return [
    {
      id: "suite-1",
      name: "客服 Agent",
      description:
        "评估客服聊天机器人的响应质量，涵盖账单、退货和物流查询。",
      agentType: "chatbot",
      cases: [
        {
          id: "tc-1-1",
          name: "账单纠纷处理",
          input: "我的订单 #12345 被重复扣款了。每笔 $49.99。请退还重复扣款的金额。",
          expectedOutput:
            "重复扣款;同理心;退款;3-5 个工作日;支付方式",
          category: "billing",
        },
        {
          id: "tc-1-2",
          name: "退货政策咨询",
          input: "35 天前买的商品还能退货吗？产品未拆封。",
          expectedOutput:
            "30 天;未拆封;例外;人工审核;订单号",
          category: "returns",
        },
        {
          id: "tc-1-3",
          name: "物流延迟投诉",
          input: "我的订单应该在 3 天前到达，物流追踪一直没更新。订单号 #67890。",
          expectedOutput:
            "道歉;调查;承运商;补发;退款",
          category: "shipping",
        },
        {
          id: "tc-1-4",
          name: "产品缺陷报告",
          input: "我收到的笔记本电脑屏幕碎了。我有照片。该怎么办？",
          expectedOutput:
            "同理心;照片;换货;退款;保修",
          category: "returns",
        },
        {
          id: "tc-1-5",
          name: "订阅取消",
          input: "我想立即取消 Premium 订阅，不要再扣款了。",
          expectedOutput:
            "取消;不再收费;生效日期;确认",
          category: "billing",
        },
        {
          id: "tc-1-6",
          name: "多商品订单状态",
          input: "我订了 5 件商品，只收到 3 件。另外 2 件在哪里？",
          expectedOutput:
            "5 件;3 件;分开发货;物流单号",
          category: "shipping",
        },
      ],
    },
    {
      id: "suite-2",
      name: "代码审查 Agent",
      description:
        "测试用于审查 Pull Requests 的 AI Agent，检测安全问题、代码风格违规和正确性。",
      agentType: "code-review",
      cases: [
        {
          id: "tc-2-1",
          name: "SQL 注入检测",
          input: "审查代码：const query = `SELECT * FROM users WHERE id = ${req.params.id}`; db.query(query);",
          expectedOutput:
            "SQL 注入;参数化查询;安全风险",
          category: "security",
        },
        {
          id: "tc-2-2",
          name: "缺少错误处理",
          input: "审查：async function getUser(id) { const user = await User.findById(id); return user.name; }",
          expectedOutput:
            "空值检查;错误处理;try/catch;null",
          category: "correctness",
        },
        {
          id: "tc-2-3",
          name: "性能反模式",
          input: "审查：for (const id of ids) { await fetch(`/api/users/${id}`); }",
          expectedOutput:
            "N+1;Promise.all;并行;批量",
          category: "performance",
        },
        {
          id: "tc-2-4",
          name: "硬编码密钥",
          input: "审查：const AWS_SECRET = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'; const client = new AWS.Client({ secret: AWS_SECRET });",
          expectedOutput:
            "硬编码;密钥;安全;环境变量;密钥管理",
          category: "security",
        },
        {
          id: "tc-2-5",
          name: "正确的重构",
          input: "审查：将 `if (x == null)` 改为 `if (x === null || x === undefined)` 并添加了单元测试。",
          expectedOutput:
            "等价;冗余;无害;测试",
          category: "correctness",
        },
      ],
    },
    {
      id: "suite-3",
      name: "数据提取 Agent",
      description:
        "测试从非结构化文本（发票、收据、邮件）中提取结构化数据的 AI Agent。",
      agentType: "extraction",
      cases: [
        {
          id: "tc-3-1",
          name: "发票金额提取",
          input: "发票 #INV-2024-001\n日期: 2026年3月15日\n小计: $1,250.00\n税费 (8.5%): $106.25\n运费: $15.00\n应付总额: $1,371.25",
          expectedOutput:
            "INV-2024-001;1250.00;106.25;15.00;1371.25",
          category: "invoice",
        },
        {
          id: "tc-3-2",
          name: "含折扣的收据",
          input: "沃尔玛超市\n2x 有机牛奶 $4.99/件 = $9.98\n1x 面包 $3.49\n会员折扣: -$2.00\n总计: $11.47\n支付:  Visa ****1234",
          expectedOutput:
            "超市;牛奶;面包;折扣;Visa;1234",
          category: "receipt",
        },
        {
          id: "tc-3-3",
          name: "邮件待办事项",
          input: "大家好，跟进昨天会议内容。@Sarah 请在周五前发送 Q4 报告。@Mike 我们需要在 20 号前更新 API 文档。下周二下午 2 点再同步。",
          expectedOutput:
            "Sarah;Q4 报告;Mike;API 文档;下周二",
          category: "email",
        },
      ],
    },
  ];
}

export function createSeedRuns(): TestRun[] {
  const now = Date.now();
  return [
    {
      id: "run-v2-3-0",
      suiteId: "suite-1",
      suiteName: "客服 Agent",
      timestamp: new Date(now).toISOString(),
      results: [
        {
          testCaseId: "tc-1-1",
          actualOutput:
            "很抱歉听到您订单 #12345 被重复扣款了。我在系统中确实看到了两笔 $49.99 的扣款记录。我已为您发起了重复扣款的退款，您应在 3-5 个工作日内通过原支付方式收到退款。请问您是否确认使用的是尾号 4532 的 Visa 卡支付？",
          passed: true,
          score: 0.8,
          latencyMs: 1240,
          tokenCost: 0.0034,
        },
        {
          testCaseId: "tc-1-2",
          actualOutput:
            "我们的标准退货窗口是 30 天，而您的购买已过去 35 天。不过由于产品仍然未拆封，您可能有例外资格。让我为您联系专员进行人工审核。请提供一下订单号？",
          passed: true,
          score: 0.8,
          latencyMs: 980,
          tokenCost: 0.0028,
        },
        {
          testCaseId: "tc-1-3",
          actualOutput:
            "很抱歉您的订单 #67890 发生了延迟。我查询后发现包裹似乎滞留在分拣中心。我可以为您：1) 联系承运商进行紧急查询，2) 立即免费补发，或 3) 办理全额退款。您更倾向哪种方案？",
          passed: true,
          score: 1.0,
          latencyMs: 1580,
          tokenCost: 0.0041,
        },
        {
          testCaseId: "tc-1-4",
          actualOutput:
            "很抱歉听到屏幕碎了。请通过此链接上传损坏照片：[upload]。收到后我们将立即为您处理换货。是否需要寄送到同一地址？",
          passed: false,
          score: 0.4,
          latencyMs: 890,
          tokenCost: 0.0025,
          error: "得分 0.40 低于阈值",
        },
        {
          testCaseId: "tc-1-5",
          actualOutput:
            "我可以帮您取消 Premium 订阅。订阅将立即取消，您不会再被收费。在当前计费周期结束前（2026年5月31日），您仍可继续使用。方便告知取消原因吗？我们会发送取消确认邮件。",
          passed: true,
          score: 0.8,
          latencyMs: 1120,
          tokenCost: 0.0031,
        },
        {
          testCaseId: "tc-1-6",
          actualOutput:
            "让我查一下您的订单。我看到 5 件商品中的 3 件已送达。其余 2 件已分开发货，目前在运输中。物流单号：TK-111（第 4 件，明天到达），TK-112（第 5 件，周四到达）。",
          passed: true,
          score: 1.0,
          latencyMs: 1340,
          tokenCost: 0.0036,
        },
      ],
      summary: {
        total: 6,
        passed: 4,
        failed: 2,
        avgScore: 0.717,
        totalLatencyMs: 7150,
        totalTokenCost: 0.0195,
      },
      agentVersion: "v2.3.0",
      modelVersion: "claude-sonnet-4-6",
    },
    {
      id: "run-v2-2-0",
      suiteId: "suite-1",
      suiteName: "客服 Agent",
      timestamp: new Date(now - 86400000).toISOString(),
      results: [
        {
          testCaseId: "tc-1-1",
          actualOutput:
            "我看到有重复扣款，我会处理退款，请等 5-7 天。",
          passed: false,
          score: 0.35,
          latencyMs: 620,
          tokenCost: 0.0012,
          error: "过于简短，缺少同理心，退款时间线错误，未要求确认支付方式",
        },
        {
          testCaseId: "tc-1-2",
          actualOutput:
            "我们的退货政策是 30 天，抱歉超过政策期限无法退货。",
          passed: false,
          score: 0.25,
          latencyMs: 450,
          tokenCost: 0.0009,
          error: "态度敷衍，未提及未拆封商品的例外流程，未提供升级途径",
        },
        {
          testCaseId: "tc-1-3",
          actualOutput:
            "您的物流显示包裹仍在运输中，请再等几天。",
          passed: false,
          score: 0.3,
          latencyMs: 580,
          tokenCost: 0.0011,
          error: "态度敷衍，未进行调查，未提供解决方案，没有道歉",
        },
        {
          testCaseId: "tc-1-4",
          actualOutput:
            "请发送屏幕损坏的照片，我们会跟进处理。",
          passed: false,
          score: 0.28,
          latencyMs: 380,
          tokenCost: 0.0008,
          error: "同理心不足，没有明确说明流程，未提供即时选项",
        },
        {
          testCaseId: "tc-1-5",
          actualOutput:
            "您的 Premium 订阅已取消。还有其他事吗？",
          passed: false,
          score: 0.4,
          latencyMs: 520,
          tokenCost: 0.001,
          error: "过于简短，未确认生效日期或计费期权限，未询问原因",
        },
        {
          testCaseId: "tc-1-6",
          actualOutput:
            "其余商品应该很快到达，请自行查看物流。",
          passed: false,
          score: 0.2,
          latencyMs: 440,
          tokenCost: 0.0009,
          error: "回复模糊，未核实订单详情，无具体物流信息，语气敷衍",
        },
      ],
      summary: {
        total: 6,
        passed: 0,
        failed: 6,
        avgScore: 0.175,
        totalLatencyMs: 2990,
        totalTokenCost: 0.0059,
      },
      agentVersion: "v2.2.0",
      modelVersion: "claude-haiku-4-5",
    },
    {
      id: "run-code-v1-1",
      suiteId: "suite-2",
      suiteName: "代码审查 Agent",
      timestamp: new Date(now - 3600000).toISOString(),
      results: [
        {
          testCaseId: "tc-2-1",
          actualOutput:
            "严重：检测到 SQL 注入漏洞。代码将用户输入直接拼接到 SQL 查询中。攻击者可通过 `req.params.id` 注入恶意 SQL。修复：使用参数化查询 — `db.query('SELECT * FROM users WHERE id = ?', [req.params.id])`",
          passed: true,
          score: 0.96,
          latencyMs: 2100,
          tokenCost: 0.0052,
        },
        {
          testCaseId: "tc-2-2",
          actualOutput:
            "警告：缺少错误处理和空值检查。如果 `User.findById(id)` 返回 null（用户未找到），访问 `user.name` 将抛出 TypeError。建议修复：添加空值检查和 try/catch 块。",
          passed: true,
          score: 0.89,
          latencyMs: 1800,
          tokenCost: 0.0044,
        },
        {
          testCaseId: "tc-2-3",
          actualOutput:
            "性能问题：循环中顺序 await（N+1 模式）。每次 fetch 都需要等待前一次完成。使用 `Promise.all(ids.map(id => fetch(...)))` 实现并行执行，或实现批量端点。",
          passed: true,
          score: 0.93,
          latencyMs: 1650,
          tokenCost: 0.0041,
        },
        {
          testCaseId: "tc-2-4",
          actualOutput:
            "严重安全：检测到硬编码 AWS 密钥。这是严重的安全漏洞。切勿将凭据提交到源代码。移至环境变量或使用 AWS Secrets Manager。",
          passed: true,
          score: 0.98,
          latencyMs: 1200,
          tokenCost: 0.0038,
        },
        {
          testCaseId: "tc-2-5",
          actualOutput:
            "说明：将 `x == null` 改为 `x === null || x === undefined` 在 JavaScript 中技术上是等价的。`x == null` 是 `==` 唯一同时检查 null 和 undefined 的情况。此修改安全但冗余。添加了测试是好的。",
          passed: true,
          score: 0.94,
          latencyMs: 1900,
          tokenCost: 0.0048,
        },
      ],
      summary: {
        total: 5,
        passed: 5,
        failed: 0,
        avgScore: 0.843,
        totalLatencyMs: 8650,
        totalTokenCost: 0.0223,
      },
      agentVersion: "v1.1.0",
      modelVersion: "claude-sonnet-4-6",
    },
    {
      id: "run-extract-v1-0",
      suiteId: "suite-3",
      suiteName: "数据提取 Agent",
      timestamp: new Date(now - 7200000).toISOString(),
      results: [
        {
          testCaseId: "tc-3-1",
          actualOutput: `{"invoice_number":"INV-2024-001","date":"2026-03-15","subtotal":1250.00,"tax":106.25,"shipping":15.00,"total":1371.25}`,
          passed: true,
          score: 0.97,
          latencyMs: 1450,
          tokenCost: 0.0039,
        },
        {
          testCaseId: "tc-3-2",
          actualOutput: `{"店铺":"沃尔玛超市","商品":[{"名称":"有机牛奶","数量":2,"价格":9.98},{"名称":"面包","数量":1,"价格":3.49}],"折扣":2.00,"总计":11.47,"支付":{"类型":"Visa","尾号":"1234"}}`,
          passed: true,
          score: 1.0,
          latencyMs: 1380,
          tokenCost: 0.0036,
        },
        {
          testCaseId: "tc-3-3",
          actualOutput: `{"待办事项":[{"负责人":"Sarah","任务":"发送 Q4 报告","截止":"周五"},{"负责人":"Mike","任务":"更新 API 文档","截止":"20号"}],"下次会议":"下周二下午2点"}`,
          passed: true,
          score: 1.0,
          latencyMs: 1220,
          tokenCost: 0.0033,
        },
      ],
      summary: {
        total: 3,
        passed: 3,
        failed: 0,
        avgScore: 1.0,
        totalLatencyMs: 4050,
        totalTokenCost: 0.0108,
      },
      agentVersion: "v1.0.0",
      modelVersion: "claude-sonnet-4-6",
    },
  ];
}
