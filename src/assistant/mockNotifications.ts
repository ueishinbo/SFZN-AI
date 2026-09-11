export type AssistantNotificationKind = 'a2a' | 'automation'
export type AssistantNotificationStatus = 'unread' | 'read'

export type AssistantNotification = {
  id: string
  kind: AssistantNotificationKind
  title: string
  summary: string
  source: string
  project?: string
  receivedAt: string
  status: AssistantNotificationStatus
  result: {
    eyebrow: string
    overview: string
    sections: Array<{
      heading: string
      items: string[]
    }>
    conclusion?: string
  }
}

// 通知中心只保存助理堵塞期间的临时队列，助理空闲时不保留历史消息。
export function createSeedNotifications(): AssistantNotification[] {
  return []
}

export function createIncomingReminderNotification(): AssistantNotification {
  return {
    id: `notification-live-a2a-${Date.now()}`,
    kind: 'a2a',
    title: '收到发动机风险评审进展催办',
    summary: '王工询问当前材料整理进展，希望同步已完成内容、剩余风险和预计完成时间。',
    source: '王工的助理',
    project: 'C929 总体方案项目',
    receivedAt: new Date().toISOString(),
    status: 'unread',
    result: {
      eyebrow: '实时 A2A 协作消息',
      overview: '助理执行长任务期间，王工的助理发来进展催办。消息已经独立接收，不影响当前模型输出。',
      sections: [
        {
          heading: '请求内容',
          items: ['同步已经完成的材料内容', '说明尚未解决的风险', '给出预计完成时间'],
        },
        {
          heading: '接收状态',
          items: ['消息已进入堵塞缓冲队列', '当前长 Session 未被打断', '助理恢复空闲后将按先进先出顺序自动投递'],
        },
      ],
      conclusion: '当前可以只读查看完整内容；助理恢复空闲后，系统会自动将该消息推入长 Session 并从通知中心移除。',
    },
  }
}

export function createIncomingAutomationNotification(): AssistantNotification {
  return {
    id: `notification-live-automation-${Date.now()}`,
    kind: 'automation',
    title: '每日协作简报已生成',
    summary: '今日新增 3 项协作事项，其中 2 项需要后续关注。',
    source: '每日协作简报',
    receivedAt: new Date().toISOString(),
    status: 'unread',
    result: {
      eyebrow: '自动化执行结果',
      overview: '每日协作简报已经生成。由于助理正在执行长任务，本次结果先进入消息通知缓冲队列。',
      sections: [
        {
          heading: '今日新增',
          items: ['发动机风险评审材料整理', '航电接口测试问题复核', '供应商质量问题清单闭环'],
        },
        {
          heading: '队列规则',
          items: ['按收到时间排在 A2A 催办之后', '助理空闲时自动进入长 Session', '成功投递后从通知中心删除'],
        },
      ],
      conclusion: '这是普通结果通知，自动进入长 Session 后不会触发新一轮模型堵塞。',
    },
  }
}

export function createA2ACollaborationResponseNotification(options: {
  conversationTitle: string
  memberNames: string[]
  round: number
}): AssistantNotification {
  const participantText = options.memberNames.join('、')
  return {
    id: `notification-a2a-conversation-${Date.now()}`,
    kind: 'a2a',
    title: `“${options.conversationTitle}”收到本轮回复`,
    summary: `${participantText}的数字分身已经完成第 ${options.round} 轮回复，可以判断目标是否完成或继续发起下一轮。`,
    source: 'A2A 目标协作',
    receivedAt: new Date().toISOString(),
    status: 'unread',
    result: {
      eyebrow: '目标协作回调',
      overview: `“${options.conversationTitle}”已收到全部预期回复。系统只汇总结果，不会自动关闭目标或发起下一轮。`,
      sections: [
        { heading: '本轮参与人', items: options.memberNames },
        { heading: '可继续处理', items: ['确认目标已经完成', '通过我的助理补充下一轮问题', '调整目标或参与人'] },
      ],
      conclusion: '请在“我的助理”中描述下一步；会话记录页保持只读。',
    },
  }
}

export function notificationKindLabel(kind: AssistantNotificationKind) {
  return kind === 'a2a' ? 'A2A 消息' : '定时任务'
}
