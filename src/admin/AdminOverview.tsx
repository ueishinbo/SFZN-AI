import { ArrowUpRight, Download } from "lucide-react";
import { actions, download, useRoleStore } from "../role-center/store";
import { Badge, Empty } from "../role-center/ui";
import type { AdminPageId } from "./mockAdminData";
export default function AdminOverview({
  onNavigate,
}: {
  onNavigate: (page: AdminPageId) => void;
}) {
  const s = useRoleStore();
  const pending = s.approvals.filter((a) => a.status === "待审批"),
    suggestions = s.suggestions.filter((v) => v.status === "待处理");
  const metrics = [
    ["已发布岗位", s.roles.filter((r) => r.published && !r.disabled).length],
    ["可用能力", s.resources.filter((r) => r.active).length],
    ["待审批事项", pending.length],
    ["运行记录", s.runs.length],
  ];
  return (
    <div className="rc rc-shell">
      <div className="rc-heading">
        <div>
          <h1>平台概览</h1>
          <p>岗位发布、资源可用性与运行治理</p>
        </div>
        <button
          onClick={() => {
            actions.exportAudit("导出平台运行摘要");
            download(
              "平台运行摘要.json",
              JSON.stringify(
                {
                  metrics: Object.fromEntries(metrics),
                  pending: pending.map((a) => ({
                    title: a.title,
                    status: a.status,
                  })),
                  suggestions: suggestions.map((v) => ({
                    title: v.title,
                    status: v.status,
                  })),
                  resourceHealth: s.resources.map((r) => ({
                    name: r.name,
                    active: r.active,
                  })),
                },
                null,
                2,
              ),
            );
          }}
        >
          <Download size={15} />
          导出运行摘要
        </button>
      </div>
      <div
        className="rc-metrics"
        style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))" }}
      >
        {metrics.map(([label, n]) => (
          <article key={label}>
            <span>{label}</span>
            <b>{n}</b>
          </article>
        ))}
      </div>
      <div className="rc-grid">
        <section className="rc-section">
          <header>
            <h2>待处理事项</h2>
            <Badge tone="amber">{pending.length + suggestions.length} 项</Badge>
          </header>
          <div className="rc-stack">
            <button onClick={() => onNavigate("approvals")}>
              {pending.length} 项审批申请
              <ArrowUpRight size={15} />
            </button>
          </div>
        </section>
        <section className="rc-section">
          <header>
            <h2>资源可用性</h2>
            <Badge>
              {s.resources.every((r) => r.active) ? "资源可用" : "存在停用资源"}
            </Badge>
          </header>
          {[
            ["skill", "技能"],
            ["mcp", "MCP"],
            ["expert", "专家智能体"],
            ["model", "模型"],
          ].map(([kind, label]) => (
            <div className="rc-resource-row" key={kind}>
              <div>{label}</div>
              <strong>
                {s.resources.filter((r) => r.kind === kind && r.active).length}{" "}
                / {s.resources.filter((r) => r.kind === kind).length}
              </strong>
              <small>可用</small>
            </div>
          ))}
        </section>
      </div>
      <section className="rc-section" style={{ marginTop: 20 }}>
        <header>
          <h2>最近操作</h2>
          <button onClick={() => onNavigate("roleAgents")}>管理岗位</button>
        </header>
        <div className="rc-timeline">
          {s.audit.slice(0, 10).map((a) => (
            <article key={a.id}>
              <strong>{a.action}</strong>
              <p>{a.detail}</p>
              <small>
                {a.at} · {s.people.find((p) => p.id === a.by)?.name || a.by}
              </small>
            </article>
          ))}
          {!s.audit.length && <Empty title="暂无操作记录" />}
        </div>
      </section>
    </div>
  );
}
