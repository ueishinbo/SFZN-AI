import { memo, useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  Loader2,
  ListChecks,
  MessageSquare,
  Package,
  Pause,
  Sparkles,
  TriangleAlert,
  UserRound,
} from 'lucide-react'
import ArtifactViewer from './ArtifactViewer'
import { ARTIFACT_ICON } from './artifactMeta'
import type { NodeProgress } from './useSimulationPlayback'
import type { SimExchangeTurn, SimMember, SimNode, SimNodeStatus, SimRunContent } from './types'

const STATUS_LABEL: Record<SimNodeStatus, string> = {
  pending: '待执行',
  running: '进行中',
  awaiting: '待你确认',
  done: '已完成',
  rejected: '已驳回',
}

/** 「生成中」的等待行 */
function Generating({ label }: { label: string }) {
  return (
    <div className="ps2-generating">
      <Loader2 size={13} className="ps2-spin" />
      <span>{label}</span>
      <span className="ps2-generating-bar">
        <i />
      </span>
    </div>
  )
}

/** 一条聊天消息；streaming = 正在逐字码出，光标跟着走 */
function MsgRow({
  turn,
  text,
  streaming,
  person,
  tone,
  twinLabel,
  peerLabel,
  youPick,
  onPick,
  onAnswerYou,
  waiting,
}: {
  turn: SimExchangeTurn
  text: string
  streaming?: boolean
  person: string
  tone: string
  twinLabel: string
  peerLabel: string
  /** 你已选的选项（turn.from === 'you' 时用） */
  youPick?: string
  /** 你选了之后的回调 */
  onPick?: (choice: string) => void
  /** 选完之后通知引擎继续推进 */
  onAnswerYou?: () => void
  /** 正停在这里等你选（只有「当前这一句」才为 true，回看历史时不显示） */
  waiting?: boolean
}) {
  const mine = turn.from === 'twin'
  const isYou = turn.from === 'you'
  return (
    <li className={`ps2-msg is-${turn.from}${streaming ? '' : ' ps2-reveal'}${waiting ? ' is-waiting' : ''}`}>
      {isYou ? (
        <span className="ps2-msg-avatar is-you">
          <UserRound size={14} />
        </span>
      ) : mine ? (
        <span className={`ps2-msg-avatar tone-${tone}`}>
          {person.slice(0, 1)}
        </span>
      ) : (
        <span className="ps2-msg-avatar is-agent">
          <Bot size={14} />
        </span>
      )}
      <div className="ps2-msg-main">
        <span className="ps2-msg-who">{isYou ? '数字分身 → 你' : (mine ? twinLabel : peerLabel)}</span>
        {waiting && (
          <span className="ps2-you-head">
            <Pause size={11} />
            流程暂停 · 需要你决定
          </span>
        )}
        <p className="ps2-msg-bubble">
          {text}
          {streaming && <span className="ps2-caret" />}
        </p>
        {isYou && turn.options && (
          <div className="ps2-choice">
            {turn.options.map((opt) => (
              <button
                key={opt}
                type="button"
                className={youPick === opt ? 'is-picked' : ''}
                disabled={!!youPick}
                onClick={(e) => {
                  e.stopPropagation()
                  onPick?.(opt)
                  onAnswerYou?.()
                }}
              >
                <span className="ps2-choice-mark" />
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </li>
  )
}

/** 「对方正在输入…」——换人说话前后的那段停顿 */
function TypingRow({
  from,
  person,
  tone,
  twinLabel,
  peerLabel,
}: {
  from: 'twin' | 'agent' | 'you'
  person: string
  tone: string
  twinLabel: string
  peerLabel: string
}) {
  const mine = from === 'twin'
  const isYou = from === 'you'
  return (
    <li className={`ps2-msg is-${from}`}>
      {isYou ? (
        <span className="ps2-msg-avatar is-you">
          <UserRound size={14} />
        </span>
      ) : mine ? (
        <span className={`ps2-msg-avatar tone-${tone}`}>
          {person.slice(0, 1)}
        </span>
      ) : (
        <span className="ps2-msg-avatar is-agent">
          <Bot size={14} />
        </span>
      )}
      <div className="ps2-msg-main">
        <span className="ps2-msg-who">{isYou ? '数字分身 → 你' : (mine ? twinLabel : peerLabel)}</span>
        <span className="ps2-msg-typing">
          <i />
          <i />
          <i />
        </span>
      </div>
    </li>
  )
}

// 性能：整页每次 tick 都会重渲染，这里必须 memo ——
// 只让「正在跑的那张卡」重画；否则 7 张卡 × 二十几次/秒的重渲染会把主线程拖死（实测卡死在第 4 个节点）。
// 注意：给 NodeCard 传的 props 必须引用稳定（回调用带 id 的签名、空进度用 EMPTY_PROGRESS 单例）。
const NodeCard = memo(NodeCardInner)
export default NodeCard

function NodeCardInner({
  node,
  index,
  member,
  positionLabel,
  positionAssets,
  status,
  progress,
  content,
  exchange,
  rejection,
  inheritedFrom,
  active,
  onPickNode,
  onApproveNode,
  onRejectNode,
  onAnswerYou,
}: {
  node: SimNode
  index: number
  member?: SimMember
  positionLabel: string
  positionAssets: string[]
  status: SimNodeStatus
  progress: NodeProgress
  content?: SimRunContent
  exchange: SimExchangeTurn[]
  rejection?: string
  inheritedFrom?: string
  active: boolean
  onPickNode: (id: string) => void
  onApproveNode: (id: string) => void
  onRejectNode: (id: string, reason: string) => void
  onAnswerYou: (id: string) => void
}) {
  // 驳回要先填理由：驳回是人的决定，必须留下依据
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [viewing, setViewing] = useState(false)
  /** 你在沟通过程里选的选项（数字分身向你发问时） */
  const [youPick, setYouPick] = useState('')

  // 两个视图：沟通过程（先播）/ 执行过程
  const [tab, setTab] = useState<'exchange' | 'exec'>('exchange')
  const autoRef = useRef(true)

  const exchangeDone = progress.exchange >= exchange.length
  /** 已完整码完的句子 */
  const doneTurns = exchange.slice(0, progress.exchange)
  /** 正在码的那一句 */
  const currentTurn = exchangeDone ? null : exchange[progress.exchange]
  const currentText = currentTurn ? currentTurn.text.slice(0, progress.exchangeChars) : ''
  const currentTyping = !!currentTurn && progress.exchangeChars > 0
  /** 正停在这里等你选：问题已码完、还没选（引擎此时不会往下推进） */
  const waitingYou =
    !!currentTurn &&
    currentTurn.from === 'you' &&
    !!currentTurn.options &&
    progress.exchangeChars >= currentTurn.text.length

  useEffect(() => {
    if (status !== 'awaiting') {
      setRejecting(false)
      setReason('')
    }
  }, [status])

  /** 重跑时恢复自动切换 */
  useEffect(() => {
    if (status === 'pending') {
      autoRef.current = true
      setTab('exchange')
    }
  }, [status])

  /** 自动切换：沟通过程播完 → 执行过程；节点完成后停在执行过程 */
  useEffect(() => {
    if (!autoRef.current) return
    if (status === 'pending') return
    if (status === 'done' || status === 'awaiting') {
      setTab('exec')
      return
    }
    setTab(exchangeDone ? 'exec' : 'exchange')
  }, [status, exchangeDone])

  const pickTab = (next: 'exchange' | 'exec') => {
    autoRef.current = false
    setTab(next)
  }

  const twinLabel = `${member?.person ?? '分身'} 的数字分身`
  const peerLabel = node.confirm ? '你' : `${positionLabel}智能体`

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
  const tasks = content?.tasks ?? []

  /** 任务列表的完成度：跟着节点的执行里程碑走（想清楚 → 做完 → 出结论 → 出交付物） */
  const milestones = [
    thinkingDone,
    progress.work === 2,
    conclusion.length > 0 && progress.conclusion >= conclusion.length,
    !artifact || progress.artifact === 2,
  ].filter(Boolean).length
  const taskDone =
    status === 'done'
      ? tasks.length
      : tasks.length
        ? Math.min(tasks.length, Math.round((milestones / 4) * tasks.length))
        : 0
  const tasksVisible = exchangeDone && tasks.length > 0

  /** tab 上的角标：沟通还没播完显示句数，播完后有任务列表就显示任务进度 */
  const tabBadge = !exchangeDone
    ? `${Math.min(progress.exchange, exchange.length)}/${exchange.length} 句`
    : tasks.length
      ? `${taskDone}/${tasks.length} 项`
      : `${exchange.length} 句`

  return (
    <article
      id={`ps2-node-${node.id}`}
      className={`ps2-node is-${status}${active ? ' is-active' : ''}`}
      onClick={() => onPickNode(node.id)}
    >
      <header className="ps2-node-head">
        <span className="ps2-node-idx">{index + 1}</span>
        {member && !member.human ? (
          <span className={`ps2-node-avatar tone-${member.tone}`}>{member.person.slice(0, 1)}</span>
        ) : (
          <span className="ps2-node-avatar tone-human">
            <Sparkles size={13} />
          </span>
        )}
        <span className="ps2-node-who">
          <strong>{node.confirm ? '你（项目负责人）' : member?.person}</strong>
          <small>{node.confirm ? '人工介入' : `${positionLabel} · ${member?.org ?? ''}`}</small>
        </span>
        <span className="ps2-node-action">{node.action}</span>
        <span className={`ps2-node-status is-${status}`}>{STATUS_LABEL[status]}</span>
      </header>

      {rejection && (
        <div className="ps2-reject-note">
          <TriangleAlert size={14} />
          <div>
            <strong>你驳回了审批 · 流程退回本节点重跑</strong>
            <span className="ps2-reject-reason">驳回理由：{rejection}</span>
          </div>
        </div>
      )}

      {node.inherits && !rejection && status !== 'pending' && (
        <div className="ps2-inherit">
          <TriangleAlert size={14} />
          <div>
            <strong>承接上游风险 · {inheritedFrom}</strong>
            <span>{node.inherits.label}</span>
          </div>
        </div>
      )}

      {/* 两个视图的切换 */}
      <div className="ps2-tabs">
        <button
          type="button"
          className={`ps2-tab${tab === 'exchange' ? ' is-on' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            pickTab('exchange')
          }}
        >
          <MessageSquare size={12} />
          沟通过程
          <em>{tabBadge}</em>
        </button>
        <button
          type="button"
          className={`ps2-tab${tab === 'exec' ? ' is-on' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            pickTab('exec')
          }}
        >
          执行过程
        </button>
      </div>

      {/* ── 沟通过程：一个"聊天窗口" ── */}
      {tab === 'exchange' && (
        <div className="ps2-chat">
          <div className="ps2-chat-bar">
            <span
              className={`ps2-chat-live${waitingYou ? ' is-waiting' : exchangeDone ? ' is-done' : ''}`}
            />
            <span className="ps2-chat-pair">
              <strong>{member?.person ?? '分身'} 的数字分身</strong>
              <i>⇄</i>
              <strong>{peerLabel}</strong>
            </span>
            <span className={`ps2-chat-meta${waitingYou ? ' is-waiting' : ''}`}>
              {waitingYou
                ? '等待你的决定'
                : `${exchangeDone ? '沟通结束' : '沟通中'} · ${Math.min(progress.exchange, exchange.length)}/${exchange.length} 句`}
            </span>
          </div>

          <div className="ps2-chat-body">
            {node.dispatch && (
              <div className="ps2-chat-sys">
                <Sparkles size={12} />
                <span>
                  {node.dispatch}｜执行标准取自该岗位智能体的基础配置：
                  {positionAssets.join(' · ') || '—'}
                </span>
              </div>
            )}

            <ul className="ps2-chat-list">
              {doneTurns.map((t, i) => (
                <MsgRow
                  key={i}
                  turn={t}
                  text={t.text}
                  person={member?.person ?? '分身'}
                  tone={member?.tone ?? 'blue'}
                  twinLabel={twinLabel}
                  peerLabel={peerLabel}
                  youPick={t.from === 'you' ? youPick : undefined}
                  onPick={t.from === 'you' ? (choice) => setYouPick(choice) : undefined}
                  onAnswerYou={t.from === 'you' ? () => onAnswerYou(node.id) : undefined}
                />
              ))}

              {currentTurn && currentTyping && (
                <MsgRow
                  key={doneTurns.length}
                  turn={currentTurn}
                  text={currentText}
                  streaming
                  person={member?.person ?? '分身'}
                  tone={member?.tone ?? 'blue'}
                  twinLabel={twinLabel}
                  peerLabel={peerLabel}
                  youPick={currentTurn.from === 'you' ? youPick : undefined}
                  onPick={currentTurn.from === 'you' ? (choice) => setYouPick(choice) : undefined}
                  onAnswerYou={currentTurn.from === 'you' ? () => onAnswerYou(node.id) : undefined}
                  waiting={waitingYou}
                />
              )}

              {currentTurn && !currentTyping && (
                <TypingRow
                  key={`typing-${doneTurns.length}`}
                  from={currentTurn.from}
                  person={member?.person ?? '分身'}
                  tone={member?.tone ?? 'blue'}
                  twinLabel={twinLabel}
                  peerLabel={peerLabel}
                />
              )}
            </ul>

            {tasksVisible && (
              <div className="ps2-tasks">
                <div className="ps2-tasks-head">
                  <ListChecks size={13} />
                  <strong>任务列表</strong>
                  <em>
                    {taskDone}/{tasks.length}
                  </em>
                </div>
                <ul>
                  {tasks.map((t, i) => {
                    const done = i < taskDone
                    return (
                      <li key={i} className={done ? 'is-done' : ''}>
                        <span className="ps2-tasks-mark">{done && <Check size={11} />}</span>
                        <span className="ps2-tasks-text">{t}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 执行过程 ── */}
      {tab === 'exec' && (
        <div className="ps2-exec">
          {thinkingLines.length > 0 && (
            <div className="ps2-thinking">
              <div className="ps2-thinking-head">
                <span className="ps2-thinking-pulse" />
                {thinkingDone ? `${peerLabel} 执行完成` : `${peerLabel} 执行中`}
              </div>
              <ol>
                {thinkingLines.map((line, i) => (
                  <li
                    key={i}
                    className={i === thinkingLines.length - 1 && !thinkingDone ? 'is-live' : ''}
                  >
                    {line}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {thinkingDone && progress.work === 1 && <Generating label="正在整理结论…" />}

          {thinkingDone && progress.work === 2 && content?.work && (
            <div className="ps2-work ps2-reveal">
              <span className="ps2-block-label">做了什么</span>
              <p>{content.work}</p>
            </div>
          )}

          {(progress.work === 2 || conclusionStreaming) && conclusion && (
            <div className="ps2-conclusion ps2-reveal">
              <span className="ps2-block-label">结论</span>
              <p>
                {shownConclusion}
                {conclusionStreaming && <span className="ps2-caret" />}
              </p>
            </div>
          )}

          {risks.length > 0 && (
            <div className="ps2-risks ps2-reveal">
              <span className="ps2-block-label">本次风险提示（传递给下游）</span>
              <ul>
                {risks.map((r, i) => (
                  <li key={i} className="ps2-reveal">
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
              className="ps2-artifact ps2-reveal"
              onClick={(e) => {
                e.stopPropagation()
                setViewing(true)
              }}
            >
              {(() => {
                const Icon = ARTIFACT_ICON[artifact.kind]
                return (
                  <span className="ps2-artifact-icon">
                    <Icon size={16} />
                  </span>
                )
              })()}
              <span className="ps2-artifact-text">
                <strong>{artifact.name}</strong>
                <small>{artifact.summary}</small>
              </span>
              <span className="ps2-artifact-open">
                查看
                <ChevronRight size={13} />
              </span>
            </button>
          )}

          {handoff && progress.handoff === 1 && <Generating label="正在整理需要下游做什么…" />}

          {handoff && progress.handoff === 2 && (
            <div className="ps2-handoff ps2-reveal">
              <span className="ps2-handoff-icon">
                <ArrowRight size={14} />
              </span>
              <div>
                <strong>需要下面岗位做什么</strong>
                <span>{handoff}</span>
              </div>
            </div>
          )}

          {node.confirm && status === 'awaiting' && !rejecting && (
            <div className="ps2-confirm">
              <div className="ps2-confirm-head">
                <span className="ps2-confirm-mark">
                  <TriangleAlert size={15} />
                </span>
                <strong>{node.confirm.question}</strong>
              </div>
              <p>{node.confirm.description}</p>
              <div className="ps2-confirm-actions">
                <button type="button" className="ps2-btn-primary" onClick={() => onApproveNode(node.id)}>
                  <Check size={14} />
                  {node.confirm.approveLabel}
                </button>
                <button
                  type="button"
                  className="ps2-btn-ghost"
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
            <div className="ps2-confirm is-rejecting">
              <div className="ps2-confirm-head">
                <span className="ps2-confirm-mark is-danger">
                  <TriangleAlert size={15} />
                </span>
                <strong>{node.confirm.rejectLabel}</strong>
              </div>
              <p className="ps2-confirm-lead">
                退回后，对应岗位会按你写的理由重跑本段流程。理由会记录在流程里，作为重跑依据。
              </p>
              <label className="ps2-reject-field">
                <span>驳回理由（必填）</span>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="说明哪里不满足要求，例如：结论未覆盖高并发场景，需补充压力测试"
                />
              </label>
              <div className="ps2-confirm-actions">
                <button
                  type="button"
                  className="ps2-btn-danger"
                  disabled={!reason.trim()}
                  onClick={() => {
                    onRejectNode(node.id, reason.trim())
                    setRejecting(false)
                  }}
                >
                  确认驳回并退回
                </button>
                <button
                  type="button"
                  className="ps2-btn-ghost"
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
            <div className="ps2-confirm-done">
              <Check size={14} />
              已批准，流程继续
            </div>
          )}

          {node.confirm && status === 'pending' && (
            <div className="ps2-confirm-pending">
              <Package size={13} />
              等待上游节点完成后进入人工审批
            </div>
          )}
        </div>
      )}

      {viewing && artifact && (
        <ArtifactViewer
          artifact={artifact}
          nodeAction={node.action}
          producer={`${member?.person ?? '—'} · ${positionLabel}`}
          onClose={() => setViewing(false)}
        />
      )}
    </article>
  )
}
