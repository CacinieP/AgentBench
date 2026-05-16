/**
 * 重新计算种子数据的分数。
 * 用法: npx tsx --cwd . scripts/recalc-seed-scores.ts
 *
 * 此脚本会：
 * 1. 加载种子数据的测试套件和运行记录
 * 2. 对每条 actualOutput 运行 contains 评测器（默认评测器）
 * 3. 用真实评测分数替换手工编写的虚构分数
 * 4. 输出更新后的 seed-data.ts 代码
 */
import { evaluate, buildTestResult } from "../src/lib/evaluator";
import { createSeedSuites, createSeedRuns } from "../src/lib/seed-data";
import type { EvaluatorConfig, TestRun } from "../src/lib/types";

const DEFAULT_EVALUATOR: EvaluatorConfig = { type: "contains", threshold: 0.6 };

function recalcRuns(): TestRun[] {
  const suites = createSeedSuites();
  const runs = createSeedRuns();

  return runs.map((run) => {
    const suite = suites.find((s) => s.id === run.suiteId);
    if (!suite) return run;

    const results = run.results.map((r) => {
      const tc = suite.cases.find((c) => c.id === r.testCaseId);
      if (!tc) return r;

      const evalOutput = evaluate(r.actualOutput, tc.expectedOutput, DEFAULT_EVALUATOR);
      const result = buildTestResult(
        r.testCaseId,
        r.actualOutput,
        evalOutput,
        r.latencyMs,
        r.tokenCost
      );

      return result;
    });

    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = total - passed;
    const avgScore = total > 0
      ? Math.round(results.reduce((s, r) => s + r.score, 0) / total * 1000) / 1000
      : 0;
    const totalLatencyMs = results.reduce((s, r) => s + r.latencyMs, 0);
    const totalTokenCost = Math.round(results.reduce((s, r) => s + r.tokenCost, 0) * 10000) / 10000;

    return {
      ...run,
      results,
      summary: { total, passed, failed, avgScore, totalLatencyMs, totalTokenCost },
    };
  });
}

// Print updated runs as JSON
const runs = recalcRuns();
console.log(JSON.stringify(runs, null, 2));
