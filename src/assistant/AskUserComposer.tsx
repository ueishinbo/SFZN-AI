import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import './ask-user-composer.css'

export function AskUserComposer({ title, description, children, onCancel }: {
  title: string; description?: string; children: ReactNode; onCancel: () => void
}) {
  return <section className="ask-user-composer" aria-label="Ask User 问题面板">
    <header><h3>{title}</h3><button type="button" aria-label="取消本次提问" onClick={onCancel}><X size={17}/></button></header>
    {description && <p>{description}</p>}
    <div className="ask-user-composer-options">{children}</div>
  </section>
}
