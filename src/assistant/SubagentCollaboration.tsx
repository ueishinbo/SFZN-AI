import {
  ArrowLeft,
  Bot,
  Check,
  CircleAlert,
  LoaderCircle,
} from 'lucide-react'
import type {
  SubagentRun,
  SubagentRunStatus,
  SubagentWorker,
} from './mockSubagents'
import './subagents.css'

type SubagentCollaborationProps = {
  run: SubagentRun
  activeAgentId: string | null
  onSelectAgent: (agentId: string | null) => void
}

function StatusIcon({ status, size = 16 }: { status: SubagentRunStatus; size?: number }) {
  if (status === 'success') return <Check size={size} strokeWidth={2.5} />
  if (status === 'failed') return <CircleAlert size={size} />
  return <LoaderCircle className="subagent-spin" size={size} />
}

function statusLabel(status: SubagentRunStatus) {
  if (status === 'success') return '已完成'
  if (status === 'failed') return '失败'
  return '运行中'
}

function AgentAvatar({ agent, small = false }: { agent: SubagentWorker; small?: boolean }) {
  return (
    <span className={`subagent-avatar subagent-avatar--${agent.tone} ${small ? 'subagent-avatar--small' : ''}`}>
      {agent.initials}
    </span>
  )
}

function AgentDetail({ agent }: { agent: SubagentWorker }) {
  const visibleSteps = agent.steps.filter((step) => step.status !== 'waiting')

  return (
    <article className="subagent-detail-card">
      <header className="subagent-detail-header">
        <div className="subagent-detail-identity">
          <AgentAvatar agent={agent} />
          <div>
            <span>子智能体 · {agent.role}</span>
            <h2>{agent.name}</h2>
            <p>{agent.description}</p>
          </div>
        </div>
        <span className={`subagent-detail-status subagent-detail-status--${agent.status}`}>
          <StatusIcon status={agent.status} />
          {statusLabel(agent.status)}
        </span>
      </header>

      <section className="subagent-detail-content">
        <div className="subagent-text-stream">
          {visibleSteps.map((step) => (
            <p className={`subagent-text-line subagent-text-line--${step.status}`} key={step.id}>
              {step.detail}
              {step.status === 'running' && <LoaderCircle className="subagent-spin" size={14} />}
            </p>
          ))}

          {agent.status === 'success' && (
            <p className="subagent-text-result">
              {agent.outputTitle}已经整理完成：{agent.output.join('；')}。
            </p>
          )}

          {agent.status === 'failed' && (
            <p className="subagent-text-error">
              本次执行未能继续：{agent.error?.message}
            </p>
          )}
        </div>
      </section>
    </article>
  )
}

export default function SubagentCollaboration({
  run,
  activeAgentId,
  onSelectAgent,
}: SubagentCollaborationProps) {
  const activeAgent = run.agents.find((agent) => agent.id === activeAgentId)

  return (
    <>
      {activeAgent && (
        <section className="subagent-overlay" aria-label={`${activeAgent.name}执行详情`}>
          <div className="subagent-overlay-scroll">
            <AgentDetail agent={activeAgent} />
          </div>
          <button className="subagent-return-button" type="button" onClick={() => onSelectAgent(null)}>
            <ArrowLeft size={18} />
            返回主会话继续对话
          </button>
        </section>
      )}

      <nav className={`subagent-dock ${activeAgent ? 'subagent-dock--detail' : ''}`} aria-label="本轮智能体执行状态">
        <div className="subagent-dock-scroll">
          <button
            className={`subagent-pill subagent-pill--main ${!activeAgent ? 'active' : ''}`}
            type="button"
            onClick={() => onSelectAgent(null)}
            aria-pressed={!activeAgent}
          >
            <span className="subagent-main-avatar"><Bot size={17} /></span>
            <span><strong>{run.mainAgent.name}</strong><small>{run.mainAgent.role}</small></span>
            <i className={`subagent-pill-status subagent-pill-status--${run.mainAgent.status}`}><StatusIcon status={run.mainAgent.status} /></i>
          </button>

          {run.agents.map((agent) => (
            <button
              className={`subagent-pill ${activeAgentId === agent.id ? 'active' : ''}`}
              type="button"
              key={agent.id}
              onClick={() => onSelectAgent(agent.id)}
              aria-pressed={activeAgentId === agent.id}
            >
              <AgentAvatar agent={agent} small />
              <span><strong>{agent.name}</strong><small>{agent.role}</small></span>
              <i className={`subagent-pill-status subagent-pill-status--${agent.status}`}><StatusIcon status={agent.status} /></i>
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}
