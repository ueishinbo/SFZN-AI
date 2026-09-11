import {
  Check,
  CircleDashed,
  FileText,
  GitBranch,
  Loader2,
  Send,
  Sparkles,
  UserPlus,
} from 'lucide-react'
import { useState } from 'react'
import type { WorkingGroupMember, WorkingGroupNode, WorkingGroupNodeStatus } from './types'

function actorOf(node: WorkingGroupNode, members: WorkingGroupMember[]): WorkingGroupMember | null {
  return members.find((m) => m.id === node.actorId) ?? null
}

function statusIcon(status: WorkingGroupNodeStatus) {
  if (status === 'done') return <Check size={16} />
  if (status === 'running') return <Loader2 size={16} className="wg-spin" />
  if (status === 'awaiting') return <UserPlus size={16} />
  return <CircleDashed size={16} />
}

export default function WorkingGroupNode({
  node,
  status,
  thinkingCount,
  content,
  members,
  onConfirm,
}: {
  node: WorkingGroupNode
  status: WorkingGroupNodeStatus
  thinkingCount: number
  content: string
  members: WorkingGroupMember[]
  onConfirm: () => void
}) {
  const [thinkingOpen, setThinkingOpen] = useState(true)
  const actor = actorOf(node, members)
  const isUser = node.actorId === 'user'
  const done = status === 'done'
  const awaiting = status === 'awaiting'
  const running = status === 'running'

  return (
    <article className={`wg-node wg-node--${status}`}>
      <header className="wg-node-head">
        <span className={`wg-status wg-status--${status}`}>{statusIcon(status)}</span>
        <span className={`wg-avatar ${actor ? `wg-avatar--${actor.color}` : 'wg-avatar--user'}`}>
          {isUser ? '我' : (actor?.person ?? '?').slice(0, 1)}
        </span>
        <div className="wg-actor">
          <strong>{isUser ? '你（真人）' : actor?.role ?? '未知岗位'}</strong>
          {actor && <em>{actor.person}</em>}
        </div>
        <span className="wg-kind">{node.kind}</span>
      </header>

      {thinkingCount > 0 && (
        <div className="wg-thinking">
          <button
            className="wg-thinking-toggle"
            type="button"
            onClick={() => setThinkingOpen((v) => !v)}
          >
            <Sparkles size={14} />
            {running ? '思考中…' : `思考过程（${thinkingCount}/${node.thinking.length}）`}
          </button>
          {thinkingOpen && (
            <ol>
              {node.thinking.slice(0, thinkingCount).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className="wg-body">
        {node.kind === 'speak' && (
          <p>
            {content}
            {running && <span className="wg-caret" />}
          </p>
        )}

        {node.kind === 'conclusion' && (
          <div className="wg-conclusion">
            <span className="wg-conclusion-mark">◈</span>
            <p>
              {content}
              {running && <span className="wg-caret" />}
            </p>
          </div>
        )}

        {node.kind === 'dispatch' && node.dispatch && (
          <div className="wg-dispatch">
            <GitBranch size={16} />
            <div>
              <small>任务下发</small>
              <strong>{node.dispatch.title}</strong>
              <em>→ {members.find((m) => m.id === node.dispatch!.assigneeId)?.role ?? '—'}</em>
            </div>
          </div>
        )}

        {node.kind === 'produce' && node.artifact && (
          <div className="wg-artifact">
            <FileText size={18} />
            <div>
              <strong>{node.artifact.name}</strong>
              <em>{node.artifact.summary}</em>
            </div>
          </div>
        )}

        {node.kind === 'confirm' && node.confirm && (
          <div className="wg-confirm">
            <h4>{node.confirm.question}</h4>
            <p>{node.confirm.description}</p>
          </div>
        )}
      </div>

      {awaiting && node.confirm && (
        <footer className="wg-node-action">
          <button className="wg-primary" type="button" onClick={onConfirm}>
            <Send size={15} />
            {node.confirm.actionLabel}
          </button>
          <small>需要你确认后，小组才会继续。</small>
        </footer>
      )}

      {done && <span className="wg-done-tag">已完成</span>}
    </article>
  )
}
