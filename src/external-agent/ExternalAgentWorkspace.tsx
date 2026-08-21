import { useEffect, useState, type FormEvent } from 'react'
import { Bot, ExternalLink, Globe2, Pencil, Plus, Search, ShieldCheck, Trash2, X } from 'lucide-react'
import './external-agent.css'

type ExternalAgent = {
  id: string
  name: string
  description: string
  platform: string
  url: string
  category: string
  color: string
  builtin?: boolean
}

type AgentDraft = Omit<ExternalAgent, 'id' | 'builtin'>

const STORAGE_KEY = 'comac-external-agents-v1'

const builtinAgents: ExternalAgent[] = [
  { id: 'builtin-coze', name: '流程搭建助手', description: '通过可视化工作流编排业务流程，适合快速验证自动化场景。', platform: 'Coze', url: 'https://www.coze.cn/', category: '流程自动化', color: '#5664f5', builtin: true },
  { id: 'builtin-dify', name: '知识库问答 Agent', description: '连接外部知识库，在第三方平台中进行检索与问答。', platform: 'Dify', url: 'https://dify.ai/', category: '知识问答', color: '#3478f6', builtin: true },
  { id: 'builtin-modelscope', name: '模型体验中心', description: '访问外部智能体与模型应用，体验更多专业能力。', platform: 'ModelScope', url: 'https://modelscope.cn/studios', category: '研发工具', color: '#7257d8', builtin: true },
]

const emptyDraft: AgentDraft = { name: '', description: '', platform: '', url: '', category: '其他', color: '#1677d2' }

function loadPersonalAgents(): ExternalAgent[] {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value ? JSON.parse(value) as ExternalAgent[] : []
  } catch {
    return []
  }
}

function normalizeUrl(url: string) {
  const value = url.trim()
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function AgentCard({ agent, onEdit, onDelete }: { agent: ExternalAgent; onEdit?: (agent: ExternalAgent) => void; onDelete?: (agent: ExternalAgent) => void }) {
  return (
    <article className="external-agent-card">
      <div className="external-agent-card-top">
        <div className="external-agent-logo" style={{ background: agent.color }}><Bot size={27} strokeWidth={1.8} /></div>
        <span className="external-agent-platform">{agent.platform}</span>
        {!agent.builtin && (
          <div className="external-agent-card-actions">
            <button type="button" title="编辑" onClick={() => onEdit?.(agent)}><Pencil size={15} /></button>
            <button type="button" title="删除" onClick={() => onDelete?.(agent)}><Trash2 size={15} /></button>
          </div>
        )}
      </div>
      <div className="external-agent-card-body"><h3>{agent.name}</h3><p>{agent.description}</p></div>
      <div className="external-agent-card-footer">
        <span>{agent.category}</span>
        <button type="button" onClick={() => window.open(agent.url, '_blank', 'noopener,noreferrer')}>打开 Agent <ExternalLink size={16} /></button>
      </div>
    </article>
  )
}

export default function ExternalAgentWorkspace() {
  const [personalAgents, setPersonalAgents] = useState<ExternalAgent[]>(loadPersonalAgents)
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<AgentDraft>(emptyDraft)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => window.localStorage.setItem(STORAGE_KEY, JSON.stringify(personalAgents)), [personalAgents])

  const normalizedQuery = query.trim().toLowerCase()
  const matches = (agent: ExternalAgent) => !normalizedQuery || [agent.name, agent.description, agent.platform, agent.category].some((value) => value.toLowerCase().includes(normalizedQuery))
  const filteredBuiltin = builtinAgents.filter(matches)
  const filteredPersonal = personalAgents.filter(matches)

  const openCreateDialog = () => {
    setEditingId(null)
    setDraft(emptyDraft)
    setFormError('')
    setDialogOpen(true)
  }

  const openEditDialog = (agent: ExternalAgent) => {
    setEditingId(agent.id)
    setDraft({ name: agent.name, description: agent.description, platform: agent.platform, url: agent.url, category: agent.category, color: agent.color })
    setFormError('')
    setDialogOpen(true)
  }

  const submitAgent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.name.trim() || !draft.platform.trim() || !draft.url.trim()) {
      setFormError('请填写 Agent 名称、所属平台和访问地址。')
      return
    }
    const nextAgent: ExternalAgent = { ...draft, id: editingId ?? `external-agent-${Date.now()}`, name: draft.name.trim(), platform: draft.platform.trim(), description: draft.description.trim() || '暂无简介', url: normalizeUrl(draft.url) }
    setPersonalAgents((current) => editingId ? current.map((agent) => agent.id === editingId ? nextAgent : agent) : [nextAgent, ...current])
    setDialogOpen(false)
  }

  const deleteAgent = (agent: ExternalAgent) => {
    if (window.confirm(`确认删除“${agent.name}”吗？`)) setPersonalAgents((current) => current.filter((item) => item.id !== agent.id))
  }

  return (
    <section className="external-agent-workspace">
      <header className="external-agent-header">
        <div><span className="external-agent-eyebrow">更多能力</span><h1>外部 Agent</h1><p>统一收纳第三方 Agent，并前往对应平台使用。</p></div>
        <button className="external-agent-add" type="button" onClick={openCreateDialog}><Plus size={18} /> 注册外部 Agent</button>
      </header>

      <div className="external-agent-notice"><ShieldCheck size={19} /><p><strong>当前为跳转入口</strong><span>打开后将在第三方平台运行，本平台暂不传递任务内容，也不接收执行结果。</span></p></div>
      <label className="external-agent-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 Agent、平台或分类" /></label>

      <div className="external-agent-content">
        {filteredBuiltin.length > 0 && (
          <section className="external-agent-group">
            <div className="external-agent-group-title"><h2>平台推荐</h2><span>{filteredBuiltin.length}</span></div>
            <div className="external-agent-grid">{filteredBuiltin.map((agent) => <AgentCard key={agent.id} agent={agent} />)}</div>
          </section>
        )}
        <section className="external-agent-group">
          <div className="external-agent-group-title"><h2>我的 Agent</h2><span>{filteredPersonal.length}</span></div>
          {filteredPersonal.length > 0 ? (
            <div className="external-agent-grid">{filteredPersonal.map((agent) => <AgentCard key={agent.id} agent={agent} onEdit={openEditDialog} onDelete={deleteAgent} />)}</div>
          ) : (
            <button className="external-agent-empty" type="button" onClick={openCreateDialog}><span><Plus size={22} /></span><strong>{query ? '没有匹配的个人 Agent' : '注册你的第一个外部 Agent'}</strong><small>{query ? '换个关键词试试' : '添加名称、平台和链接即可使用'}</small></button>
          )}
        </section>
      </div>

      {dialogOpen && (
        <div className="external-agent-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setDialogOpen(false) }}>
          <form className="external-agent-dialog" onSubmit={submitAgent}>
            <div className="external-agent-dialog-title"><div><h2>{editingId ? '编辑外部 Agent' : '注册外部 Agent'}</h2><p>填写第三方 Agent 的基本信息和访问地址。</p></div><button type="button" aria-label="关闭" onClick={() => setDialogOpen(false)}><X size={20} /></button></div>
            <div className="external-agent-form-grid">
              <label><span>Agent 名称 *</span><input autoFocus value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="例如：项目风险分析助手" /></label>
              <label><span>所属平台 *</span><input value={draft.platform} onChange={(event) => setDraft({ ...draft, platform: event.target.value })} placeholder="例如：Dify / Coze / 自建" /></label>
              <label className="external-agent-form-wide"><span>访问地址 *</span><div className="external-agent-url-input"><Globe2 size={17} /><input value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} placeholder="https://example.com/agent" /></div></label>
              <label><span>分类</span><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}><option>其他</option><option>知识问答</option><option>流程自动化</option><option>数据分析</option><option>研发工具</option><option>办公效率</option></select></label>
              <label><span>标识颜色</span><input className="external-agent-color" type="color" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} /></label>
              <label className="external-agent-form-wide"><span>简介</span><textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="简要说明这个 Agent 能做什么" maxLength={100} /></label>
            </div>
            {formError && <p className="external-agent-form-error">{formError}</p>}
            <div className="external-agent-dialog-actions"><button type="button" onClick={() => setDialogOpen(false)}>取消</button><button type="submit">{editingId ? '保存修改' : '完成注册'}</button></div>
          </form>
        </div>
      )}
    </section>
  )
}
