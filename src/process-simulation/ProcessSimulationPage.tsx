import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, Send, Sparkles } from 'lucide-react'
import SimulationFlowMap from './SimulationFlowMap'
import SimulationTimeline from './SimulationTimeline'
import { purchaseRun, simulationRuns } from './script'
import type { SimMember, SimNode } from './types'
import { useSimulationPlayback } from './useSimulationPlayback'
import './process-simulation.css'

export default function ProcessSimulationPage() {
  // 默认选中「采购申请与执行流程」
  const [runId, setRunId] = useState(purchaseRun.id)
  const run = useMemo(
    () => simulationRuns.find((r) => r.id === runId) ?? simulationRuns[0],
    [runId],
  )

  const [task, setTask] = useState(run.task)
  const [started, setStarted] = useState(false)
  const [focusMember, setFocusMember] = useState<string | null>(null)
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null)

  // 执行跟随：自动把正在执行的节点滚进视野；用户一旦自己滚动就停
  const [follow, setFollow] = useState(true)
  const rootRef = useRef<HTMLDivElement>(null)
  const followRef = useRef(true)
  const lastFollowRef = useRef(0)
  const prevRunningRef = useRef<string | null>(null)

  useEffect(() => {
    setTask(run.task)
    setStarted(false)
    setFocusMember(null)
    setActiveNodeId(null)
  }, [run])

  const pb = useSimulationPlayback(run, started)

  followRef.current = follow

  /** 正在执行的节点 */
  const runningId = useMemo(
    () => run.nodes.find((n) => pb.statuses[n.id] === 'running')?.id ?? null,
    [pb.statuses, run],
  )

  /** 任何内容增长都会改变这个值，用来触发跟随 */
  const pulse = useMemo(
    () =>
      Object.values(pb.progress).reduce(
        (a, p) =>
          a + p.exchange + p.exchangeChars + p.thinking + p.conclusion + p.risks + p.work + p.artifact + p.handoff,
        0,
      ),
    [pb.progress],
  )

  const scrollToNode = useCallback((id: string, block: ScrollLogicalPosition = 'start') => {
    document.getElementById(`ps2-node-${id}`)?.scrollIntoView({ behavior: 'smooth', block })
  }, [])

  /** 左栏的滚动高度上限：实测滚动容器高度，并扣掉页头占掉的那一段。
     不能用 100vh —— 应用整体带 zoom，vh 会被一起放大，窗口变矮时左栏会比可视区还高，
     底部被切掉且滚不到。全程用 layout px（clientHeight / offsetHeight），与 zoom 无关。 */
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const scroller = root.closest('.admin-content') as HTMLElement | null
    if (!scroller) return
    const apply = () => {
      const header = root.querySelector('.ps2-top') as HTMLElement | null
      const padTop = parseFloat(getComputedStyle(scroller).paddingTop) || 0
      const topGap = padTop + (header?.offsetHeight ?? 0) + 18
      const max = Math.max(240, Math.floor(scroller.clientHeight - topGap - 8))
      root.style.setProperty('--ps2-left-max', `${max}px`)
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(scroller)
    window.addEventListener('resize', apply)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', apply)
    }
  }, [])

  /** 只有「人真的动手了」才停止跟随：滚轮 / 触摸 / 翻页键。
      用 scroll 事件会被我们自己的程序化滚动干扰，所以不监听 scroll。 */
  useEffect(() => {
    const scroller = rootRef.current?.closest('.admin-content') as HTMLElement | null
    if (!scroller) return
    const stop = (e: Event) => {
      // 在左侧栏里滚动不算「离开执行区」
      if (e.target instanceof Element && e.target.closest('.ps2-left')) return
      if (followRef.current) setFollow(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) stop(e)
    }
    scroller.addEventListener('wheel', stop, { passive: true })
    scroller.addEventListener('touchmove', stop, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      scroller.removeEventListener('wheel', stop)
      scroller.removeEventListener('touchmove', stop)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  /** 跟随执行：换节点时对齐到卡片顶部；同一节点内容变长时把底部带进视野 */
  useEffect(() => {
    if (!follow || !runningId || !started) return
    const scroller = rootRef.current?.closest('.admin-content') as HTMLElement | null
    if (!scroller) return

    if (prevRunningRef.current !== runningId) {
      prevRunningRef.current = runningId
      scrollToNode(runningId)
      return
    }

    const now = Date.now()
    if (now - lastFollowRef.current < 700) return
    const el = document.getElementById(`ps2-node-${runningId}`)
    if (!el) return
    const gap = scroller.getBoundingClientRect().bottom - el.getBoundingClientRect().bottom
    if (gap >= 96) return
    lastFollowRef.current = now
    scroller.scrollBy({ top: 96 - gap, behavior: 'smooth' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulse, follow, runningId, started, scrollToNode])

  const memberOf = useCallback(
    (id: string): SimMember | undefined => run.members.find((m) => m.id === id),
    [run],
  )
  /** 给 FlowMap 的稳定回调 —— 内联箭头会让 memo 失效 */
  const memberName = useCallback((id: string) => memberOf(id)?.person ?? '', [memberOf])
  const positionLabelOf = useCallback(
    (node: SimNode) => {
      if (node.confirm) return '人工介入'
      const m = memberOf(node.actorId)
      return m?.positions.find((p) => p.id === node.positionId)?.name ?? '—'
    },
    [memberOf],
  )

  const pickNode = useCallback((id: string) => {
    setActiveNodeId(id)
    setFocusMember(null)
    setFollow(false)
    window.requestAnimationFrame(() => scrollToNode(id, 'center'))
  }, [scrollToNode])

  const send = () => {
    setStarted(true)
    setFocusMember(null)
    setActiveNodeId(null)
    setFollow(true)
    prevRunningRef.current = null
    pb.reset()
  }

  const backToRunning = () => {
    setFollow(true)
    if (runningId) scrollToNode(runningId)
  }

  const progress = pb.total ? Math.round((pb.doneCount / pb.total) * 100) : 0

  return (
    <div className="ps2" ref={rootRef}>
      <header className="ps2-top">
        <div className="ps2-top-text">
          <p className="ps2-eyebrow">PROCESS SIMULATION</p>
          <h1>流程试运行</h1>
        </div>

        <div className="ps2-top-controls">
          <label className="ps2-field">
            <small>执行流程</small>
            <select value={run.id} onChange={(e) => setRunId(e.target.value)}>
              {simulationRuns.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.workflow}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="ps2-body">
        <aside className="ps2-left">
          <section className="ps2-panel">
            <header className="ps2-panel-head">
              <h2>岗位与人员</h2>
              <small>{run.members.length} 人参与 · 分身持有岗位智能体</small>
            </header>
            <div className="ps2-members">
              {run.members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`ps2-member tone-${m.tone}${focusMember === m.id ? ' is-active' : ''}`}
                  onClick={() => {
                    setFocusMember(focusMember === m.id ? null : m.id)
                    setFollow(false)
                  }}
                >
                  <span className="ps2-member-avatar">
                    {m.human ? <Sparkles size={14} /> : m.person.slice(0, 1)}
                  </span>
                  <span className="ps2-member-body">
                    <span className="ps2-member-line">
                      <strong>{m.person}</strong>
                      <i>{m.org}</i>
                    </span>
                    {m.human ? (
                      <span className="ps2-member-tags">
                        <em className="is-human">人工介入</em>
                      </span>
                    ) : (
                      <span className="ps2-member-tags">
                        {m.positions.map((p) => (
                          <em key={p.id} className="is-agent">
                            {p.name}
                          </em>
                        ))}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="ps2-panel">
            <header className="ps2-panel-head">
              <h2>工作流</h2>
              <small>
                {run.nodes.length} 个节点 · 线性流程
                {run.edges.some((e) => run.nodes.findIndex((n) => n.id === e.to) < run.nodes.findIndex((n) => n.id === e.from)) &&
                  ' · 含 1 条回退'}
              </small>
            </header>
            <SimulationFlowMap
              run={run}
              statuses={pb.statuses}
              activeNodeId={activeNodeId}
              onPickNode={pickNode}
              memberName={memberName}
              positionName={positionLabelOf}
            />
          </section>
        </aside>

        <main className="ps2-right">
          <section className="ps2-compose">
            <header className="ps2-compose-head">
              <div>
                <h2>任务内容</h2>
                <small>工作流已既定，填写本次任务内容后发起协同执行</small>
              </div>
              <div className="ps2-playback">
                <span className="ps2-progress">
                  <i style={{ width: `${progress}%` }} />
                </span>
                <em>
                  {!pb.hasRun
                    ? '未开始'
                    : pb.isComplete
                      ? '已完成'
                      : `进行中 ${pb.doneCount}/${pb.total}`}
                </em>
                <span className="ps2-speed">
                  <button
                    type="button"
                    className={pb.speed === 'normal' ? 'is-on' : ''}
                    onClick={() => pb.setSpeed('normal')}
                  >
                    正常速度
                  </button>
                  <button
                    type="button"
                    className={pb.speed === 'demo' ? 'is-on' : ''}
                    onClick={() => pb.setSpeed('demo')}
                  >
                    Demo ×2
                  </button>
                </span>
                {started && (
                  <button type="button" className="ps2-icon-btn" onClick={pb.togglePause}>
                    {pb.paused ? <Play size={14} /> : <Pause size={14} />}
                    {pb.paused ? '继续' : '暂停'}
                  </button>
                )}
              </div>
            </header>
            <textarea
              className="ps2-task-input"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="输入本次任务内容，例如：把「工单智能分派」做成可上线版本…"
            />
            <div className="ps2-compose-actions">
              <small>
                {started
                  ? '执行中可直接查看各节点，点击左侧人员或流程节点可切换视角'
                  : '发送后数字分身将按所选工作流自动执行，全过程可查看'}
              </small>
              <button type="button" className="ps2-btn-primary" onClick={send}>
                <Send size={15} />
                {started ? '重新发送' : '发送任务'}
              </button>
            </div>
          </section>

          <SimulationTimeline
            run={run}
            statuses={pb.statuses}
            progress={pb.progress}
            orch={pb.orch}
            orchDone={pb.orchDone}
            rejections={pb.rejections}
            visits={pb.visits}
            focusMember={focusMember}
            activeNodeId={activeNodeId}
            onPickNode={setActiveNodeId}
            onClearFocus={() => setFocusMember(null)}
            memberOf={memberOf}
            positionLabelOf={positionLabelOf}
            contentOf={pb.contentFor}
            exchangeOf={pb.exchangeFor}
            onApprove={pb.approve}
            onReject={pb.reject}
            onAnswerYou={pb.answerYou}
            isComplete={pb.isComplete}
            hasRun={pb.hasRun}
          />
        </main>
      </div>

      {started && !follow && runningId && (
        <button type="button" className="ps2-follow" onClick={backToRunning}>
          <Play size={13} />
          跟随执行 · 回到当前节点
        </button>
      )}
    </div>
  )
}
