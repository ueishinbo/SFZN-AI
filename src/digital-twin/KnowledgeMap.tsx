import { BookOpen, ChevronRight, FileText, Filter, GitFork, Lightbulb, Network, ShieldCheck, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import './knowledge-map.css'

type KnowledgeKind = '制度' | '案例' | '模板' | '个人经验' | '业务数据' | '岗位核心'
type KnowledgeNode = { id: string; label: string; kind: KnowledgeKind; detail: string; access: string; usage: string; x: number; y: number }

const nodes: KnowledgeNode[] = [
  { id: 'role', label: '解决方案经理\n岗位知识', kind: '岗位核心', detail: '将岗位职责、过程能力、工作方法与可用知识组织为可调用的工作上下文。', access: '岗位集继承', usage: '支撑方案设计、评审与交付协同', x: 430, y: 225 },
  { id: 'rules', label: '方案评审规范', kind: '制度', detail: '定义评审材料、参与角色、结论记录与闭环要求。', access: '全员可读', usage: '方案评审', x: 184, y: 94 },
  { id: 'security', label: '数据安全\n管理规定', kind: '制度', detail: '规定敏感数据的分级、脱敏、访问与对外发送要求。', access: '全员可读', usage: '资料引用、对外输出', x: 176, y: 337 },
  { id: 'case', label: '航空制造知识库\n建设方案', kind: '案例', detail: '沉淀知识库建设项目的背景、约束、关键决策与复盘经验。', access: '岗位集可读', usage: '方案设计、风险识别', x: 661, y: 84 },
  { id: 'template', label: '解决方案\n评审检查单 v5', kind: '模板', detail: '将完整性、数据依据、可交付性和风险检查固化为统一清单。', access: '岗位集可读', usage: '方案评审', x: 696, y: 340 },
  { id: 'experience', label: '个人项目经验', kind: '个人经验', detail: '经本人确认的项目材料、历史判断与复盘结论。', access: '仅本人', usage: '需求澄清、风险判断', x: 426, y: 401 },
  { id: 'data', label: '经营数据\n分析库', kind: '业务数据', detail: '提供项目交付、经营指标与趋势数据；调用前需获得业务授权。', access: '待授权', usage: '经营指标分析', x: 702, y: 213 },
]

const edges = [
  ['role', 'rules', '遵循'], ['role', 'security', '约束'], ['role', 'case', '复用'], ['role', 'template', '引用'], ['role', 'experience', '补充'], ['role', 'data', '查询'], ['case', 'template', '沉淀'],
] as const

const kinds: Array<'全部' | KnowledgeKind> = ['全部', '制度', '案例', '模板', '个人经验', '业务数据']
const icons: Record<KnowledgeKind, typeof BookOpen> = { 制度: ShieldCheck, 案例: Lightbulb, 模板: FileText, 个人经验: UserRound, 业务数据: Network, 岗位核心: GitFork }

export default function KnowledgeMap() {
  const [view, setView] = useState<'graph' | 'list'>('graph')
  const [filter, setFilter] = useState<'全部' | KnowledgeKind>('全部')
  const [selectedId, setSelectedId] = useState('role')
  const selected = nodes.find((node) => node.id === selectedId) ?? nodes[0]
  const visibleNodes = useMemo(() => nodes.filter((node) => node.kind === '岗位核心' || filter === '全部' || node.kind === filter), [filter])
  const visibleIds = new Set(visibleNodes.map((node) => node.id))
  const visibleEdges = edges.filter(([from, to]) => visibleIds.has(from) && visibleIds.has(to))

  return <section className="knowledge-map">
    <header className="knowledge-map-header">
      <div><span>KNOWLEDGE MAP</span><h2>岗位知识图谱</h2><p>从文本资料到关系网络，查看知识如何支撑具体工作。</p></div>
      <div className="knowledge-view-switch" role="tablist" aria-label="知识展示方式"><button className={view === 'graph' ? 'active' : ''} type="button" onClick={() => setView('graph')}><Network size={15} />关系图谱</button><button className={view === 'list' ? 'active' : ''} type="button" onClick={() => setView('list')}><BookOpen size={15} />文本清单</button></div>
    </header>
    <div className="knowledge-map-toolbar"><span><Filter size={14} />知识分类</span><div>{kinds.map((kind) => <button className={filter === kind ? 'active' : ''} type="button" key={kind} onClick={() => setFilter(kind)}>{kind}</button>)}</div><small>共 {visibleNodes.length - 1} 项关联知识</small></div>
    {view === 'graph' ? <div className="knowledge-graph-layout"><div className="knowledge-graph-canvas"><svg viewBox="0 0 860 460" role="img" aria-label="岗位知识关系图谱">
      <defs><linearGradient id="knowledgeGlow" x1="0" x2="1"><stop stopColor="#8bc2ed" /><stop offset="1" stopColor="#d7e9f7" /></linearGradient></defs>
      {visibleEdges.map(([from, to, relation]) => { const a = nodes.find((node) => node.id === from)!; const b = nodes.find((node) => node.id === to)!; return <g className="knowledge-edge" key={`${from}-${to}`}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} /><text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 7}>{relation}</text></g> })}
      {visibleNodes.map((node) => { const Icon = icons[node.kind]; const lines = node.label.split('\n'); const active = node.id === selectedId; return <g className={`knowledge-node kind-${node.kind} ${active ? 'active' : ''}`} key={node.id} onClick={() => setSelectedId(node.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(node.id) } }} role="button" tabIndex={0}><circle cx={node.x} cy={node.y} r={node.kind === '岗位核心' ? 46 : 34} /><foreignObject x={node.x - 10} y={node.y - 10} width="20" height="20"><div className="knowledge-node-icon"><Icon size={18} /></div></foreignObject><text x={node.x} y={node.y + (node.kind === '岗位核心' ? 65 : 52)}>{lines.map((line, index) => <tspan key={line} x={node.x} dy={index === 0 ? 0 : 13}>{line}</tspan>)}</text></g> })}
    </svg><p className="knowledge-graph-tip">点击节点查看来源、权限与可用场景</p></div><KnowledgeDetail node={selected} /></div> : <div className="knowledge-list">{visibleNodes.filter((node) => node.kind !== '岗位核心').map((node) => <button className={node.id === selectedId ? 'active' : ''} type="button" key={node.id} onClick={() => setSelectedId(node.id)}><i className={`kind-${node.kind}`}>{(() => { const Icon = icons[node.kind]; return <Icon size={18} /> })()}</i><div><span>{node.kind}</span><strong>{node.label.replace('\n', '')}</strong><p>{node.detail}</p></div><em>{node.access}</em><ChevronRight size={15} /></button>)}</div>}
  </section>
}

function KnowledgeDetail({ node }: { node: KnowledgeNode }) {
  const Icon = icons[node.kind]
  return <aside className="knowledge-detail"><header><i className={`kind-${node.kind}`}><Icon size={19} /></i><div><span>{node.kind}</span><h3>{node.label.replace('\n', '')}</h3></div></header><p>{node.detail}</p><dl><div><dt>访问范围</dt><dd>{node.access}</dd></div><div><dt>可用场景</dt><dd>{node.usage}</dd></div></dl><button type="button">查看知识详情 <ChevronRight size={14} /></button></aside>
}
