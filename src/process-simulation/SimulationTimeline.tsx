import { CheckCircle2, Layers } from 'lucide-react'
import NodeCard from './NodeCard'
import SimulationOrchestration from './SimulationOrchestration'
import { emptyProgress, type NodeProgress, type OrchProgress } from './useSimulationPlayback'
import type { SimMember, SimNode, SimNodeStatus, SimRun, SimRunContent } from './types'

export default function SimulationTimeline({
  run,
  statuses,
  progress,
  orch,
  orchDone,
  rejections,
  visits,
  focusMember,
  activeNodeId,
  onPickNode,
  onClearFocus,
  memberOf,
  positionLabelOf,
  contentOf,
  onApprove,
  onReject,
  isComplete,
  hasRun,
}: {
  run: SimRun
  statuses: Record<string, SimNodeStatus>
  progress: Record<string, NodeProgress>
  orch: OrchProgress
  orchDone: boolean
  rejections: Record<string, string>
  visits: Record<string, number>
  focusMember: string | null
  activeNodeId: string | null
  onPickNode: (id: string) => void
  onClearFocus: () => void
  memberOf: (id: string) => SimMember | undefined
  positionLabelOf: (node: SimNode) => string
  contentOf: (node: SimNode) => SimRunContent | undefined
  onApprove: (id: string) => void
  onReject: (id: string, reason?: string) => void
  isComplete: boolean
  hasRun: boolean
}) {
  const nodes = focusMember
    ? run.nodes.filter((n) => n.actorId === focusMember)
    : run.nodes

  if (!hasRun && !focusMember) {
    return (
      <div className="ps-timeline-empty">
        <Layers size={26} />
        <strong>尚未开始执行</strong>
        <p>选择执行流程、填写任务内容后点击「发送任务」，数字分身将按工作流自动执行。</p>
      </div>
    )
  }

  return (
    <div className="ps-timeline">
      {hasRun && !focusMember && (
        <SimulationOrchestration
          orchestration={run.orchestration}
          orch={orch}
          orchDone={orchDone}
        />
      )}

      {focusMember && (
        <div className="ps-timeline-filter">
          <span>
            正在按人员查看：
            <strong>{memberOf(focusMember)?.person}</strong> 参与的节点（{nodes.length} 个）
          </span>
          <button type="button" onClick={onClearFocus}>
            查看全部
          </button>
        </div>
      )}

      {nodes.map((n) => {
        const index = run.nodes.findIndex((x) => x.id === n.id)
        const member = memberOf(n.actorId)
        const content = contentOf(n)
        return (
          <NodeCard
            key={n.id}
            node={n}
            index={index}
            member={member}
            positionLabel={positionLabelOf(n)}
            positionAssets={
              member?.positions.find((p) => p.id === n.positionId)?.assets ?? []
            }
            status={statuses[n.id] ?? 'pending'}
            progress={progress[n.id] ?? emptyProgress()}
            content={content}
            rejection={rejections[n.id]}
            inheritedFrom={
              n.inherits
                ? run.nodes.find((x) => x.id === n.inherits!.fromNodeId)?.action ?? ''
                : undefined
            }
            active={activeNodeId === n.id}
            onPick={() => onPickNode(n.id)}
            onApprove={() => onApprove(n.id)}
            onReject={(reason) => onReject(n.id, reason)}
          />
        )
      })}

      {isComplete && !focusMember && (
        <div className="ps-result">
          <div className="ps-result-head">
            <CheckCircle2 size={17} />
            <strong>{run.conclusion.title}</strong>
            <em>流程走完 · 共 {run.nodes.length} 个节点</em>
          </div>
          <ul>
            {run.conclusion.points.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
          <div className="ps-result-foot">
            {Math.max(0, ...Object.values(visits)) === 0
              ? '本次执行未经驳回回退'
              : `驳回回退 ${Math.max(0, ...Object.values(visits))} 次后通过`}
          </div>
        </div>
      )}
    </div>
  )
}
