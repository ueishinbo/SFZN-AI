import { Check, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { WorkingGroupRun } from './types'

const REVEAL_DELAY = 650
const DONE_DELAY = 600

export default function OrchestrationReveal({
  run,
  onDone,
}: {
  run: WorkingGroupRun
  onDone: () => void
}) {
  const steps = [
    `已确定任务：${run.title}`,
    '已加载 4 项工作事项：风险梳理 / 质量符合性 / 供应商风险 / 接口影响',
    '已确定目标：形成可执行的评审结论与关闭计划',
    '已加载流程：风险治理流程（既定）',
    `已确定协作岗位：${run.members.map((m) => m.role).join(' · ')}`,
  ]
  const [revealed, setRevealed] = useState(0)

  useEffect(() => {
    if (revealed >= steps.length) {
      const t = window.setTimeout(onDone, DONE_DELAY)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => setRevealed((r) => r + 1), REVEAL_DELAY)
    return () => window.clearTimeout(t)
  }, [revealed, steps.length, onDone])

  return (
    <div className="wg-orch">
      <header className="wg-orch-head">
        <Loader2 size={18} className="wg-spin" />
        <span>数字分身正在按既定流程编排协作任务…</span>
      </header>
      <ol className="wg-orch-steps">
        {steps.slice(0, revealed).map((step, i) => (
          <li key={i}>
            <Check size={15} />
            <span>{step}</span>
          </li>
        ))}
      </ol>
      {revealed < steps.length && (
        <div className="wg-orch-running">正在编排{revealed < 3 ? '任务' : '协作岗位'}…</div>
      )}
    </div>
  )
}
