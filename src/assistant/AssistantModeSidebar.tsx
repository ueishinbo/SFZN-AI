import {
  Bot,
  ChevronRight,
  Clock3,
  Settings2,
  LayoutPanelLeft,
  Search,
  UsersRound,
} from 'lucide-react'
import { useState } from 'react'
import './a2a-groups.css'

type AssistantFeatureId = 'automation' | 'experts' | 'skills' | 'mcp' | 'training' | 'a2a'

type AssistantDestination =
  | { type: 'assistant' }
  | { type: 'conversation'; conversationId: string }
  | { type: 'feature'; featureId: AssistantFeatureId }

type AssistantModeSidebarProps = {
  open: boolean
  destination: AssistantDestination
  onClose: () => void
  onSelectAssistant: () => void
  onSelectFeature: (featureId: AssistantFeatureId) => void
  onEnterAdmin: () => void
}

export default function AssistantModeSidebar({
  open,
  destination,
  onClose,
  onSelectAssistant,
  onSelectFeature,
  onEnterAdmin,
}: AssistantModeSidebarProps) {
  const [query, setQuery] = useState('')

  return (
    <aside className={`sidebar assistant-mode-sidebar ${open ? '' : 'sidebar--closed'}`}>
      <div className="sidebar-top assistant-mode-sidebar-top">
        <label className="search-box">
          <Search size={19} strokeWidth={2} />
          <input
            aria-label="搜索功能"
            placeholder="搜索功能"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button className="icon-button panel-toggle" type="button" title="收起侧边栏" onClick={onClose}>
          <LayoutPanelLeft size={21} strokeWidth={1.8} />
        </button>
      </div>

      <button
        className={`assistant-home-row ${destination.type === 'assistant' ? 'active' : ''}`}
        type="button"
        onClick={onSelectAssistant}
      >
        <span className="assistant-home-avatar"><Bot size={21} /></span>
        <span>
          <strong>我的助理</strong>
        </span>
      </button>

      <nav className="assistant-feature-nav" aria-label="助理功能">
        <button className={destination.type === 'feature' && destination.featureId === 'automation' ? 'active' : ''} type="button" onClick={() => onSelectFeature('automation')}>
          <Clock3 size={18} />
          <span>定时器</span>
          <ChevronRight size={14} />
        </button>
        <button className={destination.type === 'feature' && destination.featureId === 'a2a' ? 'active' : ''} type="button" onClick={() => onSelectFeature('a2a')}>
          <UsersRound size={18} />
          <span>A2A 任务</span>
          <ChevronRight size={14} />
        </button>
      </nav>

      <div className="assistant-sidebar-footer">
        <button className="assistant-training-card" type="button" onClick={() => onSelectFeature('training')}>
          <span><strong>数字分身</strong><small>身份、能力与 A2A 任务</small></span>
          <ChevronRight className="assistant-training-arrow" size={21} />
        </button>
        <button className="assistant-management-link" type="button" onClick={onEnterAdmin}>
          <Settings2 size={18} />
          <span>后台管理</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </aside>
  )
}

export type { AssistantDestination, AssistantFeatureId }
