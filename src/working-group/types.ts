export type WorkingGroupMember = {
  id: string
  role: string // 岗位名，如 '质量适航岗'
  person: string // 人名，如 '陈工'
  color: 'blue' | 'green' | 'purple' | 'orange'
}

export type WorkingGroupNodeKind =
  | 'speak' // 发言（对话讨论）
  | 'dispatch' // 下发（任务下发）
  | 'produce' // 产出（产物发送）
  | 'conclusion' // 结论（讨论收敛）
  | 'confirm' // 待确认（对外/拍板动作）

export type WorkingGroupNodeStatus = 'pending' | 'running' | 'done' | 'awaiting'

export type WorkingGroupNode = {
  id: string
  phaseId: string
  actorId: string // WorkingGroupMember.id 或 'user'
  kind: WorkingGroupNodeKind
  action: string // 具体动作名，用于流程图中具象表达（如「补充交付风险」）
  thinking: string[] // 思维链步骤，逐条流式展示
  content?: string // speak / conclusion 的正式输出正文
  dispatch?: { assigneeId: string; title: string }
  artifact?: { name: string; kind: 'docx' | 'md' | 'pptx'; summary: string }
  confirm?: { question: string; description: string; actionLabel: string }
  parallelGroup?: string // 相同值的节点并行执行
}

export type WorkingGroupPhase = { id: string; title: string; output: string }

export type WorkingGroupEdge = { from: string; to: string; condition: string }

export type WorkingGroupRun = {
  id: string
  title: string
  orchestrationSummary: string[] // 编排结果摘要（收起态展示）
  members: WorkingGroupMember[]
  phases: WorkingGroupPhase[]
  nodes: WorkingGroupNode[]
  edges?: WorkingGroupEdge[] // 流程结构（含分支），用于任务发送界面的思维导图展示
}
