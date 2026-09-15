import { knownA2AMembers, type A2AConversation, type A2AConversationMessage, type A2AConversationMember } from '../assistant/a2aConversationTypes'

export type ProjectTask = {
  id: string; title: string; owner: string; due: string; priority: '高' | '中';
  initialStatus: 'pending' | 'progress' | 'completed'; goal: string;
  members?: A2AConversationMember[]; memberIndexes: number[]; replies: string[]; result: string;
}
export type Project = { id: string; title: string; description: string; tone: 'blue' | 'violet' | 'orange' | 'green'; tasks: ProjectTask[] }
export const projects: Project[] = [
  { id: 'ipt', title: 'IPT', description: '围绕年度目标与重点建设任务，协同推进计划落实。', tone: 'blue', tasks: [
    { id: 'ipt-annual-2026', title: '完成工程总体办年度任务（2026）', owner: '陈帅', due: '12月31日', priority: '中', initialStatus: 'pending', memberIndexes: [], goal: '', replies: [], result: '' },
    { id: 'ipt-intelligence-2026', title: '完成26年生产链式智能建设', owner: '陈帅', due: '12月31日', priority: '高', initialStatus: 'progress', memberIndexes: [],
      members: [
        { userId: 'user-chen-shuai', name: '陈帅', department: '工程总体办', color: 'blue' },
        { userId: 'user-liu-juan', name: '刘娟', department: '生产协同组', color: 'purple' },
        { userId: 'user-wang-lei', name: '王磊', department: '平台技术组', color: 'green' },
      ],
      goal: '围绕2026年生产链式智能建设，明确试点场景、数据衔接与阶段交付安排，协同推进生产任务全链路贯通。',
      replies: [
        '已整理本年度建设范围，先以“生产计划—物料齐套—工位执行—异常反馈”为试点链路。本周完成场景清单和责任分工，下周开展联调；我负责汇总工程总体办的验收要求。',
        '收到陈帅的安排。生产侧已梳理两个试点工位，计划变更和缺件反馈是优先场景。我会在周四前补齐任务流转样例，重点核对异常能否回传到责任岗位，避免只展示状态、没有后续处理。',
        '根据刘娟提供的场景，平台侧已完成任务与物料数据字段映射，A2A协作将关联同一任务编号。周五前提供联调环境，先验证缺件发现、供应协同、到料确认这条闭环，并记录每一步的处理结果。',
      ],
      result: '阶段安排已对齐：陈帅汇总建设与验收清单，刘娟补齐试点工位样例，王磊准备联调环境。下一步开展缺件协同闭环验证，持续跟踪数据完整性与任务流转结果。',
    },
  ] },
  { id: 'supply', title: '供应链', description: '协同供应商交付、替代物料与到货检验，保障齐套。', tone: 'violet', tasks: [
    { id: 'supply-alternative', title: '替代紧固件齐套确认', owner: '王五', due: '9月15日', priority: '中', initialStatus: 'pending', memberIndexes: [1,3,2], goal: '评估替代紧固件能否用于当前批次，形成规格核对、适用范围和检验要求。', replies: ['原规格紧固件缺 80 件，候选替代件库存充足；王五提供材料牌号、规格和供应商合格证明。','对照采购资料，尺寸相同但表面处理不同，刘工要求先完成适用性评估，暂不能直接替换。','承接设计意见，陈工安排涂层与防腐资料核查；批准记录和检验结论齐备后才可办理入库放行。'], result: '替代评估清单：王五补齐证明，刘工确认适用性，陈工完成检验；批准前保持原料号受控。' },
    { id: 'supply-delay', title: '关键供应商交付延期处置', owner: '王五', due: '9月12日', priority: '高', initialStatus: 'progress', memberIndexes: [1,0,2], goal: '处置液压支架供应商延期两天的风险，明确分批交付与生产调整方案。', replies: ['供应商热处理工序延误两天。可将首批 12 件提前至明晚发运，其余 18 件后天补齐，王五负责跟踪。','首批 12 件能覆盖 A 工位需求；李四将 B 工位支架安装后移一天，其他已具备条件的作业继续。','按分批交付安排，两批都须独立提供热处理报告；陈工分别检验，不能以首批结论替代第二批放行。'], result: '延期处置方案：首批 12 件保障 A 工位，余下 18 件后天补齐；王五跟踪交付、李四调整 B 工位、陈工分批检验。' },
    { id: 'supply-receipt', title: '到货批次证书补齐', owner: '王五', due: '9月10日', priority: '中', initialStatus: 'completed', memberIndexes: [1,2], goal: '补齐两批密封件的合格证与批次追溯资料，完成受控入库。', replies: ['已收到供应商补发的两批合格证，批号分别与箱单和实物标签一致。','已核验合格证、批次及有效期，两批密封件检验合格，入库记录已关联证书。'], result: '两批密封件证书核验完成，追溯资料与入库记录关联，受控入库完成。' },
  ] },

]
export const conversationIdFor = (task: ProjectTask) => `project-a2a-${task.id}`
export function taskStatus(task: ProjectTask, conversation?: A2AConversation): ProjectTask['initialStatus'] {
  if (!conversation) return task.initialStatus
  if (conversation.status === 'completed') return 'completed'
  if (conversation.status === 'delivered' || conversation.pendingCurrentUserConfirmation?.id === `start-${task.id}`) return 'pending'
  return 'progress'
}
export const projectConversations: A2AConversation[] = projects.flatMap(project => project.tasks.map(task => {
  const id = conversationIdFor(task)
  const members = task.members ?? task.memberIndexes.map(index => knownA2AMembers[index])
  const pending = task.initialStatus === 'pending', done = task.initialStatus === 'completed'
  const messages: A2AConversationMessage[] = pending ? [] : [
    { id: `${id}-goal`, conversationId: id, actorUserId: 'current-user', actorName: '张三', origin: 'initiator_twin', content: task.goal, sequence: 1, createdAt: '09:00' },
    ...members.map((member, i) => ({ id: `${id}-reply-${i}`, conversationId: id, actorUserId: member.userId, actorName: member.name, origin: 'participant_twin' as const, content: task.replies[i], sequence: i + 2, createdAt: `09:0${i+1}` })),
    ...(done ? [{ id: `${id}-result`, conversationId: id, actorUserId: 'current-user', actorName: '张三', origin: 'initiator_twin' as const, content: task.result, sequence: members.length + 2, createdAt: '09:10' }] : []),
  ]
  return {
    id, title: task.title, scope: 'group', mechanism: 'collaboration', status: done ? 'completed' : 'waiting_user_confirmation',
    hostUserId: 'current-user', hostName: '张三', perspective: 'initiator', members, speakingOrder: members.map(m => m.userId),
    goal: task.goal, round: 1, expectedReplyCount: members.length, repliedCount: pending ? 0 : members.length,
    createdAt: '9月11日 09:00', updatedAt: done ? '已归档' : '今天', preview: pending ? '待确认启动协作' : done ? task.result : '各岗位意见已收齐，待确认处置方案',
    demo: { messages, replies: Object.fromEntries(members.map((m,i) => [m.userId, task.replies[i]])), completionSummary: task.result },
    pendingCurrentUserConfirmation: done ? undefined : {
      id: pending ? `start-${task.id}` : `review-${task.id}`, question: pending ? `开始“${task.title}”协作？` : '确认本次处置方案并完成协作？', description: pending ? task.goal : task.result,
      resumeStatus: pending ? 'delivered' : 'response_received', resumePreview: pending ? '待开始' : '意见已收齐',
      choices: pending ? [{ id: 'start', label: '开始协作', description: '由你的分身发起，参与分身按顺序反馈。', commandAction: 'send', commandContent: task.goal }] : [
        { id: 'complete', label: '确认方案并完成', description: '记录处置方案及责任分工，完成本次协作。', commandAction: 'complete', commandContent: task.result },
        { id: 'continue', label: '继续核对', description: '请各岗位再次核对约束与交付安排。', commandAction: 'send', commandContent: `请再次核对：${task.goal}` },
      ],
    },
  } satisfies A2AConversation
}))
