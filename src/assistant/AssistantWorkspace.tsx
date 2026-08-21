import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeftRight,
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
  type DecisionCardStatus,
  type DecisionResolution,
} from './AssistantDecisionPanel'
import {
  collaborationSeeds,
  dispatchDraft,
  statusLabel,
  type CollaborationItem,
  type CollaborationStatus,
} from './mockCollaboration'
import {
  createIncomingReminderNotification,
  notificationKindLabel,
  type AssistantNotification,
} from './mockNotifications'
import SubagentCollaboration from './SubagentCollaboration'
import {
  applySubagentScheduleEvent,
  createSubagentRun,
  createSubagentSchedule,
  finishSubagentRun,
  type SubagentRun,
} from './mockSubagents'
import './assistant.css'

type TaskListScope = 'attention' | 'all' | 'incoming' | 'outgoing'
type DemoPerspective = 'sender' | 'receiver'

type AssistantActionCard = {
  decision: AssistantDecision
  status: DecisionCardStatus
  version: number
  supersededByVersion?: number
}

type AssistantMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  taskList?: TaskListScope
  streaming?: boolean
  actionCard?: AssistantActionCard
  notification?: AssistantNotification
  retrySubagent?: boolean
}

type AssistantWorkspaceProps = {
  onCreateReminderAutomation: (item: CollaborationItem) => boolean
  onOpenAutomation: () => void
  notificationToProcess: AssistantNotification | null
  onNotificationAccepted: (notificationId: string) => void
  onNotificationHandled: (notificationId: string) => void
  onNotificationReceived: (notification: AssistantNotification) => void
  onBusyChange: (busy: boolean) => void
}

const initialMessages: AssistantMessage[] = [
  {
    id: 'assistant-briefing',
    role: 'assistant',
    content: '早上好。助理长会话会持续记住必要上下文。你可以派发 C 项目任务，也可以明确创建“仅 A2A”的协作任务；催办和回复仍会在执行前请你确认。',
  },
]

const receiverDemoTask: CollaborationItem = {
  id: 'collab-receiver-demo',
  kind: 'assignment',
  direction: 'incoming',
  title: '发动机风险评审材料整理',
  project: 'C929 总体方案项目',
  projectCode: 'C929-PMO-2026',
  assigner: '张嘉浩',
  assignee: '李静',
  dueAt: '7月29日 18:00',
  status: 'pending',
  priority: '重要',
  description: '整理发动机风险评审材料，形成可供专项评审使用的清单。',
  progress: '任务已送达并自动接收',
  updatedAt: '刚刚',
  sourceSystem: 'C项目管理平台',
  recordMode: 'c_project_bound',
  plannedStartAt: '7月28日 09:00',
  plannedEndAt: '7月29日 18:00',
  estimatedHours: '12',
  decisionState: 'resolved',
  timeline: [{
    id: 'timeline-receiver-demo-created',
    title: '张嘉浩派发任务',
    detail: '任务已写入 C 项目管理平台，并通过 A2A 送达李静的数字分身。',
    time: '刚刚',
  }],
}

const receiverDemoSchema = {
  schemaId: 'c-project.task.receipt',
  schemaVersion: 'v2026.07.3',
  targetSystem: 'C项目管理平台',
  fields: [
    { key: 'title', label: '名称', required: true, value: receiverDemoTask.title, control: 'readonly' as const },
    { key: 'assignee', label: '负责人', required: true, value: receiverDemoTask.assignee, control: 'readonly' as const },
    { key: 'plannedStartAt', label: '计划开始时间', required: true, value: receiverDemoTask.plannedStartAt ?? '', control: 'readonly' as const },
    { key: 'plannedEndAt', label: '计划完成时间', required: true, value: receiverDemoTask.plannedEndAt ?? '', control: 'readonly' as const },
    { key: 'estimatedHours', label: '预估工时', required: true, value: `${receiverDemoTask.estimatedHours} 小时`, control: 'readonly' as const },
  ],
}

const initialReceiverMessages: AssistantMessage[] = [
  {
    id: 'receiver-briefing',
    role: 'assistant',
    content: '这里是李静的助理长会话。刚刚收到张嘉浩数字分身派发的一项 C 项目任务，任务已自动接收。',
  },
  {
    id: 'receiver-task-receipt',
    role: 'assistant',
    content: '任务已完成身份、字段和来源校验。你可以查看任务信息，或在卡片底部补充回复。',
    actionCard: {
      decision: {
        id: 'decision-receiver-task-receipt',
        kind: 'task_receipt',
        item: receiverDemoTask,
        schema: receiverDemoSchema,
        recordMode: 'c_project_bound',
      },
      status: 'resolved',
      version: 1,
    },
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
        <div><dt>记录模式</dt><dd>{item.recordMode === 'assistant_local' ? '仅 A2A 协作' : 'C 项目任务'}</dd></div>
        <div><dt>派发人</dt><dd>{item.assigner}</dd></div>
        <div><dt>执行人</dt><dd>{item.assignee}</dd></div>
        <div><dt>计划开始</dt><dd>{item.plannedStartAt ?? '未提供'}</dd></div>
        <div><dt>计划完成</dt><dd>{item.plannedEndAt ?? item.dueAt}</dd></div>
        <div><dt>预估工时</dt><dd>{item.estimatedHours ? `${item.estimatedHours} 小时` : '未提供'}</dd></div>
        <div><dt>业务来源</dt><dd>{item.sourceSystem}</dd></div>
        <div><dt>决策状态</dt><dd>{item.decisionState ?? 'none'}</dd></div>
      </dl>
      <section><span>当前进展 · {item.updatedAt}</span><p>{item.progress}</p></section>
      <h4>事件记录</h4>
      <div className="assistant-task-file-timeline">
        {item.timeline.map((entry) => (
          <div key={entry.id}><i /><div><strong>{entry.title}</strong><p>{entry.detail}</p><span>{entry.time}</span></div></div>
        ))}
      </div>
      <footer>此文件是任务服务在个人助理 Workspace 中的可追溯投影。自然语言可以更新草稿；只有点击对话内行动卡的确认按钮，系统才会执行正式写入。</footer>
    </article>
  )
}

export default function AssistantWorkspace({
  onCreateReminderAutomation,
  onOpenAutomation,
  notificationToProcess,
  onNotificationAccepted,
  onNotificationHandled,
  onNotificationReceived,
  onBusyChange,
}: AssistantWorkspaceProps) {
  const threadRef = useRef<HTMLElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const timersRef = useRef<number[]>([])
  const subagentTimersRef = useRef<number[]>([])
  const acceptedNotificationIdsRef = useRef(new Set<string>())
  const [perspective, setPerspective] = useState<DemoPerspective>('sender')
  const [senderItems, setSenderItems] = useState<CollaborationItem[]>(collaborationSeeds)
  const [receiverItems, setReceiverItems] = useState<CollaborationItem[]>([receiverDemoTask])
  const [senderMessages, setSenderMessages] = useState<AssistantMessage[]>(initialMessages)
  const [receiverMessages, setReceiverMessages] = useState<AssistantMessage[]>(initialReceiverMessages)
  const [receiverUserName, setReceiverUserName] = useState('李静')
  const [prompt, setPrompt] = useState('')
  const [selectedFileId, setSelectedFileId] = useState('assistant-memory-main')
  const [selectedItemId, setSelectedItemId] = useState('collab-engine-review')
  const [isModelResponding, setIsModelResponding] = useState(false)
  const [subagentRun, setSubagentRun] = useState<SubagentRun | null>(null)
  const [activeSubagentId, setActiveSubagentId] = useState<string | null>(null)
  const items = perspective === 'sender' ? senderItems : receiverItems
  const setItems = perspective === 'sender' ? setSenderItems : setReceiverItems
  const messages = perspective === 'sender' ? senderMessages : receiverMessages
  const setMessages = perspective === 'sender' ? setSenderMessages : setReceiverMessages
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

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    subagentTimersRef.current.forEach((timer) => window.clearTimeout(timer))
  }, [])

  useEffect(() => () => onBusyChange(false), [onBusyChange])

  useEffect(() => {
    onBusyChange(isModelResponding)
  }, [isModelResponding, onBusyChange])

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
  }, [messages])

  const appendMessage = useCallback((message: Omit<AssistantMessage, 'id'>) => {
    const id = `assistant-message-${Date.now()}-${Math.random().toString(16).slice(2)}`
    setMessages((current) => [...current, { ...message, id }])
    return id
  }, [setMessages])

  const markDecisionSurfaced = useCallback((decision: AssistantDecision) => {
    if (!('item' in decision)) return
    setItems((current) => current.map((item) => item.id === decision.item.id
      ? { ...item, decisionState: 'surfaced', updatedAt: '刚刚' }
      : item))
  }, [setItems])

  const finishModelResponse = useCallback((
    messageId: string,
    content: string,
    actionCard?: AssistantActionCard,
  ) => {
    setMessages((current) => current.map((message) => message.id === messageId
      ? { ...message, content, streaming: false, actionCard }
      : message))
    if (actionCard) markDecisionSurfaced(actionCard.decision)
    setIsModelResponding(false)
  }, [markDecisionSurfaced, setMessages])

  const startDecisionTurn = (
    content: string,
    decision: AssistantDecision,
    delay = 1050,
    version = 1,
  ) => {
    setIsModelResponding(true)
    const messageId = appendMessage({ role: 'assistant', content, streaming: true })
    const timer = window.setTimeout(() => {
      finishModelResponse(messageId, content, {
        decision,
        status: 'pending_confirmation',
        version,
      })
    }, delay)
    timersRef.current.push(timer)
  }

  const clearSubagentTimers = () => {
    subagentTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    subagentTimersRef.current = []
  }

  const runSubagentDemo = (
    userMessage: string,
    options: { retry?: boolean; shouldFail?: boolean } = {},
  ) => {
    const shouldFail = options.shouldFail ?? false
    clearSubagentTimers()
    assistantWorkbench.hideWorkspace()
    setActiveSubagentId(null)
    setIsModelResponding(true)

    if (options.retry) {
      setMessages((current) => current.map((message) => message.retrySubagent
        ? { ...message, retrySubagent: false }
        : message))
      appendMessage({ role: 'user', content: '重新执行' })
    } else {
      appendMessage({ role: 'user', content: userMessage })
    }

    const nextRun = createSubagentRun(userMessage)
    setSubagentRun(nextRun)
    const progressMessageId = appendMessage({
      role: 'assistant',
      content: options.retry
        ? '我正在重新执行本轮任务，已再次并行启动 3 个子智能体。'
        : '这个任务包含数据、问题与方案三个部分，我已并行启动 3 个子智能体。你可以点击输入框上方的胶囊查看各自执行过程。',
      streaming: true,
    })

    const schedule = createSubagentSchedule(shouldFail)
    schedule.forEach((event) => {
      const timer = window.setTimeout(() => {
        setSubagentRun((current) => current
          ? applySubagentScheduleEvent(current, event, shouldFail)
          : current)
      }, event.at)
      subagentTimersRef.current.push(timer)
    })

    const finalDelay = Math.max(...schedule.map((event) => event.at)) + 450
    const finishTimer = window.setTimeout(() => {
      setSubagentRun((current) => current ? finishSubagentRun(current, shouldFail) : current)
      finishModelResponse(
        progressMessageId,
        shouldFail
          ? '3 个子智能体已结束执行，其中 1 个因服务超时失败。我已基于现有结果完成部分汇总。'
          : '3 个子智能体已全部完成，我已汇总它们的结果并形成建议。',
      )
      appendMessage({
        role: 'assistant',
        content: shouldFail
          ? '数据分析和问题洞察已经完成；改进建议因知识服务超时未能产出。目前可以确认：首次响应效率有所改善，但航材保障和远程诊断知识复用仍是主要瓶颈。你可以先使用这些结论，也可以重新执行本轮任务。'
          : '综合来看，客户支援效率整体有所改善，但航材保障和远程诊断知识复用仍是主要瓶颈。建议优先建立重点问题快速响应机制、沉淀诊断模板，并对高频短缺航材建立预测性保障清单。',
        retrySubagent: shouldFail,
      })
    }, finalDelay)
    subagentTimersRef.current.push(finishTimer)
  }

  const retrySubagentRun = (messageId: string) => {
    if (isModelResponding || !subagentRun) return
    setMessages((current) => current.map((message) => message.id === messageId && message.retrySubagent
      ? { ...message, retrySubagent: false }
      : message))
    runSubagentDemo(subagentRun.prompt, { retry: true, shouldFail: false })
  }

  useEffect(() => {
    if (
      !notificationToProcess
      || isModelResponding
      || acceptedNotificationIdsRef.current.has(notificationToProcess.id)
    ) return

    const notification = notificationToProcess
    acceptedNotificationIdsRef.current.add(notification.id)
    onNotificationAccepted(notification.id)
    assistantWorkbench.hideWorkspace()
    appendMessage({
      role: 'user',
      content: notification.summary,
      notification,
    })
    setIsModelResponding(true)
    const messageId = appendMessage({
      role: 'assistant',
      content: `我已从消息通知中心接收这条${notificationKindLabel(notification.kind)}，正在结合长会话上下文处理…`,
      streaming: true,
    })
    const timer = window.setTimeout(() => {
      const result = notification.kind === 'a2a'
        ? `这条消息已经处理：${notification.summary}我已结合当前会话梳理出回复要点，下一步可以继续生成正式回复或更新关联任务。`
        : `这项定时任务结果已经处理：${notification.summary}我已把结果带入长会话，接下来可以继续追问明细或安排后续动作。`
      finishModelResponse(messageId, result)
      onNotificationHandled(notification.id)
    }, 2200)
    timersRef.current.push(timer)
  }, [
    assistantWorkbench,
    appendMessage,
    finishModelResponse,
    isModelResponding,
    notificationToProcess,
    onNotificationAccepted,
    onNotificationHandled,
  ])

  const updateActionCardStatus = (
    messageId: string,
    status: DecisionCardStatus,
    supersededByVersion?: number,
  ) => {
    setMessages((current) => current.map((message) => message.id === messageId && message.actionCard
      ? {
          ...message,
          actionCard: {
            ...message.actionCard,
            status,
            supersededByVersion,
          },
        }
      : message))
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

  const dispatchDecision = (
    recordMode: 'c_project_bound' | 'assistant_local' = 'c_project_bound',
  ): AssistantDecision => {
    const writesCProject = recordMode === 'c_project_bound'
    const sourceSystem = writesCProject ? 'C项目管理平台' : 'A2A协作任务服务'
    const decision: AssistantDecision = {
      id: `decision-dispatch-${Date.now()}`,
      kind: 'dispatch',
      title: dispatchDraft.title,
      description: dispatchDraft.description,
      dueAt: dispatchDraft.dueAt,
      priority: dispatchDraft.priority,
      sourceSystem,
      recordMode,
      schema: {
        schemaId: writesCProject ? 'c-project.task.create' : 'a2a.task.create',
        schemaVersion: writesCProject ? 'v2026.07.3' : 'A2A-v1',
        targetSystem: sourceSystem,
        fields: [
          { key: 'title', label: '名称', required: true, value: dispatchDraft.title, control: 'text' },
          {
            key: 'assignee',
            label: '负责人',
            required: true,
            value: '李静',
            control: 'person',
            options: [
              { value: '李静', label: '李静', description: '动力装置部 · 项目主管' },
              { value: '张三', label: '张三', description: '总体技术部 · 结构工程师' },
              { value: '王磊', label: '王磊', description: '试飞中心 · 质量工程师' },
            ],
          },
          { key: 'plannedStartAt', label: '计划开始时间', required: true, value: '7月28日 09:00', control: 'datetime' },
          { key: 'plannedEndAt', label: '计划完成时间', required: true, value: '7月29日 18:00', control: 'datetime' },
          { key: 'estimatedHours', label: '预估工时', required: true, value: '12', control: 'duration' },
        ],
      },
    }
    return decision
  }

  const reviseDispatchDecision = (
    decision: Extract<AssistantDecision, { kind: 'dispatch' }>,
    userMessage: string,
  ): Extract<AssistantDecision, { kind: 'dispatch' }> => {
    const updatesCompletion = userMessage.includes('截止') || userMessage.includes('完成时间')
    const revisedTime = userMessage.includes('今天')
      ? updatesCompletion ? '今天 18:00' : '今天 14:00'
      : userMessage.includes('明天')
        ? updatesCompletion ? '明天 18:00' : '明天 09:00'
        : ''
    const plannedEndAt = updatesCompletion && revisedTime
      ? revisedTime
      : decision.schema.fields.find((field) => field.key === 'plannedEndAt')?.value ?? decision.dueAt
    const plannedStartAt = !updatesCompletion && revisedTime
      ? revisedTime
      : decision.schema.fields.find((field) => field.key === 'plannedStartAt')?.value ?? ''

    return {
      ...decision,
      id: `decision-dispatch-${Date.now()}`,
      dueAt: plannedEndAt,
      schema: {
        ...decision.schema,
        fields: decision.schema.fields.map((field) => {
          if (field.key === 'plannedStartAt') return { ...field, value: plannedStartAt }
          if (field.key === 'plannedEndAt') return { ...field, value: plannedEndAt }
          return field
        }),
      },
    }
  }

  const reminderDecision = (item: CollaborationItem): AssistantDecision => ({
    id: `decision-reminder-${item.id}-${Date.now()}`,
    kind: 'reminder',
    item,
    reminderText: `请同步“${item.title}”的当前进展，如存在延期风险请一并说明。`,
  })

  const reminderReceiptDecision = (
    item: CollaborationItem,
    reminderText: string,
  ): AssistantDecision => ({
    id: `decision-reminder-receipt-${item.id}-${Date.now()}`,
    kind: 'reminder_receipt',
    item,
    reminderText,
  })

  const progressReplyDecision = (item: CollaborationItem): AssistantDecision => ({
    id: `decision-progress-${item.id}-${Date.now()}`,
    kind: 'progress_reply',
    item,
    reminderText: `请在${item.dueAt}前同步当前进展，如存在风险请直接说明。`,
  })

  const taskReceiptDecision = (item: CollaborationItem): AssistantDecision => {
    const recordMode = item.recordMode ?? 'assistant_local'
    const writesCProject = recordMode === 'c_project_bound'
    return {
      id: `decision-receipt-${item.id}-${Date.now()}`,
      kind: 'task_receipt',
      item,
      recordMode,
      schema: {
        schemaId: writesCProject ? 'c-project.task.receipt' : 'a2a.task.receipt',
        schemaVersion: writesCProject ? 'v2026.07.3' : 'A2A-v1',
        targetSystem: item.sourceSystem,
        fields: [
          { key: 'title', label: '名称', required: true, value: item.title, control: 'readonly' },
          { key: 'assignee', label: '负责人', required: true, value: item.assignee, control: 'readonly' },
          { key: 'plannedStartAt', label: '计划开始时间', required: true, value: item.plannedStartAt ?? '待确认', control: 'readonly' },
          { key: 'plannedEndAt', label: '计划完成时间', required: true, value: item.plannedEndAt ?? item.dueAt, control: 'readonly' },
          { key: 'estimatedHours', label: '预估工时', required: true, value: `${item.estimatedHours ?? '待确认'} 小时`, control: 'readonly' },
        ],
      },
    }
  }

  const workflowQuestionsDecision = (): AssistantDecision => ({
    id: `decision-workflow-risk-review-${Date.now()}`,
    kind: 'workflow_questions',
    workflow: 'risk_review_planning',
  })

  const handleDecisionDefer = (messageId: string, decision: AssistantDecision) => {
    const isInboundDecision = decision.kind === 'progress_reply' || decision.kind === 'task_receipt'
    updateActionCardStatus(
      messageId,
      isInboundDecision ? 'deferred' : 'cancelled',
    )
    if (isInboundDecision && 'item' in decision) {
      const decisionItem = decision.item
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
    if (decision.kind === 'workflow_questions') {
      appendMessage({
        role: 'assistant',
        content: '这次方案澄清草稿已取消，没有安排人员或执行任何外部动作。需要时可以重新告诉我评审范围、时间和准备方式。',
      })
    }
    window.setTimeout(() => composerRef.current?.focus(), 40)
  }

  const handleSupplementReply = (decision: AssistantDecision, message: string) => {
    if (!('item' in decision)) return
    const decisionItem = decision.item
    const eventId = Date.now()

    setReceiverItems((current) => current.map((item) => item.id === decisionItem.id ? {
      ...item,
      updatedAt: '刚刚',
      timeline: [...item.timeline, {
        id: `timeline-supplement-reply-${eventId}`,
        title: '你发送了补充回复',
        detail: message,
        time: '刚刚',
      }],
    } : item))
    setSenderItems((current) => current.map((item) => item.id === decisionItem.id ? {
      ...item,
      updatedAt: '刚刚',
      timeline: [...item.timeline, {
        id: `timeline-supplement-received-${eventId}`,
        title: `${decisionItem.assignee}补充回复`,
        detail: message,
        time: '刚刚',
      }],
    } : item))
    setReceiverMessages((current) => [...current, {
      id: `receiver-supplement-confirm-${eventId}`,
      role: 'assistant',
      content: decision.kind === 'progress_reply'
        || (decision.kind === 'task_receipt' && decision.recordMode === 'assistant_local')
        ? `补充回复已发送给${decisionItem.assigner}的数字分身。待确认卡仍保持原状态。`
        : `补充回复已发送给${decisionItem.assigner}的数字分身，任务状态未改变。`,
    }])
    setSenderMessages((current) => [...current, {
      id: `sender-supplement-received-${eventId}`,
      role: 'assistant',
      content: `${decisionItem.assignee}对“${decisionItem.title}”补充回复：${message}`,
    }])
  }

  const handleDecisionResolve = (
    messageId: string,
    decision: AssistantDecision,
    resolution: DecisionResolution,
  ) => {
    updateActionCardStatus(messageId, 'resolved')

    if (decision.kind === 'dispatch' && resolution.action === 'dispatch') {
      const assignee = resolution.assignee ?? '张三'
      const confirmedFields = resolution.fieldValues ?? {}
      const writesCProject = decision.recordMode === 'c_project_bound'
      const nextItem: CollaborationItem = {
        ...dispatchDraft,
        id: `collab-dispatched-${Date.now()}`,
        title: confirmedFields.title || decision.title,
        dueAt: confirmedFields.plannedEndAt || decision.dueAt,
        plannedStartAt: confirmedFields.plannedStartAt,
        plannedEndAt: confirmedFields.plannedEndAt,
        estimatedHours: confirmedFields.estimatedHours,
        recordMode: decision.recordMode,
        sourceSystem: decision.sourceSystem,
        assignee,
        decisionState: 'resolved',
        timeline: [{
          id: `timeline-dispatched-${Date.now()}`,
          title: `任务已派发给${assignee}`,
          detail: writesCProject
            ? `任务已按 ${decision.schema.schemaVersion} 校验并写入 C 项目管理平台，同时送达${assignee}的数字分身。`
            : `任务已保存到 A2A 协作任务服务和历史记录，并送达${assignee}的数字分身。`,
          time: '刚刚',
          tone: 'success',
        }],
      }
      setItems((current) => [nextItem, ...current])
      setSelectedItemId(nextItem.id)
      appendMessage({
        role: 'assistant',
        content: writesCProject
          ? `任务已经派发给${assignee}。C 项目管理平台写入成功，A2A 事件已送达，Workspace 投影也已更新。`
          : `任务已经派发给${assignee}。本次未写入 C 项目管理平台，A2A 原生任务、协作历史和 Workspace 投影均已创建。`,
      })

      const receiverItem: CollaborationItem = {
        ...nextItem,
        direction: 'incoming',
        assigner: '张嘉浩',
        assignee,
        status: 'pending',
        progress: writesCProject ? '任务已送达并自动接收' : '等待确认收到',
        decisionState: writesCProject ? 'resolved' : 'surfaced',
      }
      const receiptDecision = taskReceiptDecision(receiverItem)
      setReceiverUserName(assignee)
      setReceiverItems((current) => [receiverItem, ...current.filter((item) => item.id !== receiverItem.id)])
      setReceiverMessages((current) => [...current, {
        id: `receiver-dispatched-message-${Date.now()}`,
        role: 'assistant',
        content: `刚刚收到张嘉浩数字分身派发的新任务。${writesCProject ? '该任务来自 C 项目管理平台。' : '该任务仅保存在 A2A 协作域。'}`,
        actionCard: {
          decision: receiptDecision,
          status: writesCProject ? 'resolved' : 'pending_confirmation',
          version: 1,
        },
      }])
    }

    if (decision.kind === 'reminder' && resolution.action === 'send_reminder') {
      const decisionItem = decision.item
      const taskTitle = resolution.fieldValues?.taskTitle?.trim() || decisionItem.title
      const assignee = resolution.assignee?.trim() || decisionItem.assignee
      const reminderText = resolution.reminderText ?? decision.reminderText
      const reminderEventId = Date.now()
      setItems((current) => current.map((item) => item.id === decisionItem.id ? {
        ...item,
        decisionState: 'resolved',
        updatedAt: '刚刚',
        timeline: [...item.timeline, {
          id: `timeline-reminder-${Date.now()}`,
          title: `你向${assignee}发起了催办`,
          detail: reminderText,
          time: '刚刚',
          tone: 'warning',
        }],
      } : item))
      appendMessage({ role: 'assistant', content: `“${taskTitle}”的催办已发送给${assignee}。` })

      const receiverReminderItem: CollaborationItem = {
        ...decisionItem,
        id: `collab-reminder-received-${reminderEventId}`,
        kind: 'reminder',
        direction: 'incoming',
        title: taskTitle,
        assigner: '张嘉浩',
        assignee,
        description: reminderText,
        progress: '已收到催办，可补充回复',
        updatedAt: '刚刚',
        sourceSystem: 'A2A协作历史',
        recordMode: 'assistant_local',
        decisionState: 'resolved',
        timeline: [{
          id: `timeline-reminder-received-${reminderEventId}`,
          title: '收到催办',
          detail: reminderText,
          time: '刚刚',
          tone: 'warning',
        }],
      }
      const inboundReminderDecision = reminderReceiptDecision(receiverReminderItem, reminderText)
      setReceiverUserName(assignee)
      setReceiverItems((current) => [
        receiverReminderItem,
        ...current.filter((item) => item.id !== receiverReminderItem.id),
      ])
      setReceiverMessages((current) => [...current, {
        id: `receiver-reminder-message-${reminderEventId}`,
        role: 'assistant',
        content: `张嘉浩正在催办“${taskTitle}”：${reminderText}`,
        actionCard: {
          decision: inboundReminderDecision,
          status: 'resolved',
          version: 1,
        },
      }])
    }

    if (decision.kind === 'progress_reply' && resolution.action === 'reply_progress') {
      const decisionItem = decision.item
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
      if (perspective === 'receiver') {
        setSenderItems((current) => current.map((item) => item.id === decisionItem.id ? {
          ...item,
          status: 'in_progress',
          progress,
          updatedAt: '刚刚',
        } : item))
        setSenderMessages((current) => [...current, {
          id: `sender-progress-feedback-${Date.now()}`,
          role: 'assistant',
          content: `${decisionItem.assignee}回复了“${decisionItem.title}”的进展：${progress}`,
        }])
      }
    }

    if (decision.kind === 'task_receipt') {
      const decisionItem = decision.item
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
      setSenderItems((current) => current.map((item) => item.id === decisionItem.id ? {
        ...item,
        progress: requestedAdjustment ? '接收方申请调整计划' : `${decisionItem.assignee}已确认收到`,
        updatedAt: '刚刚',
        timeline: [...item.timeline, {
          id: `timeline-receiver-feedback-${Date.now()}`,
          title: requestedAdjustment ? `${decisionItem.assignee}申请调整` : `${decisionItem.assignee}确认收到`,
          detail: requestedAdjustment ? '调整申请已通过 A2A 回传，等待发起方处理。' : '确认收到不等于任务已经开始。',
          time: '刚刚',
          tone: requestedAdjustment ? 'warning' : 'success',
        }],
      } : item))
      setSenderMessages((current) => [...current, {
        id: `sender-receiver-feedback-${Date.now()}`,
        role: 'assistant',
        content: requestedAdjustment
          ? `${decisionItem.assignee}已通过数字分身申请调整“${decisionItem.title}”的计划，后续需要发起方重新确认。`
          : `${decisionItem.assignee}已确认收到“${decisionItem.title}”。这只表示任务已被接收，不代表已经开始或完成。`,
      }])
    }

    if (decision.kind === 'workflow_questions' && resolution.action === 'complete_workflow') {
      appendMessage({
        role: 'assistant',
        content: `专项评审方案已经整理完成：${resolution.workflowSummary}。这些回答只用于形成方案，我还没有派发任务；真正安排负责人时仍会单独请求你的最终确认。`,
      })
    }

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
    const recordMode = ['不写入C', '不进C', '仅A2A', '只存A2A', 'A2A原生']
      .some((keyword) => userMessage.replace(/\s/g, '').includes(keyword))
      ? 'assistant_local'
      : 'c_project_bound'
    appendMessage({ role: 'user', content: userMessage })
    startDecisionTurn(
      recordMode === 'c_project_bound'
        ? '我已经按 C 项目任务整理成一张完整草稿。请在同一张卡里核对负责人和计划信息，确认后才会正式写入并发送。'
        : '我已经整理成一张 A2A 原生任务草稿。它不会写入 C 项目管理平台，请核对全部信息后确认发送。',
      dispatchDecision(recordMode),
      1050,
    )
  }

  const runIncomingReminderDuringResponse = (userMessage: string) => {
    const target = items.find((item) => item.id === 'collab-engine-review') ?? items[0]
    appendMessage({ role: 'user', content: userMessage })
    setIsModelResponding(true)
    const messageId = appendMessage({ role: 'assistant', content: '我正在汇总长会话中的协作记录、任务文件和最新进展，这会持续一小段时间…', streaming: true })

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
      onNotificationReceived(createIncomingReminderNotification())
    }, 900)

    const finishTimer = window.setTimeout(() => {
      finishModelResponse(messageId, '汇总完成：今天已经完成两项材料整理，还有一项发动机风险评审正在推进。我已经把关键进展整理到当前长会话中。')
    }, 8500)

    timersRef.current.push(incomingTimer, finishTimer)
  }

  const submitPrompt = () => {
    if (isModelResponding) return
    const value = prompt.trim()
    if (!value) return
    setPrompt('')
    if (subagentRun) {
      clearSubagentTimers()
      setSubagentRun(null)
      setActiveSubagentId(null)
    }

    const latestPendingDispatchMessage = [...messages].reverse().find((message) => (
      message.actionCard?.status === 'pending_confirmation'
      && message.actionCard.decision.kind === 'dispatch'
    ))
    const pendingDispatchCard = latestPendingDispatchMessage?.actionCard
    const changesPendingDispatch = pendingDispatchCard?.decision.kind === 'dispatch'
      && ['今天', '明天', '推进', '截止', '改成', '调整', '换成'].some((keyword) => value.includes(keyword))

    if (latestPendingDispatchMessage && pendingDispatchCard?.decision.kind === 'dispatch' && changesPendingDispatch) {
      appendMessage({ role: 'user', content: value })
      const nextVersion = pendingDispatchCard.version + 1
      const revisedDecision = reviseDispatchDecision(pendingDispatchCard.decision, value)
      updateActionCardStatus(latestPendingDispatchMessage.id, 'superseded', nextVersion)
      startDecisionTurn(
        `我已经按你的补充更新任务草稿，生成第 ${nextVersion} 版。它仍未正式下发，请检查后点击卡片中的确认按钮。`,
        revisedDecision,
        760,
        nextVersion,
      )
      return
    }

    if (
      latestPendingDispatchMessage
      && ['确认下发', '下发吧', '就按这个下发', '直接下发'].some((keyword) => value.includes(keyword))
    ) {
      appendMessage({ role: 'user', content: value })
      appendMessage({
        role: 'assistant',
        content: pendingDispatchCard?.decision.kind === 'dispatch' && pendingDispatchCard.decision.recordMode === 'assistant_local'
          ? '这句话不会触发正式下发。任务仍是待确认草稿；请点击行动卡中的“确认派发”，系统才会创建 A2A 原生任务并通知负责人。'
          : '这句话不会触发正式下发。任务仍是待确认草稿；请点击行动卡中的“确认派发”，系统才会写入 C 项目管理平台并发送 A2A 事件。',
      })
      return
    }

    if (
      value.includes('子智能体')
      || value.includes('SubAgent')
      || value.toLowerCase().includes('subagent')
      || value.includes('并行分析')
      || (value.includes('分析') && value.includes('客户支援'))
    ) {
      runSubagentDemo(value, {
        shouldFail: value.includes('模拟失败') || value.includes('超时场景'),
      })
      return
    }

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
    if (
      value.includes('派')
      || value.includes('张三')
      || (value.includes('创建') && value.toUpperCase().includes('A2A'))
    ) {
      runDispatchFlow(value)
      return
    }
    if (
      value.includes('模拟长任务')
      ||
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
    appendMessage({
      role: 'assistant',
      content: perspective === 'sender'
        ? '你可以直接派发 C 项目任务、创建仅 A2A 协作任务、催办已有任务或查询进展。正式动作仍需点击行动卡确认。'
        : '你可以查看收到的任务、补充回复或回复任务进展。相关事项会一直保留在 A2A 协作记录和 Workspace 中。',
    })
  }

  const switchPerspective = () => {
    const nextPerspective: DemoPerspective = perspective === 'sender' ? 'receiver' : 'sender'
    setPerspective(nextPerspective)
    setPrompt('')
    clearSubagentTimers()
    setSubagentRun(null)
    setActiveSubagentId(null)
    setSelectedItemId(nextPerspective === 'sender'
      ? senderItems[0]?.id ?? 'collab-engine-review'
      : receiverItems[0]?.id ?? receiverDemoTask.id)
    assistantWorkbench.hideWorkspace()
    window.setTimeout(() => {
      const thread = threadRef.current
      if (thread) thread.scrollTop = thread.scrollHeight
      composerRef.current?.focus()
    }, 40)
  }

  return (
    <div className={[
      'assistant-workbench',
      assistantWorkbench.workspaceVisible ? 'assistant-workbench--with-workspace' : '',
    ].filter(Boolean).join(' ')}>
      <section className="assistant-chat-pane">
        <header className="assistant-header">
          <div className="assistant-identity">
            <span className="assistant-identity-avatar"><Bot size={23} /></span>
            <div>
              <p>个人数字分身 · {perspective === 'sender' ? '发起方视角' : '接收方视角'}</p>
              <h2>{perspective === 'sender' ? '我的助理' : `${receiverUserName}的助理`}</h2>
            </div>
          </div>
          <div className="assistant-header-actions">
            <button
              className="assistant-perspective-switch"
              type="button"
              disabled={isModelResponding}
              onClick={switchPerspective}
              title={perspective === 'sender' ? '查看任务接收方的助理对话' : '返回任务发起方的助理对话'}
            >
              <ArrowLeftRight size={17} />
              <span>{perspective === 'sender' ? '切换接收方' : '返回发起方'}</span>
            </button>
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

        <section className="assistant-thread" aria-label="助理对话" ref={threadRef}>
          <div className="assistant-thread-date"><span>今天</span></div>
          {messages.map((message) => (
            <article
              className={[
                'assistant-message',
                `assistant-message--${message.role}`,
                message.actionCard ? 'assistant-message--with-action' : '',
              ].filter(Boolean).join(' ')}
              key={message.id}
            >
              {message.role === 'assistant' && <div className="assistant-message-avatar"><Bot size={18} /></div>}
              <div className="assistant-message-body">
                {message.role === 'assistant' && <strong className="assistant-message-name">COMAC AI</strong>}
                {message.notification ? (
                  <div className="assistant-inserted-notification">
                    <span>{notificationKindLabel(message.notification.kind)} · 来自消息通知</span>
                    <strong>{message.notification.title}</strong>
                    <p>{message.notification.summary}</p>
                    <small>{message.notification.source}{message.notification.project ? ` · ${message.notification.project}` : ''}</small>
                  </div>
                ) : (
                  <p className={message.streaming ? 'assistant-message-streaming' : ''}>
                    {message.content}
                    {message.streaming && <span><LoaderCircle size={15} />模型输出中</span>}
                  </p>
                )}
                {message.taskList && <TaskQueryResult items={items} scope={message.taskList} onOpen={openTaskFile} />}
                {message.actionCard && (
                  <AssistantDecisionPanel
                    key={message.actionCard.decision.id}
                    decision={message.actionCard.decision}
                    status={message.actionCard.status}
                    onDefer={() => handleDecisionDefer(message.id, message.actionCard!.decision)}
                    onResolve={(resolution) => handleDecisionResolve(message.id, message.actionCard!.decision, resolution)}
                    onSupplementReply={perspective === 'receiver'
                      && ['task_receipt', 'progress_reply', 'reminder_receipt'].includes(message.actionCard.decision.kind)
                      ? (reply) => handleSupplementReply(message.actionCard!.decision, reply)
                      : undefined}
                  />
                )}
                {message.retrySubagent && (
                  <button className="subagent-retry-link" type="button" onClick={() => retrySubagentRun(message.id)}>
                    重新执行
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>

        {subagentRun && (
          <SubagentCollaboration
            run={subagentRun}
            activeAgentId={activeSubagentId}
            onSelectAgent={setActiveSubagentId}
          />
        )}

        <section className={`assistant-composer ${isModelResponding ? 'assistant-composer--blocked' : ''}`} aria-label="助理输入器">
          {isModelResponding ? (
            <div className="assistant-composer-blocked-message">
              <span><LoaderCircle size={20} /></span>
              <div>
                <strong>{subagentRun ? '正在等待子智能体完成' : '助理正在处理当前任务'}</strong>
                <small>{subagentRun ? '点击上方子智能体，可查看实时执行过程' : '当前回复结束后可以继续发送消息'}</small>
              </div>
            </div>
          ) : (
            <textarea
              ref={composerRef}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  submitPrompt()
                }
              }}
              placeholder={perspective === 'sender'
                ? '直接问我待办、派发、催办，或输入“用子智能体分析客户支援”体验协同…'
                : '可以继续聊天，或回复收到的任务与催办…'}
            />
          )}
          <div className="assistant-composer-toolbar">
            <div>
              <button type="button" disabled={isModelResponding}><Layers3 size={17} /><span>商飞大模型 L1-S1</span></button>
              <button type="button" disabled={isModelResponding}><WandSparkles size={17} /><span>技能</span></button>
            </div>
            <div>
              <button className="assistant-composer-icon" type="button" disabled={isModelResponding} aria-label="添加附件"><Paperclip size={19} /></button>
              <button className="assistant-composer-icon assistant-composer-sparkle" type="button" disabled={isModelResponding} aria-label="智能增强"><Sparkles size={19} /></button>
              <button
                className={`assistant-send-button ${prompt.trim() && !isModelResponding ? 'ready' : ''}`}
                type="button"
                disabled={isModelResponding}
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
    </div>
  )
}
