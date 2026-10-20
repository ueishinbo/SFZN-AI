export type A2AConversationScope = 'direct' | 'group'
export type A2AMechanism = 'notice' | 'collaboration'
export type A2AConversationStatus = 'delivered' | 'waiting_replies' | 'waiting_user_confirmation' | 'response_received' | 'completed'

export type A2AConfirmationChoice = {
  id: string
  label: string
  description: string
  commandAction?: 'send' | 'complete'
  commandContent?: string
}

export type A2AUserConfirmation = {
  id: string
  question: string
  description: string
  choices: A2AConfirmationChoice[]
  resumeStatus: Exclude<A2AConversationStatus, 'waiting_user_confirmation'>
  resumePreview: string
}

export type A2AConversationMember = {
  userId: string
  name: string
  department: string
  color: 'blue' | 'green' | 'purple' | 'orange'
}

export type A2AConversation = {
  issue?: { id: string; title: string; goal: string }
  sourceTask?: { platform: string; application: string; taskId: string; titleAtReference: string; referencedAt: string; url?: string; unavailable?: boolean }
  completedAt?: string
  completionSource?: 'host' | 'model'
  completionReason?: string
  id: string
  title: string
  scope: A2AConversationScope
  mechanism: A2AMechanism
  status: A2AConversationStatus
  hostUserId: string
  hostName: string
  perspective?: 'initiator' | 'recipient'
  members: A2AConversationMember[]
  speakingOrder: string[]
  goal?: string
  round: number
  maxRounds?: number
  expectedReplyCount: number
  repliedCount: number
  createdAt: string
  updatedAt: string
  preview: string
  /** Optional local demo scenario; never sent to a backend. */
  demo?: { roundSummaries?: Record<string, string>; roundReplies?: Record<string, Record<string, string>>; privateMessages?: { role: 'user' | 'assistant'; content: string }[]; readOnly?: boolean; messages: A2AConversationMessage[]; replies: Record<string, string>; completionSummary: string }
  pendingCurrentUserConfirmation?: A2AUserConfirmation
}

export type A2AAttachment = { id: string; name: string; kind: 'markdown' | 'html'; content: string }
export type A2AConversationMessage = {
  attachments?: A2AAttachment[]
  id: string
  conversationId: string
  roundId?: string
  actorUserId: string
  actorName: string
  origin: 'initiator_twin' | 'participant_twin'
  content: string
  sequence: number
  createdAt: string
}

export type A2AConversationCommand = {
  replyToUserIds?: string[]
  id: string
  conversationId: string
  action: 'send' | 'complete'
  content: string
  createdAt: string
}

export type A2ACommandResult = {
  conversation: A2AConversation
  command: A2AConversationCommand
  created: boolean
}

export const knownA2AMembers: A2AConversationMember[] = [
  { userId: 'user-li-si', name: '李四', department: '生产计划部', color: 'green' },
  { userId: 'user-wang-wu', name: '王五', department: '供应链管理部', color: 'purple' },
  { userId: 'user-chen-gong', name: '陈工', department: '质量适航部', color: 'orange' },
  { userId: 'user-liu-gong', name: '刘工', department: '总体设计部', color: 'blue' },
  { userId: 'user-zhao-zong', name: '赵总', department: '项目管理部', color: 'purple' },
]

export const scopeLabels: Record<A2AConversationScope, string> = {
  direct: '单聊',
  group: '群聊',
}

export const mechanismLabels: Record<A2AMechanism, string> = {
  notice: '通知',
  collaboration: '协作',
}

export const seedA2AConversations: A2AConversation[] = [
  {
    id: 'a2a-direct-notice-li-si',
    title: '李四 · 通知',
    scope: 'direct',
    mechanism: 'notice',
    status: 'delivered',
    hostUserId: 'current-user',
    hostName: '张三',
    members: [knownA2AMembers[0]],
    speakingOrder: [knownA2AMembers[0].userId],
    round: 1,
    expectedReplyCount: 0,
    repliedCount: 0,
    createdAt: '今天 09:18',
    updatedAt: '10分钟前',
    preview: '评审会议调整到下午三点',
  },
  {
    id: 'a2a-direct-collaboration-wang-wu',
    title: '王五 · 协作',
    scope: 'direct',
    mechanism: 'collaboration',
    status: 'waiting_replies',
    hostUserId: 'current-user',
    hostName: '张三',
    members: [knownA2AMembers[1]],
    speakingOrder: [knownA2AMembers[1].userId],
    goal: '确认供应商本周交付节点和主要风险',
    round: 1,
    expectedReplyCount: 1,
    repliedCount: 0,
    createdAt: '今天 08:40',
    updatedAt: '35分钟前',
    preview: '等待王五回复 · 0/1',
  },
  {
    id: 'a2a-direct-inbound-li-si-materials',
    title: '李四 · 交付资料请求',
    scope: 'direct',
    mechanism: 'collaboration',
    status: 'waiting_replies',
    hostUserId: 'user-li-si',
    hostName: '李四',
    perspective: 'recipient',
    members: [{ userId: 'current-user', name: '张三', department: '市场与营销部', color: 'blue' }],
    speakingOrder: ['current-user'],
    goal: '确认本周方案交付材料的版本与提交时间',
    round: 1,
    expectedReplyCount: 1,
    repliedCount: 0,
    createdAt: '今天 10:12',
    updatedAt: '刚刚',
    preview: '你收到一项待回复协作',
  },
  {
    id: 'a2a-group-inbound-notice-quality',
    title: '质量例会行动项',
    scope: 'group',
    mechanism: 'notice',
    status: 'delivered',
    hostUserId: 'user-chen-gong',
    hostName: '陈工',
    perspective: 'recipient',
    members: [
      { userId: 'current-user', name: '张三', department: '市场与营销部', color: 'blue' },
      knownA2AMembers[1],
      knownA2AMembers[3],
    ],
    speakingOrder: [],
    round: 1,
    expectedReplyCount: 0,
    repliedCount: 0,
    createdAt: '今天 09:46',
    updatedAt: '22分钟前',
    preview: '已收到 · 需在周四前完成 2 项行动',
  },
  {
    id: 'a2a-group-notice-year-plan',
    title: '年度重点工作通知',
    scope: 'group',
    mechanism: 'notice',
    status: 'delivered',
    hostUserId: 'current-user',
    hostName: '张三',
    members: [knownA2AMembers[4], knownA2AMembers[0], knownA2AMembers[1]],
    speakingOrder: [knownA2AMembers[4].userId, knownA2AMembers[0].userId, knownA2AMembers[1].userId],
    round: 1,
    expectedReplyCount: 0,
    repliedCount: 0,
    createdAt: '周一 09:10',
    updatedAt: '周一',
    preview: '重点工作安排已同步给 3 人',
  },
  {
    id: 'a2a-group-collaboration-product-review',
    title: '产品方案评审群',
    scope: 'group',
    mechanism: 'collaboration',
    status: 'waiting_user_confirmation',
    hostUserId: 'current-user',
    hostName: '张三',
    members: [knownA2AMembers[2], knownA2AMembers[3]],
    speakingOrder: [knownA2AMembers[2].userId, knownA2AMembers[3].userId],
    goal: '从质量和总体方案两个角度补充当前评审方案',
    round: 1,
    expectedReplyCount: 2,
    repliedCount: 2,
    createdAt: '昨天 14:20',
    updatedAt: '昨天',
    preview: '等待你确认下一步',
    pendingCurrentUserConfirmation: {
      id: 'a2a-confirm-product-review-next-step',
      question: '本轮意见已经收齐，接下来怎么处理？',
      description: '群聊会保持挂起，只有你完成确认后，分身才会继续执行下一步。',
      resumeStatus: 'response_received',
      resumePreview: '本轮已收到全部回复 · 2/2',
      choices: [
        {
          id: 'continue-round',
          label: '继续下一轮',
          description: '让各分身基于本轮结论继续补充交付风险与关闭计划。',
          commandAction: 'send',
          commandContent: '请基于上一轮结论，继续补充交付风险、责任人和关闭计划。',
        },
        {
          id: 'complete-goal',
          label: '确认完成',
          description: '结束当前目标协作，不再自动发起下一轮。',
          commandAction: 'complete',
          commandContent: '确认本次产品方案评审协作已经完成。',
        },
      ],
    },
  },
]

function inferScope(value: string, members: A2AConversationMember[]): A2AConversationScope {
  const hasGroupWord = ['群聊', '建群', '创建群', '拉群', '讨论群', '协作群', '群里'].some((keyword) => value.includes(keyword))
  return hasGroupWord || members.length > 1 ? 'group' : 'direct'
}

function inferMechanism(value: string): A2AMechanism {
  const hasCollaborationWord = ['协作', '待办', '跟踪', '确认', '完成', '目标', '跟进', '评审', '截止', '方案', '所有人回复'].some((keyword) => value.includes(keyword))
  return hasCollaborationWord ? 'collaboration' : 'notice'
}

function inferGroupTitle(value: string, mechanism: A2AMechanism) {
  if (value.includes('数字宠物')) return '数字宠物首期需求讨论'
  if (value.includes('供应商')) return mechanism === 'notice' ? '供应商事项通知' : '供应商交付风险协作群'
  if (value.includes('发动机')) return mechanism === 'notice' ? '发动机专项通知' : '发动机专项协作群'
  if (value.includes('评审')) return mechanism === 'notice' ? '专项评审通知' : '专项方案评审群'
  if (value.includes('年度')) return mechanism === 'notice' ? '年度重点工作通知' : '年度重点工作协作群'
  return mechanism === 'notice' ? '临时群组通知' : '临时目标协作群'
}

function extractMessageContent(value: string) {
  const colonIndex = value.search(/[：:]/)
  if (colonIndex >= 0 && colonIndex < value.length - 1) return value.slice(colonIndex + 1).trim()
  return value.trim()
}

function findTargetConversation(value: string, conversations: A2AConversation[]) {
  const titleMatch = conversations.find((conversation) => value.includes(conversation.title))
  if (titleMatch) return titleMatch
  const groupMatch = conversations.find((conversation) => conversation.scope === 'group' && (
    value.includes(conversation.title.replace(/[群通知协作]/g, ''))
    || conversation.members.filter((member) => value.includes(member.name)).length >= 2
  ))
  if (groupMatch) return groupMatch
  return conversations.find((conversation) => (
    conversation.scope === 'direct'
    && conversation.members.some((member) => value.includes(member.name))
  ))
}

export function isA2AConversationIntent(value: string, conversations: A2AConversation[] = []) {
  const mentionsKnownConversation = Boolean(findTargetConversation(value, conversations))
  const mentionsPeople = knownA2AMembers.some((member) => value.includes(member.name))
  const mentionsA2AAction = ['群聊', '建群', '创建群', '拉群', '单聊', '通知', '告诉', '同步', '协作', '群里', '回复', '确认', '跟进', '待办', '目标', '评审', '完成协作', '结束协作', '关闭协作'].some((keyword) => value.includes(keyword))
  return mentionsA2AAction && (mentionsKnownConversation || mentionsPeople)
}

export function buildA2ACommand(value: string, conversations: A2AConversation[]): A2ACommandResult {
  const explicitCreation = ['建群', '创建群', '拉群', '发起协作', '创建协作', '新建'].some((keyword) => value.includes(keyword))
  const locatedConversation = findTargetConversation(value, conversations)
  const requestedMechanism = inferMechanism(value)
  const isReplyAction = ['回复', '群里说', '单聊里说', '代发'].some((keyword) => value.includes(keyword))
  const target = explicitCreation || !locatedConversation
    ? undefined
    : isReplyAction || locatedConversation.mechanism === requestedMechanism
      ? locatedConversation
      : undefined
  const now = Date.now()
  if (target?.status === 'completed') throw new Error('该会话已完成，不能继续发送消息。')

  if (target) {
    return {
      conversation: target,
      created: false,
      command: {
        id: `a2a-command-${now}`,
        conversationId: target.id,
        action: ['完成协作', '结束协作', '关闭协作'].some((keyword) => value.includes(keyword)) ? 'complete' : 'send',
        content: extractMessageContent(value),
        createdAt: '刚刚',
      },
    }
  }

  const mentionedMembers = knownA2AMembers.filter((member) => value.includes(member.name))
  const members = mentionedMembers.length > 0 ? mentionedMembers : [knownA2AMembers[0]]
  const scope = inferScope(value, members)
  const mechanism = inferMechanism(value)
  const resolvedMembers = scope === 'direct' ? members.slice(0, 1) : members
  const conversation: A2AConversation = {
    id: `a2a-conversation-${now}`,
    title: scope === 'direct'
      ? `${resolvedMembers[0].name} · ${mechanismLabels[mechanism]}`
      : inferGroupTitle(value, mechanism),
    scope,
    mechanism,
    status: mechanism === 'notice' ? 'delivered' : 'waiting_replies',
    hostUserId: 'current-user',
    hostName: '张三',
    members: resolvedMembers,
    speakingOrder: resolvedMembers.map((member) => member.userId),
    goal: mechanism === 'collaboration' ? extractMessageContent(value) : undefined,
    round: 1,
    maxRounds: scope === 'group' ? Number(value.match(/最多\s*(\d+)\s*轮/)?.[1]) || undefined : undefined,
    expectedReplyCount: mechanism === 'collaboration' ? resolvedMembers.length : 0,
    repliedCount: 0,
    createdAt: '刚刚',
    updatedAt: '刚刚',
    preview: mechanism === 'notice' ? '通知已送达' : `等待回复 · 0/${resolvedMembers.length}`,
  }

  return {
    conversation,
    created: true,
    command: {
      id: `a2a-command-${now}`,
      conversationId: conversation.id,
      action: 'send',
      content: extractMessageContent(value),
      createdAt: '刚刚',
    },
  }
}

// Completed example illustrates the model-decision path; it does not run a model.
seedA2AConversations.push({
  id: 'a2a-model-completed-demo', title: '评审时间确认（模型判定演示）', scope: 'direct', mechanism: 'collaboration',
  status: 'completed', hostUserId: 'current-user', hostName: '张三', members: [knownA2AMembers[0]],
  speakingOrder: [], round: 1, expectedReplyCount: 1, repliedCount: 1, createdAt: '今天 09:00', updatedAt: '今天 09:02',
  completionSource: 'model', completionReason: '演示判定：本次目标仅确认会议时间；收到明确答复，无待补问题。',
  preview: '已确认评审时间为下午三点，本次询问结束',
  demo: { readOnly: true, completionSummary: '评审时间已确认。', replies: {}, messages: [
    {id:'model-demo-1',conversationId:'a2a-model-completed-demo',actorUserId:'current-user',actorName:'张三',origin:'initiator_twin',content:'请确认今天评审是否改到下午三点。',sequence:1,createdAt:'09:00'},
    {id:'model-demo-2',conversationId:'a2a-model-completed-demo',actorUserId:'user-li-si',actorName:'李四',origin:'participant_twin',content:'已确认，评审改为下午三点。',sequence:2,createdAt:'09:01'},
  ] },
})

export function createSeedConversationMessages(conversation: A2AConversation): A2AConversationMessage[] {
  if (conversation.demo) return conversation.demo.messages
  const baseMessage = {
    conversationId: conversation.id,
    actorUserId: conversation.hostUserId,
    actorName: conversation.hostName,
    origin: 'initiator_twin' as const,
    sequence: 1,
  }

  if (conversation.id === 'a2a-direct-notice-li-si') return [{
    ...baseMessage,
    id: 'a2a-seed-direct-notice',
    content: '通知你一下：今天下午的方案评审调整到三点，会议室不变。',
    createdAt: '今天 09:18',
  }]

  if (conversation.id === 'a2a-direct-collaboration-wang-wu') return [{
    ...baseMessage,
    id: 'a2a-seed-direct-collaboration',
    roundId: 'round-direct-1',
    content: '请确认供应商本周交付节点和主要风险，今天下班前回复。',
    attachments: [
      { id: 'supplier-checklist', name: '供应商交付核对清单.md', kind: 'markdown', content: '# 供应商交付核对清单\n\n> 本文件为原型演示附件。\n\n## 需要确认的内容\n\n- 本周各批次的计划与实际交付节点\n- 尚未到货的物料及影响范围\n- 需要补充核实的风险信息\n\n## 回复要求\n\n请注明信息来源，未确认的内容标记为待核实。' },
      { id: 'supplier-material', name: '交付沟通说明.html', kind: 'html', content: '<!doctype html><html lang="zh"><meta charset="utf-8"><style>body{font:15px/1.8 system-ui;padding:28px;color:#34465a}h1{font-size:24px}aside{background:#eff5fa;padding:16px;border-radius:10px}</style><h1>交付沟通说明</h1><aside>本页为原型演示附件，不代表真实业务数据。</aside><h2>本次沟通目的</h2><p>核对供应商本周交付节点与主要风险。</p><h2>请提供</h2><ul><li>已核实的交付信息</li><li>仍需补充的材料</li><li>风险说明与依据</li></ul></html>' }
    ],
    createdAt: '今天 08:40',
  }]

  if (conversation.id === 'a2a-direct-inbound-li-si-materials') return [{
    ...baseMessage,
    id: 'a2a-seed-inbound-materials',
    roundId: 'round-inbound-1',
    content: '张三，麻烦你确认本周方案交付材料的最终版本、责任人和预计提交时间。若有风险请一并说明，今天 17:00 前回复即可。',
    createdAt: '今天 10:12',
  }]

  if (conversation.id === 'a2a-group-inbound-notice-quality') return [{
    ...baseMessage,
    id: 'a2a-seed-inbound-quality-notice',
    content: '质量例会行动项已同步：请在周四前补充方案评审依据，并确认接口风险关闭责任人。相关材料已放入项目共享空间。',
    createdAt: '今天 09:46',
  }]

  if (conversation.id === 'a2a-group-notice-year-plan') return [{
    ...baseMessage,
    id: 'a2a-seed-group-notice',
    content: '年度重点工作安排已经更新，请大家按最新版本执行。',
    createdAt: '周一 09:10',
  }]

  if (conversation.id !== 'a2a-group-collaboration-product-review') return []
  return [
    {
      ...baseMessage,
      id: 'a2a-seed-group-host',
      roundId: 'round-group-1',
      content: '请从质量和总体方案两个角度判断当前方案最需要补充的内容。',
      createdAt: '昨天 14:23',
    },
    {
      id: 'a2a-seed-group-chen',
      conversationId: conversation.id,
      roundId: 'round-group-1',
      actorUserId: 'user-chen-gong',
      actorName: '陈工',
      origin: 'participant_twin',
      content: '从质量角度看，需要补充关键材料的符合性验证范围，并明确异常项的关闭责任人。',
      sequence: 2,
      createdAt: '昨天 14:24',
    },
    {
      id: 'a2a-seed-group-liu',
      conversationId: conversation.id,
      roundId: 'round-group-1',
      actorUserId: 'user-liu-gong',
      actorName: '刘工',
      origin: 'participant_twin',
      content: '在陈工意见基础上，总体方案还应补充接口变更对上下游专业的影响矩阵，避免评审后再次返工。',
      sequence: 3,
      createdAt: '昨天 14:25',
    },
  ]
}

export const fileSize = (content: string) => `${(new Blob([content]).size / 1024).toFixed(1)} KB`
