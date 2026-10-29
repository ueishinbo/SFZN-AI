import { issueOf, issueOptions, type CollaborationIssue } from './a2aIssues'
import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, FileText, FolderOpen, MessageSquare, Plus, ArrowUpRight, Link2 } from 'lucide-react'
import { Dialog } from '../role-center/ui'
import CreateA2AGroupDialog, { type A2AGroupInput } from './CreateA2AGroupDialog'
import { a2aBoardState } from './a2aLifecycle'
import { type A2AConversation, type A2AConversationMessage } from './a2aConversationTypes'
import './a2a-issues.css'
export type A2AFocus = { conversationId: string; fileId?: string; messageId?: string; draft?: string; serial: number }
type Props = { a2aConversations: A2AConversation[]; records: Record<string, A2AConversationMessage[]>; onOpenA2AConversation: (id: string, target?: {fileId?: string; messageId?: string}) => void; onCreateGroup: (input: A2AGroupInput) => void; onRenameIssue: (id: string, title: string) => void; onMoveConversation: (id: string, target: string) => void }
const labels = { all: '全部', confirm: '待我处理', doing: '进行中', done: '已完成' }
type Filter = keyof typeof labels
type Source = NonNullable<A2AConversation['sourceTask']>
export default function A2AIssueBoard({ a2aConversations: conversations, records, onOpenA2AConversation: open, onCreateGroup, onRenameIssue, onMoveConversation }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [collapsed, setCollapsed] = useState<string[]>([])
  const [selectedKey, select] = useState<string | null>(null)
  const [creating, setCreating] = useState<{source?: Source; issue?: CollaborationIssue} | null>(null)
  const [feedback, setFeedback] = useState('')
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [moving, setMoving] = useState<string | null>(null)
  const [destination, setDestination] = useState('')
  const groups = useMemo(() => {
    const result = new Map<string, { key: string; issue: CollaborationIssue; source?: Source; items: A2AConversation[] }>()
    for (const c of conversations) {
      const key = issueOf(c).id
      const group = result.get(key)
      if (group) {
        group.items.push(c)
        if (c.sourceTask && group.source && c.sourceTask.referencedAt < group.source.referencedAt) group.source = c.sourceTask
      } else result.set(key, { key, issue: issueOf(c), source: c.sourceTask, items: [c] })
    }
    const priority = (items: A2AConversation[]) => Math.min(...items.map(c => ({confirm:0, doing:1, done:2})[a2aBoardState(c)]))
    return [...result.values()].sort((a,b) => priority(a.items) - priority(b.items))
  }, [conversations])
  const selected = groups.find(g => g.key === selectedKey)
  const visible = groups.map(g => ({ ...g, shown: g.items.filter(c => filter === 'all' || a2aBoardState(c) === filter) })).filter(g => g.shown.length)
  const navigate = (id: string, target?: {fileId?: string; messageId?: string}) => { select(null); open(id, target) }
  const row = (c: A2AConversation) => <button type="button" className="issue-conversation" key={c.id} onClick={() => navigate(c.id)}>
    <span className="issue-conversation-icon"><MessageSquare size={18}/></span>
    <span className="issue-conversation-body"><span className="issue-row-title"><strong>{c.title}</strong><span className={`issue-status ${a2aBoardState(c)}`}>{labels[a2aBoardState(c)]}</span></span>
    <span className="issue-description">{c.pendingCurrentUserConfirmation?.question ?? c.preview}</span>
    <span className="issue-meta">{c.members.map(m => m.name).join('、')}<span>发起人：{c.hostName}</span><time>{c.updatedAt}</time></span></span><ChevronRight size={16}/>
  </button>
  const entries = selected?.items.flatMap(c => (records[c.id] ?? []).map((m, index, arr) => ({c, m, index, latest: index === arr.length - 1}))) ?? []
  const files = entries.flatMap(({c,m}) => (m.attachments ?? []).map(file => ({c,m,file})))
  const activity = entries.filter(e => e.m.attachments?.length || e.latest || e.index === 0).sort((a,b) => {
    const key = (e: typeof a) => `${e.m.createdAt.includes('-') ? e.m.createdAt : e.c.createdAt.slice(0, 10) + ' ' + e.m.createdAt}`
    return key(b).localeCompare(key(a), 'zh') || b.index - a.index
  })
  return <section className="issue-board">
    <header className="issue-heading"><div><span className="issue-eyebrow">COLLABORATION</span><h1>数字分身协同</h1><p>围绕同一件事，查看相关沟通与当前进展。</p></div><button className="issue-new" onClick={() => setCreating({})}><Plus size={19}/>新建会话</button></header>
    <nav className="issue-filters" aria-label="会话状态筛选">{(Object.keys(labels) as Filter[]).map(f => <button key={f} aria-pressed={filter === f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>{labels[f]}<span>{conversations.filter(c => f === 'all' || a2aBoardState(c) === f).length}</span></button>)}</nav>
    <div className="issue-list">{visible.map(g => <article className="issue-group" key={g.key}>
      <header><button className="issue-toggle" aria-label={`${collapsed.includes(g.key) ? '展开' : '收起'}${g.issue.title}`} aria-expanded={!collapsed.includes(g.key)} onClick={() => setCollapsed(current => current.includes(g.key) ? current.filter(k => k !== g.key) : [...current, g.key])}>{collapsed.includes(g.key) ? <ChevronRight size={18}/> : <ChevronDown size={18}/>}</button><FolderOpen size={21} className="issue-folder"/>
      <button className="issue-title" onClick={() => { select(g.key); setFeedback(''); setEditing(false) }}><strong>{g.issue.title}</strong><span>{g.items.length} 个相关会话{g.items.some(c => a2aBoardState(c) === 'confirm') && ` · ${g.items.filter(c => a2aBoardState(c) === 'confirm').length} 个待我处理`}{g.items.every(c => c.status === 'completed') && ' · 相关沟通均已结束'}</span></button>
      {g.source && <span className="issue-source"><Link2 size={12}/>来源：{g.source.platform}</span>}<button className="issue-overview-link" onClick={() => {select(g.key); setFeedback(''); setEditing(false)}}>概览<ArrowUpRight size={15}/></button></header>
      {!collapsed.includes(g.key) && <div className="issue-children">{g.shown.map(row)}{g.shown.length < g.items.length && <button className="issue-show-all" onClick={() => setFilter('all')}>当前展示 {g.shown.length} / 共 {g.items.length} 个会话 · 查看全部</button>}</div>}
    </article>)}</div>
    {!visible.length && <div className="issue-empty"><MessageSquare size={30}/><h3>{conversations.length ? `暂无${filter === 'all' ? '' : labels[filter]}会话` : '还没有协作会话'}</h3><p>从我的助理发起沟通，或手动创建一个会话。</p><button onClick={() => conversations.length ? setFilter('all') : setCreating({})}>{conversations.length ? '查看全部' : '新建会话'}</button></div>}
    <p className="issue-visibility">仅展示你有权查看的协作内容 · 数量按会话统计</p>
    {selected && <Dialog title="事项概览" wide onClose={() => select(null)} footer={<button className="rc-primary" onClick={() => {setCreating({source: selected.source, issue: selected.issue}); select(null)}}><Plus size={16}/>发起相关会话</button>}>
      <div className="issue-panel"><h2>{selected.issue.title}</h2>
      {editing ? <div className="issue-edit-name"><input aria-label="事项名称" value={name} onChange={event => setName(event.target.value)} /><button disabled={!name.trim()} onClick={() => {onRenameIssue(selected.key,name.trim());setEditing(false)}}>保存</button><button onClick={() => setEditing(false)}>取消</button></div> : <button className="issue-overview-link" onClick={() => {setName(selected.issue.title);setEditing(true)}}>修改事项名称</button>}
      <p className="issue-goal">事项目标：{selected.issue.goal}</p>
      {selected.source && <div className="issue-source-line"><span>{selected.source.platform} · {selected.source.application}</span>{selected.source.url && /^https?:\/\//i.test(selected.source.url) && !selected.source.unavailable ? <a href={selected.source.url} target="_blank" rel="noopener noreferrer">查看原任务 ↗</a> : <button onClick={() => setFeedback(selected.source?.unavailable ? '原任务不可访问，请前往来源平台核实。' : '此为演示来源，尚未接入原系统任务入口。')}>查看原任务 ↗</button>}</div>}{feedback && <p role="status">{feedback}</p>}
      <section className="issue-summary"><h3>协作进展 <span>基于当前会话记录</span></h3>{selected.items.every(c => c.status === 'completed') && <p>相关沟通均已结束，不代表事项已办结。</p>}
      {selected.items.map(c => <div key={c.id}><button onClick={() => navigate(c.id)}>{c.title} ↗</button><p>{c.status === 'completed' ? c.completionReason || c.preview : c.demo?.roundSummaries?.[String(c.round)] || c.preview}</p>{c.pendingCurrentUserConfirmation && <p className="issue-next">待你处理：{c.pendingCurrentUserConfirmation.question}</p>}<small>会话更新：{c.updatedAt}</small></div>)}<small>以上为协作进展，不根据会话数量推算事项完成度。</small></section>
      <section className="issue-panel-section"><h3>相关会话 <span>{selected.items.length}</span></h3>{selected.items.map(c => <div key={c.id}>{row(c)}{!c.sourceTask && c.hostUserId === 'current-user' && c.perspective !== 'recipient' && <button className="issue-overview-link issue-move" onClick={() => {setMoving(c.id);setDestination('');select(null)}}>调整会话归属</button>}</div>)}</section>
      <section className="issue-panel-section"><h3>相关材料 <span>{files.length}</span></h3>{files.length ? files.map(({c,m,file}) => <button className="issue-material" key={`${c.id}-${m.id}-${file.id}`} onClick={() => navigate(c.id,{fileId:file.id})}><FileText size={22}/><span><strong>{file.name}</strong><small>{c.title} · {m.actorName}</small></span><ArrowUpRight size={15}/></button>) : <p className="issue-muted">暂无共享材料。会话中实际发送的文件会汇总到这里。</p>}</section>
      <section className="issue-panel-section"><h3>关键动态</h3><p className="issue-muted">展示首条沟通、材料新增与最新消息，可回到原始记录。</p>{activity.map(({c,m,index}) => <button className="issue-event" key={`${c.id}-${m.id}`} onClick={() => navigate(c.id,{messageId:m.id})}><i/><span><small>{m.createdAt} · {c.title}</small><strong>{m.attachments?.length ? `${m.actorName}共享了材料` : index === 0 ? `${m.actorName}发起沟通` : `${m.actorName}反馈了进展`}</strong><p>{m.content}</p></span></button>)}{!activity.length && <p className="issue-muted">暂无通信记录。</p>}</section>
      </div>
    </Dialog>}
    {moving && <Dialog title="调整会话归属" onClose={() => setMoving(null)} footer={<><button onClick={() => setMoving(null)}>取消</button><button className="rc-primary" onClick={() => {onMoveConversation(moving,destination);setMoving(null)}}>确认调整</button></>}><p>只调整该会话所属事项，消息、参与人和状态不变。</p><label className="rc-field">移至<select value={destination} onChange={event => setDestination(event.target.value)}><option value="">独立为新事项</option>{groups.filter(g => !g.source && !g.items.some(c => c.id === moving)).map(g => <option key={g.key} value={g.key}>{g.issue.title}</option>)}</select></label></Dialog>}
    {creating && <CreateA2AGroupDialog issue={creating.issue} issues={issueOptions(conversations)} source={creating.source} onClose={() => setCreating(null)} onCreate={input => {onCreateGroup(input); setCreating(null)}}/>}
  </section>
}
