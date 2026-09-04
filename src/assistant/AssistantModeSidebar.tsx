import {
  Bot,
  ChevronRight,
  Settings2,
  LayoutPanelLeft,
  Search,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { mechanismLabels, scopeLabels, type A2AConversation } from './a2aConversationTypes'
import './a2a-groups.css'

type AssistantFeatureId = 'automation' | 'experts' | 'skills' | 'mcp' | 'training'

type AssistantDestination =
  | { type: 'assistant' }
  | { type: 'conversation'; conversationId: string }
  | { type: 'feature'; featureId: AssistantFeatureId }

type AssistantModeSidebarProps = {
  open: boolean
  conversations: A2AConversation[]
  destination: AssistantDestination
  onClose: () => void
  onSelectAssistant: () => void
  onSelectConversation: (conversationId: string) => void
  onSelectFeature: (featureId: AssistantFeatureId) => void
  onEnterAdmin: () => void
}

const conversationGroups = [
  { id: 'group-notice', label: '多人通知', scope: 'group', mechanism: 'notice' },
  { id: 'group-collaboration', label: '多人协作', scope: 'group', mechanism: 'collaboration' },
  { id: 'direct-collaboration', label: '单人协作', scope: 'direct', mechanism: 'collaboration' },
  { id: 'direct-notice', label: '单人通知', scope: 'direct', mechanism: 'notice' },
] as const

function ConversationAvatars({ conversation }: { conversation: A2AConversation }) {
  const visibleMembers = conversation.members.slice(0, 2)
  return (
    <span className="assistant-group-avatars" aria-hidden="true">
      {conversation.scope === 'direct' && <UserRound className="assistant-conversation-scope-icon" size={16} />}
      {conversation.scope === 'group' && <UsersRound className="assistant-conversation-scope-icon" size={16} />}
      {visibleMembers.map((member) => (
        <i className={`assistant-group-avatar assistant-group-avatar--${member.color}`} key={member.userId}>
          {member.name.slice(0, 1)}
        </i>
      ))}
    </span>
  )
}

export default function AssistantModeSidebar({
  open,
  conversations,
  destination,
  onClose,
  onSelectAssistant,
  onSelectConversation,
  onSelectFeature,
  onEnterAdmin,
}: AssistantModeSidebarProps) {
  const [query, setQuery] = useState('')
  const visibleConversations = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return conversations
    return conversations.filter((conversation) => (
      conversation.title.toLowerCase().includes(normalized)
      || conversation.members.some((member) => member.name.toLowerCase().includes(normalized))
    ))
  }, [conversations, query])

  return (
    <aside className={`sidebar assistant-mode-sidebar ${open ? '' : 'sidebar--closed'}`}>
      <div className="sidebar-top assistant-mode-sidebar-top">
        <label className="search-box">
          <Search size={19} strokeWidth={2} />
          <input
            aria-label="搜索功能或 A2A 会话"
            placeholder="搜索功能或 A2A 会话"
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

      <section className="assistant-group-section">
        <header>
          <span>A2A 会话</span>
        </header>
        <div className="assistant-conversation-groups">
          {conversationGroups.map((group) => {
            const groupConversations = visibleConversations.filter((conversation) => (
              conversation.scope === group.scope && conversation.mechanism === group.mechanism
            ))
            if (groupConversations.length === 0) return null
            return (
              <section className="assistant-conversation-group" key={group.id}>
                <h3>{group.label}</h3>
                <div className="assistant-group-list">
                  {groupConversations.map((conversation) => (
                    <button
                      className={destination.type === 'conversation' && destination.conversationId === conversation.id ? 'active' : ''}
                      type="button"
                      key={conversation.id}
                      onClick={() => onSelectConversation(conversation.id)}
                    >
                      <ConversationAvatars conversation={conversation} />
                      <span className="assistant-group-row-copy">
                        <strong>{conversation.title}</strong>
                        <span className="assistant-conversation-type">
                          <em>{scopeLabels[conversation.scope]}</em>
                          <em className={`mechanism-${conversation.mechanism}`}>{mechanismLabels[conversation.mechanism]}</em>
                          {conversation.perspective === 'recipient' && <em className="perspective-recipient">已接收</em>}
                        </span>
                        <small>{conversation.preview}</small>
                      </span>
                      <span className="assistant-group-row-meta">
                        {conversation.pendingCurrentUserConfirmation && (
                          <i className="assistant-confirmation-dot" title="等待本人确认" aria-label="等待本人确认" />
                        )}
                        <time>{conversation.updatedAt}</time>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )
          })}
          {visibleConversations.length === 0 && <p className="assistant-group-empty">没有匹配的 A2A 会话</p>}
        </div>
      </section>

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
