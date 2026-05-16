"""从 CC Switch SQLite 数据库分析 Claude Code 使用情况"""
import sqlite3
import os
import sys

# Force UTF-8 on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cc-switch.db")

def n(val, fmt=",.0f"):
    """Format a possibly-None number"""
    if val is None:
        return "N/A"
    return f"{val:{fmt}}"

def analyze():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    print("=" * 60)
    print("  CC Switch -- Claude Code 使用分析")
    print("=" * 60)

    # 1. 总览
    total = conn.execute("SELECT COUNT(*) as c FROM proxy_request_logs").fetchone()["c"]
    success = conn.execute(
        "SELECT COUNT(*) as c FROM proxy_request_logs WHERE status_code=200"
    ).fetchone()["c"]
    fail = total - success

    total_cost = conn.execute(
        "SELECT SUM(total_cost_usd) as c FROM proxy_request_logs WHERE total_cost_usd > 0"
    ).fetchone()["c"] or 0

    total_input = conn.execute(
        "SELECT SUM(input_tokens) as c FROM proxy_request_logs"
    ).fetchone()["c"] or 0
    total_output = conn.execute(
        "SELECT SUM(output_tokens) as c FROM proxy_request_logs"
    ).fetchone()["c"] or 0

    avg_latency = conn.execute(
        "SELECT AVG(latency_ms) as c FROM proxy_request_logs WHERE latency_ms > 0"
    ).fetchone()["c"] or 0

    print(f"\n[ 总览 ]")
    print(f"  总请求:     {total:,}")
    print(f"  成功:       {success:,}  ({success/total*100:.1f}%)")
    print(f"  失败:       {fail:,}")
    print(f"  总 Token:   {total_input + total_output:,}  (输入 {total_input:,} / 输出 {total_output:,})")
    print(f"  总费用:     ${total_cost:.4f}")
    print(f"  平均延迟:   {n(avg_latency)}ms")

    # 2. 按天统计
    print(f"\n[ 按天趋势 ]")
    daily = conn.execute("""
        SELECT
            date(created_at, 'unixepoch') as day,
            COUNT(*) as total,
            SUM(CASE WHEN status_code=200 THEN 1 ELSE 0 END) as success,
            ROUND(AVG(CASE WHEN latency_ms>0 THEN latency_ms END), 0) as avg_ms,
            ROUND(SUM(CASE WHEN total_cost_usd>0 THEN total_cost_usd ELSE 0 END), 4) as cost,
            SUM(input_tokens) as input_tok,
            SUM(output_tokens) as output_tok
        FROM proxy_request_logs
        WHERE app_type='claude'
        GROUP BY day
        ORDER BY day DESC
        LIMIT 14
    """).fetchall()

    for d in reversed(daily):
        rate = d["success"]/d["total"]*100 if d["total"] else 0
        print(f"  {d['day']}  请求 {d['total']:>4}  成功率 {rate:>5.1f}%  "
              f"延迟 {n(d['avg_ms'], '>5.0f')}ms  费用 ${d['cost']:.4f}  "
              f"Token {d['input_tok']+d['output_tok']:>6,}")

    # 3. 按模型统计
    print(f"\n[ 按模型统计 ]")
    models = conn.execute("""
        SELECT
            COALESCE(NULLIF(model,''), 'unknown') as model,
            COUNT(*) as total,
            SUM(CASE WHEN status_code=200 THEN 1 ELSE 0 END) as success,
            ROUND(AVG(CASE WHEN latency_ms>0 THEN latency_ms END), 0) as avg_ms,
            ROUND(SUM(CASE WHEN total_cost_usd>0 THEN total_cost_usd ELSE 0 END), 6) as cost
        FROM proxy_request_logs
        WHERE app_type='claude'
        GROUP BY model
        ORDER BY total DESC
    """).fetchall()

    for m in models:
        rate = m["success"]/m["total"]*100 if m["total"] else 0
        print(f"  {m['model']:<25}  请求 {m['total']:>5}  成功率 {rate:>5.1f}%  "
              f"延迟 {n(m['avg_ms'], '>5.0f')}ms  费用 ${m['cost']:.4f}")

    # 4. 最近错误
    errors = conn.execute("""
        SELECT error_message, COUNT(*) as cnt
        FROM proxy_request_logs
        WHERE error_message IS NOT NULL AND error_message != ''
        GROUP BY error_message
        ORDER BY cnt DESC
        LIMIT 5
    """).fetchall()

    if errors:
        print(f"\n[ 常见错误 ]")
        for e in errors:
            msg = e["error_message"][:80]
            print(f"  [{e['cnt']}次] {msg}")

    # 5. 会话数量
    sessions = conn.execute("""
        SELECT COUNT(DISTINCT session_id) as c FROM proxy_request_logs WHERE app_type='claude'
    """).fetchone()["c"]
    print(f"\n[ 会话总数 ] {sessions}")

    # 6. 缓存命中
    cache_hit = conn.execute(
        "SELECT SUM(cache_read_tokens) as c FROM proxy_request_logs"
    ).fetchone()["c"] or 0
    if cache_hit > 0:
        pct = cache_hit / (total_input + cache_hit) * 100
        print(f"[ 缓存命中 ] {cache_hit:,} Token  ({pct:.1f}% 无需重新计算)")

    conn.close()
    print("\n" + "=" * 60)

if __name__ == "__main__":
    analyze()
