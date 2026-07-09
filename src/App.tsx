import { useEffect, useMemo, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import {
  Bot,
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  File,
  FileCode2,
  FileType,
  FileText,
  Folder,
  LayoutPanelLeft,
  Layers3,
  Check,
  Menu,
  Mic,
  Paperclip,
  PanelRightOpen,
  Plus,
  Presentation,
  Search,
  Send,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react'
import './App.css'
import AutomationWorkspace from './automation/AutomationWorkspace'
import {
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

type RightPanelMode = 'workspace' | 'browser' | 'artifact' | 'changes'

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

function panelModeLabel(mode: RightPanelMode) {
  switch (mode) {
    case 'workspace':
      return '工作空间预览'
    case 'browser':
      return '浏览器'
    case 'changes':
      return '变更'
    case 'artifact':
      return '输出物'
    default:
      return '工作空间预览'
  }
}

function ArtifactPreview({ artifact, onDownload }: { artifact: Artifact; onDownload: () => void }) {
  if (artifact.type === 'HTML') {
    return (
      <div className="preview-html">
        <div className="html-browser-bar">
          <button type="button" aria-label="后退">←</button>
          <button type="button" aria-label="前进">→</button>
          <div className="html-address">
            <FileCode2 size={17} />
            <span>file:///COMAC-AI/workspace/index.html</span>
          </div>
          <button type="button" aria-label="刷新">↻</button>
          <button type="button" aria-label="下载" onClick={onDownload}><Download size={19} /></button>
        </div>
        <div className="html-stage">
          <div className="html-hero-card">
            <span className="hero-lightning">⚡</span>
            <h1>Hello World</h1>
            <p>这是一个简单的 HTML 页面，由 COMAC AI 为你生成。</p>
            <time>2026.07.08</time>
          </div>
        </div>
      </div>
    )
  }

  if (artifact.type === 'PPT') {
    return (
      <div className="artifact-preview-shell">
        <ArtifactPreviewToolbar artifact={artifact} onDownload={onDownload} />
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
                <h1>COMAC AI</h1>
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
        <ArtifactPreviewToolbar artifact={artifact} onDownload={onDownload} />
        <div className="artifact-preview-content">
          <div className="preview-word">
            <div className="word-page-viewport">
              <article className="word-page word-page--cover">
                <span className="word-crop word-crop--tl" />
                <span className="word-crop word-crop--tr" />
                <span className="word-crop word-crop--bl" />
                <span className="word-crop word-crop--br" />
                <h1>输出物预览示例</h1>
                <p className="word-author">由 COMAC AI 生成</p>
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
      <ArtifactPreviewToolbar artifact={artifact} onDownload={onDownload} />
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
            <p>Markdown 预览以阅读为主，内容区保留纵向滚动；拖拽右侧抽屉时，正文阅读宽度保持稳定，避免不断重排影响阅读。</p>
            <p>正式产品中可以继续补充目录、锚点、代码高亮和链接安全策略。</p>
          </article>
        </div>
      </div>
    </div>
  )
}

function ArtifactPreviewToolbar({ artifact, onDownload }: { artifact: Artifact; onDownload: () => void }) {
  return (
    <div className="artifact-preview-toolbar">
      <strong>{artifact.name}</strong>
      <button type="button" title="下载" onClick={onDownload}>
        <Download size={21} />
      </button>
    </div>
  )
}

function RightPanelEmpty({ mode, artifacts, onOpenArtifact }: { mode: RightPanelMode; artifacts: Artifact[]; onOpenArtifact: (artifact: Artifact) => void }) {
  if (mode === 'workspace') {
    return (
      <div className="right-panel-list">
        <div className="right-panel-list-header">
          <h3>工作空间文件</h3>
          <p>当前 Demo 中，智能体生成的文件会进入这里。</p>
        </div>
        <div className="workspace-file-list">
          {artifacts.length > 0 ? (
            artifacts.map((artifact) => (
              <button key={artifact.id} className="workspace-file-row" type="button" onClick={() => onOpenArtifact(artifact)}>
                <span className={`workspace-file-icon workspace-file-icon--${artifact.type.toLowerCase()}`}>{artifactIcon(artifact.type)}</span>
                <span>
                  <strong>{artifact.name}</strong>
                  <em>{artifactTypeLabel(artifact.type)} · {artifact.size}</em>
                </span>
              </button>
            ))
          ) : (
            <p className="workspace-file-empty">暂无文件</p>
          )}
        </div>
      </div>
    )
  }

  if (mode === 'browser') {
    return (
      <div className="browser-empty-page">
        <div className="html-browser-bar">
          <button type="button" aria-label="后退">←</button>
          <button type="button" aria-label="前进">→</button>
          <div className="html-address">
            <Search size={17} />
            <span>输入网址或选择 HTML 输出物</span>
          </div>
          <button type="button" aria-label="刷新">↻</button>
        </div>
        <div className="browser-empty-content">
          <FileCode2 size={44} />
          <h3>浏览器</h3>
          <p>打开 HTML 输出物后，这里会以浏览器方式预览页面。</p>
        </div>
      </div>
    )
  }

  if (mode === 'changes') {
    return (
      <div className="artifact-empty">
        <FileText size={42} />
        <p>变更</p>
        <span>本期原型先占位，后续可展示文件修改记录和版本差异。</span>
      </div>
    )
  }

  return (
    <div className="artifact-empty">
      <FileText size={42} />
      <p>输出物</p>
      <span>暂无内容。生成 HTML、PPT、Word 或 Markdown 后，文件会出现在这里。</span>
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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeNav, setActiveNav] = useState('新建任务')
  const [openAutomationFolders, setOpenAutomationFolders] = useState<Record<string, boolean>>({})
  const [prompt, setPrompt] = useState('')
  const [openedTask, setOpenedTask] = useState<Task | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [artifactTabs, setArtifactTabs] = useState<Artifact[]>([])
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null)
  const [artifactDrawerOpen, setArtifactDrawerOpen] = useState(false)
  const [artifactDrawerWidth, setArtifactDrawerWidth] = useState(640)
  const [isResizingArtifactDrawer, setIsResizingArtifactDrawer] = useState(false)
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>('workspace')
  const [rightPanelMenuOpen, setRightPanelMenuOpen] = useState(false)
  const [downloadToast, setDownloadToast] = useState('')
  const [automationTasks, setAutomationTasks] = useState<AutomationTask[]>(() => loadStoredList(TASKS_STORAGE_KEY, seedTasks))
  const [automationRuns, setAutomationRuns] = useState<AutomationRun[]>(() => loadStoredList(RUNS_STORAGE_KEY, seedRuns))

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
      { label: '助理', icon: Bot },
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

  const addArtifactTab = (artifact: Artifact) => {
    setArtifactTabs((items) => {
      if (items.some((item) => item.id === artifact.id)) return items
      return [...items, artifact]
    })
    setActiveArtifactId(artifact.id)
    setRightPanelMode(artifact.type === 'HTML' ? 'browser' : 'artifact')
    setArtifactDrawerOpen(true)
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
          content: `搞定，${artifactTypeLabel(artifact.type)} 输出物已生成。${artifact.summary}你可以点击卡片预览，也可以在右侧抽屉里模拟下载。`,
          artifact,
        }
      : {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: '我先收到了。当前 Demo 已接入四个固定剧本：输入“生成HTML”“生成PPT”“生成WORD”或“生成Markdown”即可生成对应输出物卡片。',
        }
    setMessages((items) => [...items, userMessage, assistantMessage])
    setOpenedTask({ id: Date.now(), title: artifact ? artifact.name : value, time: '刚刚' })
    setPrompt('')
  }

  const openArtifact = (artifact: Artifact) => {
    addArtifactTab(artifact)
  }

  const closeArtifactTab = (artifactId: string) => {
    setArtifactTabs((items) => {
      const nextItems = items.filter((item) => item.id !== artifactId)
      if (activeArtifactId === artifactId) {
        const removedIndex = items.findIndex((item) => item.id === artifactId)
        const nextActive = nextItems[Math.max(0, removedIndex - 1)] ?? nextItems[0] ?? null
        if (rightPanelMode === 'artifact' || rightPanelMode === 'browser') {
          setActiveArtifactId(nextActive?.id ?? null)
          setRightPanelMode(nextActive ? (nextActive.type === 'HTML' ? 'browser' : 'artifact') : 'workspace')
        } else {
          setActiveArtifactId(nextActive?.id ?? null)
        }
      }
      return nextItems
    })
  }

  const allArtifacts = useMemo(() => {
    const artifactMap = new Map<string, Artifact>()
    messages.forEach((message) => {
      if (message.artifact) artifactMap.set(message.artifact.id, message.artifact)
    })
    artifactTabs.forEach((artifact) => artifactMap.set(artifact.id, artifact))
    return Array.from(artifactMap.values()).reverse()
  }, [artifactTabs, messages])

  const activeArtifact = useMemo(() => {
    return artifactTabs.find((artifact) => artifact.id === activeArtifactId) ?? null
  }, [activeArtifactId, artifactTabs])

  const toggleArtifactDrawer = () => {
    if (artifactDrawerOpen) {
      setArtifactDrawerOpen(false)
      return
    }
    setRightPanelMode('workspace')
    setArtifactDrawerOpen(true)
  }

  const simulateDownload = () => {
    setDownloadToast(activeArtifact ? `已模拟下载 ${activeArtifact.name}` : '当前没有可下载的输出物')
  }

  const selectPanelMode = (mode: RightPanelMode) => {
    setRightPanelMode(mode)
    setRightPanelMenuOpen(false)
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

  return (
    <div className="app-shell">
      <div className="app-body">
        <aside className={`sidebar ${sidebarOpen ? '' : 'sidebar--closed'}`}>
          <div className="sidebar-top">
            <label className="search-box">
              <Search size={19} strokeWidth={2} />
              <input aria-label="搜索任务" placeholder="搜索任务" />
            </label>
            <button
              className="icon-button panel-toggle"
              type="button"
              title="收起侧边栏"
              onClick={() => setSidebarOpen(false)}
            >
              <LayoutPanelLeft size={21} strokeWidth={1.8} />
            </button>
          </div>

          <nav className="primary-nav" aria-label="主导航">
            {navItems.map(({ label, icon: Icon }) => (
              <button
                key={label}
                className={activeNav === label ? 'nav-item active' : 'nav-item'}
                type="button"
                onClick={() => {
                  setActiveNav(label)
                  if (label === '新建任务') setOpenedTask(null)
                }}
              >
                <Icon size={20} strokeWidth={1.9} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-scroll">
            <section className="sidebar-section">
              <div className="section-heading">
                <span>任务</span>
                <span className="count-badge">4</span>
              </div>
              <div className="task-list">
                {recentTasks.map((task) => (
                  <TaskRow key={task.id} task={task} onOpen={setOpenedTask} />
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
                            <TaskRow key={runTask.id} task={runTask} onOpen={setOpenedTask} onDelete={deleteAutomationRunFromSidebar} />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </section>
            )}
          </div>
        </aside>

        {!sidebarOpen && (
          <button
            className="sidebar-reopen"
            type="button"
            title="展开侧边栏"
            onClick={() => setSidebarOpen(true)}
          >
            <LayoutPanelLeft size={21} />
          </button>
        )}

        <main className={`workspace ${activeNav === '自动化' ? 'workspace--automation' : ''}`}>
          {activeNav === '自动化' ? (
            <AutomationWorkspace tasks={automationTasks} runs={automationRuns} setTasks={setAutomationTasks} setRuns={setAutomationRuns} />
          ) : (
            <div className={`chat-workbench ${artifactDrawerOpen ? 'chat-workbench--with-drawer' : ''} ${isResizingArtifactDrawer ? 'chat-workbench--resizing' : ''}`} style={chatWorkbenchStyle}>
              <section className="chat-pane">
                <header className="chat-header">
                  <div>
                    <p className="chat-kicker">COMAC AI</p>
                    <h2>{openedTask ? openedTask.title : '新建任务'}</h2>
                  </div>
                  <div className="chat-header-actions">
                    <button
                      className={`header-icon-button ${artifactDrawerOpen ? 'header-icon-button--active' : ''}`}
                      type="button"
                      title={artifactDrawerOpen ? '收起输出物预览' : '打开输出物预览'}
                      onClick={toggleArtifactDrawer}
                    >
                      <PanelRightOpen size={21} />
                    </button>
                  </div>
                </header>

                {messages.length === 0 ? (
                  <section className="welcome" aria-live="polite">
                    <div className="bot-mark"><Bot size={55} strokeWidth={1.8} /></div>
                    <h1><span>COMAC AI</span>，我帮你</h1>
                    <p>试试输入：生成HTML、生成PPT、生成WORD、生成Markdown。</p>
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
                            <div className="assistant-name">COMAC AI</div>
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

              {artifactDrawerOpen && (
                <aside className="artifact-drawer" aria-label="输出物预览">
                  <button
                    className="artifact-resize-handle"
                    type="button"
                    title="拖拽调整预览宽度"
                    onPointerDown={startArtifactDrawerResize}
                    onPointerMove={moveArtifactDrawerResize}
                    onPointerUp={stopArtifactDrawerResize}
                    onPointerCancel={stopArtifactDrawerResize}
                  >
                    <span />
                  </button>
                  <div className="right-workspace-header">
                    <div className="right-workspace-menu-wrap">
                      <button className="drawer-menu-button" type="button" title="切换右侧工作区" onClick={() => setRightPanelMenuOpen((value) => !value)}>
                        <Menu size={22} />
                      </button>
                      {rightPanelMenuOpen && (
                        <div className="right-workspace-menu">
                          {([
                            ['workspace', '工作空间文件', Folder],
                            ['browser', '浏览器', FileCode2],
                            ['changes', '变更', Layers3],
                          ] as const).map(([mode, label, Icon]) => (
                            <button key={mode} className={rightPanelMode === mode ? 'active' : ''} type="button" onClick={() => selectPanelMode(mode)}>
                              <Icon size={20} />
                              <span>{label}</span>
                              {rightPanelMode === mode && <Check size={18} />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="artifact-tabs" role="tablist" aria-label="右侧工作区页签">
                      {artifactTabs.length > 0 ? (
                        artifactTabs.map((artifact) => (
                          <button
                            key={artifact.id}
                            className={`artifact-tab ${
                              activeArtifactId === artifact.id
                              && ((artifact.type === 'HTML' && rightPanelMode === 'browser') || (artifact.type !== 'HTML' && rightPanelMode === 'artifact'))
                                ? 'active'
                                : ''
                            }`}
                            type="button"
                            role="tab"
                            aria-selected={
                              activeArtifactId === artifact.id
                              && ((artifact.type === 'HTML' && rightPanelMode === 'browser') || (artifact.type !== 'HTML' && rightPanelMode === 'artifact'))
                            }
                            onClick={() => {
                              setActiveArtifactId(artifact.id)
                              setRightPanelMode(artifact.type === 'HTML' ? 'browser' : 'artifact')
                            }}
                          >
                            <span className={`artifact-tab-icon artifact-tab-icon--${artifact.type.toLowerCase()}`}>{artifactIcon(artifact.type)}</span>
                            <span>{artifact.name}</span>
                            <i
                              role="button"
                              tabIndex={0}
                              aria-label={`关闭 ${artifact.name}`}
                              onClick={(event) => {
                                event.stopPropagation()
                                closeArtifactTab(artifact.id)
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  closeArtifactTab(artifact.id)
                                }
                              }}
                            >
                              <X size={17} />
                            </i>
                          </button>
                        ))
                      ) : (
                        <div className="right-workspace-empty-tab">
                          <span>{panelModeLabel(rightPanelMode)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="artifact-drawer-body">
                    {rightPanelMode === 'workspace' || rightPanelMode === 'changes' || (rightPanelMode === 'browser' && activeArtifact?.type !== 'HTML') ? (
                      <RightPanelEmpty mode={rightPanelMode} artifacts={allArtifacts} onOpenArtifact={openArtifact} />
                    ) : activeArtifact && (rightPanelMode === 'artifact' || rightPanelMode === 'browser') ? (
                      <ArtifactPreview artifact={activeArtifact} onDownload={simulateDownload} />
                    ) : (
                      <RightPanelEmpty mode={rightPanelMode} artifacts={allArtifacts} onOpenArtifact={openArtifact} />
                    )}
                  </div>
                </aside>
              )}

              {downloadToast && <div className="download-toast">{downloadToast}</div>}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
