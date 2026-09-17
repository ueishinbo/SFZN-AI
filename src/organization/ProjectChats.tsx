import { ArrowLeft, MessageSquare, Plus, Search, Send } from 'lucide-react'
import { useState } from 'react'
import { supplierFollowUp, supplierReport } from './supplyScenarios'

type Message = { role: 'user' | 'assistant'; content: string }
type Chat = { id: string; title: string; updatedAt: string; messages: Message[] }
const seeds: Record<string, Chat[]> = {
  ipt: [
    { id: 'ipt-chat-1', title: '梳理生产链式智能建设的推进重点', updatedAt: '今天 10:30', messages: [
      { role: 'user', content: '帮我梳理一下今年生产链式智能建设的推进重点。' },
      { role: 'assistant', content: '建议先贯通“生产计划—物料齐套—工位执行—异常反馈”这条试点链路。\n\n1. 明确试点工位及验收口径。\n2. 对齐任务编号、物料状态与责任岗位。\n3. 通过缺件场景验证发现、协同、到料确认的闭环。\n\n当前可先整理场景清单和数据字段，再安排联调验证。' },
    ] },
    { id: 'ipt-chat-2', title: '整理工程总体办年度工作汇报提纲', updatedAt: '昨天 16:20', messages: [
      { role: 'user', content: '年度工作汇报可以怎么组织？' },
      { role: 'assistant', content: '可以按年度目标、重点工作、阶段成果、存在问题、下一步安排五个部分组织。\n\n重点建设任务建议单列一页，说明目标、当前进展和需要协调的事项。具体成果和指标可以待材料齐备后补充。' },
    ] },
  ],
  supply: [
    { id: 'supply-performance-202608', title: '供应商交付表现｜2026年8月月度分析', updatedAt: '9月17日 09:40', messages: [
      { role: 'user', content: '我需要掌握各个供应商的交付、质量等维度的表现，重点看西飞和沈飞，并明确后续跟进安排。' },
      { role: 'assistant', content: supplierReport },
    ] },
  ],
}

export default function ProjectChats({ projectId }: { projectId: string }) {
  const [chats, setChats] = useState(() => seeds[projectId] ?? [])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const selected = chats.find(chat => chat.id === selectedId)
  const send = () => {
    const content = draft.trim()
    if (!content || !selected) return
    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    setChats(items => {
      const updated: Chat = { ...selected, title: selected.messages.length ? selected.title : content.slice(0, 40), updatedAt: `今天 ${now}`, messages: [...selected.messages, { role: 'user', content }, { role: 'assistant', content: projectId === 'supply' ? supplierFollowUp(content) : `已记录你的补充：“${content}”。\n\n可以继续按目标、现状、待协调事项和下一步安排整理讨论内容，具体业务结论待相关材料确认。` }] }
      return [updated, ...items.filter(item => item.id !== selected.id)]
    })
    setDraft('')
  }
  if (selected) return <div className="org-chat-detail">
    <header><button type="button" onClick={() => { setSelectedId(null); setDraft('') }}><ArrowLeft size={17}/>返回任务</button><strong>{selected.title}</strong></header>
    <div className="org-chat-messages">{selected.messages.map((message, index) => <article className={`org-chat-message is-${message.role}`} key={index}><b>{message.role === 'user' ? '你' : 'AI 助手'}</b><p>{message.content}</p></article>)}{!selected.messages.length && <div className="org-chat-empty"><MessageSquare size={28}/><p>开始讨论这个项目的工作</p></div>}</div>
    {projectId === 'supply' && <div className="org-chat-suggestions">{['交付准时率怎么算？', '西飞排名为什么下降？', '质量与FRR变化', '整理催办要求'].map(prompt => <button type="button" key={prompt} onClick={() => setDraft(prompt)}>{prompt}</button>)}</div>}
    <form className="org-chat-input" onSubmit={event => { event.preventDefault(); send() }}><textarea aria-label="对话内容" placeholder="继续讨论项目工作…" value={draft} onChange={event => setDraft(event.target.value)} rows={3}/><button type="submit" disabled={!draft.trim()} aria-label="发送消息"><Send size={18}/></button></form>
  </div>
  const visible = chats.filter(chat => chat.title.includes(query.trim()))
  return <div className="org-chats">
    <div className="org-chats-toolbar"><span>与 AI 的项目对话</span><label><Search size={17}/><input aria-label="搜索任务标题" placeholder="搜索任务标题" value={query} onChange={event => setQuery(event.target.value)}/></label><button type="button" onClick={() => { const id = crypto.randomUUID(); setChats(items => [{ id, title: '新对话', updatedAt: '刚刚', messages: [] }, ...items]); setSelectedId(id); setDraft('') }}><Plus size={17}/>新建任务</button></div>
    <div className="org-chat-rows">{visible.map(chat => <button type="button" className="org-chat-row" key={chat.id} onClick={() => { setSelectedId(chat.id); setDraft('') }}><MessageSquare size={20}/><strong>{chat.title}</strong><span className="org-chat-source">本地</span><time>{chat.updatedAt}</time></button>)}</div>
    {!visible.length && <p className="org-empty-column">{chats.length ? '没有匹配的会话，请调整搜索内容。' : '暂无会话，点击新建任务开始讨论。'}</p>}
  </div>
}
