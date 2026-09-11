import { useFeedback } from "./feedback";
import { useState } from "react";
import { ClipboardCheck, Search } from "lucide-react";
import { canApprove, roleDefinitionMarkdown, scopeLabels } from "./domain";
import { actions, useRoleStore } from "./store";
import { Badge, Dialog, Empty, Markdown, Notice, Summary } from "./ui";
export default function ApprovalCenter() {
  const store = useRoleStore();
  const [status, setStatus] = useState("待审批"),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState("");
  const rows = store.approvals.filter(
    (a) =>
      (!status || a.status === status) &&
      (!query ||
        `${a.title}${a.id}${store.people.find((p) => p.id === a.submitter)?.name}`.includes(
          query,
        )),
  );
  return (
    <div className="rc rc-shell">
      <div className="rc-heading">
        <div>
          <h1>审批中心</h1>
          <p>审核岗位发布与能力访问申请。</p>
        </div>
        <Badge tone="amber">
          {store.approvals.filter((a) => a.status === "待审批").length} 项待审批
        </Badge>
      </div>
      <div className="rc-toolbar">
        <label className="rc-search">
          <Search size={16} />
          <input
            placeholder="搜索申请、单号或提交人"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="审批状态"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">全部状态</option>
          {["待审批", "已通过", "已驳回", "已撤回"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <section className="rc-section">
        <div className="rc-table-wrap">
          <table>
            <thead>
              <tr>
                <th>审批事项</th>
                <th>提交人</th>
                <th>提交时间</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.title}</strong>
                    <p>
                      {a.id} · {a.roleId ? "岗位版本发布" : "能力访问授权"}
                    </p>
                  </td>
                  <td>
                    {store.people.find((p) => p.id === a.submitter)?.name}
                  </td>
                  <td>
                    <small>{a.at}</small>
                  </td>
                  <td>
                    <Badge>{a.status}</Badge>
                  </td>
                  <td>
                    <button
                      className="rc-link"
                      onClick={() => setSelected(a.id)}
                    >
                      查看审批
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <Empty title="当前没有符合条件的审批事项" />}
        </div>
      </section>
      {selected && (
        <ApprovalDetail id={selected} onClose={() => setSelected("")} />
      )}
    </div>
  );
}
export function ApprovalDetail({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const store = useRoleStore();
  const approval = store.approvals.find((a) => a.id === id);
  const [note, setNote] = useState(""),
    [content, setContent] = useState(false);
  const { perform, feedback } = useFeedback();
  if (!approval)
    return (
      <Dialog title="审批记录" onClose={onClose}>
        <Empty title="审批记录不存在" />
      </Dialog>
    );
  const can = canApprove(store, approval.submitter, approval.definition?.owner);
  const role = store.roles.find((r) => r.id === approval.roleId);
  const baseVersion =
    approval.baseVersion ??
    (approval.status === "已通过"
      ? role?.versions[
          role.versions.findIndex((v) => v.approvalId === approval.id) + 1
        ]?.version
      : role?.published?.version);
  const report = approval.evaluation;
  const suggestions = store.suggestions.filter(
    (s) => s.roleId === approval.roleId && s.draftVersion === approval.version,
  );
  return (
    <Dialog
      title={approval.title}
      onClose={onClose}
      wide
      footer={
        <>
          <button onClick={onClose}>关闭</button>
          {approval.status === "待审批" && (
            <>
              <button
                className="rc-danger"
                disabled={!can}
                onClick={() =>
                  perform(() => actions.decide(id, false, note), "审批已驳回")
                }
              >
                驳回申请
              </button>
              <button
                className="rc-primary"
                disabled={!can}
                onClick={() =>
                  perform(
                    () => actions.decide(id, true, note),
                    approval.roleId
                      ? "审批通过，新版本已发布"
                      : "已授予访问权限",
                  )
                }
              >
                <ClipboardCheck size={15} />
                {approval.roleId ? "通过并发布" : "批准访问"}
              </button>
            </>
          )}
        </>
      }
    >
      <div className="rc-stack">
        <div className="rc-actions">
          <Badge>{approval.status}</Badge>
          <small>
            {approval.id} · 提交人：
            {store.people.find((p) => p.id === approval.submitter)?.name} ·{" "}
            {approval.at}
          </small>
        </div>
        {approval.definition && (
          <>
            <Summary definition={approval.definition} />
            <div className="rc-grid">
              <div>
                <h3>发布影响</h3>
                <p>
                  {baseVersion
                    ? `${baseVersion} → ${approval.version}`
                    : "首次发布 → V1.0"}
                </p>
                <small>
                  可添加范围：
                  {scopeLabels(approval.definition.scope, store.people).join(
                    "、",
                  )}
                </small>
              </div>
              <div>
                <h3>能力配置</h3>
                {approval.definition.resourceIds.map((id) => (
                  <p key={id}>
                    {store.resources.find((r) => r.id === id)?.name || id}{" "}
                    <small>
                      {store.resources.find((r) => r.id === id)?.active
                        ? "可用"
                        : "已失效"}
                    </small>
                  </p>
                ))}
              </div>
            </div>
            <button className="rc-link" onClick={() => setContent(!content)}>
              {content ? "收起" : "查看"}完整岗位正文与工作资产
            </button>
            {content && (
              <>
                <Markdown content={roleDefinitionMarkdown(approval.definition)} />
                {[
                  ...approval.definition.capabilityMap,
                  ...approval.definition.knowledgeMap,
                  ...approval.definition.templates,
                  ...approval.definition.tests,
                ].map((a) => (
                  <section key={a.id}>
                    <h3>{a.name}</h3>
                    <Markdown content={a.content} />
                  </section>
                ))}
              </>
            )}
            {report && (
              <section>
                <h3>评测与人工复核</h3>
                <div className="rc-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>项目</th>
                        <th>结果</th>
                        <th>依据</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.checks.map((c) => (
                        <tr key={c.name}>
                          <td>{c.name}</td>
                          <td>{c.passed ? "通过" : "未通过"}</td>
                          <td>{c.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Notice>
                  {report.cases.length} 条用例 · 红线{" "}
                  {report.cases.filter((c) => c.redline).length} 条<br />
                  人工复核：{report.review?.note || "尚未复核"}
                  <br />
                  {report.review &&
                    `${store.people.find((p) => p.id === report.review?.by)?.name} · ${report.review.at}`}
                </Notice>
              </section>
            )}
            {suggestions.length > 0 && (
              <section>
                <h3>关联进化建议</h3>
                {suggestions.map((s) => (
                  <div className="rc-suggestion" key={s.id}>
                    <strong>{s.title}</strong>
                    <p>{s.proposed}</p>
                    <small>
                      {s.logIds.length} 条脱敏运行证据 · {s.risk}风险
                    </small>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
        {approval.resourceId && (
          <Notice>
            为 {store.people.find((p) => p.id === approval.userId)?.name} 开放{" "}
            {store.resources.find((r) => r.id === approval.resourceId)?.name}{" "}
            的调用权限；访问范围遵循资源的业务授权约束。
          </Notice>
        )}
        {approval.status === "待审批" ? (
          <>
            {!can && (
              <Notice error>
                当前工作身份无审批权限，或与提交人、维护人相同。请由独立审批人处理。
              </Notice>
            )}
            <label className="rc-field">
              审批意见
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={!can}
                placeholder="说明发布条件、影响范围与批准或驳回的依据，至少 5 个字"
              />
            </label>
          </>
        ) : (
          <Notice>
            {approval.status} ·{" "}
            {store.people.find((p) => p.id === approval.reviewer)?.name ||
              "提交方"}{" "}
            · {approval.resolvedAt}
            <br />
            {approval.note}
          </Notice>
        )}
        {feedback}
      </div>
    </Dialog>
  );
}
