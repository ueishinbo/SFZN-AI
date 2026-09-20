import { baseDefinition, CURRENT_USER, type Resource, type Store } from './domain';

/** One-time, scoped upgrade of the personal demo; preserves unrelated admin data. */
export function withExecutiveDemo(store: Store): Store {
  const marked = store as Store & { executiveDemoVersion?: number };
  if (marked.executiveDemoVersion === 3) return store;
  if (marked.executiveDemoVersion === 1 || marked.executiveDemoVersion === 2) return withExecutiveHistory(store);
  const person = store.people.find(person => person.id === CURRENT_USER);
  if (person) person.name = '陈智超';
  const resources: Resource[] = [
    ['project-query', 'skill', '项目查询', '查询重点项目概况、负责人及当前状态'],
    ['progress-query', 'skill', '进度查询', '跟踪里程碑、交付进展与计划偏差'],
    ['project-risk', 'skill', '项目风险分析', '识别延期、资源瓶颈和跨部门阻塞，形成推进建议'],
    ['finance-query', 'skill', '财务查询', '汇总收入、成本、现金回款等经营数据'],
    ['budget-analysis', 'skill', '预算执行分析', '对比预算与实际支出，提示异常及原因'],
    ['business-brief', 'skill', '经营简报生成', '汇总经营表现、重点风险与待决策事项'],
    ['project-expert', 'expert', '项目管理专家', '重点项目统筹、里程碑管理与跨部门协调'],
    ['finance-expert', 'expert', '财务分析专家', '预算执行、成本分析与现金回款研判'],
    ['business-expert', 'expert', '经营决策专家', '经营目标分析、资源配置与决策建议'],
    ['project-platform', 'mcp', '项目管理平台', '查询项目、任务进度和里程碑信息'],
    ['finance-platform', 'mcp', '财务管理系统', '查询预算、收入、成本与回款信息'],
    ['business-platform', 'mcp', '经营数据平台', '查询公司经营指标、趋势与目标完成情况'],
  ].map(([id, kind, name, description]) => ({ id: `gm-${id}`, kind: kind as Resource['kind'], name, description, version: 'V1.0', active: true, restricted: false, permission: '只读', tools: kind === 'mcp' ? 6 : undefined }));
  store.resources.push(...resources);
  const configs = [
    { id: 'gm-project-director', name: '项目总监智能体', goal: '统筹重点项目，跟踪里程碑与交付风险。', duties: '汇总重点项目进展与计划偏差。\n- 识别延期、依赖和资源瓶颈。\n- 协调跨部门事项，形成项目推进建议。', deliverables: '重点项目进展摘要\n- 里程碑与风险清单\n- 跨部门协调事项及责任分工', ids: ['project-query', 'progress-query', 'project-risk', 'project-expert', 'project-platform'], flow: '查询项目概况 → 核对里程碑 → 分析偏差与风险 → 汇总协调事项 → 提交推进建议' },
    { id: 'gm-business-management', name: '经营管理智能体', goal: '掌握经营表现，辅助预算与资源决策。', duties: '汇总经营指标及年度目标达成情况。\n- 跟踪预算执行、收入、成本与回款。\n- 提示经营异常，提出资源配置建议。', deliverables: '经营简报\n- 预算差异与回款分析\n- 经营风险及待决策事项', ids: ['finance-query', 'budget-analysis', 'business-brief', 'finance-expert', 'business-expert', 'finance-platform', 'business-platform'], flow: '查询经营数据 → 核对统计口径 → 分析目标差距 → 识别异常 → 形成经营简报' },
  ];
  for (const config of configs) {
    const definition = baseDefinition(config.name);
    definition.scope = { orgs: [], groups: [], users: [CURRENT_USER] };
    definition.resourceIds = config.ids.map(id => `gm-${id}`);
    definition.responsibilities = `# 岗位目标\n${config.goal}\n\n# 核心职责\n- ${config.duties}\n\n# 关键交付物\n- ${config.deliverables}\n\n# 工作边界与人工确认/升级规则\n提供信息汇总、风险提示与决策建议；涉及预算调整、资源承诺、对外发布及重大业务决策时，由本人确认。超出职责的事项升级至对应负责人。`;
    definition.permissionRules = '查询与分析仅用于辅助决策；预算调整、资源承诺、对外发布及重大业务决策须由本人确认。';
    definition.capabilityMap = [{ id: `${config.id}-flow`, name: '工作流程', content: config.flow }];
    definition.knowledgeMap = [];
    definition.templates = [{ id: `${config.id}-template`, name: '管理摘要模板', content: '# 结论\n# 关键数据与依据\n# 目标差距及原因\n# 风险与影响\n# 责任人与下一步\n# 需要决策的事项' }];
    const published = { version: 'V1.0', definition, publishedAt: '2026-09-15 09:00:00', publishedBy: 'zhaomin', approvalId: `demo-${config.id}`, note: '总经理演示配置' };
    store.roles.push({ id: config.id, published, versions: [structuredClone(published)], disabled: false, updatedAt: published.publishedAt });
  }
  store.memberships[CURRENT_USER] = configs.map(config => ({ roleId: config.id, enabled: true, addedAt: '2026-09-15 09:00:00' }));
  store.personal[CURRENT_USER] = { ids: [], disabled: [], grants: [] };
  return withExecutiveHistory(store);
}

/** September 28 presentation fixtures, not production activity records. */
function withExecutiveHistory(store: Store): Store {
  const demoUser = 'zhangsan';
  // Replace only seeded records; retain user-created history and other accounts.
  store.runs = store.runs.filter(run => !(run.userId === demoUser && /^GM-RUN-\d+$/.test(run.id)));
  store.growth = store.growth.filter(event => !(event.userId === demoUser && /^gm-growth-\d+$/.test(event.id)));
  const examples = [
    [
      "2026-09-04 09:18:00",
      "重点项目周报口径确认",
      "项目推进",
      0,
      "good",
      "按项目列清了节点，后续继续补计划基线。",
      [
        "周报不要逐条念进度，帮我找出需要协调的事项。",
        "先按里程碑、当前偏差、跨部门依赖整理。生产链式智能试点的验收清单尚待对齐，建议由陈帅汇总确认。",
        "已完成和待确认要分开。",
        "收到。已完成项单列；验收清单标为待确认，并注明责任人和下次反馈时间，避免将材料提交等同于验收通过。"
      ]
    ],
    [
      "2026-09-08 16:42:00",
      "联调风险分析补充依据",
      "风险分析",
      0,
      "bad",
      "首轮只有通用建议，缺少具体节点和依据。",
      [
        "生产链式智能试点最大的风险是什么？",
        "建议关注数据一致性、责任划分与联调资源冲突。",
        "太泛了。到底哪个节点受影响，依据是什么？",
        "现有材料不足以给风险排序。我先将任务编号映射、缺件反馈责任、联调窗口列为待核实项；请项目组补充问题清单和计划基线后，再判断对里程碑的影响。"
      ]
    ],
    [
      "2026-09-11 11:06:00",
      "联调问题清单复核",
      "项目推进",
      0,
      "good",
      "能区分已确认问题与待核实风险，便于会上协调。",
      [
        "按补充的问题清单再整理一次，别把所有问题都写成高风险。",
        "已按“问题—依据—影响节点—责任人”整理：字段映射由王磊核对，工位样例由刘娟补充，验收口径由陈帅汇总。尚无明确日期影响的条目标为待评估。",
        "哪些需要我拍板？",
        "当前先请各责任方确认闭环时间；只有联调窗口冲突无法自行解决时，再提交资源协调选项，不直接代你承诺资源。"
      ]
    ],
    [
      "2026-09-14 14:37:00",
      "月度经营简报结构调整",
      "经营分析",
      1,
      "good",
      "结论前置，未确认数字有明确标注。",
      [
        "经营简报压缩到一页，先说异常。",
        "建议首段放目标差距和待决策事项，再列预算执行、收入成本、回款及数据截止时间。缺少财务确认的数字不进入结论。",
        "同比和环比别混在一起。",
        "会分别标注对比期间、分母和单位；比例变化用百分点表述，金额变化单列，不混用增幅。"
      ]
    ],
    [
      "2026-09-17 10:23:00",
      "发动机工作包采购覆盖核对",
      "项目协调",
      0,
      "good",
      "明确1架份预测缺口，没有把全部未交付架次算成延期。",
      [
        "半年生产到86架次，发动机采购现在到56，是不是缺30架？",
        "不能直接这样判断。当前验收覆盖至56，期末预计覆盖至85；与计划86相比，预测覆盖缺口是1架份。57至85属于后续待交付范围，仍须逐架核对需求日。",
        "供应商说30个工作日恢复交付，能解除风险吗？",
        "还不能。马主任需取得书面批次计划，生产部再计入运输、检验与放行时间复核排程；在此之前保持风险跟踪。"
      ]
    ],
    [
      "2026-09-21 15:48:00",
      "预算差异原因待财务核实",
      "预算分析",
      1,
      null,
      "",
      [
        "支出低于预算，能不能说节约了？",
        "暂时不能。需区分付款节点后移、未到票、范围调整和实际节约，先核对财务明细及责任部门说明。",
        "先整理要补哪些材料。",
        "补充预算基线、已签未付合同、验收及开票状态；当前完成核对清单，差异原因待财务回复，暂不形成节约结论。"
      ]
    ],
    [
      "2026-09-24 09:32:00",
      "重点回款跟进清单",
      "财务查询",
      1,
      "good",
      "补充了阻塞原因和下次反馈节点。",
      [
        "回款清单别只有金额，我要知道卡在哪里。",
        "按合同节点列出验收材料、开票状态、客户确认和计划回款日，金额采用财务确认口径；无依据的回款日期标待确认。",
        "把责任部门和下次反馈时间也列上。",
        "已补为必填项。验收资料缺口由业务部门核对，开票及到账由财务核对；未收到回复的条目保留待反馈，不标记已解决。"
      ]
    ],
    [
      "2026-09-25 16:14:00",
      "供应商交付与质量指标复核",
      "经营分析",
      1,
      "good",
      "区分了百分点和记录数量，结论更审慎。",
      [
        "准时率提升了，为什么还要关注供应商？",
        "月度快照中准时率由80%到90%，提升10个百分点；但一次验收合格率由98.5%到98.0%，下降0.5个百分点。整体交付改善不代表质量风险解除。",
        "西飞排名下降能直接归因于FRR吗？",
        "不能。FRR是记录数量，需核对去重和扣分明细，再判断与排名变化的关系；现阶段只列为待复核事项。"
      ]
    ],
    [
      "2026-09-28 08:46:00",
      "演示前重点事项摘要",
      "项目推进",
      0,
      null,
      "",
      [
        "把今天需要关注的事项整理成三条，先给我看。",
        "一是发动机工作包书面交付计划与装配需求匹配情况；二是试点联调问题的责任人及闭环时间；三是预算差异的财务核实结果。未收到回执的事项均保留待反馈。",
        "不要替我说已经落实，结尾列出待确认事项。",
        "已调整：每项注明现有依据、待补信息与责任方。该摘要仅供本人审阅，未对外发送，也未作资源或预算承诺。"
      ]
    ]
  ] as const;
  examples.forEach(([at, summary, taskType, roleIndex, feedback, evidence, dialogue], index) => {
    const role = store.roles.find(role => role.id === (roleIndex === 0 ? 'gm-project-director' : 'gm-business-management'));
    if (!role?.published) return;
    const published = role.published;
    store.runs.push({ id: `GM-RUN-${index + 1}`, userId: demoUser, at, summary, taskType, source: '助理对话', status: '已完成', role_contexts: [{ roleId: role.id, name: published.definition.name, version: published.version, resourceIds: published.definition.resourceIds }], feedback, cause: feedback === 'bad' ? '回答缺少具体依据' : '', evidence, attribution: feedback ? '本人反馈' : '', messages: dialogue.map((text, i) => ({ role: i % 2 === 0 ? '用户' : '数字分身', text })), output: `# ${summary}\n\n${dialogue[3]}\n\n## 决策边界\n涉及预算调整、资源承诺及对外发布时，由本人确认。` });
  });
  const growth = [
    [
      "2026-09-02 09:12:00",
      "岗位画像",
      "确认总经理工作画像",
      "明确关注年度目标、重点项目、经营效益与重大风险；重大决策由本人确认。"
    ],
    [
      "2026-09-03 14:26:00",
      "岗位",
      "启用项目总监智能体",
      "启用项目查询、进度查询与项目风险分析能力，先用于周报和里程碑梳理。"
    ],
    [
      "2026-09-07 10:43:00",
      "知识库",
      "补充重点项目计划与验收资料",
      "加入项目计划基线、试点范围和验收清单，分析时区分计划节点与实际完成。"
    ],
    [
      "2026-09-10 16:08:00",
      "岗位画像",
      "补充风险分析输出要求",
      "根据9月8日反馈，明确风险结论须列依据、受影响节点和责任人；资料不足时标待核实。"
    ],
    [
      "2026-09-14 09:34:00",
      "岗位",
      "启用经营管理智能体",
      "启用财务查询、预算执行分析和经营简报能力，预算调整保留本人确认。"
    ],
    [
      "2026-09-16 15:21:00",
      "知识库",
      "补充经营指标统计口径",
      "补充月度经营资料与指标说明，区分同比、环比及百分点，引用数字注明期间。"
    ],
    [
      "2026-09-22 11:17:00",
      "岗位画像",
      "细化预算偏差判断规则",
      "结合预算核对反馈，区分付款时点变化与实际节约，缺少明细时不作节约结论。"
    ],
    [
      "2026-09-25 17:06:00",
      "岗位画像",
      "补充跟进事项呈现偏好",
      "跟进清单固定列责任部门、下次反馈时间和待确认依据；没有回执不标记闭环。"
    ]
  ] ;
  growth.forEach(([at, type, title, detail], index) => store.growth.push({ id: `gm-growth-${index}`, userId: demoUser, at, type, title, detail }));
  const enabledAt: Record<string, string> = { 'gm-project-director': '2026-09-03 14:26:00', 'gm-business-management': '2026-09-14 09:34:00' };
  for (const membership of store.memberships[demoUser] ?? []) {
    if (enabledAt[membership.roleId]) membership.addedAt = enabledAt[membership.roleId];
  }
  for (const role of store.roles) {
    if (!enabledAt[role.id]) continue;
    for (const version of [role.published, ...role.versions]) {
      if (version?.approvalId === `demo-${role.id}`) version.publishedAt = enabledAt[role.id];
    }
  }
  (store as Store & { executiveDemoVersion: number }).executiveDemoVersion = 3;
  return store;
}
