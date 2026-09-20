import { knownA2AMembers, type A2AConversation, type A2AConversationMessage, type A2AConversationMember } from '../assistant/a2aConversationTypes'

import { supplyTasks } from './supplyScenarios'

export type ProjectTask = {
  id: string; title: string; owner: string; initiator?: string; observerHostId?: string; due: string; priority: '高' | '中';
  initialStatus: 'pending' | 'progress' | 'completed'; goal: string;
  members?: A2AConversationMember[]; memberIndexes: number[]; replies: string[]; result: string;
}
export type Project = { id: string; title: string; description: string; tone: 'blue' | 'violet' | 'orange' | 'green'; tasks: ProjectTask[] }
export const projects: Project[] = [
  { id: 'ipt', title: 'IPT', description: '围绕年度目标与重点建设任务，协同推进计划落实。', tone: 'blue', tasks: [
    { id: 'ipt-annual-2026', title: '完成工程总体办年度任务（2026）', owner: '陈智超', due: '2026年12月31日', priority: '中', initialStatus: 'pending', memberIndexes: [],
      members: [
        { userId: 'user-zhong-anjun', name: '钟岸君', department: '工程总体办', color: 'blue' },
        { userId: 'user-wu-qian', name: '吴茜', department: '工程总体办', color: 'purple' },
      ],
      goal: '今年要完成工程总体办2026年度任务，请钟岸君、吴茜先梳理年度目标、重点工作和里程碑，明确责任分工，形成任务分解方案后一起确认。',
      replies: ['收到。我先汇总年度重点工作和项目节点，整理各项任务的责任人、交付要求与时间安排，提交任务分解清单。', '收到。我配合核对年度目标与验收口径，补齐跨部门协同事项和资料清单，方案确认后再按计划推进。'],
      result: '年度任务分解与准备事项已对齐，待确认计划后启动。',
    },
    { id: 'ipt-intelligence-2026', title: '系统智能和场景智能团队年度任务', owner: '汪顺利', due: '2026年12月31日', priority: '高', initialStatus: 'progress', memberIndexes: [],
      members: [
        { userId: 'user-yuan-qi', name: '袁琦', department: '系统智能团队', color: 'blue' },
        { userId: 'user-chen-shuai', name: '陈帅', department: '工程总体办', color: 'blue' },
        { userId: 'user-liu-juan', name: '刘娟', department: '生产协同组', color: 'purple' },
        { userId: 'user-wang-lei', name: '王磊', department: '平台技术组', color: 'green' },
      ],
      goal: '系统智能和场景智能团队年度任务按既定计划推进。我负责统筹整体进度，请大家同步系统能力建设、场景落地及联调情况，重点说明当前风险与下一步安排。',
      replies: [
        '系统智能侧已完成项目任务、岗位能力和协作链路的第一轮梳理。本周重点核对任务状态与数据口径，下周结合场景团队样例验证跨岗位协同。',
        '年度建设范围与验收清单正在逐项对齐。我会汇总各场景的阶段交付物，明确责任人与验收依据，周五前提交阶段检查清单。',
        '场景侧先推进生产计划、物料齐套和异常反馈两个试点工位的验证。任务流转样例已准备，正在补充缺件异常回传和责任岗位确认记录。',
        '平台侧已完成任务与物料字段映射，联调环境可用。下一步联通缺件发现、供应协同、到料确认链路，并将验证问题统一回传给袁琦跟踪。',
      ],
      result: '汪顺利统筹年度进度，袁琦跟踪系统能力与联调问题，陈帅核对验收清单，刘娟推进场景验证，王磊保障平台联调。',
    },
    { id: 'ipt-annual-2025', title: '完成工程总体办年度任务（2025）', owner: '陈智超', due: '2025年12月31日', priority: '中', initialStatus: 'completed', memberIndexes: [],
      members: [
        { userId: 'user-zhong-anjun', name: '钟岸君', department: '工程总体办', color: 'blue' },
        { userId: 'user-wu-qian', name: '吴茜', department: '工程总体办', color: 'purple' },
      ],
      goal: '今年要完成工程总体办2025年度任务，请钟岸君、吴茜梳理年度目标和重点工作，明确责任分工，按里程碑推进并及时反馈。',
      replies: ['收到。年度任务已按分工推进完成，重点工作及里程碑逐项核对，交付资料已整理归档。', '收到。年度目标与验收材料已完成复核，跨部门协同事项均已闭环，年度总结和资料清单已汇总。'],
      result: '2025年度任务已完成，交付与验收资料齐备，请保留总结及经验记录，作为下一年度工作的参考。',
    },
  ] },
  { id: 'supply', title: '供应链', description: '协同供应商交付、替代物料与到货检验，保障齐套。', tone: 'violet', tasks: [
    ...supplyTasks,
  ] },

]
export const conversationIdFor = (task: ProjectTask) => `project-a2a-${task.id}`
export function taskStatus(task: ProjectTask, conversation?: A2AConversation): ProjectTask['initialStatus'] {
  if (task.id.startsWith('ipt-')) return task.initialStatus
  if (!conversation) return task.initialStatus
  if (conversation.status === 'completed') return 'completed'
  if (conversation.status === 'delivered' || conversation.pendingCurrentUserConfirmation?.id === `start-${task.id}`) return 'pending'
  return 'progress'
}
export const projectConversations: A2AConversation[] = projects.flatMap(project => project.tasks.map(task => {
  const id = conversationIdFor(task)
  const members = task.members ?? task.memberIndexes.map(index => knownA2AMembers[index])
  const pending = task.initialStatus === 'pending', done = task.initialStatus === 'completed'
  if (project.id === 'ipt') {
    const observer = task.initialStatus === 'progress';
    const hostUserId = observer ? 'user-wang-shunli' : 'current-user';
    const hostName = observer ? '汪顺利' : '陈智超';
    const messages: A2AConversationMessage[] = [
      { id: `${id}-goal`, conversationId: id, actorUserId: hostUserId, actorName: hostName, origin: 'initiator_twin', content: task.goal, sequence: 1, createdAt: '09:00' },
      ...members.map((member, i) => ({ id: `${id}-reply-${i}`, conversationId: id, actorUserId: member.userId, actorName: member.name, origin: 'participant_twin' as const, content: task.replies[i], sequence: i + 2, createdAt: `09:0${i + 1}` })),
      ...(done ? [{ id: `${id}-result`, conversationId: id, actorUserId: hostUserId, actorName: hostName, origin: 'initiator_twin' as const, content: task.result, sequence: members.length + 2, createdAt: '09:10' }] : []),
    ];
    return { id, title: task.title, scope: 'group', mechanism: 'collaboration', status: done ? 'completed' : pending ? 'delivered' : 'response_received', hostUserId, hostName, perspective: observer ? 'recipient' : 'initiator', members: observer ? [...members, { userId: 'current-user', name: '陈智超', department: '公司总经理 · 仅查看', color: 'blue' }] : members, speakingOrder: members.map(member => member.userId), goal: task.goal, round: 1, expectedReplyCount: members.length, repliedCount: members.length, createdAt: done ? '2025年12月31日 09:00' : '2026年9月16日 09:00', updatedAt: done ? '已归档' : '今天', preview: task.result, demo: { messages, replies: Object.fromEntries(members.map((member, i) => [member.userId, task.replies[i]])), completionSummary: task.result, readOnly: true, privateMessages: pending ? [
      { role: 'user', content: '今年工程总体办的年度任务先组织起来，请钟岸君和吴茜把目标、分工和里程碑梳理清楚。' },
      { role: 'assistant', content: '好的，我已在协作中传达年度任务要求。钟岸君负责汇总重点工作和项目节点，吴茜配合核对目标、验收口径及跨部门协同事项。' },
      { role: 'user', content: '他们目前怎么反馈的？先不要直接启动，等任务分解方案出来我看一下。' },
      { role: 'assistant', content: '两人均已回复收到：钟岸君将整理任务分解清单，吴茜将补齐验收要求和资料清单。目前处于准备阶段，任务仍保持待开始。' },
      { role: 'user', content: '汇总时重点列出责任人、完成时间，以及需要我协调的资源和风险。' },
      { role: 'assistant', content: '明白。后续汇总按“年度目标—重点任务—责任人—里程碑—资源与风险”组织，方案提交后由你确认，再推进启动。' },
    ] : undefined } } satisfies A2AConversation;
  }

  const observer = Boolean(task.observerHostId)
  const hostUserId = task.observerHostId ?? 'current-user'
  const messages: A2AConversationMessage[] = pending ? [] : [
    { id: `${id}-goal`, conversationId: id, actorUserId: hostUserId, actorName: task.initiator ?? '张三', origin: 'initiator_twin', content: task.goal, sequence: 1, createdAt: '09:00' },
    ...members.map((member, i) => ({ id: `${id}-reply-${i}`, conversationId: id, actorUserId: member.userId, actorName: member.name, origin: 'participant_twin' as const, content: task.replies[i], sequence: i + 2, createdAt: `09:0${i+1}` })),
    ...(done ? [{ id: `${id}-result`, conversationId: id, actorUserId: hostUserId, actorName: task.initiator ?? '张三', origin: 'initiator_twin' as const, content: task.result, sequence: members.length + 2, createdAt: '09:10' }] : []),
  ]
  return {
    id, title: task.title, scope: 'group', mechanism: 'collaboration', status: done ? 'completed' : observer ? 'response_received' : 'waiting_user_confirmation',
    hostUserId, hostName: task.initiator ?? '张三', perspective: observer ? 'recipient' : 'initiator', members, speakingOrder: members.map(m => m.userId),
    goal: task.goal, round: 1, expectedReplyCount: members.length, repliedCount: pending ? 0 : members.length,
    createdAt: task.id === 'supply-purchase-risk' ? '2026年9月17日 09:30' : '9月11日 09:00', updatedAt: done ? '已归档' : '今天', preview: observer ? task.result : pending ? '待确认启动协作' : done ? task.result : '各岗位意见已收齐，待确认处置方案',
    demo: { readOnly: observer, messages, replies: Object.fromEntries(members.map((m,i) => [m.userId, task.replies[i]])), completionSummary: task.result },
    pendingCurrentUserConfirmation: done || observer ? undefined : {
      id: pending ? `start-${task.id}` : `review-${task.id}`, question: pending ? `开始“${task.title}”协作？` : '确认本次处置方案并完成协作？', description: pending ? task.goal : task.result,
      resumeStatus: pending ? 'delivered' : 'response_received', resumePreview: pending ? '待开始' : '意见已收齐',
      choices: pending ? [{ id: 'start', label: '开始协作', description: '由你的分身发起，参与分身按顺序反馈。', commandAction: 'send', commandContent: task.goal }] : [
        { id: 'complete', label: '确认方案并完成', description: '记录处置方案及责任分工，完成本次协作。', commandAction: 'complete', commandContent: task.result },
        { id: 'continue', label: '继续核对', description: '请各岗位再次核对约束与交付安排。', commandAction: 'send', commandContent: `请再次核对：${task.goal}` },
      ],
    },
  } satisfies A2AConversation
}))
