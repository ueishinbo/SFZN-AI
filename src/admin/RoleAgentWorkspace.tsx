import type { Position } from "./positionModels";
import type { AdminPageId } from "./mockAdminData";
import { PositionTree, PositionCapabilityMap } from "./PositionCapabilityMap";
import { useFeedback } from "../role-center/feedback";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  ChevronRight,
  Copy,
  Download,
  FileText,
  GitBranch,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  RESPONSIBILITY_HEADINGS,
  ORGS,
  canEdit,
  baseDefinition,
  currentDefinition,
  currentStatus,
  emptyScope,
  matchesScope,
  readyForApproval,
  scopeLabels,
  roleDefinitionMarkdown,
  roleGoal,
  sections,
  uid,
  type Definition,
  type ResourceKind,
  type RoleAgent,
  type Scope,
  type TestCase,
  type Version,
} from "../role-center/domain";
import { actions, download, useRoleStore } from "../role-center/store";
import {
  Badge,
  Confirm,
  Dialog,
  Empty,
  Markdown,
  Notice,
  ScopePicker,
  Summary,
} from "../role-center/ui";

const KINDS: [ResourceKind, string][] = [
  ["skill", "技能"],
  ["mcp", "MCP"],
];
const anchors = [
  ["map", "能力地图"],
  ["summary", "岗位画像"],
  ["assets", "能力配置"],
  ["release", "评测与发布"],
  ["versions", "版本记录"],
];
type PositionSource = Pick<
  Definition,
  "responsibilities" | "capabilityMap" | "knowledgeMap" | "permissionRules"
> & {
  id: string;
  org: string;
  name: string;
  description: string;
};
const POSITION_SOURCES: PositionSource[] = [
  {
    id: "product-manager",
    org: "产品研发部",
    name: "产品经理",
    description: "需求规划、方案评审与产品迭代",
    responsibilities:
      "# 岗位目标\n将业务机会转化为可落地、可验收的产品方案与迭代计划。\n\n# 核心职责\n- 洞察用户与业务需求，明确产品目标、范围和优先级。\n- 协同设计、研发和业务团队完成方案评审与交付闭环。\n\n# 关键交付物\n- 产品需求文档、产品路线图和验收标准。\n- 评审结论、风险清单和迭代计划。\n\n# 工作边界与人工确认/升级规则\n- 对外承诺、资源承诺和正式发布须经负责人确认。\n- 超出产品职责的专业判断，升级至对应责任人处理。",
    capabilityMap: [
      {
        id: "extract-cap-product-1",
        name: "需求洞察与评审闭环",
        content:
          "梳理用户场景、业务目标和约束，形成需求优先级与评审材料；识别风险、依赖和待确认事项并推动闭环。",
      },
    ],
    knowledgeMap: [
      {
        id: "extract-knowledge-product-1",
        name: "产品规范与业务流程",
        content: "产品规划规范、需求评审机制、现有业务流程与核心指标口径。",
      },
    ],
    permissionRules:
      "- 产品范围、排期和资源承诺须经业务负责人确认。\n- 不得直接变更生产系统数据或对外发布未审定方案。\n- 跨部门优先级冲突应升级至项目负责人协调。",
  },
  {
    id: "solution-manager",
    org: "市场与营销部",
    name: "解决方案经理",
    description: "客户场景分析、解决方案设计与售前协同",
    responsibilities:
      "# 岗位目标\n围绕客户业务场景形成可评审的解决方案，并推动售前协同与风险澄清。\n\n# 核心职责\n- 分析客户诉求、现状与关键约束，识别解决方案机会。\n- 组织方案架构、价值表达和内部评审，沉淀可复用材料。\n\n# 关键交付物\n- 客户解决方案、价值说明、风险与依赖清单。\n- 方案评审纪要、答疑材料与行动计划。\n\n# 工作边界与人工确认/升级规则\n- 对外承诺、资源承诺和正式发布须经负责人确认。\n- 超出岗位职责的专业判断，升级至对应责任人处理。",
    capabilityMap: [
      {
        id: "extract-cap-solution-1",
        name: "客户场景诊断与方案设计",
        content:
          "访谈并梳理客户目标、痛点和约束，组合产品能力与业务流程，形成方案逻辑、价值证据和实施边界。",
      },
    ],
    knowledgeMap: [
      {
        id: "extract-knowledge-solution-1",
        name: "行业方案资产",
        content: "行业客户案例、解决方案模板、产品能力边界、报价与合规规则。",
      },
    ],
    permissionRules:
      "- 对外方案、报价、交付承诺必须经授权责任人确认。\n- 不得引用未授权客户资料或承诺未验证的产品能力。\n- 涉及合同、合规或重大商务风险时应升级专业负责人。",
  },
  {
    id: "project-manager",
    org: "项目交付部",
    name: "项目经理",
    description: "计划统筹、风险治理与跨团队交付",
    responsibilities:
      "# 岗位目标\n统筹项目计划、资源、风险与协作事项，保障项目按质量、范围和节奏交付。\n\n# 核心职责\n- 制定并维护项目计划、里程碑、风险和问题台账。\n- 组织跨团队协同、例会评审和交付验收，推动问题闭环。\n\n# 关键交付物\n- 项目计划、周报、风险清单和里程碑验收材料。\n- 项目会议纪要、行动项和复盘报告。\n\n# 工作边界与人工确认/升级规则\n- 项目范围、预算和对外承诺须经负责人确认。\n- 超出项目管理职责的专业判断，升级至对应责任人处理。",
    capabilityMap: [
      {
        id: "extract-cap-project-1",
        name: "项目计划与风险闭环",
        content:
          "分解任务与里程碑，跟踪进展、资源和依赖；建立风险预警、责任人和截止时间，推动跨团队问题闭环。",
      },
    ],
    knowledgeMap: [
      {
        id: "extract-knowledge-project-1",
        name: "项目交付方法与标准",
        content: "项目管理制度、交付流程、风险分级标准、验收规范和历史复盘案例。",
      },
    ],
    permissionRules:
      "- 范围变更、资源调整和对外承诺必须经项目负责人确认。\n- 不得越权修改项目管理系统中的关键基线与验收结论。\n- 重大风险、跨部门资源冲突应及时升级项目发起人。",
  },
];
export default function RoleAgentWorkspace({
  onDirtyChange,
  onNavigate,
}: {
  onDirtyChange: (dirty: boolean) => void;
  onNavigate: (page: AdminPageId) => void;
}) {
  const store = useRoleStore();
  const initial = new URLSearchParams(location.search);
  const [selectedId, setSelectedId] = useState(initial.get("role") || ""),
    [creating, setCreating] = useState(false),
    [copyId, setCopyId] = useState(""),
    [query, setQuery] = useState(initial.get("rq") || ""),
    [status, setStatus] = useState(initial.get("rs") || ""),
    [scope, setScope] = useState<Scope>(() => {
      try {
        return JSON.parse(initial.get("scope") || "null") || emptyScope();
      } catch {
        return emptyScope();
      }
    }),
    [scopeOpen, setScopeOpen] = useState(false),
    [deleteId, setDeleteId] = useState("");
  const { perform, feedback } = useFeedback();
  const selected = store.roles.find((r) => r.id === selectedId);
  useEffect(() => {
    const url = new URL(location.href);
    for (const [key, value] of Object.entries({
      role: selectedId,
      rq: query,
      rs: status,
      scope: [...scope.orgs, ...scope.groups, ...scope.users].length
        ? JSON.stringify(scope)
        : "",
    })) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    history.replaceState(null, "", url);
  }, [selectedId, query, status, scope]);
  const open = (id: string) => {
    setSelectedId(id);
    document.querySelector(".admin-content")?.scrollTo({ top: 0 });
  };
  const reset = () => {
    setQuery("");
    setStatus("");
    setScope(emptyScope());
  };
  const weight = (r: RoleAgent) =>
    r.draft?.status === "待审批"
      ? 0
      : store.suggestions.some(
            (s) => s.roleId === r.id && s.status === "待处理",
          )
        ? 1
        : r.draft
          ? 2
          : r.disabled
            ? 4
            : 3;
  const filtered = store.roles
    .filter((r) => {
      const d = currentDefinition(r);
      return (
        (!query ||
          `${d.name}${roleGoal(d)}`
            .toLowerCase()
            .includes(query.toLowerCase())) &&
        (!status || currentStatus(r) === status) &&
        (![...scope.orgs, ...scope.groups, ...scope.users].length ||
          store.people.some(
            (p) =>
              p.active && matchesScope(p, scope) && matchesScope(p, d.scope),
          ))
      );
    })
    .sort(
      (a, b) => weight(a) - weight(b) || b.updatedAt.localeCompare(a.updatedAt),
    );
  const metrics = [
    ["岗位总数", store.roles.length],
    [
      "草稿 / 评测中",
      store.roles.filter((r) => r.draft && r.draft.status !== "待审批").length,
    ],
    [
      "待审批",
      store.approvals.filter((a) => a.roleId && a.status === "待审批").length,
    ],
    ["已发布", store.roles.filter((r) => r.published && !r.disabled).length],
    [
      "待处理进化建议",
      store.suggestions.filter((s) => s.status === "待处理").length,
    ],
  ];
  if (selected)
    return (
      <div className="rc rc-shell">
        <RoleDetail
          key={selected.id}
          role={selected}
          onDirtyChange={onDirtyChange}
          onBack={() => setSelectedId("")}
          onApproval={() => onNavigate("approvals")}
        />
      </div>
    );
  return (
    <div className="rc rc-shell">
      <div className="rc-heading">
        <div>
          <h1>岗位智能体管理</h1>
          <p>维护岗位工作方法与能力配置。</p>
        </div>
        <button
          className="rc-primary"
          disabled={!canEdit(store)}
          onClick={() => {
            setCopyId("");
            setCreating(true);
          }}
        >
          <Plus size={17} />
          新建岗位智能体
        </button>
      </div>
      <div className="rc-metrics">
        {metrics.map(([label, n]) => (
          <article key={label}>
            <span>{label}</span>
            <b>{n}</b>
          </article>
        ))}
      </div>
      <div className="rc-toolbar">
        <label className="rc-search">
          <Search size={17} />
          <input
            aria-label="搜索岗位智能体"
            placeholder="搜索岗位名称或目标"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="岗位状态"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">全部状态</option>
          {["草稿", "评测中", "待审批", "已发布", "已停用"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button onClick={() => setScopeOpen(true)}>
          可添加范围
          {[...scope.orgs, ...scope.groups, ...scope.users].length
            ? `（${[...scope.orgs, ...scope.groups, ...scope.users].length}）`
            : ""}
        </button>
        <small className="rc-count">共 {filtered.length} 项</small>
        {(query || status || scopeLabels(scope, store.people).length > 0) && (
          <button className="rc-link" onClick={reset}>
            清空筛选
          </button>
        )}
      </div>
      <div className="rc-cards">
        {filtered.map((r) => {
          const d = currentDefinition(r);
          const suggestions = store.suggestions.filter(
            (s) => s.roleId === r.id && s.status === "待处理",
          );
          const invalid = d.resourceIds.filter(
            (id) => !store.resources.some((x) => x.id === id && x.active),
          );
          return (
            <article
              className="rc-role-card"
              key={r.id}
              onClick={(e) => {
                if (!(e.target as HTMLElement).closest("button,a,input,select"))
                  open(r.id);
              }}
            >
              <header>
                <i className="rc-role-icon">
                  <Bot size={23} />
                </i>
                <div>
                  <button
                    className="rc-link"
                    style={{ textAlign: "left", whiteSpace: "normal" }}
                    onClick={() => open(r.id)}
                  >
                    <h3>{d.name}</h3>
                  </button>
                  <div className="rc-actions">
                    <Badge>{currentStatus(r)}</Badge>
                    <small>
                      {r.published?.version || r.draft?.version}
                      {r.published && r.draft
                        ? ` · ${r.draft.version} 草稿`
                        : ""}
                    </small>
                  </div>
                </div>
              </header>
              <p className="rc-goal">
                {roleGoal(d) ||
                  "岗位说明尚未填写，补全工作职责与边界后发起评测。"}
              </p>
              <div className="rc-card-meta">
                <span>更新于 {r.updatedAt.slice(5, 16)}</span>
              </div>
              {(suggestions.length > 0 ||
                invalid.length > 0 ||
                r.draft?.status === "待审批") && (
                <div className="rc-actions">
                  {suggestions.length > 0 && (
                    <button
                      className="rc-link"
                      onClick={() => {
                        open(r.id);
                        setTimeout(
                          () =>
                            document
                              .getElementById("evolution")
                              ?.scrollIntoView({ behavior: "smooth" }),
                          100,
                        );
                      }}
                    >
                      {suggestions.length} 项优化建议
                    </button>
                  )}
                  {invalid.length > 0 && (
                    <Badge tone="amber">{invalid.length} 项能力异常</Badge>
                  )}
                  {r.draft?.status === "待审批" && (
                    <Badge tone="amber">等待审批</Badge>
                  )}
                </div>
              )}
              <footer>
                <button className="rc-link" onClick={() => open(r.id)}>
                  查看详情
                  <ChevronRight size={14} />
                </button>
                <div className="rc-actions">
                  {!r.draft && r.published && !r.disabled && (
                    <button
                      disabled={!canEdit(store)}
                      onClick={() => {
                        if (perform(() => actions.newDraft(r.id)) !== false)
                          open(r.id);
                      }}
                    >
                      <GitBranch size={14} />
                      创建新版本
                    </button>
                  )}
                  {r.draft && (
                    <button onClick={() => open(r.id)}>
                      {r.draft.status === "草稿"
                        ? "编辑草稿"
                        : r.draft.status === "评测中"
                          ? "查看评测"
                          : "查看审批"}
                    </button>
                  )}
                  <button
                    className="rc-icon"
                    aria-label={`复制${d.name}`}
                    title="复制岗位智能体"
                    disabled={!canEdit(store)}
                    onClick={() => {
                      setCopyId(r.id);
                      setCreating(true);
                    }}
                  >
                    <Copy size={15} />
                  </button>
                  {r.draft?.status === "草稿" && !r.published && (
                    <button
                      className="rc-icon"
                      title="删除草稿"
                      aria-label={`删除${d.name}`}
                      disabled={!canEdit(store)}
                      onClick={() => setDeleteId(r.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </footer>
            </article>
          );
        })}
        {!filtered.length && (
          <Empty title="未找到符合条件的岗位智能体">
            <button onClick={reset}>清空筛选</button>
          </Empty>
        )}
      </div>
      {scopeOpen && (
        <Dialog
          title="筛选可添加范围"
          onClose={() => setScopeOpen(false)}
          footer={
            <>
              <button onClick={() => setScope(emptyScope())}>清空范围</button>
              <button
                className="rc-primary"
                onClick={() => setScopeOpen(false)}
              >
                完成
              </button>
            </>
          }
        >
          <ScopePicker
            value={scope}
            onChange={setScope}
            people={store.people}
          />
        </Dialog>
      )}
      {creating && <CreateRole copyId={copyId} onCancel={() => setCreating(false)} onCreated={(id) => { setCreating(false); open(id); }} />}
      {deleteId && (
        <Confirm
          title="删除岗位智能体草稿"
          description="此草稿尚未发布。删除后将保留操作审计记录。"
          danger
          label="删除草稿"
          onClose={() => setDeleteId("")}
          onConfirm={() => {
            if (
              perform(() => actions.deleteDraft(deleteId), "草稿已删除") !==
              false
            )
              setDeleteId("");
          }}
        />
      )}
      {feedback}
    </div>
  );
}
function CreateRole({ copyId, onCancel, onCreated }: { copyId: string; onCancel: () => void; onCreated: (id: string) => void }) {
  const store = useRoleStore();
  const [position, setPosition] = useState<Position>();
  const { perform, feedback } = useFeedback();
  const original = store.roles.find(r => r.id === copyId);
  return <Dialog title={original ? "复制岗位智能体 · 选择所属岗位" : "新建岗位智能体"} onClose={onCancel} footer={<><button onClick={onCancel}>取消</button><button className="rc-primary" disabled={!position} onClick={() => {
    if (!position) return;
    const source = POSITION_SOURCES.find(p => p.name === position.name);
    const definition: Definition = original ? structuredClone(currentDefinition(original)) : { ...baseDefinition(`${position.name}智能体`, store.adminId), resourceIds: [], responsibilities: source?.responsibilities || "", capabilityMap: [], knowledgeMap: source?.knowledgeMap || [], permissionRules: source?.permissionRules || "", templates: [], tests: [] };
    definition.name = original ? `${definition.name}副本` : `${position.name}智能体`;
    definition.position = position;
    definition.owner = store.adminId;
    definition.scope = { orgs: [position.org], groups: [], users: [] };
    const result = perform(() => actions.create(definition.name, store.adminId, definition.scope, copyId || undefined, definition), "已创建草稿");
    if (typeof result === "string") onCreated(result);
  }}>确认岗位，进入配置<ChevronRight size={15}/></button></>}>
    <div className="pc-create-steps"><strong><span>1</span>选择岗位</strong><i/><span>2 配置智能体</span></div>
    <p className="pc-dialog-intro">展开组织，选择这个智能体所属的具体岗位。</p>
    <PositionTree value={position} onChange={setPosition}/>
    <div className="pc-selection-summary">{position ? <><CheckCircle2 size={17}/><span>{ORGS.find(o => o.id === position.org)?.name} / <strong>{position.name}</strong></span></> : "请选择一个岗位，组织节点仅用于展开。"}</div>
    {feedback}
  </Dialog>;
}
function RoleDetail({
  role,
  onDirtyChange,
  onBack,
  onApproval,
}: {
  role: RoleAgent;
  onDirtyChange: (dirty: boolean) => void;
  onBack: () => void;
  onApproval: () => void;
}) {
  const store = useRoleStore();
  const d = currentDefinition(role);
  const [activeTab, setActiveTab] = useState("map");
  const [associateOpen, setAssociateOpen] = useState(false);
  const [pendingPosition, setPendingPosition] = useState<Position>();
  const [editingProfile, setEditingProfile] = useState(false);
  const [form, setForm] = useState<Definition>(() => structuredClone(d)),
    [picker, setPicker] = useState<ResourceKind | null>(null),
    [assetEditor, setAssetEditor] = useState<{
      kind: "capabilityMap" | "knowledgeMap" | "templates" | "tests";
      asset: TestCase;
      isNew: boolean;
    } | null>(null),
    [extractionOpen, setExtractionOpen] = useState(false),
    [selectedSourceId, setSelectedSourceId] = useState(""),
    [overwriteSource, setOverwriteSource] = useState<PositionSource | null>(null),
    [publishedOpen, setPublishedOpen] = useState(false),
    [leave, setLeave] = useState(false),
    [discard, setDiscard] = useState(false),
    [operation, setOperation] = useState<"disable" | "restore" | null>(null),
    [reason, setReason] = useState(""),
    [handling, setHandling] = useState(""),
    [restoreVersion, setRestoreVersion] = useState(""),
    [compare, setCompare] = useState<Version | null>(null);
  const { perform, feedback } = useFeedback();
  const saved = JSON.stringify(d);
  useEffect(() => {
    setForm(JSON.parse(saved));
  }, [saved]);
  const editable = role.draft?.status === "草稿" && canEdit(store);
  const dirty = !!editable && JSON.stringify(form) !== saved;
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
  useEffect(() => {
    const listener = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [dirty]);
  const update = (next: Definition) => setForm(next);
  const missing = RESPONSIBILITY_HEADINGS.filter(
    (h) => !sections(form.responsibilities)[h],
  );
  const invalid = form.resourceIds.filter(
    (id) => !store.resources.some((r) => r.id === id && r.active),
  );
  const sys =
    store.people.find((p) => p.id === store.adminId)?.role === "sys_admin";
  const newAsset = (
    kind: "capabilityMap" | "knowledgeMap" | "templates" | "tests",
  ) =>
    setAssetEditor({
      kind,
      asset: {
        id: uid(kind),
        name: "",
        content: "",
        redline: kind === "tests",
      },
      isNew: true,
    });
  const applyExtraction = (source: PositionSource) => {
    update({
      ...form,
      responsibilities: source.responsibilities,
      knowledgeMap: structuredClone(source.knowledgeMap),
      permissionRules: source.permissionRules,
    });
    setExtractionOpen(false);
    setOverwriteSource(null);
  };
  const profileHasContent = Boolean(
    form.responsibilities.trim() ||
      form.capabilityMap.length ||
      form.knowledgeMap.length ||
      form.permissionRules.trim(),
  );
  return (
    <>
      <div className="rc-detail-head">
        <button
          className="rc-link"
          onClick={() => (dirty ? setLeave(true) : onBack())}
        >
          <ArrowLeft size={15} />
          返回岗位列表
        </button>
        <div className="rc-heading" style={{ marginBottom: 8 }}>
          <div>
            <h1>{d.name}</h1>
            <div className="rc-actions">
              <Badge>{currentStatus(role)}</Badge>
              {role.published && <small>线上 {role.published.version}</small>}
              {role.draft && (
                <small>
                  当前 {role.draft.version} · {role.draft.status}
                </small>
              )}
              <small>
                维护人：{store.people.find((p) => p.id === d.owner)?.name}
              </small>
              <small>{role.updatedAt}</small>
            </div>
          </div>
          <div className="rc-actions">
            {role.published && role.draft && (
              <button onClick={() => setPublishedOpen(true)}>
                查看线上版本
              </button>
            )}
            {!role.draft && (
              <button
                disabled={!canEdit(store)}
                className="rc-primary"
                onClick={() =>
                  perform(() => actions.newDraft(role.id), "已创建新版本草稿")
                }
              >
                <Plus size={15} />
                创建新版本
              </button>
            )}
            {role.published && (
              <button
                disabled={!sys || dirty}
                onClick={() => {
                  setOperation(role.disabled ? "restore" : "disable");
                  setReason("");
                  setHandling("");
                  setRestoreVersion(role.published!.version);
                }}
              >
                {role.disabled ? "恢复发布" : "停用岗位"}
              </button>
            )}
          </div>
        </div>
        {role.draft && (
          <div className="rc-steps">
            {["草稿", "评测中", "待审批", "已发布"].map((s, i) => (
              <span
                key={s}
                className={
                  ["草稿", "评测中", "待审批"].indexOf(role.draft!.status) >= i
                    ? "done"
                    : ""
                }
              >
                <i>{i + 1}</i>
                {s}
              </span>
            ))}
          </div>
        )}
        {role.draft?.rejection && (
          <Notice error>处理意见：{role.draft.rejection}</Notice>
        )}
        {role.disabled && (
          <Notice error>
            岗位已停用，个人无法发起新任务。历史运行记录与版本快照仍可查询。
          </Notice>
        )}
        {invalid.length > 0 && (
          <Notice error>
            存在失效能力：
            {invalid
              .map((id) => store.resources.find((r) => r.id === id)?.name || id)
              .join("、")}
            。请在草稿中更新引用后重新评测。
          </Notice>
        )}
      </div>
      <div className="pc-config-layout">
        <aside className="pc-config-sidebar"><header><span className="pc-eyebrow">ORGANIZATION</span><h3>组织架构</h3></header>
          <PositionTree key={form.position?.id || "unlinked"} value={form.position}/>
          <div className="pc-sidebar-current"><small>当前配置岗位</small><strong>{form.position?.name || "尚未关联组织岗位"}</strong>{editable && !form.position && <button onClick={() => {setPendingPosition(undefined); setAssociateOpen(true);}}>关联岗位</button>}</div>
        </aside>
        <main className="pc-config-main">
          <nav className="pc-tabs" aria-label="岗位配置模块">{anchors.map(([id,label]) => <button key={id} aria-current={activeTab === id ? "page" : undefined} className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)}>{label}</button>)}</nav>
          <div className="pc-tab-content">
          {activeTab === "map" && <PositionCapabilityMap key={form.position?.id || "unlinked"} definition={form} onAssociate={editable ? () => {setPendingPosition(undefined);setAssociateOpen(true);} : undefined}/>}
        <section id="summary" hidden={activeTab !== "summary"} className="rc-section rc-role-profile">
          <header>
            <h2>岗位画像</h2>
            <div className="rc-actions">
              {editable && !role.published && (
                <button
                  onClick={() => {
                    setSelectedSourceId("");
                    setExtractionOpen(true);
                  }}
                >
                  导入岗位资料
                </button>
              )}
              <small>岗位职责、知识地图与行为规则</small>
              {editable && <button onClick={() => setEditingProfile(!editingProfile)}>{editingProfile ? "完成编辑" : "编辑画像"}</button>}
            </div>
          </header>
          {editable && editingProfile && (
            <div className="rc-grid" style={{ marginBottom: 24 }}>
              <label className="rc-field">
                岗位智能体名称
                <input
                  maxLength={40}
                  value={form.name}
                  onChange={(e) => update({ ...form, name: e.target.value })}
                />
              </label>
              <label className="rc-field">
                维护人
                <select
                  value={form.owner}
                  onChange={(e) => update({ ...form, owner: e.target.value })}
                >
                  {store.people
                    .filter((p) => p.role === "resource_admin" && p.active)
                    .map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>
          )}
          <div className={!(editable && editingProfile) ? "rc-profile-grid" : undefined}>
          <div className={`rc-assets ${!(editable && editingProfile) ? "rc-profile-card rc-profile-responsibilities" : ""}`}>
            <header><h3>岗位职责</h3></header>
            {editable && editingProfile ? (
              <textarea
                className="rc-editor"
                aria-label="岗位职责"
                value={form.responsibilities}
                onChange={(e) => update({ ...form, responsibilities: e.target.value })}
              />
            ) : <Summary definition={form} />}
            {missing.length > 0 && <Notice error>请补充：{missing.join("、")}</Notice>}
          </div>
          {(
            [
              ["knowledgeMap", "知识地图"],
            ] as const
          ).map(([kind, label]) => (
            <div className={`rc-assets ${!(editable && editingProfile) ? "rc-profile-card" : ""}`} key={kind}>
              <header>
                <h3>{label}</h3>
                {editable && <button onClick={() => newAsset(kind)}><Plus size={14} />添加{label}</button>}
              </header>
              {form[kind].map((asset) => (
                <div className="rc-asset" key={asset.id}>
                  <FileText size={18} />
                  <div><strong>{asset.name}</strong><small>{asset.content}</small></div>
                  <button onClick={() => setAssetEditor({ kind, asset: { ...asset, redline: false }, isNew: false })}>{editable ? "编辑" : "查看"}</button>
                  {editable && <button className="rc-icon" aria-label={`移除${asset.name}`} onClick={() => update({ ...form, [kind]: form[kind].filter((a) => a.id !== asset.id) })}><Trash2 size={14} /></button>}
                </div>
              ))}
              {!form[kind].length && <small>尚未配置{label}</small>}
            </div>
          ))}
          <div className={`rc-assets ${!(editable && editingProfile) ? "rc-profile-card rc-profile-rules" : ""}`}>
            <header><h3>行为规则</h3></header>
            {editable && editingProfile ? (
              <textarea className="rc-editor" aria-label="行为规则" value={form.permissionRules} onChange={(e) => update({ ...form, permissionRules: e.target.value })} />
            ) : <Markdown content={form.permissionRules} />}
            {!form.permissionRules.trim() && <Notice error>请补充行为规则</Notice>}
          </div>
          </div>
        </section>
        <section id="assets" hidden={activeTab !== "assets"} className="rc-section">
          <header>
            <div>
              <h2>能力配置</h2>
              <p>配置岗位执行时可调用的技能与 MCP</p>
            </div>
          </header>
          {KINDS.map(([kind, label]) => (
            <div className="rc-resource-group" key={kind}>
              <header>
                <h3>{label}</h3>
                {editable && (
                  <button onClick={() => setPicker(kind)}>
                    <Plus size={14} />
                    选择{label}
                  </button>
                )}
              </header>
              {form.resourceIds
                .filter(
                  (id) =>
                    store.resources.find((r) => r.id === id)?.kind === kind,
                )
                .map((id) => {
                  const r = store.resources.find((r) => r.id === id)!;
                  return (
                    <div className="rc-resource-row" key={id}>
                      <div>
                        <strong>
                          {r.name} <small>{r.version}</small>
                        </strong>
                        <p>
                          {r.description}
                          {kind === "mcp" ? ` · ${r.permission}` : ""}
                        </p>
                      </div>
                      <Badge tone={r.active ? "green" : "amber"}>
                        {r.active ? "可用" : "能力异常"}
                      </Badge>
                      {editable && (
                        <button
                          className="rc-icon"
                          aria-label={`移除引用 ${r.name}`}
                          onClick={() =>
                            update({
                              ...form,
                              resourceIds: form.resourceIds.filter(
                                (x) => x !== id,
                              ),
                            })
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              {!form.resourceIds.some(
                (id) => store.resources.find((r) => r.id === id)?.kind === kind,
              ) && <small>尚未配置{label}</small>}
            </div>
          ))}
        </section>
        <section id="versions" hidden={activeTab !== "versions"} className="rc-section">
          <header>
            <div>
              <h2>版本与变更记录</h2>
              <p>历史发布、审批依据和操作记录</p>
            </div>
            <button
              onClick={() =>
                perform(() => {
                  actions.exportAudit("导出岗位版本与变更记录", role.id);
                  download(
                    `${d.name}-变更记录.json`,
                    JSON.stringify(
                      {
                        versions: role.versions,
                        audit: store.audit.filter((a) => a.roleId === role.id),
                      },
                      null,
                      2,
                    ),
                  );
                }, "已导出变更记录")
              }
            >
              <Download size={15} />
              导出
            </button>
          </header>
          {role.versions.map((v) => (
            <article className="rc-version" key={v.version}>
              <header>
                <div className="rc-actions">
                  <strong>{v.version}</strong>
                  <Badge>
                    {role.published?.version === v.version && !role.disabled
                      ? "当前发布"
                      : "历史版本"}
                  </Badge>
                </div>
                <small>
                  {v.publishedAt} ·{" "}
                  {store.people.find((p) => p.id === v.publishedBy)?.name}
                </small>
              </header>
              <p>{v.note}</p>
              <div className="rc-actions">
                <button className="rc-link" onClick={() => setCompare(v)}>
                  查看内容与变更
                </button>
                {role.published?.version !== v.version && (
                  <button
                    disabled={!sys}
                    className="rc-link"
                    onClick={() => {
                      setOperation("restore");
                      setRestoreVersion(v.version);
                      setReason("");
                    }}
                  >
                    回滚至此版本
                  </button>
                )}
              </div>
            </article>
          ))}
          {!role.versions.length && <small>尚无正式发布版本</small>}
          <div className="rc-timeline" style={{ marginTop: 24 }}>
            {store.audit
              .filter((a) => a.roleId === role.id)
              .map((a) => (
                <article key={a.id}>
                  <strong>{a.action}</strong>
                  <p>{a.detail}</p>
                  <small>
                    {a.at} ·{" "}
                    {store.people.find((p) => p.id === a.by)?.name || a.by} ·{" "}
                    {a.version}
                  </small>
                </article>
              ))}
          </div>
          {role.draft?.status === "草稿" && (
            <button
              className="rc-danger"
              disabled={!canEdit(store)}
              onClick={() => setDiscard(true)}
            >
              <Trash2 size={14} />
              删除{role.published ? "当前草稿" : "未发布岗位"}
            </button>
          )}
        </section>
        {activeTab === "release" && (
          <ReleasePanel
            role={role}
            dirty={dirty}
            onApproval={onApproval}
          />
        )}
          </div>
        </main>
      </div>
      {associateOpen && <Dialog title="关联组织岗位" onClose={() => setAssociateOpen(false)} footer={<><button onClick={() => setAssociateOpen(false)}>取消</button><button className="rc-primary" disabled={!pendingPosition} onClick={() => {if (pendingPosition) update({...form, position: pendingPosition});setAssociateOpen(false);}}>确认关联</button></>}><PositionTree value={pendingPosition} onChange={setPendingPosition}/></Dialog>}
      {editable && (
        <div className="rc-sticky-save">
          <span>{dirty ? "有未保存的修改" : "草稿已保存"}</span>
          <div className="rc-actions">
            <button
              disabled={!dirty}
              onClick={() => setForm(JSON.parse(saved))}
            >
              撤销修改
            </button>
            <button
              className="rc-primary"
              disabled={!dirty}
              onClick={() =>
                perform(() => actions.save(role.id, form), "草稿已保存")
              }
            >
              保存草稿
            </button>
            <button
              className="rc-primary"
              disabled={dirty || !canEdit(store)}
              onClick={() =>
                perform(
                  () => actions.startEvaluation(role.id),
                  "已生成评测检查结果",
                )
              }
            >
              发起评测
            </button>
          </div>
        </div>
      )}
      {picker && (
        <ResourcePicker
          kind={picker}
          selected={form.resourceIds}
          onClose={() => setPicker(null)}
          onSave={(ids) => {
            update({ ...form, resourceIds: ids });
            setPicker(null);
          }}
        />
      )}
      {assetEditor && (
        <AssetEditor
          value={assetEditor.asset}
          kind={assetEditor.kind}
          readonly={!editable}
          onClose={() => setAssetEditor(null)}
          onSave={(asset) => {
            update({
              ...form,
              [assetEditor.kind]: assetEditor.isNew
                ? [...form[assetEditor.kind], asset]
                : form[assetEditor.kind].map((a) =>
                    a.id === asset.id ? asset : a,
                  ),
            });
            setAssetEditor(null);
          }}
        />
      )}
      {extractionOpen && (
        <PositionTreeDialog
          selectedId={selectedSourceId}
          onSelect={setSelectedSourceId}
          onClose={() => setExtractionOpen(false)}
          onConfirm={() => {
            const source = POSITION_SOURCES.find((p) => p.id === selectedSourceId);
            if (!source) return;
            if (profileHasContent) {
              setExtractionOpen(false);
              setOverwriteSource(source);
            } else applyExtraction(source);
          }}
        />
      )}
      {overwriteSource && (
        <Confirm
          title="覆盖当前岗位画像？"
          description={`将以“${overwriteSource.org} / ${overwriteSource.name}”的抽取结果覆盖岗位职责、知识地图和行为规则；岗位名称、维护人和可添加范围不会变化。`}
          label="确认覆盖并填充"
          onClose={() => setOverwriteSource(null)}
          onConfirm={() => applyExtraction(overwriteSource)}
        />
      )}
      {publishedOpen && role.published && (
        <Dialog
          title={`${role.published.definition.name} · ${role.published.version} 线上版本`}
          onClose={() => setPublishedOpen(false)}
          wide
        >
          <Summary definition={role.published.definition} />
          <Markdown content={roleDefinitionMarkdown(role.published.definition)} />
        </Dialog>
      )}
      {leave && (
        <Confirm
          title="离开未保存的草稿"
          description="当前修改尚未保存。离开将丢弃这些修改。"
          label="放弃修改并离开"
          onClose={() => setLeave(false)}
          onConfirm={onBack}
        />
      )}{" "}
      {discard && (
        <Confirm
          danger
          title="删除草稿"
          description="当前草稿将被删除，已发布版本与历史记录保留。"
          label="删除草稿"
          onClose={() => setDiscard(false)}
          onConfirm={() => {
            if (
              perform(() => actions.deleteDraft(role.id), "草稿已删除") !==
              false
            ) {
              setDiscard(false);
              if (!role.published) onBack();
            }
          }}
        />
      )}{" "}
      {operation && (
        <Dialog
          title={
            operation === "disable"
              ? "停用岗位智能体"
              : `恢复发布 ${restoreVersion}`
          }
          onClose={() => setOperation(null)}
          footer={
            <>
              <button onClick={() => setOperation(null)}>取消</button>
              <button
                className={operation === "disable" ? "rc-danger" : "rc-primary"}
                onClick={() => {
                  if (
                    perform(
                      () =>
                        operation === "disable"
                          ? actions.disable(role.id, reason, handling)
                          : actions.restore(role.id, restoreVersion, reason),
                      "发布状态已更新",
                    ) !== false
                  )
                    setOperation(null);
                }}
              >
                确认{operation === "disable" ? "停用" : "恢复"}
              </button>
            </>
          }
        >
          <div className="rc-stack">
            <label className="rc-field">
              变更原因
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="请说明变更原因，至少 5 个字"
              />
            </label>
            {operation === "disable" && (
              <label className="rc-field">
                进行中的任务
                <select
                  value={handling}
                  onChange={(e) => setHandling(e.target.value)}
                >
                  <option value="">请选择处理方式</option>
                  <option>按原版本继续完成</option>
                  <option>中止进行中任务</option>
                </select>
              </label>
            )}
            <Notice>
              变更会影响个人端的新任务和可用能力。历史记录保持原版本快照。
            </Notice>
          </div>
        </Dialog>
      )}
      {compare && (
        <VersionDetail
          version={compare}
          previous={role.versions[role.versions.indexOf(compare) + 1]}
          onClose={() => setCompare(null)}
        />
      )}{" "}
      {feedback}
    </>
  );
}
function ResourcePicker({
  kind,
  selected,
  onClose,
  onSave,
}: {
  kind: ResourceKind;
  selected: string[];
  onClose: () => void;
  onSave: (ids: string[]) => void;
}) {
  const store = useRoleStore();
  const [ids, setIds] = useState(selected),
    [query, setQuery] = useState("");
  const rows = store.resources.filter(
    (r) =>
      r.kind === kind &&
      r.active &&
      `${r.name}${r.description}`.includes(query),
  );
  return (
    <Dialog
      title={`选择${KINDS.find((k) => k[0] === kind)?.[1]}`}
      onClose={onClose}
      wide
      footer={
        <>
          <button onClick={onClose}>取消</button>
          <button className="rc-primary" onClick={() => onSave(ids)}>
            确认选择
          </button>
        </>
      }
    >
      <div className="rc-stack">
        <label className="rc-search">
          <Search size={16} />
          <input
            placeholder="搜索名称与能力说明"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="rc-grid">
          {rows.map((r) => (
            <label className="rc-resource-pick" key={r.id}>
              <input
                type="checkbox"
                checked={ids.includes(r.id)}
                onChange={() =>
                  setIds(
                    ids.includes(r.id)
                      ? ids.filter((id) => id !== r.id)
                      : [...ids, r.id],
                  )
                }
              />
              <span>
                <strong>{r.name}</strong>
                <small>
                  {r.version} · {r.description}
                </small>
                <small>
                  {r.permission}
                  {r.restricted ? " · 用户需单独授权" : ""}
                </small>
              </span>
            </label>
          ))}
        </div>
        {!rows.length && <Empty title="没有可选择的已发布资源" />}
      </div>
    </Dialog>
  );
}
function PositionTreeDialog({
  selectedId,
  onSelect,
  onClose,
  onConfirm,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      title="从岗位组织树抽取本体"
      onClose={onClose}
      wide
      footer={
        <>
          <button onClick={onClose}>取消</button>
          <button className="rc-primary" disabled={!selectedId} onClick={onConfirm}>
            确认抽取并填充
          </button>
        </>
      }
    >
      <div className="rc-stack">
        <Notice>
          选择一个具体岗位节点，将导入对应示例岗位的职责、知识与行为规则，能力地图仍以当前关联岗位为准。
        </Notice>
        <div className="rc-position-tree" role="radiogroup" aria-label="岗位组织树">
          <strong className="rc-tree-root">商飞智能</strong>
          {Array.from(new Set(POSITION_SOURCES.map((source) => source.org))).map(
            (org) => (
              <div className="rc-tree-branch" key={org}>
                <strong>{org}</strong>
                {POSITION_SOURCES.filter((source) => source.org === org).map(
                  (source) => (
                    <label
                      className={
                        selectedId === source.id ? "selected" : undefined
                      }
                      key={source.id}
                    >
                      <input
                        type="radio"
                        name="position-source"
                        value={source.id}
                        checked={selectedId === source.id}
                        onChange={() => onSelect(source.id)}
                      />
                      <span>
                        <b>{source.name}</b>
                        <small>{source.description}</small>
                      </span>
                    </label>
                  ),
                )}
              </div>
            ),
          )}
        </div>
      </div>
    </Dialog>
  );
}
function AssetEditor({
  value,
  kind,
  readonly,
  onClose,
  onSave,
}: {
  value: TestCase;
  kind: "capabilityMap" | "knowledgeMap" | "templates" | "tests";
  readonly: boolean;
  onClose: () => void;
  onSave: (asset: TestCase) => void;
}) {
  const [asset, setAsset] = useState(value),
    [error, setError] = useState("");
  return (
    <Dialog
      title={
        kind === "capabilityMap"
          ? "能力地图"
          : kind === "knowledgeMap"
            ? "知识地图"
          : kind === "templates"
            ? "输出模板"
            : "评测用例"
      }
      onClose={onClose}
      wide
      footer={
        <>
          <button onClick={onClose}>{readonly ? "关闭" : "取消"}</button>
          {readonly ? (
            <button
              onClick={() =>
                download(`${asset.name}.md`, asset.content, "text/markdown")
              }
            >
              下载
            </button>
          ) : (
            <button
              className="rc-primary"
              onClick={() => {
                if (!asset.name.trim() || !asset.content.trim()) {
                  setError("名称和内容不能为空");
                  return;
                }
                onSave({ ...asset, name: asset.name.trim() });
              }}
            >
              保存至当前编辑内容
            </button>
          )}
        </>
      }
    >
      <div className="rc-stack">
        {readonly ? (
          <>
            <h3>{asset.name}</h3>
            <Markdown content={asset.content} />
          </>
        ) : (
          <>
            <label className="rc-field">
              名称
              <input
                value={asset.name}
                onChange={(e) => setAsset({ ...asset, name: e.target.value })}
              />
            </label>
            <label className="rc-field">
              {kind === "capabilityMap"
                ? "适用场景、执行步骤与异常分支"
                : kind === "knowledgeMap"
                  ? "适用场景、知识要点与使用约束"
                : kind === "tests"
                  ? "输入场景与预期输出"
                  : "模板内容（Markdown）"}
              <textarea
                style={{ minHeight: 260 }}
                value={asset.content}
                onChange={(e) =>
                  setAsset({ ...asset, content: e.target.value })
                }
                placeholder={
                  kind === "tests"
                    ? "输入：用户提出的任务及上下文\n预期：合格输出应满足的标准"
                    : kind === "capabilityMap"
                      ? "适用场景：\n1. 执行步骤\n2. 验收检查\n异常分支："
                      : kind === "knowledgeMap"
                        ? "适用场景：\n知识要点：\n使用约束："
                      : "# 交付物标题\n## 背景与目标\n## 内容\n## 验收标准"
                }
              />
            </label>
            {kind === "tests" && (
              <label className="rc-inline-label">
                <input
                  type="checkbox"
                  checked={asset.redline}
                  onChange={(e) =>
                    setAsset({ ...asset, redline: e.target.checked })
                  }
                />
                红线用例：必须通过才能提交审批
              </label>
            )}
          </>
        )}
        {error && <Notice error>{error}</Notice>}
      </div>
    </Dialog>
  );
}
export function ReleasePanel({
  role,
  dirty,
  onApproval,
}: {
  role: RoleAgent;
  dirty: boolean;
  onApproval: () => void;
}) {
  const store = useRoleStore();
  const [reviewOpen, setReviewOpen] = useState(false),
    [note, setNote] = useState(""),
    [reviewPassed, setReviewPassed] = useState(true),
    [trial, setTrial] = useState(false),
    [prompt, setPrompt] = useState(""),
    [output, setOutput] = useState(""),
    [historyOpen, setHistoryOpen] = useState(false);
  const { perform, feedback } = useFeedback();
  const draft = role.draft,
    report = draft ? draft.evaluation : role.published?.evaluation;
  return (
    <section id="release" className="rc-section">
      <header>
        <div>
          <h2>评测与发布</h2>
          <p>规则校验 → 用例检查 → 人工复核 → 审批发布</p>
        </div>
        <div className="rc-actions">
          <button onClick={() => setHistoryOpen(true)}>评测记录</button>
          <Badge>{draft?.status || currentStatus(role)}</Badge>
        </div>
      </header>
      {dirty && <Notice>请先保存当前修改，再发起评测。</Notice>}
      {report ? (
        <>
          <div className="rc-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>检查项</th>
                  <th>结论</th>
                  <th>证据</th>
                </tr>
              </thead>
              <tbody>
                {report.checks.map((c) => (
                  <tr key={c.name}>
                    <td>{c.name}</td>
                    <td>
                      <Badge tone={c.passed ? "green" : "amber"}>
                        {c.passed ? "通过" : "未通过"}
                      </Badge>
                    </td>
                    <td>{c.detail}</td>
                  </tr>
                ))}
                {report.cases.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {c.name}
                      {c.redline && <p>红线用例</p>}
                    </td>
                    <td>
                      <Badge tone={c.passed ? "green" : "amber"}>
                        {c.passed ? "规则符合" : "未通过"}
                      </Badge>
                    </td>
                    <td>
                      <p>{c.content}</p>
                      <p>{c.evidence}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Notice>
            <CheckCircle2 size={16} />
            规则检查完成于 {report.at}。
            {report.review
              ? `人工复核：${store.people.find((p) => p.id === report.review!.by)?.name} · ${report.review.note}`
              : "请结合试运行预案与交付要求完成人工复核。"}
          </Notice>
        </>
      ) : (
        <Empty
          title={draft ? "当前草稿尚未发起评测" : "历史版本已完成发布审批"}
        >
          {!draft && <small>审批单：{role.published?.approvalId}</small>}
        </Empty>
      )}
      <footer>
        <div className="rc-actions">
          {!role.disabled && (
            <button
              disabled={dirty}
              onClick={() => {
                setTrial(true);
                setPrompt("");
                setOutput("");
              }}
            >
              试运行
            </button>
          )}
          {draft?.status === "草稿" && (
            <button
              className="rc-primary"
              disabled={dirty || !canEdit(store)}
              onClick={() =>
                perform(
                  () => actions.startEvaluation(role.id),
                  "已生成评测检查结果",
                )
              }
            >
              发起评测
            </button>
          )}
          {draft?.status === "评测中" && (
            <>
              <button
                disabled={!canEdit(store)}
                onClick={() =>
                  perform(() => actions.withdraw(role.id), "已撤回至草稿")
                }
              >
                撤回修改
              </button>
              <button
                disabled={!canEdit(store)}
                onClick={() => {
                  setReviewOpen(true);
                  setNote("");
                  setReviewPassed(true);
                }}
              >
                <ShieldCheck size={15} />
                人工复核
              </button>
              <button
                className="rc-primary"
                disabled={!readyForApproval(role) || !canEdit(store)}
                onClick={() =>
                  perform(() => actions.submit(role.id), "已提交审批中心")
                }
              >
                提交审批
              </button>
            </>
          )}
          {draft?.status === "待审批" && (
            <>
              <button
                disabled={!canEdit(store)}
                onClick={() =>
                  perform(() => actions.withdraw(role.id), "审批已撤回")
                }
              >
                撤回审批
              </button>
              <button className="rc-primary" onClick={onApproval}>
                查看审批
              </button>
            </>
          )}
        </div>
      </footer>
      {historyOpen && (
        <Dialog title="历史评测记录" onClose={() => setHistoryOpen(false)} wide>
          <div className="rc-stack">
            {[
              ...(role.evaluations || []),
              ...role.versions
                .filter(
                  (v) =>
                    v.evaluation &&
                    !role.evaluations?.some((e) => e.id === v.evaluation!.id),
                )
                .map((v) => ({ ...v.evaluation!, version: v.version })),
            ].map((e) => (
              <article className="rc-section" key={e.id}>
                <header>
                  <h3>
                    {e.version} · {e.at}
                  </h3>
                  <button
                    onClick={() =>
                      download(
                        `${e.version}-评测记录.json`,
                        JSON.stringify(e, null, 2),
                      )
                    }
                  >
                    下载报告
                  </button>
                </header>
                <p>报告编号：{e.id}</p>
                {e.checks.map((c) => (
                  <p key={c.name}>
                    {c.passed ? "通过" : "未通过"} · {c.name}：{c.detail}
                  </p>
                ))}
                {e.cases.map((c) => (
                  <p key={c.id}>
                    {c.passed ? "规则符合" : "未通过"} · {c.name}：{c.evidence}
                  </p>
                ))}
                <Notice>
                  {e.review
                    ? `人工复核：${store.people.find((p) => p.id === e.review!.by)?.name} · ${e.review.note}`
                    : "未确认通过人工复核"}
                </Notice>
                {e.trial && (
                  <details>
                    <summary>试运行预案</summary>
                    <Markdown content={e.trial.output} />
                  </details>
                )}
              </article>
            ))}
            {!role.evaluations?.length &&
              !role.versions.some((v) => v.evaluation) && (
                <Empty title="暂无可查看的评测报告" />
              )}
          </div>
        </Dialog>
      )}
      {reviewOpen && (
        <Dialog
          title="人工复核"
          onClose={() => setReviewOpen(false)}
          footer={
            <>
              <button onClick={() => setReviewOpen(false)}>取消</button>
              <button
                className="rc-primary"
                onClick={() => {
                  if (
                    perform(
                      () => actions.review(role.id, note, reviewPassed),
                      "已保存人工复核结论",
                    ) !== false
                  )
                    setReviewOpen(false);
                }}
              >
                提交复核结论
              </button>
            </>
          }
        >
          <div className="rc-stack">
            <label className="rc-field">
              复核结论
              <select
                value={reviewPassed ? "yes" : "no"}
                onChange={(e) => setReviewPassed(e.target.value === "yes")}
              >
                <option value="yes">通过，可提交审批</option>
                <option value="no">不通过，退回修改</option>
              </select>
            </label>
            <label className="rc-field">
              复核意见
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="说明交付物质量、边界与异常场景的核验结果"
              />
            </label>
          </div>
        </Dialog>
      )}
      {trial && (
        <Dialog
          title="岗位试运行"
          onClose={() => setTrial(false)}
          wide
          footer={
            <>
              <button onClick={() => setTrial(false)}>关闭</button>
              <button
                className="rc-primary"
                disabled={!prompt.trim()}
                onClick={() => {
                  const result = perform(() => actions.trial(role.id, prompt));
                  if (typeof result === "string") setOutput(result);
                }}
              >
                生成执行预案
              </button>
            </>
          }
        >
          <div className="rc-stack">
            <label className="rc-field">
              测试任务
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="描述任务输入、目标与约束"
              />
            </label>
            {output && (
              <>
                <h3>执行预案</h3>
                <Markdown content={output} />
              </>
            )}
          </div>
        </Dialog>
      )}
      {feedback}
    </section>
  );
}
export function VersionDetail({
  version,
  previous,
  onClose,
}: {
  version: Version;
  previous?: Version;
  onClose: () => void;
}) {
  const store = useRoleStore();
  const describe = (v: Version) => ({
    岗位职责: v.definition.responsibilities,
    权限规则: v.definition.permissionRules,
    能力: v.definition.resourceIds
      .map((id) => store.resources.find((r) => r.id === id)?.name || id)
      .join("、"),
    能力地图: v.definition.capabilityMap
      .map((a) => a.name + "\n" + a.content)
      .join("\n\n"),
    知识地图: v.definition.knowledgeMap
      .map((a) => a.name + "\n" + a.content)
      .join("\n\n"),
    输出模板: v.definition.templates
      .map((a) => a.name + "\n" + a.content)
      .join("\n\n"),
    评测用例: v.definition.tests
      .map((a) => a.name + "\n" + a.content)
      .join("\n\n"),
    维护人: store.people.find((p) => p.id === v.definition.owner)?.name || "",
  });
  return (
    <Dialog
      title={`${version.definition.name} · ${version.version} 版本内容与变更`}
      onClose={onClose}
      wide
    >
      <div className="rc-stack">
        <Notice>
          {version.publishedAt} · 审批单 {version.approvalId}
          <br />
          {version.note}
        </Notice>
        {Object.entries(describe(version)).map(([key, value]) => (
          <section key={key}>
            <h3 style={{ marginBottom: 12 }}>{key}</h3>
            <div className="rc-diff">
              {previous && (
                <div>
                  <Badge tone="gray">{previous.version}</Badge>
                  <pre>
                    {
                      describe(previous)[
                        key as keyof ReturnType<typeof describe>
                      ]
                    }
                  </pre>
                </div>
              )}
              <div>
                <Badge>{version.version}</Badge>
                <pre>{value}</pre>
                {previous && (
                  <Badge
                    tone={
                      describe(previous)[
                        key as keyof ReturnType<typeof describe>
                      ] === value
                        ? "gray"
                        : "green"
                    }
                  >
                    {describe(previous)[
                      key as keyof ReturnType<typeof describe>
                    ] === value
                      ? "无变化"
                      : "已更新"}
                  </Badge>
                )}
              </div>
            </div>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
