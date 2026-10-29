import { ExternalLink, Link2 } from 'lucide-react'
import { useRef, useState } from 'react'
import type { A2AConversation } from './a2aConversationTypes'

export default function A2ASourceTask({ source }: { source: NonNullable<A2AConversation['sourceTask']> }) {
  const details = useRef<HTMLDetailsElement>(null)
  const [feedback, setFeedback] = useState('')
  const url = source.url && /^https?:\/\//i.test(source.url) ? source.url : undefined
  return <details className="a2a-source-task" ref={details} onKeyDown={event => {
    if (event.key === 'Escape' && details.current) {
      details.current.open = false
      details.current.querySelector('summary')?.focus()
    }
  }} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null) && details.current) details.current.open = false
  }}>
    <summary><Link2 size={13} />来源：{source.platform}任务</summary>
    <div className="a2a-source-popover">
      <dl>
        <dt>来源任务</dt><dd>{source.titleAtReference}</dd>
        <dt>来源平台</dt><dd>{source.platform} · {source.application}</dd>
      </dl>
      {url && !source.unavailable
        ? <a href={url} target="_blank" rel="noopener noreferrer">查看原任务 <ExternalLink size={13} /></a>
        : <button type="button" onClick={() => setFeedback(source.unavailable ? '原任务不可访问，请前往来源平台核实。' : '此为演示来源，尚未接入原系统任务入口。')}>查看原任务 <ExternalLink size={13} /></button>}
      {feedback && <p role="status">{feedback}</p>}
    </div>
  </details>
}
