# Changelog

## [0.5.0] — 2026-05-16 · 全面中文本地化

### 本地化
- **应用页面**：面板、测试套件、对比运行、运行详情、设置页面全部中文化
- **组件**：StatusBadge（通过/失败/警告/运行中）、RunSimulation（准备运行/开始运行/运行完成/再次运行）、CreateSuiteModal（新建测试套件/用例/评测器选择）
- **种子数据**：3 个测试套件名称、描述、用例输入/预期输出、运行结果输出全部翻译
- **演示数据**：AI 分析摘要、回归模式、修复建议中文化
- **评测器**：LLM 评判提示词、所有评测理由字符串（精确匹配/部分匹配/关键短语匹配/正则/Schema 等）中文化
- **Agent 适配器**：所有错误消息中文化
- **API 路由**：execute 和 analyze 端点的提示词、演示响应和错误消息中文化
- **工具函数**：formatRelativeTime 输出中文化（刚刚/N分钟前/N小时前/N天前）
- **测试文件**：utils.test.ts 和 evaluator.test.ts 的期望值同步更新

### 技术细节
- 修复 demo-data.ts 中中文引号导致的 TypeScript 解析错误
- 所有 59 个测试通过，零 TS 错误，生产构建成功

---

## [0.4.0] — 2026-05-16 · Iteration 3: Testing, Accessibility & Deliverables

### Added

- **`utils.test.ts`** — 14 new tests covering `formatRelativeTime` (5 variants), `scoreColor` (3 tiers), `scoreBg` (3 tiers), and `passRateColor` (3 tiers). Total test coverage now spans pure utilities.
- **`agent-adapter.test.ts`** — 10 new tests covering `extractByPath` (nested objects, missing paths, null intermediates, array indices, value stringification, null leaves) and `estimateCost` (fallback, openai_chat, anthropic_messages, custom_http rates).
- **Accessibility labels**: Added `aria-label` attributes to interactive elements — suite delete buttons, run test buttons, run delete button, and all navigation links in the sidebar.

### Changed

- **`agent-adapter.ts`**: Exported previously-internal `extractByPath` and `estimateCost` functions to enable direct unit testing.

### Verification

- **Test count grew from 35 → 59** (3 test files, 59 tests total)
- Zero TypeScript errors, zero ESLint warnings, production build compiles cleanly

---

## [0.3.0] — 2026-05-16 · Iteration 2: UX Interactions

### Added

- **Escape key closes modals** (`src/components/CreateSuiteModal.tsx`): Pressing Escape now closes the Create Suite modal, matching standard modal UX expectations. Uses a `useEffect` with `"keydown"` listener that fires on any `Escape` keypress.
- **Escape key closes compare pickers** (`src/app/compare/page.tsx`): Both baseline and candidate version picker dropdowns now close on Escape key press.
- **Click-outside closes pickers** (`src/app/compare/page.tsx`): Clicking anywhere outside the version picker dropdowns now closes them, using `mousedown` listener with ref-based boundary detection.

### Changed

- **`CreateSuiteModal` hooks order fixed** (`src/components/CreateSuiteModal.tsx`): `useEffect` was previously called after an early `return null`, creating a conditional hook call violating React's rules-of-hooks. Now `useEffect` runs unconditionally with the `open` guard inside the effect body. `handleClose` converted to `useCallback` for correct hook dependency tracking.
- **Delete confirmation dialogs** (from 0.2.0) also support Escape-to-close and click-outside-to-close via the same modal overlay pattern.

---

## [0.2.0] — 2026-05-16 · Iteration 1: Missing CRUD Operations

### Added

- **Delete suite button** (`src/app/suites/page.tsx`): Each suite card now has a delete (trash) button. Clicking it opens a confirmation dialog that warns the deletion is permanent and includes all associated run history. Previously, deleting a suite was only possible via Settings → Clear All Data.
- **Delete run button** (`src/app/run/[id]/page.tsx`): Run detail page header now includes a delete button. Confirmation dialog appears before deletion. On confirm, the run is deleted and the user is redirected to the dashboard.
- **Confirmation dialogs**: Both delete operations use a modal with backdrop overlay and click-outside-to-close behavior, preventing accidental data loss.

### Changed

- `suites/page.tsx`: Added `Trash2` icon import, `deleteSuite` from context, `deleteConfirmId` state, and `handleDeleteSuite`/`confirmDelete` handlers.
- `run/[id]/page.tsx`: Added `Trash2` icon import, `deleteRun` from context, `showDeleteConfirm` state, and delete button in header.

---

## [0.1.1] — 2026-05-16

### Fixed

- **Sidebar active-state bug** (`src/components/Sidebar.tsx:41`): When viewing `/run/[id]`, the `isActive` function incorrectly highlighted ALL navigation items due to an unconditional `pathname.startsWith("/run")` check. Now only the "Test Suites" item is highlighted for run detail pages.

- **`ensureSeeded()` side-effect in React snapshots** (`src/lib/data-context.tsx`): The seed data initialization was called inside `getSuitesSnapshot()` and `getRunsSnapshot()`, causing localStorage writes during React's render-phase snapshot reads. This violated React's concurrent rendering contract. Seed initialization is now performed in a `useEffect` on first mount.

- **RunSimulation callback identity** (`src/app/suites/page.tsx`): The `handleSimComplete` callback created a new function on every call via curry (`handleSimComplete(suite.id)`), making the `useCallback` wrapping ineffective. Now uses refs (`suitesRef`, `addRunRef`) so the callback is stable with an empty dependency array.

- **Compare page picker overflow** (`src/app/compare/page.tsx`): The baseline and candidate version picker dropdowns used `left-1/2 -translate-x-1/2` centering, which could clip the dropdown off-screen on narrow viewports. Baseline picker now anchors `left-0`, candidate picker anchors `right-0`.

- **Inconsistent score color thresholds** (`src/app/suites/page.tsx`, `src/components/Sidebar.tsx`): Two components had inline score-to-color threshold logic (using 0.7/0.4 boundaries) that diverged from the canonical `scoreColor()` utility (0.8/0.5 boundaries) in `src/lib/utils.ts`. Both now use the shared utility.

- **Turbopack root warning**: The build produced a warning about workspace root detection from multiple lockfiles. Fixed by setting `turbopack.root` in `next.config.ts`.

- **TypeScript target**: Bumped `compilerOptions.target` from `ES2017` to `ES2020` to support optional chaining and nullish coalescing syntax used in the codebase.

### Changed

- **Extracted shared `useLocalStorage` hook** (`src/lib/use-local-storage.ts`): The localStorage pub-sub listener pattern was duplicated in `data-context.tsx` (90 lines) and `settings-context.tsx` (35 lines). Extracted into a single module with `useLocalStorage(key, fallback)`, `readFromStorage<T>(key)`, `writeToStorage<T>(key, value)`, and `notifyStorageChange()` exports.

- **`data-context.tsx`**: Refactored to use the shared `useLocalStorage` hook. The custom listener management and snapshot functions have been removed in favor of the shared implementation.

- **`settings-context.tsx`**: Refactored to use the shared `useLocalStorage` hook. The custom listener set and `useSyncExternalStore` boilerplate have been removed.

### Verification

- All 35 unit tests pass (`vitest run`)
- Production build compiles with zero TypeScript errors and zero warnings
- All 7 pages and 2 API routes generate successfully
