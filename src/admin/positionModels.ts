import type { Definition } from "../role-center/domain";
export type Position = NonNullable<Definition['position']>;
export const catalog: Record<string, string[]> = {
  'comac/product': ['产品经理', '交互设计师', '数据产品经理'],
  'comac/marketing': ['解决方案经理', '市场策划经理'],
  'comac/delivery': ['项目经理', '交付经理'],
  'comac/finance': ['财务专员', '费用审核专员'],
};
export const POSITIONS: Position[] = Object.entries(catalog).flatMap(([org, names]) => names.map((name, index) => ({ id: `${org}/position-${index}`, org, name })));

type ModelNode = { id: string; name: string; owner: string; input: string; output: string; knowledge: string; rule: string };
type Model = { id: string; name: string; description: string; nodes: ModelNode[]; edges: { from: string; to: string; condition: string }[] };
// Demo ontology snapshots: stable position references, explicit nodes and directed edges.
export function modelsForPosition(position: Position): Model[] {
  const valid = POSITIONS.find(p => p.id === position.id);
  if (!valid) return [];
  const finance = position.org === 'comac/finance';
  const product = position.org === 'comac/product';
  const titles = finance ? ['费用报销与审核', '预算调整与执行'] : product ? ['产品需求到交付', '产品变更与影响评估'] : position.org === 'comac/marketing' ? ['客户需求到方案评审', '方案变更与商务协同'] : ['项目计划到交付', '项目变更与风险治理'];
  return titles.map((name, index) => {
    const activities = finance ? (index ? ['提交预算调整', '分析预算影响', '审批调整方案', '更新执行计划'] : ['提交报销材料', '核对费用依据', '审批费用申请', '确认支付记录']) : (index ? ['提出变更申请', '评估变更影响', '确认变更决策', '更新交付基线'] : ['提交业务需求', '分析需求与约束', '组织方案评审', '编制执行方案', '执行与验收']);
    const owners = finance ? ['申请人', position.name, '财务负责人', position.name] : ['业务负责人', position.name, '评审负责人', position.name, '交付团队'];
    const outputs = finance ? ['申请单与原始凭证', '审核意见与差异清单', '审批结论', '执行记录'] : ['业务目标与需求清单', '分析结论与约束清单', '评审决议与待办', '执行方案与验收标准', '交付结果与验收记录'];
    const nodes = activities.map((activity, i) => ({ id: `n${i}`, name: activity, owner: owners[i], input: i ? outputs[i - 1] : '业务诉求与支撑材料', output: outputs[i], knowledge: finance ? '财务管理制度 · 预算与费用标准' : '业务流程规范 · 评审管理办法', rule: i === 2 ? '由授权负责人确认；未通过时退回补充。' : '材料不完整时向上游澄清，涉及范围或资源承诺需负责人确认。' }));
    return { id: `${position.id}/flow-${index}`, name, description: index ? '处理变更、识别影响并更新执行依据' : '从业务输入到交付结果的完整协作流程', nodes, edges: [...nodes.slice(1).map((n, i) => ({ from: nodes[i].id, to: n.id, condition: i === 2 ? '评审通过' : '完成并提交' })), { from: 'n2', to: 'n1', condition: '未通过 · 退回补充' }] };
  });
}

