import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronRight,
  Loader2,
  Package,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import ArtifactViewer from './ArtifactViewer'
import { ARTIFACT_ICON } from './artifactMeta'
import type { NodeProgress } from './useSimulationPlayback'
import type { SimMember, SimNode, SimNodeStatus, SimRunContent } from './types'

const STATUS_LABEL: Record<SimNodeStatus, string> = {
  pending: '待执行',
  running: '进行中',
  awaiting: '待你确认',
  done: '已完成',
  rejected: '已驳回',
}

/** 「生成中」的等待行 —— 让产物的出现有过程，而不是整块弹出来 */
function Generating({ label }: { label: string }) {
  return (
    <div className="ps-generating">
      <Loader2 size={13} className="ps-spin" />
      <span>{label}</span>
      <span className="ps-generating-bar">
        <i />
      </span>
    </div>
  )
}

export default function NodeCard({
  node,
  index,
  member,
  positionLabel,
  positionAssets,
  status,
  progress,
  content,
  rejection,
  inheritedFrom,
  active,
  onPick,
  onApprove,
  onReject,
}: {
  node: SimNode
  index: number
  member?: SimMember
  positionLabel: string
  positionAssets: string[]
  status: SimNodeStatus
  progress: NodeProgress
  content?: SimRunContent
  rejection?: string
  inheritedFrom?: string
  active: boolean
  onPick: () => void
  onApprove: () => void
  onReject: (reason: string) => void
}) {
  // 驳回要先填理由：驳回是人的决定，必须留下依据
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [viewing, setViewing] = useState(false)
  useEffect(() => {
    if (status !== 'awaiting') {
      setRejecting(false)
      setReason('')
    }
  }, [status])

  const thinkingLines = content?.thinking.slice(0, progress.thinking) ?? []
  const thinkingDone = !!content && progress.thinking >= content.thinking.length

  const conclusion = content?.conclusion ?? ''
  const shownConclusion = conclusion.slice(0, progress.conclusion)
  const conclusionStreaming = thinkingDone && progress.conclusion < conclusion.length

  const risks = (content?.risks ?? []).slice(0, progress.risks)
  const headsUp =
    thinkingDone &&
    progress.work === 2 &&
    progress.conclusion >= conclusion.length &&
    progress.risks < (content?.risks?.length ?? 0)

  const artifact = content?.artifact
  const handoff = content?.handoff

  return (
    <article
      id={`ps-node-${node.id}`}
      className={`ps-node is-${status}${active ? ' is-active' : ''}`}
      onClick={onPick}
    >
      <header className="ps-node-head">
        <span className="ps-node-idx">{index + 1}</span>
        {member && !member.human ? (
          <span className={`ps-node-avatar tone-${member.tone}`}>{member.person.slice(0, 1)}</span>
        ) : (
          <span className="ps-node-avatar tone-human">
            <Sparkles size={13} />
          </span>
        )}
        <span className="ps-node-who">
          <strong>{node.confirm ? '你（项目负责人）' : member?.person}</strong>
          <small>{node.confirm ? '人工介入' : `${positionLabel} · ${member?.org ?? ''}`}</small>
        </span>
        <span className="ps-node-action">{node.action}</span>
        <span className={`ps-node-status is-${status}`}>{STATUS_LABEL[status]}</span>
      </header>

      {node.dispatch && status !== 'pending' && (
        <div className="ps-dispatch">
          <span className="ps-dispatch-mark">
            <Sparkles size={13} />
          </span>
          <div>
            <strong>{node.dispatch}</strong>
            <small>执行标准取自该岗位智能体的基础配置：{positionAssets.join(' · ') || '—'}</small>
          </div>
        </div>
      )}

      {rejection && (
        <div className="ps-reject-note">
          <TriangleAlert size={14} />
          <div>
            <strong>你驳回了审批 · 流程退回本节点重跑</strong>
            <span className="ps-reject-reason">驳回理由：{rejection}</span>
          </div>
        </div>
      )}

      {node.inherits && !rejection && status !== 'pending' && (
        <div className="ps-inherit">
          <TriangleAlert size={14} />
          <div>
            <strong>承接上游风险 · {inheritedFrom}</strong>
            <span>{node.inherits.label}</span>
          </div>
        </div>
      )}

      {thinkingLines.length > 0 && (
        <div className="ps-thinking">
          <div className="ps-thinking-head">
            <span className="ps-thinking-pulse" />
            {thinkingDone ? '数字分身推理' : '数字分身推理中'}
          </div>
          <ol>
            {thinkingLines.map((line, i) => (
              <li key={i} className={i === thinkingLines.length - 1 && !thinkingDone ? 'is-live' : ''}>
                {line}
              </li>
            ))}
          </ol>
        </div>
      )}

      {thinkingDone && progress.work === 1 && <Generating label="正在整理结论…" />}

      {thinkingDone && progress.work === 2 && content?.work && (
        <div className="ps-work ps-reveal">
          <span className="ps-block-label">做了什么</span>
          <p>{content.work}</p>
        </div>
      )}

      {(progress.work === 2 || conclusionStreaming) && conclusion && (
        <div className="ps-conclusion ps-reveal">
          <span className="ps-block-label">结论</span>
          <p>
            {shownConclusion}
            {conclusionStreaming && <span className="ps-caret" />}
          </p>
        </div>
      )}

      {risks.length > 0 && (
        <div className="ps-risks ps-reveal">
          <span className="ps-block-label">本次风险提示（传递给下游）</span>
          <ul>
            {risks.map((r, i) => (
              <li key={i} className="ps-reveal">
                <TriangleAlert size={13} />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {headsUp && <Generating label="正在评估风险影响…" />}

      {artifact && progress.artifact === 1 && (
        <Generating label={`正在生成交付物《${artifact.name}》…`} />
      )}

      {artifact && progress.artifact === 2 && (
        <button
          type="button"
          className="ps-artifact ps-reveal"
          onClick={(e) => {
            e.stopPropagation()
            setViewing(true)
          }}
        >
          {(() => {
            const Icon = ARTIFACT_ICON[artifact.kind]
            return (
              <span className="ps-artifact-icon">
                <Icon size={16} />
              </span>
            )
          })()}
          <span className="ps-artifact-text">
            <strong>{artifact.name}</strong>
            <small>{artifact.summary}</small>
          </span>
          <span className="ps-artifact-open">
            查看
            <ChevronRight size={13} />
          </span>
        </button>
      )}

      {viewing && artifact && (
        <ArtifactViewer
          artifact={artifact}
          nodeAction={node.action}
          producer={`${member?.person ?? '—'} · ${positionLabel}`}
          onClose={() => setViewing(false)}
        />
      )}

      {handoff && progress.handoff === 1 && <Generating label="正在整理需要下游做什么…" />}

      {handoff && progress.handoff === 2 && (
        <div className="ps-handoff ps-reveal">
          <span className="ps-handoff-icon">
            <ArrowRight size={14} />
          </span>
          <div>
            <strong>需要下面岗位做什么</strong>
            <span>{handoff}</span>
          </div>
        </div>
      )}

      {node.confirm && status === 'awaiting' && !rejecting && (
        <div className="ps-confirm">
          <div className="ps-confirm-head">
            <span className="ps-confirm-mark">
              <TriangleAlert size={15} />
            </span>
            <strong>{node.confirm.question}</strong>
          </div>
          <p>{node.confirm.description}</p>
          <div className="ps-confirm-actions">
            <button type="button" className="ps-btn-primary" onClick={onApprove}>
              <Check size={14} />
              {node.confirm.approveLabel}
            </button>
            <button
              type="button"
              className="ps-btn-ghost"
              onClick={() => {
                setRejecting(true)
                setReason(node.confirm!.rejectReason)
              }}
            >
              {node.confirm.rejectLabel}
            </button>
          </div>
        </div>
      )}

      {node.confirm && status === 'awaiting' && rejecting && (
        <div className="ps-confirm is-rejecting">
          <div className="ps-confirm-head">
            <span className="ps-confirm-mark is-danger">
              <TriangleAlert size={15} />
            </span>
            <strong>{node.confirm.rejectLabel}</strong>
          </div>
          <p className="ps-confirm-lead">
            退回后，对应岗位会按你写的理由重跑本段流程。理由会记录在流程里，作为重跑依据。
          </p>
          <label className="ps-reject-field">
            <span>驳回理由（必填）</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="说明哪里不满足要求，例如：结论未覆盖高并发场景，需补充压力测试"
            />
          </label>
          <div className="ps-confirm-actions">
            <button
              type="button"
              className="ps-btn-danger"
              disabled={!reason.trim()}
              onClick={() => {
                onReject(reason.trim())
                setRejecting(false)
              }}
            >
              确认驳回并退回
            </button>
            <button
              type="button"
              className="ps-btn-ghost"
              onClick={() => {
                setRejecting(false)
                setReason('')
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {node.confirm && status === 'done' && (
        <div className="ps-confirm-done">
          <Check size={14} />
          已批准，流程继续
        </div>
      )}

      {node.confirm && status === 'pending' && (
        <div className="ps-confirm-pending">
          <Package size={13} />
          等待上游节点完成后进入人工审批
        </div>
      )}
    </article>
  )
}
