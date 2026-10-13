import { useSyncExternalStore } from "react";
import { availableRole, type Store } from "../role-center/domain";

/**
 * 价值流 = C大脑本体中的业务流程，本项目只读引用。
 * 节点与边均按本体原样保存，网状结构不做线性化。
 * 绑定关系（P/V 节点 → 岗位智能体）是本项目唯一可写的数据。
 */
export type FlowNodeKind =
  | "value" // V 价值节点，可绑定
  | "activity" // P 普通活动，可绑定
  | "org-owner" // D 组织，所有者/使用方
  | "org-resource" // R 组织，资源
  | "document" // 文档
  | "start"
  | "end";

export type FlowEdgeKind =
  | "input"
  | "output"
  | "owner"
  | "user"
  | "resource"
  | "flow";

export type FlowNode = {
  id: string;
  kind: FlowNodeKind;
  name: string;
  x: number;
  y: number;
  /** V 节点的关联模型，仅展示不消费 */
  linkedModel?: string;
};

export type FlowEdge = {
  id: string;
  kind: FlowEdgeKind;
  from: string;
  to: string;
};

export type ValueFlow = {
  id: string;
  code: string;
  name: string;
  version: string;
  updatedAt: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
};

export const NODE_KIND_LABEL: Record<FlowNodeKind, string> = {
  value: "价值节点",
  activity: "普通活动",
  "org-owner": "组织",
  "org-resource": "资源组织",
  document: "文档",
  start: "开始",
  end: "结束",
};

export const EDGE_KIND_LABEL: Record<FlowEdgeKind, string> = {
  input: "输入",
  output: "输出",
  owner: "所有者",
  user: "使用方",
  resource: "资源",
  flow: "执行顺序",
};

export const isBindable = (kind: FlowNodeKind) =>
  kind === "value" || kind === "activity";

export const bindableNodes = (flow: ValueFlow) =>
  flow.nodes.filter((node) => isBindable(node.kind));

/** 一条价值流只有一种建模粒度：价值节点流或普通活动流 */
export const flowGranularity = (flow: ValueFlow): "value" | "activity" =>
  flow.nodes.some((node) => node.kind === "value") ? "value" : "activity";

export const granularityLabel = (flow: ValueFlow) =>
  flowGranularity(flow) === "value" ? "价值节点流" : "普通活动流";

/** 责任组织：价值节点流取所有者组织，普通活动流取资源组织 */
export function ownerOrgNames(flow: ValueFlow): string[] {
  const kind = flowGranularity(flow) === "value" ? "owner" : "resource";
  const names = flow.edges
    .filter((edge) => edge.kind === kind)
    .map((edge) => flow.nodes.find((node) => node.id === edge.from)?.name)
    .filter((name): name is string => !!name);
  return [...new Set(names)];
}

export type NodeContext = {
  inputDocs: string[];
  outputDocs: string[];
  upstream: string[];
  downstream: string[];
  owners: string[];
  users: string[];
  resources: string[];
};

export function nodeContext(flow: ValueFlow, nodeId: string): NodeContext {
  const nameOf = (id: string) =>
    flow.nodes.find((node) => node.id === id)?.name || id;
  const ctx: NodeContext = {
    inputDocs: [],
    outputDocs: [],
    upstream: [],
    downstream: [],
    owners: [],
    users: [],
    resources: [],
  };
  for (const edge of flow.edges) {
    if (edge.to === nodeId) {
      if (edge.kind === "input") ctx.inputDocs.push(nameOf(edge.from));
      if (edge.kind === "flow") ctx.upstream.push(nameOf(edge.from));
      if (edge.kind === "owner") ctx.owners.push(nameOf(edge.from));
      if (edge.kind === "user") ctx.users.push(nameOf(edge.from));
      if (edge.kind === "resource") ctx.resources.push(nameOf(edge.from));
    }
    if (edge.from === nodeId && edge.kind === "output")
      ctx.outputDocs.push(nameOf(edge.to));
    if (edge.from === nodeId && edge.kind === "flow")
      ctx.downstream.push(nameOf(edge.to));
  }
  return ctx;
}

/* ---------------- 绑定关系存储（本项目唯一可写数据） ---------------- */

const BINDINGS_KEY = "comac-flow-bindings-v1";
export type FlowBindings = Record<string, string[]>; // `${flowId}#${nodeId}` -> roleIds

let bindings: FlowBindings = loadBindings();
const listeners = new Set<() => void>();

function loadBindings(): FlowBindings {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(BINDINGS_KEY) || "{}",
    );
    if (saved && typeof saved === "object") {
      const clean: FlowBindings = {};
      for (const [key, value] of Object.entries(
        saved as Record<string, unknown>,
      )) {
        if (Array.isArray(value))
          clean[key] = value.filter((id): id is string => typeof id === "string");
      }
      return clean;
    }
  } catch {
    /* 浏览器存储不可用时保持内存态 */
  }
  return {};
}

function persist() {
  try {
    localStorage.setItem(BINDINGS_KEY, JSON.stringify(bindings));
  } catch {
    /* 保持当前会话可用 */
  }
  listeners.forEach((listener) => listener());
}

export const bindingKey = (flowId: string, nodeId: string) =>
  `${flowId}#${nodeId}`;

export function useFlowBindings(): FlowBindings {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => bindings,
  );
}

export function addBinding(flowId: string, nodeId: string, roleId: string) {
  const key = bindingKey(flowId, nodeId);
  const current = bindings[key] || [];
  if (current.includes(roleId)) return;
  bindings = { ...bindings, [key]: [...current, roleId] };
  persist();
}

export function removeBinding(flowId: string, nodeId: string, roleId: string) {
  const key = bindingKey(flowId, nodeId);
  const current = bindings[key] || [];
  bindings = { ...bindings, [key]: current.filter((id) => id !== roleId) };
  persist();
}

/* ---------------- 派生状态 ---------------- */

export type HolderInfo = { count: number; names: string[] };

/** 谁把这个岗位智能体加到了自己的分身（memberships 实时派生，只读） */
export function holders(store: Store, roleId: string): HolderInfo {
  const names: string[] = [];
  for (const [userId, list] of Object.entries(store.memberships)) {
    if (!list.some((membership) => membership.roleId === roleId && membership.enabled))
      continue;
    const role = store.roles.find((item) => item.id === roleId);
    if (!role || !availableRole(store, role, userId)) continue;
    const person = store.people.find((item) => item.id === userId);
    if (person) names.push(person.name);
  }
  return { count: names.length, names };
}

export function holdersText(info: HolderInfo): string {
  if (info.count === 0)
    return "还没人把它加到自己的分身，绑了也暂时没人干活";
  const listed = info.names.slice(0, 3).join("、");
  return info.count <= 3
    ? `${listed} 已把它加到自己的分身`
    : `${listed} 等 ${info.count} 人已把它加到自己的分身`;
}

export type FlowStatus = "none" | "partial" | "done";

export const FLOW_STATUS_LABEL: Record<FlowStatus, string> = {
  none: "未绑定",
  partial: "部分绑定",
  done: "已绑定",
};

export function flowBindingProgress(flow: ValueFlow, all: FlowBindings) {
  const nodes = bindableNodes(flow);
  const bound = nodes.filter(
    (node) => (all[bindingKey(flow.id, node.id)] || []).length > 0,
  ).length;
  const status: FlowStatus =
    bound === 0 ? "none" : bound === nodes.length ? "done" : "partial";
  return { bound, total: nodes.length, status };
}

export type NodeBindingStatus = "none" | "bound" | "unavailable";

export function nodeBindingStatus(
  roleIds: string[],
  store: Store,
): NodeBindingStatus {
  if (!roleIds.length) return "none";
  const hasUnavailable = roleIds.some((roleId) => {
    const role = store.roles.find((item) => item.id === roleId);
    return !role || !role.published || role.disabled;
  });
  return hasUnavailable ? "unavailable" : "bound";
}

/* ---------------- 本体价值流快照（演示数据，接口会议后替换） ---------------- */

const n = (
  id: string,
  kind: FlowNodeKind,
  name: string,
  x: number,
  y: number,
  linkedModel?: string,
): FlowNode => ({ id, kind, name, x, y, linkedModel });

const e = (id: string, kind: FlowEdgeKind, from: string, to: string): FlowEdge => ({
  id,
  kind,
  from,
  to,
});

/** 普通活动流：开始 → 活动 → 结束，含文档与资源组织 */
const productDesignFlow: ValueFlow = {
  id: "vf-product-design",
  code: "VF-P-001",
  name: "产品设计交付流程",
  version: "V1.2",
  updatedAt: "2026-09-26",
  nodes: [
    n("start", "start", "开始", 110, 320),
    n("pd", "activity", "产品设计", 430, 320),
    n("end", "end", "结束", 760, 320),
    n("doc-in", "document", "产品方案-C大脑/元宇宙", 130, 120),
    n("doc-out", "document", "评审完的PRD文档-C大脑/元宇宙", 560, 540),
    n("r1", "org-resource", "产品设计室", 430, 100),
    n("r2", "org-resource", "空间计算部", 720, 120),
  ],
  edges: [
    e("e1", "flow", "start", "pd"),
    e("e2", "flow", "pd", "end"),
    e("e3", "input", "doc-in", "pd"),
    e("e4", "output", "pd", "doc-out"),
    e("e5", "resource", "r1", "pd"),
    e("e6", "resource", "r2", "pd"),
  ],
};

/** 价值节点流：多输入、多所有者/使用方、多输出的网状结构 */
const systemRdFlow: ValueFlow = {
  id: "vf-system-rd",
  code: "VF-V-002",
  name: "系统产研开发流程",
  version: "V2.0",
  updatedAt: "2026-09-28",
  nodes: [
    n("v1", "value", "系统产研开发", 640, 100, "C大脑产研模型"),
    n("v2", "value", "产线产研开发", 760, 400, "新产线模型"),
    n("v3", "value", "产品产研开发", 700, 720, "产品产线模型"),
    n("d1", "document", "通用功能传递审批表", 170, 90),
    n("d2", "document", "定制化功能传递审批表", 120, 380),
    n("d3", "document", "实施方案", 180, 560),
    n("d4", "document", "上线通知", 1030, 100),
    n("d5", "document", "柔性产线完成上线的软件通用功能包", 1120, 380),
    n("d6", "document", "柔性产线完成部署上线的硬件套件", 1120, 500),
    n("d7", "document", "完成上线的软件通用功能代码包", 1060, 720),
    n("o1", "org-owner", "综合项目室", 540, 240),
    n("o2", "org-owner", "综合项目室", 420, 540),
    n("o3", "org-owner", "综合项目室", 540, 860),
    n("o4", "org-owner", "数字化系统事业群", 900, 220),
    n("o5", "org-owner", "数字化系统事业群", 660, 560),
    n("o6", "org-owner", "数字化产线事业群", 920, 560),
    n("o7", "org-owner", "数字化产品事业群", 860, 880),
  ],
  edges: [
    e("i1", "input", "d1", "v1"),
    e("i2", "input", "d1", "v2"),
    e("i3", "input", "d2", "v1"),
    e("i4", "input", "d2", "v2"),
    e("i5", "input", "d2", "v3"),
    e("i6", "input", "d3", "v2"),
    e("i7", "input", "d3", "v3"),
    e("o-1", "output", "v1", "d4"),
    e("o-2", "output", "v2", "d5"),
    e("o-3", "output", "v2", "d6"),
    e("o-4", "output", "v3", "d7"),
    e("w1", "owner", "o1", "v1"),
    e("w2", "owner", "o2", "v2"),
    e("w3", "owner", "o3", "v3"),
    e("u1", "user", "o4", "v1"),
    e("u2", "user", "o5", "v2"),
    e("u3", "user", "o6", "v2"),
    e("u4", "user", "o7", "v3"),
  ],
};

/** 大规模价值节点流：用于验证网状渲染、标签显隐与定位交互 */
function buildFullRdFlow(): ValueFlow {
  const vNodes: FlowNode[] = [
    n("v-plan", "value", "版本规划", 260, 120, "C大脑规划模型"),
    n("v-sw-proposal", "value", "软件产品方案设计", 520, 220, "C大脑方案模型"),
    n("v-product", "value", "产品设计", 780, 320, "产品设计模型"),
    n("v-tech", "value", "软件技术方案设计", 1040, 440, "模块技术模型"),
    n("v-test-plan", "value", "测试方案设计", 1300, 320, "C大脑测试模型"),
    n("v-dev", "value", "开发", 1300, 560, "模块开发模型"),
    n("v-integrate", "value", "功能集成", 1560, 440, "模块功能模型"),
    n("v-test", "value", "软件测试", 1560, 200, "全流程测试模型"),
    n("v-review", "value", "发布评审", 1820, 320, "发布评审模型"),
  ];
  const docs: FlowNode[] = [
    n("d-approve", "document", "通用功能传递审批表", 60, 220),
    n("d-iter", "document", "迭代需求", 60, 420),
    n("d-proposal", "document", "产品方案-C大脑/元宇宙", 300, 420),
    n("d-prd", "document", "评审完的PRD文档-C大脑/元宇宙", 620, 560),
    n("d-ui", "document", "评审完的软件UI设计稿", 880, 620),
    n("d-tech", "document", "软件技术方案", 1120, 700),
    n("d-test-form", "document", "测试方案表", 1420, 120),
    n("d-test-report", "document", "测试报告", 1720, 120),
    n("d-ext", "document", "验收完毕的外协项目清单", 1420, 760),
    n("d-release", "document", "发布申请单", 1980, 480),
  ];
  const orgs: FlowNode[] = [
    n("g-design", "org-owner", "总体设计部", 260, 620),
    n("g-product", "org-owner", "产品设计室", 520, 760),
    n("g-pmo", "org-owner", "综合项目室", 780, 860),
    n("g-ux", "org-owner", "交互体验室", 1040, 860),
    n("g-dev", "org-owner", "软件开发部", 1300, 860),
    n("g-test", "org-owner", "测试运维部", 1560, 860),
    n("g-digital", "org-owner", "数字化系统事业群", 1820, 760),
    n("g-cm", "org-owner", "配置管理室", 1980, 200),
  ];
  const edges: FlowEdge[] = [
    e("f1", "flow", "v-plan", "v-sw-proposal"),
    e("f2", "flow", "v-sw-proposal", "v-product"),
    e("f3", "flow", "v-product", "v-tech"),
    e("f4", "flow", "v-product", "v-test-plan"),
    e("f5", "flow", "v-tech", "v-dev"),
    e("f6", "flow", "v-dev", "v-integrate"),
    e("f7", "flow", "v-integrate", "v-test"),
    e("f8", "flow", "v-test", "v-review"),
    e("f9", "flow", "v-test", "v-dev"), // 未通过 · 退回修改
    e("f10", "flow", "v-test-plan", "v-test"),
    e("in1", "input", "d-approve", "v-plan"),
    e("in2", "input", "d-iter", "v-sw-proposal"),
    e("in3", "input", "d-proposal", "v-product"),
    e("in4", "input", "d-prd", "v-tech"),
    e("in5", "input", "d-ui", "v-tech"),
    e("in6", "input", "d-tech", "v-dev"),
    e("in7", "input", "d-test-form", "v-test"),
    e("in8", "input", "d-ext", "v-integrate"),
    e("out1", "output", "v-plan", "d-iter"),
    e("out2", "output", "v-sw-proposal", "d-proposal"),
    e("out3", "output", "v-product", "d-prd"),
    e("out4", "output", "v-product", "d-ui"),
    e("out5", "output", "v-tech", "d-tech"),
    e("out6", "output", "v-test-plan", "d-test-form"),
    e("out7", "output", "v-test", "d-test-report"),
    e("out8", "output", "v-review", "d-release"),
    e("ow1", "owner", "g-design", "v-plan"),
    e("ow2", "owner", "g-product", "v-product"),
    e("ow3", "owner", "g-pmo", "v-sw-proposal"),
    e("ow4", "owner", "g-dev", "v-dev"),
    e("ow5", "owner", "g-test", "v-test"),
    e("ow6", "owner", "g-digital", "v-review"),
    e("us1", "user", "g-pmo", "v-product"),
    e("us2", "user", "g-ux", "v-product"),
    e("us3", "user", "g-dev", "v-integrate"),
    e("us4", "user", "g-test", "v-integrate"),
    e("us5", "user", "g-cm", "v-review"),
    e("us6", "user", "g-digital", "v-test"),
    e("us7", "user", "g-design", "v-sw-proposal"),
  ];
  return {
    id: "vf-full-rd",
    code: "VF-V-018",
    name: "产品研发全流程",
    version: "V3.1",
    updatedAt: "2026-10-08",
    nodes: [...vNodes, ...docs, ...orgs],
    edges,
  };
}

export const valueFlows: ValueFlow[] = [
  productDesignFlow,
  systemRdFlow,
  buildFullRdFlow(),
];
