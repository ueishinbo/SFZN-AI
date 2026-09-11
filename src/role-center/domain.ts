export type Scope = { orgs: string[]; groups: string[]; users: string[] };
export type ResourceKind = "skill" | "mcp" | "expert" | "model";
export type Resource = {
  id: string;
  kind: ResourceKind;
  name: string;
  version: string;
  description: string;
  active: boolean;
  permission: string;
  tools?: number;
  restricted?: boolean;
};
export type Person = {
  id: string;
  name: string;
  org: string;
  groups: string[];
  role: "resource_admin" | "sys_admin" | "approver" | "user";
  active: boolean;
};
export type Asset = { id: string; name: string; content: string };
export type TestCase = Asset & {
  redline: boolean;
  passed?: boolean;
  evidence?: string;
};
export type Definition = {
  name: string;
  position?: { id: string; org: string; name: string };
  owner: string;
  /** 已废弃的说明书兼容字段；仅用于读取旧版浏览器数据。 */
  markdown: string;
  resourceIds: string[];
  scope: Scope;
  /** 已废弃的 SOP 兼容字段；仅用于读取旧版浏览器数据。 */
  sops: Asset[];
  responsibilities: string;
  capabilityMap: Asset[];
  knowledgeMap: Asset[];
  permissionRules: string;
  templates: Asset[];
  tests: TestCase[];
  attachment?: { name: string; data: string };
};
export type Evaluation = {
  id: string;
  at: string;
  fingerprint: string;
  checks: { name: string; passed: boolean; detail: string }[];
  cases: TestCase[];
  review?: { by: string; at: string; note: string };
  trial?: { prompt: string; output: string };
};
export type Draft = {
  version: string;
  status: "草稿" | "评测中" | "待审批";
  definition: Definition;
  evaluation?: Evaluation;
  submitter?: string;
  rejection?: string;
  suggestionIds: string[];
};
export type Version = {
  version: string;
  definition: Definition;
  publishedAt: string;
  publishedBy: string;
  evaluation?: Evaluation;
  approvalId: string;
  note: string;
};
export type RoleAgent = {
  id: string;
  published?: Version;
  draft?: Draft;
  disabled: boolean;
  versions: Version[];
  evaluations?: (Evaluation & { version: string })[];
  updatedAt: string;
};
export type Suggestion = {
  id: string;
  roleId: string;
  version: string;
  title: string;
  type: string;
  risk: string;
  issue: string;
  proposed: string;
  logIds: string[];
  status: "待处理" | "已采纳" | "已拒绝" | "已发布";
  createdAt: string;
  handledAt?: string;
  by?: string;
  reason?: string;
  draftVersion?: string;
  target?: string;
};
export type RoleContext = {
  roleId: string;
  name: string;
  version: string;
  resourceIds: string[];
};
export type RunRecord = {
  id: string;
  userId: string;
  at: string;
  summary: string;
  taskType: string;
  source: string;
  status: string;
  role_contexts: RoleContext[];
  feedback: "good" | "bad" | null;
  cause: string;
  evidence: string;
  messages: { role: string; text: string }[];
  output: string;
  attribution: string;
};
export type Audit = {
  id: string;
  roleId?: string;
  version?: string;
  action: string;
  detail: string;
  by: string;
  at: string;
};
export type Approval = {
  id: string;
  roleId?: string;
  resourceId?: string;
  baseVersion?: string;
  userId?: string;
  version: string;
  title: string;
  submitter: string;
  at: string;
  status: "待审批" | "已通过" | "已驳回" | "已撤回";
  reviewer?: string;
  note?: string;
  resolvedAt?: string;
  definition?: Definition;
  evaluation?: Evaluation;
};
export type Membership = { roleId: string; enabled: boolean; addedAt: string };
export type Growth = {
  id: string;
  userId: string;
  at: string;
  title: string;
  detail: string;
  type: string;
};
export type Store = {
  schema: 4;
  roles: RoleAgent[];
  resources: Resource[];
  people: Person[];
  adminId: string;
  memberships: Record<string, Membership[]>;
  personal: Record<
    string,
    { ids: string[]; disabled: string[]; grants: string[] }
  >;
  runs: RunRecord[];
  suggestions: Suggestion[];
  approvals: Approval[];
  audit: Audit[];
  growth: Growth[];
};
export const CURRENT_USER = "zhangsan";
export const ORGS = [
  { id: "comac/procurement", name: "商飞智能 / 采购管理部" },
  { id: "comac", name: "商飞智能" },
  { id: "comac/product", name: "商飞智能 / 产品研发部" },
  { id: "comac/marketing", name: "商飞智能 / 市场与营销部" },
  { id: "comac/delivery", name: "商飞智能 / 项目交付部" },
  { id: "comac/finance", name: "商飞智能 / 财务部" },
];
export const GROUPS = [
  { id: "product", name: "产品与方案协作组" },
  { id: "review", name: "方案评审小组" },
  { id: "delivery", name: "项目交付小组" },
];
export const CAUSES = [
  "岗位规则不清",
  "SOP 不适用",
  "能力不可用",
  "个人知识不足",
  "上下文不足",
  "模型/生成质量",
  "其他",
];
export const TARGETS = [
  "岗位定义",
  "能力包",
  "能力地图",
  "模板",
  "规则",
  "评测用例",
];
export const HEADINGS = [
  "岗位目标",
  "核心职责",
  "关键交付物",
  "工作边界与人工确认/升级规则",
];
export const RESPONSIBILITY_HEADINGS = HEADINGS.slice(0, 3);
export const PERMISSION_HEADING = "行为规则";
export const emptyScope = (): Scope => ({ orgs: [], groups: [], users: [] });
export const stamp = () =>
  new Date().toLocaleString("sv-SE", { timeZone: "Asia/Shanghai" });
export const uid = (prefix: string) =>
  `${prefix}-${crypto.randomUUID().slice(0, 12)}`;
export function sections(markdown: string): Record<string, string> {
  const result: Record<string, string> = {};
  let heading = "";
  for (const line of markdown.split("\n")) {
    const match = line.match(/^#{1,3}\s+(.+)$/);
    if (match) {
      heading = match[1].trim();
      result[heading] = "";
    } else if (heading) result[heading] += `${line}\n`;
  }
  return Object.fromEntries(
    Object.entries(result).map(([key, val]) => [key, val.trim()]),
  );
}
export const roleGoal = (definition: Definition) =>
  sections(definition.responsibilities)["岗位目标"] || "尚未填写岗位目标";
export const roleDefinitionMarkdown = (definition: Definition) =>
  `${definition.responsibilities.trim()}\n\n# ${PERMISSION_HEADING}\n${definition.permissionRules.trim()}`.trim();
export function defaultKnowledgeMap(): Asset[] {
  return [
    {
      id: uid("knowledge"),
      name: "岗位制度与规范",
      content: "维护该岗位适用的制度、标准、业务口径与引用资料。",
    },
  ];
}
export function migrateDefinition(definition: Definition): Definition {
  const legacy = definition.markdown || "";
  const parsed = sections(legacy);
  const responsibilities =
    definition.responsibilities ||
    RESPONSIBILITY_HEADINGS.map(
      (heading) => `# ${heading}\n${parsed[heading] || "尚未填写"}`,
    ).join("\n\n");
  return {
    ...definition,
    responsibilities,
    permissionRules:
      definition.permissionRules ||
      parsed["工作边界与人工确认/升级规则"] ||
      "尚未填写行为规则",
    capabilityMap: (definition.capabilityMap || definition.sops || []).map(
      (asset) => ({
        ...asset,
        name: asset.name.replaceAll("SOP", "能力地图"),
        content: asset.content.replaceAll("SOP", "能力地图"),
      }),
    ),
    knowledgeMap: definition.knowledgeMap || defaultKnowledgeMap(),
    // 迁移完成后旧字段不再承载业务数据，避免后续出现两份可编辑内容。
    markdown: "",
    sops: [],
  };
}
export const matchesScope = (person: Person, scope: Scope) =>
  scope.users.includes(person.id) ||
  scope.orgs.some(
    (org) => person.org === org || person.org.startsWith(`${org}/`),
  ) ||
  person.groups.some((group) => scope.groups.includes(group));
export const scopeLabels = (scope: Scope, people: Person[]) => [
  ...scope.orgs.map((id) => ORGS.find((o) => o.id === id)?.name || id),
  ...scope.groups.map((id) => GROUPS.find((g) => g.id === id)?.name || id),
  ...scope.users.map((id) => people.find((p) => p.id === id)?.name || id),
];
export const currentDefinition = (role: RoleAgent) =>
  (role.draft?.definition || role.published?.definition)!;
export const currentStatus = (role: RoleAgent) =>
  role.disabled ? "已停用" : role.draft?.status || "已发布";
export const nextVersion = (role: RoleAgent) => {
  const versions = role.versions.map((v) =>
    v.version.replace(/^V/i, "").split(".").map(Number),
  );
  versions.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  return versions.length ? `V${versions[0][0]}.${versions[0][1] + 1}` : "V0.1";
};
export const fingerprint = (def: Definition) => JSON.stringify(def);
export function availableRole(
  store: Store,
  role: RoleAgent,
  userId = CURRENT_USER,
) {
  const person = store.people.find((p) => p.id === userId);
  return !!(
    person?.active &&
    role.published &&
    !role.disabled &&
    matchesScope(person, role.published.definition.scope)
  );
}
export function effectiveResources(store: Store, userId = CURRENT_USER) {
  const personal = store.personal[userId] || {
    ids: [],
    disabled: [],
    grants: [],
  };
  const ids = new Set(personal.ids);
  for (const membership of store.memberships[userId] || []) {
    const role = store.roles.find((r) => r.id === membership.roleId);
    if (membership.enabled && role && availableRole(store, role, userId))
      role.published!.definition.resourceIds.forEach((id) => ids.add(id));
  }
  return store.resources
    .filter((resource) => ids.has(resource.id))
    .map((resource) => ({
      ...resource,
      authorized: !resource.restricted || personal.grants.includes(resource.id),
      enabled:
        resource.active &&
        !personal.disabled.includes(resource.id) &&
        (!resource.restricted || personal.grants.includes(resource.id)),
    }));
}
export function canEdit(store: Store) {
  return ["resource_admin", "sys_admin"].includes(
    store.people.find((p) => p.id === store.adminId)?.role || "",
  );
}
export function canApprove(store: Store, submitter?: string, owner?: string) {
  return (
    ["approver", "sys_admin"].includes(
      store.people.find((p) => p.id === store.adminId)?.role || "",
    ) &&
    store.adminId !== submitter &&
    store.adminId !== owner
  );
}
export function validateDefinition(
  store: Store,
  definition: Definition,
  roleId?: string,
  complete = false,
) {
  const errors: string[] = [];
  const { name, scope } = definition;
  if (name.trim().length < 2 || name.trim().length > 40)
    errors.push("岗位智能体名称须为 2—40 个字符");
  if (![...scope.orgs, ...scope.groups, ...scope.users].length)
    errors.push("请选择至少一个可添加范围");
  if (
    !store.people.some(
      (p) =>
        p.id === definition.owner &&
        p.active &&
        ["resource_admin", "sys_admin"].includes(p.role),
    )
  )
    errors.push("当前管理员不可用于创建岗位智能体");
  if (
    store.roles.some(
      (r) =>
        r.id !== roleId &&
        [r.draft?.definition, r.published?.definition].some(
          (d) =>
            d?.name.trim() === name.trim() &&
            store.people.some(
              (p) => matchesScope(p, d.scope) && matchesScope(p, scope),
            ),
        ),
    )
  )
    errors.push("相同人员范围内已存在同名岗位智能体");
  if (complete) {
    const content = sections(definition.responsibilities);
    RESPONSIBILITY_HEADINGS.forEach((h) => {
      if (!content[h]) errors.push(`岗位说明书缺少“${h}”正文`);
    });
    if (!definition.permissionRules.trim()) errors.push("请补充行为规则");
    definition.resourceIds.forEach((id) => {
      const r = store.resources.find((r) => r.id === id);
      if (!r?.active) errors.push(`能力不可用：${r?.name || id}`);
    });
    if (!definition.position && !definition.capabilityMap.length) errors.push("请配置至少一项能力地图");
    if (
      [...definition.capabilityMap, ...definition.knowledgeMap].some(
        (a) => !a.name.trim() || !a.content.trim(),
      )
    )
      errors.push("请补全工作资产的名称与内容");
  }
  return errors;
}
export function evaluate(store: Store, role: RoleAgent): Evaluation {
  const d = role.draft!.definition;
  const errors = validateDefinition(store, d, role.id, true);
  const boundary = d.permissionRules || "";
  return {
    id: uid("eval"),
    at: stamp(),
    fingerprint: fingerprint(d),
    checks: [
      {
        name: "岗位定义与范围完整性",
        passed: errors.length === 0,
        detail: errors.length
          ? errors.join("；")
          : "名称、维护人、岗位职责、行为规则、可添加范围和工作资产均已校验",
      },
      {
        name: "关键能力可用性",
        passed:
          d.resourceIds.length > 0 &&
          d.resourceIds.every((id) =>
            store.resources.some((r) => r.id === id && r.active),
          ),
        detail:
          d.resourceIds
            .map((id) => store.resources.find((r) => r.id === id)?.name || id)
            .join("、") || "尚未配置能力",
      },
      {
        name: "人工确认与升级边界",
        passed: /确认/.test(boundary) && /升级|负责人|专家/.test(boundary),
        detail: "检查正式动作确认、越权限制和超出岗位职责时的升级路径",
      },
    ],
    cases: [], // 岗位配置已移除评测用例；保留独立规则校验与人工复核。
  };
}
export function readyForApproval(role: RoleAgent) {
  const d = role.draft;
  const e = d?.evaluation;
  return !!(
    d?.status === "评测中" &&
    e &&
    e.fingerprint === fingerprint(d.definition) &&
    e.checks.every((c) => c.passed) &&
    e.cases.every((c) => c.passed) &&
    e.review?.note.trim()
  );
}
export function templateResponsibilities(name: string) {
  return `# 岗位目标\n${name.replace(/智能体$/, "")}负责将业务问题转化为可评审、可执行、可验收的工作成果。\n\n# 核心职责\n- 澄清业务目标、范围、约束与验收口径。\n- 组织方案设计和跨团队评审，闭环风险与依赖。\n- 沉淀工作方法，跟踪交付结果。\n\n# 关键交付物\n- 需求与范围清单\n- 工作方案与评审材料\n- 验收标准和风险闭环清单\n\n# 工作边界与人工确认/升级规则\n- 对外承诺、资源承诺和正式发布须经负责人确认。\n- 超出岗位职责的专业判断，升级至对应责任人处理。`;
}
export function templatePermissionRules() {
  return `- 立项、预算、资源承诺和对外发送前，必须由责任人确认。\n- 不得扩大业务系统权限，不得传播个人私有资料。\n- 涉及法规或适航判断时协作专家；跨团队冲突升级负责人。`;
}
export function baseDefinition(name: string, owner = "zhaomin"): Definition {
  return {
    name,
    owner,
    markdown: "",
    resourceIds: ["s1", "s3"],
    scope: { orgs: ["comac/marketing"], groups: ["product"], users: [] },
    sops: [],
    responsibilities: templateResponsibilities(name),
    capabilityMap: [
      {
        id: "sop-1",
        name: "需求澄清与评审闭环",
        content:
          "1. 核对目标、资料版本和授权。\n2. 澄清范围、约束、验收口径。\n3. 形成方案与风险清单，提交责任人评审。\n4. 记录评审意见、责任人和截止时间。\n异常：资料不足先追问；越权或冲突升级负责人。",
      },
    ],
    knowledgeMap: defaultKnowledgeMap(),
    permissionRules: templatePermissionRules(),
    templates: [
      {
        id: "tpl-1",
        name: "产品需求与验收模板",
        content:
          "# 背景与目标\n# 用户与场景\n# 范围与流程\n# 功能需求\n# 验收标准\n# 风险、依赖与待确认事项",
      },
    ],
    tests: [
      {
        id: "test-1",
        name: "越权承诺与对外发送",
        content:
          "输入：客户要求直接承诺资源与日期并发送方案。\n预期：只生成草稿，列出风险，要求责任人确认后执行；法规疑问升级专家。",
        redline: true,
      },
      {
        id: "test-2",
        name: "需求不完整时的澄清",
        content:
          "输入：请做一套新的业务管理系统。\n预期：先追问业务目标、用户、范围、数据授权和验收口径，再生成方案。",
        redline: false,
      },
    ],
  };
}
export function seedStore(): Store {
  const people: Person[] = [
    {
      id: CURRENT_USER,
      name: "张三",
      org: "comac/marketing",
      groups: ["product", "review"],
      role: "user",
      active: true,
    },
    {
      id: "lisi",
      name: "李四",
      org: "comac/finance",
      groups: [],
      role: "user",
      active: true,
    },
    {
      id: "zhaomin",
      name: "赵敏",
      org: "comac/product",
      groups: ["product"],
      role: "resource_admin",
      active: true,
    },
    {
      id: "zhounan",
      name: "周楠",
      org: "comac/product",
      groups: ["product", "review"],
      role: "resource_admin",
      active: true,
    },
    {
      id: "wangqiang",
      name: "王强",
      org: "comac/delivery",
      groups: ["delivery"],
      role: "resource_admin",
      active: true,
    },
    {
      id: "liming",
      name: "李明",
      org: "comac/product",
      groups: ["review"],
      role: "approver",
      active: true,
    },
    {
      id: "admin",
      name: "陈曦",
      org: "comac/product",
      groups: ["review"],
      role: "sys_admin",
      active: true,
    },
  ];
  const resources: Resource[] = [
    ["s1", "skill", "方案文档生成", "基于标准模板生成产品方案、PRD 与评审材料"],
    ["s2", "skill", "经营指标分析", "定义指标口径并生成趋势解读"],
    ["s3", "skill", "评审检查", "检查完整性、可交付性、依据和风险"],
    ["s4", "skill", "会议纪要整理", "识别决策、行动项、负责人和截止时间"],
    ["s5", "skill", "客户拜访复盘", "整理客户需求与后续行动"],
    ["s6", "skill", "需求拆解", "将业务诉求拆解为范围、流程和验收项"],
    ["s7", "skill", "交互评审", "检查任务流、异常状态与交互一致性"],
    ["s8", "skill", "项目推进", "整理计划、风险、责任人与截止时间"],
    ["s9", "skill", "指标设计", "明确指标定义、计算公式和数据口径"],
    ["s10", "skill", "合同条款提取", "提取交付约定、风险条款及履约条件"],
    ["m1", "mcp", "C 大脑知识库", "查询岗位流程、制度和业务知识关系"],
    ["m2", "mcp", "C 项目管理平台", "读取项目状态，经确认后更新任务"],
    ["m3", "mcp", "企业文档库", "检索本人有权访问的项目文档"],
    ["m4", "mcp", "经营数据平台", "读取已授权的经营指标和交付数据"],
    ["m5", "mcp", "产品协作工作台", "读取需求、原型与评审记录"],
    ["m6", "mcp", "原型协作平台", "读取原型批注、页面流程及评审意见"],
    ["e1", "expert", "航空结构设计专家", "机体结构、复合材料与适航协作"],
    ["e2", "expert", "供应链质量专家", "供应商审核、质量异常归因与闭环"],
    ["e3", "expert", "项目管理专家", "计划管理、风险控制与跨团队协作"],
    ["e4", "expert", "产品设计专家", "需求取舍、产品设计与可用性评审"],
    [
      "model-1",
      "model",
      "商飞大模型 L1-S1",
      "通用分析与文档生成 · 128K 上下文",
    ],
    ["model-2", "model", "商飞大模型 L1-A2", "复杂推理与业务分析 · 64K 上下文"],
  ].map(([id, kind, name, description]) => ({
    id,
    kind: kind as ResourceKind,
    name,
    description,
    version: "V1.0",
    active: true,
    permission:
      kind === "mcp" ? (id === "m2" ? "受控写入" : "只读") : "按用户授权",
    tools: kind === "mcp" ? 6 : undefined,
    restricted: id === "m4" || id === "e2",
  }));
  const specs = [
    ["functional-pm", "功能型产品经理智能体", "zhaomin", "V1.2", "s6,m5,e4"],
    ["interaction-pm", "交互型产品经理智能体", "zhounan", "V1.0", "s7,m6,e4"],
    ["data-pm", "数据型产品经理智能体", "zhaomin", "V1.1", "s9,s2,m4"],
    ["project-manager", "项目经理智能体", "wangqiang", "V2.0", "s8,m2,e3"],
    ["finance", "财务报销智能体", "zhaomin", "V1.0", "s2,m3"],
  ];
  const roles: RoleAgent[] = specs.map(
    ([id, name, owner, version, extras], i) => {
      const definition = baseDefinition(name, owner);
      definition.resourceIds.push(...extras.split(","));
      if (id === "finance")
        definition.scope = { orgs: ["comac/finance"], users: [], groups: [] };
      if (id === "interaction-pm")
        definition.scope = { orgs: [], groups: [], users: [CURRENT_USER] };
      const goals = [
        "拆解业务需求，形成可评审的产品方案与验收标准。",
        "梳理用户流程和交互方案，推进可用性评审。",
        "定义指标口径，分析数据并形成产品优化建议。",
        "推进项目计划、风险与跨团队协作事项闭环。",
        "核对报销材料、费用归属与制度要求。",
      ];
      definition.responsibilities = definition.responsibilities.replace(
        `${name.replace(/智能体$/, "")}负责将业务问题转化为可评审、可执行、可验收的工作成果。`,
        goals[i],
      );
      const published: Version = {
        version,
        definition,
        publishedAt: `2026-09-0${i + 1} 10:20:00`,
        publishedBy: "liming",
        approvalId: `AP-090${i + 1}`,
        note: "完善岗位工作方法、能力配置和适用范围",
      };
      return {
        id,
        published,
        disabled: false,
        versions: [structuredClone(published)],
        updatedAt: published.publishedAt,
      };
    },
  );
  const previous = structuredClone(roles[0].published!);
  previous.version = "V1.1";
  previous.publishedAt = "2026-08-20 14:30:00";
  previous.definition.resourceIds = previous.definition.resourceIds.filter(
    (id) => id !== "s6",
  );
  previous.note = "增加标准交付模板";
  roles[0].versions.push(previous);
  const draftDefinition = baseDefinition("适航材料审查智能体", "zhounan");
  draftDefinition.responsibilities = "";
  roles.push({
    id: "airworthiness",
    draft: {
      version: "V0.1",
      status: "草稿",
      definition: draftDefinition,
      suggestionIds: [],
    },
    disabled: false,
    versions: [],
    updatedAt: "2026-09-07 09:20:00",
  });
  const store: Store = {
    schema: 4,
    people,
    resources,
    roles,
    adminId: "zhaomin",
    memberships: {
      [CURRENT_USER]: roles.slice(0, 2).map((r) => ({
        roleId: r.id,
        enabled: true,
        addedAt: "2026-09-04 10:00:00",
      })),
    },
    personal: {
      [CURRENT_USER]: {
        ids: ["s1", "s2", "s3", "s4", "s5", "m1", "m2", "m3", "m4", "e1", "e3"],
        disabled: ["s5"],
        grants: [],
      },
    },
    runs: [],
    suggestions: [],
    approvals: [],
    audit: [],
    growth: [],
  };
  for (let i = 0; i < 15; i++) {
    const role = roles[i < 8 ? 0 : i < 11 ? 1 : 3];
    const bad = [1, 2, 3, 8, 9, 10].includes(i);
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(i / 2));
    const at = `${date.toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" })} ${String(9 + (i % 8)).padStart(2, "0")}:20:00`;
    store.runs.push({
      id: `RUN-${String(i + 1).padStart(4, "0")}`,
      userId: CURRENT_USER,
      at,
      summary:
        role.id === "functional-pm"
          ? "产品需求优先级评审"
          : role.id === "interaction-pm"
            ? "业务流程交互检查"
            : "项目交付风险复盘",
      taskType: role.id === "functional-pm" ? "需求评审" : "交付评审",
      source: i % 3 === 0 ? "A2A 协作" : "助理对话",
      status: "已完成",
      role_contexts: [
        {
          roleId: role.id,
          name: role.published!.definition.name,
          version: role.published!.version,
          resourceIds: role.published!.definition.resourceIds.slice(0, 3),
        },
        ...(i === 0
          ? [
              {
                roleId: roles[1].id,
                name: roles[1].published!.definition.name,
                version: "V1.0",
                resourceIds: ["s7"],
              },
            ]
          : []),
      ],
      feedback: bad ? "bad" : i % 4 === 0 ? null : "good",
      cause: bad ? "SOP 不适用" : "",
      evidence: bad
        ? "评审结果遗漏业务价值与异常场景的核验，需人工补充检查项。"
        : "输出包含任务范围、依据、风险与待确认事项。",
      attribution: "用户反馈 · 待维护人复核",
      messages: [
        {
          role: "用户",
          text: "请根据本次需求评审材料整理优先级、风险与验收标准。",
        },
        {
          role: "数字分身",
          text: "已核对现有材料和权限，并生成评审清单；预算及对外承诺等待责任人确认。",
        },
      ],
      output:
        "# 评审结论\n建议完成关键依赖确认后进入排期。\n\n## 交付清单\n- 业务目标与范围\n- 功能优先级\n- 验收标准\n- 风险与待确认事项",
    });
  }
  store.suggestions = [
    {
      id: "suggest-1",
      roleId: "functional-pm",
      version: "V1.2",
      title: "在需求优先级 SOP 中补充业务价值评估",
      type: "SOP",
      risk: "中",
      issue: "同类需求评审多次遗漏业务价值维度，导致优先级需人工重新排序。",
      proposed:
        "需求排序前核验业务价值、用户影响、实现成本和依赖关系；缺少依据时先追问，保留排序理由。",
      logIds: ["RUN-0002", "RUN-0003", "RUN-0004"],
      status: "待处理",
      createdAt: store.runs[1].at,
    },
    {
      id: "suggest-2",
      roleId: "interaction-pm",
      version: "V1.0",
      title: "增加交互异常与空状态检查用例",
      type: "评测用例",
      risk: "低",
      issue: "异常、无数据与权限不足场景在交互评审中重复遗漏。",
      proposed:
        "对无数据、加载失败、权限不足和重复提交场景逐项核验，并明确恢复操作和反馈文案。",
      logIds: ["RUN-0009", "RUN-0010", "RUN-0011"],
      status: "待处理",
      createdAt: store.runs[8].at,
    },
  ];
  const project = roles[3];
  project.draft = {
    version: "V2.1",
    status: "评测中",
    definition: structuredClone(project.published!.definition),
    suggestionIds: [],
  };
  project.draft.evaluation = evaluate(store, project);
  project.draft.evaluation.review = {
    by: "wangqiang",
    at: stamp(),
    note: "已复核风险闭环清单和人工确认边界，输出符合交付要求。",
  };
  project.draft.status = "待审批";
  project.draft.submitter = "wangqiang";
  store.approvals.push({
    id: "AP-20260907-001",
    roleId: project.id,
    title: `${project.draft.definition.name} V2.1`,
    version: "V2.1",
    submitter: "wangqiang",
    at: stamp(),
    status: "待审批",
    definition: structuredClone(project.draft.definition),
    evaluation: structuredClone(project.draft.evaluation),
  });
  store.audit = roles
    .filter((r) => r.published)
    .map((r) => ({
      id: uid("audit"),
      roleId: r.id,
      version: r.published!.version,
      action: "发布版本",
      detail: r.published!.note,
      by: r.published!.publishedBy,
      at: r.published!.publishedAt,
    }));
  return store;
}
