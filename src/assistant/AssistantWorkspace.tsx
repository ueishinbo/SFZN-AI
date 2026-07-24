import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bot,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Layers3,
  LoaderCircle,
  Paperclip,
  Send,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import WorkspaceWorkbench, { WorkspaceHeaderControls, type WorkspaceOutputItem } from '../workspace/WorkspaceWorkbench'
import { useWorkspaceWorkbench, type WorkspaceTab } from '../workspace/useWorkspaceWorkbench'
import type { WorkspaceTreeNode } from '../workspace/workspaceTypes'
import AssistantDecisionPanel, {
  type AssistantDecision,
  type DecisionResolution,
} from './AssistantDecisionPanel'
import {
  collaborationSeeds,
  dispatchDraft,
  statusLabel,
  type CollaborationItem,
  type CollaborationStatus,
} from './mockCollaboration'
import './assistant.css'

type TaskListScope = 'attention' | 'all' | 'incoming' | 'outgoing'

type AssistantMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  taskList?: TaskListScope
  streaming?: boolean
}

type AssistantWorkspaceProps = {
  onCreateReminderAutomation: (item: CollaborationItem) => boolean
  onOpenAutomation: () => void
}

const initialMessages: AssistantMessage[] = [
  {
    id: 'assistant-briefing',
    role: 'assistant',
    content: '早上好。助理长会话会持续记住必要上下文。你可以直接问我待办、派发任务、催办已有任务，或者让我梳理当前协作进展。',
  },
]

function statusTone(status: CollaborationStatus) {
  if (status === 'completed') return 'success'
  if (status === 'overdue') return 'danger'
  if (status === 'pending') return 'warning'
  return 'info'
}

function TaskQueryResult({
  items,
  scope,
  onOpen,
}: {
  items: CollaborationItem[]
  scope: TaskListScope
  onOpen: (item: CollaborationItem) => void
}) {
  const visibleItems = items.filter((item) => {
    if (scope === 'attention') return item.direction === 'incoming' && item.status !== 'completed'
    if (scope === 'incoming') return item.direction === 'incoming'
    if (scope === 'outgoing') return item.direction === 'outgoing'
    return true
  })

  return (
    <section className="assistant-task-results">
      <header>
        <div><ClipboardCheck size={17} /><strong>{scope === 'attention' ? '今日需要关注' : '协作任务查询结果'}</strong></div>
        <span>{visibleItems.length} 项</span>
      </header>
      <div className="assistant-task-result-list">
        {visibleItems.map((item) => (
          <button type="button" key={item.id} onClick={() => onOpen(item)}>
            <i className={`assistant-task-dot assistant-task-dot--${statusTone(item.status)}`} />
            <div>
              <strong>{item.title}</strong>
              <span>{item.direction === 'incoming' ? `来自 ${item.assigner}` : `交给 ${item.assignee}`} · {item.dueAt}</span>
            </div>
            <em className={`collaboration-status collaboration-status--${statusTone(item.status)}`}>{statusLabel(item.status)}</em>
            <ChevronRight size={16} />
          </button>
        ))}
      </div>
      <p>点击任务会在右侧 Workspace 中打开对应文件，不进入独立任务面板。</p>
    </section>
  )
}

function createWorkspaceNodes(items: CollaborationItem[]): WorkspaceTreeNode[] {
  const openCount = items.filter((item) => item.status !== 'completed').length
  const incomingCount = items.filter((item) => item.direction === 'incoming' && item.status !== 'completed').length
  const outgoingCount = items.filter((item) => item.direction === 'outgoing' && item.status !== 'completed').length

  return [
    {
      id: 'assistant-root',
      name: 'Assistant',
      path: '/Workspace/Assistant',
      kind: 'folder',
      children: [
        {
          id: 'assistant-soul',
          name: 'SOUL.md',
          path: '/Workspace/Assistant/SOUL.md',
          kind: 'markdown',
          size: '1.2 KB',
          updatedAt: '7月18日',
          content: '# SOUL\n\n你是用户唯一的个人数字分身。保持克制、可靠和可追溯，不替用户做未经确认的正式承诺。\n\n- 优先使用自然语言完成工作\n- 涉及他人的正式动作必须确认\n- 不把业务系统已有数据复制成第二套事实源',
        },
        {
          id: 'assistant-agent',
          name: 'AGENT.md',
          path: '/Workspace/Assistant/AGENT.md',
          kind: 'markdown',
          size: '2.6 KB',
          updatedAt: '昨天',
          content: '# AGENT\n\n## 工作方式\n\n1. 理解用户意图和上下文。\n2. 按权限检索用户授权的数据。\n3. 派发、催办、写回等正式动作先生成确认预览。\n4. 将必要结果沉淀到 Workspace。',
        },
        {
          id: 'assistant-user',
          name: 'USER.md',
          path: '/Workspace/Assistant/USER.md',
          kind: 'markdown',
          size: '756 B',
          updatedAt: '昨天',
          content: '# USER\n\n- 偏好：结论先行，减少信息化表单。\n- 协作习惯：任务派发前确认执行人、截止时间和交付标准。\n- 展示偏好：默认只展示当前上下文相关文件。',
        },
        {
          id: 'assistant-memory-main',
          name: 'MEMORY.md',
          path: '/Workspace/Assistant/MEMORY.md',
          kind: 'markdown',
          size: '3.8 KB',
          updatedAt: '今天 10:18',
          content: '# MEMORY\n\n这是经过筛选的长期记忆，不是完整聊天记录。\n\n## 长期有效信息\n\n- 用户负责型号项目相关协同工作。\n- 用户希望个人助理以自然语言为主要入口。\n- 普通任务与助理长会话是两种不同模式。\n- A2A 当前优先覆盖任务派发、催办和进展回复。',
        },
        {
          id: 'assistant-memory-folder',
          name: 'memory',
          path: '/Workspace/Assistant/memory',
          kind: 'folder',
          children: [
            {
              id: 'assistant-memory-today',
              name: '2026-07-22.md',
              path: '/Workspace/Assistant/memory/2026-07-22.md',
              kind: 'markdown',
              size: '2.1 KB',
              updatedAt: '刚刚',
              content: '# 2026-07-22\n\n助理长会话的当日工作记忆。它不是一个新的 Session。\n\n- 09:18 收到发动机风险评审材料整理任务。\n- 10:06 收到供应商质量问题清单催办。\n- 讨论并确认：右侧只保留统一 Workspace，不设置独立协作事项面板。',
            },
            {
              id: 'assistant-memory-yesterday',
              name: '2026-07-21.md',
              path: '/Workspace/Assistant/memory/2026-07-21.md',
              kind: 'markdown',
              size: '1.6 KB',
              updatedAt: '昨天 18:42',
              content: '# 2026-07-21\n\n- 完成型号例会风险摘要。\n- 张三开始处理航电接口测试问题复核。',
            },
          ],
        },
        {
          id: 'assistant-collaboration-folder',
          name: 'collaboration',
          path: '/Workspace/Assistant/collaboration',
          kind: 'folder',
          children: [
            {
              id: 'assistant-collaboration-index',
              name: 'index.md',
              path: '/Workspace/Assistant/collaboration/index.md',
              kind: 'markdown',
              size: '1.1 KB',
              updatedAt: '刚刚',
              content: `# 协作任务索引\n\n- 未完成：${openCount} 项\n- 待我处理：${incomingCount} 项\n- 我发起的：${outgoingCount} 项\n\n该文件是任务服务的可读投影，不是正式任务的唯一事实源。`,
            },
            {
              id: 'assistant-collaboration-tasks',
              name: 'tasks',
              path: '/Workspace/Assistant/collaboration/tasks',
              kind: 'folder',
              children: items.map((item) => ({
                id: `workspace-task-${item.id}`,
                name: `${item.id}.json`,
                path: `/Workspace/Assistant/collaboration/tasks/${item.id}.json`,
                kind: 'json' as const,
                size: '2.4 KB',
                updatedAt: item.updatedAt,
                objectId: item.id,
              })),
            },
          ],
        },
        {
          id: 'assistant-outputs-folder',
          name: 'outputs',
          path: '/Workspace/Assistant/outputs',
          kind: 'folder',
          children: [
            {
              id: 'assistant-output-day',
              name: '2026-07-22',
              path: '/Workspace/Assistant/outputs/2026-07-22',
              kind: 'folder',
              children: [
                {
                  id: 'assistant-output-summary',
                  name: '今日协作摘要.md',
                  path: '/Workspace/Assistant/outputs/2026-07-22/今日协作摘要.md',
                  kind: 'markdown',
                  size: '4.3 KB',
                  updatedAt: '今天 10:20',
                  content: '# 今日协作摘要\n\n## 需要关注\n\n- 发动机风险评审材料整理：待开始，7月24日 18:00 截止。\n- 供应商质量问题清单闭环：剩余 2 项待供应商确认。\n\n## 已发起\n\n- 航电接口测试问题复核：张三处理中。',
                },
                {
                  id: 'assistant-output-risk-list',
                  name: '发动机风险评审清单.md',
                  path: '/Workspace/Assistant/outputs/2026-07-22/发动机风险评审清单.md',
                  kind: 'markdown',
                  size: '6.8 KB',
                  updatedAt: '今天 09:42',
                  content: '# 发动机风险评审清单\n\n1. 风险项梳理\n2. 影响范围确认\n3. 拟采取措施\n4. 责任人与计划完成时间\n\n> 当前为助理 Demo 中的静态输出物示例。',
                },
              ],
            },
          ],
        },
      ],
    },
  ]
}

function TaskFilePreview({ item }: { item: CollaborationItem }) {
  return (
    <article className="assistant-task-file">
      <div className="assistant-task-file-heading">
        <div><span>{item.projectCode}</span><h3>{item.title}</h3></div>
        <em className={`collaboration-status collaboration-status--${statusTone(item.status)}`}>{statusLabel(item.status)}</em>
      </div>
      <p>{item.description}</p>
      <dl>
        <div><dt>方向</dt><dd>{item.direction === 'incoming' ? '待我处理' : '我发起的'}</dd></div>
        <div><dt>业务来源</dt><dd>{item.sourceSystem}</dd></div>
        <div><dt>派发人</dt><dd>{item.assigner}</dd></div>
        <div><dt>执行人</dt><dd>{item.assignee}</dd></div>
        <div><dt>截止时间</dt><dd>{item.dueAt}</dd></div>
        <div><dt>优先级</dt><dd>{item.priority}</dd></div>
        <div><dt>决策状态</dt><dd>{item.decisionState ?? 'none'}</dd></div>
      </dl>
      <section><span>当前进展 · {item.updatedAt}</span><p>{item.progress}</p></section>
      <h4>事件记录</h4>
      <div className="assistant-task-file-timeline">
        {item.timeline.map((entry) => (
          <div key={entry.id}><i /><div><strong>{entry.title}</strong><p>{entry.detail}</p><span>{entry.time}</span></div></div>
        ))}
      </div>
      <footer>此文件是任务服务在个人助理 Workspace 中的只读投影。正式操作通过用户决策面板确认后写入权威业务系统。</footer>
    </article>
  )
}

export default function AssistantWorkspace({ onCreateReminderAutomation, onOpenAutomation }: AssistantWorkspaceProps) {
  const threadRef = useRef<HTMLElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const timersRef = useRef<number[]>([])
  const [items, setItems] = useState<CollaborationItem[]>(collaborationSeeds)
  const [messages, setMessages] = useState<AssistantMessage[]>(initialMessages)
  const [prompt, setPrompt] = useState('')
  const [selectedFileId, setSelectedFileId] = useState('assistant-memory-main')
  const [selectedItemId, setSelectedItemId] = useState('collab-engine-review')
  const [isModelResponding, setIsModelResponding] = useState(false)
  const [activeDecision, setActiveDecision] = useState<AssistantDecision | null>(null)
  const [decisionQueue, setDecisionQueue] = useState<AssistantDecision[]>([])
  const assistantWorkbench = useWorkspaceWorkbench({
    initialTabs: [{
      id: 'file:assistant-memory-main',
      title: 'MEMORY.md',
      mode: 'file',
      nodeId: 'assistant-memory-main',
      kind: 'markdown',
    }],
    initialNavigatorOpen: true,
  })
  const setAssistantOutputsOpen = assistantWorkbench.setOutputsOpen
  const setAssistantLauncherOpen = assistantWorkbench.setLauncherOpen

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
  }, [])

  useEffect(() => {
    if (isModelResponding || activeDecision || decisionQueue.length === 0) return
    const [nextDecision, ...remaining] = decisionQueue
    setDecisionQueue(remaining)
    setActiveDecision(nextDecision)
  }, [activeDecision, decisionQueue, isModelResponding])

  useEffect(() => {
    if (!activeDecision) return
    setAssistantOutputsOpen(false)
    setAssistantLauncherOpen(false)
    if ('item' in activeDecision) {
      setItems((current) => current.map((item) => item.id === activeDecision.item.id
        ? { ...item, decisionState: 'surfaced', updatedAt: '刚刚' }
        : item))
    }
  }, [activeDecision, setAssistantLauncherOpen, setAssistantOutputsOpen])

  useEffect(() => {
    const activeTab = assistantWorkbench.tabs.find((tab) => tab.id === assistantWorkbench.activeTabId)
    if (!activeTab) return
    setSelectedFileId(activeTab.nodeId)
    if (activeTab.objectId) setSelectedItemId(activeTab.objectId)
  }, [assistantWorkbench.activeTabId, assistantWorkbench.tabs])

  const workspaceNodes = useMemo(() => createWorkspaceNodes(items), [items])
  const assistantOutputs = useMemo<WorkspaceOutputItem[]>(() => [
    {
      id: 'assistant-output-summary',
      name: '今日协作摘要.md',
      kind: 'markdown',
      meta: 'Markdown · 4.3 KB · 今天 10:20',
      nodeId: 'assistant-output-summary',
    },
    {
      id: 'assistant-output-risk-list',
      name: '发动机风险评审清单.md',
      kind: 'markdown',
      meta: 'Markdown · 6.8 KB · 今天 09:42',
      nodeId: 'assistant-output-risk-list',
    },
  ], [])

  useEffect(() => {
    if (messages.length <= initialMessages.length) return
    const thread = threadRef.current
    if (!thread) return
    thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const appendMessage = (message: Omit<AssistantMessage, 'id'>) => {
    const id = `assistant-message-${Date.now()}-${Math.random().toString(16).slice(2)}`
    setMessages((current) => [...current, { ...message, id }])
    return id
  }

  const queueDecision = (decision: AssistantDecision) => {
    setDecisionQueue((current) => current.some((item) => item.id === decision.id) || activeDecision?.id === decision.id
      ? current
      : [...current, decision])
  }

  const finishModelResponse = (messageId: string, content: string) => {
    setMessages((current) => current.map((message) => message.id === messageId ? { ...message, content, streaming: false } : message))
    setIsModelResponding(false)
  }

  const startDecisionTurn = (content: string, decision: AssistantDecision, delay = 1050) => {
    setIsModelResponding(true)
    const messageId = appendMessage({ role: 'assistant', content, streaming: true })
    queueDecision(decision)
    const timer = window.setTimeout(() => {
      finishModelResponse(messageId, content)
    }, delay)
    timersRef.current.push(timer)
  }

  const openTaskFile = (item: CollaborationItem) => {
    setSelectedItemId(item.id)
    setSelectedFileId(`workspace-task-${item.id}`)
    assistantWorkbench.setOutputsOpen(false)
    assistantWorkbench.openTab({
      id: `file:workspace-task-${item.id}`,
      title: `${item.id}.json`,
      mode: 'file',
      nodeId: `workspace-task-${item.id}`,
      kind: 'json',
      objectId: item.id,
    })
  }

  const findWorkspaceNode = (nodeId: string, nodes: WorkspaceTreeNode[] = workspaceNodes): WorkspaceTreeNode | undefined => {
    for (const node of nodes) {
      if (node.id === nodeId) return node
      if (node.children) {
        const match = findWorkspaceNode(nodeId, node.children)
        if (match) return match
      }
    }
    return undefined
  }

  const openWorkspaceNode = (node: WorkspaceTreeNode) => {
    if (node.kind === 'folder') return
    setSelectedFileId(node.id)
    if (node.objectId) setSelectedItemId(node.objectId)
    assistantWorkbench.openTab({
      id: `file:${node.id}`,
      title: node.name,
      mode: 'file',
      nodeId: node.id,
      kind: node.kind,
      objectId: node.objectId,
    })
  }

  const toggleAssistantNavigator = () => {
    assistantWorkbench.setNavigatorOpen(!assistantWorkbench.navigatorOpen)
  }

  const openAssistantOutput = (output: WorkspaceOutputItem) => {
    const node = findWorkspaceNode(output.nodeId)
    if (!node) return
    assistantWorkbench.setOutputsOpen(false)
    openWorkspaceNode(node)
  }

  const dispatchDecision = (): AssistantDecision => ({
    id: `decision-dispatch-${Date.now()}`,
    kind: 'dispatch',
    title: dispatchDraft.title,
    description: dispatchDraft.description,
    dueAt: dispatchDraft.dueAt,
    priority: dispatchDraft.priority,
    sourceSystem: dispatchDraft.sourceSystem,
  })

  const reminderDecision = (item: CollaborationItem): AssistantDecision => ({
    id: `decision-reminder-${item.id}-${Date.now()}`,
    kind: 'reminder',
    item,
    reminderText: `请同步“${item.title}”的当前进展，如存在延期风险请一并说明。`,
  })

  const progressReplyDecision = (item: CollaborationItem): AssistantDecision => ({
    id: `decision-progress-${item.id}-${Date.now()}`,
    kind: 'progress_reply',
    item,
    reminderText: `请在${item.dueAt}前同步当前进展，如存在风险请直接说明。`,
  })

  const workflowQuestionsDecision = (): AssistantDecision => ({
    id: `decision-workflow-risk-review-${Date.now()}`,
    kind: 'workflow_questions',
    workflow: 'risk_review_planning',
  })

  const handleDecisionDefer = () => {
    if (!activeDecision) return
    if ('item' in activeDecision) {
      const decisionItem = activeDecision.item
      setItems((current) => current.map((item) => item.id === decisionItem.id ? {
        ...item,
        decisionState: 'deferred_by_user',
        updatedAt: '刚刚',
        timeline: [...item.timeline, {
          id: `timeline-deferred-${Date.now()}`,
          title: '用户暂不处理',
          detail: '该事项已保留在 Assistant Workspace，可通过自然语言继续处理。',
          time: '刚刚',
          tone: 'warning' as const,
        }],
      } : item))
    }
    if (activeDecision.kind === 'workflow_questions') {
      appendMessage({
        role: 'assistant',
        content: '这次方案澄清已暂存，没有安排人员或执行任何外部动作。需要时可以继续告诉我评审范围、时间和准备方式。',
      })
    }
    setActiveDecision(null)
    window.setTimeout(() => composerRef.current?.focus(), 40)
  }

  const handleDecisionResolve = (resolution: DecisionResolution) => {
    if (!activeDecision) return

    if (activeDecision.kind === 'dispatch' && resolution.action === 'dispatch') {
      const assignee = resolution.assignee ?? '张三'
      const nextItem: CollaborationItem = {
        ...dispatchDraft,
        id: `collab-dispatched-${Date.now()}`,
        assignee,
        decisionState: 'resolved',
        timeline: [{
          id: `timeline-dispatched-${Date.now()}`,
          title: `任务已派发给${assignee}`,
          detail: `任务已写入${dispatchDraft.sourceSystem}，并送达${assignee}的数字分身。`,
          time: '刚刚',
          tone: 'success',
        }],
      }
      setItems((current) => [nextItem, ...current])
      setSelectedItemId(nextItem.id)
      appendMessage({ role: 'assistant', content: `任务已经派发给${assignee}。业务写入成功，A2A 事件已送达，Assistant Workspace 的任务文件也已更新。` })
    }

    if (activeDecision.kind === 'reminder' && resolution.action === 'send_reminder') {
      const decisionItem = activeDecision.item
      setItems((current) => current.map((item) => item.id === decisionItem.id ? {
        ...item,
        decisionState: 'resolved',
        updatedAt: '刚刚',
        timeline: [...item.timeline, {
          id: `timeline-reminder-${Date.now()}`,
          title: '你发起了催办',
          detail: '催办已送达执行人的数字分身，等待对方回复。',
          time: '刚刚',
          tone: 'warning',
        }],
      } : item))
      appendMessage({ role: 'assistant', content: `催办已发送给${decisionItem.assignee}的数字分身。催办引用原任务，不会创建新任务或改变任务状态。` })
    }

    if (activeDecision.kind === 'progress_reply' && resolution.action === 'reply_progress') {
      const decisionItem = activeDecision.item
      const progress = resolution.progress ?? '已经开始，预计按期完成'
      setItems((current) => current.map((item) => item.id === decisionItem.id ? {
        ...item,
        status: 'in_progress',
        progress,
        decisionState: 'resolved',
        updatedAt: '刚刚',
        timeline: [...item.timeline, {
          id: `timeline-progress-reply-${Date.now()}`,
          title: '你回复了任务进展',
          detail: progress,
          time: '刚刚',
          tone: 'success',
        }],
      } : item))
      appendMessage({ role: 'assistant', content: `进展已经写回${decisionItem.sourceSystem}，并同步给${decisionItem.assigner}的数字分身：${progress}` })
    }

    if (activeDecision.kind === 'task_receipt') {
      const decisionItem = activeDecision.item
      const requestedAdjustment = resolution.action === 'request_adjustment'
      setItems((current) => current.map((item) => item.id === decisionItem.id ? {
        ...item,
        decisionState: 'resolved',
        updatedAt: '刚刚',
        timeline: [...item.timeline, {
          id: `timeline-receipt-${Date.now()}`,
          title: requestedAdjustment ? '你申请了任务调整' : '你已确认收到任务',
          detail: requestedAdjustment ? '等待派发人确认新的计划。' : '确认收到不等于任务完成。',
          time: '刚刚',
        }],
      } : item))
      appendMessage({ role: 'assistant', content: requestedAdjustment ? '调整申请已发送给派发人的数字分身。' : '已确认收到任务，并同步给派发人的数字分身。' })
    }

    if (activeDecision.kind === 'workflow_questions' && resolution.action === 'complete_workflow') {
      appendMessage({
        role: 'assistant',
        content: `专项评审方案已经整理完成：${resolution.workflowSummary}。这些回答只用于形成方案，我还没有派发任务；真正安排负责人时仍会单独请求你的最终确认。`,
      })
    }

    setActiveDecision(null)
    window.setTimeout(() => composerRef.current?.focus(), 40)
  }

  const createAutomation = (item: CollaborationItem) => {
    const created = onCreateReminderAutomation(item)
    appendMessage({
      role: 'assistant',
      content: created
        ? `已为“${item.title}”创建自动催办：每天上午 9:00 检查，任务完成后自动停止。你可以到自动化中查看运行记录。`
        : `“${item.title}”已经设置了自动催办，可以到自动化中查看。`,
    })
  }

  const showTaskList = (scope: TaskListScope = 'all') => {
    appendMessage({ role: 'assistant', content: '我从协作任务服务查询到了这些结果。任务文件也已经映射到 Assistant Workspace。', taskList: scope })
  }

  const runDispatchFlow = (userMessage: string) => {
    appendMessage({ role: 'user', content: userMessage })
    startDecisionTurn('任务信息已经整理完成。派发会影响其他人的工作安排，现在需要你选择唯一执行人并最终确认。', dispatchDecision(), 1050)
  }

  const runIncomingReminderDuringResponse = (userMessage: string) => {
    const target = items.find((item) => item.id === 'collab-engine-review') ?? items[0]
    appendMessage({ role: 'user', content: userMessage })
    setIsModelResponding(true)
    const messageId = appendMessage({ role: 'assistant', content: '今天已经完成两项材料整理，还有一项发动机风险评审正在推进…', streaming: true })

    const incomingTimer = window.setTimeout(() => {
      setItems((current) => current.map((item) => item.id === target.id ? {
        ...item,
        decisionState: 'queued',
        updatedAt: '刚刚',
        timeline: [...item.timeline, {
          id: `timeline-incoming-reminder-${Date.now()}`,
          title: `${item.assigner}发起了进展催办`,
          detail: `请在${item.dueAt}前同步当前进展，如存在风险请直接说明。`,
          time: '刚刚',
          tone: 'warning',
        }],
      } : item))
      queueDecision(progressReplyDecision(target))
    }, 520)

    const finishTimer = window.setTimeout(() => {
      finishModelResponse(messageId, '今天已经完成两项材料整理，还有一项发动机风险评审正在推进。我已经把关键进展汇总好了。')
    }, 2100)

    timersRef.current.push(incomingTimer, finishTimer)
  }

  const submitPrompt = () => {
    const value = prompt.trim()
    if (!value) return
    setPrompt('')

    const selectedItem = items.find((item) => item.id === selectedItemId) ?? items[0]
    if (value.startsWith('回复')) {
      appendMessage({ role: 'user', content: value })
      startDecisionTurn('我找到了对应任务。回复会写回权威任务并同步给对方数字分身，需要你确认最终进展。', progressReplyDecision(selectedItem), 900)
      return
    }
    if (value.includes('自动催办')) {
      appendMessage({ role: 'user', content: value })
      const target = selectedItem.direction === 'outgoing' ? selectedItem : items.find((item) => item.direction === 'outgoing' && item.status !== 'completed')
      if (target) createAutomation(target)
      return
    }
    if (value.includes('催')) {
      appendMessage({ role: 'user', content: value })
      const target = selectedItem.direction === 'outgoing' ? selectedItem : items.find((item) => item.direction === 'outgoing' && item.status !== 'completed')
      if (target) startDecisionTurn('我已经定位到原任务并生成了催办内容。发送前需要你确认。', reminderDecision(target), 850)
      return
    }
    if (value.includes('评审') && ['组织', '安排', '策划'].some((keyword) => value.includes(keyword))) {
      appendMessage({ role: 'user', content: value })
      startDecisionTurn(
        '可以。我先确认三个会影响方案和后续分工的关键问题；这些回答只用于整理方案，不会直接派发任务。',
        workflowQuestionsDecision(),
        900,
      )
      return
    }
    if (value.includes('派') || value.includes('张三')) {
      runDispatchFlow(value)
      return
    }
    if (
      ['总结', '梳理', '汇总'].some((keyword) => value.includes(keyword))
      && ['协作进展', '项目进展', '当前进展'].some((keyword) => value.includes(keyword))
    ) {
      runIncomingReminderDuringResponse(value)
      return
    }
    if (['待办', '哪些任务', '所有任务', '协作任务', '汇总任务', '查看全部'].some((keyword) => value.includes(keyword))) {
      appendMessage({ role: 'user', content: value })
      showTaskList('all')
      return
    }

    appendMessage({ role: 'user', content: value })
    appendMessage({ role: 'assistant', content: '你可以直接问我有哪些待办、派发任务、催办已有任务或回复处理进展。需要查看记忆和输出物时，打开右侧 Workspace 即可。' })
  }

  return (
    <div className={[
      'assistant-workbench',
      assistantWorkbench.workspaceVisible ? 'assistant-workbench--with-workspace' : '',
      activeDecision ? 'assistant-workbench--decision-active' : '',
    ].filter(Boolean).join(' ')}>
      <section className="assistant-chat-pane">
        <header className="assistant-header">
          <div className="assistant-identity">
            <span className="assistant-identity-avatar"><Bot size={23} /></span>
            <div><p>个人数字分身 · 固定长 Session</p><h2>我的助理</h2></div>
          </div>
          <div className="assistant-header-actions">
            <button className="assistant-automation-link" type="button" onClick={onOpenAutomation}><Clock3 size={18} /><span>自动化</span></button>
            {!assistantWorkbench.workspaceVisible && (
              <WorkspaceHeaderControls
                outputs={assistantOutputs}
                outputsOpen={assistantWorkbench.outputsOpen}
                workspaceVisible={assistantWorkbench.workspaceVisible}
                onToggleOutputs={() => assistantWorkbench.setOutputsOpen(!assistantWorkbench.outputsOpen)}
                onCloseOutputs={() => assistantWorkbench.setOutputsOpen(false)}
                onToggleWorkspace={assistantWorkbench.toggleWorkspace}
                onOpenOutput={openAssistantOutput}
              />
            )}
          </div>
        </header>

        <section className={`assistant-thread ${activeDecision && !assistantWorkbench.workspaceVisible ? 'assistant-thread--with-decision' : ''}`} aria-label="助理对话" ref={threadRef}>
          <div className="assistant-thread-date"><span>今天</span></div>
          {messages.map((message) => (
            <article className={`assistant-message assistant-message--${message.role}`} key={message.id}>
              {message.role === 'assistant' && <div className="assistant-message-avatar"><Bot size={18} /></div>}
              <div className="assistant-message-body">
                {message.role === 'assistant' && <strong className="assistant-message-name">COMAC AI</strong>}
                <p className={message.streaming ? 'assistant-message-streaming' : ''}>
                  {message.content}
                  {message.streaming && <span><LoaderCircle size={15} />模型输出中</span>}
                </p>
                {message.taskList && <TaskQueryResult items={items} scope={message.taskList} onOpen={openTaskFile} />}
              </div>
            </article>
          ))}
        </section>

        <section className={`assistant-composer ${activeDecision ? 'assistant-composer--blocked' : ''}`} aria-label="助理输入器">
          <textarea
            ref={composerRef}
            value={prompt}
            disabled={Boolean(activeDecision)}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                submitPrompt()
              }
            }}
            placeholder="直接问我待办、派发、催办，或让我处理文件…"
          />
          <div className="assistant-composer-toolbar">
            <div>
              <button type="button" disabled={Boolean(activeDecision)}><Layers3 size={17} /><span>商飞大模型 L1-S1</span></button>
              <button type="button" disabled={Boolean(activeDecision)}><WandSparkles size={17} /><span>技能</span></button>
            </div>
            <div>
              <button className="assistant-composer-icon" type="button" disabled={Boolean(activeDecision)} aria-label="添加附件"><Paperclip size={19} /></button>
              <button className="assistant-composer-icon assistant-composer-sparkle" type="button" disabled={Boolean(activeDecision)} aria-label="智能增强"><Sparkles size={19} /></button>
              <button
                className={`assistant-send-button ${prompt.trim() && !isModelResponding ? 'ready' : ''}`}
                type="button"
                disabled={isModelResponding || Boolean(activeDecision)}
                onClick={submitPrompt}
                aria-label={isModelResponding ? '模型输出结束后可发送' : '发送'}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </section>
      </section>

      {assistantWorkbench.workspaceVisible && (
        <WorkspaceWorkbench
          className="assistant-workspace-panel"
          tabs={assistantWorkbench.tabs}
          activeTabId={assistantWorkbench.activeTabId}
          nodes={workspaceNodes}
          selectedNodeId={selectedFileId}
          defaultExpandedIds={[
            'assistant-root',
            'assistant-memory-folder',
            'assistant-collaboration-folder',
            'assistant-collaboration-tasks',
            'assistant-outputs-folder',
            'assistant-output-day',
          ]}
          outputs={assistantOutputs}
          outputsOpen={assistantWorkbench.outputsOpen}
          workspaceVisible={assistantWorkbench.workspaceVisible}
          navigatorOpen={assistantWorkbench.navigatorOpen}
          launcherOpen={assistantWorkbench.launcherOpen}
          onActivateTab={assistantWorkbench.setActiveTabId}
          onCloseTab={assistantWorkbench.closeTab}
          onToggleOutputs={() => assistantWorkbench.setOutputsOpen(!assistantWorkbench.outputsOpen)}
          onCloseOutputs={() => assistantWorkbench.setOutputsOpen(false)}
          onToggleWorkspace={assistantWorkbench.toggleWorkspace}
          onToggleNavigator={toggleAssistantNavigator}
          onOpenOutput={openAssistantOutput}
          onToggleLauncher={() => assistantWorkbench.setLauncherOpen(!assistantWorkbench.launcherOpen)}
          onCloseLauncher={() => assistantWorkbench.setLauncherOpen(false)}
          onOpenFileLauncher={() => {
            assistantWorkbench.setLauncherOpen(false)
            assistantWorkbench.setOutputsOpen(false)
            assistantWorkbench.setNavigatorOpen(true)
          }}
          onOpenBrowserLauncher={() => undefined}
          onSelectNode={openWorkspaceNode}
          renderTab={(_tab: WorkspaceTab, node) => {
            const selectedTask = node?.objectId ? items.find((item) => item.id === node.objectId) : undefined
            return selectedTask ? <TaskFilePreview item={selectedTask} /> : <pre className="unified-workspace-source">{node?.content}</pre>
          }}
        />
      )}

      {activeDecision && (
        <div className="assistant-decision-dock">
          <AssistantDecisionPanel
            key={activeDecision.id}
            decision={activeDecision}
            onDefer={handleDecisionDefer}
            onResolve={handleDecisionResolve}
          />
        </div>
      )}
    </div>
  )
}
