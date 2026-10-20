import { CBrainAskUser } from './CBrainAskUser'
import { A2AIntentDemo, type IntentDemoQuestion } from './A2AIntentDemo'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bot,
  ChevronRight,
  ClipboardCheck,
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
import type { AssistantDecision, DecisionCardStatus } from './assistantDecisionFlow'
import {
  collaborationSeeds,
  dispatchDraft,
  statusLabel,
  type CollaborationItem,
  type CollaborationStatus,
} from './mockCollaboration'
import {
  createIncomingAutomationNotification,
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
import {
  isA2AConversationIntent,
  mechanismLabels,
  scopeLabels,
  type A2ACommandResult,
  type A2AConversation,
} from './a2aConversationTypes'
import './assistant.css'

type TaskListScope = 'attention' | 'all' | 'incoming' | 'outgoing'

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
  a2aReminders?: { conversationId: string; requestId: string; title: string; question: string }[]
  askUserDemo?: IntentDemoQuestion
  groupDraft?: { goal: string; members?: string }
  a2aConversationId?: string
  delegatedTaskId?: string
  cBrainLink?: string
  cBrainQuestion?: 'category' | 'form'
}

type AssistantWorkspaceProps = {
  onCreateTask: (goal:string)=>string
  onOpenTask: (id:string)=>void
  onCreateReminderAutomation: (item: CollaborationItem) => boolean
  notificationToDeliver: AssistantNotification | null
  onNotificationAccepted: (notificationId: string) => void
  onNotificationDelivered: (notificationId: string) => void
  onNotificationReceived: (notification: AssistantNotification) => void
  onBusyChange: (busy: boolean) => void
  viewedA2AConversationId?: string | null
  a2aConversations: A2AConversation[]
  onRunA2ACommand: (prompt: string) => A2ACommandResult
  onWorkspaceVisibilityChange: (visible: boolean) => void
  onOpenA2AConversation: (conversationId: string) => void
}

const initialMessages: AssistantMessage[] = [
  {
    id: 'assistant-briefing',
    role: 'assistant',
    content: `早上好。助理长会话会持续记住必要上下文。你可以直接输入以下示例口令体验 Demo：

• “帮我持续推进用户研究工具采购准备”：建立任务，从主会话整理材料、发起沟通。
• “模拟长任务”或“总结协作进展”：触发长会话堵塞，期间收到的 A2A 与定时任务消息会进入消息通知中心。
• “本周供应商交付风险找谁确认”：体验 Ask User 澄清联系意图和对象。
• “帮我建个群讨论数字宠物需求”：通过输入区 Ask User 依次补齐目标、参与人、最大轮次，再创建群聊并发送。
• “帮我问一下供应商本周交付风险”：联系意图明确，只补充对象。
• “帮我处理一下表单”：体验 C大脑入口的 Ask User 澄清。
• “帮我打开 IT运维工单应用”：直接获得应用入口链接。
• “查看所有任务”：查询并展示全部协作任务。
• “派任务给张三”：生成写入 C 项目管理平台的任务草稿。
• “创建仅 A2A 会话给张三”：生成不写入 C 项目管理平台的 A2A 原生任务草稿。
• “催一下张三”：定位已有任务并生成催办确认。
• “设置自动催办”：为当前任务创建自动催办。
• “回复当前进展”：生成任务进展回复确认。
• “通知李四下午评审改到三点”：创建单聊通知。
• “请王五确认供应商交付风险”：创建可跟踪的单聊协作。
• “通知李四、王五年度安排已更新”：创建群聊通知。
• “和陈工、刘工发起方案评审协作”：创建严格顺序回复的群聊协作。
• 新建会话后可从左侧进入；中间与自己的分身沟通并处理 Ask User；顶部查看目标与进展，右侧查看协作记录和 Workspace。
• “组织一次专项评审”：进入评审策划问答流程。
• “用子智能体分析客户支援”：体验多个子智能体并行协作；补充“模拟失败”可体验失败与重试。

需要 A2A 时由模型调用工具，并在当前用户私人分身对话中通过 Ask User 补齐信息；信息完整后再创建会话。`,
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
      <footer>此文件是任务服务在个人助理 Workspace 中的可追溯投影。自然语言可以补充当前事项；需要 A2A 时由工具和 Ask User 补齐信息，信息完整后再创建会话。</footer>
    </article>
  )
}

export default function AssistantWorkspace({
  onCreateTask, onOpenTask,
  onCreateReminderAutomation,
  notificationToDeliver,
  onNotificationAccepted,
  onNotificationDelivered,
  onNotificationReceived,
  onBusyChange,
  a2aConversations,
  viewedA2AConversationId,
  onRunA2ACommand,
  onWorkspaceVisibilityChange,
  onOpenA2AConversation,
}: AssistantWorkspaceProps) {
  const threadRef = useRef<HTMLElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const timersRef = useRef<number[]>([])
  const subagentTimersRef = useRef<number[]>([])
  const acceptedNotificationIdsRef = useRef(new Set<string>())
  const [items, setItems] = useState<CollaborationItem[]>(collaborationSeeds)
  const [messages, setMessages] = useState<AssistantMessage[]>(initialMessages)
  const [prompt, setPrompt] = useState('')
  const [selectedFileId, setSelectedFileId] = useState('assistant-memory-main')
  const [selectedItemId, setSelectedItemId] = useState('collab-engine-review')
  const [isModelResponding, setIsModelResponding] = useState(false)
  const [queuedA2ARequests, setQueuedA2ARequests] = useState<string[]>([])
  const [subagentRun, setSubagentRun] = useState<SubagentRun | null>(null)
  const [activeSubagentId, setActiveSubagentId] = useState<string | null>(null)
  const assistantWorkbench = useWorkspaceWorkbench({
    initialTabs: [{
      id: 'file:assistant-memory-main',
      title: 'MEMORY.md',
      mode: 'file',
      nodeId: 'assistant-memory-main',
      kind: 'markdown',
    }],
    initialNavigatorOpen: true,
    initialWorkspaceVisible: false,
  })

  useEffect(() => {
    onWorkspaceVisibilityChange(assistantWorkbench.workspaceVisible)
  }, [assistantWorkbench.workspaceVisible, onWorkspaceVisibilityChange])

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

  const remindedA2A = useRef(new Set<string>())
  useEffect(() => {
    const waiting = a2aConversations.filter(conversation => conversation.status !== 'completed' && conversation.pendingCurrentUserConfirmation)
    for (const conversation of waiting) {
      if (conversation.id === viewedA2AConversationId) remindedA2A.current.add(`${conversation.id}:${conversation.pendingCurrentUserConfirmation!.id}`)
    }
    if (isModelResponding) return
    const fresh = waiting.filter(conversation => !remindedA2A.current.has(`${conversation.id}:${conversation.pendingCurrentUserConfirmation!.id}`))
    if (!fresh.length) return
    fresh.forEach(conversation => remindedA2A.current.add(`${conversation.id}:${conversation.pendingCurrentUserConfirmation!.id}`))
    appendMessage({role: 'assistant', content: fresh.length === 1
      ? `“${fresh[0].title}”中有一项内容需要你处理。`
      : `有 ${fresh.length} 个 A2A 会话需要你处理。`,
      a2aReminders: fresh.map(conversation => ({conversationId:conversation.id, requestId:conversation.pendingCurrentUserConfirmation!.id, title:conversation.title, question:conversation.pendingCurrentUserConfirmation!.question}))})
  }, [a2aConversations, viewedA2AConversationId, isModelResponding, appendMessage])

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

  const runA2ACommand = useCallback((value: string, fromQueue = false) => {
    appendMessage({ role: 'user', content: value })
    setIsModelResponding(true)
    const messageId = appendMessage({
      role: 'assistant',
      content: fromQueue ? '当前任务已经结束，我正在处理刚才排队的 A2A 请求…' : '我正在识别会话对象、沟通范围和事项机制…',
      streaming: true,
    })
    const timer = window.setTimeout(() => {
      let result: A2ACommandResult
      try { result = onRunA2ACommand(value) } catch (error) {
        finishModelResponse(messageId, error instanceof Error ? error.message : '发送失败，请重试。')
        return
      }
      const { conversation } = result
      const members = conversation.members.map((member) => member.name).join('、')
      const typeName = `${scopeLabels[conversation.scope]}${mechanismLabels[conversation.mechanism]}`
      const behavior = result.command.action === 'complete'
        ? '请进入会话，在底部问题面板确认后再标记完成。'
        : conversation.mechanism === 'collaboration'
          ? conversation.scope === 'group'
            ? `系统会跟踪${conversation.expectedReplyCount}位参与人的回复；群聊按${conversation.members.map((member) => member.name).join(' → ')}的顺序各回复一次。`
            : `系统会跟踪${conversation.members[0].name}是否回复；收到回复后会回到助理提醒你判断目标是否完成。`
          : '本次只记录送达，不创建待办，也不要求对方回复。'
      finishModelResponse(
        messageId,
        `${result.command.action === 'complete' ? `已为${typeName}“${conversation.title}”发起完成确认` : result.created ? `${typeName}“${conversation.title}”已经创建` : `已通过你的数字分身向“${conversation.title}”代发消息`}。参与人：${members}。${behavior}可查看任务沟通继续沟通。`,
      )
      setMessages((current) => current.map((message) => message.id === messageId
        ? { ...message, a2aConversationId: conversation.id }
        : message))
    }, 900)
    timersRef.current.push(timer)
  }, [appendMessage, finishModelResponse, onRunA2ACommand])

  useEffect(() => {
    if (isModelResponding || queuedA2ARequests.length === 0) return
    const request = queuedA2ARequests[0]
    setQueuedA2ARequests((current) => current.slice(1))
    runA2ACommand(request, true)
  }, [isModelResponding, queuedA2ARequests, runA2ACommand])

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
      !notificationToDeliver
      || isModelResponding
      || acceptedNotificationIdsRef.current.has(notificationToDeliver.id)
    ) return

    const notification = notificationToDeliver
    acceptedNotificationIdsRef.current.add(notification.id)
    onNotificationAccepted(notification.id)
    assistantWorkbench.hideWorkspace()
    appendMessage({
      role: 'user',
      content: notification.summary,
      notification,
    })

    if (notification.kind === 'automation') {
      appendMessage({
        role: 'assistant',
        content: `定时任务“${notification.title}”已按队列顺序自动进入长会话。该结果不会触发新一轮模型处理。`,
      })
      onNotificationDelivered(notification.id)
      return
    }

    setIsModelResponding(true)
    const messageId = appendMessage({
      role: 'assistant',
      content: `这条${notificationKindLabel(notification.kind)}已按先进先出顺序自动进入长会话，正在结合上下文处理…`,
      streaming: true,
    })
    const timer = window.setTimeout(() => {
      const result = `这条 A2A 消息已经处理：${notification.summary}我已结合当前会话梳理出回复要点，下一步可以继续生成正式回复或更新关联任务。`
      finishModelResponse(messageId, result)
      onNotificationDelivered(notification.id)
    }, 2200)
    timersRef.current.push(timer)
  }, [
    assistantWorkbench,
    appendMessage,
    finishModelResponse,
    isModelResponding,
    notificationToDeliver,
    onNotificationAccepted,
    onNotificationDelivered,
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

    const automationTimer = window.setTimeout(() => {
      onNotificationReceived(createIncomingAutomationNotification())
    }, 1500)

    const finishTimer = window.setTimeout(() => {
      finishModelResponse(messageId, '汇总完成：今天已经完成两项材料整理，还有一项发动机风险评审正在推进。我已经把关键进展整理到当前长会话中。')
    }, 8500)

    timersRef.current.push(incomingTimer, automationTimer, finishTimer)
  }

  const intentDemoInFlight = useRef(false)
  const answerIntentDemo = (id: string, answer: string) => {
    const pending = messages.find(message => message.id === id)
    if (intentDemoInFlight.current || !pending?.askUserDemo) return
    intentDemoInFlight.current = true
    setMessages(current => current.map(message => message.id === id ? { ...message, askUserDemo: undefined } : message))
    if (answer === 'cancel' || answer === 'query') {
      appendMessage({ role: 'assistant', content: answer === 'cancel'
        ? '已取消本次联系请求，没有创建会话或发送消息。'
        : '好的，本次只查询信息，不联系别人。当前演示未接入业务查询，不提供模拟查询结论。' })
    } else if (answer === 'contact') {
      appendMessage({ role: 'user', content: '联系同事的分身确认' })
      appendMessage({ role: 'assistant', content: '好的，只需要补充联系对象。', askUserDemo: 'person' })
    } else if (pending.askUserDemo === 'pet-goal') {
      appendMessage({ role: 'user', content: answer })
      appendMessage({ role: 'assistant', content: `本次目标：${answer}。接下来选一下需要参与的同事。`, askUserDemo: 'pet-members', groupDraft: { goal: answer } })
    } else if (pending.askUserDemo === 'pet-members' && pending.groupDraft) {
      appendMessage({ role: 'user', content: `邀请${answer}` })
      appendMessage({ role: 'assistant', content: `参与人是你和${answer}。最后确定本次最多进行几轮沟通。`, askUserDemo: 'pet-rounds', groupDraft: { ...pending.groupDraft, members: answer } })
    } else if (pending.askUserDemo === 'pet-rounds' && pending.groupDraft?.members) {
      const { goal, members } = pending.groupDraft
      const result = onRunA2ACommand(`新建数字宠物群聊协作，邀请${members}，最多${answer}轮：${goal}`)
      appendMessage({ role: 'user', content: `最多 ${answer} 轮，创建群聊并发送` })
      appendMessage({ role: 'assistant', content: `已邀请${members}创建群聊，最多进行 ${answer} 轮，并发送开场消息：“${goal}”。`, a2aConversationId: result.conversation.id })
    } else {
      const result = onRunA2ACommand(`新建单聊协作，请${answer}确认：请说明供应商本周交付节点及主要风险。`)
      appendMessage({ role: 'user', content: `联系${answer}` })
      appendMessage({ role: 'assistant', content: `已创建与${answer}的单聊，询问供应商本周交付节点及主要风险。可查看任务沟通继续沟通。`, a2aConversationId: result.conversation.id })
    }
    // The answered prompt is removed before another answer can be submitted.
    queueMicrotask(() => { intentDemoInFlight.current = false })
  }

  const resolveCBrainEntry = (value: string) => {
    if (/it运维工单/i.test(value.replace(/\s/g, ''))) {
      appendMessage({ role: 'assistant', content: '已找到「IT运维工单」应用。', cBrainLink: '打开 IT运维工单应用' })
      return
    }
    const form = ['请假申请', '差旅报销', '日常费用报销'].find(name => value.includes(name))
    if (form) {
      const title = form === '请假申请' ? form : `${form}申请`
      appendMessage({ role: 'assistant', content: `已找到「${form === '请假申请' ? '人事' : '财务'}系统 · ${title}」表单。`, cBrainLink: `打开${title}` })
    } else if (value.includes('报销')) {
      appendMessage({ role: 'assistant', content: '找到两个报销入口，请确认你想打开哪一个。', cBrainQuestion: 'form' })
    } else {
      appendMessage({ role: 'assistant', content: '请补充表单名称或用途，我来帮你找到对应入口。', cBrainQuestion: 'category' })
    }
  }

  const answerCBrainQuestion = (id: string, answer: string | null) => {
    if (intentDemoInFlight.current || !messages.some(message => message.id === id && message.cBrainQuestion)) return
    intentDemoInFlight.current = true
    setMessages(current => current.map(message => message.id === id ? { ...message, cBrainQuestion: undefined } : message))
    if (answer === null) {
      appendMessage({ role: 'assistant', content: '已取消本次查找。' })
    } else {
      appendMessage({ role: 'user', content: answer })
      resolveCBrainEntry(answer)
    }
    queueMicrotask(() => { intentDemoInFlight.current = false })
  }

  const activeAskUser = messages.find(message => message.askUserDemo || message.cBrainQuestion)
  const hadAskUser = useRef(false)
  useEffect(() => {
    if (hadAskUser.current && !activeAskUser) composerRef.current?.focus()
    hadAskUser.current = Boolean(activeAskUser)
  }, [activeAskUser])

  const submitPrompt = (example?: string) => {
    const value = (example ?? prompt).trim()
    if (!value) return
    if (isModelResponding) {
      if (isA2AConversationIntent(value, a2aConversations)) {
        setQueuedA2ARequests((current) => [...current, value])
        setPrompt('')
      }
      return
    }
    setPrompt('')
    if (subagentRun) {
      clearSubagentTimers()
      setSubagentRun(null)
      setActiveSubagentId(null)
    }

    if (/持续推进|持续跟进|创建任务/.test(value)) {
      appendMessage({role:'user',content:value})
      const id=onCreateTask(value)
      appendMessage({role:'assistant',content:'已把这项委托建立为任务。进入任务后，我们可以先整理背景和材料，再按需联系其他人。',delegatedTaskId:id})
      return
    }
    if (/表单|请假申请|差旅报销|日常费用报销|it运维工单/i.test(value.replace(/\s/g, '')) && /处理|打开|找/.test(value)) {
      appendMessage({ role: 'user', content: value })
      resolveCBrainEntry(value)
      return
    }
    const petDemo = ['帮我建个群讨论数字宠物需求', '帮我拉个群讨论数字宠物需求', '帮我创建一个数字宠物需求讨论群'].includes(value.replace(/[。！!]+$/, ''))
    if (petDemo) {
      appendMessage({ role: 'user', content: value })
      appendMessage({ role: 'assistant', content: '可以。我会先补齐沟通目标、参与人和最大轮次，信息齐全后创建群聊并发出首条消息。先明确这次希望解决什么问题。', askUserDemo: 'pet-goal' })
      return
    }
    const intentDemo = value.includes('本周') && value.includes('交付风险') && (value.includes('找谁确认') || value.includes('帮我问一下'))
    if (intentDemo) {
      setMessages(current => current.map(message => message.askUserDemo ? { ...message, askUserDemo: undefined } : message))
      appendMessage({ role: 'user', content: value })
      appendMessage({ role: 'assistant', content: value.includes('找谁确认')
        ? '我先明确你是要查询信息，还是希望我联系别人。'
        : '我知道你希望联系别人确认交付风险，还需要知道联系谁。',
        askUserDemo: value.includes('找谁确认') ? 'intent' : 'person' })
      return
    }
    if (isA2AConversationIntent(value, a2aConversations)) {
      runA2ACommand(value)
      return
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
          ? '这句话不会直接创建任务。请在当前私人分身对话中补齐 A2A 所需信息，确认后由工具创建会话。'
          : '这句话不会直接写入业务系统。请在当前私人分身对话中补齐 A2A 所需信息，确认后由工具创建会话；业务系统写入仍按人工提交边界处理。',
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
      content: '你可以描述需要协作的事项。模型识别为 A2A 后会调用工具，并在你的私人分身对话中通过 Ask User 补齐必要信息，再创建单聊或群聊。',
    })
  }

  const canSubmitWhileBusy = isModelResponding && isA2AConversationIntent(prompt.trim(), a2aConversations)

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
              <p>个人数字分身 · 当前用户</p>
              <h2>我的助理</h2>
            </div>
          </div>
          <div className="assistant-header-actions">
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
                message.a2aReminders ? 'assistant-message--a2a-notice' : '',
              ].filter(Boolean).join(' ')}
              key={message.id}
            >
              {message.role === 'assistant' && !message.a2aReminders && <div className="assistant-message-avatar"><Bot size={18} /></div>}
              <div className="assistant-message-body">
                {message.role === 'assistant' && !message.a2aReminders && <strong className="assistant-message-name">Comac Claw</strong>}
                {message.notification ? (
                  <div className="assistant-inserted-notification">
                    <span>{notificationKindLabel(message.notification.kind)} · 来自消息通知</span>
                    <strong>{message.notification.title}</strong>
                    <p>{message.notification.summary}</p>
                    <small>{message.notification.source}{message.notification.project ? ` · ${message.notification.project}` : ''}</small>
                  </div>
                ) : !message.a2aReminders ? (
                  <p className={message.streaming ? 'assistant-message-streaming' : ''}>
                    {message.content}
                    {message.streaming && <span><LoaderCircle size={15} />模型输出中</span>}
                  </p>
                ) : null}
                {message.a2aReminders?.map(reminder => {
                  const conversation = a2aConversations.find(item => item.id === reminder.conversationId)
                  const status = !conversation ? '会话不可用' : conversation.status === 'completed' ? '会话已完成' : conversation.pendingCurrentUserConfirmation?.id === reminder.requestId ? '待你处理' : '已处理'
                  const prefix = [`“${reminder.title}”`, `${reminder.title}：`, `${reminder.title}:`].find(value => reminder.question.startsWith(value))
                  const question = prefix ? reminder.question.slice(prefix.length).trim() : reminder.question
                  return <div className="assistant-a2a-reminder" key={reminder.requestId}>
                    <header><span className="assistant-a2a-source">A2A 会话</span><span className="assistant-a2a-title">{reminder.title}</span>{status !== '待你处理' && <span className="assistant-a2a-state">{status}</span>}</header>
                    <p>{question}</p>
                    {conversation && <button className="assistant-a2a-link" type="button" onClick={() => onOpenA2AConversation(reminder.conversationId)}>{status === '待你处理' ? '前往处理' : '查看会话'}</button>}
                  </div>
                })}
                {message.taskList && <TaskQueryResult items={items} scope={message.taskList} onOpen={openTaskFile} />}
                {message.delegatedTaskId && <button className="assistant-a2a-link" onClick={()=>onOpenTask(message.delegatedTaskId!)}>查看任务 ↗</button>}
                {message.cBrainLink && <a className="assistant-cbrain-link" href={`${import.meta.env.BASE_URL}cbrain-blank.html`}>{message.cBrainLink}<ChevronRight size={16} /></a>}
                {message.a2aConversationId && (
                  <button className="assistant-a2a-link" type="button" onClick={() => onOpenA2AConversation(message.a2aConversationId!)}>
                    查看任务沟通
                  </button>
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

        {queuedA2ARequests.length > 0 && <div className="assistant-queued-command">{queuedA2ARequests.length} 条 A2A 发送请求已排队，当前任务结束后会依次处理。</div>}
        <section className={`assistant-composer ${activeAskUser ? 'has-ask-user' : ''} ${isModelResponding ? 'assistant-composer--blocked' : ''}`} aria-label="助理输入器">
          {activeAskUser?.cBrainQuestion ? <CBrainAskUser key={activeAskUser.id} question={activeAskUser.cBrainQuestion}
            onAnswer={answer => answerCBrainQuestion(activeAskUser.id, answer)}
            onCancel={() => answerCBrainQuestion(activeAskUser.id, null)} /> : activeAskUser ? <A2AIntentDemo key={activeAskUser.id} question={activeAskUser.askUserDemo!}
            onAnswer={answer => answerIntentDemo(activeAskUser.id, answer)}
            onCancel={() => answerIntentDemo(activeAskUser.id, 'cancel')} /> : <>
          {isModelResponding && (
            <div className="assistant-composer-busy-strip">
              <LoaderCircle size={14} />
              <span>{subagentRun ? '正在等待子智能体完成；A2A 发送请求仍可排队' : '助理正在处理当前任务；A2A 发送请求仍可排队'}</span>
            </div>
          )}
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
            placeholder={isModelResponding
              ? '例如：通知李四、王五下午评审改到三点'
              : '问我待办、派发、催办，或让我发起和回复 A2A 会话…'}
          />
          <div className="assistant-composer-toolbar">
            <div>
              <button type="button" disabled={isModelResponding}><Layers3 size={17} /><span>商飞大模型 L1-S1</span></button>
              <button type="button" disabled={isModelResponding}><WandSparkles size={17} /><span>技能</span></button>
            </div>
            <div>
              <button className="assistant-composer-icon" type="button" disabled={isModelResponding} aria-label="添加附件"><Paperclip size={19} /></button>
              <button className="assistant-composer-icon assistant-composer-sparkle" type="button" disabled={isModelResponding} aria-label="智能增强"><Sparkles size={19} /></button>
              <button
                className={`assistant-send-button ${prompt.trim() && (!isModelResponding || canSubmitWhileBusy) ? 'ready' : ''}`}
                type="button"
                disabled={isModelResponding && !canSubmitWhileBusy}
                onClick={() => submitPrompt()}
                aria-label={isModelResponding ? '将 A2A 请求加入队列' : '发送'}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
          </>}
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
