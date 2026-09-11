import { ArrowLeft, Bot, RotateCcw, Send } from 'lucide-react'
import { useState } from 'react'
import WorkingGroupExecutionView from './WorkingGroupExecutionView'
import OrchestrationReveal from './OrchestrationReveal'
import { engineRiskReviewRun } from './script'
import type { WorkingGroupNode, WorkingGroupRun } from './types'
import './working-group.css'

const DEMO_PROMPT = '帮我组织一次发动机适航风险评审，形成评审结论与关闭计划。'

type DemoStage = 'sending' | 'orchestrating' | 'running'

const KIND_LABEL: Record<string, string> = {
  speak: '意见输出',
  dispatch: '任务下发',
  produce: '产物交付',
  conclusion: '结论收敛',
  confirm: '待你确认',
}

function actorRole(actorId: string, run: WorkingGroupRun): string {
  if (actorId === 'user') return '你（真人）'
  return run.members.find((m) => m.id === actorId)?.role ?? actorId
}

// 回退目标的业务名称：优先用真实业务名，而不是节点编号
function bizName(node: WorkingGroupNode): string {
  if (node.dispatch) return node.dispatch.title
  if (node.artifact) return node.artifact.name
  if (node.confirm) return node.confirm.question
  return node.action
}

function FlowMap({ run }: { run: WorkingGroupRun }) {
  const edges = run.edges ?? []
  const indexOf = (id: string) => run.nodes.findIndex((n) => n.id === id)
  // 回退边 = 目标排在来源之前（往回走）
  const backEdges = edges.filter((e) => indexOf(e.to) < indexOf(e.from))

  // 两个相邻大节点之间的正向衔接条件
  const linkCondition = (pi: number) => {
    if (pi === 0) return ''
    const prevNodes = run.nodes.filter((n) => n.phaseId === run.phases[pi - 1].id)
    const curNodes = run.nodes.filter((n) => n.phaseId === run.phases[pi].id)
    const edge = edges.find(
      (e) =>
        prevNodes.some((n) => n.id === e.from) &&
        curNodes.some((n) => n.id === e.to) &&
        indexOf(e.to) > indexOf(e.from),
    )
    return edge?.condition ?? ''
  }

  return (
    <div className="wg-flow">
      {run.phases.map((phase, pi) => {
        const phaseNodes = run.nodes.filter((n) => n.phaseId === phase.id)
        const outgoing = backEdges.filter((e) => phaseNodes.some((n) => n.id === e.from))
        const link = linkCondition(pi)
        return (
          <div className="wg-flow-block" key={phase.id}>
            {pi > 0 && (
              <div className="wg-flow-link">
                <span className="wg-flow-link-stem" />
                <span className="wg-flow-link-tip" />
                {link && <span className="wg-flow-link-label">{link}</span>}
              </div>
            )}
            <div className="wg-flow-phase">
              <div className="wg-flow-phase-head">
                <span className="wg-flow-phase-index">大节点 {pi + 1}</span>
                <span className="wg-flow-phase-title">{phase.title}</span>
                <span className="wg-flow-phase-output">产物：{phase.output}</span>
              </div>
              <div className="wg-flow-phase-body">
                {phaseNodes.map((n) => {
                  const isBranchSource = outgoing.some((e) => e.from === n.id)
                  return (
                    <div
                      className={`wg-flow-node is-${n.kind}${isBranchSource ? ' has-branch' : ''}`}
                      key={n.id}
                    >
                      <span className="wg-flow-idx">{indexOf(n.id) + 1}</span>
                      <div className="wg-flow-node-text">
                        <span className="wg-flow-action">{n.action}</span>
                        <span className="wg-flow-meta">
                          {KIND_LABEL[n.kind] ?? n.kind} · {actorRole(n.actorId, run)}
                        </span>
                      </div>
                      {isBranchSource && (
                        <span className="wg-flow-node-branch" title="此节点有条件回退分支">
                          ↰
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {outgoing.map((e) => {
                const target = run.nodes.find((n) => n.id === e.to)
                const targetPhase = target
                  ? run.phases.findIndex((p) => p.id === target.phaseId)
                  : -1
                return (
                  <div className="wg-flow-branch" key={`${e.from}-${e.to}`}>
                    <div className="wg-flow-branch-cond">
                      <span className="wg-flow-branch-mark">↰</span>
                      <span>{e.condition}</span>
                    </div>
                    <div className="wg-flow-branch-desc">
                      <span>
                        退回 <strong>{target ? bizName(target) : e.to}</strong>
                      </span>
                      {targetPhase >= 0 && target && (
                        <em>
                          重跑 大节点 {targetPhase + 1} · {run.phases[targetPhase].title}
                        </em>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function WorkingGroupDemoPage({
  onBack,
  backLabel = '返回流程定义',
}: {
  onBack: () => void
  backLabel?: string
}) {
  const run = engineRiskReviewRun
  const [stage, setStage] = useState<DemoStage>('sending')
  const [prompt, setPrompt] = useState(DEMO_PROMPT)
  const [runKey, setRunKey] = useState(0)

  if (stage === 'running') {
    return (
      <div className="wg-demo">
        <div className="wg-demo-bar">
          <button className="wg-restart" type="button" onClick={onBack}>
            <ArrowLeft size={15} />
            {backLabel}
          </button>
          <button
            className="wg-restart"
            type="button"
            onClick={() => {
              setRunKey((k) => k + 1)
              setStage('sending')
            }}
          >
            <RotateCcw size={15} />
            重新演示
          </button>
        </div>
        <WorkingGroupExecutionView key={runKey} run={run} />
      </div>
    )
  }

  return (
    <div className="wg-demo">
      <div className="wg-demo-bar">
        <button className="wg-restart" type="button" onClick={onBack}>
          <ArrowLeft size={15} />
          {backLabel}
        </button>
      </div>

      {stage === 'sending' && (
        <div className="wg-send">
          <header className="wg-send-head">
            <div className="wg-demo-avatar">
              <Bot size={20} />
            </div>
            <div className="wg-send-head-text">
              <p>任务发送</p>
              <h1>{run.title}</h1>
              <span>流程与人员已既定，确认后即可发起协同执行</span>
            </div>
          </header>

          <section className="wg-send-section">
            <h2>任务描述</h2>
            <div className="wg-send-compose">
              <textarea
                className="wg-send-input"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="输入任务内容，例如：组织发动机适航风险评审…"
              />
              <button
                className="wg-primary wg-send-btn"
                type="button"
                onClick={() => setStage('orchestrating')}
              >
                <Send size={15} />
                发送任务
              </button>
            </div>
          </section>

          <section className="wg-send-section">
            <div className="wg-members">
              {run.members.map((m) => (
                <span key={m.id} className={`wg-member wg-member--${m.color}`}>
                  <i>{m.person.slice(0, 1)}</i>
                  {m.role} · {m.person}
                </span>
              ))}
            </div>
          </section>

          <section className="wg-send-section">
            <FlowMap run={run} />
          </section>
        </div>
      )}

      {stage === 'orchestrating' && (
        <OrchestrationReveal
          run={run}
          onDone={() => {
            setRunKey((k) => k + 1)
            setStage('running')
          }}
        />
      )}
    </div>
  )
}
