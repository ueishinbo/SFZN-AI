import { memo } from 'react'
import { ARTIFACT_LABEL } from './artifactMeta'
import type { SimNode, SimNodeStatus, SimRun } from './types'

const STATUS_LABEL: Record<SimNodeStatus, string> = {
  pending: '待执行',
  running: '执行中',
  awaiting: '待你确认',
  done: '已完成',
  rejected: '已驳回',
}

/** 标签文案：人工介入优先，其余按交付物类型 */
function kindLabel(node: SimNode) {
  if (node.confirm) return '人工介入'
  const kind = node.run?.artifact?.kind
  return kind ? ARTIFACT_LABEL[kind] : '讨论'
}

/** 稳定的样式键（不要用中文标签当类名） */
function kindKey(node: SimNode) {
  if (node.confirm) return 'confirm'
  return node.run?.artifact?.kind ?? 'none'
}

/**
 * 工作流全图 —— 纯线性节点序列（对齐流程定义的能力：没有大节点层级）。
 * 节点之间用带条件的连接线串起来；有回退边时在来源节点下方标注。
 */
const SimulationFlowMap = memo(SimulationFlowMapInner)
export default SimulationFlowMap

function SimulationFlowMapInner({
  run,
  statuses,
  activeNodeId,
  onPickNode,
  memberName,
  positionName,
}: {
  run: SimRun
  statuses: Record<string, SimNodeStatus>
  activeNodeId: string | null
  onPickNode: (id: string) => void
  memberName: (id: string) => string
  positionName: (node: SimNode) => string
}) {
  const indexOf = (id: string) => run.nodes.findIndex((n) => n.id === id)
  const backEdges = run.edges.filter((e) => indexOf(e.to) < indexOf(e.from))

  /** 进入某个节点的正向条件 */
  const incoming = (id: string) => {
    const idx = indexOf(id)
    const e = run.edges.find((x) => x.to === id && indexOf(x.from) < idx)
    return e?.condition ?? ''
  }

  return (
    <div className="ps2-flow">
      {run.nodes.map((n, i) => {
        const status = statuses[n.id] ?? 'pending'
        const outgoingBack = backEdges.filter((e) => e.from === n.id)
        const link = i > 0 ? incoming(n.id) : ''
        return (
          <div className="ps2-flow-step" key={n.id}>
            {i > 0 && (
              <div className="ps2-flow-arrow">
                <span className="ps2-flow-arrow-stem" />
                {link && <span className="ps2-flow-arrow-label">{link}</span>}
              </div>
            )}
            <button
              type="button"
              className={`ps2-flow-node is-${status}${activeNodeId === n.id ? ' is-active' : ''}`}
              onClick={() => onPickNode(n.id)}
            >
              <span className="ps2-flow-node-dot" />
              <span className="ps2-flow-node-text">
                <strong>
                  <em className="ps2-flow-node-no">{i + 1}</em>
                  {n.action}
                </strong>
                <small>
                  {n.confirm ? '你' : memberName(n.actorId)} ·{' '}
                  {n.confirm ? '人工介入' : positionName(n)}
                </small>
              </span>
              <span className="ps2-flow-node-tags">
                <i className={`is-kind-${kindKey(n)}`}>{kindLabel(n)}</i>
              </span>
              <span className={`ps2-flow-node-status is-${status}`}>{STATUS_LABEL[status]}</span>
            </button>
            {outgoingBack.map((e) => {
              const target = run.nodes.find((x) => x.id === e.to)
              return (
                <div className="ps2-flow-branch" key={`${e.from}-${e.to}`}>
                  <span className="ps2-flow-branch-cond">↰ {e.condition}</span>
                  {target && <span className="ps2-flow-branch-desc">退回「{target.action}」</span>}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
