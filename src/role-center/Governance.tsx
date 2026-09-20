import { CURRENT_USER, isNewDemoUser } from "./demoAccount";
import { useFeedback } from "./feedback";
import { useMemo, useState } from "react";
import { Download, Plus, ShieldCheck } from "lucide-react";
import {
  CAUSES,
  ORGS,
  emptyScope,
  matchesScope,
  type Scope,
  TARGETS,
  currentDefinition,
  type RoleAgent,
  type RunRecord,
  type Suggestion,
} from "./domain";
import { actions, download, governanceProjection, useRoleStore } from "./store";
import { Badge, Dialog, Empty, Markdown, Notice, ScopePicker } from "./ui";

type Projection = ReturnType<typeof governanceProjection>;
export function GovernanceDetail({
  record,
  onClose,
}: {
  record: Projection;
  onClose: () => void;
}) {
  const store = useRoleStore();
  const related = store.suggestions.filter((s) => s.logIds.includes(record.id));
  return (
    <Dialog title="运行治理详情" onClose={onClose}>
      <div className="rc-stack">
        <div className="rc-actions">
          <Badge>{record.status}</Badge>
          <small>
            {record.id} · {record.at}
          </small>
        </div>
        <h3>{record.summary}</h3>
        <div className="rc-grid">
          <div>
            <small>使用人员</small>
            <p>
              {record.anonymousUser} ·{" "}
              {ORGS.find((o) => o.id === record.organization)?.name}
            </p>
          </div>
          <div>
            <small>来源与反馈</small>
            <p>
              {record.source} ·{" "}
              {record.feedback === "good"
                ? "有帮助"
                : record.feedback === "bad"
                  ? "有问题"
                  : "未评价"}
            </p>
          </div>
        </div>
        <div>
          <h3>参与岗位与能力</h3>
          {record.role_contexts.map((c) => (
            <div className="rc-resource-row" key={c.roleId}>
              <div>
                <strong>
                  {c.name} {c.version}
                </strong>
                <p>
                  {c.resourceIds
                    .map(
                      (id) =>
                        store.resources.find((r) => r.id === id)?.name || id,
                    )
                    .join("、") || "岗位上下文"}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div>
          <h3>脱敏证据</h3>
          <p>{record.evidence}</p>
        </div>
        <div>
          <small>问题归因</small>
          <p>
            {record.cause || "无"} · {record.attribution}
          </p>
        </div>
        <div>
          <h3>关联进化建议</h3>
          {related.length ? (
            related.map((s) => (
              <p key={s.id}>
                {s.title} <Badge>{s.status}</Badge>
              </p>
            ))
          ) : (
            <p>尚未关联进化建议</p>
          )}
        </div>
        <Notice>
          <ShieldCheck size={15} /> 治理记录仅包含脱敏摘要、使用版本与反馈。
        </Notice>
      </div>
    </Dialog>
  );
}
export function LogTable({
  runs,
  onOpen,
  selectable,
  selected = [],
  onSelect,
}: {
  runs: Projection[];
  onOpen: (r: Projection) => void;
  selectable?: boolean;
  selected?: string[];
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="rc-table-wrap">
      <table>
        <thead>
          <tr>
            {selectable && <th>选择</th>}
            <th>任务摘要</th>
            <th>岗位与版本</th>
            <th>反馈 / 归因</th>
            <th>运行时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id}>
              {selectable && (
                <td>
                  <input
                    aria-label={`选择 ${r.id}`}
                    type="checkbox"
                    checked={selected.includes(r.id)}
                    onChange={() => onSelect?.(r.id)}
                  />
                </td>
              )}
              <td>
                <strong>{r.summary}</strong>
                <p>
                  {r.anonymousUser} · {r.source}
                </p>
              </td>
              <td>
                {r.role_contexts.map((c) => (
                  <p key={c.roleId}>
                    {c.name} {c.version}
                  </p>
                ))}
              </td>
              <td>
                <Badge
                  tone={
                    r.feedback === "bad"
                      ? "amber"
                      : r.feedback === "good"
                        ? "green"
                        : "gray"
                  }
                >
                  {r.feedback === "good"
                    ? "有帮助"
                    : r.feedback === "bad"
                      ? "有问题"
                      : "未评价"}
                </Badge>
                <p>{r.cause || "—"}</p>
              </td>
              <td>
                <small>{r.at}</small>
              </td>
              <td>
                <button className="rc-link" onClick={() => onOpen(r)}>
                  查看详情
                </button>
              </td>
            </tr>
          ))}
          {!runs.length && (
            <tr>
              <td colSpan={selectable ? 6 : 5}>
                <Empty title="没有符合条件的运行记录" />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
export function GovernanceLogs({
  roleId,
  compact = false,
  onAll,
}: {
  roleId?: string;
  compact?: boolean;
  onAll?: () => void;
}) {
  const store = useRoleStore();
  const [selectedRole, setSelectedRole] = useState(roleId || ""),
    [version, setVersion] = useState(""),
    [feedback, setFeedback] = useState(""),
    [cause, setCause] = useState(""),
    [scope, setScope] = useState<Scope>(emptyScope()),
    [scopeOpen, setScopeOpen] = useState(false),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [query, setQuery] = useState(""),
    [detail, setDetail] = useState<Projection | null>(null);
  const { perform, feedback: toast } = useFeedback();
  const runs = store.runs
    .filter(
      (r) =>
        r.role_contexts.some(
          (c) =>
            (!(roleId || selectedRole) ||
              c.roleId === (roleId || selectedRole)) &&
            (!version || c.version === version),
        ) &&
        (!feedback ||
          (feedback === "none" ? !r.feedback : r.feedback === feedback)) &&
        (!cause || r.cause === cause) &&
        (!start || r.at.slice(0, 10) >= start) &&
        (!end || r.at.slice(0, 10) <= end) &&
        (![...scope.orgs, ...scope.groups, ...scope.users].length ||
          store.people.some(
            (p) => p.id === r.userId && matchesScope(p, scope),
          )) &&
        (!query || `${r.id}${r.summary}`.includes(query)),
    )
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((r) => governanceProjection(r, store));
  const versions = [
    ...new Set(
      store.runs.flatMap((r) =>
        r.role_contexts
          .filter(
            (c) =>
              !(roleId || selectedRole) ||
              c.roleId === (roleId || selectedRole),
          )
          .map((c) => c.version),
      ),
    ),
  ];
  return (
    <section className="rc rc-section">
      <header>
        <div>
          <h2>运行记录</h2>
          <p>按岗位版本追溯任务表现与问题反馈</p>
        </div>
        <div className="rc-actions">
          {compact ? (
            <button onClick={onAll}>查看全部日志</button>
          ) : (
            <button
              onClick={() =>
                perform(() => {
                  actions.exportAudit(
                    `导出 ${runs.length} 条脱敏运行记录`,
                    roleId,
                  );
                  download(
                    "岗位运行记录-脱敏.json",
                    JSON.stringify(runs, null, 2),
                  );
                }, "已导出当前筛选结果")
              }
            >
              <Download size={15} />
              导出
            </button>
          )}
        </div>
      </header>
      {!compact && (
        <div className="rc-toolbar">
          <input
            aria-label="搜索运行记录"
            placeholder="搜索任务或记录编号"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {!roleId && (
            <select
              aria-label="岗位筛选"
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setVersion("");
              }}
            >
              <option value="">全部岗位</option>
              {store.roles.map((r) => (
                <option value={r.id} key={r.id}>
                  {currentDefinition(r).name}
                </option>
              ))}
            </select>
          )}
          <select
            aria-label="版本筛选"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          >
            <option value="">全部版本</option>
            {versions.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select
            aria-label="反馈筛选"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          >
            <option value="">全部反馈</option>
            <option value="good">有帮助</option>
            <option value="bad">有问题</option>
            <option value="none">未评价</option>
          </select>
          <select
            aria-label="问题归因筛选"
            value={cause}
            onChange={(e) => setCause(e.target.value)}
          >
            <option value="">全部问题归因</option>
            {CAUSES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <button onClick={() => setScopeOpen(true)}>
            组织 / 小组 / 人员
            {[...scope.orgs, ...scope.groups, ...scope.users].length
              ? `（${[...scope.orgs, ...scope.groups, ...scope.users].length}）`
              : ""}
          </button>
          <label className="rc-filter-label">
            开始日期
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label className="rc-filter-label">
            结束日期
            <input
              type="date"
              min={start}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <button
            onClick={() => {
              setSelectedRole("");
              setVersion("");
              setFeedback("");
              setCause("");
              setScope(emptyScope());
              setStart("");
              setEnd("");
              setQuery("");
            }}
          >
            清空筛选
          </button>
        </div>
      )}
      {start && end && start > end && (
        <Notice error>开始日期不能晚于结束日期。</Notice>
      )}
      <LogTable runs={compact ? runs.slice(0, 5) : runs} onOpen={setDetail} />
      {detail && (
        <GovernanceDetail record={detail} onClose={() => setDetail(null)} />
      )}
      {scopeOpen && (
        <Dialog
          title="筛选运行来源范围"
          onClose={() => setScopeOpen(false)}
          footer={
            <button className="rc-primary" onClick={() => setScopeOpen(false)}>
              完成
            </button>
          }
        >
          <ScopePicker
            value={scope}
            onChange={setScope}
            people={store.people}
          />
        </Dialog>
      )}
      <small>共 {runs.length} 条记录</small>
      {toast}
    </section>
  );
}
export function Evolution({
  role,
  dirty = false,
  onAllLogs,
  onDraft,
}: {
  role: RoleAgent;
  dirty?: boolean;
  onAllLogs: () => void;
  onDraft: () => void;
}) {
  const store = useRoleStore();
  const [day, setDay] = useState(""),
    [detail, setDetail] = useState<Projection | null>(null),
    [evidence, setEvidence] = useState<Suggestion | null>(null),
    [handling, setHandling] = useState<{
      suggestion: Suggestion;
      accept: boolean;
    } | null>(null),
    [reason, setReason] = useState(""),
    [target, setTarget] = useState("SOP"),
    [resourceId, setResourceId] = useState(""),
    [create, setCreate] = useState(false),
    [ids, setIds] = useState<string[]>([]),
    [title, setTitle] = useState(""),
    [proposed, setProposed] = useState("");
  const { perform, feedback } = useFeedback();
  const allowed =
    !dirty &&
    ["resource_admin", "sys_admin"].includes(
      store.people.find((p) => p.id === store.adminId)?.role || "",
    );
  const logs = store.runs
    .filter((r) => r.role_contexts.some((c) => c.roleId === role.id))
    .sort((a, b) => b.at.localeCompare(a.at));
  const suggestions = store.suggestions.filter((s) => s.roleId === role.id);
  const dates = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - 89 + i);
        return date.toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
      }),
    [],
  );
  const filteredLogs = logs.filter((r) => !day || r.at.startsWith(day));
  const filteredSuggestions = suggestions.filter(
    (s) =>
      !day ||
      s.createdAt.startsWith(day) ||
      s.handledAt?.startsWith(day) ||
      s.logIds.some((id) => filteredLogs.some((l) => l.id === id)),
  );
  return (
    <section className="rc-section" id="evolution">
      <header>
        <div>
          <h2>运行记录与受控进化</h2>
          <p>近 90 天 · 问题信号、进化建议与发布进度</p>
        </div>
        <button
          disabled={!allowed || !logs.length}
          onClick={() => {
            setCreate(true);
            setIds([]);
            setTitle("");
            setProposed("");
            setTarget("SOP");
          }}
        >
          <Plus size={15} />
          新建进化建议
        </button>
      </header>
      <div className="rc-actions">
        <small>
          {dates[0]} — {dates.at(-1)}
        </small>
        {day && (
          <button className="rc-link" onClick={() => setDay("")}>
            清除日期：{day}
          </button>
        )}
      </div>
      <div className="rc-calendar" aria-label="近 90 天进化日历">
        {dates.map((date) => {
          const daily = logs.filter((r) => r.at.startsWith(date));
          const linked = suggestions.filter(
            (s) =>
              s.logIds.some((id) => daily.some((r) => r.id === id)) ||
              s.handledAt?.startsWith(date),
          );
          const status = linked.some((s) => s.status === "已发布")
            ? "released"
            : linked.some((s) => s.status === "已采纳")
              ? "accepted"
              : linked.some((s) => s.status === "待处理")
                ? "pending"
                : daily.some((r) => r.feedback === "bad")
                  ? "signal"
                  : daily.length
                    ? "has-run"
                    : "";
          return (
            <button
              key={date}
              className={`${status} ${day === date ? "selected" : ""}`}
              title={`${date}｜运行 ${daily.length}｜好评 ${daily.filter((r) => r.feedback === "good").length}｜差评 ${daily.filter((r) => r.feedback === "bad").length}｜${[...new Set(daily.map((r) => r.cause).filter(Boolean))].join("、") || "无问题信号"}｜${linked.map((s) => s.status).join("、") || "无建议"}`}
              aria-label={`筛选 ${date}，${daily.length} 条运行`}
              onClick={() => setDay(day === date ? "" : date)}
            />
          );
        })}
      </div>
      <div className="rc-legend">
        {[
          ["无运行", "#f4f6f9"],
          ["有运行", "#cdd6e1"],
          ["待观察", "#f5d68d"],
          ["待处理建议", "#eda969"],
          ["草稿处理中", "#76aade"],
          ["已发布", "#78bd9b"],
        ].map(([label, color]) => (
          <span key={label}>
            <i style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
      <LogTable
        runs={filteredLogs
          .slice(0, 5)
          .map((r) => governanceProjection(r, store))}
        onOpen={setDetail}
      />
      <div className="rc-actions end">
        <button className="rc-link" onClick={onAllLogs}>
          查看全部运行记录（{logs.length}）
        </button>
      </div>
      <h3 style={{ marginTop: 20 }}>
        进化建议 <small>{filteredSuggestions.length} 项</small>
      </h3>
      {filteredSuggestions.map((s) => (
        <article className="rc-suggestion" key={s.id}>
          <header>
            <h3>{s.title}</h3>
            <Badge>{s.status}</Badge>
          </header>
          <div className="rc-actions">
            <Badge tone="amber">{s.risk}风险</Badge>
            <small>
              {s.type} · {s.version} · {s.logIds.length} 条关联记录
            </small>
          </div>
          <p>{s.issue}</p>
          <p>
            <strong>建议改动：</strong>
            {s.proposed}
          </p>
          <small>
            影响范围：
            {role.published
              ? role.published.definition.name + "的同类任务"
              : "当前岗位工作任务"}{" "}
            ·{" "}
            {
              new Set(
                logs
                  .filter((l) => s.logIds.includes(l.id))
                  .map((l) => l.userId),
              ).size
            }{" "}
            名使用人员
          </small>
          {s.reason && (
            <Notice>
              {s.status} · {store.people.find((p) => p.id === s.by)?.name} ·{" "}
              {s.handledAt}
              <br />
              {s.reason}
              {s.draftVersion && ` · ${s.draftVersion}`}
            </Notice>
          )}
          <footer>
            <button onClick={() => setEvidence(s)}>查看证据</button>
            {s.status === "待处理" && (
              <>
                <button
                  disabled={!allowed}
                  onClick={() => {
                    setHandling({ suggestion: s, accept: false });
                    setReason("");
                  }}
                >
                  拒绝
                </button>
                <button
                  disabled={
                    !allowed || !!(role.draft && role.draft.status !== "草稿")
                  }
                  className="rc-primary"
                  onClick={() => {
                    setHandling({ suggestion: s, accept: true });
                    setReason("");
                    setTarget(s.type);
                  }}
                >
                  采纳到草稿
                </button>
              </>
            )}
            {s.status === "已采纳" && role.draft && (
              <button onClick={onDraft}>查看草稿 {s.draftVersion}</button>
            )}
          </footer>
        </article>
      ))}
      {!filteredSuggestions.length && <Empty title="当前没有进化建议" />}
      {detail && (
        <GovernanceDetail record={detail} onClose={() => setDetail(null)} />
      )}{" "}
      {evidence && (
        <Dialog
          title={evidence.title + " · 脱敏证据"}
          onClose={() => setEvidence(null)}
          wide
        >
          <LogTable
            runs={logs
              .filter((r) => evidence.logIds.includes(r.id))
              .map((r) => governanceProjection(r, store))}
            onOpen={(r) => {
              setEvidence(null);
              setDetail(r);
            }}
          />
          <Notice>
            建议基于同类任务的重复问题形成，个人原文与知识正文不进入岗位配置。
          </Notice>
        </Dialog>
      )}
      {handling && (
        <Dialog
          title={handling.accept ? "采纳进化建议" : "拒绝进化建议"}
          onClose={() => setHandling(null)}
          footer={
            <>
              <button onClick={() => setHandling(null)}>取消</button>
              <button
                className="rc-primary"
                onClick={() => {
                  if (
                    perform(
                      () =>
                        actions.handleSuggestion(
                          handling.suggestion.id,
                          handling.accept,
                          reason,
                          target,
                          resourceId,
                        ),
                      handling.accept ? "建议已加入草稿" : "已记录拒绝原因",
                    ) !== false
                  )
                    setHandling(null);
                }}
              >
                {handling.accept ? "采纳到草稿" : "确认拒绝"}
              </button>
            </>
          }
        >
          <div className="rc-stack">
            <h3>{handling.suggestion.title}</h3>
            {handling.accept && target === "能力包" && (
              <label className="rc-field">
                补充资源
                <select
                  value={resourceId}
                  onChange={(e) => setResourceId(e.target.value)}
                >
                  <option value="">请选择资源</option>
                  {store.resources
                    .filter(
                      (r) =>
                        r.active &&
                        !currentDefinition(role).resourceIds.includes(r.id),
                    )
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} · {r.version}
                      </option>
                    ))}
                </select>
              </label>
            )}
            {handling.accept && (
              <label className="rc-field">
                修改落点
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                >
                  {TARGETS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="rc-field">
              处理意见
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="说明采纳或拒绝的依据，至少 5 个字"
              />
            </label>
            {handling.accept && (
              <Notice>
                变更写入{role.draft?.version || "下一版本"}
                草稿，完成评测与审批后生效。
              </Notice>
            )}
          </div>
        </Dialog>
      )}
      {create && (
        <Dialog
          title="新建进化建议"
          onClose={() => setCreate(false)}
          wide
          footer={
            <>
              <button onClick={() => setCreate(false)}>取消</button>
              <button
                className="rc-primary"
                onClick={() => {
                  if (
                    perform(
                      () =>
                        actions.suggestionCreate(
                          role.id,
                          ids,
                          title,
                          proposed,
                          target,
                        ),
                      "已创建进化建议",
                    ) !== false
                  )
                    setCreate(false);
                }}
              >
                保存建议
              </button>
            </>
          }
        >
          <div className="rc-stack">
            <div className="rc-grid">
              <label className="rc-field">
                建议标题
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label className="rc-field">
                建议类型
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                >
                  {TARGETS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="rc-field">
              具体修改内容
              <textarea
                value={proposed}
                onChange={(e) => setProposed(e.target.value)}
                placeholder="填写可纳入岗位定义、SOP 或评测的改动"
              />
            </label>
            <h3>选择同一版本的脱敏证据</h3>
            <LogTable
              selectable
              selected={ids}
              onSelect={(id) =>
                setIds(
                  ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
                )
              }
              runs={logs.map((r) => governanceProjection(r, store))}
              onOpen={setDetail}
            />
          </div>
        </Dialog>
      )}
      {feedback}
    </section>
  );
}

export function PersonalLogs() {
  const store = useRoleStore();
  const [feedbackFilter, setFeedbackFilter] = useState(""),
    [query, setQuery] = useState(""),
    [detailId, setDetailId] = useState(""),
    [causeFilter, setCauseFilter] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [reason, setReason] = useState(CAUSES[0]),
    [taskOpen, setTaskOpen] = useState(false),
    [prompt, setPrompt] = useState("");
  const { perform, feedback } = useFeedback();
  const all = store.runs.filter((r) => r.userId === CURRENT_USER);
  const runs = all
    .filter(
      (r) =>
        (!feedbackFilter ||
          (feedbackFilter === "none"
            ? !r.feedback
            : r.feedback === feedbackFilter)) &&
        (!causeFilter || r.cause === causeFilter) &&
        (!start || r.at.slice(0, 10) >= start) &&
        (!end || r.at.slice(0, 10) <= end) &&
        (!query || `${r.id}${r.summary}${r.messages[0]?.text}`.includes(query)),
    )
    .sort((a, b) => b.at.localeCompare(a.at));
  const selected = all.find((r) => r.id === detailId);
  const evaluated = all.filter((r) => r.feedback).length;
  const goodRate = evaluated
    ? Math.round(
        (all.filter((r) => r.feedback === "good").length / evaluated) * 100,
      )
    : 0;
  return (
    <section className="rc rc-section">
      <header>
        <div>

          <p>
            项目推进、经营分析与决策支持记录
            <span className="rc-log-stats">
              共 {all.length} 条 · 已评价 {evaluated} 条 · 有帮助比例 {evaluated ? `${goodRate}%` : "—"}
            </span>
          </p>
        </div>
        <div className="rc-actions">
          {!isNewDemoUser() && <button
            onClick={() => {
              setTaskOpen(true);
              setPrompt("");
            }}
          >
            <Plus size={15} />
            准备工作任务
          </button>}
          <button
            onClick={() =>
              download("我的运行记录.json", JSON.stringify(runs, null, 2))
            }
          >
            <Download size={15} />
            导出
          </button>
        </div>
      </header>
      <div className="rc-log-filters">
        <input
          aria-label="搜索我的日志"
          placeholder="搜索任务或记录编号"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="个人日志反馈"
          value={feedbackFilter}
          onChange={(e) => setFeedbackFilter(e.target.value)}
        >
          <option value="">全部评价</option>
          <option value="good">有帮助</option>
          <option value="bad">有问题</option>
          <option value="none">未评价</option>
        </select>
        <select
          aria-label="个人日志归因"
          value={causeFilter}
          onChange={(e) => setCauseFilter(e.target.value)}
        >
          <option value="">全部问题归因</option>
          {CAUSES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <span className="rc-log-range">
          <input
            type="date"
            aria-label="开始日期"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <i>–</i>
          <input
            type="date"
            aria-label="结束日期"
            min={start}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </span>
        <button
          className="rc-log-clear"
          onClick={() => {
            setQuery("");
            setFeedbackFilter("");
            setCauseFilter("");
            setStart("");
            setEnd("");
          }}
        >
          清空筛选
        </button>
      </div>
      <div className="rc-table-wrap rc-conversation-log-scroll" tabIndex={0} role="region" aria-label="对话日志列表">
        <table>
          <thead>
            <tr>
              <th>任务</th>
              <th>参与岗位</th>
              <th>状态 / 反馈</th>
              <th>时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.summary}</strong>
                  <p>
                    {r.source} · {r.id}
                  </p>
                </td>
                <td>
                  <span className="rc-log-roles">
                    {r.role_contexts.map((c) => (
                      <span key={c.roleId}>
                        {c.name} {c.version}
                      </span>
                    ))}
                  </span>
                </td>
                <td>
                  <span className="rc-log-state">
                    <Badge>{r.status}</Badge>
                    <em
                      className={
                        r.feedback === "bad"
                          ? "is-bad"
                          : r.feedback === "good"
                            ? "is-good"
                            : ""
                      }
                    >
                      {r.feedback === "good"
                        ? "有帮助"
                        : r.feedback === "bad"
                          ? "有问题 · " + r.cause
                          : "未评价"}
                    </em>
                  </span>
                </td>
                <td>
                  <small className="rc-log-time">{r.at}</small>
                </td>
                <td className="rc-log-op">
                  <button
                    className="rc-link"
                    onClick={() => {
                      setDetailId(r.id);
                      setReason(r.cause || CAUSES[0]);
                    }}
                  >
                    查看详情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!runs.length && <Empty title="没有匹配的运行记录" />}
      </div>
      {selected && (
        <Dialog title="任务运行详情" onClose={() => setDetailId("")} wide>
          <div className="rc-stack">
            <div className="rc-actions">
              <Badge>{selected.status}</Badge>
              <small>
                {selected.at} · {selected.id}
              </small>
            </div>
            <div className="rc-chips">
              {selected.role_contexts.map((c) => (
                <span key={c.roleId}>
                  {c.name} {c.version}
                </span>
              ))}
            </div>
            <h3>完整对话</h3>
            {selected.messages.map((m, i) => (
              <article
                className={`rc-message ${m.role === "用户" ? "user" : ""}`}
                key={i}
              >
                <small>{m.role}</small>
                <Markdown content={m.text} />
              </article>
            ))}
            <details>
              <summary>查看工作成果</summary>
              <Markdown content={selected.output} />
              <button
                onClick={() =>
                  download(
                    `${selected.summary}.md`,
                    selected.output,
                    "text/markdown",
                  )
                }
              >
                下载成果
              </button>
            </details>
            <div>
              <h3>结果反馈</h3>
              <div className="rc-actions" style={{ marginTop: 12 }}>
                <button
                  className={selected.feedback === "good" ? "rc-primary" : ""}
                  onClick={() =>
                    perform(
                      () => actions.feedback(selected.id, "good"),
                      "已记录反馈",
                    )
                  }
                >
                  有帮助
                </button>
                <select
                  aria-label="反馈问题原因"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  {CAUSES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <button
                  className={selected.feedback === "bad" ? "rc-danger" : ""}
                  onClick={() =>
                    perform(
                      () => actions.feedback(selected.id, "bad", reason),
                      "已记录问题反馈",
                    )
                  }
                >
                  有问题
                </button>
              </div>
              <small>可更新当前反馈。重复问题会纳入岗位优化处理。</small>
            </div>
            {store.suggestions
              .filter((s) => s.logIds.includes(selected.id))
              .map((s) => (
                <Notice key={s.id}>此反馈的处理状态：{s.status}</Notice>
              ))}
          </div>
        </Dialog>
      )}
      {taskOpen && (
        <Dialog
          title="准备工作任务"
          onClose={() => setTaskOpen(false)}
          footer={
            <>
              <button onClick={() => setTaskOpen(false)}>取消</button>
              <button
                className="rc-primary"
                onClick={() => {
                  const id = perform(() => actions.run(prompt));
                  if (typeof id === "string") {
                    setTaskOpen(false);
                    setDetailId(id);
                  }
                }}
              >
                生成执行预案
              </button>
            </>
          }
        >
          <label className="rc-field">
            任务要求
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="例如：准备下周的产品需求评审，梳理范围、优先级与验收标准"
            />
          </label>
          <Notice>根据当前启用的岗位工作方法准备任务步骤和交付结构。</Notice>
        </Dialog>
      )}
      {feedback}
    </section>
  );
}
export type { RunRecord };
