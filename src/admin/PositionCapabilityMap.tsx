import { useState } from 'react';
import { ArrowRight, Check, ChevronDown, ChevronRight, GitBranch, Network, Search } from 'lucide-react';
import { ORGS, type Definition } from '../role-center/domain';
import { Badge } from '../role-center/ui';

import { catalog, POSITIONS, modelsForPosition, localModelsForPosition, type Position } from "./positionModels";
export function PositionTree({ value, onChange }: { value?: Position; onChange?: (p: Position) => void }) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string[]>(value ? ['comac', value.org] : ['comac']);
  const toggle = (id: string) => setExpanded(expanded.includes(id) ? expanded.filter(x => x !== id) : [...expanded, id]);
  return <div className="pc-tree">
    <label className="pc-search"><Search size={15}/><input aria-label="搜索组织或岗位" placeholder="搜索组织或岗位" value={query} onChange={e => setQuery(e.target.value)}/></label>
    <button className="pc-org-root" onClick={() => toggle('comac')} aria-expanded={expanded.includes('comac')}>{expanded.includes('comac') ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}{ORGS.find(o => o.id === "comac")?.name || "组织架构"}</button>
    {(query || expanded.includes('comac')) && Object.entries(catalog).map(([org, names]) => {
      const label = ORGS.find(x => x.id === org)?.name.split(' / ').at(-1) || org;
      const positions = POSITIONS.filter(p => p.org === org && (!query || `${label}${p.name}`.includes(query)));
      if (!positions.length) return null;
      const open = !!query || expanded.includes(org);
      return <div className="pc-branch" key={org}><button className="pc-org" onClick={() => toggle(org)} aria-expanded={open}>{open ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}<span>{label}</span><small>{names?.length || 0}</small></button>
        {open && <div className="pc-leaves">{positions.map(p => <button className={value?.id === p.id ? 'selected' : ''} aria-pressed={value?.id === p.id} key={p.id} onClick={() => onChange?.(p)} disabled={!onChange && value?.id !== p.id}><span className="pc-position-dot"/>{p.name}{value?.id === p.id && <Check size={14}/>}</button>)}</div>}
      </div>;
    })}
    {query && !POSITIONS.some(p => `${ORGS.find(o => o.id === p.org)?.name}${p.name}`.includes(query)) && <p className="pc-empty">没有匹配的岗位</p>}
  </div>;
}

export function PositionCapabilityMap({ definition, onAssociate, initialSource = "ontology", processView = false }: { definition: Definition; onAssociate?: () => void; initialSource?: "ontology" | "local"; processView?: boolean }) {
  const [source, setSource] = useState(initialSource);
  const models = definition.position ? (source === "ontology" ? modelsForPosition : localModelsForPosition)(definition.position) : [];
  const [flowId, setFlowId] = useState('');
  const [nodeId, setNodeId] = useState('n1');
  const model = models.find(m => m.id === flowId) || models[0];
  const node = model?.nodes.find(n => n.id === nodeId) || model?.nodes[1];
  return <section className="rc-section pc-map">
    <header><div><div className="pc-eyebrow">CAPABILITY MAP</div><h2>{processView ? "流程节点与岗位协作" : "能力地图"}</h2><p>从业务流程理解岗位职责与上下游协作</p></div><Badge tone={source === "ontology" ? "blue" : "green"}>{source === "ontology" ? "本体平台 · 关联价值流" : "当前后台 · 组织流程"}</Badge></header>
    {!processView && <div className="rc-actions" style={{ marginBottom: 18 }}><button className={source === "ontology" ? "rc-primary" : ""} aria-pressed={source === "ontology"} onClick={() => { setSource("ontology"); setFlowId(""); setNodeId("n1"); }}>本体平台</button><button className={source === "local" ? "rc-primary" : ""} aria-pressed={source === "local"} onClick={() => { setSource("local"); setFlowId(""); setNodeId("n1"); }}>当前后台</button></div>}
    {!model || !node ? <div className="pc-empty-state"><Network size={36}/><h3>尚未关联岗位流程</h3><p>{source === "local" ? "当前岗位暂无后台定义的组织流程。" : "关联组织岗位后，查看该岗位在业务流程中的位置。"}</p>{onAssociate && <button onClick={onAssociate}>关联组织岗位</button>}{definition.capabilityMap.length > 0 && <details><summary>查看原有能力资料（待关联流程）</summary>{definition.capabilityMap.map(a => <article key={a.id}><strong>{a.name}</strong><p>{a.content}</p></article>)}</details>}</div> : <>
      <div className="pc-model-meta"><span><span className="pc-live-dot"/>{source === "ontology" ? "本体示例模型 · v1.0" : "场景验证小组 · 手动定义"}</span><span>{models.length} 条参与流程</span><span>当前岗位：{definition.position!.name}</span></div>
      <div className="pc-map-layout"><aside className="pc-flows"><h3>参与的业务流程</h3>{models.map(m => <button key={m.id} className={model.id === m.id ? 'active' : ''} onClick={() => {setFlowId(m.id); setNodeId('n1');}}><GitBranch size={17}/><span><strong>{m.name}</strong><small>{m.nodes.filter(n => n.owner === definition.position?.name).length} 个本岗节点 · {m.nodes.length} 个流程节点</small></span><ChevronRight size={14}/></button>)}</aside>
        <div className="pc-flow-workspace"><div className="pc-flow-title"><div><h3>{model.name}</h3><p>{model.description}</p></div><small><span className="pc-position-dot"/> 本岗位节点</small></div>
          <div className="pc-canvas"><div className="pc-node-row">{model.nodes.map((n, i) => <div className="pc-node-slot" key={n.id}><button aria-pressed={node.id === n.id} className={`pc-node ${n.owner === definition.position?.name ? 'owned' : ''} ${node.id === n.id ? 'active' : ''}`} onClick={() => setNodeId(n.id)}><small>{String(i+1).padStart(2,'0')} · {n.owner === definition.position?.name ? '本岗位' : n.owner}</small><strong>{n.name}</strong><span>{n.owner}</span></button>{i < model.nodes.length - 1 && <ArrowRight className="pc-edge" size={19}/>}</div>)}</div><div className="pc-return-edge">↶ {model.nodes[2].name} → {model.nodes[1].name} · 未通过时退回补充</div></div>
          <div className="pc-node-detail"><header><div><span className="pc-eyebrow">节点详情</span><h3>{node.name}</h3></div><Badge tone={node.owner === definition.position?.name ? 'blue' : 'gray'}>{node.owner}</Badge></header><div className="pc-io-grid"><div><small>输入 · 接收什么</small><p>{node.input}</p></div><div><small>输出 · 交付什么</small><p>{node.output}</p></div><div><small>上游节点</small><p>{model.edges.filter(e => e.to === node.id).map(e => `${model.nodes.find(n => n.id === e.from)?.name}（${e.condition}）`).join('、') || '流程起点'}</p></div><div><small>下游节点</small><p>{model.edges.filter(e => e.from === node.id).map(e => `${model.nodes.find(n => n.id === e.to)?.name}（${e.condition}）`).join('、') || '流程终点'}</p></div></div><div className="pc-node-rule"><strong>知识依据</strong><span>{node.knowledge}</span><strong>执行规则</strong><span>{node.rule}</span></div></div>
        </div></div>
    </>}
  </section>;
}
