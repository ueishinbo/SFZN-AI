import { memo, useState } from 'react'
import { Check, ChevronDown, Loader2, Sparkles } from 'lucide-react'
import type { OrchProgress } from './useSimulationPlayback'
import type { SimOrchestration } from './types'

/**
 * 任务编排 —— 点「发送任务」后、真正开始执行前的一段。
 * 内容是真实动作：解析任务内容 → 对齐工作流 → 岗位到人 → 前置校验 → 风险预判。
 * 跑完自动收成一行摘要，点一下可再展开。
 */
const SimulationOrchestration = memo(SimulationOrchestrationInner)
export default SimulationOrchestration

function SimulationOrchestrationInner({
  orchestration,
  orch,
  orchDone,
}: {
  orchestration: SimOrchestration
  orch: OrchProgress
  orchDone: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const steps = orchestration.steps

  if (orchDone && !expanded) {
    return (
      <div className="ps2-orch-card is-collapsed">
        <div className="ps2-orch-collapsed">
          <span className="ps2-orch-mark is-done">
            <Check size={13} />
          </span>
          <div>
            <strong>任务编排完成</strong>
            <span>{orchestration.summary}</span>
          </div>
          <button type="button" className="ps2-orch-toggle" onClick={() => setExpanded(true)}>
            展开
            <ChevronDown size={13} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ps2-orch-card">
      <header className="ps2-orch-head">
        <span className={`ps2-orch-mark${orchDone ? ' is-done' : ''}`}>
          {orchDone ? <Check size={13} /> : <Sparkles size={13} />}
        </span>
        <div className="ps2-orch-head-text">
          <strong>数字分身 · 任务编排</strong>
          <small>
            {orchDone
              ? orchestration.summary
              : '正在把任务与你选的这条工作流对齐，并解析到具体的人'}
          </small>
        </div>
        {orchDone ? (
          <button type="button" className="ps2-orch-toggle" onClick={() => setExpanded(false)}>
            收起
            <ChevronDown size={13} className="is-up" />
          </button>
        ) : (
          <span className="ps2-orch-progress">
            {Math.min(orch.step + 1, steps.length)}/{steps.length}
          </span>
        )}
      </header>

      <ol className="ps2-orch-steps">
        {steps.map((step, i) => {
          if (i > orch.step) return null
          const current = i === orch.step && !orchDone
          const revealed = current ? step.items.slice(0, orch.item) : step.items
          const finished = !current
          return (
            <li key={step.id} className={`ps2-orch-step${current ? ' is-current' : ''}`}>
              <div className="ps2-orch-step-title">
                <span className={`ps2-orch-dot${finished ? ' is-done' : ''}`}>
                  {finished ? <Check size={11} /> : <i />}
                </span>
                <strong>{step.title}</strong>
                {current && <Loader2 size={12} className="ps2-spin ps2-orch-spin" />}
              </div>
              <p className="ps2-orch-thinking">{step.thinking}</p>
              <ul className="ps2-orch-items">
                {revealed.map((it, k) => (
                  <li key={k} className="ps2-reveal">
                    <span className="ps2-orch-item-text">{it.text}</span>
                    <span className="ps2-orch-item-meta">{it.meta}</span>
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
