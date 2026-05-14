import { TestSuite, TestRun } from "./types";

export function createSeedSuites(): TestSuite[] {
  return [
    {
      id: "suite-1",
      name: "Customer Support Agent",
      description:
        "Evaluates response quality for a customer support chatbot handling billing, returns, and shipping queries.",
      agentType: "chatbot",
      cases: [
        {
          id: "tc-1-1",
          name: "Billing dispute resolution",
          input: "I was charged twice for my order #12345. The amount is $49.99 each. Please refund the duplicate charge.",
          expectedOutput:
            "Should acknowledge the duplicate charge, provide empathy, explain refund process, and give timeline (3-5 business days). Should ask for payment method confirmation.",
          category: "billing",
        },
        {
          id: "tc-1-2",
          name: "Return policy inquiry",
          input: "Can I return a product I bought 35 days ago? It's still sealed.",
          expectedOutput:
            "Should explain standard 30-day policy, note the item is sealed so may qualify for exception, and provide next steps to contact support for manual review.",
          category: "returns",
        },
        {
          id: "tc-1-3",
          name: "Shipping delay complaint",
          input: "My order was supposed to arrive 3 days ago and tracking hasn't updated. Order #67890.",
          expectedOutput:
            "Should check order status, apologize for delay, offer to investigate with carrier, and provide resolution options (wait, reship, or refund).",
          category: "shipping",
        },
        {
          id: "tc-1-4",
          name: "Product defect report",
          input: "The laptop I received has a cracked screen. I have photos. What do I do?",
          expectedOutput:
            "Should express empathy, request photo upload, explain damage claim process, and offer immediate replacement or refund options.",
          category: "returns",
        },
        {
          id: "tc-1-5",
          name: "Subscription cancellation",
          input: "I want to cancel my Premium subscription effective immediately. I don't want to be charged again.",
          expectedOutput:
            "Should confirm subscription details, explain cancellation terms (no further charges), ask for reason, and provide confirmation with effective date.",
          category: "billing",
        },
        {
          id: "tc-1-6",
          name: "Multi-item order status",
          input: "I ordered 5 items but only received 3. Where are the other 2?",
          expectedOutput:
            "Should verify order contains 5 items, check which were shipped, explain split shipment if applicable, and provide tracking for remaining items.",
          category: "shipping",
        },
      ],
    },
    {
      id: "suite-2",
      name: "Code Review Agent",
      description:
        "Tests an AI agent that reviews pull requests for security issues, style violations, and correctness.",
      agentType: "code-review",
      cases: [
        {
          id: "tc-2-1",
          name: "SQL injection detection",
          input: "Review this code: const query = `SELECT * FROM users WHERE id = ${req.params.id}`; db.query(query);",
          expectedOutput:
            "Should flag SQL injection vulnerability, explain the risk, and suggest parameterized query replacement.",
          category: "security",
        },
        {
          id: "tc-2-2",
          name: "Missing error handling",
          input: "Review: async function getUser(id) { const user = await User.findById(id); return user.name; }",
          expectedOutput:
            "Should flag missing null check and error handling. Should suggest try/catch and null return handling.",
          category: "correctness",
        },
        {
          id: "tc-2-3",
          name: "Performance anti-pattern",
          input: "Review: for (const id of ids) { await fetch(`/api/users/${id}`); }",
          expectedOutput:
            "Should flag sequential await in loop as N+1 pattern. Should suggest Promise.all or batch endpoint.",
          category: "performance",
        },
        {
          id: "tc-2-4",
          name: "Hardcoded credentials",
          input: "Review: const AWS_SECRET = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'; const client = new AWS.Client({ secret: AWS_SECRET });",
          expectedOutput:
            "Should immediately flag hardcoded secret as critical security issue. Should suggest env variables or secrets manager.",
          category: "security",
        },
        {
          id: "tc-2-5",
          name: "Correct refactoring",
          input: "Review: Changed `if (x == null)` to `if (x === null || x === undefined)` and added unit tests.",
          expectedOutput:
            "Should recognize this as a valid improvement (strict equality). Should note that `x == null` is actually equivalent in JS, so the change is redundant but harmless.",
          category: "correctness",
        },
      ],
    },
    {
      id: "suite-3",
      name: "Data Extraction Agent",
      description:
        "Evaluates an agent that extracts structured data from unstructured text (invoices, receipts, emails).",
      agentType: "extraction",
      cases: [
        {
          id: "tc-3-1",
          name: "Invoice total extraction",
          input: "Invoice #INV-2024-001\nDate: March 15, 2026\nSubtotal: $1,250.00\nTax (8.5%): $106.25\nShipping: $15.00\nTOTAL DUE: $1,371.25",
          expectedOutput:
            "Should extract: invoice_number=INV-2024-001, date=2026-03-15, subtotal=1250.00, tax=106.25, shipping=15.00, total=1371.25",
          category: "invoice",
        },
        {
          id: "tc-3-2",
          name: "Receipt with discounts",
          input: "WALMART SUPERCENTER\n2x Organic Milk $4.99 ea = $9.98\n1x Bread $3.49\nMember Discount: -$2.00\nTOTAL: $11.47\nPaid: Visa ****1234",
          expectedOutput:
            "Should extract: store=Walmart, items=[milk x2 $9.98, bread x1 $3.49], discount=2.00, total=11.47, payment=Visa ending 1234",
          category: "receipt",
        },
        {
          id: "tc-3-3",
          name: "Email action items",
          input: "Hey team, following up on yesterday's meeting. @Sarah please send the Q4 report by Friday. @Mike we need the API docs updated before the 20th. Let's sync again next Tuesday at 2pm.",
          expectedOutput:
            "Should extract action_items: [{assignee: Sarah, task: send Q4 report, deadline: Friday}, {assignee: Mike, task: update API docs, deadline: 20th}], next_meeting: next Tuesday 2pm",
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
      suiteName: "Customer Support Agent",
      timestamp: new Date(now).toISOString(),
      results: [
        {
          testCaseId: "tc-1-1",
          actualOutput:
            "I'm sorry to hear about the double charge on your order #12345. I can see both $49.99 charges in our system. I've initiated a refund for the duplicate charge. You should see it back on your original payment method within 3-5 business days. Could you confirm if you paid with Visa ending in 4532?",
          passed: true,
          score: 0.92,
          latencyMs: 1240,
          tokenCost: 0.0034,
        },
        {
          testCaseId: "tc-1-2",
          actualOutput:
            "Our standard return window is 30 days, and your purchase is at 35 days. However, since the product is still sealed, you may qualify for an exception. Let me connect you with a specialist who can review this manually. Could you share the order number?",
          passed: true,
          score: 0.88,
          latencyMs: 980,
          tokenCost: 0.0028,
        },
        {
          testCaseId: "tc-1-3",
          actualOutput:
            "I apologize for the delay with your order #67890. I've checked and it appears your package is stuck at a sorting facility. I can either: 1) Contact the carrier for an urgent update, 2) Ship a replacement immediately at no cost, or 3) Issue a full refund. Which would you prefer?",
          passed: true,
          score: 0.95,
          latencyMs: 1580,
          tokenCost: 0.0041,
        },
        {
          testCaseId: "tc-1-4",
          actualOutput:
            "I'm sorry about the cracked screen. Please upload photos of the damage through this link: [upload]. Once we receive them, we'll process a replacement immediately. Would you like the replacement shipped to the same address?",
          passed: false,
          score: 0.55,
          latencyMs: 890,
          tokenCost: 0.0025,
          error: "Missing empathy statements. Did not explain damage claim process fully. Should mention warranty coverage.",
        },
        {
          testCaseId: "tc-1-5",
          actualOutput:
            "I can help cancel your Premium subscription. Your subscription will be cancelled effective immediately and you won't be charged again. Your access will continue until the end of your current billing period (May 31, 2026). May I ask why you're cancelling so we can improve?",
          passed: true,
          score: 0.91,
          latencyMs: 1120,
          tokenCost: 0.0031,
        },
        {
          testCaseId: "tc-1-6",
          actualOutput:
            "Let me check your order. I see that 3 of 5 items were delivered. The remaining 2 items were shipped separately and are currently in transit. Here are the tracking numbers: TK-111 for item 4 (arriving tomorrow), TK-112 for item 5 (arriving Thursday).",
          passed: true,
          score: 0.87,
          latencyMs: 1340,
          tokenCost: 0.0036,
        },
      ],
      summary: {
        total: 6,
        passed: 5,
        failed: 1,
        avgScore: 0.847,
        totalLatencyMs: 7150,
        totalTokenCost: 0.0195,
      },
      agentVersion: "v2.3.0",
      modelVersion: "claude-sonnet-4-6",
    },
    {
      id: "run-v2-2-0",
      suiteId: "suite-1",
      suiteName: "Customer Support Agent",
      timestamp: new Date(now - 86400000).toISOString(),
      results: [
        {
          testCaseId: "tc-1-1",
          actualOutput:
            "I see the double charge. I'll process a refund. Please allow 5-7 days.",
          passed: false,
          score: 0.35,
          latencyMs: 620,
          tokenCost: 0.0012,
          error: "Too brief, missing empathy, incorrect refund timeline, didn't ask for payment confirmation",
        },
        {
          testCaseId: "tc-1-2",
          actualOutput:
            "Our return policy is 30 days. Unfortunately we can't accept returns after that period.",
          passed: false,
          score: 0.25,
          latencyMs: 450,
          tokenCost: 0.0009,
          error: "Dismissive, didn't mention exception process for sealed items, didn't offer escalation path",
        },
        {
          testCaseId: "tc-1-3",
          actualOutput:
            "Your tracking shows the package is still in transit. Please wait a few more days.",
          passed: false,
          score: 0.3,
          latencyMs: 580,
          tokenCost: 0.0011,
          error: "Dismissive, didn't investigate, didn't offer resolution options, no apology",
        },
        {
          testCaseId: "tc-1-4",
          actualOutput:
            "Please send photos of the cracked screen and we'll look into it.",
          passed: false,
          score: 0.28,
          latencyMs: 380,
          tokenCost: 0.0008,
          error: "Minimal empathy, no clear process explanation, didn't offer immediate options",
        },
        {
          testCaseId: "tc-1-5",
          actualOutput:
            "Your Premium subscription has been cancelled. Is there anything else?",
          passed: false,
          score: 0.4,
          latencyMs: 520,
          tokenCost: 0.001,
          error: "Too brief, didn't confirm effective date or billing period access, didn't ask for reason",
        },
        {
          testCaseId: "tc-1-6",
          actualOutput:
            "The remaining items should arrive soon. Check your tracking.",
          passed: false,
          score: 0.2,
          latencyMs: 440,
          tokenCost: 0.0009,
          error: "Vague response, didn't verify order details, no specific tracking info, dismissive tone",
        },
      ],
      summary: {
        total: 6,
        passed: 0,
        failed: 6,
        avgScore: 0.297,
        totalLatencyMs: 2990,
        totalTokenCost: 0.0059,
      },
      agentVersion: "v2.2.0",
      modelVersion: "claude-haiku-4-5",
    },
    {
      id: "run-code-v1-1",
      suiteId: "suite-2",
      suiteName: "Code Review Agent",
      timestamp: new Date(now - 3600000).toISOString(),
      results: [
        {
          testCaseId: "tc-2-1",
          actualOutput:
            "CRITICAL: SQL Injection vulnerability detected. The code concatenates user input directly into the SQL query. An attacker could inject malicious SQL via `req.params.id`. Fix: Use parameterized queries - `db.query('SELECT * FROM users WHERE id = ?', [req.params.id])`",
          passed: true,
          score: 0.96,
          latencyMs: 2100,
          tokenCost: 0.0052,
        },
        {
          testCaseId: "tc-2-2",
          actualOutput:
            "Warning: Missing error handling and null check. If `User.findById(id)` returns null (user not found), accessing `user.name` will throw TypeError. Suggested fix: Add null check and try/catch block.",
          passed: true,
          score: 0.89,
          latencyMs: 1800,
          tokenCost: 0.0044,
        },
        {
          testCaseId: "tc-2-3",
          actualOutput:
            "Performance issue: Sequential awaits in a loop (N+1 pattern). Each fetch waits for the previous one to complete. Use `Promise.all(ids.map(id => fetch(...)))` for parallel execution, or implement a batch endpoint.",
          passed: true,
          score: 0.93,
          latencyMs: 1650,
          tokenCost: 0.0041,
        },
        {
          testCaseId: "tc-2-4",
          actualOutput:
            "CRITICAL SECURITY: Hardcoded AWS secret key detected. This is a severe security vulnerability. Never commit credentials to source code. Move to environment variables or use AWS Secrets Manager.",
          passed: true,
          score: 0.98,
          latencyMs: 1200,
          tokenCost: 0.0038,
        },
        {
          testCaseId: "tc-2-5",
          actualOutput:
            "Note: The change from `x == null` to `x === null || x === undefined` is technically equivalent in JavaScript. `x == null` is the only case where `==` checks for both null and undefined. The change is safe but redundant. Good that tests were added.",
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
        avgScore: 0.94,
        totalLatencyMs: 8650,
        totalTokenCost: 0.0223,
      },
      agentVersion: "v1.1.0",
      modelVersion: "claude-sonnet-4-6",
    },
    {
      id: "run-extract-v1-0",
      suiteId: "suite-3",
      suiteName: "Data Extraction Agent",
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
          actualOutput: `{"store":"Walmart","items":[{"name":"Organic Milk","quantity":2,"price":9.98},{"name":"Bread","quantity":1,"price":3.49}],"discount":2.00,"total":11.47,"payment":{"type":"Visa","last4":"1234"}}`,
          passed: true,
          score: 0.92,
          latencyMs: 1380,
          tokenCost: 0.0036,
        },
        {
          testCaseId: "tc-3-3",
          actualOutput: `{"action_items":[{"assignee":"Sarah","task":"send Q4 report","deadline":"Friday"},{"assignee":"Mike","task":"update API docs","deadline":"20th"}],"next_meeting":"next Tuesday 2pm"}`,
          passed: true,
          score: 0.94,
          latencyMs: 1220,
          tokenCost: 0.0033,
        },
      ],
      summary: {
        total: 3,
        passed: 3,
        failed: 0,
        avgScore: 0.943,
        totalLatencyMs: 4050,
        totalTokenCost: 0.0108,
      },
      agentVersion: "v1.0.0",
      modelVersion: "claude-sonnet-4-6",
    },
  ];
}
