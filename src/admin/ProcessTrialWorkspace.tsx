import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Play, Plus, Search, RotateCcw, ShoppingCart, SlidersHorizontal } from 'lucide-react';
import { Badge, Dialog } from '../role-center/ui';
import { currentDefinition } from '../role-center/domain';
import { useRoleStore } from '../role-center/store';
import type { Position } from './positionModels';
import { advanceTrial, approveTrial, createTrial, DEFAULT_PURCHASE, PROCUREMENT_GROUP, PROCUREMENT_POSITIONS, PROCUREMENT_PROCESS, resumeTrial, validBudget, type PurchaseInput, type TrialState } from './procurementDemo';
import './process-trial.css';

const otherFlows = [
  ['场景验证流程', '场景验证小组', '验证需求到结果闭环', '4 个节点'],
  ['质量问题整改流程', '质量提升行动组', '问题识别、分析与整改', '待配置'],
  ['交付验收协同流程', '交付保障专项组', '交付准备与验收协同', '待配置'],
];
const selectableFlows = [
  { id: 'procurement', name: PROCUREMENT_PROCESS.name, org: PROCUREMENT_GROUP, description: '实施方案 → 需求收集 → 策略制定 → 采购实施', count: '3 个节点 · 3 个岗位', ready: true },
  ...otherFlows.map(([name, org, description, count], i) => ({ id: `flow-${i}`, name, org, description, count, ready: false })),
];
let retained: { opened: boolean; input: PurchaseInput; trial: TrialState | null } | undefined;
export default function ProcessTrialWorkspace({ onConfigure }: { onConfigure: (position: Position) => void }) {
  const store = useRoleStore();
  const [opened, setOpened] = useState(retained?.opened || false);
  const [input, setInput] = useState<PurchaseInput>(retained?.input || { ...DEFAULT_PURCHASE });
  const [trial, setTrial] = useState<TrialState | null>(retained?.trial || null);
  const [selected, setSelected] = useState(0);
  const [budget, setBudget] = useState('');
  const [document, setDocument] = useState<number | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [flowChoice, setFlowChoice] = useState('');
  const [flowQuery, setFlowQuery] = useState('');
  const [orgFilter, setOrgFilter] = useState('');
  const chosenFlow = selectableFlows.find(flow => flow.id === flowChoice);
  const filteredFlows = selectableFlows.filter(flow => (!orgFilter || flow.org === orgFilter) && `${flow.name}${flow.org}`.includes(flowQuery.trim()));
  const chooseFlow = (id = '') => { setFlowChoice(id); setFlowQuery(''); setOrgFilter(''); setSelectorOpen(true); };
  const confirmFlow = () => {
    if (!chosenFlow?.ready) return;
    setTrial(null); setInput({ ...DEFAULT_PURCHASE }); setSelected(0); setBudget('');
    setOpened(true); setSelectorOpen(false);
  };
  useEffect(() => { retained = { opened, input, trial }; }, [opened, input, trial]);
  useEffect(() => {
    if (trial?.stage !== 'running') return;
    const timer = window.setTimeout(() => setTrial(previous => previous ? advanceTrial(previous) : previous), 1400);
    return () => window.clearTimeout(timer);
  }, [trial]);
  useEffect(() => { if (trial) setSelected(trial.step); }, [trial]);
  const stage = trial?.stage || 'ready';
  const busy = stage !== 'ready' && stage !== 'complete';
  const labels = { ready: '待开始', running: '执行中', blocked: '待补充', approval: '待人工确认', complete: '已完成' };
  const tone = stage === 'complete' ? 'green' : stage === 'blocked' || stage === 'approval' ? 'orange' : 'blue';
  const node = PROCUREMENT_PROCESS.nodes[selected];
  const missingAgent = PROCUREMENT_POSITIONS.some(p => !store.roles.some(r => !r.disabled && currentDefinition(r).position?.id === p.id));
  const start = () => { setTrial(createTrial(input)); setSelected(0); setBudget(''); };
  const reset = () => { setTrial(null); setSelected(0); setBudget(''); setResetOpen(false); };
  const nodeStatus = (index: number) => trial?.artifacts[index] ? (index === 1 && stage === 'approval' ? '待人工确认' : '已完成') : trial?.step === index ? labels[stage] : '待执行';
  return <div className="rc rc-shell pt-shell">
    {!opened ? <>
      <div className="rc-heading"><div><h1>流程试运行</h1><p>用具体任务验证岗位协作，发现阻塞并调试执行路径。</p></div><button className="rc-primary" disabled={!!trial && stage !== 'complete'} onClick={() => chooseFlow()}><Plus size={16}/>新建试运行</button></div>
      <section className="pt-feature rc-section"><div className="pt-feature-icon"><ShoppingCart size={26}/></div><div><span className="pt-eyebrow">采购协作</span><h2>{PROCUREMENT_PROCESS.name}</h2><p>从实施方案到采购实施，验证三个岗位的材料交接与人工确认。</p><div className="rc-actions"><Badge>{PROCUREMENT_GROUP}</Badge><Badge>3 个岗位智能体</Badge><Badge tone="green">可试运行</Badge></div></div><button className="rc-primary" onClick={() => trial ? setOpened(true) : chooseFlow('procurement')}><Play size={16}/>{trial ? '继续查看本次运行' : '选择此流程'}</button></section>
      <section className="rc-section"><header><h2>其他组织流程</h2><small>3 个待配置流程</small></header><div className="pt-other">{otherFlows.map(([name, org, description, count]) => <article key={name}><div><strong>{name}</strong><p>{org} · {description}</p></div><Badge>{count}</Badge><button disabled>待配置</button></article>)}</div></section>
    </> : <>
      <button className="pt-back" onClick={() => setOpened(false)}><ArrowLeft size={15}/>全部流程</button>
      <div className="rc-heading"><div><h1>{PROCUREMENT_PROCESS.name}</h1><p>{PROCUREMENT_GROUP} · 流程试运行</p></div><div className="rc-actions"><Badge tone={tone}>{labels[stage]}</Badge><button onClick={() => setResetOpen(true)} disabled={!trial}><RotateCcw size={15}/>重新开始</button></div></div>
      <div className="pt-context-bar"><div><small>已选流程</small><strong>{PROCUREMENT_PROCESS.name}</strong><span>{PROCUREMENT_GROUP} · 3 个节点 · 3 个岗位</span></div><button disabled={!!trial} onClick={() => chooseFlow('procurement')}>重新选择流程</button></div>
      <div className="pt-workbench">
        <section className="rc-section pt-input"><header><div><span className="pt-eyebrow">01 / 启动输入</span><h2>实施方案</h2></div><FileText size={19}/></header>
          <button disabled={!!trial} onClick={() => setInput({ ...DEFAULT_PURCHASE })}>使用示例任务</button>
          <label>本次任务<textarea rows={3} disabled={!!trial} value={input.task} onChange={e => setInput({ ...input, task: e.target.value })}/></label>
          <label>采购对象<input disabled={!!trial} value={input.item} onChange={e => setInput({ ...input, item: e.target.value })}/></label>
          <div className="pt-fields"><label>数量（台）<input type="number" min="1" max="10000" disabled={!!trial} value={input.quantity} onChange={e => setInput({ ...input, quantity: Number(e.target.value) })}/></label><label>预算上限（万元）<input type="number" min="0.1" step="0.1" placeholder="请输入预算上限" disabled={!!trial} value={input.budget} onChange={e => setInput({ ...input, budget: e.target.value })}/></label></div>
          <label>交付要求<input disabled={!!trial} value={input.deadline} onChange={e => setInput({ ...input, deadline: e.target.value })}/></label>
          {!trial && <p className="pt-hint">启动前将检查材料完整性，缺失信息可在运行中补充。</p>}
          {trial?.correction && <p className="pt-corrected">本次补充：{trial.correction}</p>}
          <button className="rc-primary pt-start" disabled={!!trial || missingAgent || !input.task.trim() || !input.item.trim() || !Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 10000 || !input.deadline.trim() || (!!input.budget && !validBudget(input.budget))} onClick={start}><Play size={16}/>开始试运行</button>
          {missingAgent && <p>有岗位缺少可用智能体，请先配置。</p>}
          <div className="pt-agents"><h3>参与岗位</h3>{PROCUREMENT_POSITIONS.map((position, i) => <button key={position.id} onClick={() => onConfigure(position)}><span><strong>{position.name}</strong><small>{PROCUREMENT_PROCESS.nodes[i].output}</small></span><ArrowRight size={14}/></button>)}</div>
        </section>
        <div className="pt-main">
          <section className="rc-section"><header><div><span className="pt-eyebrow">02 / 岗位协作</span><h2>执行路径</h2></div><small>点击节点查看输入、产出和依据</small></header>
            <div className="pt-nodes">{PROCUREMENT_PROCESS.nodes.map((n, i) => <button key={n.id} aria-pressed={selected === i} className={`pt-node ${selected === i ? 'selected' : ''} ${trial?.artifacts[i] ? 'done' : ''}`} onClick={() => setSelected(i)}><span>0{i + 1}<Badge tone={nodeStatus(i) === '已完成' ? 'green' : trial?.step === i ? tone : 'gray'}>{nodeStatus(i)}</Badge></span><strong>{n.name}</strong><small>{n.owner}</small><div className="pt-node-output"><FileText size={13}/>{n.output}</div></button>)}</div>
            <div className="pt-handoff">实施方案 <ArrowRight size={13}/> 采购需求收集表 <ArrowRight size={13}/> 采购策略制定表 <ArrowRight size={13}/> 采购实施清单</div>
          </section>
          {stage === 'blocked' && <section className="pt-debug"><div><SlidersHorizontal size={20}/><div><h3>发现阻塞：缺少预算上限</h3><p>采购需求管理员已识别材料缺失，未把不完整需求交给策略岗位。</p></div></div><label>补充本次预算（万元）<input type="number" min="0.1" step="0.1" placeholder="例如 30" value={budget} onChange={e => setBudget(e.target.value)}/></label><button className="rc-primary" disabled={!validBudget(budget)} onClick={() => setTrial(previous => previous ? resumeTrial(previous, budget) : previous)}>补充并从当前节点重跑</button><small>仅补充本次任务材料，正式流程规则保持原配置。</small></section>}
          {stage === 'approval' && <section className="pt-debug pt-approval"><h3>采购策略已生成，等待负责人确认</h3><p>候选方案 A 在本次预算内，候选方案 B 超出预算。确认后，采购执行专员将准备实施清单。</p><div className="rc-actions"><button onClick={() => setDocument(1)}>查看采购策略制定表</button><button className="rc-primary" onClick={() => setTrial(previous => previous ? approveTrial(previous) : previous)}>模拟负责人确认，继续执行</button></div></section>}
          <section className="rc-section pt-detail"><header><h2>{node.name}</h2><button onClick={() => onConfigure(PROCUREMENT_POSITIONS[selected])}>查看岗位配置</button></header><div className="pt-detail-grid"><div><small>输入材料</small><p>{selected === 0 ? '本次实施方案' : node.input}</p></div><div><small>交付产物</small><p>{node.output}</p></div></div><div className="pt-rule"><strong>执行依据</strong><p>{node.rule}</p></div>{trial?.artifacts[selected] ? <><pre>{trial.artifacts[selected]}</pre><button onClick={() => setDocument(selected)}>查看完整产物</button></> : <p className="pt-hint">{stage === 'blocked' && selected === 0 ? '当前材料缺少预算，暂未生成有效需求收集表。' : '节点完成后，这里显示岗位产物。'}</p>}</section>
          {stage === 'complete' && <section className="rc-section pt-result"><header><div><span className="pt-eyebrow">03 / 评测结果</span><h2><CheckCircle2 size={20}/>本次试运行完成</h2></div><Badge tone="green">3 / 3 节点完成</Badge></header><div className="pt-detail-grid"><div><small>首次运行</small><p>{trial?.hadBlock ? '预算缺失 → 需求节点阻塞，下游未执行' : '预算已提供 → 需求检查通过'}</p></div><div><small>{trial?.hadBlock ? '调试后' : '执行结果'}</small><p>{trial?.hadBlock ? `${trial.correction} → 三个节点完成` : '材料完整，负责人确认后完成实施准备'}</p></div></div><ul><li>材料检查：{trial?.hadBlock ? '正确识别缺失并暂停' : '必填信息检查通过'}</li><li>岗位交接：需求表与策略表按序传递</li><li>确认规则：策略经模拟负责人确认后进入实施</li></ul><p className="pt-hint">评测范围为本次预设场景的路径与规则检查，不代表真实采购绩效或最优方案。</p></section>}
          <section className="rc-section pt-log"><header><h2>运行记录</h2><small>{busy ? '随运行更新' : '本次任务'}</small></header>{trial ? trial.events.map((event, i) => <div key={i}><span>{String(i + 1).padStart(2, '0')}</span><p>{event}</p></div>) : <p className="pt-hint">开始后记录材料交接、阻塞、调试与人工确认。</p>}</section>
        </div>
      </div>
    </>}
    {selectorOpen && <Dialog title="新建试运行 · 选择流程" wide onClose={() => setSelectorOpen(false)} footer={<><button onClick={() => setSelectorOpen(false)}>取消</button><button className="rc-primary" disabled={!chosenFlow?.ready || missingAgent} onClick={confirmFlow}>下一步：配置输入<ArrowRight size={15}/></button></>}>
      <p className="pt-hint">选择所属组织和业务流程，确认参与岗位后配置本次任务。</p>
      <div className="pt-flow-filters"><label>所属组织<select value={orgFilter} onChange={e => { setOrgFilter(e.target.value); setFlowChoice(''); }}><option value="">全部组织</option>{selectableFlows.map(flow => <option key={flow.id} value={flow.org}>{flow.org}</option>)}</select></label><label>查找流程<div className="pt-flow-search"><Search size={16}/><input placeholder="搜索流程名称或组织" value={flowQuery} onChange={e => { setFlowQuery(e.target.value); setFlowChoice(''); }}/></div></label></div>
      <div className="pt-flow-options" role="radiogroup" aria-label="选择业务流程">{filteredFlows.map(flow => <label key={flow.id} className={`pt-flow-option ${flowChoice === flow.id ? 'selected' : ''}`}><input type="radio" name="trial-flow" value={flow.id} checked={flowChoice === flow.id} onChange={() => setFlowChoice(flow.id)}/><div><strong>{flow.name}</strong><p>{flow.org} · {flow.count}</p><small>{flow.description}</small></div><Badge tone={flow.ready && !missingAgent ? 'green' : 'gray'}>{flow.ready && !missingAgent ? '可试运行' : '待配置'}</Badge></label>)}</div>
      {!filteredFlows.length && <p className="pt-hint">没有匹配的流程，请调整组织或搜索条件。</p>}
      {chosenFlow && <div className="pt-flow-summary"><strong>已选择：{chosenFlow.name}</strong><p>{chosenFlow.ready ? `参与岗位：${PROCUREMENT_POSITIONS.map(p => p.name).join('、')}` : '此流程尚未完成试运行配置，暂不可启动。'}</p>{chosenFlow.ready && missingAgent && <p>请先为采购岗位配置可用智能体。</p>}</div>}
      {trial && <p className="pt-hint">进入新的试运行将清除当前运行记录。</p>}
    </Dialog>}
    {document !== null && <Dialog title={PROCUREMENT_PROCESS.nodes[document].output} wide onClose={() => setDocument(null)}><pre className="pt-document">{trial?.artifacts[document]}</pre></Dialog>}
    {resetOpen && <Dialog title="重新开始试运行" onClose={() => setResetOpen(false)} footer={<><button onClick={() => setResetOpen(false)}>取消</button><button className="rc-primary" onClick={reset}>重新开始</button></>}><p>清除本次运行记录和调试补充，返回启动输入。岗位与流程配置保留。</p></Dialog>}
  </div>;
}
