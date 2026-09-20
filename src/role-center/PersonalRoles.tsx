import { CURRENT_USER } from "./demoAccount";
import { useFeedback } from "./feedback";
import { useState } from "react";
import {
  Bot,
  ChevronRight,
  GraduationCap,
  Plus,
  Search,
} from "lucide-react";
import {
  availableRole,
  effectiveResources,
  roleGoal,
  sections,
  RESPONSIBILITY_HEADINGS,
  type Resource,
  type ResourceKind,
  type RoleAgent,
} from "./domain";
import { actions, useRoleStore } from "./store";
import { Badge, Dialog, Empty, Markdown, Notice } from "./ui";

export default function PersonalRoles() {
  const store = useRoleStore();
  const [selectedId, setSelectedId] = useState("");
  const { perform, feedback } = useFeedback();
  const members = store.memberships[CURRENT_USER] || [];
  const roles = members
    .map((m) => ({
      member: m,
      role: store.roles.find((r) => r.id === m.roleId),
    }))
    .filter(
      (x): x is { member: (typeof members)[number]; role: RoleAgent } =>
        !!x.role,
    );
  const selected = store.roles.find((r) => r.id === selectedId);
  return (
    <section className="rc rc-personal">
      <div className="rc-heading">
        <div>
          <h2>岗位智能体</h2>
        </div>

      </div>
      <div className="rc-cards">
        {roles.map(({ role, member }) => {
          const d = role.published!.definition;
          const valid = availableRole(store, role, CURRENT_USER);
          return (
            <article key={role.id} className="rc-role-card">
              <header>
                <i className="rc-role-icon">
                  <Bot size={21} />
                </i>
                <div>
                  <small>{role.published!.version}</small>
                  <h3>{d.name}</h3>
                </div>

              </header>
              <p className="rc-goal">{roleGoal(d)}</p>
              {!valid && (
                <Notice error>
                  {role.disabled
                    ? "该岗位已由组织停用"
                    : "你已不在当前可添加范围内"}
                  ，请联系管理员确认岗位配置。
                </Notice>
              )}
              <footer>
                <button
                  role="switch"
                  aria-checked={member.enabled && valid}
                  aria-label={`${member.enabled ? "停用" : "启用"}${d.name}`}
                  className={`rc-switch ${member.enabled && valid ? "on" : ""}`}
                  disabled={!valid}
                  onClick={() =>
                    perform(
                      () => actions.member(role.id, "toggle"),
                      "岗位状态已更新",
                    )
                  }
                >
                  <i />
                  {valid ? (member.enabled ? "已启用" : "已停用") : "已不可用"}
                </button>
                <button
                  className="rc-link"
                  onClick={() => setSelectedId(role.id)}
                >
                  查看
                  <ChevronRight size={14} />
                </button>
              </footer>
            </article>
          );
        })}
        {!roles.length && (
          <Empty title="暂无岗位智能体" />
        )}
      </div>
      {selected?.published && (
        <PersonalRoleDetail
          role={selected}
          onClose={() => setSelectedId("")}
          onAdd={() =>
            perform(
              () => actions.member(selected.id, "add"),
              "已添加到我的数字分身",
            )
          }
        />
      )}{" "}
      {feedback}
    </section>
  );
}
function PersonalRoleDetail({
  role,
  onClose,
  onAdd,
}: {
  role: RoleAgent;
  onClose: () => void;
  onAdd: () => void;
}) {
  const store = useRoleStore();
  const d = role.published!.definition;
  const parsed = sections(d.responsibilities);
  const responsibilities = RESPONSIBILITY_HEADINGS.map((heading) => `# ${heading}\n${parsed[heading] || "暂未配置"}`).join("\n\n");
  const boundary = parsed["工作边界与人工确认/升级规则"] || "";
  const rules = [boundary, d.permissionRules].filter(Boolean).filter((value, index, all) => all.indexOf(value) === index).join("\n\n");
  const capabilityNames = d.resourceIds.map((id) => store.resources.find((resource) => resource.id === id)).filter((resource) => resource && resource.kind !== "model").map((resource) => resource!.name);
  const added = store.memberships[CURRENT_USER]?.some(
    (m) => m.roleId === role.id,
  );
  const available = availableRole(store, role, CURRENT_USER);
  return (
    <Dialog
      title={d.name}
      onClose={onClose}
      wide
      footer={
        <>
          <button onClick={onClose}>关闭</button>
          {!added && available && (
            <button className="rc-primary" onClick={onAdd}>
              添加到我的数字分身
            </button>
          )}
        </>
      }
    >
      <div className="rc-stack personal-role-detail">
        <div className="rc-actions">
          <Badge>{role.published!.version}</Badge>
          <span>{capabilityNames.length ? `可协助你使用${capabilityNames.slice(0, 3).join("、")}等岗位能力。` : "查看岗位职责、交付要求和工作边界。"}</span>
        </div>
        <Markdown content={responsibilities} />
        <section><h3>工作边界与需要人工确认的情况</h3><Markdown content={rules || "暂未配置"} /></section>
        <section>
          <h3>可用能力</h3>
          <div className="rc-chips" style={{ marginTop: 12 }}>
            {d.resourceIds
              .map((id) => store.resources.find((r) => r.id === id))
              .filter((r): r is Resource => !!r && r.kind !== "model")
              .map((r) => (
                <span key={r.id}>{r.name}</span>
              ))}
          </div>
        </section>
        {[
          ["能力地图", d.capabilityMap],
          ["知识地图", d.knowledgeMap],
          ["输出模板", d.templates],
        ].map(([label, assets]) => (
          (assets as typeof d.capabilityMap).length > 0 && <section key={String(label)}>
            <h3>{String(label)}</h3>
            {(assets as typeof d.capabilityMap).map((a) => (
              <details
                className="rc-version"
                style={{ marginTop: 12 }}
                key={a.id}
              >
                <summary>{a.name}</summary>
                <Markdown content={a.content} />
              </details>
            ))}
          </section>
        ))}

      </div>
    </Dialog>
  );
}
export function PersonalCapabilities({ kind }: { kind: ResourceKind }) {
  const store = useRoleStore();
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [market, setMarket] = useState(false),
    [selection, setSelection] = useState<string[]>([]);
  const { perform, feedback } = useFeedback();
  const resources = effectiveResources(store, CURRENT_USER).filter((r) => r.kind === kind);
  const visible = resources.filter(
    (r) =>
      `${r.name}${r.description}`.includes(query) &&
      (!status || (status === "on" ? r.enabled : !r.enabled)),
  );
  const candidates = store.resources.filter(
    (r) => r.kind === kind && r.active && !resources.some((x) => x.id === r.id),
  );
  const label = kind === "skill" ? "技能" : kind === "mcp" ? "MCP" : "专家";
  return (
    <div className="rc rc-stack">
      <div className="rc-heading" style={{ marginBottom: 0 }}>
        <div>
          <h2>{label}</h2>
          <p>
            {resources.length} 项能力 ·{" "}
            {resources.filter((r) => r.enabled).length} 项可用
          </p>
        </div>
        <button
          className="rc-primary"
          onClick={() => {
            setMarket(true);
            setSelection([]);
          }}
        >
          <Plus size={15} />
          添加{label}
        </button>
      </div>
      <div className="rc-toolbar">
        <label className="rc-search">
          <Search size={16} />
          <input
            aria-label={`搜索${label}`}
            placeholder={`搜索${label}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="能力状态"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">全部状态</option>
          <option value="on">已启用</option>
          <option value="off">未启用</option>
        </select>
      </div>
      <div>
        {visible.map((r) => (
          <div className="rc-resource-row" key={r.id}>
            <i className="rc-role-icon">
              {kind === "expert" ? (
                <GraduationCap size={20} />
              ) : kind === "mcp" ? (
                <Bot size={20} />
              ) : (
                <CheckIcon />
              )}
            </i>
            <div>
              <strong>{r.name}</strong>
              <p>{r.description}</p>
              {kind === "mcp" && <small>{r.tools} 个工具</small>}
            </div>
            <Badge
              tone={
                r.enabled
                  ? "green"
                  : !r.active || !r.authorized
                    ? "amber"
                    : "gray"
              }
            >
              {!r.active
                ? "已失效"
                : !r.authorized
                  ? "暂不可用"
                  : r.enabled
                    ? kind === "mcp"
                      ? "已连接"
                      : "已启用"
                    : "已停用"}
            </Badge>
            <div className="rc-actions">
                <button
                  disabled={!r.active || !r.authorized}
                  onClick={() =>
                    perform(
                      () => actions.personal(r.id, "toggle"),
                      "能力状态已更新",
                    )
                  }
                >
                  {r.enabled
                    ? kind === "mcp"
                      ? "断开"
                      : "停用"
                    : kind === "mcp"
                      ? "连接"
                      : "启用"}
                </button>
            </div>
          </div>
        ))}
        {!visible.length && <Empty title={`没有符合条件的${label}`} />}
      </div>
      {market && (
        <Dialog
          title={`添加${label}`}
          onClose={() => setMarket(false)}
          wide
          footer={
            <>
              <button onClick={() => setMarket(false)}>取消</button>
              <button
                className="rc-primary"
                disabled={!selection.length}
                onClick={() => {
                  if (
                    perform(
                      () =>
                        selection.forEach((id) => actions.personal(id, "add")),
                      `已添加 ${selection.length} 项${label}`,
                    ) !== false
                  )
                    setMarket(false);
                }}
              >
                添加所选（{selection.length}）
              </button>
            </>
          }
        >
          <div className="rc-grid">
            {candidates.map((r) => (
              <label className="rc-resource-pick" key={r.id}>
                <input
                  type="checkbox"
                  checked={selection.includes(r.id)}
                  onChange={() =>
                    setSelection(
                      selection.includes(r.id)
                        ? selection.filter((id) => id !== r.id)
                        : [...selection, r.id],
                    )
                  }
                />
                <span>
                  <strong>{r.name}</strong>
                  <small>{r.description}</small>
                </span>
              </label>
            ))}
            {!candidates.length && <Empty title={`所有可用${label}均已添加`} />}
          </div>
        </Dialog>
      )}
      {feedback}
    </div>
  );
}
function CheckIcon() {
  return <Plus size={20} />;
}
