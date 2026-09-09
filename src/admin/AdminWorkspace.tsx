import { useFeedback } from "../role-center/feedback";
import { useEffect, useState } from "react";
import DefinitionWorkspace from "./DefinitionWorkspace";
import type { Position } from "./positionModels";
import AdminOverview from "./AdminOverview";
import RoleAgentWorkspace from "./RoleAgentWorkspace";
import AdminSidebar from "./AdminSidebar";
import {
  adminNavigation,
  managementRows,
  type AdminPageId,
} from "./mockAdminData";
import ApprovalCenter from "../role-center/Approvals";
import { actions, useRoleStore } from "../role-center/store";
import {
  canEdit,
  currentDefinition,
  ORGS,
  type Resource,
} from "../role-center/domain";
import { Badge, Confirm, Dialog, Empty } from "../role-center/ui";
import "./admin.css";
export default function AdminWorkspace({ onReturn }: { onReturn: () => void }) {
  const [activePage, setActivePage] = useState<AdminPageId>(
    () =>
      adminNavigation.find(
        (p) => p.id === new URLSearchParams(location.search).get("page"),
      )?.id || "roleAgents",
  );
  const [entryPosition, setEntryPosition] = useState<Position>();
  const [dirty, setDirty] = useState(false),
    [pending, setPending] = useState<{ run: () => void } | null>(null),
    [viewKey, setViewKey] = useState(0);
  useEffect(() => {
    const url = new URL(location.href);
    if (activePage === "roleAgents") url.searchParams.delete("page");
    else url.searchParams.set("page", activePage);
    history.replaceState(null, "", url);
  }, [activePage]);
  const navigate = (run: () => void) => (dirty ? setPending({ run }) : run());
  return (
    <div className="admin-workspace">
      <AdminSidebar
        activePage={activePage}
        onSelect={(page) => {
          if (page !== activePage) navigate(() => { setEntryPosition(undefined); setActivePage(page); });
        }}
        onBack={() => navigate(onReturn)}
        onAccount={(id) => navigate(() => actions.setAdmin(id))}
      />
      <main className="admin-content">
        {activePage === "organizationDefinition" || activePage === "processDefinition" ? (
          <DefinitionWorkspace page={activePage} onConfigure={(position) => {
            setEntryPosition(position);
            setViewKey(n => n + 1);
            setActivePage("roleAgents");
          }} />
        ) : activePage === "overview" ? (
          <AdminOverview onNavigate={setActivePage} />
        ) : activePage === "roleAgents" ? (
          <RoleAgentWorkspace
            key={viewKey}
            initialPosition={entryPosition}
            onDirtyChange={setDirty}
            onNavigate={(page) => navigate(() => setActivePage(page))}
          />
        ) : activePage === "approvals" ? (
          <ApprovalCenter />
        ) : (
          <ResourceConsole key={activePage} pageId={activePage} />
        )}
      </main>
      {pending && (
        <Confirm
          title="离开未保存的配置"
          description="当前修改尚未保存。离开后将使用上一次保存的配置。"
          label="放弃修改并继续"
          onClose={() => setPending(null)}
          onConfirm={() => {
            setDirty(false);
            setViewKey((n) => n + 1);
            pending.run();
            setPending(null);
          }}
        />
      )}
    </div>
  );
}
function ResourceConsole({
  pageId,
}: {
  pageId: Exclude<
    AdminPageId,
    "overview" | "roleAgents" | "approvals" | "logs" | "organizationDefinition" | "processDefinition"
  >;
}) {
  const store = useRoleStore();
  const page = adminNavigation.find((p) => p.id === pageId)!;
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState<Resource | null>(null),
    [toggle, setToggle] = useState<Resource | null>(null),
    [info, setInfo] = useState<string[] | null>(null);
  const { perform, feedback } = useFeedback();
  const kind =
    pageId === "skills"
      ? "skill"
      : pageId === "mcp"
        ? "mcp"
        : pageId === "experts"
          ? "expert"
          : pageId === "models"
            ? "model"
            : null;
  const rows = store.resources.filter(
    (r) => r.kind === kind && `${r.name}${r.description}`.includes(query),
  );
  const simpleRows = (
    pageId === "organization"
      ? ORGS.map((org) => [
          org.name,
          `${store.people.filter((p) => p.active && (p.org === org.id || p.org.startsWith(org.id + "/"))).length} 名成员（含下属组织）`,
          "有效",
          org.id,
        ])
      : pageId === "roles"
        ? [
            ["平台管理员", "资源维护、发布状态与平台治理", "管理", "sys_admin"],
            [
              "资源管理员",
              "岗位草稿、评测与提交审批",
              "维护",
              "resource_admin",
            ],
            ["审批人", "独立审批岗位发布与能力访问", "审批", "approver"],
            ["普通用户", "个人数字分身与可添加岗位", "使用", "user"],
          ].map((row) => [
            row[0],
            `${row[1]} · ${store.people.filter((p) => p.active && p.role === row[3]).length} 人`,
            row[2],
            row[3],
          ])
        : managementRows[pageId]
  ).filter((r) => r.join(" ").includes(query));
  return (
    <div className="rc rc-shell">
      <div className="rc-heading">
        <div>
          <h1>{page.label}</h1>
          <p>{page.description}</p>
        </div>
      </div>
      <div className="rc-toolbar">
        <input
          aria-label={`搜索${page.label}`}
          placeholder={`搜索${page.label}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <small>{kind ? rows.length : simpleRows.length} 项</small>
      </div>
      <section className="rc-section">
        {kind
          ? rows.map((r) => (
              <div className="rc-resource-row" key={r.id}>
                <div>
                  <strong>{r.name}</strong>
                  <p>
                    {r.version} · {r.description}
                  </p>
                </div>
                <Badge tone={r.active ? "green" : "gray"}>
                  {r.active ? "已启用" : "已停用"}
                </Badge>
                <button onClick={() => setSelected(r)}>查看配置</button>
                <button disabled={!canEdit(store)} onClick={() => setToggle(r)}>
                  {r.active ? "停用" : "启用"}
                </button>
              </div>
            ))
          : simpleRows.map((row) => (
              <div className="rc-resource-row" key={row[0]}>
                <div>
                  <strong>{row[0]}</strong>
                  <p>{row[1]}</p>
                </div>
                <Badge>{row[2]}</Badge>
                <button onClick={() => setInfo(row)}>查看详情</button>
              </div>
            ))}
        {!(kind ? rows.length : simpleRows.length) && (
          <Empty title="没有符合条件的记录" />
        )}
      </section>
      {selected && (
        <Dialog title={selected.name} onClose={() => setSelected(null)}>
          <div className="rc-stack">
            <div className="rc-actions">
              <Badge>{selected.version}</Badge>
              <Badge>
                {store.resources.find((r) => r.id === selected.id)?.active
                  ? "已启用"
                  : "已停用"}
              </Badge>
            </div>
            <p>{selected.description}</p>
            <div>
              <h3>调用权限</h3>
              <p>
                {selected.permission}
                {selected.restricted ? " · 需要单独授权" : ""}
              </p>
            </div>
            <div>
              <h3>被岗位引用</h3>
              {store.roles
                .filter(
                  (r) =>
                    currentDefinition(r).resourceIds.includes(selected.id) ||
                    r.published?.definition.resourceIds.includes(selected.id),
                )
                .map((r) => (
                  <p key={r.id}>
                    {currentDefinition(r).name} ·{" "}
                    {r.published?.version || r.draft?.version}
                  </p>
                ))}
            </div>
          </div>
        </Dialog>
      )}
      {toggle && (
        <Confirm
          title={`${toggle.active ? "停用" : "启用"}${toggle.name}`}
          description={
            toggle.active
              ? "停用后个人不能调用该资源，引用此资源的岗位新版本将无法通过发布检查。现有引用与历史记录会保留。"
              : "启用后恢复资源可用性，个人使用仍受授权与连接状态约束。"
          }
          onClose={() => setToggle(null)}
          onConfirm={() => {
            if (
              perform(
                () => actions.resourceState(toggle.id, !toggle.active),
                "资源状态已更新",
              ) !== false
            )
              setToggle(null);
          }}
        />
      )}
      {info && (
        <Dialog title={info[0]} onClose={() => setInfo(null)}>
          <div className="rc-stack">
            <Badge>{info[2]}</Badge>
            <p>{info[1]}</p>
            {pageId === "organization" ? (
              <div>
                <h3>组织成员</h3>
                {store.people
                  .filter(
                    (p) =>
                      p.active &&
                      (p.org === info[3] || p.org.startsWith(info[3] + "/")),
                  )
                  .map((p) => (
                    <div className="rc-resource-row" key={p.id}>
                      <strong>{p.name}</strong>
                      <small>
                        {ORGS.find((o) => o.id === p.org)?.name} ·{" "}
                        {p.role === "user"
                          ? "普通用户"
                          : p.role === "resource_admin"
                            ? "资源管理员"
                            : p.role === "approver"
                              ? "审批人"
                              : "平台管理员"}
                      </small>
                    </div>
                  ))}
              </div>
            ) : pageId === "roles" ? (
              <div>
                <h3>权限边界</h3>
                <p>
                  {info[0] === "平台管理员"
                    ? "管理资源与发布状态、停用和恢复版本；不能审批本人提交或维护的岗位。"
                    : info[0] === "资源管理员"
                      ? "创建和维护岗位草稿、组织评测、配置范围；发布须经独立审批。"
                      : info[0] === "审批人"
                        ? "复核评测证据与范围变更，批准或驳回发布及访问申请。不能审批本人提交或维护的岗位。"
                        : "主动添加范围内的岗位智能体，管理个人能力、知识和反馈。"}
                </p>
              </div>
            ) : (
              <div>
                <h3>运行策略</h3>
                <p>
                  按计划触发，使用任务创建时的授权与配置。执行异常进入任务记录，由维护人处理。
                </p>
              </div>
            )}
          </div>
        </Dialog>
      )}
      {feedback}
    </div>
  );
}
