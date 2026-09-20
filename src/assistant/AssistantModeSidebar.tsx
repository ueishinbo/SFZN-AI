import { DEMO_ACCOUNTS, switchDemoAccount, useDemoAccount } from "../role-center/demoAccount";
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
  const account = useDemoAccount()

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const matches = (label: string) => label.toLocaleLowerCase().includes(normalizedQuery)
  const hasResults = ['我的助理', '定时器', 'A2A 任务', '数字分身', '后台管理'].some(matches)

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

      <div className="assistant-navigation-scroll">
        {matches('我的助理') && (
          <button
            aria-current={destination.type === 'assistant' ? 'page' : undefined}
            className={`assistant-home-row ${destination.type === 'assistant' ? 'active' : ''}`}
            type="button"
            onClick={onSelectAssistant}
          >
            <span className="assistant-home-avatar"><Bot size={21} /></span>
            <span><strong>我的助理</strong></span>
          </button>
        )}

        <nav className="assistant-feature-nav" aria-label="助理功能">
          {([
            { id: 'automation', label: '定时器', icon: Clock3 },
            { id: 'a2a', label: 'A2A 任务', icon: UsersRound },
          ] as const).filter(({ label }) => matches(label)).map(({ id, label, icon: Icon }) => {
            const active = destination.type === 'feature' && destination.featureId === id
            return (
              <button
                key={id}
                aria-current={active ? 'page' : undefined}
                className={active ? 'active' : ''}
                type="button"
                onClick={() => onSelectFeature(id)}
              >
                <Icon size={20} />
                <span>{label}</span>
                <ChevronRight size={14} />
              </button>
            )
          })}
        </nav>
        {!hasResults && <p className="assistant-search-empty" role="status">未找到匹配功能，请换个关键词。</p>}
      </div>

      <div className="assistant-sidebar-footer">
        <label className="assistant-demo-account">
          <span>演示账号</span>
          <select aria-label="切换演示账号" value={account} onChange={(event) => {
            switchDemoAccount(event.target.value)
            onSelectFeature('training')
          }}>
            {DEMO_ACCOUNTS.map(item => <option key={item.id} value={item.id}>{item.name} · {item.description}</option>)}
          </select>
        </label>
        {matches('数字分身') && <button className="assistant-training-card" type="button" onClick={() => onSelectFeature('training')}>
          <span><strong>数字分身</strong><small>身份、画像与能力配置</small></span>
          <ChevronRight className="assistant-training-arrow" size={21} />
        </button>}
        {matches('后台管理') && <button className="assistant-management-link" type="button" onClick={onEnterAdmin}>
          <Settings2 size={18} />
          <span>后台管理</span>
          <ChevronRight size={14} />
        </button>}
      </div>
    </aside>
  )
}

export type { AssistantDestination, AssistantFeatureId }
