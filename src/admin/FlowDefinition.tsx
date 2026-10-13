import { useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Link2, ListChecks, Network, Search } from "lucide-react";
import { ORGS } from "../role-center/domain";
import { useRoleStore } from "../role-center/store";
import { Badge, Confirm, Dialog, Empty } from "../role-center/ui";
import FlowGraphCanvas from "./FlowGraphCanvas";
import {
  FLOW_STATUS_LABEL,
  NODE_KIND_LABEL,
  addBinding,
  bindableNodes,
  bindingKey,
  flowBindingProgress,
  granularityLabel,
  holders,
  holdersText,
  nodeBindingStatus,
  nodeContext,
  ownerOrgNames,
  removeBinding,
  useFlowBindings,
  valueFlows,
  type FlowStatus,
  type ValueFlow,
} from "./valueFlows";

const STATUS_ORDER: Record<FlowStatus, number> = { none: 0, partial: 1, done: 2 };

export default function FlowDefinition() {
  const [flowId, setFlowId] = useState<string | null>(null);
  const flow = valueFlows.find((item) => item.id === flowId) || null;
  return flow ? (
    <FlowDetail flow={flow} onBack={() => setFlowId(null)} />
  ) : (
    <FlowList onOpen={(id) => setFlowId(id)} />
  );
}

/* ---------------- 列表 ---------------- */

function FlowList({ onOpen }: { onOpen: (flowId: string) => void }) {
  const bindings = useFlowBindings();
  const [status, setStatus] = useState<"all" | FlowStatus>("all");
  const [granularity, setGranularity] = useState<"all" | "value" | "activity">("all");
  const [org, setOrg] = useState("all");
  const [query, setQuery] = useState("");

  const orgOptions = useMemo(
    () => [...new Set(valueFlows.flatMap((flow) => ownerOrgNames(flow)))].sort(),
    [],
  );
  const rows = useMemo(() => {
    const keyword = query.trim();
    return valueFlows
      .map((flow) => ({ flow, progress: flowBindingProgress(flow, bindings) }))
      .filter(({ flow, progress }) => {
        if (status !== "all" && progress.status !== status) return false;
        if (granularity !== "all") {
          const hasValue = flow.nodes.some((node) => node.kind === "value");
          if (granularity === "value" ? !hasValue : hasValue) return false;
        }
        if (org !== "all" && !ownerOrgNames(flow).includes(org)) return false;
        if (keyword && !`${flow.name}${flow.code}`.includes(keyword)) return false;
        return true;
      })
      .sort((a, b) => STATUS_ORDER[a.progress.status] - STATUS_ORDER[b.progress.status] || a.flow.code.localeCompare(b.flow.code));
  }, [status, granularity, org, query, bindings]);

  const counts = useMemo(() => {
    const all = valueFlows.map((flow) => flowBindingProgress(flow, bindings));
    return {
      total: all.length,
      none: all.filter((item) => item.status === "none").length,
      partial: all.filter((item) => item.status === "partial").length,
      done: all.filter((item) => item.status === "done").length,
    };
  }, [bindings]);

  return (
    <div className="rc rc-shell definition-shell">
      <div className="rc-heading">
        <div>
          <h1>流程定义</h1>
          <p>查看 C大脑价值流，为流程节点配置岗位智能体。</p>
        </div>
      </div>
      <section className="rc-section">
        <header>
          <div>
            <h2>全部价值流</h2>
            <p>共 {counts.total} 条 · 已绑定 {counts.done} · 部分绑定 {counts.partial} · 未绑定 {counts.none}</p>
          </div>
        </header>
        <div className="fd-filters">
          <label className="fd-filter">
            <span>绑定状态</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
              <option value="all">全部</option>
              <option value="none">未绑定</option>
              <option value="partial">部分绑定</option>
              <option value="done">已绑定</option>
            </select>
          </label>
          <label className="fd-filter">
            <span>粒度</span>
            <select value={granularity} onChange={(event) => setGranularity(event.target.value as typeof granularity)}>
              <option value="all">全部</option>
              <option value="value">价值节点流</option>
              <option value="activity">普通活动流</option>
            </select>
          </label>
          <label className="fd-filter">
            <span>责任组织</span>
            <select value={org} onChange={(event) => setOrg(event.target.value)}>
              <option value="all">全部</option>
              {orgOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
          <label className="fd-filter fd-filter--search">
            <Search size={15} />
            <input value={query} placeholder="搜索名称或编码" onChange={(event) => setQuery(event.target.value)} />
          </label>
        </div>
        <div className="definition-table-scroll">
          <table className="definition-table fd-table">
            <thead>
              <tr>{["名称", "编码", "粒度", "可绑定节点", "责任组织", "绑定进度", "状态", "本体版本", "操作"].map((title) => <th key={title}>{title}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map(({ flow, progress }) => {
                const orgs = ownerOrgNames(flow);
                return (
                  <tr key={flow.id}>
                    <td><strong>{flow.name}</strong></td>
                    <td>{flow.code}</td>
                    <td>{granularityLabel(flow)}</td>
                    <td>{progress.total} 个</td>
                    <td>
                      <div className="definition-tags">
                        {orgs.slice(0, 3).map((name) => <Badge key={name} tone="gray">{name}</Badge>)}
                        {orgs.length > 3 && <span title={orgs.slice(3).join("、")}>+{orgs.length - 3}</span>}
                      </div>
                    </td>
                    <td>{progress.bound}/{progress.total}</td>
                    <td><Badge tone={progress.status === "done" ? "green" : progress.status === "partial" ? "blue" : "gray"}>{FLOW_STATUS_LABEL[progress.status]}</Badge></td>
                    <td>{flow.version} · {flow.updatedAt}</td>
                    <td><button onClick={() => onOpen(flow.id)}>查看详情</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && <Empty title="没有匹配的价值流">调整筛选或搜索条件后重试。</Empty>}
        </div>
      </section>
    </div>
  );
}

/* ---------------- 详情 ---------------- */

function FlowDetail({ flow, onBack }: { flow: ValueFlow; onBack: () => void }) {
  const store = useRoleStore();
  const bindings = useBindingsSnapshot();
  const [tab, setTab] = useState<"graph" | "list">("graph");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [inspectNodeId, setInspectNodeId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ nodeId: string; nonce: number }>({ nodeId: "", nonce: 0 });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [cbrainHint, setCbrainHint] = useState(false);
  const [onlyUnbound, setOnlyUnbound] = useState(false);
  const [listQuery, setListQuery] = useState("");

  const progress = flowBindingProgress(flow, bindings);
  const selectedNode = flow.nodes.find((node) => node.id === selectedNodeId) || null;
  const inspectNode = flow.nodes.find((node) => node.id === inspectNodeId) || null;

  const listRows = bindableNodes(flow)
    .filter((node) => {
      const roleIds = bindings[bindingKey(flow.id, node.id)] || [];
      if (onlyUnbound && roleIds.length) return false;
      const keyword = listQuery.trim();
      return !keyword || node.name.includes(keyword);
    })
    .map((node) => {
      const roleIds = bindings[bindingKey(flow.id, node.id)] || [];
      const context = nodeContext(flow, node.id);
      return {
        node,
        roleIds,
        status: nodeBindingStatus(roleIds, store),
        orgs: node.kind === "value" ? context.owners : context.resources,
      };
    });

  const locate = (nodeId: string) => {
    setTab("graph");
    setSelectedNodeId(nodeId);
    setFocus((current) => ({ nodeId, nonce: current.nonce + 1 }));
  };

  return (
    <div className="rc rc-shell definition-shell fd-detail">
      <header className="fd-detail-header">
        <button type="button" className="org-crumb" onClick={onBack}><ArrowLeft size={18} /><span>流程定义</span></button>
        <div className="fd-detail-title">
          <h1>{flow.name}</h1>
          <div className="fd-detail-meta">
            <Badge tone="gray">{flow.code}</Badge>
            <Badge tone="blue">{granularityLabel(flow)}</Badge>
            <span className="fd-readonly">来自 C大脑 · 只读</span>
            <span>本体版本 {flow.version} · {flow.updatedAt} 更新</span>
            <span>已绑 {progress.bound}/{progress.total} 节点</span>
          </div>
        </div>
        <div className="rc-actions">
          <button type="button" onClick={() => setCbrainHint(true)}><ExternalLink size={15} />在 C大脑中打开</button>
        </div>
      </header>
      {cbrainHint && <p className="fd-hint">演示环境不跳转 C大脑，正式产品将打开该价值流的本体页面。</p>}

      <div className="org-tabs" role="tablist" aria-label="流程定义视图">
        <button type="button" role="tab" aria-selected={tab === "graph"} className={tab === "graph" ? "active" : ""} onClick={() => setTab("graph")}><Network size={15} />流程图</button>
        <button type="button" role="tab" aria-selected={tab === "list"} className={tab === "list" ? "active" : ""} onClick={() => setTab("list")}><ListChecks size={15} />绑定清单</button>
      </div>

      <div className={selectedNode ? "fd-detail-body fd-detail-body--panel" : "fd-detail-body"}>
        {tab === "graph" ? (
          <FlowGraphCanvas
            flow={flow}
            bindings={bindings}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onInspectNode={setInspectNodeId}
            focusNodeId={focus.nodeId}
            focusNonce={focus.nonce}
          />
        ) : (
          <section className="rc-section fd-list-section">
            <header>
              <div>
                <h2>可绑定节点</h2>
                <p>已绑 {progress.bound}/{progress.total} · 未绑定 {progress.total - progress.bound}</p>
              </div>
              <div className="rc-actions">
                <label className="fd-switch"><input type="checkbox" checked={onlyUnbound} onChange={(event) => setOnlyUnbound(event.target.checked)} />只看未绑定</label>
                <label className="fd-filter fd-filter--search"><Search size={15} /><input value={listQuery} placeholder="搜索节点名称" onChange={(event) => setListQuery(event.target.value)} /></label>
              </div>
            </header>
            <div className="definition-table-scroll">
              <table className="definition-table">
                <thead><tr>{["节点名称", "类型", "责任组织", "已绑", "状态", "操作"].map((title) => <th key={title}>{title}</th>)}</tr></thead>
                <tbody>
                  {listRows.map(({ node, roleIds, status, orgs }) => (
                    <tr key={node.id}>
                      <td><strong>{node.name}</strong></td>
                      <td>{NODE_KIND_LABEL[node.kind]}</td>
                      <td>{orgs.join("、") || "—"}</td>
                      <td>{roleIds.length} 个</td>
                      <td><Badge tone={status === "bound" ? "green" : status === "unavailable" ? "amber" : "gray"}>{status === "bound" ? "已绑定" : status === "unavailable" ? "含不可用" : "未绑定"}</Badge></td>
                      <td>
                        <div className="rc-actions">
                          <button onClick={() => locate(node.id)}>在图中定位</button>
                          <button onClick={() => setSelectedNodeId(node.id)}>配置绑定</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!listRows.length && <Empty title="没有匹配的节点">调整筛选或搜索条件后重试。</Empty>}
            </div>
          </section>
        )}

        {selectedNode && (
          <BindingPanel
            flow={flow}
            nodeId={selectedNode.id}
            onClose={() => setSelectedNodeId(null)}
            onOpenPicker={() => setPickerOpen(true)}
            onAskRemove={(roleId) => setRemoveTarget(roleId)}
          />
        )}
      </div>

      {pickerOpen && selectedNode && (
        <RolePickerDialog
          flow={flow}
          nodeId={selectedNode.id}
          onClose={() => setPickerOpen(false)}
        />
      )}
      {inspectNode && <InspectDialog flow={flow} nodeId={inspectNode.id} onClose={() => setInspectNodeId(null)} />}
      {removeTarget && selectedNode && (
        <Confirm
          title="解除绑定"
          description="解除后该节点不再由此智能体承接，确认解除？"
          label="解除绑定"
          danger
          onClose={() => setRemoveTarget(null)}
          onConfirm={() => {
            removeBinding(flow.id, selectedNode.id, removeTarget);
            setRemoveTarget(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------------- 绑定面板 ---------------- */

function BindingPanel({ flow, nodeId, onClose, onOpenPicker, onAskRemove }: {
  flow: ValueFlow;
  nodeId: string;
  onClose: () => void;
  onOpenPicker: () => void;
  onAskRemove: (roleId: string) => void;
}) {
  const store = useRoleStore();
  const bindings = useBindingsSnapshot();
  const node = flow.nodes.find((item) => item.id === nodeId);
  if (!node) return null;
  const context = nodeContext(flow, nodeId);
  const roleIds = bindings[bindingKey(flow.id, nodeId)] || [];

  return (
    <aside className="rc-section fd-panel">
      <header>
        <div>
          <h2>{node.name}</h2>
          <p>{NODE_KIND_LABEL[node.kind]} · 节点信息来自 C大脑，只读；此处只能配置绑定。</p>
        </div>
        <button type="button" className="rc-icon" aria-label="关闭绑定面板" onClick={onClose}>×</button>
      </header>

      <div className="fd-panel-context">
        <p><span>上游输入</span>{context.inputDocs.join("、") || "—"}</p>
        <p><span>前序节点</span>{context.upstream.join("、") || "流程起点"}</p>
        <p><span>下游输出</span>{context.outputDocs.join("、") || "—"}</p>
        <p><span>后继节点</span>{context.downstream.join("、") || "流程终点"}</p>
        <p><span>所有者组织</span>{context.owners.join("、") || "—"}</p>
        {node.kind === "value" && <p><span>使用方组织</span>{context.users.join("、") || "—"}</p>}
        {node.kind === "activity" && <p><span>资源组织</span>{context.resources.join("、") || "—"}</p>}
        {node.linkedModel && <p><span>关联模型</span>{node.linkedModel}</p>}
      </div>

      <div className="fd-panel-bindings">
        <header>
          <h3>已绑定岗位智能体</h3>
          <button type="button" className="rc-primary" onClick={onOpenPicker}><Link2 size={15} />添加绑定</button>
        </header>
        {!roleIds.length && <p className="fd-panel-empty">这个节点还没绑智能体。</p>}
        {roleIds.map((roleId) => {
          const role = store.roles.find((item) => item.id === roleId);
          if (!role) return null;
          const position = role.published?.definition.position;
          const orgName = ORGS.find((item) => item.id === position?.org)?.name.split(" / ").at(-1) || position?.org || "未关联岗位";
          const info = holders(store, roleId);
          const unavailable = !role.published || role.disabled;
          return (
            <article key={roleId} className={`fd-binding ${unavailable ? "fd-binding--unavailable" : ""}`}>
              <div className="fd-binding-head">
                <strong>{role.published?.definition.name || role.draft?.definition.name || roleId}</strong>
                <button type="button" onClick={() => onAskRemove(roleId)}>移除</button>
              </div>
              <p className="fd-binding-meta">{position?.name || "未关联岗位"} · {orgName} · {role.published?.version || "未发布"}</p>
              {unavailable && <p className="fd-binding-warn">该智能体当前不可用（已停用或未发布），绑定保留但节点无法承接工作。</p>}
              <p className={`fd-binding-holders ${info.count === 0 ? "fd-binding-holders--none" : ""}`}>{holdersText(info)}</p>
            </article>
          );
        })}
      </div>
    </aside>
  );
}

/* ---------------- 选择器（策略 A：纯手动） ---------------- */

function RolePickerDialog({ flow, nodeId, onClose }: { flow: ValueFlow; nodeId: string; onClose: () => void }) {
  const store = useRoleStore();
  const bindings = useBindingsSnapshot();
  const [query, setQuery] = useState("");
  const bound = bindings[bindingKey(flow.id, nodeId)] || [];
  const published = store.roles.filter((role) => role.published && !role.disabled);
  const keyword = query.trim();
  const groups = published
    .map((role) => {
      const position = role.published!.definition.position;
      const orgName = ORGS.find((item) => item.id === position?.org)?.name.split(" / ").at(-1) || "未关联岗位";
      return { role, position, orgName };
    })
    .filter(({ role, position, orgName }) => !keyword || `${role.published!.definition.name}${position?.name || ""}${orgName}`.includes(keyword))
    .reduce<Record<string, typeof published>>((acc, item) => {
      (acc[item.orgName] ||= []).push(item.role);
      return acc;
    }, {});

  return (
    <Dialog title="添加绑定 · 选择岗位智能体" onClose={onClose} footer={<button className="rc-primary" onClick={onClose}>完成</button>}>
      <p className="fd-picker-note">仅列出已发布的岗位智能体；绑定表示该节点的工作由此智能体承接。</p>
      <label className="fd-filter fd-filter--search"><Search size={15} /><input autoFocus value={query} placeholder="搜索智能体、岗位或组织" onChange={(event) => setQuery(event.target.value)} /></label>
      <div className="fd-picker-list">
        {Object.entries(groups).map(([orgName, roles]) => (
          <section key={orgName}>
            <h4>{orgName}</h4>
            {roles.map((role) => {
              const isBound = bound.includes(role.id);
              const position = role.published!.definition.position;
              return (
                <button
                  type="button"
                  key={role.id}
                  disabled={isBound}
                  onClick={() => addBinding(flow.id, nodeId, role.id)}
                >
                  <strong>{role.published!.definition.name}</strong>
                  <span>{position?.name || "未关联岗位"} · {role.published!.version}</span>
                  {isBound ? <Badge tone="gray">已绑定</Badge> : <Badge tone="blue">绑定</Badge>}
                </button>
              );
            })}
          </section>
        ))}
        {!Object.keys(groups).length && <Empty title="没有匹配的岗位智能体">调整搜索条件后重试。</Empty>}
      </div>
    </Dialog>
  );
}

/* ---------------- 只读节点信息卡 ---------------- */

function InspectDialog({ flow, nodeId, onClose }: { flow: ValueFlow; nodeId: string; onClose: () => void }) {
  const node = flow.nodes.find((item) => item.id === nodeId);
  if (!node) return null;
  const rows = flow.edges
    .filter((edge) => edge.from === nodeId || edge.to === nodeId)
    .map((edge) => {
      const other = flow.nodes.find((item) => item.id === (edge.from === nodeId ? edge.to : edge.from));
      const direction = edge.to === nodeId ? "来自" : "去往";
      return { id: edge.id, label: `${edge.kind === "input" || edge.kind === "output" ? (edge.kind === "input" ? "输入" : "输出") : edge.kind === "owner" ? "所有者" : edge.kind === "user" ? "使用方" : edge.kind === "resource" ? "资源" : "执行顺序"} · ${direction} ${other?.name || ""}` };
    });
  return (
    <Dialog title={node.name} onClose={onClose} footer={<button className="rc-primary" onClick={onClose}>关闭</button>}>
      <p className="fd-picker-note">{NODE_KIND_LABEL[node.kind]} · 信息来自 C大脑，只读。{node.linkedModel ? `关联模型：${node.linkedModel}` : ""}</p>
      <div className="fd-inspect-list">
        {rows.map((row) => <p key={row.id}>{row.label}</p>)}
        {!rows.length && <p>该节点暂无关联连线。</p>}
      </div>
    </Dialog>
  );
}

/* 绑定关系快照：组件内订阅，保证增删后列表与图同步刷新 */
const useBindingsSnapshot = useFlowBindings;
