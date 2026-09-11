import { useEffect, useRef, useState } from 'react'
import type {
  WorkingGroupNodeStatus,
  WorkingGroupRun,
} from './types'
import { groupNodeIds, isBlocking } from './playback'

const THINKING_DELAY = 800 // 每条思维链间隔
const CONTENT_STEP = 5 // 正文每步增加字数
const CONTENT_DELAY = 45 // 正文每步间隔

export function useWorkingGroupPlayback(run: WorkingGroupRun) {
  const [statuses, setStatuses] = useState<Record<string, WorkingGroupNodeStatus>>(() =>
    Object.fromEntries(run.nodes.map((n) => [n.id, 'pending' as const])),
  )
  const [thinking, setThinking] = useState<Record<string, number>>({})
  const [content, setContent] = useState<Record<string, string>>({})
  const [cursor, setCursor] = useState(0)
  const timersRef = useRef<number[]>([])

  const clearTimers = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t))
    timersRef.current = []
  }
  useEffect(() => clearTimers, [])

  const node = run.nodes[cursor] ?? null
  const group = node ? groupNodeIds(run, node) : []

  const finish = (id: string) => {
    setStatuses((prev) => (prev[id] === 'awaiting' ? prev : { ...prev, [id]: 'done' }))
  }

  const play = (id: string) => {
    const n = run.nodes.find((x) => x.id === id)
    if (!n) return
    let ti = 0
    const streamThinking = () => {
      if (ti >= n.thinking.length) {
        streamContent()
        return
      }
      setThinking((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
      ti += 1
      timersRef.current.push(window.setTimeout(streamThinking, THINKING_DELAY))
    }
    const streamContent = () => {
      const full = n.content ?? ''
      let ci = 0
      const step = () => {
        ci = Math.min(ci + CONTENT_STEP, full.length)
        setContent((prev) => ({ ...prev, [id]: full.slice(0, ci) }))
        if (ci < full.length) {
          timersRef.current.push(window.setTimeout(step, CONTENT_DELAY))
        } else {
          timersRef.current.push(window.setTimeout(() => finish(id), 400))
        }
      }
      step()
    }
    streamThinking()
  }

  // 启动 cursor 指向的组（若尚未启动）
  useEffect(() => {
    if (!node) return
    const allPending = group.every((id) => statuses[id] === 'pending')
    if (!allPending) return
    group.forEach((id) => {
      const n = run.nodes.find((x) => x.id === id)
      if (!n) return
      if (isBlocking(n)) {
        setStatuses((prev) => ({ ...prev, [id]: 'awaiting' }))
      } else {
        setStatuses((prev) => ({ ...prev, [id]: 'running' }))
        play(id)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor])

  // 组内全部完成后推进 cursor
  useEffect(() => {
    if (!node) return
    const allDone = group.every((id) => statuses[id] === 'done')
    if (allDone) setCursor((c) => Math.min(c + group.length, run.nodes.length))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statuses])

  const confirm = (id: string) => {
    setStatuses((prev) => ({ ...prev, [id]: 'done' }))
  }

  const doneCount = run.nodes.filter((n) => statuses[n.id] === 'done').length

  return {
    statuses,
    thinking,
    content,
    members: run.members,
    current: node,
    confirm,
    doneCount,
    total: run.nodes.length,
    isComplete: doneCount === run.nodes.length,
  }
}
