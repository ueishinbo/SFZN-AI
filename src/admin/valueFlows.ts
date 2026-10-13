import { useSyncExternalStore } from "react";
import type { Store } from "../role-center/domain";

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
  /** 父价值流：子流是父流某个价值节点的分解，本体给出 */
  parentId?: string;
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

/** 目录中尚未引入本项目的价值流（演示数据，接口会议后替换为 C大脑目录端点） */
const qualityReviewFlow: ValueFlow = {
  id: "vf-quality-review",
  code: "VF-V-021",
  name: "质量问题整改流程",
  version: "V1.4",
  updatedAt: "2026-09-20",
  nodes: [
    n("q1", "value", "问题识别与定级", 200, 140, "质量问题模型"),
    n("q2", "value", "原因分析", 480, 220, "根因分析模型"),
    n("q3", "value", "整改措施制定", 760, 300, "整改措施模型"),
    n("q4", "value", "整改验证与闭环", 1040, 380, "闭环验证模型"),
    n("qd1", "document", "质量问题单", 60, 260),
    n("qd2", "document", "原因分析报告", 620, 460),
    n("qd3", "document", "整改验证记录", 1200, 540),
    n("qo1", "org-owner", "质量管理部", 340, 420),
    n("qo2", "org-owner", "综合项目室", 900, 140),
  ],
  edges: [
    e("qf1", "flow", "q1", "q2"),
    e("qf2", "flow", "q2", "q3"),
    e("qf3", "flow", "q3", "q4"),
    e("qf4", "flow", "q4", "q2"), // 验证不通过 · 退回重新分析
    e("qi1", "input", "qd1", "q1"),
    e("qo-1", "output", "q2", "qd2"),
    e("qo-2", "output", "q4", "qd3"),
    e("qw1", "owner", "qo1", "q1"),
    e("qw2", "owner", "qo1", "q4"),
    e("qu1", "user", "qo2", "q3"),
  ],
};

const equipmentAcceptFlow: ValueFlow = {
  id: "vf-equipment-accept",
  code: "VF-P-007",
  name: "设备到货验收流程",
  version: "V1.0",
  updatedAt: "2026-08-30",
  nodes: [
    n("a-start", "start", "开始", 100, 240),
    n("a1", "activity", "到货清点", 340, 240),
    n("a2", "activity", "性能验收", 620, 240),
    n("a-end", "end", "结束", 900, 240),
    n("ad1", "document", "到货交接单", 200, 80),
    n("ad2", "document", "验收报告", 700, 420),
    n("ar1", "org-resource", "采购管理部", 480, 80),
  ],
  edges: [
    e("af1", "flow", "a-start", "a1"),
    e("af2", "flow", "a1", "a2"),
    e("af3", "flow", "a2", "a-end"),
    e("ai1", "input", "ad1", "a1"),
    e("ao1", "output", "a2", "ad2"),
    e("ares1", "resource", "ar1", "a1"),
    e("ares2", "resource", "ar1", "a2"),
  ],
};

const budgetFlow: ValueFlow = {
  id: "vf-budget-exec",
  code: "VF-P-011",
  name: "预算调整与执行流程",
  version: "V2.2",
  updatedAt: "2026-09-12",
  nodes: [
    n("b-start", "start", "开始", 100, 240),
    n("b1", "activity", "提交预算调整", 340, 240),
    n("b2", "activity", "分析预算影响", 600, 240),
    n("b3", "activity", "审批调整方案", 860, 240),
    n("b-end", "end", "结束", 1120, 240),
    n("bd1", "document", "预算调整申请单", 240, 80),
    n("bd2", "document", "预算影响分析表", 700, 420),
    n("br1", "org-resource", "财务部", 480, 80),
  ],
  edges: [
    e("bf1", "flow", "b-start", "b1"),
    e("bf2", "flow", "b1", "b2"),
    e("bf3", "flow", "b2", "b3"),
    e("bf4", "flow", "b3", "b-end"),
    e("bf5", "flow", "b3", "b1"), // 未通过 · 退回补充
    e("bi1", "input", "bd1", "b1"),
    e("bo1", "output", "b2", "bd2"),
    e("brs1", "resource", "br1", "b2"),
    e("brs2", "resource", "br1", "b3"),
  ],
};

const supplyKitFlow: ValueFlow = {
  id: "vf-supply-kit",
  code: "VF-V-033",
  name: "供应链齐套保障流程",
  version: "V1.1",
  updatedAt: "2026-10-02",
  nodes: [
    n("s1", "value", "缺件识别", 220, 160, "齐套分析模型"),
    n("s2", "value", "替代物料评估", 520, 240, "物料替代模型"),
    n("s3", "value", "到货检验与放行", 820, 320, "检验放行模型"),
    n("sd1", "document", "缺件清单", 80, 300),
    n("sd2", "document", "替代物料评估单", 640, 480),
    n("so1", "org-owner", "供应链管理部", 380, 440),
    n("so2", "org-owner", "质量管理部", 960, 140),
  ],
  edges: [
    e("sf1", "flow", "s1", "s2"),
    e("sf2", "flow", "s2", "s3"),
    e("si1", "input", "sd1", "s1"),
    e("so-1", "output", "s2", "sd2"),
    e("sw1", "owner", "so1", "s1"),
    e("sw2", "owner", "so2", "s3"),
    e("su1", "user", "so1", "s3"),
  ],
};

const docApproveFlow: ValueFlow = {
  id: "vf-doc-approve",
  parentId: "vf-product-design",
  code: "VF-P-015",
  name: "技术文件审批流程",
  version: "V1.3",
  updatedAt: "2026-09-05",
  nodes: [
    n("t-start", "start", "开始", 100, 220),
    n("t1", "activity", "文件编制", 340, 220),
    n("t2", "activity", "会签审批", 620, 220),
    n("t-end", "end", "结束", 900, 220),
    n("td1", "document", "待审技术文件", 240, 70),
    n("td2", "document", "已会签文件", 700, 400),
    n("tr1", "org-resource", "综合项目室", 480, 70),
  ],
  edges: [
    e("tf1", "flow", "t-start", "t1"),
    e("tf2", "flow", "t1", "t2"),
    e("tf3", "flow", "t2", "t-end"),
    e("ti1", "input", "td1", "t1"),
    e("to1", "output", "t2", "td2"),
    e("trs1", "resource", "tr1", "t2"),
  ],
};

/** 产品研发全流程的子流：设计阶段的分解 */
const uiDesignFlow: ValueFlow = {
  id: "vf-ui-design",
  parentId: "vf-full-rd",
  code: "VF-P-019",
  name: "软件UI设计流程",
  version: "V1.0",
  updatedAt: "2026-09-30",
  nodes: [
    n("u-start", "start", "开始", 100, 200),
    n("u1", "activity", "交互原型设计", 360, 200),
    n("u2", "activity", "视觉规范输出", 640, 200),
    n("u-end", "end", "结束", 900, 200),
    n("ud1", "document", "评审完的PRD文档", 240, 60),
    n("ud2", "document", "软件UI设计稿", 720, 360),
    n("ur1", "org-resource", "交互体验室", 480, 60),
  ],
  edges: [
    e("uf1", "flow", "u-start", "u1"),
    e("uf2", "flow", "u1", "u2"),
    e("uf3", "flow", "u2", "u-end"),
    e("ui1", "input", "ud1", "u1"),
    e("uo1", "output", "u2", "ud2"),
    e("ur1e", "resource", "ur1", "u1"),
  ],
};

/** 产品研发全流程的子流：测试阶段的分解 */
const testExecFlow: ValueFlow = {
  id: "vf-test-exec",
  parentId: "vf-full-rd",
  code: "VF-V-024",
  name: "测试执行流程",
  version: "V1.2",
  updatedAt: "2026-10-05",
  nodes: [
    n("x1", "value", "用例执行", 260, 160, "用例执行模型"),
    n("x2", "value", "缺陷回归", 560, 240, "缺陷管理模型"),
    n("x3", "value", "测试结论出具", 860, 320, "测试结论模型"),
    n("xd1", "document", "测试方案表", 100, 300),
    n("xd2", "document", "测试报告", 980, 480),
    n("xo1", "org-owner", "测试运维部", 420, 440),
  ],
  edges: [
    e("xf1", "flow", "x1", "x2"),
    e("xf2", "flow", "x2", "x3"),
    e("xf3", "flow", "x2", "x1"), // 回归不通过 · 重执行
    e("xi1", "input", "xd1", "x1"),
    e("xo-1", "output", "x3", "xd2"),
    e("xw1", "owner", "xo1", "x1"),
    e("xw2", "owner", "xo1", "x3"),
  ],
};

export const valueFlows: ValueFlow[] = [
  productDesignFlow,
  systemRdFlow,
  buildFullRdFlow(),
  qualityReviewFlow,
  equipmentAcceptFlow,
  budgetFlow,
  supplyKitFlow,
  docApproveFlow,
  uiDesignFlow,
  testExecFlow,
];

/** 直接子流 */
export const childFlows = (flowId: string) =>
  valueFlows.filter((flow) => flow.parentId === flowId);

/** 全部后代流 ID（含自身） */
export function descendantIds(flowId: string): string[] {
  const out = [flowId];
  for (const child of childFlows(flowId)) out.push(...descendantIds(child.id));
  return out;
}

/* ---------------- 引入关系（工作队列成员，本项目可写） ----------------
 * 引入的是引用而非副本：只记录 flowId、引入时版本与引入人；
 * 节点与边始终以 valueFlows（本体快照）为准。 */

const INTRO_KEY = "comac-flow-introductions-v1";
export type Introduction = {
  introducedAt: string;
  introducedBy: string;
  versionAtIntro: string;
};
export type FlowIntroductions = Record<string, Introduction>;

/** 演示种子：三条已引入；系统产研开发流故意记一个旧版本，用于演示版本漂移提示 */
const SEED_INTRO: FlowIntroductions = {
  "vf-product-design": { introducedAt: "2026-09-28 10:20:00", introducedBy: "赵敏", versionAtIntro: "V1.2" },
  "vf-system-rd": { introducedAt: "2026-09-28 10:24:00", introducedBy: "赵敏", versionAtIntro: "V1.9" },
  "vf-full-rd": { introducedAt: "2026-10-09 09:10:00", introducedBy: "赵敏", versionAtIntro: "V3.1" },
  "vf-ui-design": { introducedAt: "2026-10-09 09:16:00", introducedBy: "赵敏", versionAtIntro: "V1.0" },
};

let introductions: FlowIntroductions = loadIntroductions();
const introListeners = new Set<() => void>();

function loadIntroductions(): FlowIntroductions {
  try {
    const raw = localStorage.getItem(INTRO_KEY);
    if (raw) {
      const saved: unknown = JSON.parse(raw);
      if (saved && typeof saved === "object") return saved as FlowIntroductions;
    }
  } catch {
    /* 浏览器存储不可用时使用种子 */
  }
  return structuredClone(SEED_INTRO);
}

function persistIntros() {
  try {
    localStorage.setItem(INTRO_KEY, JSON.stringify(introductions));
  } catch {
    /* 保持当前会话可用 */
  }
  introListeners.forEach((listener) => listener());
}

export function useFlowIntroductions(): FlowIntroductions {
  return useSyncExternalStore(
    (listener) => {
      introListeners.add(listener);
      return () => introListeners.delete(listener);
    },
    () => introductions,
  );
}

export function introduceFlow(flowId: string, by = "赵敏") {
  const flow = valueFlows.find((item) => item.id === flowId);
  if (!flow || introductions[flowId]) return;
  // 子流是父流的分解：父流未引入时不允许单独引入子流
  if (flow.parentId && !introductions[flow.parentId]) return;
  introductions = {
    ...introductions,
    [flowId]: {
      introducedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
      introducedBy: by,
      versionAtIntro: flow.version,
    },
  };
  persistIntros();
}

/** 取消引入：全量删除引入记录与该流（含已引入子流）的全部绑定。绑定不是创造型资产，不设归档态。 */
export function removeIntroducedFlow(flowId: string) {
  const targets = new Set(descendantIds(flowId));
  const nextBindings: FlowBindings = {};
  for (const [key, value] of Object.entries(bindings)) {
    const owner = key.split("#")[0];
    if (!targets.has(owner)) nextBindings[key] = value;
  }
  bindings = nextBindings;
  persist();
  const next = { ...introductions };
  for (const id of targets) delete next[id];
  introductions = next;
  persistIntros();
}
