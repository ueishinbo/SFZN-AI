import { useCallback, useEffect, useRef, useState } from 'react'
import type { SimExchangeTurn, SimNode, SimNodeStatus, SimRun, SimRunContent } from './types'

// ── 1 倍速的基础节奏 ───────────────────────────────────────────
// 每个节点先播「沟通过程」（分身 ↔ 子代理往返），播完自动切到「执行过程」。
// 执行过程内部按「思维链 → 整理结论 → 逐字结论 → 逐条风险 → 生成交付物 → 整理下游要求」推进。
const EXCHANGE_LEAD = 320 // 换人说话前的停顿（此时显示"正在输入"）
const EXCHANGE_CHAR_STEP = 3 // 沟通每步码出几个字
const EXCHANGE_CHAR_DELAY = 68 // 沟通每步间隔 → 约 44 字/秒（与逐字观感一致，但 tick 数更少）
const EXCHANGE_GAP = 280 // 一句码完后的停顿
const THINKING_DELAY = 1800 // 思维链每条
const WORK_GEN_DELAY = 600 // 「正在整理结论」的等待
const CONTENT_STEP = 2 // 结论每步字数
const CONTENT_DELAY = 70 // 结论每步间隔
const RISK_DELAY = 550 // 每条风险出现间隔
const ARTIFACT_GEN_DELAY = 1000 // 「正在生成交付物」的等待
const HANDOFF_GEN_DELAY = 800 // 「正在整理下游要求」的等待
const SETTLE_DELAY = 160 // 每一段落地后的喘息
const FINISH_DELAY = 900 // 节点收尾停顿

// 编排阶段（点「发送任务」后、真正开始执行前）
const ORCH_ITEM_DELAY = 420 // 每一条编排内容
const ORCH_STEP_GAP = 760 // 每步之间的停顿

/** 一个节点的生成进度 */
export type NodeProgress = {
  /** 已完整码出的沟通句数 */
  exchange: number
  /** 当前这一句已码出的字符数 */
  exchangeChars: number
  /** 已展示的思维链条数 */
  thinking: number
  /** 0 未开始 / 1 整理中 / 2 已完成 */
  work: 0 | 1 | 2
  /** 已展示的结论字符数 */
  conclusion: number
  /** 已展示的风险条数 */
  risks: number
  /** 0 未开始 / 1 生成中 / 2 已完成 */
  artifact: 0 | 1 | 2
  /** 0 未开始 / 1 整理中 / 2 已完成 */
  handoff: 0 | 1 | 2
}

export const emptyProgress = (): NodeProgress => ({
  exchange: 0,
  exchangeChars: 0,
  thinking: 0,
  work: 0,
  conclusion: 0,
  risks: 0,
  artifact: 0,
  handoff: 0,
})

/**
 * 空进度的单例。渲染时给没有进度的节点兜底必须用它，
 * 不能每次 render 现造一个新对象 —— 那会让 React.memo 失效（见 NodeCard）。
 */
export const EMPTY_PROGRESS = emptyProgress()

/** 编排阶段的进度：走到第几步、这一步已展开几条 */
export type OrchProgress = { step: number; item: number }
export const emptyOrch = (): OrchProgress => ({ step: 0, item: 0 })

/** 取节点本次执行使用的内容（回退重跑时用 revisit） */
export function contentFor(node: SimNode, visit: number): SimRunContent | undefined {
  if (node.confirm) return undefined
  return visit > 0 && node.revisit ? node.revisit : node.run
}

/** 取节点本次要播的沟通过程（人工介入节点是分身向「你」请示） */
export function exchangeFor(node: SimNode, visit: number): SimExchangeTurn[] {
  if (node.confirm) return node.confirmExchange ?? []
  return contentFor(node, visit)?.exchange ?? []
}

/** cursor 位置所在的一组节点（当前剧本为纯线性，一组即一个节点） */
export function groupAt(run: SimRun, index: number): string[] {
  const node = run.nodes[index]
  if (!node) return []
  if (!node.parallelGroup) return [node.id]
  const ids: string[] = []
  for (let i = index; i < run.nodes.length; i += 1) {
    if (run.nodes[i].parallelGroup === node.parallelGroup) ids.push(run.nodes[i].id)
    else break
  }
  return ids
}

const initialStatuses = (run: SimRun) =>
  Object.fromEntries(run.nodes.map((n) => [n.id, 'pending' as SimNodeStatus])) as Record<
    string,
    SimNodeStatus
  >

export function useSimulationPlayback(run: SimRun, enabled = true) {
  const [statuses, setStatuses] = useState<Record<string, SimNodeStatus>>(() => initialStatuses(run))
  const [progress, setProgress] = useState<Record<string, NodeProgress>>({})
  const [visits, setVisits] = useState<Record<string, number>>({})
  const [rejections, setRejections] = useState<Record<string, string>>({})
  const [cursor, setCursor] = useState(0)
  const [paused, setPaused] = useState(false)
  const [orch, setOrch] = useState<OrchProgress>(emptyOrch)
  const [orchDone, setOrchDone] = useState(false)
  const [resetVersion, setResetVersion] = useState(0)

  // 定时器与状态快照（供回调读取最新值，避免闭包过期）
  const timersRef = useRef<number[]>([])
  const tickRef = useRef<(id: string) => void>(() => {})
  const orchTickRef = useRef<() => void>(() => {})
  const progressRef = useRef<Record<string, NodeProgress>>({})
  const orchRef = useRef<OrchProgress>(emptyOrch())
  const visitsRef = useRef<Record<string, number>>({})
  const pausedRef = useRef(false)
  const statusesRef = useRef<Record<string, SimNodeStatus>>({})
  /** 已启动过的节点，防止 StrictMode 双跑 effect 导致流式重复启动 */
  const startedRef = useRef<Set<string>>(new Set())
  const orchStartedRef = useRef(false)
  progressRef.current = progress
  orchRef.current = orch
  visitsRef.current = visits
  pausedRef.current = paused
  statusesRef.current = statuses

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t))
    timersRef.current = []
  }, [])

  const schedule = useCallback((id: string, delay: number) => {
    if (pausedRef.current) return
    const t = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((x) => x !== t)
      tickRef.current(id)
    }, delay)
    timersRef.current.push(t)
  }, [])

  const scheduleOrch = useCallback((delay: number) => {
    if (pausedRef.current) return
    const t = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((x) => x !== t)
      orchTickRef.current()
    }, delay)
    timersRef.current.push(t)
  }, [])

  /** 单步推进：先播沟通过程，播完再进执行过程（每次只往前一格，然后排下一次） */
  const tick = useCallback(
    (id: string) => {
      if (pausedRef.current) return
      const node = run.nodes.find((n) => n.id === id)
      if (!node) return
      const visit = visitsRef.current[id] ?? 0
      const p = progressRef.current[id] ?? emptyProgress()
      const next: NodeProgress = { ...p }
      let delay = 0

      // ① 沟通过程：逐字码出，一句一句来（不是整句弹出）
      const exchange = exchangeFor(node, visit)
      if (p.exchange < exchange.length) {
        const cur = exchange[p.exchange].text
        if (p.exchangeChars < cur.length) {
          next.exchangeChars = Math.min(p.exchangeChars + EXCHANGE_CHAR_STEP, cur.length)
          delay = next.exchangeChars >= cur.length ? EXCHANGE_GAP : EXCHANGE_CHAR_DELAY
        } else {
          // 这一句码完了 → 换下一句，中间留一段"正在输入"
          next.exchange = p.exchange + 1
          next.exchangeChars = 0
          delay = EXCHANGE_LEAD
        }
        setProgress((prev) => ({ ...prev, [id]: next }))
        schedule(id, delay)
        return
      }

      // 人工介入节点：请示播完就停下等人工操作
      if (node.confirm) {
        setStatuses((prev) => (prev[id] === 'awaiting' ? prev : { ...prev, [id]: 'awaiting' }))
        return
      }

      const content = contentFor(node, visit)
      if (!content) return

      const riskCount = content.risks?.length ?? 0
      const conclusionLen = content.conclusion?.length ?? 0

      if (p.thinking < content.thinking.length) {
        next.thinking = p.thinking + 1
        delay = THINKING_DELAY
      } else if (p.work === 0) {
        next.work = 1
        delay = WORK_GEN_DELAY
      } else if (p.work === 1) {
        next.work = 2
        delay = SETTLE_DELAY
      } else if (p.conclusion < conclusionLen) {
        next.conclusion = Math.min(p.conclusion + CONTENT_STEP, conclusionLen)
        if (next.conclusion >= conclusionLen) delay = RISK_DELAY
        else delay = CONTENT_DELAY
      } else if (p.risks < riskCount) {
        next.risks = p.risks + 1
        delay = p.risks + 1 >= riskCount ? RISK_DELAY : RISK_DELAY
      } else if (content.artifact && p.artifact === 0) {
        next.artifact = 1
        delay = ARTIFACT_GEN_DELAY
      } else if (content.artifact && p.artifact === 1) {
        next.artifact = 2
        delay = SETTLE_DELAY
      } else if (content.handoff && p.handoff === 0) {
        next.handoff = 1
        delay = HANDOFF_GEN_DELAY
      } else if (content.handoff && p.handoff === 1) {
        next.handoff = 2
        delay = SETTLE_DELAY
      } else {
        const t = window.setTimeout(() => {
          timersRef.current = timersRef.current.filter((x) => x !== t)
          setStatuses((prev) => (prev[id] === 'awaiting' ? prev : { ...prev, [id]: 'done' }))
        }, FINISH_DELAY)
        timersRef.current.push(t)
        return
      }

      setProgress((prev) => ({ ...prev, [id]: next }))
      schedule(id, delay)
    },
    [run, schedule],
  )
  tickRef.current = tick

  /** 编排推进：一步的标题先亮出来，再逐条展开内容，然后进下一步 */
  const orchTick = useCallback(() => {
    if (pausedRef.current) return
    const steps = run.orchestration.steps
    const p = orchRef.current
    if (p.step >= steps.length) {
      setOrchDone(true)
      return
    }
    const cur = steps[p.step]
    if (p.item < cur.items.length) {
      const next = { step: p.step, item: p.item + 1 }
      setOrch(next)
      scheduleOrch(next.item >= cur.items.length ? ORCH_STEP_GAP : ORCH_ITEM_DELAY)
      return
    }
    setOrch({ step: p.step + 1, item: 0 })
    scheduleOrch(ORCH_STEP_GAP)
  }, [run, scheduleOrch])
  orchTickRef.current = orchTick

  const reset = useCallback(() => {
    clearTimers()
    progressRef.current = {}
    visitsRef.current = {}
    orchRef.current = emptyOrch()
    pausedRef.current = false
    statusesRef.current = initialStatuses(run)
    startedRef.current = new Set()
    orchStartedRef.current = false
    setStatuses(initialStatuses(run))
    setProgress({})
    setVisits({})
    setRejections({})
    setCursor(0)
    setPaused(false)
    setOrch(emptyOrch())
    setOrchDone(false)
    // Restart orchestration even when the page was already enabled.
    setResetVersion((version) => version + 1)
  }, [clearTimers, run])

  // 切换剧本时整体重置；卸载时清定时器
  useEffect(() => {
    reset()
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.id])

  /** 点「发送任务」后先跑编排：把任务解析 → 对齐流程 → 岗位到人 → 校验 → 预判 */
  useEffect(() => {
    if (!enabled) return
    if (orchStartedRef.current) return
    orchStartedRef.current = true
    scheduleOrch(ORCH_ITEM_DELAY)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, resetVersion, scheduleOrch])

  /** 编排跑完才开始执行第一个节点 */
  useEffect(() => {
    if (!enabled || !orchDone) return
    const node = run.nodes[cursor]
    if (!node) return
    const group = groupAt(run, cursor)
    if (!group.every((id) => statuses[id] === 'pending')) return
    group.forEach((id) => {
      const n = run.nodes.find((x) => x.id === id)
      if (!n) return
      if (startedRef.current.has(id)) return
      startedRef.current.add(id)
      // 人工介入节点也先走沟通过程（分身向「你」请示），播完才进入待确认
      setProgress((prev) => (prev[id] ? prev : { ...prev, [id]: emptyProgress() }))
      setStatuses((prev) => ({ ...prev, [id]: 'running' }))
      tick(id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, enabled, orchDone])

  /** 组内全部完成 → 推进 cursor */
  useEffect(() => {
    const node = run.nodes[cursor]
    if (!node) return
    const group = groupAt(run, cursor)
    if (group.length && group.every((id) => statuses[id] === 'done')) {
      setCursor((c) => Math.min(c + group.length, run.nodes.length))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statuses])

  const approve = useCallback(
    (id: string) => setStatuses((prev) => ({ ...prev, [id]: 'done' })),
    [],
  )

  /** 驳回：回退到 rejectTo，其后节点全部重置为 pending，并切换为 revisit 内容。
     理由优先用人工填写的；没填则回落到剧本里预置的那条。 */
  const reject = useCallback(
    (id: string, reason?: string) => {
      const node = run.nodes.find((n) => n.id === id)
      const confirm = node?.confirm
      if (!confirm) return
      const targetIndex = run.nodes.findIndex((n) => n.id === confirm.rejectTo)
      if (targetIndex < 0) return
      clearTimers()
      const rest = run.nodes.slice(targetIndex)
      rest.forEach((n) => startedRef.current.delete(n.id))
      setStatuses((prev) => {
        const next = { ...prev }
        rest.forEach((n) => {
          next[n.id] = 'pending'
        })
        return next
      })
      setProgress((prev) => {
        const next = { ...prev }
        rest.forEach((n) => delete next[n.id])
        return next
      })
      setVisits((prev) => {
        const next = { ...prev }
        rest.forEach((n) => {
          next[n.id] = (prev[n.id] ?? 0) + 1
        })
        return next
      })
      const finalReason = reason?.trim() || confirm.rejectReason
      setRejections((prev) => ({ ...prev, [confirm.rejectTo]: finalReason }))
      setCursor(targetIndex)
    },
    [clearTimers, run],
  )

  /** 暂停 / 继续（不用函数式更新，避免 StrictMode 下更新器被调用两次产生副作用） */
  const togglePause = useCallback(() => {
    const next = !pausedRef.current
    pausedRef.current = next
    setPaused(next)
    if (next) {
      clearTimers()
      return
    }
    // 继续：编排没跑完就接着跑编排，否则把所有执行中的节点重新踢一脚
    if (!orchDone) {
      orchTickRef.current()
      return
    }
    Object.entries(statuses)
      .filter(([, s]) => s === 'running')
      .forEach(([nodeId]) => tickRef.current(nodeId))
  }, [clearTimers, statuses, orchDone])

  /**
   * 自愈兜底。正常情况下每个节点始终有一个待触发的定时器；
   * 万一链路断了（progressRef/定时器在并发渲染下极小概率丢失），
   * 节点会永久停在「进行中」——这里每 1.5s 检查一次，断了就把它重新踢起来。
   */
  useEffect(() => {
    if (!enabled) return
    const h = window.setInterval(() => {
      if (timersRef.current.length > 0) return
      Object.entries(statusesRef.current).forEach(([nodeId, st]) => {
        if (st === 'running') tickRef.current(nodeId)
      })
    }, 1500)
    return () => window.clearInterval(h)
  }, [enabled])

  const doneCount = run.nodes.filter((n) => statuses[n.id] === 'done').length

  return {
    statuses,
    progress,
    orch,
    orchDone,
    visits,
    rejections,
    cursor,
    current: run.nodes[cursor] ?? null,
    paused,
    togglePause,
    approve,
    reject,
    reset,
    doneCount,
    total: run.nodes.length,
    awaitingNode: run.nodes.find((n) => statuses[n.id] === 'awaiting') ?? null,
    isComplete: doneCount === run.nodes.length,
    hasRun:
      orchStartedRef.current ||
      orch.step > 0 ||
      orchDone ||
      Object.values(statuses).some((s) => s !== 'pending'),
    contentFor: (node: SimNode) => contentFor(node, visits[node.id] ?? 0),
    exchangeFor: (node: SimNode) => exchangeFor(node, visits[node.id] ?? 0),
  }
}
