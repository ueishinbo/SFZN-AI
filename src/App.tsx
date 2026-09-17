import { useCallback, useEffect, useMemo, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Bot,
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  Ellipsis,
  ExternalLink,
  File,
  FileCode2,
  FileType,
  FileText,
  Folder,
  Globe2,
  LayoutPanelLeft,
  LayoutGrid,
  Layers3,
  Maximize2,
  Mic,
  Minimize2,
  Paperclip,
  Plus,
  Presentation,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  WandSparkles,
} from 'lucide-react'
import './App.css'
import type { AppMode } from './app/appTypes'
import AdminWorkspace from './admin/AdminWorkspace'
import AutomationWorkspace from './automation/AutomationWorkspace'
import AssistantWorkspace from './assistant/AssistantWorkspace'
import A2AConversationView, { type ConversationActivityPatch } from './assistant/A2AConversationView'
import AssistantModeSidebar, { type AssistantDestination } from './assistant/AssistantModeSidebar'
import AssistantFeaturePlaceholder from './assistant/AssistantFeaturePlaceholder'
import {
  buildA2ACommand,
  seedA2AConversations,
  type A2ACommandResult,
  type A2AConversation,
  type A2AConversationCommand,
} from './assistant/a2aConversationTypes'
import type { CollaborationItem } from './assistant/mockCollaboration'
import NotificationCenter from './assistant/NotificationCenter'
import NotificationDetailView from './assistant/NotificationDetailView'
import {
  createSeedNotifications,
  type AssistantNotification,
} from './assistant/mockNotifications'
import WorkspaceWorkbench, { WorkspaceHeaderControls, type WorkspaceOutputItem } from './workspace/WorkspaceWorkbench'
import ExternalAgentWorkspace from './external-agent/ExternalAgentWorkspace'
import OrganizationWorkbench from './organization/OrganizationWorkbench'
import { projectConversations, projects, conversationIdFor } from './organization/projectData'
import DigitalTwinTrainingWorkspace, { A2ATaskBoard } from './digital-twin/DigitalTwinTrainingWorkspace'
import { useWorkspaceWorkbench, type WorkspaceTab } from './workspace/useWorkspaceWorkbench'
import type { WorkspaceTreeNode } from './workspace/workspaceTypes'
import {
  calculateNextRun,
  formatHistoryTime,
  loadStoredList,
  RUNS_STORAGE_KEY,
  seedRuns,
  seedTasks,
  TASKS_STORAGE_KEY,
  type AutomationRun,
  type AutomationTask,
} from './automation/mockAutomation'

type Task = {
  id: number | string
  title: string
  time: string
  automationRunId?: string
}

type ArtifactType = 'HTML' | 'PPT' | 'WORD' | 'Markdown'

type Artifact = {
  id: string
  type: ArtifactType
  name: string
  size: string
  summary: string
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  artifact?: Artifact
}

const recentTasks: Task[] = [
  { id: 1, title: '客户支援问题跟进与分析', time: '3小时前' },
  { id: 2, title: '我们正在开发大型软件项目', time: '4天前' },
  { id: 3, title: '为 Q3 季报准备一份摘要', time: '5天前' },
  { id: 4, title: '航材库存周度报告整理', time: '7天前' },
]

const artifactScripts: Record<ArtifactType, Artifact> = {
  HTML: {
    id: 'artifact-html',
    type: 'HTML',
    name: 'index.html',
    size: '18 KB',
    summary: '一个可直接预览的 HTML 页面，包含欢迎卡片、渐变背景和日期信息。',
  },
  PPT: {
    id: 'artifact-ppt',
    type: 'PPT',
    name: '智能体应用介绍.pptx',
    size: '2.4 MB',
    summary: '一份 5 页的智能体产品介绍 PPT，覆盖定位、能力、流程和后续规划。',
  },
  WORD: {
    id: 'artifact-word',
    type: 'WORD',
    name: '咏鹅.docx',
    size: '36 KB',
    summary: '一份 Word 文档示例，楷体居中排版，内容为骆宾王的《咏鹅》。',
  },
  Markdown: {
    id: 'artifact-markdown',
    type: 'Markdown',
    name: 'sample.md',
    size: '788 B',
    summary: '一个 Markdown 示例文件，涵盖标题、列表、引用、代码块和表格。',
  },
}

const MIN_ARTIFACT_DRAWER_WIDTH = 420
const MAX_ARTIFACT_DRAWER_WIDTH = 900
const MIN_CHAT_PANE_WIDTH = 460

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function createArtifactFromPrompt(value: string): Artifact | null {
  const normalized = value.toLowerCase()
  if (value.includes('生成HTML') || normalized.includes('html')) return { ...artifactScripts.HTML, id: `artifact-html-${Date.now()}` }
  if (value.includes('生成PPT') || normalized.includes('ppt') || normalized.includes('powerpoint')) return { ...artifactScripts.PPT, id: `artifact-ppt-${Date.now()}` }
  if (value.includes('生成WORD') || value.includes('生成Word') || normalized.includes('word') || normalized.includes('docx')) return { ...artifactScripts.WORD, id: `artifact-word-${Date.now()}` }
  if (value.includes('生成Markdown') || value.includes('生成markdown') || normalized.includes('markdown') || normalized.includes('.md')) return { ...artifactScripts.Markdown, id: `artifact-md-${Date.now()}` }
  return null
}

function artifactIcon(type: ArtifactType) {
  switch (type) {
    case 'HTML':
      return <FileCode2 size={23} />
    case 'PPT':
      return <Presentation size={23} />
    case 'WORD':
      return <FileText size={23} />
    case 'Markdown':
      return <FileType size={23} />
    default:
      return <File size={23} />
  }
}

function artifactTypeLabel(type: ArtifactType) {
  if (type === 'WORD') return 'Word'
  return type
}

const generatedHtmlSource = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>Hello Comac Claw</title>
  </head>
  <body>
    <main class="hero-card">
      <span>⚡</span>
      <h1>Hello World</h1>
      <p>这是一个由 Comac Claw 生成的 HTML 页面。</p>
      <time>2026.07.22</time>
    </main>
  </body>
</html>`

const generatedHtmlDocument = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Inter,"PingFang SC",sans-serif;background:radial-gradient(circle at 20% 20%,#dff1ff 0,transparent 34%),linear-gradient(135deg,#eef8ff,#f8f2ff)}
.card{width:min(520px,calc(100% - 48px));padding:58px 44px;border:1px solid rgba(255,255,255,.9);border-radius:30px;background:rgba(255,255,255,.78);box-shadow:0 30px 80px rgba(57,87,125,.18);text-align:center;backdrop-filter:blur(18px)}
.icon{width:58px;height:58px;margin:0 auto 20px;border-radius:18px;display:grid;place-items:center;color:white;background:linear-gradient(135deg,#2e87e7,#765dde);font-size:28px;box-shadow:0 15px 30px rgba(76,103,210,.28)}
h1{margin:0;color:#182334;font-size:46px;letter-spacing:-1.5px}p{margin:14px 0 28px;color:#647187;font-size:15px;line-height:1.7}time{color:#98a4b4;font-size:12px;letter-spacing:2px}
</style></head><body><main class="card"><div class="icon">⚡</div><h1>Hello World</h1><p>这是一个简单的 HTML 页面，由 Comac Claw 为你生成。</p><time>2026.07.22</time></main></body></html>`

function HtmlBrowserPreview({ artifact, onOpenSource }: { artifact: Artifact; onOpenSource: () => void }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    if (!expanded) return undefined
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [expanded])
  return (
    <div className={`workspace-browser-view ${expanded ? 'workspace-browser-view--expanded' : ''}`}>
      <div className="workspace-browser-toolbar">
        <button type="button" aria-label="后退" title="后退" disabled><ArrowLeft size={17} /></button>
        <button type="button" aria-label="前进" title="前进" disabled><ArrowRight size={17} /></button>
        <div className="workspace-browser-address"><FileCode2 size={16} /><span>comac://workspace/outputs/{artifact.name}</span></div>
        <button type="button" aria-label="刷新" title="刷新" onClick={() => setRefreshKey((value) => value + 1)}><RefreshCw size={17} /></button>
        <button className="workspace-browser-source" type="button" title="查看源文件" onClick={onOpenSource}><FileCode2 size={17} /><span>源文件</span></button>
        <button type="button" aria-label={expanded ? '退出全屏预览' : '全屏预览'} title={expanded ? '退出全屏预览' : '全屏预览'} onClick={() => setExpanded((value) => !value)}>{expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
      </div>
      <iframe key={refreshKey} sandbox="" title={`${artifact.name} 运行预览`} srcDoc={generatedHtmlDocument} />
    </div>
  )
}

function ArtifactPreview({ artifact }: { artifact: Artifact }) {
  if (artifact.type === 'HTML') {
    return <pre className="unified-workspace-source workspace-html-source">{generatedHtmlSource}</pre>
  }

  if (artifact.type === 'PPT') {
    return (
      <div className="artifact-preview-shell">
        <div className="artifact-preview-content">
          <div className="preview-ppt">
            <aside className="slide-nav" aria-label="幻灯片缩略图">
              {[1, 2, 3, 4, 5].map((page) => (
                <button key={page} className={page === 1 ? 'active' : ''} type="button">
                  <span>{page}</span>
                </button>
              ))}
            </aside>
            <div className="ppt-scroll">
              <div className="slide-canvas">
                <p>智能体应用介绍</p>
                <h1>Comac Claw</h1>
                <span>面向业务流的智能体工作台</span>
                <div className="slide-metrics">
                  <div><strong>任务</strong><em>统一入口</em></div>
                  <div><strong>自动化</strong><em>定时执行</em></div>
                  <div><strong>输出物</strong><em>即时预览</em></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (artifact.type === 'WORD') {
    return (
      <div className="artifact-preview-shell">
        <div className="artifact-preview-content">
          <div className="preview-word">
            <div className="word-page-viewport">
              <article className="word-page word-page--cover">
                <span className="word-crop word-crop--tl" />
                <span className="word-crop word-crop--tr" />
                <span className="word-crop word-crop--bl" />
                <span className="word-crop word-crop--br" />
                <h1>输出物预览示例</h1>
                <p className="word-author">由 Comac Claw 生成</p>
                <section>
                  <h2>一、文档内容</h2>
                  <p>这是一份用于演示 Word 预览形态的文档。页面保持固定尺寸，用户通过上下滚动浏览连续分页。</p>
                  <h2>二、文本内容</h2>
                  <ul>
                    <li>支持标题、正文、列表等常用格式</li>
                    <li>可自定义字体、字号、颜色</li>
                    <li>支持表格与图片插入</li>
                  </ul>
                  <h2>三、表格示例</h2>
                  <table>
                    <thead>
                      <tr><th>项目</th><th>状态</th><th>完成度</th></tr>
                    </thead>
                    <tbody>
                      <tr><td>需求分析</td><td>已完成</td><td>100%</td></tr>
                      <tr><td>原型设计</td><td>进行中</td><td>60%</td></tr>
                      <tr><td>开发测试</td><td>待开始</td><td>0%</td></tr>
                    </tbody>
                  </table>
                </section>
                <footer>—— 由 Kai 生成 ——</footer>
              </article>

              <div className="word-page-divider"><span>第 2 页</span></div>

              <article className="word-page">
                <span className="word-crop word-crop--tl" />
                <span className="word-crop word-crop--tr" />
                <span className="word-crop word-crop--bl" />
                <span className="word-crop word-crop--br" />
                <h1>附录页</h1>
                <p className="word-author">补充说明 · 第二页</p>
                <section>
                  <h2>四、补充说明</h2>
                  <p>本页为文档的附加页，用于补充额外信息。预览区保留页间分割线和纸张阴影，模拟真实文档连续预览体验。</p>
                  <h2>五、备注列表</h2>
                  <ul>
                    <li>本文档由 Kai 生成</li>
                    <li>字体：宋体 / 楷体</li>
                    <li>支持自定义扩展</li>
                    <li>可随时修改内容</li>
                  </ul>
                </section>
                <footer>—— 第 2 页 / 共 2 页 ——</footer>
              </article>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="artifact-preview-shell">
      <div className="artifact-preview-content">
        <div className="preview-markdown">
          <article className="markdown-page">
            <h1>Markdown 示例文档</h1>
            <p>这是一份用于演示输出物预览的 Markdown 文件，覆盖常见内容块。</p>
            <h2>能力清单</h2>
            <ul>
              <li>标题、正文和列表预览</li>
              <li>代码块与引用样式</li>
              <li>简单表格结构展示</li>
            </ul>
            <blockquote>输出物预览的目标，是让用户不离开对话就能快速确认结果质量。</blockquote>
            <pre><code>{`function previewArtifact(type) {
  return renderDrawer(type)
}`}</code></pre>
            <table>
              <thead>
                <tr><th>类型</th><th>本期能力</th></tr>
              </thead>
              <tbody>
                <tr><td>HTML</td><td>页面渲染</td></tr>
                <tr><td>PPT</td><td>幻灯片预览</td></tr>
                <tr><td>Word</td><td>文档预览</td></tr>
              </tbody>
            </table>
            <h2>后续说明</h2>
            <p>Markdown 预览以阅读为主，内容区保留纵向滚动；调整 Workspace 宽度时，正文阅读宽度保持稳定，避免不断重排影响阅读。</p>
            <p>正式产品中可以继续补充目录、锚点、代码高亮和链接安全策略。</p>
          </article>
        </div>
      </div>
    </div>
  )
}

function TaskRow({ task, onOpen, onDelete }: { task: Task; onOpen: (task: Task) => void; onDelete?: (task: Task) => void }) {
  return (
    <div className="task-row-wrap">
      <button className="task-row" type="button" onClick={() => onOpen(task)}>
        <FileText size={18} strokeWidth={1.8} />
        <span className="task-title">{task.title}</span>
        <span className="task-time">{task.time}</span>
      </button>
      {onDelete && (
        <button className="sidebar-delete-button" type="button" title="删除会话" onClick={() => onDelete(task)}>
          <Trash2 size={15} />
        </button>
      )}
    </div>
  )
}

function App() {
  const [appMode, setAppMode] = useState<AppMode>(()=>new URLSearchParams(location.search).get('view')==='admin'?'admin':['twin','assistant'].includes(new URLSearchParams(location.search).get('view')||'')?'assistant':'task')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [taskSidebarOpenBeforeAssistant, setTaskSidebarOpenBeforeAssistant] = useState(true)
  const [sidebarMode, setSidebarMode] = useState<'default' | 'notifications'>('default')
  const [activeNav, setActiveNav] = useState('新建任务')
  const [moreNavOpen, setMoreNavOpen] = useState(false)
  const [openAutomationFolders, setOpenAutomationFolders] = useState<Record<string, boolean>>({})
  const [prompt, setPrompt] = useState('')
  const [openedTask, setOpenedTask] = useState<Task | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [selectedWorkspaceNodeId, setSelectedWorkspaceNodeId] = useState('task-context')
  const [artifactDrawerWidth, setArtifactDrawerWidth] = useState(560)
  const [isResizingArtifactDrawer, setIsResizingArtifactDrawer] = useState(false)
  const [downloadToast, setDownloadToast] = useState('')
  const [assistantBusy, setAssistantBusy] = useState(false)
  const [assistantWorkspaceVisible, setAssistantWorkspaceVisible] = useState(false)
  const [assistantDestination, setAssistantDestination] = useState<AssistantDestination>(() => {
    const view = new URLSearchParams(location.search).get('view')
    if (view === 'twin') return { type: 'feature', featureId: 'training' }
    if (view === 'a2a') return { type: 'feature', featureId: 'a2a' }
    return { type: 'assistant' }
  })
  const [a2aConversations, setA2AConversations] = useState<A2AConversation[]>(() => [...seedA2AConversations, ...projectConversations])
  // Refresh observer scripts after edits without retaining the previous initiator identity.
  useEffect(() => {
    setA2AConversations(current => current.map(conversation =>
      projectConversations.find(seed => seed.id === conversation.id && seed.demo?.readOnly) ?? conversation,
    ))
  }, [projectConversations])
  const [a2aCommands, setA2ACommands] = useState<A2AConversationCommand[]>([])
  const [notifications, setNotifications] = useState<AssistantNotification[]>(createSeedNotifications)
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null)
  const [notificationToDeliver, setNotificationToDeliver] = useState<AssistantNotification | null>(null)
  const [automationTasks, setAutomationTasks] = useState<AutomationTask[]>(() => loadStoredList(TASKS_STORAGE_KEY, seedTasks))
  const [automationRuns, setAutomationRuns] = useState<AutomationRun[]>(() => loadStoredList(RUNS_STORAGE_KEY, seedRuns))
  const taskWorkbench = useWorkspaceWorkbench()

  const hasQueuedNotifications = notifications.length > 0
  const hasPendingA2AConfirmation = a2aConversations.some((conversation) => Boolean(conversation.pendingCurrentUserConfirmation))
  const selectedNotification = notifications.find((notification) => notification.id === selectedNotificationId) ?? null

  const receiveNotification = (notification: AssistantNotification) => {
    // 此回调只接收助理运行中产生的模拟异步消息。始终先入队，避免定时器
    // 捕获任务开始前的 idle 状态后绕过通知列表，甚至覆盖待投递消息。
    setNotifications((current) => [...current.filter((item) => item.id !== notification.id), notification])
  }

  const markNotificationRead = (notificationId: string) => {
    setNotifications((current) => current.map((notification) => (
      notification.id === notificationId && notification.status === 'unread'
        ? { ...notification, status: 'read' }
        : notification
    )))
  }

  const selectNotification = (notification: AssistantNotification) => {
    setSelectedNotificationId(notification.id)
    markNotificationRead(notification.id)
  }

  const acceptQueuedNotification = (notificationId: string) => {
    setNotifications((current) => current.filter((notification) => notification.id !== notificationId))
    setSelectedNotificationId((current) => current === notificationId ? null : current)
  }

  const finishNotificationDelivery = (notificationId: string) => {
    setNotificationToDeliver((current) => current?.id === notificationId ? null : current)
  }

  useEffect(() => {
    if (assistantBusy || notificationToDeliver || notifications.length === 0) return
    const nextNotification = [...notifications].sort((left, right) => (
      new Date(left.receivedAt).getTime() - new Date(right.receivedAt).getTime()
    ))[0]
    setNotificationToDeliver(nextNotification)
  }, [assistantBusy, notificationToDeliver, notifications])

  useEffect(() => {
    const activeTab = taskWorkbench.tabs.find((tab) => tab.id === taskWorkbench.activeTabId)
    if (activeTab) setSelectedWorkspaceNodeId(activeTab.nodeId)
  }, [taskWorkbench.activeTabId, taskWorkbench.tabs])

  useEffect(() => window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(automationTasks)), [automationTasks])
  useEffect(() => window.localStorage.setItem(RUNS_STORAGE_KEY, JSON.stringify(automationRuns)), [automationRuns])
  useEffect(() => {
    if (!downloadToast) return undefined
    const timer = window.setTimeout(() => setDownloadToast(''), 1800)
    return () => window.clearTimeout(timer)
  }, [downloadToast])
  useEffect(() => {
    document.body.classList.toggle('artifact-drawer-resizing', isResizingArtifactDrawer)
    return () => document.body.classList.remove('artifact-drawer-resizing')
  }, [isResizingArtifactDrawer])

  const navItems = useMemo(
    () => [
      { label: '新建任务', icon: Plus },
      { label: '系统智能', icon: LayoutGrid },
      { label: '专家', icon: BriefcaseBusiness },
      { label: '自动化', icon: Clock3 },
    ],
    [],
  )

  const automationFolders = useMemo(() => {
    const runMap = new Map<string, AutomationRun[]>()
    automationRuns.forEach((run) => {
      const items = runMap.get(run.taskId) ?? []
      items.push(run)
      runMap.set(run.taskId, items)
    })

    return automationTasks
      .map((task) => {
        const runs = (runMap.get(task.id) ?? [])
          .slice()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map<Task>((run) => ({
            id: run.id,
            title: run.taskName,
            time: formatHistoryTime(run.createdAt),
            automationRunId: run.id,
          }))
        return { task, runs }
      })
      .filter((folder) => folder.runs.length > 0)
  }, [automationRuns, automationTasks])

  const deleteAutomationRunFromSidebar = (task: Task) => {
    if (!task.automationRunId) return
    if (!window.confirm('删除这条运行记录？删除后不会删除自动化任务配置。')) return
    setAutomationRuns((items) => items.filter((run) => run.id !== task.automationRunId))
    setOpenedTask((current) => current?.automationRunId === task.automationRunId ? null : current)
  }

  const openTask = (task: Task) => {
    setOpenedTask(task)
    setSelectedWorkspaceNodeId('task-context')
    taskWorkbench.resetWorkbench()
  }

  const submitPrompt = () => {
    const value = prompt.trim()
    if (!value) return
    const artifact = createArtifactFromPrompt(value)
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: value }
    const assistantMessage: ChatMessage = artifact
      ? {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `搞定，${artifactTypeLabel(artifact.type)} 输出物已生成。${artifact.summary}你可以点击卡片预览，也可以在 Workspace 中模拟下载。`,
          artifact,
        }
      : {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: '我先收到了。当前 Demo 已接入四个固定剧本：输入“生成HTML”“生成PPT”“生成WORD”或“生成Markdown”即可生成对应输出物卡片。',
        }
    setMessages((items) => [...items, userMessage, assistantMessage])
    setOpenedTask((current) => current ?? { id: Date.now(), title: value, time: '刚刚' })
    setPrompt('')
  }

  const openArtifact = (artifact: Artifact) => {
    const nodeId = `task-artifact-${artifact.id}`
    setSelectedWorkspaceNodeId(nodeId)
    taskWorkbench.setOutputsOpen(false)
    taskWorkbench.openTab({
      id: `${artifact.type === 'HTML' ? 'browser' : 'file'}:${nodeId}`,
      title: artifact.name,
      mode: artifact.type === 'HTML' ? 'browser' : 'file',
      nodeId,
      kind: artifact.type === 'HTML' ? 'html' : artifact.type === 'PPT' ? 'ppt' : artifact.type === 'WORD' ? 'word' : 'markdown',
      objectId: artifact.id,
    })
  }

  const allArtifacts = useMemo(() => {
    const artifactMap = new Map<string, Artifact>()
    messages.forEach((message) => {
      if (message.artifact) artifactMap.set(message.artifact.id, message.artifact)
    })
    return Array.from(artifactMap.values()).reverse()
  }, [messages])

  const taskWorkspaceNodes = useMemo<WorkspaceTreeNode[]>(() => {
    const sessionTitle = openedTask?.title ?? '新建任务'
    const sessionId = openedTask?.id ?? 'new-task'
    const sessionPath = `/Workspace/Tasks/2026-07-22/${sessionId}-${sessionTitle}`
    return [{
      id: 'task-root',
      name: sessionTitle,
      path: sessionPath,
      kind: 'folder',
      children: [
        {
          id: 'task-context',
          name: 'context.md',
          path: `${sessionPath}/context.md`,
          kind: 'markdown',
          size: '1.4 KB',
          updatedAt: '刚刚',
          content: `# ${sessionTitle}\n\n## Session 信息\n\n- 模式：普通任务\n- 创建日期：2026-07-22\n- 最近活跃：刚刚\n\n## 当前上下文\n\n${messages.length > 0 ? '当前任务已产生对话和输出物。完整消息由会话服务保存，本文件只展示压缩后的任务上下文。' : '这是一个新建普通任务 Session。开始对话后，目标、约束和关键决策会沉淀到这里。'}`,
        },
        {
          id: 'task-attachments',
          name: 'attachments',
          path: `${sessionPath}/attachments`,
          kind: 'folder',
          children: [],
        },
        {
          id: 'task-outputs',
          name: 'outputs',
          path: `${sessionPath}/outputs`,
          kind: 'folder',
          children: allArtifacts.map((artifact) => ({
            id: `task-artifact-${artifact.id}`,
            name: artifact.name,
            path: `${sessionPath}/outputs/${artifact.name}`,
            kind: artifact.type === 'HTML' ? 'html' : artifact.type === 'PPT' ? 'ppt' : artifact.type === 'WORD' ? 'word' : 'markdown',
            size: artifact.size,
            updatedAt: '刚刚',
            objectId: artifact.id,
          })),
        },
      ],
    }]
  }, [allArtifacts, messages.length, openedTask])

  const taskWorkspaceOutputs = useMemo<WorkspaceOutputItem[]>(() => allArtifacts.map((artifact) => ({
    id: artifact.id,
    name: artifact.name,
    kind: artifact.type === 'HTML' ? 'html' : artifact.type === 'PPT' ? 'ppt' : artifact.type === 'WORD' ? 'word' : 'markdown',
    meta: `${artifactTypeLabel(artifact.type)} · ${artifact.size}`,
    nodeId: `task-artifact-${artifact.id}`,
    objectId: artifact.id,
  })), [allArtifacts])

  const openWorkspaceNode = (node: WorkspaceTreeNode) => {
    if (node.kind === 'folder') return
    setSelectedWorkspaceNodeId(node.id)
    taskWorkbench.openTab({
      id: `file:${node.id}`,
      title: node.name,
      mode: 'file',
      nodeId: node.id,
      kind: node.kind,
      objectId: node.objectId,
    })
  }

  const toggleTaskNavigator = () => {
    taskWorkbench.setNavigatorOpen(!taskWorkbench.navigatorOpen)
  }

  const openTaskOutput = (output: WorkspaceOutputItem) => {
    const artifact = allArtifacts.find((candidate) => candidate.id === output.objectId)
    if (artifact) openArtifact(artifact)
  }

  const openLatestHtml = () => {
    const htmlArtifact = allArtifacts.find((artifact) => artifact.type === 'HTML')
    if (htmlArtifact) openArtifact(htmlArtifact)
  }

  const simulateDownload = (artifact?: Artifact) => {
    setDownloadToast(artifact ? `已模拟下载 ${artifact.name}` : '当前没有可下载的输出物')
  }

  const createReminderAutomation = (item: CollaborationItem) => {
    const automationId = `task-collaboration-reminder-${item.id}`
    if (automationTasks.some((task) => task.id === automationId)) return false
    const schedule = { mode: 'periodic' as const, frequency: 'daily' as const, time: '09:00', weekdays: [1], dayOfMonth: 1 }
    const task: AutomationTask = {
      id: automationId,
      name: `${item.title} 自动催办`,
      prompt: `每天检查“${item.title}”（项目：${item.project}，执行人：${item.assignee}）的状态。若任务未完成，则向执行人的数字分身发送进展催办；任务完成后停止发送。`,
      status: 'active',
      schedule,
      model: '商飞大模型 L1-S1',
      skill: '项目任务催办',
      nextRunAt: calculateNextRun(schedule),
      updatedAt: new Date().toISOString(),
    }
    setAutomationTasks((current) => [task, ...current])
    return true
  }

  const resizeArtifactDrawer = (clientX: number) => {
    const sidebarWidth = sidebarOpen ? (window.innerWidth <= 1100 ? 320 : 390) : 0
    const workspaceWidth = window.innerWidth - sidebarWidth
    const maxWidth = Math.min(MAX_ARTIFACT_DRAWER_WIDTH, Math.max(MIN_ARTIFACT_DRAWER_WIDTH, workspaceWidth - MIN_CHAT_PANE_WIDTH))
    setArtifactDrawerWidth(clamp(window.innerWidth - clientX, MIN_ARTIFACT_DRAWER_WIDTH, maxWidth))
  }

  const startArtifactDrawerResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsResizingArtifactDrawer(true)
    resizeArtifactDrawer(event.clientX)
  }

  const moveArtifactDrawerResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!isResizingArtifactDrawer) return
    resizeArtifactDrawer(event.clientX)
  }

  const stopArtifactDrawerResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setIsResizingArtifactDrawer(false)
  }

  const chatWorkbenchStyle = {
    '--artifact-drawer-width': `${artifactDrawerWidth}px`,
  } as CSSProperties

  const runA2ACommand = useCallback((value: string): A2ACommandResult => {
    const result = buildA2ACommand(value, a2aConversations)
    if (result.created) setA2AConversations((current) => [result.conversation, ...current])
    setA2ACommands((current) => [...current, result.command])
    return result
  }, [a2aConversations])

  const updateA2AConversationActivity = useCallback((conversationId: string, patch: ConversationActivityPatch) => {
    setA2AConversations((current) => current.map((conversation) => conversation.id === conversationId
      ? { ...conversation, ...patch }
      : conversation))
  }, [])

  const markA2ACommandHandled = useCallback((commandId: string) => {
    setA2ACommands((current) => current.filter((command) => command.id !== commandId))
  }, [])

  const submitA2AConversationCommand = useCallback((
    conversationId: string,
    action: A2AConversationCommand['action'],
    content: string,
  ) => {
    setA2ACommands((current) => [...current, {
      id: `a2a-private-command-${Date.now()}`,
      conversationId,
      action,
      content,
      createdAt: '刚刚',
    }])
  }, [])

  const enterAssistantMode = () => {
    setTaskSidebarOpenBeforeAssistant(sidebarOpen)
    setAppMode('assistant')
    setAssistantDestination({ type: 'assistant' })
    setSidebarOpen(true)
  }

  const returnToTaskMode = () => {
    setAppMode('task')
    setSidebarOpen(taskSidebarOpenBeforeAssistant)
  }

  const enterAdminMode = () => {
    setAppMode('admin')
  }

  const returnToAssistantFromAdmin = () => {
    setAppMode('assistant')
  }

  useEffect(() => {
    const url = new URL(location.href)
    const view = appMode === 'admin'
      ? 'admin'
      : appMode === 'assistant'
        ? assistantDestination.type === 'feature' && assistantDestination.featureId === 'training'
          ? 'twin'
          : assistantDestination.type === 'feature' && assistantDestination.featureId === 'a2a'
            ? 'a2a'
            : 'assistant'
        : 'task'
    url.searchParams.set('view', view)
    history.replaceState(null, '', url)
  }, [appMode, assistantDestination])

  const conversationProject = assistantDestination.type === 'conversation'
    ? projects.find(project => project.tasks.some(task => conversationIdFor(task) === assistantDestination.conversationId))
    : undefined
  const surfaceMode = appMode

  return (
    <div className="app-shell">
      <div className="app-body">
        {surfaceMode === 'assistant' ? (
          <AssistantModeSidebar
            open={sidebarOpen}
            destination={assistantDestination}
            onClose={() => setSidebarOpen(false)}
            onSelectAssistant={() => setAssistantDestination({ type: 'assistant' })}
            onSelectFeature={(featureId) => setAssistantDestination({ type: 'feature', featureId })}
            onEnterAdmin={enterAdminMode}
          />
        ) : surfaceMode === 'task' ? (
          <aside className={`sidebar ${sidebarOpen ? '' : 'sidebar--closed'}`}>
          <div className="sidebar-top">
            <label className="search-box">
              <Search size={19} strokeWidth={2} />
              <input
                aria-label={sidebarMode === 'notifications' ? '搜索消息' : '搜索任务'}
                placeholder={sidebarMode === 'notifications' ? '搜索消息' : '搜索任务'}
              />
            </label>
            <button
              className={`icon-button notification-toggle ${sidebarMode === 'notifications' ? 'active' : ''}`}
              type="button"
              title={sidebarMode === 'notifications' ? '关闭消息通知' : '打开消息通知'}
              aria-label={sidebarMode === 'notifications' ? '关闭消息通知' : '打开消息通知'}
              onClick={() => setSidebarMode((mode) => mode === 'notifications' ? 'default' : 'notifications')}
            >
              <Bell size={20} strokeWidth={1.8} />
              {hasQueuedNotifications && <span className="notification-toggle-badge" aria-label="有等待推送的消息" />}
            </button>
            <button
              className="icon-button panel-toggle"
              type="button"
              title="收起侧边栏"
              onClick={() => setSidebarOpen(false)}
            >
              <LayoutPanelLeft size={21} strokeWidth={1.8} />
            </button>
          </div>

          {sidebarMode === 'notifications' ? (
            <NotificationCenter
              notifications={notifications}
              assistantBusy={assistantBusy}
              selectedNotificationId={selectedNotificationId}
              onSelect={selectNotification}
            />
          ) : (
            <>
              <nav className="primary-nav" aria-label="主导航">
                {navItems.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    className={activeNav === label ? 'nav-item active' : 'nav-item'}
                    type="button"
                    onClick={() => {
                      setActiveNav(label)
                      if (label === '新建任务') {
                        setOpenedTask(null)
                        setMessages([])
                        setPrompt('')
                        setSelectedWorkspaceNodeId('task-context')
                        taskWorkbench.resetWorkbench()
                      }
                    }}
                  >
                    <Icon size={20} strokeWidth={1.9} />
                    <span>{label}</span>
                  </button>
                ))}
                <button className={`nav-item nav-item--more ${activeNav === '外部 Agent' ? 'active' : ''}`} type="button" aria-expanded={moreNavOpen} onClick={() => setMoreNavOpen((value) => !value)}>
                  <Ellipsis size={20} strokeWidth={1.9} /><span>更多</span><ChevronDown className={moreNavOpen ? 'nav-item-chevron is-open' : 'nav-item-chevron'} size={16} />
                </button>
                {moreNavOpen && (
                  <div className="secondary-nav">
                    <button className={activeNav === '外部 Agent' ? 'secondary-nav-item active' : 'secondary-nav-item'} type="button" onClick={() => setActiveNav('外部 Agent')}>
                      <Globe2 size={18} /><span>外部 Agent</span>
                    </button>
                  </div>
                )}
              </nav>

              <div className="sidebar-scroll">
                <section className="sidebar-section">
                  <div className="section-heading">
                    <span>任务</span>
                    <span className="count-badge">4</span>
                  </div>
                  <div className="task-list">
                    {recentTasks.map((task) => (
                      <TaskRow key={task.id} task={task} onOpen={openTask} />
                    ))}
                  </div>
                </section>

                {automationFolders.length > 0 && (
                  <section className="sidebar-section automation-section">
                    <div className="section-heading">
                      <span>自动化任务</span>
                      <span className="count-badge">{automationFolders.length}</span>
                    </div>

                    {automationFolders.map(({ task, runs }) => {
                      const isOpen = openAutomationFolders[task.id] ?? true
                      return (
                        <div className="automation-folder" key={task.id}>
                          <button className="folder-row" type="button" onClick={() => setOpenAutomationFolders((value) => ({ ...value, [task.id]: !isOpen }))}>
                            <Folder size={20} strokeWidth={1.8} />
                            <span>{task.name}</span>
                            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                          {isOpen && (
                            <div className="nested-tasks">
                              {runs.map((runTask) => (
                                <TaskRow key={runTask.id} task={runTask} onOpen={openTask} onDelete={deleteAutomationRunFromSidebar} />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </section>
                )}
              </div>
            </>
          )}
          </aside>
        ) : null}

        {surfaceMode !== 'admin' && !sidebarOpen && (
          <button
            className="sidebar-reopen"
            type="button"
            title="展开侧边栏"
            onClick={() => setSidebarOpen(true)}
          >
            <LayoutPanelLeft size={21} />
          </button>
        )}

        {((surfaceMode === 'task' && activeNav === '新建任务') || (surfaceMode === 'assistant' && assistantDestination.type === 'assistant')) && <button
          className={`global-assistant-switch ${surfaceMode === 'assistant' ? 'is-assistant' : ''} ${assistantBusy ? 'is-busy' : ''} ${hasPendingA2AConfirmation ? 'has-pending-confirmation' : ''} ${(surfaceMode === 'assistant' ? assistantDestination.type === 'assistant' && assistantWorkspaceVisible : taskWorkbench.workspaceVisible) ? 'has-workspace' : ''}`}
          type="button"
          onClick={surfaceMode === 'assistant' ? returnToTaskMode : enterAssistantMode}
          title={surfaceMode === 'assistant' ? '返回原任务模式' : '进入助理模式'}
        >
          <span><Bot size={16} /></span>
          <span>{surfaceMode === 'assistant' ? '返回任务' : '助理'}</span>
          {hasPendingA2AConfirmation && <i className="global-assistant-confirmation-dot" title="有事项等待本人确认" />}
        </button>}

        <main className={`workspace ${activeNav === '自动化' ? 'workspace--automation' : ''} ${surfaceMode === 'assistant' ? 'workspace--assistant' : ''} ${surfaceMode === 'admin' ? 'workspace--admin' : ''} ${activeNav === '外部 Agent' ? 'workspace--external-agent' : ''} ${activeNav === '系统智能' ? 'workspace--organization' : ''}`}>
          <div className={`app-mode-panel ${surfaceMode === 'task' ? '' : 'is-hidden'}`}>
            {activeNav === '外部 Agent' ? (
            <ExternalAgentWorkspace />
          ) : activeNav === '系统智能' ? (
            <OrganizationWorkbench conversations={a2aConversations} onOpenConversation={(conversationId) => {
              setTaskSidebarOpenBeforeAssistant(sidebarOpen);
              setAssistantDestination({ type: 'conversation', conversationId });
              setAppMode('assistant');
              setSidebarOpen(true);
            }} />
          ) : activeNav === '自动化' ? (
            <AutomationWorkspace tasks={automationTasks} runs={automationRuns} setTasks={setAutomationTasks} setRuns={setAutomationRuns} />
          ) : (
            <div className={`chat-workbench ${taskWorkbench.workspaceVisible ? 'chat-workbench--with-drawer' : ''} ${isResizingArtifactDrawer ? 'chat-workbench--resizing' : ''}`} style={chatWorkbenchStyle}>
              <section className="chat-pane">
                <header className="chat-header">
                  <div>
                    <p className="chat-kicker">Comac Claw</p>
                    <h2>{openedTask ? openedTask.title : '新建任务'}</h2>
                  </div>
                  <div className="chat-header-actions">
                    {!taskWorkbench.workspaceVisible && (
                      <WorkspaceHeaderControls
                        outputs={taskWorkspaceOutputs}
                        outputsOpen={taskWorkbench.outputsOpen}
                        workspaceVisible={taskWorkbench.workspaceVisible}
                        onToggleOutputs={() => taskWorkbench.setOutputsOpen(!taskWorkbench.outputsOpen)}
                        onCloseOutputs={() => taskWorkbench.setOutputsOpen(false)}
                        onToggleWorkspace={taskWorkbench.toggleWorkspace}
                        onOpenOutput={openTaskOutput}
                      />
                    )}
                  </div>
                </header>

                {messages.length === 0 ? (
                  <section className="welcome" aria-live="polite">
                    <div className="bot-mark"><Bot size={55} strokeWidth={1.8} /></div>
                    <h1><span>Comac Claw</span>，我帮你</h1>
                    <p>从一个想法开始，让分析、文档与日常工作更进一步。</p>
                    <div className="welcome-prompts" aria-label="任务灵感">
                      <button className="welcome-prompt" type="button" onClick={() => setPrompt('帮我生成一份 WORD 工作总结，梳理本周进展与下周计划。')}><FileText size={15} />起草工作总结</button>
                      <button className="welcome-prompt" type="button" onClick={() => setPrompt('帮我生成一份 PPT，介绍项目进展、关键成果与后续计划。')}><Presentation size={15} />整理汇报演示</button>
                      <button className="welcome-prompt" type="button" onClick={() => setPrompt('帮我用 Markdown 梳理当前任务的关键问题、原因与行动建议。')}><Layers3 size={15} />梳理问题思路</button>
                    </div>
                  </section>
                ) : (
                  <section className="chat-thread" aria-label="对话内容">
                    {messages.map((message) => (
                      <article key={message.id} className={`chat-message chat-message--${message.role}`}>
                        {message.role === 'assistant' && (
                          <div className="assistant-avatar"><Bot size={20} /></div>
                        )}
                        <div className="message-bubble">
                          {message.role === 'assistant' && (
                            <div className="assistant-name">Comac Claw</div>
                          )}
                          <p>{message.content}</p>
                          {message.artifact && (
                            <button className={`artifact-card artifact-card--${message.artifact.type.toLowerCase()}`} type="button" onClick={() => openArtifact(message.artifact!)}>
                              <span className="artifact-card-icon">{artifactIcon(message.artifact.type)}</span>
                              <span className="artifact-card-main">
                                <strong>{message.artifact.name}</strong>
                                <span>{artifactTypeLabel(message.artifact.type)} · {message.artifact.size}</span>
                              </span>
                              <ExternalLink size={21} strokeWidth={1.9} />
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </section>
                )}

                <section className="composer" aria-label="任务输入器">
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        submitPrompt()
                      }
                    }}
                    placeholder="请输入具体问题，可通过 Shift + Enter 换行"
                    aria-label="请输入具体问题"
                  />
                  <div className="composer-toolbar">
                    <div className="composer-tools">
                      <button className="tool-pill model-pill" type="button">
                        <Layers3 size={18} />
                        <span>商飞大模型 L1-S1</span>
                        <ChevronDown size={16} />
                      </button>
                      <button className="tool-pill" type="button"><WandSparkles size={17} /><span>技能</span></button>
                      <button className="tool-pill" type="button"><span className="grid-icon" /> <span>MCP</span></button>
                    </div>
                    <div className="composer-actions">
                      <button className="composer-icon" type="button" title="添加附件"><Paperclip size={21} /></button>
                      <button className="composer-icon sparkle" type="button" title="智能增强"><Sparkles size={22} /></button>
                      <button className="composer-icon" type="button" title="语音输入"><Mic size={21} /></button>
                      <button
                        className={`send-button ${prompt.trim() ? 'send-button--ready' : ''}`}
                        type="button"
                        title="发送"
                        onClick={submitPrompt}
                      >
                        <Send size={20} />
                      </button>
                    </div>
                  </div>
                </section>
              </section>

              {taskWorkbench.workspaceVisible && (
                <WorkspaceWorkbench
                  className="task-workspace-panel"
                  style={{ width: artifactDrawerWidth, flexBasis: artifactDrawerWidth, flexShrink: 0 }}
                  tabs={taskWorkbench.tabs}
                  activeTabId={taskWorkbench.activeTabId}
                  nodes={taskWorkspaceNodes}
                  selectedNodeId={selectedWorkspaceNodeId}
                  defaultExpandedIds={['task-root', 'task-attachments', 'task-outputs']}
                  outputs={taskWorkspaceOutputs}
                  outputsOpen={taskWorkbench.outputsOpen}
                  workspaceVisible={taskWorkbench.workspaceVisible}
                  navigatorOpen={taskWorkbench.navigatorOpen}
                  launcherOpen={taskWorkbench.launcherOpen}
                  onActivateTab={taskWorkbench.setActiveTabId}
                  onCloseTab={taskWorkbench.closeTab}
                  onToggleOutputs={() => taskWorkbench.setOutputsOpen(!taskWorkbench.outputsOpen)}
                  onCloseOutputs={() => taskWorkbench.setOutputsOpen(false)}
                  onToggleWorkspace={taskWorkbench.toggleWorkspace}
                  onToggleNavigator={toggleTaskNavigator}
                  onOpenOutput={openTaskOutput}
                  onToggleLauncher={() => taskWorkbench.setLauncherOpen(!taskWorkbench.launcherOpen)}
                  onCloseLauncher={() => taskWorkbench.setLauncherOpen(false)}
                  onOpenFileLauncher={() => {
                    taskWorkbench.setLauncherOpen(false)
                    taskWorkbench.setOutputsOpen(false)
                    taskWorkbench.setNavigatorOpen(true)
                  }}
                  onOpenBrowserLauncher={openLatestHtml}
                  onSelectNode={openWorkspaceNode}
                  resizeHandlers={{
                    onPointerDown: startArtifactDrawerResize,
                    onPointerMove: moveArtifactDrawerResize,
                    onPointerUp: stopArtifactDrawerResize,
                    onPointerCancel: stopArtifactDrawerResize,
                  }}
                  renderActions={(_tab, node) => {
                    const artifact = node?.objectId ? allArtifacts.find((candidate) => candidate.id === node.objectId) : undefined
                    return artifact ? <button type="button" title="下载" onClick={() => simulateDownload(artifact)}><Download size={18} /></button> : null
                  }}
                  renderTab={(tab: WorkspaceTab, node) => {
                    const artifact = tab.objectId ? allArtifacts.find((candidate) => candidate.id === tab.objectId) : undefined
                    if (tab.mode === 'browser' && artifact) {
                      return <HtmlBrowserPreview artifact={artifact} onOpenSource={() => {
                        if (node) openWorkspaceNode(node)
                      }} />
                    }
                    return artifact
                      ? <ArtifactPreview artifact={artifact} />
                      : <pre className="unified-workspace-source">{node?.content}</pre>
                  }}
                />
              )}

              {downloadToast && <div className="download-toast">{downloadToast}</div>}
            </div>
          )}
          {sidebarMode === 'notifications' && (
            <NotificationDetailView notification={selectedNotification} />
          )}
          </div>

          <div className={`app-mode-panel ${surfaceMode === 'assistant' ? '' : 'is-hidden'}`}>
            <div className={`assistant-destination-panel ${assistantDestination.type === 'assistant' ? '' : 'is-hidden'}`}>
              <AssistantWorkspace
                onCreateReminderAutomation={createReminderAutomation}
                notificationToDeliver={notificationToDeliver}
                onNotificationAccepted={acceptQueuedNotification}
                onNotificationDelivered={finishNotificationDelivery}
                onNotificationReceived={receiveNotification}
                onBusyChange={setAssistantBusy}
                a2aConversations={a2aConversations}
                onRunA2ACommand={runA2ACommand}
                onWorkspaceVisibilityChange={setAssistantWorkspaceVisible}
              />
            </div>
            <div className={`assistant-destination-panel ${conversationProject ? 'org-conversation-panel' : ''} ${assistantDestination.type === 'conversation' ? '' : 'is-hidden'}`}>
              {conversationProject && <div className="org-conversation-back"><button type="button" onClick={() => { setActiveNav('系统智能'); returnToTaskMode(); }}><ArrowLeft size={16}/>返回{conversationProject.title}项目</button><span>系统智能 · {conversationProject.title}</span></div>}
              <A2AConversationView
                conversations={a2aConversations}
                selectedConversationId={assistantDestination.type === 'conversation' ? assistantDestination.conversationId : null}
                commands={a2aCommands}
                onCommandHandled={markA2ACommandHandled}
                onConversationActivity={updateA2AConversationActivity}
                onSubmitCommand={submitA2AConversationCommand}
              />
            </div>
            {assistantDestination.type === 'feature' && assistantDestination.featureId === 'training' && (
              <div className="assistant-destination-panel">
                <DigitalTwinTrainingWorkspace />
              </div>
            )}
            {assistantDestination.type === 'feature' && assistantDestination.featureId === 'automation' && (
              <div className="assistant-destination-panel">
                <AutomationWorkspace tasks={automationTasks} runs={automationRuns} setTasks={setAutomationTasks} setRuns={setAutomationRuns} />
              </div>
            )}
            {assistantDestination.type === 'feature' && assistantDestination.featureId === 'a2a' && (
              <div className="assistant-destination-panel">
                <A2ATaskBoard a2aConversations={a2aConversations} onOpenA2AConversation={(conversationId) => setAssistantDestination({ type: 'conversation', conversationId })} />
              </div>
            )}
            {assistantDestination.type === 'feature' && !['training', 'automation', 'a2a'].includes(assistantDestination.featureId) && (
              <div className="assistant-destination-panel">
                <AssistantFeaturePlaceholder featureId={assistantDestination.featureId} />
              </div>
            )}
          </div>
          <div className={`app-mode-panel ${surfaceMode === 'admin' ? '' : 'is-hidden'}`}>
            <AdminWorkspace onReturn={returnToAssistantFromAdmin} />
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
