export type AssistantNotificationKind = 'a2a' | 'automation'
export type AssistantNotificationStatus = 'unread' | 'read' | 'processing' | 'handled'

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

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

function daysAgo(days: number, hour: number, minute: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

export function createSeedNotifications(): AssistantNotification[] {
  return [
    {
      id: 'notification-a2a-risk-review',
      kind: 'a2a',
      title: '王工催问发动机风险评审进展',
      summary: '请同步材料整理进度；如存在风险，请一并说明预计完成时间。',
      source: '王工的数字分身',
      project: 'C929 总体方案项目',
      receivedAt: minutesAgo(8),
      status: 'unread',
      result: {
        eyebrow: 'A2A 协作消息',
        overview: '王工希望在本次评审材料定稿前，确认当前整理进度和仍需关注的风险。该消息已完整送达，但尚未进入助理长会话。',
        sections: [
          {
            heading: '对方关注事项',
            items: ['当前已经完成的材料范围', '尚未闭环的风险及影响', '评审材料预计完成时间'],
          },
          {
            heading: '关联上下文',
            items: ['任务：发动机风险评审材料整理', '计划完成：7月24日 18:00', '来源：C929 总体方案项目'],
          },
        ],
        conclusion: '当前仅展示消息内容。需要结合长会话生成回复时，请在左侧悬浮该消息并点击“处理”。',
      },
    },
    {
      id: 'notification-automation-daily-brief',
      kind: 'automation',
      title: '每日协作简报已生成',
      summary: '今日新增 3 项协作事项，其中 2 项待回复。',
      source: '每日协作简报',
      receivedAt: minutesAgo(36),
      status: 'unread',
      result: {
        eyebrow: '自动化执行结果',
        overview: '每日协作简报已完成生成。本次共扫描 7 项协作任务，识别出 3 项今日新增事项和 2 项待回复事项。',
        sections: [
          {
            heading: '今日新增',
            items: ['发动机风险评审材料整理', '航电接口测试问题复核', '供应商质量问题清单闭环'],
          },
          {
            heading: '建议关注',
            items: ['供应商质量问题清单仍有 2 项待确认', '发动机风险评审任务需要同步预计完成时间'],
          },
        ],
        conclusion: '简报结果已保存。若需要继续汇总、生成回复或安排后续动作，请从左侧点击“处理”。',
      },
    },
    {
      id: 'notification-a2a-avionics',
      kind: 'a2a',
      title: '张三返回航电接口复核结果',
      summary: '5 项异常记录已经复核，建议将其中 2 项纳入下一轮回归测试。',
      source: '张三的数字分身',
      project: 'C929 航电集成验证',
      receivedAt: daysAgo(1, 16, 42),
      status: 'read',
      result: {
        eyebrow: 'A2A 任务反馈',
        overview: '张三已完成 5 项航电接口异常记录复核，并返回了回归测试范围建议。',
        sections: [
          {
            heading: '复核结论',
            items: ['2 项异常建议纳入下一轮回归测试', '2 项属于记录口径问题，可直接修订', '1 项需要等待供应商补充日志'],
          },
          {
            heading: '建议下一步',
            items: ['确认回归测试负责人和窗口', '向供应商催收缺失日志', '更新接口问题清单状态'],
          },
        ],
        conclusion: '该结果尚未进入助理长会话，可通过左侧“处理”继续安排下一步。',
      },
    },
    {
      id: 'notification-automation-quality',
      kind: 'automation',
      title: '供应商质量问题检查完成',
      summary: '仍有 2 项问题未闭环，自动催办已按计划发送。',
      source: '供应商问题自动巡检',
      receivedAt: daysAgo(2, 9, 0),
      status: 'handled',
      result: {
        eyebrow: '自动化执行结果',
        overview: '供应商质量问题自动巡检已完成，发现 2 项问题仍未闭环，并已按既定规则发送催办。',
        sections: [
          {
            heading: '执行结果',
            items: ['扫描问题记录 5 项', '已闭环 3 项', '待供应商确认 2 项', '催办发送成功 1 次'],
          },
        ],
        conclusion: '该通知已在助理长会话中处理完成。',
      },
    },
  ]
}

export function createIncomingReminderNotification(): AssistantNotification {
  return {
    id: `notification-live-a2a-${Date.now()}`,
    kind: 'a2a',
    title: '收到发动机风险评审进展催办',
    summary: '王工询问当前材料整理进展，希望同步已完成内容、剩余风险和预计完成时间。',
    source: '王工的数字分身',
    project: 'C929 总体方案项目',
    receivedAt: new Date().toISOString(),
    status: 'unread',
    result: {
      eyebrow: '实时 A2A 协作消息',
      overview: '助理执行长任务期间，王工的数字分身发来进展催办。消息已经独立接收，不影响当前模型输出。',
      sections: [
        {
          heading: '请求内容',
          items: ['同步已经完成的材料内容', '说明尚未解决的风险', '给出预计完成时间'],
        },
        {
          heading: '接收状态',
          items: ['消息已写入通知中心', '当前长 Session 未被打断', '等待用户主动选择是否带回会话'],
        },
      ],
      conclusion: '你可以立即查看该结果；长 Session 输出结束后，才可以从左侧点击“处理”。',
    },
  }
}

export function notificationKindLabel(kind: AssistantNotificationKind) {
  return kind === 'a2a' ? 'A2A 消息' : '定时任务'
}
