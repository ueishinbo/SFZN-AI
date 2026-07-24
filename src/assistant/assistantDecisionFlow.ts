import type { CollaborationItem } from './mockCollaboration'

export type AssistantDecision =
  | {
      id: string
      kind: 'dispatch'
      title: string
      description: string
      dueAt: string
      priority: CollaborationItem['priority']
      sourceSystem: string
    }
  | {
      id: string
      kind: 'reminder'
      item: CollaborationItem
      reminderText: string
    }
  | {
      id: string
      kind: 'task_receipt'
      item: CollaborationItem
    }
  | {
      id: string
      kind: 'progress_reply'
      item: CollaborationItem
      reminderText: string
    }
  | {
      id: string
      kind: 'workflow_questions'
      workflow: 'risk_review_planning'
    }

export type DecisionResolution = {
  action: 'dispatch' | 'send_reminder' | 'confirm_receipt' | 'request_adjustment' | 'reply_progress' | 'complete_workflow'
  assignee?: string
  progress?: string
  workflowSummary?: string
}

export type DecisionFieldSource =
  | 'decision_request'
  | 'task_service'
  | 'organization_service'
  | 'workflow_schema'
  | 'user_input'
  | 'client_action_map'
  | 'computed'

export type DecisionAnswer = {
  optionId: string
  label: string
  value: string
}

export type DecisionAnswers = Record<string, DecisionAnswer | undefined>
export type DecisionNotes = Record<string, string | undefined>

export type DecisionOption = {
  id: string
  label: string
  value: string
  description?: string
  source: DecisionFieldSource
}

export type DecisionPerson = {
  id: string
  name: string
  department: string
  role: string
  recommended?: boolean
  source: 'organization_service'
}

export type DecisionReviewRow = {
  label: string
  value: string
  source: DecisionFieldSource
}

type StepCopy = string | ((answers: DecisionAnswers) => string)

export type DecisionControl =
  | {
      type: 'single_select'
      options: DecisionOption[]
      allowOther?: boolean
      note?: {
        label: string
        placeholder: string
        source: 'user_input'
      }
    }
  | {
      type: 'person_select'
      candidates: DecisionPerson[]
      allowSearch: boolean
    }
  | {
      type: 'review'
      rows: DecisionReviewRow[] | ((answers: DecisionAnswers) => DecisionReviewRow[])
      callout?: string
    }

export type DecisionFlowStep = {
  id: string
  title: StepCopy
  description?: StepCopy
  control: DecisionControl
  required?: boolean
  defaultOptionId?: string
  source: DecisionFieldSource
}

export type DecisionFlowSpec = {
  id: string
  purpose: 'clarify' | 'authorize' | 'respond'
  contextLabel: string
  steps: DecisionFlowStep[]
  finalAction: {
    label: string
    icon: 'send' | 'check'
    source: 'client_action_map'
  }
  secondaryAction?: {
    label: string
    resolve: DecisionResolution
  }
  resolve: (answers: DecisionAnswers, notes: DecisionNotes) => DecisionResolution
}

const people: DecisionPerson[] = [
  { id: 'li-jing', name: '李静', department: '动力装置部', role: '项目主管', recommended: true, source: 'organization_service' },
  { id: 'zhang-san', name: '张三', department: '总体技术部', role: '结构工程师', recommended: true, source: 'organization_service' },
  { id: 'wang-lei', name: '王磊', department: '试飞中心', role: '质量工程师', recommended: true, source: 'organization_service' },
  { id: 'chen-chen', name: '陈晨', department: '项目管理部', role: '计划主管', source: 'organization_service' },
  { id: 'liu-yang', name: '刘洋', department: '动力装置部', role: '系统工程师', source: 'organization_service' },
]

const progressOptions: DecisionOption[] = [
  { id: 'on-track', label: '已经开始，预计按期完成', value: '已经开始，预计按期完成', source: 'workflow_schema' },
  { id: 'risk', label: '存在风险，需要协调资源', value: '当前存在延期风险，需要协调资源', source: 'workflow_schema' },
  { id: 'not-started', label: '尚未开始，补充预计启动时间', value: '尚未开始，我会补充预计启动时间', source: 'workflow_schema' },
  { id: 'completed', label: '已经完成，准备提交结果', value: '任务已经完成，正在整理并提交结果', source: 'workflow_schema' },
]

const riskReviewSteps: DecisionFlowStep[] = [
  {
    id: 'review-scope',
    title: '这次专项评审重点覆盖哪些内容？',
    control: {
      type: 'single_select',
      allowOther: true,
      options: [
        { id: 'high-risk', label: '高风险与临期事项（推荐）', value: '高风险与临期事项', source: 'workflow_schema' },
        { id: 'new-risk', label: '本周新增风险', value: '本周新增风险', source: 'workflow_schema' },
        { id: 'all-open', label: '全部未关闭风险', value: '全部未关闭风险', source: 'workflow_schema' },
      ],
    },
    required: true,
    defaultOptionId: 'high-risk',
    source: 'workflow_schema',
  },
  {
    id: 'review-time',
    title: '你希望什么时候召开评审？',
    control: {
      type: 'single_select',
      allowOther: true,
      options: [
        { id: 'thu-pm', label: '本周四下午', value: '本周四下午', source: 'workflow_schema' },
        { id: 'fri-am', label: '本周五上午', value: '本周五上午', source: 'workflow_schema' },
        { id: 'mon-am', label: '下周一上午', value: '下周一上午', source: 'workflow_schema' },
      ],
    },
    required: true,
    defaultOptionId: 'thu-pm',
    source: 'workflow_schema',
  },
  {
    id: 'preparation-mode',
    title: '评审材料准备按什么方式组织？',
    control: {
      type: 'single_select',
      allowOther: true,
      options: [
        { id: 'single-owner', label: '由一名主负责人统筹（推荐）', value: '由一名主负责人统筹', source: 'workflow_schema' },
        { id: 'by-domain', label: '各专业分别准备', value: '各专业分别准备', source: 'workflow_schema' },
        { id: 'assistant-draft', label: '助理先生成初稿再分工', value: '助理先生成初稿再分工', source: 'workflow_schema' },
      ],
    },
    required: true,
    defaultOptionId: 'single-owner',
    source: 'workflow_schema',
  },
]

function selectedPerson(answers: DecisionAnswers) {
  const selectedId = answers.assignee?.optionId
  return people.find((person) => person.id === selectedId) ?? people[0]
}

function answerValue(answers: DecisionAnswers, stepId: string) {
  return answers[stepId]?.value ?? ''
}

export function buildDecisionFlow(decision: AssistantDecision): DecisionFlowSpec {
  if (decision.kind === 'dispatch') {
    return {
      id: decision.id,
      purpose: 'authorize',
      contextLabel: '派任务前确认',
      steps: [
        {
          id: 'assignee',
          title: `谁负责${decision.title}？`,
          description: '助理根据任务专业和近期协作推荐了以下人员，一期只允许一个主执行人。',
          control: { type: 'person_select', candidates: people, allowSearch: true },
          required: true,
          defaultOptionId: 'li-jing',
          source: 'organization_service',
        },
        {
          id: 'dispatch-review',
          title: (answers) => `确认派发给${selectedPerson(answers).name}`,
          description: '确认后将创建权威任务，并通知执行人的数字分身。',
          control: {
            type: 'review',
            rows: (answers) => {
              const person = selectedPerson(answers)
              return [
                { label: '唯一执行人', value: `${person.name} · ${person.department}`, source: 'organization_service' },
                { label: '任务标题', value: decision.title, source: 'decision_request' },
                { label: '截止时间', value: decision.dueAt, source: 'decision_request' },
                { label: '优先级', value: decision.priority, source: 'decision_request' },
                { label: '任务要求', value: decision.description, source: 'decision_request' },
                { label: '正式动作', value: `写入${decision.sourceSystem}并发送 A2A 任务事件`, source: 'computed' },
              ]
            },
          },
          source: 'computed',
        },
      ],
      finalAction: { label: '确认派发', icon: 'send', source: 'client_action_map' },
      resolve: (answers) => ({ action: 'dispatch', assignee: selectedPerson(answers).name }),
    }
  }

  if (decision.kind === 'reminder') {
    return {
      id: decision.id,
      purpose: 'authorize',
      contextLabel: '发起催办前确认',
      steps: [{
        id: 'reminder-review',
        title: `催办：${decision.item.title}`,
        description: '本次催办引用原任务，不会创建新任务或改变任务状态。',
        control: {
          type: 'review',
          rows: [
            { label: '原任务 ID', value: decision.item.id, source: 'task_service' },
            { label: '催办对象', value: decision.item.assignee, source: 'task_service' },
            { label: '当前状态', value: decision.item.progress, source: 'task_service' },
            { label: '截止时间', value: decision.item.dueAt, source: 'task_service' },
            { label: '催办内容', value: decision.reminderText, source: 'decision_request' },
          ],
          callout: '上次催办：尚无记录。本次发送符合当前频控策略。',
        },
        source: 'task_service',
      }],
      finalAction: { label: '确认发送', icon: 'send', source: 'client_action_map' },
      resolve: () => ({ action: 'send_reminder' }),
    }
  }

  if (decision.kind === 'task_receipt') {
    return {
      id: decision.id,
      purpose: 'respond',
      contextLabel: '收到任务 · 需要本人处理',
      steps: [{
        id: 'task-receipt-review',
        title: decision.item.title,
        description: `${decision.item.assigner}通过数字分身派发了这项任务。确认收到不等于任务完成。`,
        control: {
          type: 'review',
          rows: [
            { label: '派发人', value: decision.item.assigner, source: 'task_service' },
            { label: '截止时间', value: decision.item.dueAt, source: 'task_service' },
            { label: '任务要求', value: decision.item.description, source: 'task_service' },
            { label: '业务来源', value: decision.item.sourceSystem, source: 'task_service' },
          ],
        },
        source: 'task_service',
      }],
      finalAction: { label: '确认收到', icon: 'check', source: 'client_action_map' },
      secondaryAction: { label: '申请调整', resolve: { action: 'request_adjustment' } },
      resolve: () => ({ action: 'confirm_receipt' }),
    }
  }

  if (decision.kind === 'progress_reply') {
    return {
      id: decision.id,
      purpose: 'respond',
      contextLabel: '收到催办 · 需要本人回复',
      steps: [{
        id: 'progress',
        title: `${decision.item.assigner}在询问“${decision.item.title}”的进展`,
        description: '选择当前状态；如有风险，可以在补充说明中直接告诉对方。确认后助理会写回任务并回复对方数字分身。',
        control: {
          type: 'single_select',
          options: progressOptions,
          note: {
            label: '补充说明（可选）',
            placeholder: '补充风险、预计时间或需要协调的事项…',
            source: 'user_input',
          },
        },
        required: true,
        defaultOptionId: 'on-track',
        source: 'workflow_schema',
      }],
      finalAction: { label: '确认回复', icon: 'send', source: 'client_action_map' },
      resolve: (answers, notes) => ({
        action: 'reply_progress',
        progress: [answerValue(answers, 'progress'), notes.progress?.trim()].filter(Boolean).join('。'),
      }),
    }
  }

  return {
    id: decision.id,
    purpose: 'clarify',
    contextLabel: '方案澄清',
    steps: riskReviewSteps,
    finalAction: { label: '提交', icon: 'check', source: 'client_action_map' },
    resolve: (answers) => ({
      action: 'complete_workflow',
      workflowSummary: [
        `评审范围：${answerValue(answers, 'review-scope')}`,
        `评审时间：${answerValue(answers, 'review-time')}`,
        `准备方式：${answerValue(answers, 'preparation-mode')}`,
      ].join('；'),
    }),
  }
}
