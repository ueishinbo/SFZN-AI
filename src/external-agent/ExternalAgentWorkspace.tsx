import { ExternalLink, ShieldCheck } from 'lucide-react'
import './external-agent.css'

type ExternalAgent = {
  id: string
  name: string
  description: string
  url: string
  color: string
}

const externalAgents: ExternalAgent[] = [
  { id: 'coze', name: '流程搭建助手', description: '通过可视化工作流编排业务流程，适合快速验证自动化场景。', url: 'https://www.coze.cn/', color: '#5664f5' },
  { id: 'dify', name: '知识库问答 Agent', description: '连接外部知识库，在第三方平台中进行检索与问答。', url: 'https://dify.ai/', color: '#3478f6' },
  { id: 'modelscope', name: '模型体验中心', description: '访问外部智能体与模型应用，体验更多专业能力。', url: 'https://modelscope.cn/studios', color: '#7257d8' },
]

function AgentCard({ agent }: { agent: ExternalAgent }) {
  const avatarText = Array.from(agent.name.trim())[0] ?? 'A'

  return (
    <article className="external-agent-card">
      <div className="external-agent-card-top">
        <div className="external-agent-logo" style={{ background: agent.color }} aria-hidden="true">{avatarText}</div>
      </div>
      <div className="external-agent-card-body"><h3>{agent.name}</h3><p>{agent.description}</p></div>
      <div className="external-agent-card-footer">
        <button type="button" onClick={() => window.open(agent.url, '_blank', 'noopener,noreferrer')}>打开 Agent <ExternalLink size={16} /></button>
      </div>
    </article>
  )
}

export default function ExternalAgentWorkspace() {
  return (
    <section className="external-agent-workspace">
      <header className="external-agent-header">
        <div><span className="external-agent-eyebrow">更多能力</span><h1>外部 Agent</h1><p>从这里前往第三方平台，使用已接入的外部 Agent。</p></div>
      </header>

      <div className="external-agent-notice">
        <ShieldCheck size={19} />
        <p><strong>将在第三方平台打开</strong><span>Agent 的运行和服务由对应平台提供。</span></p>
      </div>

      <div className="external-agent-content">
        <div className="external-agent-grid">{externalAgents.map((agent) => <AgentCard key={agent.id} agent={agent} />)}</div>
      </div>
    </section>
  )
}
