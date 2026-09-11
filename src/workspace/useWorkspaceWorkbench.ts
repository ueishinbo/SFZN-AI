import { useState } from 'react'
import type { WorkspaceFileKind } from './workspaceTypes'

export type WorkspaceTab = {
  id: string
  title: string
  mode: 'file' | 'browser'
  nodeId: string
  kind: WorkspaceFileKind
  objectId?: string
}

type WorkbenchOptions = {
  initialTabs?: WorkspaceTab[]
  initialNavigatorOpen?: boolean
  initialWorkspaceVisible?: boolean
}

export function useWorkspaceWorkbench({
  initialTabs = [],
  initialNavigatorOpen = false,
  initialWorkspaceVisible = initialTabs.length > 0,
}: WorkbenchOptions = {}) {
  const [tabs, setTabs] = useState<WorkspaceTab[]>(initialTabs)
  const [activeTabId, setActiveTabId] = useState<string | null>(initialTabs[0]?.id ?? null)
  const [workspaceVisible, setWorkspaceVisible] = useState(initialWorkspaceVisible)
  const [navigatorOpen, setNavigatorOpen] = useState(initialTabs.length > 0 && initialNavigatorOpen)
  const [outputsOpen, setOutputsOpen] = useState(false)
  const [launcherOpen, setLauncherOpen] = useState(false)

  const showWorkspace = () => {
    setWorkspaceVisible(true)
    setOutputsOpen(false)
    setLauncherOpen(tabs.length === 0)
  }

  const hideWorkspace = () => {
    setWorkspaceVisible(false)
    setOutputsOpen(false)
    setLauncherOpen(false)
  }

  const toggleWorkspace = () => {
    if (workspaceVisible) hideWorkspace()
    else showWorkspace()
  }

  const openTab = (tab: WorkspaceTab) => {
    setTabs((current) => {
      if (current.some((item) => item.id === tab.id)) return current
      const activeIndex = current.findIndex((item) => item.id === activeTabId)
      if (activeIndex < 0) return [...current, tab]
      return [...current.slice(0, activeIndex + 1), tab, ...current.slice(activeIndex + 1)]
    })
    setActiveTabId(tab.id)
    setWorkspaceVisible(true)
    setLauncherOpen(false)
  }

  const closeTab = (tabId: string) => {
    setTabs((current) => {
      const closingIndex = current.findIndex((item) => item.id === tabId)
      if (closingIndex < 0) return current
      const next = current.filter((item) => item.id !== tabId)
      if (next.length === 0) {
        setActiveTabId(null)
        setWorkspaceVisible(false)
        setNavigatorOpen(false)
        setOutputsOpen(false)
        setLauncherOpen(false)
        return next
      }
      if (activeTabId === tabId) {
        setActiveTabId(next[Math.min(closingIndex, next.length - 1)].id)
      }
      return next
    })
  }

  const resetWorkbench = () => {
    setTabs([])
    setActiveTabId(null)
    setWorkspaceVisible(false)
    setNavigatorOpen(false)
    setOutputsOpen(false)
    setLauncherOpen(false)
  }

  return {
    tabs,
    activeTabId,
    workspaceVisible,
    navigatorOpen,
    outputsOpen,
    launcherOpen,
    openTab,
    closeTab,
    showWorkspace,
    hideWorkspace,
    toggleWorkspace,
    resetWorkbench,
    setActiveTabId,
    setNavigatorOpen,
    setOutputsOpen,
    setLauncherOpen,
  }
}
