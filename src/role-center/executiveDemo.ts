import { baseDefinition, CURRENT_USER, type Resource, type Store } from './domain';

/** One-time, scoped upgrade of the personal demo; preserves unrelated admin data. */
export function withExecutiveDemo(store: Store): Store {
  const marked = store as Store & { executiveDemoVersion?: number };
  if (marked.executiveDemoVersion === 2) return store;
  if (marked.executiveDemoVersion === 1) return withExecutiveHistory(store);
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

function withExecutiveHistory(store: Store): Store {
  const examples = [
    ['重点项目里程碑进展汇总', '项目推进', '请汇总重点项目里程碑进展，列出需要我协调的事项。', '建议优先核对生产链式智能试点的场景清单、数据映射和联调安排。陈帅统筹验收要求，刘娟补齐工位样例，王磊准备联调环境；待确认联调窗口及跨部门资源。'],
    ['生产链式智能建设风险分析', '风险分析', '生产链式智能建设目前应关注哪些风险？', '重点关注数据口径不一致、异常反馈责任不清和联调资源冲突。建议锁定任务编号、明确每个节点的责任人，并用缺件场景验证闭环。'],
    ['供应链延期协调建议', '项目协调', '供应商延期对交付有什么影响，怎么协调？', '根据示例交付安排，首批12件用于保障A工位，余下18件需继续跟踪。建议同步核对分批运输、检验窗口与工位调整，形成责任分工后再确认执行。'],
    ['月度经营简报整理', '经营分析', '帮我整理一份月度经营简报提纲。', '建议按年度目标达成、收入与成本、预算执行、现金回款、重点风险五部分组织。每项同时列示目标差距、原因及下一步措施，缺少依据的指标保留待核实。'],
    ['预算执行偏差核对', '预算分析', '预算执行分析需要关注哪些异常？', '重点对比预算与实际支出，区分时间性差异、范围变化与成本超支。建议补齐明细和责任部门说明；预算调整方案须由本人确认。'],
    ['重点回款事项跟踪', '财务查询', '帮我梳理重点回款跟踪清单。', '可按客户、合同节点、应收金额、计划回款日期、阻塞原因和责任人汇总。优先核对逾期事项与验收资料缺口，具体金额以财务确认口径为准。'],
  ];
  store.runs = store.runs.filter(run => run.userId !== CURRENT_USER);
  examples.forEach(([summary, taskType, question, answer], index) => {
    const role = store.roles.find(role => role.id === (index < 3 ? 'gm-project-director' : 'gm-business-management'))!;
    const published = role.published!;
    store.runs.push({ id: `GM-RUN-${index + 1}`, userId: CURRENT_USER, at: `2026-09-15 ${String(14 - index).padStart(2, '0')}:20:00`, summary, taskType, source: '助理对话', status: '已完成', role_contexts: [{ roleId: role.id, name: published.definition.name, version: published.version, resourceIds: published.definition.resourceIds }], feedback: index === 5 ? null : 'good', cause: '', evidence: '内容明确了关注重点、责任分工和需要本人确认的事项。', attribution: '本人反馈', messages: [{ role: '用户', text: question }, { role: '数字分身', text: answer }], output: `# ${summary}\n\n${answer}\n\n## 决策边界\n涉及预算调整、资源承诺及对外发布时，由本人确认。` });
  });
  store.growth = store.growth.filter(event => event.userId !== CURRENT_USER);
  [
    ['岗位画像', '确认总经理工作画像', '关注年度目标、重点项目、经营效益与重大风险。'],
    ['岗位', '启用项目总监智能体', '配置项目查询、进度查询及项目风险分析能力。'],
    ['岗位', '启用经营管理智能体', '配置财务查询、预算执行分析及经营简报能力。'],
    ['知识库', '补充公司经营与项目资料', '加入年度经营目标、重点项目资料、经营分析报告及公司管理制度。'],
  ].forEach(([type, title, detail], index) => store.growth.push({ id: `gm-growth-${index}`, userId: CURRENT_USER, at: `2026-09-15 ${String(9 + index).padStart(2, '0')}:00:00`, type, title, detail }));
  (store as Store & { executiveDemoVersion: number }).executiveDemoVersion = 2;
  return store;
}
