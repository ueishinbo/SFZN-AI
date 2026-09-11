export type WorkspaceFileKind = 'folder' | 'markdown' | 'json' | 'html' | 'ppt' | 'word' | 'file'

export type WorkspaceTreeNode = {
  id: string
  name: string
  path: string
  kind: WorkspaceFileKind
  size?: string
  updatedAt?: string
  content?: string
  objectId?: string
  children?: WorkspaceTreeNode[]
}
