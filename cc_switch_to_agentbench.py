"""从 CC Switch 的 JSONL 会话文件中提取编程任务并导出为 AgentBench 测试套件格式

原理：
  CC Switch 的 proxy_request_logs 不存请求/响应体，但 session_log_sync 表记录了
  Claude Code 的 JSONL 会话文件路径。这些 JSONL 文件包含完整的对话：用户提示词和
  Claude 的回复（包括思考过程、工具调用、最终文本回复）。

  本脚本遍历所有 JSONL 会话文件，提取编程任务（用户提示词）和 Claude 的最终回复，
  筛选出编程相关的对话，导出为可直接导入 AgentBench 的 JSON 测试套件。

使用方法：
  python cc_switch_to_agentbench.py
  # 输出: cc_switch_coding_suites.json — 可直接导入 AgentBench（设置 → 导入 JSON）
"""

import sqlite3
import os
import sys
import json
import re
import hashlib
from datetime import datetime, timezone, timedelta

# Force UTF-8 on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cc-switch.db")
OUTPUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cc_switch_coding_suites.json")

# Coding-related keywords to filter prompts
CODING_KEYWORDS = [
    # Chinese
    "修复", "实现", "添加", "重构", "优化", "创建", "编写", "调试",
    "代码", "bug", "错误", "测试", "函数", "组件", "接口", "API",
    "react", "next", "typescript", "python", "组件", "页面", "路由",
    "部署", "构建", "配置", "数据库", "查询", "性能", "安全",
    "review", "审查", "检查", "修改", "改进", "升级", "迁移",
    # English
    "fix", "implement", "add", "refactor", "create", "build", "code",
    "function", "component", "test", "api", "endpoint", "feature",
    "bug", "error", "issue", "deploy", "config", "setup", "update",
    "migrate", "optimize", "debug", "clean", "remove", "change",
]

def is_coding_prompt(text: str) -> bool:
    """Check if a prompt is coding-related"""
    text_lower = text.lower()
    for kw in CODING_KEYWORDS:
        if kw.lower() in text_lower:
            return True
    return False

def extract_conversations_from_jsonl(filepath: str) -> list:
    """
    Extract meaningful conversation pairs (user prompt → assistant final answer).

    Claude Code JSONL format:
      - type="user" with "message" and no "toolUseResult" → user prompt
        content is in data["message"]["content"] (string)
      - type="user" with "toolUseResult" → tool result (skip)
      - type="assistant" with "message" → assistant response
        content is in data["message"]["content"] (list of blocks)
        text blocks have type="text" with "text" field
    """
    conversations = []
    current_prompt = None

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue

                etype = entry.get("type", "")

                # User prompt: type=user, has message, NOT a tool result
                if etype == "user" and "message" in entry and "toolUseResult" not in entry:
                    content = entry["message"].get("content", "")
                    if isinstance(content, str) and len(content.strip()) > 15:
                        stripped = content.strip()
                        # Filter out slash commands, Claude Code internal XML, and suggestion mode
                        skip_prefixes = [
                            "<command-name>",
                            "<task-notification>",
                            "<system-reminder>",
                            "[SUGGESTION MODE",
                            "/goal",
                            "/review",
                            "/help",
                            "/clear",
                            "/compact",
                            "/config",
                            "/cost",
                            "/doctor",
                            "/export",
                            "/feedback",
                            "/init",
                            "/install-github-app",
                            "/login",
                            "/logout",
                            "/pr-comments",
                            "/release-notes",
                            "/resume",
                            "/review-pr",
                            "/statusline",
                            "/terminal-setup",
                            "/upgrade",
                            "/vim",
                            "/workspace",
                            "/agents",
                            "/tasks",
                            "/agents",
                            "/memory",
                        ]
                        if not any(stripped.startswith(p) for p in skip_prefixes):
                            current_prompt = stripped

                # Assistant response: type=assistant, has message
                elif etype == "assistant" and current_prompt and "message" in entry:
                    msg_content = entry["message"].get("content")
                    if not isinstance(msg_content, list):
                        continue

                    # Collect text blocks (skip thinking and tool_use)
                    texts = []
                    for block in msg_content:
                        if isinstance(block, dict) and block.get("type") == "text":
                            t = block.get("text", "")
                            if isinstance(t, str) and len(t.strip()) > 5:
                                texts.append(t.strip())

                    if texts:
                        full_response = " ".join(texts)
                        conversations.append({
                            "prompt": current_prompt,
                            "response": full_response,
                        })
                        current_prompt = None  # Reset

    except Exception:
        pass

    return conversations

def sanitize_name(text: str, max_len: int = 60) -> str:
    """Create a short, clean name from prompt text"""
    # Remove newlines and excessive whitespace
    name = re.sub(r'\s+', ' ', text)
    # Take first meaningful sentence
    if len(name) > max_len:
        name = name[:max_len].rsplit(' ', 1)[0] + "..."
    return name

def build_test_case(prompt: str, response: str, index: int) -> dict:
    """Build an AgentBench test case from a prompt-response pair"""
    short_id = hashlib.md5(prompt.encode()).hexdigest()[:8]
    return {
        "id": f"cc-{short_id}",
        "name": sanitize_name(prompt),
        "input": prompt,
        "expectedOutput": response,
        "category": "coding",
        "evaluator": {
            "type": "contains",
            "threshold": 0.3,  # Low threshold since we're testing for coding-relevant content
            "caseInsensitive": True,
        },
    }

def main():
    print("=" * 60)
    print("  CC Switch → AgentBench 测试套件导出")
    print("=" * 60)

    # 1. Get all JSONL session files from CC Switch
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    session_files = conn.execute(
        "SELECT file_path FROM session_log_sync ORDER BY last_modified DESC"
    ).fetchall()
    conn.close()

    print(f"\n找到 {len(session_files)} 个会话文件")

    # Also check for the current conversation's JSONL
    # Add Claude Code project directories
    claude_projects = os.path.join(os.path.dirname(os.path.abspath(__file__)), "claude-projects")
    all_jsonl = []
    if os.path.isdir(claude_projects):
        for root, dirs, files in os.walk(claude_projects):
            for f in files:
                if f.endswith(".jsonl"):
                    all_jsonl.append(os.path.join(root, f))

    # Merge and deduplicate
    tracked_files = set(row["file_path"] for row in session_files)
    for f in all_jsonl:
        tracked_files.add(f)

    print(f"去重后共 {len(tracked_files)} 个唯一会话文件")

    # 2. Extract conversations from all JSONL files
    all_conversations = []
    coding_files = 0
    for filepath in tracked_files:
        if not os.path.isfile(filepath):
            continue
        conversations = extract_conversations_from_jsonl(filepath)
        file_has_coding = False
        for conv in conversations:
            if is_coding_prompt(conv["prompt"]):
                all_conversations.append(conv)
                file_has_coding = True
        if file_has_coding:
            coding_files += 1

    print(f"\n提取到 {len(all_conversations)} 个编程相关对话（来自 {coding_files} 个文件）")

    if not all_conversations:
        print("\n未找到编程相关对话，尝试放宽筛选条件...")
        # Fallback: take all conversations
        for filepath in tracked_files:
            if not os.path.isfile(filepath):
                continue
            conversations = extract_conversations_from_jsonl(filepath)
            all_conversations.extend(conversations)
        print(f"放宽后共 {len(all_conversations)} 个对话")

    if not all_conversations:
        print("无法提取任何对话，请检查会话文件路径。")
        return

    # 3. Group by coding task similarity (simple: group by first 20 chars)
    # Remove near-duplicates
    seen_prompts = set()
    unique = []
    for conv in all_conversations:
        key = conv["prompt"][:50].lower().strip()
        if key not in seen_prompts and len(conv["response"]) > 20:
            seen_prompts.add(key)
            unique.append(conv)

    print(f"去重后 {len(unique)} 个唯一对话")

    # Limit to top 20 to keep suite manageable
    unique = unique[:20]

    # 4. Build test suites
    beijing_tz = timezone(timedelta(hours=8))
    now = datetime.now(beijing_tz).strftime("%Y-%m-%d %H:%M")

    # Group into suites by rough category
    suites = []
    suite_cases = []
    for i, conv in enumerate(unique):
        tc = build_test_case(conv["prompt"], conv["response"], i)
        suite_cases.append(tc)

    # Create one suite with all cases
    suite_id = "cc-switch-coding"
    suites.append({
        "id": suite_id,
        "name": "CC Switch 编程任务回归",
        "description": f"从 {coding_files} 个 Claude Code 会话中提取的 {len(suite_cases)} 个编程任务，"
                       f"用于回归测试编码 Agent 表现。导出时间: {now}",
        "agentType": "代码审查",
        "cases": suite_cases,
    })

    # Also create separate suites for different task types
    bug_fix_cases = []
    feature_cases = []
    refactor_cases = []
    other_cases = []

    for conv in unique:
        prompt_lower = conv["prompt"].lower()
        tc = build_test_case(conv["prompt"], conv["response"], 0)
        if any(kw in prompt_lower for kw in ["修复", "bug", "fix", "错误", "error"]):
            bug_fix_cases.append(tc)
        elif any(kw in prompt_lower for kw in ["实现", "添加", "创建", "implement", "add", "create", "feature", "新增"]):
            feature_cases.append(tc)
        elif any(kw in prompt_lower for kw in ["重构", "优化", "refactor", "optimize", "改进"]):
            refactor_cases.append(tc)
        else:
            other_cases.append(tc)

    if bug_fix_cases:
        suites.append({
            "id": "cc-switch-bugfix",
            "name": "CC Switch Bug 修复回归",
            "description": f"Bug 修复相关编程任务，共 {len(bug_fix_cases)} 个用例",
            "agentType": "代码审查",
            "cases": bug_fix_cases,
        })
    if feature_cases:
        suites.append({
            "id": "cc-switch-feature",
            "name": "CC Switch 功能实现回归",
            "description": f"新功能实现相关编程任务，共 {len(feature_cases)} 个用例",
            "agentType": "代码审查",
            "cases": feature_cases,
        })
    if refactor_cases:
        suites.append({
            "id": "cc-switch-refactor",
            "name": "CC Switch 重构优化回归",
            "description": f"重构和优化相关编程任务，共 {len(refactor_cases)} 个用例",
            "agentType": "代码审查",
            "cases": refactor_cases,
        })
    if other_cases:
        suites.append({
            "id": "cc-switch-other",
            "name": "CC Switch 其他任务回归",
            "description": f"其他类型编程任务，共 {len(other_cases)} 个用例",
            "agentType": "其他",
            "cases": other_cases,
        })

    # 5. Export JSON
    output = {
        "exportVersion": "1.0",
        "exportedAt": now,
        "source": "CC Switch SQLite → JSONL 会话提取",
        "totalConversationsScanned": len(all_conversations),
        "codingFilesFound": coding_files,
        "suites": suites,
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n[ 导出完成 ]")
    print(f"  输出文件: {OUTPUT_PATH}")
    print(f"  测试套件: {len(suites)}")
    for s in suites:
        print(f"    - {s['name']}: {len(s['cases'])} 个用例")
    print()
    print("  导入方式：AgentBench → 设置 → 导入 JSON / JSONL")

if __name__ == "__main__":
    main()
