export type SubagentRunStatus = 'running' | 'success' | 'failed'
export type SubagentStepStatus = 'waiting' | 'running' | 'success' | 'failed'

export type SubagentStepKind = 'think' | 'tool' | 'wait' | 'result' | 'output' | 'error'

export type SubagentStep = {
  id: string
  kind: SubagentStepKind
  label: string
  detail: string
  status: SubagentStepStatus
}

export type SubagentWorker = {
  id: string
  name: string
  role: string
  description: string
  initials: string
  tone: 'blue' | 'violet' | 'cyan'
  status: SubagentRunStatus
  steps: SubagentStep[]
  outputTitle: string
  output: string[]
  error?: {
    code: string
    message: string
  }
}

export type SubagentRun = {
  id: string
  prompt: string
  title: string
  status: SubagentRunStatus
  startedAt: number
  completedAt?: number
  mainAgent: {
    id: 'main'
    name: string
    role: string
    status: SubagentRunStatus
  }
  agents: SubagentWorker[]
}

export type SubagentScheduleEvent = {
  at: number
  agentId: string
  stepIndex: number
  stepStatus: SubagentStepStatus
  agentStatus?: SubagentRunStatus
}

const successAgents: Omit<SubagentWorker, 'status'>[] = [
  {
    id: 'data-analyst',
    name: '数据分析员',
    role: '提取关键指标',
    description: '读取客户支援数据，识别效率、响应时长与问题闭环情况。',
    initials: '数',
    tone: 'blue',
    steps: [
      { id: 'data-plan', kind: 'think', label: '整理分析口径', detail: '识别任务范围，确定响应时长、一次解决率和积压问题三个分析维度。', status: 'running' },
      { id: 'data-tool', kind: 'tool', label: '读取客户支援数据', detail: '调用数据分析工具，汇总 2026 年上半年客户支援记录。', status: 'waiting' },
      { id: 'data-result', kind: 'result', label: '完成指标计算', detail: '完成关键指标计算，并标记异常波动区间。', status: 'waiting' },
      { id: 'data-output', kind: 'output', label: '提交数据结论', detail: '将结构化指标与结论返回给主 Agent。', status: 'waiting' },
    ],
    outputTitle: '关键指标摘要',
    output: ['平均首次响应时长较上期缩短 18%', '一次解决率为 76%，仍有提升空间', '高频积压集中在航材与远程诊断环节'],
  },
  {
    id: 'insight-analyst',
    name: '问题洞察员',
    role: '归纳问题与原因',
    description: '分析支援记录中的高频问题、客户反馈与主要成因。',
    initials: '察',
    tone: 'violet',
    steps: [
      { id: 'insight-plan', kind: 'think', label: '拆解问题类型', detail: '将反馈按运行保障、航材、培训和技术支持进行归类。', status: 'running' },
      { id: 'insight-search', kind: 'tool', label: '检索服务记录', detail: '检索高频问题、重复报修和低满意度记录。', status: 'waiting' },
      { id: 'insight-wait', kind: 'wait', label: '等待记录聚合', detail: '正在合并不同渠道的反馈并去除重复项。', status: 'waiting' },
      { id: 'insight-result', kind: 'output', label: '提交问题洞察', detail: '将问题优先级与原因判断返回给主 Agent。', status: 'waiting' },
    ],
    outputTitle: '问题洞察',
    output: ['航材到位时间是影响闭环效率的首要因素', '远程诊断知识复用不足导致重复排查', '重点客户希望获得更稳定的进度同步'],
  },
  {
    id: 'strategy-writer',
    name: '方案策划员',
    role: '形成改进建议',
    description: '结合数据和业务约束，形成可执行的优化建议。',
    initials: '策',
    tone: 'cyan',
    steps: [
      { id: 'strategy-plan', kind: 'think', label: '建立建议框架', detail: '按近期改进、机制优化和长期能力建设组织建议。', status: 'running' },
      { id: 'strategy-tool', kind: 'tool', label: '匹配业务知识', detail: '调用知识检索工具，匹配现有服务规范与可复用方案。', status: 'waiting' },
      { id: 'strategy-result', kind: 'result', label: '评估建议优先级', detail: '根据收益、成本和实施周期完成优先级排序。', status: 'waiting' },
      { id: 'strategy-output', kind: 'output', label: '提交改进建议', detail: '将建议清单与实施顺序返回给主 Agent。', status: 'waiting' },
    ],
    outputTitle: '改进建议',
    output: ['建立重点问题 2 小时内首次响应机制', '沉淀远程诊断知识模板并按机队复用', '对航材高频短缺项建立预测性保障清单'],
  },
]

function cloneAgent(agent: Omit<SubagentWorker, 'status'>): SubagentWorker {
  return {
    ...agent,
    status: 'running',
    steps: agent.steps.map((step) => ({ ...step })),
    output: [...agent.output],
  }
}

export function createSubagentRun(prompt: string): SubagentRun {
  return {
    id: `subagent-run-${Date.now()}`,
    prompt,
    title: '客户支援运营分析',
    status: 'running',
    startedAt: Date.now(),
    mainAgent: {
      id: 'main',
      name: '我的助理',
      role: '任务统筹',
      status: 'running',
    },
    agents: successAgents.map(cloneAgent),
  }
}

export function createSubagentSchedule(shouldFail: boolean): SubagentScheduleEvent[] {
  const shared: SubagentScheduleEvent[] = [
    { at: 850, agentId: 'data-analyst', stepIndex: 0, stepStatus: 'success' },
    { at: 850, agentId: 'data-analyst', stepIndex: 1, stepStatus: 'running' },
    { at: 1150, agentId: 'insight-analyst', stepIndex: 0, stepStatus: 'success' },
    { at: 1150, agentId: 'insight-analyst', stepIndex: 1, stepStatus: 'running' },
    { at: 1450, agentId: 'strategy-writer', stepIndex: 0, stepStatus: 'success' },
    { at: 1450, agentId: 'strategy-writer', stepIndex: 1, stepStatus: 'running' },
    { at: 2200, agentId: 'data-analyst', stepIndex: 1, stepStatus: 'success' },
    { at: 2200, agentId: 'data-analyst', stepIndex: 2, stepStatus: 'running' },
    { at: 2800, agentId: 'insight-analyst', stepIndex: 1, stepStatus: 'success' },
    { at: 2800, agentId: 'insight-analyst', stepIndex: 2, stepStatus: 'running' },
    { at: 3400, agentId: 'strategy-writer', stepIndex: 1, stepStatus: 'success' },
    { at: 3400, agentId: 'strategy-writer', stepIndex: 2, stepStatus: 'running' },
    { at: 3900, agentId: 'data-analyst', stepIndex: 2, stepStatus: 'success' },
    { at: 3900, agentId: 'data-analyst', stepIndex: 3, stepStatus: 'running' },
    { at: 4550, agentId: 'data-analyst', stepIndex: 3, stepStatus: 'success', agentStatus: 'success' },
    { at: 4700, agentId: 'insight-analyst', stepIndex: 2, stepStatus: 'success' },
    { at: 4700, agentId: 'insight-analyst', stepIndex: 3, stepStatus: 'running' },
    { at: 5350, agentId: 'insight-analyst', stepIndex: 3, stepStatus: 'success', agentStatus: 'success' },
  ]

  if (shouldFail) {
    return [
      ...shared,
      { at: 5200, agentId: 'strategy-writer', stepIndex: 2, stepStatus: 'failed', agentStatus: 'failed' },
    ]
  }

  return [
    ...shared,
    { at: 5200, agentId: 'strategy-writer', stepIndex: 2, stepStatus: 'success' },
    { at: 5200, agentId: 'strategy-writer', stepIndex: 3, stepStatus: 'running' },
    { at: 6100, agentId: 'strategy-writer', stepIndex: 3, stepStatus: 'success', agentStatus: 'success' },
  ]
}

export function applySubagentScheduleEvent(
  run: SubagentRun,
  event: SubagentScheduleEvent,
  shouldFail: boolean,
): SubagentRun {
  return {
    ...run,
    agents: run.agents.map((agent) => {
      if (agent.id !== event.agentId) return agent
      const failed = event.agentStatus === 'failed'
      return {
        ...agent,
        status: event.agentStatus ?? agent.status,
        steps: agent.steps.map((step, index) => index === event.stepIndex
          ? {
              ...step,
              status: event.stepStatus,
              kind: failed ? 'error' : step.kind,
              label: failed ? '知识服务响应超时' : step.label,
              detail: failed ? '多次等待知识服务返回仍未获得结果，本次子任务已结束。' : step.detail,
            }
          : step),
        error: failed && shouldFail
          ? { code: 'KNOWLEDGE_TIMEOUT', message: '知识服务响应超时，未能形成改进建议。' }
          : agent.error,
      }
    }),
  }
}

export function finishSubagentRun(run: SubagentRun, failed: boolean): SubagentRun {
  return {
    ...run,
    status: failed ? 'failed' : 'success',
    completedAt: Date.now(),
    mainAgent: {
      ...run.mainAgent,
      status: failed ? 'failed' : 'success',
    },
  }
}
