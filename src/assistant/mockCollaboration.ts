export type CollaborationDirection = 'incoming' | 'outgoing'
export type CollaborationKind = 'assignment' | 'reminder'
export type CollaborationStatus = 'pending' | 'sent' | 'in_progress' | 'overdue' | 'completed'
export type CollaborationDecisionState = 'none' | 'new' | 'queued' | 'surfaced' | 'deferred_by_user' | 'resolved'

export type CollaborationTimelineItem = {
  id: string
  title: string
  detail: string
  time: string
  tone?: 'default' | 'warning' | 'success'
}

export type CollaborationItem = {
  id: string
  kind: CollaborationKind
  direction: CollaborationDirection
  title: string
  project: string
  projectCode: string
  assigner: string
  assignee: string
  dueAt: string
  status: CollaborationStatus
  priority: '普通' | '重要' | '紧急'
  description: string
  progress: string
  updatedAt: string
  sourceSystem: string
  decisionState?: CollaborationDecisionState
  timeline: CollaborationTimelineItem[]
}

export const collaborationSeeds: CollaborationItem[] = [
  {
    id: 'collab-engine-review',
    kind: 'assignment',
    direction: 'incoming',
    title: '发动机风险评审材料整理',
    project: 'C929 总体方案项目',
    projectCode: 'C929-PMO-2026',
    assigner: '王工',
    assignee: '我',
    dueAt: '7月24日 18:00',
    status: 'pending',
    priority: '重要',
    description: '汇总发动机专业当前风险项、影响范围和拟采取措施，形成评审材料初稿。',
    progress: '尚未开始',
    updatedAt: '今天 09:18',
    sourceSystem: 'C项目管理平台',
    decisionState: 'none',
    timeline: [
      {
        id: 'timeline-engine-created',
        title: '王工派发任务',
        detail: '王工确认后，由其数字分身完成任务派发。',
        time: '今天 09:18',
      },
      {
        id: 'timeline-engine-delivered',
        title: '已送达你的数字分身',
        detail: '任务信息已与项目平台记录核对一致。',
        time: '今天 09:18',
        tone: 'success',
      },
    ],
  },
  {
    id: 'collab-quality-close',
    kind: 'reminder',
    direction: 'incoming',
    title: '供应商质量问题清单闭环',
    project: 'C919 批产保障项目',
    projectCode: 'C919-SUP-2026',
    assigner: '李敏',
    assignee: '我',
    dueAt: '今天 17:30',
    status: 'overdue',
    priority: '紧急',
    description: '补充三项未闭环质量问题的责任人、纠正措施和预计关闭日期。',
    progress: '已完成 3/5 项，剩余 2 项待供应商确认',
    updatedAt: '今天 10:06',
    sourceSystem: '供应商问题管理平台',
    decisionState: 'none',
    timeline: [
      {
        id: 'timeline-quality-assigned',
        title: '任务进入处理中',
        detail: '你已在项目平台更新了首轮处理进展。',
        time: '昨天 16:42',
      },
      {
        id: 'timeline-quality-reminded',
        title: '李敏发起催办',
        detail: '请在今天下班前补充剩余两项问题的预计关闭时间。',
        time: '今天 10:06',
        tone: 'warning',
      },
    ],
  },
  {
    id: 'collab-avionics-test',
    kind: 'assignment',
    direction: 'outgoing',
    title: '航电接口测试问题复核',
    project: 'C929 航电集成验证',
    projectCode: 'C929-AVI-INT',
    assigner: '我',
    assignee: '张三',
    dueAt: '7月25日 12:00',
    status: 'in_progress',
    priority: '重要',
    description: '复核接口测试中的5项异常记录，确认是否需要纳入下一轮回归测试。',
    progress: '张三已开始处理，预计明天上午反馈',
    updatedAt: '今天 09:46',
    sourceSystem: 'C项目管理平台',
    decisionState: 'none',
    timeline: [
      {
        id: 'timeline-avionics-sent',
        title: '任务已派发给张三',
        detail: '任务已写入项目平台，并通知张三的数字分身。',
        time: '昨天 15:12',
        tone: 'success',
      },
      {
        id: 'timeline-avionics-progress',
        title: '张三更新进展',
        detail: '已完成异常记录核对，正在确认回归测试范围。',
        time: '今天 09:46',
      },
    ],
  },
  {
    id: 'collab-weekly-summary',
    kind: 'assignment',
    direction: 'outgoing',
    title: '型号例会风险摘要',
    project: 'C929 总体方案项目',
    projectCode: 'C929-PMO-2026',
    assigner: '我',
    assignee: '周蕾',
    dueAt: '7月21日 16:00',
    status: 'completed',
    priority: '普通',
    description: '整理本周新增与升级风险，输出一页例会摘要。',
    progress: '已完成并回传例会摘要',
    updatedAt: '昨天 15:38',
    sourceSystem: 'C项目管理平台',
    decisionState: 'resolved',
    timeline: [
      {
        id: 'timeline-weekly-complete',
        title: '周蕾完成任务',
        detail: '例会风险摘要已回传并写入项目工作区。',
        time: '昨天 15:38',
        tone: 'success',
      },
    ],
  },
]

export const dispatchDraft: CollaborationItem = {
  id: 'collab-draft-dispatch',
  kind: 'assignment',
  direction: 'outgoing',
  title: '发动机风险评审材料整理',
  project: 'C929 总体方案项目',
  projectCode: 'C929-PMO-2026',
  assigner: '我',
  assignee: '张三',
  dueAt: '7月24日 18:00',
  status: 'sent',
  priority: '重要',
  description: '汇总发动机专业当前风险项、影响范围和拟采取措施，形成评审材料初稿。',
  progress: '等待张三处理',
  updatedAt: '刚刚',
  sourceSystem: 'C项目管理平台',
  decisionState: 'none',
  timeline: [],
}

export function statusLabel(status: CollaborationStatus) {
  switch (status) {
    case 'pending':
      return '待处理'
    case 'sent':
      return '已派发'
    case 'in_progress':
      return '处理中'
    case 'overdue':
      return '待回复'
    case 'completed':
      return '已完成'
    default:
      return status
  }
}
