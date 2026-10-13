import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Link2,
  ListChecks,
  Network,
  PanelRightClose,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { ORGS, roleGoal } from "../role-center/domain";
import { useRoleStore } from "../role-center/store";
import { Badge, Confirm, Dialog, Empty } from "../role-center/ui";
import FlowGraphCanvas from "./FlowGraphCanvas";
import {
  FLOW_STATUS_LABEL,
  NODE_KIND_LABEL,
  addBinding,
  bindableNodes,
  bindingKey,
  descendantIds,
  flowBindingProgress,
  granularityLabel,
  nodeBindingStatus,
  nodeContext,
  ownerOrgNames,
  removeBinding,
  removeIntroducedFlow,
  introduceFlow,
  useFlowBindings,
  useFlowIntroductions,
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
  const intros = useFlowIntroductions();
  const [status, setStatus] = useState<"all" | FlowStatus>("all");
  const [org, setOrg] = useState("all");
  const [query, setQuery] = useState("");
  const [introOpen, setIntroOpen] = useState(false);
  const [removeFlow, setRemoveFlow] = useState<ValueFlow | null>(null);

  const introduced = useMemo(
    () => valueFlows.filter((flow) => intros[flow.id]),
    [intros],
  );
  const orgOptions = useMemo(
    () => [...new Set(introduced.flatMap((flow) => ownerOrgNames(flow)))].sort(),
    [introduced],
  );
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const filtering = status !== "all" || org !== "all" || query.trim() !== "";

  const matches = (flow: ValueFlow, progress: ReturnType<typeof flowBindingProgress>) => {
    if (status !== "all" && progress.status !== status) return false;
    if (org !== "all" && !ownerOrgNames(flow).includes(org)) return false;
    const keyword = query.trim();
    if (keyword && !`${flow.name}${flow.code}`.includes(keyword)) return false;
    return true;
  };

  /** 无筛选时按父子树展示；筛选/搜索时平铺命中结果，避免层级隐藏命中项 */
  const rows = useMemo(() => {
    const progressOf = (flow: ValueFlow) => flowBindingProgress(flow, bindings);
    const depthOf = (flow: ValueFlow): number => {
      let d = 0;
      let cur = flow;
      while (cur.parentId) {
        const parent = valueFlows.find((item) => item.id === cur.parentId);
        if (!parent) break;
        d += 1;
        cur = parent;
      }
      return d;
    };
    if (filtering) {
      return introduced
        .map((flow) => ({ flow, progress: progressOf(flow), depth: depthOf(flow) }))
        .filter(({ flow, progress }) => matches(flow, progress))
        .sort((a, b) => STATUS_ORDER[a.progress.status] - STATUS_ORDER[b.progress.status] || a.flow.code.localeCompare(b.flow.code));
    }
    const roots = introduced.filter((flow) => !flow.parentId || !intros[flow.parentId]);
    const out: Array<{ flow: ValueFlow; progress: ReturnType<typeof flowBindingProgress>; depth: number }> = [];
    const walk = (flow: ValueFlow, depth: number) => {
      out.push({ flow, progress: progressOf(flow), depth });
      if (collapsed.includes(flow.id)) return;
      for (const child of introduced.filter((item) => item.parentId === flow.id)) walk(child, depth + 1);
    };
    roots
      .slice()
      .sort((a, b) => STATUS_ORDER[progressOf(a).status] - STATUS_ORDER[progressOf(b).status] || a.code.localeCompare(b.code))
      .forEach((root) => walk(root, 0));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, org, query, bindings, introduced, collapsed, filtering]);

  const counts = useMemo(() => {
    const all = introduced.map((flow) => flowBindingProgress(flow, bindings));
    return {
      total: all.length,
      none: all.filter((item) => item.status === "none").length,
      partial: all.filter((item) => item.status === "partial").length,
      done: all.filter((item) => item.status === "done").length,
    };
  }, [bindings, introduced]);

  const removeDescendants = removeFlow
    ? descendantIds(removeFlow.id)
        .slice(1)
        .map((id) => valueFlows.find((item) => item.id === id))
        .filter((item): item is ValueFlow => !!item && !!intros[item.id])
    : [];
  const removeInfo = removeFlow
    ? descendantIds(removeFlow.id).reduce(
        (sum, id) =>
          sum +
          Object.entries(bindings).filter(([key, ids]) => key.startsWith(`${id}#`) && ids.length).length,
        0,
      )
    : 0;

  return (
    <div className="rc rc-shell definition-shell">
      <div className="rc-heading">
        <div>
          <h1>流程定义</h1>
          <p>引入 C大脑价值流到本项目，为流程节点配置岗位智能体。</p>
        </div>
      </div>
      <section className="rc-section">
        <header>
          <div>
            <h2>已引入价值流</h2>
            <p>共 {counts.total} 条 · 已绑定 {counts.done} · 部分绑定 {counts.partial} · 未绑定 {counts.none}</p>
          </div>
          <div className="rc-actions">
            <button className="rc-primary" onClick={() => setIntroOpen(true)}><Plus size={16} />引入价值流</button>
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
              <tr>{["名称", "编码", "责任组织", "岗位智能体绑定进度", "状态", "操作"].map((title) => <th key={title}>{title}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map(({ flow, progress, depth }) => {
                const orgs = ownerOrgNames(flow);
                const introducedChildren = introduced.filter((item) => item.parentId === flow.id);
                const isCollapsed = collapsed.includes(flow.id);
                return (
                  <tr key={flow.id}>
                    <td>
                      <span className="fd-tree-cell" style={{ paddingLeft: depth * 22 }}>
                        {introducedChildren.length > 0 ? (
                          <button
                            type="button"
                            className="fd-tree-toggle"
                            aria-label={isCollapsed ? `展开 ${flow.name} 的子流` : `收起 ${flow.name} 的子流`}
                            aria-expanded={!isCollapsed}
                            onClick={() =>
                              setCollapsed((cur) =>
                                isCollapsed ? cur.filter((id) => id !== flow.id) : [...cur, flow.id],
                              )
                            }
                          >
                            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                          </button>
                        ) : (
                          <span className="fd-tree-toggle fd-tree-toggle--leaf" />
                        )}
                        <strong>{flow.name}</strong>
                        {introducedChildren.length > 0 && (
                          <span className="fd-tree-count">{introducedChildren.length} 个子流</span>
                        )}
                      </span>
                    </td>
                    <td>{flow.code}</td>
                    <td><span className="fd-orgs" title={orgs.join("、")}>{orgs.join("、") || "—"}</span></td>
                    <td>{progress.bound}/{progress.total}</td>
                    <td><Badge tone={progress.status === "done" ? "green" : progress.status === "partial" ? "blue" : "gray"}>{FLOW_STATUS_LABEL[progress.status]}</Badge></td>
                    <td>
                      <div className="rc-actions">
                        <button onClick={() => onOpen(flow.id)}>查看详情</button>
                        <button onClick={() => setRemoveFlow(flow)}>删除</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && <Empty title="没有匹配的价值流">{counts.total === 0 ? "点击右上角「引入价值流」，从 C大脑目录中选择要配置的流。" : "调整筛选或搜索条件后重试。"}</Empty>}
        </div>
      </section>
      {introOpen && <IntroduceDialog intros={intros} onClose={() => setIntroOpen(false)} />}
      {removeFlow && (
        <Confirm
          title="删除"
          description={
            <>
              <p>
                删除后「{removeFlow.name}」将离开本项目工作队列
                {removeDescendants.length > 0 &&
                  `，其已引入的子流（${removeDescendants.map((item) => item.name).join("、")}）一并删除`}
                {removeInfo > 0 && `，共 ${removeInfo} 个节点的绑定关系一并删除`}。
              </p>
              <p>{removeInfo > 0 ? "绑定不是创造型资产，删除后不可恢复。" : "该流及其子流当前没有绑定，不会丢失其他数据。"}</p>
            </>
          }
          label="删除"
          danger
          onClose={() => setRemoveFlow(null)}
          onConfirm={() => {
            removeIntroducedFlow(removeFlow.id);
            setRemoveFlow(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------------- 引入对话框：目录浏览 + 搜索 + 责任组织辅助 ---------------- */

function IntroduceDialog({ intros, onClose }: { intros: Record<string, { introducedAt: string; introducedBy: string; versionAtIntro: string }>; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [org, setOrg] = useState("all");
  const [introState, setIntroState] = useState<"all" | "out" | "in">("out");
  const orgOptions = useMemo(
    () => [...new Set(valueFlows.flatMap((flow) => ownerOrgNames(flow)))].sort(),
    [],
  );
  const keyword = query.trim();
  /** 目录按父子顺序排列（父先子后），带层级深度 */
  const ordered = useMemo(() => {
    const out: Array<{ flow: ValueFlow; depth: number }> = [];
    const walk = (flow: ValueFlow, depth: number) => {
      out.push({ flow, depth });
      for (const child of valueFlows.filter((item) => item.parentId === flow.id)) walk(child, depth + 1);
    };
    valueFlows.filter((flow) => !flow.parentId).forEach((root) => walk(root, 0));
    return out;
  }, []);
  const rows = ordered.filter(({ flow }) => {
    if (introState !== "all" && (introState === "in") !== !!intros[flow.id]) return false;
    if (org !== "all" && !ownerOrgNames(flow).includes(org)) return false;
    if (keyword && !`${flow.name}${flow.code}`.includes(keyword)) return false;
    return true;
  });
  return (
    <Dialog title="引入价值流" onClose={onClose} footer={<button className="rc-primary" onClick={onClose}>完成</button>}>
      <p className="fd-picker-note">目录来自 C大脑本体，只读。引入的是引用：节点与流程结构始终以本体为准，本项目只配置绑定。</p>
      <div className="fd-filters">
        <label className="fd-filter">
          <span>引入状态</span>
          <select value={introState} onChange={(event) => setIntroState(event.target.value as typeof introState)}>
            <option value="out">未引入</option>
            <option value="in">已引入</option>
            <option value="all">全部</option>
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
          <input autoFocus value={query} placeholder="搜索名称或编码" onChange={(event) => setQuery(event.target.value)} />
        </label>
      </div>
      <div className="fd-picker-list fd-catalog">
        {rows.map(({ flow, depth }) => {
          const done = !!intros[flow.id];
          const parent = flow.parentId ? valueFlows.find((item) => item.id === flow.parentId) : null;
          const parentMissing = !!parent && !intros[parent.id];
          const orgs = ownerOrgNames(flow);
          return (
            <section key={flow.id}>
              <button
                type="button"
                disabled={done || parentMissing}
                title={parentMissing ? `需先引入父流「${parent!.name}」` : undefined}
                onClick={() => introduceFlow(flow.id)}
              >
                <strong style={{ paddingLeft: depth * 18 }}>{depth > 0 ? `└ ${flow.name}` : flow.name}</strong>
                <span>
                  {flow.code} · {granularityLabel(flow)} · {bindableNodes(flow).length} 个可绑定节点 · {orgs.join("、") || "—"}
                  {parentMissing ? ` · 需先引入「${parent!.name}」` : ""}
                </span>
                {done ? <Badge tone="gray">已引入</Badge> : parentMissing ? <Badge tone="gray">待父流</Badge> : <Badge tone="blue">引入</Badge>}
              </button>
            </section>
          );
        })}
        {!rows.length && <Empty title="目录中没有匹配的价值流">调整筛选或搜索条件后重试。</Empty>}
      </div>
    </Dialog>
  );
}

/* ---------------- 详情 ---------------- */

function FlowDetail({ flow, onBack }: { flow: ValueFlow; onBack: () => void }) {
  const store = useRoleStore();
  const bindings = useBindingsSnapshot();
  const roleNames = useMemo(
    () =>
      Object.fromEntries(
        store.roles.map((role) => [
          role.id,
          role.published?.definition.name || role.draft?.definition.name || role.id,
        ]),
      ),
    [store.roles],
  );
  const [tab, setTab] = useState<"graph" | "list">("graph");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ nodeId: string; nonce: number }>({ nodeId: "", nonce: 0 });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [onlyUnbound, setOnlyUnbound] = useState(false);
  const [listQuery, setListQuery] = useState("");

  const progress = flowBindingProgress(flow, bindings);
  const selectedNode = flow.nodes.find((node) => node.id === selectedNodeId) || null;

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

  /** 从清单页签点「配置绑定」：面板必须伴随可见的流程图，先切页签再选中 */
  const configureFromList = (nodeId: string) => {
    setTab("graph");
    setSelectedNodeId(nodeId);
  };

  /** 面板内点「添加绑定」：若在清单页签，切回流程图，选择器背后始终能看到节点位置 */
  const openPicker = () => {
    setTab("graph");
    setPickerOpen(true);
  };

  return (
    <div className="rc rc-shell definition-shell fd-detail">
      <header className="fd-detail-header">
        <button type="button" className="org-crumb" onClick={onBack}><ArrowLeft size={18} /><span>流程定义</span></button>
        <div className="fd-detail-title">
          <h1>{flow.name}</h1>
        </div>
      </header>

      <div className="org-tabs" role="tablist" aria-label="流程定义视图">
        <button type="button" role="tab" aria-selected={tab === "graph"} className={tab === "graph" ? "active" : ""} onClick={() => setTab("graph")}><Network size={15} />流程图</button>
        <button type="button" role="tab" aria-selected={tab === "list"} className={tab === "list" ? "active" : ""} onClick={() => setTab("list")}><ListChecks size={15} />绑定清单</button>
      </div>

      <div className={selectedNode ? "fd-detail-body fd-detail-body--panel" : "fd-detail-body"}>
        {tab === "graph" ? (
          <FlowGraphCanvas
            flow={flow}
            bindings={bindings}
            roleNames={roleNames}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
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
                          <button onClick={() => configureFromList(node.id)}>配置绑定</button>
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
            onOpenPicker={openPicker}
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
          <div className="fd-panel-title">
            <h2>{node.name}</h2>
            <Badge tone={node.kind === "value" ? "blue" : "amber"}>
              {node.kind === "value" ? "V · 价值节点" : "P · 普通活动"}
            </Badge>
          </div>
        </div>
        <button type="button" className="rc-icon" title="收起面板" aria-label="收起绑定面板" onClick={onClose}><PanelRightClose size={16} /></button>
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
          <h3>已绑定岗位智能体（{roleIds.length}）</h3>
          <div className="rc-actions">
            <button type="button" className="rc-primary" onClick={onOpenPicker}><Link2 size={15} />添加绑定</button>
          </div>
        </header>
        {!roleIds.length && (
          <div className="fd-panel-empty">
            <p>这个节点还没绑智能体，流程跑到这一步暂时无人承接。</p>
          </div>
        )}
        {roleIds.map((roleId) => {
          const role = store.roles.find((item) => item.id === roleId);
          if (!role) return null;
          const definition = role.published?.definition || role.draft?.definition;
          const goal = definition ? roleGoal(definition) : "尚未填写岗位目标";
          const unavailable = !role.published || role.disabled;
          return (
            <article key={roleId} className={`fd-binding ${unavailable ? "fd-binding--unavailable" : ""}`}>
              <div className="fd-binding-head">
                <strong>{definition?.name || roleId}</strong>
                <button type="button" title="解除该智能体与此节点的绑定" onClick={() => onAskRemove(roleId)}><Trash2 size={13} />移除</button>
              </div>
              <p className="fd-binding-intro" title={goal}>{goal}</p>
              {unavailable && <p className="fd-binding-warn">该智能体当前不可用（已停用或未发布），绑定保留但节点无法承接工作。</p>}
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
  const [justBound, setJustBound] = useState<string | null>(null);
  const bound = bindings[bindingKey(flow.id, nodeId)] || [];
  const node = flow.nodes.find((item) => item.id === nodeId);
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
    <Dialog
      title={node ? `为「${node.name}」添加绑定` : "添加绑定 · 选择岗位智能体"}
      onClose={onClose}
      footer={<button className="rc-primary" onClick={onClose}>完成</button>}
    >
      <p className="fd-picker-note">
        仅列出已发布的岗位智能体；绑定表示该节点的工作由此智能体承接。当前已绑 {bound.length} 个，再点一个即可继续添加。
      </p>
      <label className="fd-filter fd-filter--search"><Search size={15} /><input autoFocus value={query} placeholder="搜索智能体、岗位或组织" onChange={(event) => setQuery(event.target.value)} /></label>
      <div className="fd-picker-list">
        {Object.entries(groups).map(([orgName, roles]) => (
          <section key={orgName}>
            <h4>{orgName}</h4>
            {roles.map((role) => {
              const isBound = bound.includes(role.id);
              const definition = role.published!.definition;
              const goal = roleGoal(definition);
              return (
                <button
                  type="button"
                  key={role.id}
                  className={isBound ? "fd-picker-item--bound" : undefined}
                  disabled={isBound}
                  aria-label={isBound ? `${definition.name} 已绑定` : `绑定 ${definition.name}`}
                  onClick={() => {
                    addBinding(flow.id, nodeId, role.id);
                    setJustBound(role.id);
                  }}
                >
                  <strong>{definition.name}</strong>
                  <span className="fd-picker-intro" title={goal}>{goal}</span>
                  {isBound ? (
                    <Badge tone="gray"><Check size={11} />{justBound === role.id ? "已添加" : "已绑定"}</Badge>
                  ) : (
                    <span className="fd-picker-add"><Plus size={13} />绑定</span>
                  )}
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

/* 绑定关系快照：组件内订阅，保证增删后列表与图同步刷新 */
const useBindingsSnapshot = useFlowBindings;
