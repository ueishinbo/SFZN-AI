export type TaskStatus = 'active' | 'paused' | 'completed'
export type RunStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled'
export type RunTrigger = 'scheduled' | 'manual' | 'rerun'

export type PeriodicSchedule = {
  mode: 'periodic'
  frequency: 'daily' | 'weekly' | 'monthly'
  time: string
  weekdays: number[]
  dayOfMonth: number
}

export type IntervalSchedule = {
  mode: 'interval'
  value: number
  unit: 'minute' | 'hour' | 'day'
}

export type OnceSchedule = {
  mode: 'once'
  runAt: string
}

export type AutomationSchedule = PeriodicSchedule | IntervalSchedule | OnceSchedule

export type AutomationTask = {
  id: string
  name: string
  prompt: string
  status: TaskStatus
  schedule: AutomationSchedule
  model: string
  skill: string
  nextRunAt: string | null
  updatedAt: string
}

export type AutomationRun = {
  id: string
  taskId: string
  taskName: string
  prompt: string
  status: RunStatus
  trigger: RunTrigger
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  result: string
  errorMessage: string
}

export const TASKS_STORAGE_KEY = 'comac-ai-automation-tasks-v1'
export const RUNS_STORAGE_KEY = 'comac-ai-automation-runs-v1'

const atFutureTime = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
const atPastTime = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

export const seedTasks: AutomationTask[] = [
  {
    id: 'task-airworthiness',
    name: '每日适航动态推送',
    prompt: '汇总过去 24 小时国内外适航动态，识别与商用飞机相关的重要变化，并按照事件、影响和建议行动输出。',
    status: 'active',
    schedule: { mode: 'periodic', frequency: 'daily', time: '09:00', weekdays: [1], dayOfMonth: 1 },
    model: '商飞大模型 L1-S1',
    skill: '适航信息检索',
    nextRunAt: atFutureTime(16),
    updatedAt: atPastTime(2),
  },
  {
    id: 'task-aog-risk',
    name: 'AOG供应商风险周报',
    prompt: '分析本周 AOG 相关供应商交付、质量和保障风险，按风险等级列出问题、影响范围、责任方与建议措施。',
    status: 'active',
    schedule: { mode: 'periodic', frequency: 'weekly', time: '10:00', weekdays: [1], dayOfMonth: 1 },
    model: '商飞大模型 L1-S1',
    skill: '供应链风险分析',
    nextRunAt: atFutureTime(42),
    updatedAt: atPastTime(20),
  },
  {
    id: 'task-meeting',
    name: '型号例会材料准备',
    prompt: '汇总型号项目本周进展、关键问题和待决策事项，生成型号例会材料提纲。',
    status: 'paused',
    schedule: { mode: 'periodic', frequency: 'weekly', time: '17:30', weekdays: [5], dayOfMonth: 1 },
    model: '商飞大模型 L1-S1',
    skill: '材料生成',
    nextRunAt: null,
    updatedAt: atPastTime(50),
  },
]

const airworthinessResult = `本次适航动态汇总已完成\n\n一、重点事件\n1. EASA 更新大型飞机持续适航相关指导材料，重点强化运营阶段结构检查记录。\n2. FAA 发布一项拟议适航指令，涉及特定机型航电软件版本核查。\n3. 国内适航信息未发现影响当前型号运行安全的紧急指令。\n\n二、影响判断\n当前信息对在研型号无立即停场影响，建议持续跟踪软件符合性要求及后续正式指令。\n\n三、建议行动\n• 适航团队在 2 个工作日内完成条款映射。\n• 航电专业确认受影响软件版本范围。\n• 将重点变化纳入下一次型号适航例会。`

const aogResult = `AOG 供应商风险周报已生成\n\n高风险：1 项\n• 某航电供应商关键件交付预计延迟 5 天，可能影响两架份装机计划。\n\n中风险：2 项\n• 某结构件供应商一次检验通过率较上周下降 4.2%。\n• 海外运输节点存在周末清关积压风险。\n\n建议措施\n1. 启动关键件替代库存核验。\n2. 要求供应商在周三前提交恢复计划。\n3. 对两项中风险保持每日跟踪。`

export const seedRuns: AutomationRun[] = [
  {
    id: 'run-airworthiness-seed',
    taskId: 'task-airworthiness',
    taskName: '每日适航动态推送',
    prompt: seedTasks[0].prompt,
    status: 'success',
    trigger: 'scheduled',
    createdAt: atPastTime(6),
    startedAt: atPastTime(6),
    finishedAt: atPastTime(5.95),
    result: airworthinessResult,
    errorMessage: '',
  },
  {
    id: 'run-aog-seed',
    taskId: 'task-aog-risk',
    taskName: 'AOG供应商风险周报',
    prompt: seedTasks[1].prompt,
    status: 'success',
    trigger: 'scheduled',
    createdAt: atPastTime(28),
    startedAt: atPastTime(28),
    finishedAt: atPastTime(27.96),
    result: aogResult,
    errorMessage: '',
  },
]

export function loadStoredList<T>(key: string, fallback: T[]): T[] {
  try {
    const value = window.localStorage.getItem(key)
    return value ? (JSON.parse(value) as T[]) : fallback
  } catch {
    return fallback
  }
}

export function scheduleSummary(schedule: AutomationSchedule): string {
  if (schedule.mode === 'interval') {
    const units = { minute: '分钟', hour: '小时', day: '天' }
    return `每 ${schedule.value} ${units[schedule.unit]}`
  }
  if (schedule.mode === 'once') {
    const date = new Date(schedule.runAt)
    return `${formatDateTime(date.toISOString())} 单次执行`
  }
  if (schedule.frequency === 'daily') return `每天 ${schedule.time}`
  if (schedule.frequency === 'monthly') return `每月 ${schedule.dayOfMonth} 日 ${schedule.time}`
  const names = ['一', '二', '三', '四', '五', '六', '日']
  const weekdayText = schedule.weekdays.map((day) => `周${names[day - 1]}`).join('、')
  return `每${weekdayText} ${schedule.time}`
}

export function calculateNextRun(schedule: AutomationSchedule): string {
  const now = new Date()
  if (schedule.mode === 'interval') {
    const multiplier = schedule.unit === 'minute' ? 60_000 : schedule.unit === 'hour' ? 3_600_000 : 86_400_000
    return new Date(now.getTime() + schedule.value * multiplier).toISOString()
  }
  if (schedule.mode === 'once') return new Date(schedule.runAt).toISOString()

  const [hours, minutes] = schedule.time.split(':').map(Number)
  const next = new Date(now)
  next.setHours(hours, minutes, 0, 0)

  if (schedule.frequency === 'daily') {
    if (next.getTime() <= now.getTime() + 120_000) next.setDate(next.getDate() + 1)
    return next.toISOString()
  }

  if (schedule.frequency === 'weekly') {
    for (let offset = 0; offset <= 7; offset += 1) {
      const candidate = new Date(now)
      candidate.setDate(now.getDate() + offset)
      candidate.setHours(hours, minutes, 0, 0)
      const isoDay = candidate.getDay() === 0 ? 7 : candidate.getDay()
      if (schedule.weekdays.includes(isoDay) && candidate.getTime() > now.getTime() + 120_000) return candidate.toISOString()
    }
  }

  const year = now.getFullYear()
  const month = now.getMonth()
  const makeMonthlyDate = (monthOffset: number) => {
    const lastDay = new Date(year, month + monthOffset + 1, 0).getDate()
    return new Date(year, month + monthOffset, Math.min(schedule.dayOfMonth, lastDay), hours, minutes)
  }
  const thisMonth = makeMonthlyDate(0)
  return (thisMonth.getTime() > now.getTime() + 120_000 ? thisMonth : makeMonthlyDate(1)).toISOString()
}

export function formatDateTime(value: string | null): string {
  if (!value) return '--'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value)).replaceAll('/', '-')
}

export function formatHistoryTime(value: string | null): string {
  if (!value) return '--'
  const date = new Date(value)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const time = new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)

  if (startOfTarget === startOfToday) return time
  if (startOfTarget === startOfToday - 86_400_000) return `昨天 ${time}`
  const sameYear = date.getFullYear() === now.getFullYear()
  return new Intl.DateTimeFormat('zh-CN', {
    year: sameYear ? undefined : 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date).replaceAll('/', '-')
}

export function relativeFuture(value: string | null): string {
  if (!value) return '--'
  const diffMinutes = Math.max(0, Math.round((new Date(value).getTime() - Date.now()) / 60_000))
  if (diffMinutes < 60) return `${diffMinutes || 1}分钟后执行`
  if (diffMinutes < 24 * 60) return `${Math.round(diffMinutes / 60)}小时后执行`
  return formatDateTime(value)
}

export function createMockResult(task: AutomationTask): string {
  if (task.name.includes('适航') || task.prompt.includes('适航')) return airworthinessResult
  if (task.name.includes('AOG') || task.prompt.includes('供应商')) return aogResult
  return `“${task.name}”已完成模拟执行\n\n执行摘要\nComac Claw 已按照任务提示词完成信息整理、要点提取和结果组织。\n\n本次任务要求\n${task.prompt}\n\n模拟输出\n1. 已识别任务目标与输出范围。\n2. 已完成相关信息的汇总与结构化整理。\n3. 已形成可供后续业务确认的结果草稿。\n\n说明：当前为纯前端演示结果，正式产品将由后端智能体生成真实内容。`
}
