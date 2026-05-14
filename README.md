# AgentBench — AI Agent EvalOps Platform

[English](README.md) | [中文](README.zh.md)

> Regression testing, drift detection, and quality assurance for AI agents.
> **Built entirely with Claude Code** — AI coding as both the means and the product.

> ⚠️ **Naming Notice**: This project is **not affiliated** with [THUDM/AgentBench](https://github.com/THUDM/AgentBench), the academic benchmark for evaluating LLM-as-Agent capabilities from Tsinghua University. The name collision is unintentional. If you are looking for the research benchmark (OS, Database, Knowledge Graph, WebShop, etc.), please visit the [THUDM repository](https://github.com/THUDM/AgentBench). This repo is an independent **EvalOps dashboard** for teams to regression-test their own AI agents.

## What It Does

AgentBench is an EvalOps platform that helps teams ship reliable AI agents by providing:

- **Test Suite Management** — Define test cases with inputs and expected outputs for your AI agents
- **Regression Testing** — Run evaluations and track quality across agent versions
- **Version Comparison** — Side-by-side diff between runs to catch regressions before deployment
- **AI-Powered Analysis** — Claude analyzes failures and suggests fixes

## Why This Project?

This project was selected from 45+ daily opportunity reports as the most validated hackathon idea:

1. **EvalOps/Agent regression testing** appeared **12+ times** across 46 days of opportunity analysis — the single most recurring theme
2. It perfectly embodies "AI coding as both means and product": we use AI (Claude Code) to build a platform that tests AI agents
3. The "testing AI with AI" paradigm is both technically interesting and commercially relevant as agents enter production

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19** + TypeScript
- **Tailwind CSS 4** — Dark theme dashboard UI
- **Claude API** — AI-powered analysis of test failures

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

### With Claude API (optional)

Set your Anthropic API key for AI-powered analysis:

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run dev
```

Without the API key, the app uses built-in demo analysis.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard with metrics, test suites overview, and recent runs |
| `/suites` | Test suite management with expandable test case details |
| `/compare` | Side-by-side regression analysis between two agent versions |
| `/run/[id]` | Detailed test run results with expandable case analysis |

## Architecture

```
src/
├── app/
│   ├── page.tsx          # Dashboard
│   ├── layout.tsx        # Root layout with sidebar
│   ├── globals.css       # Dark theme styles
│   ├── suites/page.tsx   # Test suite management
│   ├── compare/page.tsx  # Version comparison
│   ├── run/[id]/page.tsx # Run detail view
│   └── api/analyze/route.ts  # Claude API integration
├── components/
│   ├── Sidebar.tsx       # Navigation sidebar
│   ├── StatusBadge.tsx   # Pass/fail/warning badges
│   └── MetricCard.tsx    # Dashboard metric cards
└── lib/
    ├── types.ts          # TypeScript type definitions
    └── demo-data.ts      # Demo data with 3 test suites and runs
```

## FAQ

### Is this the same AgentBench from Tsinghua University (THUDM)?

**No.** This is an independent project created during a hackathon. The name collision is unintentional.

| | THUDM/AgentBench | This Project |
|---|---|---|
| **Purpose** | Academic benchmark to compare LLMs as agents | EvalOps dashboard for teams to regression-test their own agents |
| **Target User** | AI researchers & model developers | Engineering teams & product managers |
| **What it tests** | 8 generic environments (OS, DB, WebShop, etc.) | Your own agent's test suites (support, code review, extraction, etc.) |
| **Output** | Leaderboard & research paper data | Regression reports & quality trends |
| **Stack** | Python + Docker + conda | Next.js + React + TypeScript |

If you need the academic benchmark, go to [github.com/THUDM/AgentBench](https://github.com/THUDM/AgentBench).

## License

MIT — see [LICENSE](./LICENSE).

## Hackathon Pitch

**The Problem:** Teams deploying AI agents have no reliable way to detect quality regressions when they change prompts, models, or tools. A single prompt tweak can silently break downstream behavior.

**The Solution:** AgentBench provides a CI-friendly regression testing framework for AI agents — define golden test cases, run evaluations on every change, and catch regressions before they reach production.

**The Meta:** This entire project was built by an AI (Claude Code) in a single session, testing the very premise that AI coding can produce production-quality developer tools.
