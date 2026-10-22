import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, FileText, MessageSquare, Quote, X } from 'lucide-react'
import type { A2AConversation, A2AConversationMessage } from './a2aConversationTypes'
import { createSeedConversationMessages } from './a2aConversationTypes'
import { canManageA2A } from './a2aLifecycle'
import { taskProgress } from './a2aTaskProgress'
import { Markdown } from '../role-center/ui'
import A2AFileWorkspace, { type ConversationFile } from './A2AFileWorkspace'

type Props = {
  taskId: string
  conversations: A2AConversation[]
  records: Record<string, A2AConversationMessage[]>
  selectedId?: string
  onSelect: (id: string) => void
  view: 'records' | 'files'
  onView: (view: 'records' | 'files') => void
  files: ConversationFile[]
  fileRequest?: { id: string; serial: number }
  messageId?: string
  onFile: (id: string) => void
  onReference: (conversation: A2AConversation, message?: A2AConversationMessage) => void
  onReview: (id: string) => void
  reviewingId?: string
  onComplete: (id: string) => void
  onClose: () => void
  readOnly: boolean
}

export default function TaskCollaborationPanel(p: Props) {
  const [picker, setPicker] = useState(false)
  const selector = useRef<HTMLDivElement>(null)
  const thread = useRef<HTMLDivElement>(null)
  const c = p.conversations.find(c => c.id === p.selectedId) ?? p.conversations.find(c => c.status !== 'completed' && c.pendingCurrentUserConfirmation) ?? p.conversations[0]
  const messages = c ? p.records[c.id] ?? createSeedConversationMessages(c) : []
  const pending = p.conversations.filter(c => c.status !== 'completed' && c.pendingCurrentUserConfirmation).length
  useEffect(() => { setPicker(false) }, [p.taskId, p.selectedId])
  useEffect(() => {
    if (!picker) return
    const close = (e: PointerEvent) => { if (!selector.current?.contains(e.target as Node)) setPicker(false) }
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setPicker(false) }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape) }
  }, [picker])
  useEffect(() => {
    if (p.messageId) thread.current?.querySelector(`[data-message-id="${CSS.escape(p.messageId)}"]`)?.scrollIntoView({ block: 'center' })
  }, [p.messageId, p.selectedId, p.view])
  return <aside className="tp-collaboration" aria-label="任务协作工作区">
    <header className="tp-panel-header">
      <div role="tablist" aria-label="任务右侧工作区">
        <button role="tab" aria-selected={p.view === 'records'} onClick={() => p.onView('records')}><MessageSquare size={15}/>协作过程<span>{p.conversations.length}</span></button>
        <button role="tab" aria-selected={p.view === 'files'} onClick={() => p.onView('files')}><FileText size={15}/>任务资料</button>
      </div>
      <button className="tp-panel-close" aria-label="收起协作工作区" onClick={p.onClose}><X size={17}/></button>
    </header>
    <div className="tp-collaboration-content" hidden={p.view !== 'records'}>
      {!c ? <div className="tp-collaboration-empty"><MessageSquare size={30}/><h3>{p.readOnly ? '本任务没有协作记录' : '需要协助时，在这里跟进'}</h3><p>{p.readOnly ? '任务已完成，可查看左侧历史记录及任务资料。' : '告诉左侧助理要联系谁、确认什么。发起后，每一路沟通都会留在这项任务里。'}</p></div> : <>
        <div className="tp-collaboration-selector" ref={selector}>
          <button className="tp-collaboration-current" aria-label="切换协作事项" aria-expanded={picker} onClick={() => setPicker(!picker)}>
            <span><small>当前协作{pending > 0 && <em>{pending} 项待你处理</em>}</small><strong>{c.title}</strong></span><ChevronDown size={17}/>
          </button>
          {picker && <div className="tp-collaboration-options" aria-label="协作事项列表">
            {p.conversations.map(item => <button key={item.id} aria-pressed={item.id === c.id} onClick={() => { p.onSelect(item.id); setPicker(false) }}>
              <span><strong>{item.title}</strong><small>{item.members.map(m => m.name).join('、')}</small></span>
              <em className={item.status === 'completed' ? 'done' : item.pendingCurrentUserConfirmation ? 'attention' : ''}>{item.status === 'completed' ? '已结束' : item.pendingCurrentUserConfirmation ? '待你处理' : '进行中'}</em>
              {item.id === c.id && <Check size={14}/>}
            </button>)}
          </div>}
        </div>
        <div className="tp-collaboration-meta">
          <div><span>{c.scope === 'direct' ? '单聊' : '群聊'} · {c.members.map(m => m.name).join('、')}</span><span>第 {c.round} 轮{c.maxRounds ? ` / ${c.maxRounds} 轮` : ''}</span></div>
          <details key={c.id}><summary>{c.goal || c.title}</summary><p>{c.goal || c.title}</p></details>
          <p className="tp-collaboration-progress">{taskProgress(c, messages).text.replace('请在下方输入区处理。','可在任务对话中处理。')}</p>
        </div>
        {c.pendingCurrentUserConfirmation && c.status !== 'completed' && !p.readOnly && <div className="tp-collaboration-pending"><span><strong>{p.reviewingId === c.id ? '正在处理此问题' : '需要你的决定'}</strong><small>{c.pendingCurrentUserConfirmation.question}</small></span>{p.reviewingId === c.id ? <><span className="tp-review-desktop-status">左侧作出选择</span><button className="tp-review-mobile-return" onClick={() => p.onReview(c.id)}>返回处理</button></> : <button onClick={() => p.onReview(c.id)}>切换处理 →</button>}</div>}
        <div className="tp-collaboration-thread" ref={thread} aria-label={`${c.title}协作记录`}>
          {messages.map((m, index) => <article className={`tp-collaboration-message ${m.actorUserId === 'current-user' ? 'is-mine' : ''} ${p.messageId === m.id ? 'is-referenced' : ''}`} data-message-id={m.id} key={m.id}>
            {m.roundId && m.roundId !== messages[index - 1]?.roundId && <div className="tp-collaboration-round">第 {new Set(messages.slice(0, index + 1).map(m => m.roundId).filter(Boolean)).size} 轮</div>}
            <header><span className="tp-record-avatar">{m.actorName.slice(0, 1)}</span><strong>{m.actorName}<small>分身</small></strong><time>{m.createdAt}</time></header>
            <Markdown content={m.content}/>
            {m.attachments?.map(f => <button className="tp-record-file" key={f.id} onClick={() => p.onFile(f.id)}><FileText size={16}/>{f.name}</button>)}
            {!p.readOnly && !p.reviewingId && <button className="tp-reference-action" onClick={() => p.onReference(c, m)}><Quote size={12}/>与助理讨论这条消息</button>}
          </article>)}
          {!messages.length && <p className="tp-empty-inline">正在同步协作记录…</p>}
        </div>
        <footer className="tp-collaboration-footer"><span>{c.status === 'completed' ? '沟通已结束，记录和材料已保留' : '正式协作记录 · 本会话成员可见'}</span>{c.status !== 'completed' && !c.pendingCurrentUserConfirmation && !p.readOnly && canManageA2A(c) && <button onClick={() => p.onComplete(c.id)}>结束本次协作</button>}</footer>
      </>}
    </div>
    <div className="tp-task-files-panel" hidden={p.view !== 'files'}><A2AFileWorkspace key={p.taskId} files={p.files} request={p.fileRequest} scope="task"/></div>
  </aside>
}
