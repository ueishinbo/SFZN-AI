import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEventHandler,
  type ReactNode,
} from 'react'
import {
  ChevronDown,
  ChevronRight,
  Code2,
  File,
  FileCode2,
  FileJson,
  FileText,
  FileType,
  Folder,
  FolderOpen,
  ListFilter,
  PanelRight,
  Plus,
  Presentation,
  Search,
  X,
} from 'lucide-react'
import type { WorkspaceTab } from './useWorkspaceWorkbench'
import type { WorkspaceFileKind, WorkspaceTreeNode } from './workspaceTypes'
import './workspace.css'

export type WorkspaceOutputItem = {
  id: string
  name: string
  kind: WorkspaceFileKind
  meta: string
  nodeId: string
  objectId?: string
}

type ResizeHandlers = {
  onPointerDown: PointerEventHandler<HTMLButtonElement>
  onPointerMove: PointerEventHandler<HTMLButtonElement>
  onPointerUp: PointerEventHandler<HTMLButtonElement>
  onPointerCancel: PointerEventHandler<HTMLButtonElement>
}

type WorkspaceControlsProps = {
  outputs: WorkspaceOutputItem[]
  outputsOpen: boolean
  workspaceVisible: boolean
  onToggleOutputs: () => void
  onCloseOutputs: () => void
  onToggleWorkspace: () => void
  onOpenOutput: (output: WorkspaceOutputItem) => void
}

type WorkspaceWorkbenchProps = WorkspaceControlsProps & {
  tabs: WorkspaceTab[]
  activeTabId: string | null
  nodes: WorkspaceTreeNode[]
  selectedNodeId: string
  defaultExpandedIds: string[]
  navigatorOpen: boolean
  launcherOpen: boolean
  onActivateTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
  onToggleLauncher: () => void
  onCloseLauncher: () => void
  onToggleNavigator: () => void
  onOpenFileLauncher: () => void
  onOpenBrowserLauncher: () => void
  onSelectNode: (node: WorkspaceTreeNode) => void
  renderTab: (tab: WorkspaceTab, node?: WorkspaceTreeNode) => ReactNode
  renderActions?: (tab: WorkspaceTab, node?: WorkspaceTreeNode) => ReactNode
  className?: string
  style?: CSSProperties
  resizeHandlers?: ResizeHandlers
}

function flattenNodes(nodes: WorkspaceTreeNode[]): WorkspaceTreeNode[] {
  return nodes.flatMap((node) => [node, ...(node.children ? flattenNodes(node.children) : [])])
}

function findAncestorIds(nodes: WorkspaceTreeNode[], targetId: string, trail: string[] = []): string[] {
  for (const node of nodes) {
    if (node.id === targetId) return trail
    if (node.children) {
      const result = findAncestorIds(node.children, targetId, [...trail, node.id])
      if (result.length > 0) return result
    }
  }
  return []
}

function filterNodes(nodes: WorkspaceTreeNode[], query: string): WorkspaceTreeNode[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return nodes
  return nodes.flatMap((node) => {
    const children = node.children ? filterNodes(node.children, normalized) : []
    if (node.name.toLowerCase().includes(normalized) || children.length > 0) {
      return [{ ...node, children }]
    }
    return []
  })
}

function NodeIcon({ kind, open, size = 17 }: { kind: WorkspaceFileKind; open?: boolean; size?: number }) {
  if (kind === 'folder') return open ? <FolderOpen size={size} /> : <Folder size={size} />
  if (kind === 'json') return <FileJson size={size} />
  if (kind === 'html') return <FileCode2 size={size} />
  if (kind === 'ppt') return <Presentation size={size} />
  if (kind === 'word') return <FileText size={size} />
  if (kind === 'markdown') return <FileType size={size} />
  return <File size={size} />
}

function WorkspaceControls({
  outputs,
  outputsOpen,
  workspaceVisible,
  onToggleOutputs,
  onCloseOutputs,
  onToggleWorkspace,
  onOpenOutput,
}: WorkspaceControlsProps) {
  const controlsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!outputsOpen) return undefined
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!controlsRef.current?.contains(event.target as Node)) onCloseOutputs()
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseOutputs()
    }
    document.addEventListener('pointerdown', closeOnPointerDown)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onCloseOutputs, outputsOpen])

  return (
    <div className="workspace-controls" ref={controlsRef}>
      <button
        className={`workspace-control-button ${outputsOpen ? 'active' : ''}`}
        type="button"
        aria-label={outputsOpen ? '关闭输出物' : '打开输出物'}
        aria-expanded={outputsOpen}
        title="输出物"
        onClick={onToggleOutputs}
      >
        <ListFilter size={19} />
        {outputs.length > 0 && <span className="workspace-output-indicator">{outputs.length}</span>}
      </button>
      <button
        className={`workspace-control-button ${workspaceVisible ? 'active' : ''}`}
        type="button"
        aria-label={workspaceVisible ? '隐藏 Workspace' : '打开 Workspace'}
        aria-pressed={workspaceVisible}
        title={workspaceVisible ? '隐藏 Workspace' : '打开 Workspace'}
        onClick={onToggleWorkspace}
      >
        <PanelRight size={20} />
      </button>

      {outputsOpen && (
        <section className="workspace-output-popover" aria-label="输出物">
          <header><div><span>输出</span><strong>{outputs.length}</strong></div><small>当前工作空间</small></header>
          {outputs.length > 0 ? (
            <div className="workspace-output-list">
              {outputs.map((output) => (
                <button type="button" key={output.id} onClick={() => onOpenOutput(output)}>
                  <span className={`workspace-output-icon workspace-output-icon--${output.kind}`}><NodeIcon kind={output.kind} size={18} /></span>
                  <span><strong>{output.name}</strong><small>{output.meta}</small></span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          ) : (
            <div className="workspace-output-empty">
              <ListFilter size={30} />
              <strong>当前任务还没有输出物</strong>
              <p>在对话中生成 HTML、PPT、Word 或 Markdown 后会显示在这里。</p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

export function WorkspaceHeaderControls(props: WorkspaceControlsProps) {
  return <WorkspaceControls {...props} />
}

function NavigatorRow({
  node,
  level,
  expanded,
  forceExpanded,
  selectedNodeId,
  onToggle,
  onSelect,
}: {
  node: WorkspaceTreeNode
  level: number
  expanded: Set<string>
  forceExpanded: boolean
  selectedNodeId: string
  onToggle: (id: string) => void
  onSelect: (node: WorkspaceTreeNode) => void
}) {
  const isFolder = node.kind === 'folder'
  const isOpen = forceExpanded || expanded.has(node.id)
  return (
    <>
      <button
        className={`workspace-navigator-row ${selectedNodeId === node.id ? 'active' : ''}`}
        style={{ paddingLeft: 10 + level * 15 }}
        type="button"
        title={node.path}
        onClick={() => isFolder ? onToggle(node.id) : onSelect(node)}
      >
        {isFolder ? (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="workspace-navigator-spacer" />}
        <NodeIcon kind={node.kind} open={isOpen} />
        <span>{node.name}</span>
      </button>
      {isFolder && isOpen && node.children?.map((child) => (
        <NavigatorRow
          key={child.id}
          node={child}
          level={level + 1}
          expanded={expanded}
          forceExpanded={forceExpanded}
          selectedNodeId={selectedNodeId}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
    </>
  )
}

export default function WorkspaceWorkbench({
  tabs,
  activeTabId,
  nodes,
  selectedNodeId,
  defaultExpandedIds,
  outputs,
  outputsOpen,
  workspaceVisible,
  navigatorOpen,
  launcherOpen,
  onActivateTab,
  onCloseTab,
  onToggleOutputs,
  onCloseOutputs,
  onToggleWorkspace,
  onToggleNavigator,
  onOpenOutput,
  onToggleLauncher,
  onCloseLauncher,
  onOpenFileLauncher,
  onOpenBrowserLauncher,
  onSelectNode,
  renderTab,
  renderActions,
  className = '',
  style,
  resizeHandlers,
}: WorkspaceWorkbenchProps) {
  const [expanded, setExpanded] = useState(() => new Set(defaultExpandedIds))
  const [filterQuery, setFilterQuery] = useState('')
  const allNodes = useMemo(() => flattenNodes(nodes), [nodes])
  const filteredNodes = useMemo(() => filterNodes(nodes, filterQuery), [filterQuery, nodes])
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]
  const activeNode = activeTab ? allNodes.find((node) => node.id === activeTab.nodeId) : undefined
  const latestHtml = outputs.find((output) => output.kind === 'html')

  useEffect(() => {
    if (!selectedNodeId) return
    const ancestors = findAncestorIds(nodes, selectedNodeId)
    if (ancestors.length === 0) return
    setExpanded((current) => new Set([...current, ...ancestors]))
  }, [nodes, selectedNodeId])

  useEffect(() => {
    if (!launcherOpen) return undefined
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseLauncher()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [launcherOpen, onCloseLauncher])

  const toggleFolder = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <aside className={`workspace-workbench ${className}`.trim()} style={style} aria-label="Workspace 工作台">
      {resizeHandlers && (
        <button className="workspace-workbench-resize" type="button" title="拖拽调整 Workspace 宽度" {...resizeHandlers}><span /></button>
      )}

      <header className="workspace-workbench-topbar">
        <div className="workspace-tab-strip" role="tablist" aria-label="工作视图">
          {tabs.map((tab) => (
            <div className={`workspace-tab ${tab.id === activeTabId ? 'active' : ''}`} key={tab.id}>
              <button type="button" role="tab" aria-label={`${tab.title} ${tab.mode === 'browser' ? '浏览器' : '文件'}`} aria-selected={tab.id === activeTabId} title={tab.title} onClick={() => onActivateTab(tab.id)}>
                {tab.mode === 'browser' ? <Code2 size={17} /> : <NodeIcon kind={tab.kind} />}
                <span>{tab.title}</span>
              </button>
              <button className="workspace-tab-close" type="button" aria-label={`关闭 ${tab.title} ${tab.mode === 'browser' ? '浏览器' : '文件'}`} onClick={() => onCloseTab(tab.id)}><X size={15} /></button>
            </div>
          ))}
          <button className={`workspace-new-view ${launcherOpen ? 'active' : ''}`} type="button" aria-label="打开工作视图" title="打开工作视图" onClick={onToggleLauncher}><Plus size={20} /></button>
        </div>

        <WorkspaceControls
          outputs={outputs}
          outputsOpen={outputsOpen}
          workspaceVisible={workspaceVisible}
          onToggleOutputs={onToggleOutputs}
          onCloseOutputs={onCloseOutputs}
          onToggleWorkspace={onToggleWorkspace}
          onOpenOutput={onOpenOutput}
        />
      </header>

      <div className="workspace-contextbar">
        <div className="workspace-contextbar-path" title={activeNode?.path ?? '/Workspace'}>
          <span>/</span>
          {activeNode?.path
            ?.replace(/^\/Workspace\/?/, '')
            .split('/')
            .filter(Boolean)
            .map((segment, index, segments) => (
              <span key={`${segment}-${index}`}>
                <strong>{segment}</strong>
                {index < segments.length - 1 && <ChevronRight size={14} />}
              </span>
            ))}
        </div>
        <div className="workspace-contextbar-actions">
          {activeNode && (activeNode.size || activeNode.updatedAt) && (
            <span>{[activeNode.size, activeNode.updatedAt].filter(Boolean).join(' · ')}</span>
          )}
          {activeTab && renderActions?.(activeTab, activeNode)}
          <button
            className={navigatorOpen ? 'active' : ''}
            type="button"
            aria-label={navigatorOpen ? '关闭文件目录' : '打开文件目录'}
            aria-expanded={navigatorOpen}
            title={navigatorOpen ? '关闭文件目录' : '打开文件目录'}
            onClick={onToggleNavigator}
          >
            {navigatorOpen ? <FolderOpen size={20} /> : <Folder size={20} />}
          </button>
        </div>
      </div>

      <div className={`workspace-workbench-body ${navigatorOpen ? 'workspace-workbench-body--with-navigator' : ''}`}>
        <section className="workspace-workbench-canvas">
          {activeTab && (
            <div className={`workspace-document-content workspace-document-content--${activeTab.mode} workspace-document-content--${activeTab.kind}`}>
              {renderTab(activeTab, activeNode)}
            </div>
          )}

          {!activeTab && !launcherOpen && (
            <button className="workspace-canvas-empty" type="button" onClick={onToggleLauncher}>
              <FolderOpen size={34} />
              <strong>打开工作视图</strong>
              <span>选择文件或打开已生成的 HTML</span>
            </button>
          )}

          {launcherOpen && (
            <div className="workspace-launcher-backdrop" onMouseDown={(event) => {
              if (event.target === event.currentTarget) onCloseLauncher()
            }}>
              <section className="workspace-launcher" aria-label="打开工作视图">
                <div className="workspace-launcher-actions">
                  <button type="button" onClick={onOpenFileLauncher}>
                    <span><FolderOpen size={21} /></span><strong>打开文件</strong><small>从右侧工作区目录选择文件</small>
                  </button>
                  <button type="button" disabled={!latestHtml} onClick={onOpenBrowserLauncher}>
                    <span><Code2 size={21} /></span><strong>浏览器</strong><small>{latestHtml ? '打开最近生成的 HTML' : '生成 HTML 后可用'}</small>
                  </button>
                </div>
                <div className="workspace-launcher-recent">
                  <span>推荐</span>
                  {outputs.length > 0 ? outputs.slice(0, 6).map((output) => (
                    <button type="button" key={output.id} onClick={() => onOpenOutput(output)}>
                      <NodeIcon kind={output.kind} /><strong>{output.name}</strong><small>{output.meta}</small>
                    </button>
                  )) : <p>当前还没有输出物，可以回到对话中生成一个文件。</p>}
                </div>
              </section>
            </div>
          )}
        </section>

        {navigatorOpen && (
          <nav className="workspace-navigator" aria-label="Workspace 文件导航">
            <label className="workspace-navigator-search"><Search size={18} /><input value={filterQuery} onChange={(event) => setFilterQuery(event.target.value)} placeholder="筛选文件…" aria-label="筛选文件" />{filterQuery && <button type="button" aria-label="清空筛选" onClick={() => setFilterQuery('')}><X size={15} /></button>}</label>
            <div className="workspace-navigator-root"><FolderOpen size={16} /><span>/Workspace</span></div>
            <div className="workspace-navigator-tree">
              {filteredNodes.length > 0 ? filteredNodes.map((node) => (
                <NavigatorRow
                  key={node.id}
                  node={node}
                  level={0}
                  expanded={expanded}
                  forceExpanded={Boolean(filterQuery.trim())}
                  selectedNodeId={selectedNodeId}
                  onToggle={toggleFolder}
                  onSelect={onSelectNode}
                />
              )) : <div className="workspace-navigator-empty">没有匹配的文件</div>}
            </div>
          </nav>
        )}
      </div>
    </aside>
  )
}
