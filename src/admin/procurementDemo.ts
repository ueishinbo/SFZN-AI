import { baseDefinition, type Store } from '../role-center/domain';
import type { Model, Position } from './positionModels';

export const PROCUREMENT_ORG = 'comac/procurement';
export const PROCUREMENT_GROUP = '试验设备采购专项组';
export const PROCUREMENT_POSITIONS: Position[] = ['采购需求管理员', '采购策略专员', '采购执行专员'].map((name, i) => ({ id: `${PROCUREMENT_ORG}/position-${i}`, org: PROCUREMENT_ORG, name }));
export const PROCUREMENT_PEOPLE = ['陈悦', '李航', '周宁'];
export const PROCUREMENT_PROCESS: Model = {
  id: 'procurement-demo', name: '试验设备采购流程', description: `${PROCUREMENT_GROUP} · 实施方案驱动需求收集、策略制定与采购实施`,
  nodes: [
    { id: 'n0', name: '采购需求收集管理', owner: PROCUREMENT_POSITIONS[0].name, input: '实施方案', output: '采购需求收集表', knowledge: '采购需求填写规范（示例）', rule: '核对设备、数量、交付要求与预算上限；信息不完整时暂停并请求补充。' },
    { id: 'n1', name: '采购策略制定', owner: PROCUREMENT_POSITIONS[1].name, input: '采购需求收集表', output: '采购策略制定表', knowledge: '供应商对比模板（示例）', rule: '按预算、交付与质量要求比较候选方案；策略经负责人确认后交付采购实施。' },
    { id: 'n2', name: '采购实施', owner: PROCUREMENT_POSITIONS[2].name, input: '已确认的采购策略制定表', output: '采购实施清单', knowledge: '采购实施检查清单（示例）', rule: '依据确认的策略准备询价、合同审核、交付验收待办；试运行仅生成模拟记录。' },
  ],
  edges: [{ from: 'n0', to: 'n1', condition: '需求完整' }, { from: 'n1', to: 'n2', condition: '负责人确认策略' }, { from: 'n1', to: 'n0', condition: '预算或需求不足 · 退回补充' }],
};
export function withProcurementDemo(store: Store): Store {
  PROCUREMENT_POSITIONS.forEach((position, i) => {
    const id = `procurement-person-${i}`;
    if (!store.people.some(p => p.id === id)) store.people.push({ id, name: PROCUREMENT_PEOPLE[i], org: PROCUREMENT_ORG, groups: [], role: 'user', active: true });
    const roleId = `procurement-agent-${i}`;
    if (store.roles.some(r => r.id === roleId || r.draft?.definition.position?.id === position.id || r.published?.definition.position?.id === position.id)) return;
    const node = PROCUREMENT_PROCESS.nodes[i];
    const definition = { ...baseDefinition(`${position.name}智能体`), position, resourceIds: [], scope: { orgs: [PROCUREMENT_ORG], groups: [], users: [] },
      responsibilities: `# 岗位目标\n${node.name}，交付${node.output}。\n\n# 核心职责\n接收${node.input}，检查信息完整性并完成本岗位处理。\n\n# 关键交付物\n${node.output}。\n\n# 工作边界与人工确认/升级规则\n${node.rule}`,
      capabilityMap: [], knowledgeMap: [{ id: `purchase-knowledge-${i}`, name: node.knowledge, content: node.rule }], permissionRules: node.rule,
      templates: [{ id: `purchase-template-${i}`, name: node.output, content: '记录任务信息、处理依据、结论与下游待办。' }], tests: [] };
    store.roles.push({ id: roleId, disabled: false, versions: [], updatedAt: '2026-09-11 09:00:00', draft: { version: 'V0.1', status: '草稿', definition, suggestionIds: [] } });
  });
  return store;
}

export type PurchaseInput = { task: string; item: string; quantity: number; budget: string; deadline: string };
export const DEFAULT_PURCHASE: PurchaseInput = { task: '为试验室设备升级采购一批数据采集设备，完成需求汇总、采购策略制定和实施准备。', item: '数据采集设备', quantity: 10, budget: '', deadline: '30 天内到货' };
export type TrialStage = 'ready' | 'running' | 'blocked' | 'approval' | 'complete';
export type TrialState = { stage: TrialStage; step: number; input: PurchaseInput; events: string[]; hadBlock: boolean; correction: string; baseline: string; artifacts: string[] };
export const createTrial = (input: PurchaseInput): TrialState => ({ stage: 'running', step: 0, input: { ...input }, events: ['开始试运行 · 实施方案已交给采购需求管理员'], hadBlock: false, correction: '', baseline: input.budget, artifacts: [] });
export const validBudget = (value: string) => Number.isFinite(Number(value)) && Number(value) > 0;
export function advanceTrial(state: TrialState): TrialState {
  if (state.stage !== 'running') return state;
  const next = { ...state, events: [...state.events], artifacts: [...state.artifacts] };
  if (state.step === 0) {
    if (!validBudget(state.input.budget)) return { ...next, stage: 'blocked', hadBlock: true, events: [...next.events, '需求完整性检查未通过 · 缺少有效预算上限，暂停向下游流转'] };
    next.artifacts[0] = `采购需求收集表\n任务：${state.input.task}\n设备：${state.input.item}\n数量：${state.input.quantity} 台\n预算上限：${state.input.budget} 万元\n交付要求：${state.input.deadline}\n检查结论：必填信息齐全，可提交策略制定。`;
    return { ...next, step: 1, events: [...next.events, '采购需求收集表已生成 · 交给采购策略专员'] };
  }
  if (state.step === 1) {
    const b = Number(state.input.budget);
    next.artifacts[1] = `采购策略制定表（模拟）\n设备：${state.input.item}，${state.input.quantity} 台\n方案 A：模拟总价 ${(b * .9).toFixed(1)} 万元，满足交付要求\n方案 B：模拟总价 ${(b * 1.08).toFixed(1)} 万元，超出预算\n建议：优先询价方案 A；以实际报价及资质核验为准。\n交付约束：${state.input.deadline}\n待确认：负责人同意该策略后，进入采购实施准备。`;
    return { ...next, stage: 'approval', events: [...next.events, '采购策略制定表已生成 · 建议方案 A，等待负责人确认'] };
  }
  next.artifacts[2] = `采购实施清单（模拟）\n采购对象：${state.input.item} × ${state.input.quantity} 台\n预算控制：不超过 ${state.input.budget} 万元\n交付要求：${state.input.deadline}\n1. 准备询价材料与供应商资质核验清单\n2. 提交合同审核与采购审批\n3. 跟踪订单、到货和验收\n4. 汇总交付证据并归档\n试运行完成：未创建真实订单、未向供应商发送信息。`;
  return { ...next, stage: 'complete', events: [...next.events, '采购实施清单已生成 · 三个岗位完成交接，试运行结束'] };
}
export function resumeTrial(state: TrialState, budget: string): TrialState {
  if (state.stage !== 'blocked' || !validBudget(budget)) return state;
  return { ...state, stage: 'running', input: { ...state.input, budget: budget.trim() }, correction: `预算上限补充为 ${budget.trim()} 万元`, events: [...state.events, `调试补充：预算上限 ${budget.trim()} 万元 · 从需求节点重新执行`] };
}
export function approveTrial(state: TrialState): TrialState {
  return state.stage === 'approval' ? { ...state, stage: 'running', step: 2, events: [...state.events, '负责人已模拟确认采购策略 · 交给采购执行专员'] } : state;
}
