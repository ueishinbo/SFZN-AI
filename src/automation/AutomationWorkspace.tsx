import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react'
import {
  AlarmClock,
  ArrowLeft,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  CirclePause,
  Clock3,
  Edit3,
  Ellipsis,
  FileClock,
  History,
  LoaderCircle,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import {
  calculateNextRun,
  createMockResult,
  formatDateTime,
  formatHistoryTime,
  relativeFuture,
  scheduleSummary,
  type AutomationRun,
  type AutomationSchedule,
  type AutomationTask,
  type RunStatus,
} from './mockAutomation'
import './automation.css'

type View = 'tasks' | 'runs' | 'form'
type Toast = { id: number; message: string }

type AutomationWorkspaceProps = {
  tasks: AutomationTask[]
  runs: AutomationRun[]
  setTasks: Dispatch<SetStateAction<AutomationTask[]>>
  setRuns: Dispatch<SetStateAction<AutomationRun[]>>
}

const statusMeta: Record<RunStatus, { label: string; className: string }> = {
  queued: { label: '排队中', className: 'is-queued' },
  running: { label: '执行中', className: 'is-running' },
  success: { label: '成功', className: 'is-success' },
  failed: { label: '失败', className: 'is-failed' },
  cancelled: { label: '已取消', className: 'is-cancelled' },
}

const defaultSchedule: AutomationSchedule = {
  mode: 'periodic',
  frequency: 'daily',
  time: '09:00',
  weekdays: [1],
  dayOfMonth: 1,
}

const triggerLabel = (trigger: AutomationRun['trigger']) => {
  if (trigger === 'scheduled') return '自动触发'
  if (trigger === 'manual') return '手动触发'
  return '重新执行'
}

const createDraft = (): AutomationTask => ({
  id: '',
  name: '',
  prompt: '',
  status: 'active',
  schedule: defaultSchedule,
  model: '商飞大模型 L1-S1',
  skill: '',
  nextRunAt: null,
  updatedAt: new Date().toISOString(),
})

function StatusBadge({ status }: { status: RunStatus }) {
  const meta = statusMeta[status]
  return (
    <span className={`run-status ${meta.className}`}>
      {status === 'running' || status === 'queued' ? <LoaderCircle size={14} /> : status === 'success' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      {meta.label}
    </span>
  )
}

function AutomationWorkspace({ tasks, runs, setTasks, setRuns }: AutomationWorkspaceProps) {
  const [view, setView] = useState<View>('tasks')
  const [query, setQuery] = useState('')
  const [runQuery, setRunQuery] = useState('')
  const [editingTask, setEditingTask] = useState<AutomationTask | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [selectedRun, setSelectedRun] = useState<AutomationRun | null>(null)
  const [confirm, setConfirm] = useState<{ type: 'pause' | 'delete'; task: AutomationTask } | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    if (selectedRun && !runs.some((run) => run.id === selectedRun.id)) setSelectedRun(null)
  }, [runs, selectedRun])

  const toast = (message: string) => {
    const id = Date.now()
    setToasts((items) => [...items, { id, message }])
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 2600)
  }

  const visibleTasks = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return tasks.filter((task) => (task.status === 'active' || task.status === 'paused') && (!keyword || task.name.toLowerCase().includes(keyword)))
  }, [query, tasks])

  const visibleRuns = useMemo(() => {
    const keyword = runQuery.trim().toLowerCase()
    return runs.filter((run) => !keyword || run.taskName.toLowerCase().includes(keyword) || run.id.toLowerCase().includes(keyword))
  }, [runQuery, runs])

  const updateTask = (id: string, updater: (task: AutomationTask) => AutomationTask) => {
    setTasks((items) => items.map((task) => (task.id === id ? updater(task) : task)))
  }

  const runTask = (task: AutomationTask, trigger: AutomationRun['trigger'] = 'manual') => {
    const hasActiveRun = runs.some((run) => run.taskId === task.id && (run.status === 'queued' || run.status === 'running'))
    if (hasActiveRun) {
      toast('该任务已有运行实例正在执行')
      return
    }

    const now = new Date().toISOString()
    const runId = `run-${Date.now()}`
    const newRun: AutomationRun = {
      id: runId,
      taskId: task.id,
      taskName: task.name,
      prompt: task.prompt,
      status: 'queued',
      trigger,
      createdAt: now,
      startedAt: null,
      finishedAt: null,
      result: '',
      errorMessage: '',
    }
    setRuns((items) => [newRun, ...items])
    updateTask(task.id, (item) => ({ ...item, updatedAt: now }))
    toast('任务已加入执行队列')

    window.setTimeout(() => {
      setRuns((items) => items.map((run) => (run.id === runId ? { ...run, status: 'running', startedAt: new Date().toISOString() } : run)))
      updateTask(task.id, (item) => ({ ...item, updatedAt: new Date().toISOString() }))
    }, 700)

    window.setTimeout(() => {
      const finishedAt = new Date().toISOString()
      const result = createMockResult(task)
      setRuns((items) => items.map((run) => (run.id === runId ? { ...run, status: 'success', finishedAt, result } : run)))
      updateTask(task.id, (item) => ({ ...item, updatedAt: finishedAt }))
      setSelectedRun((current) => current?.id === runId ? { ...current, status: 'success', finishedAt, result } : current)
      toast(`“${task.name}”执行完成`)
    }, 2600)
  }

  const saveTask = (draft: AutomationTask) => {
    const isNew = !draft.id
    const saved: AutomationTask = {
      ...draft,
      id: draft.id || `task-${Date.now()}`,
      nextRunAt: draft.status === 'paused' ? null : calculateNextRun(draft.schedule),
      updatedAt: new Date().toISOString(),
    }
    setTasks((items) => isNew ? [saved, ...items] : items.map((task) => task.id === saved.id ? saved : task))
    setView('tasks')
    setEditingTask(null)
    toast(isNew ? '自动化任务已创建' : '自动化任务已更新')
  }

  const pauseTask = (task: AutomationTask) => {
    updateTask(task.id, (item) => ({ ...item, status: 'paused', nextRunAt: null, updatedAt: new Date().toISOString() }))
    setConfirm(null)
    toast('任务已暂停')
  }

  const resumeTask = (task: AutomationTask) => {
    updateTask(task.id, (item) => ({ ...item, status: 'active', nextRunAt: calculateNextRun(item.schedule), updatedAt: new Date().toISOString() }))
    setOpenMenu(null)
    toast('任务已恢复')
  }

  const deleteTask = (task: AutomationTask) => {
    setTasks((items) => items.filter((item) => item.id !== task.id))
    setRuns((items) => items.filter((run) => run.taskId !== task.id))
    setSelectedRun((current) => current?.taskId === task.id ? null : current)
    setConfirm(null)
    toast('自动化任务及运行记录已删除')
  }

  const openEdit = (task: AutomationTask) => {
    setEditingTask(task)
    setView('form')
    setOpenMenu(null)
  }

  const openCreate = () => {
    setEditingTask(null)
    setView('form')
  }

  return (
    <section className="automation-workspace">
      {view !== 'form' && (
        <header className="automation-header">
          <div className="automation-tabs" role="tablist">
            <button className={view === 'tasks' ? 'active' : ''} type="button" onClick={() => setView('tasks')}>
              <Clock3 size={18} />定时任务
            </button>
            <button className={view === 'runs' ? 'active' : ''} type="button" onClick={() => setView('runs')}>
              <History size={18} />运行记录
            </button>
          </div>
          <div className="automation-header-actions">
            <label className="automation-search">
              <Search size={17} />
              <input
                value={view === 'tasks' ? query : runQuery}
                onChange={(event) => view === 'tasks' ? setQuery(event.target.value) : setRunQuery(event.target.value)}
                placeholder={view === 'tasks' ? '搜索自动化任务' : '搜索任务或运行记录'}
              />
              {(view === 'tasks' ? query : runQuery) && (
                <button type="button" onClick={() => view === 'tasks' ? setQuery('') : setRunQuery('')}><X size={15} /></button>
              )}
            </label>
            <button className="primary-action" type="button" onClick={openCreate}><Plus size={18} />添加自动化</button>
          </div>
        </header>
      )}

      {view === 'tasks' && (
        <div className="automation-content">
          {visibleTasks.length === 0 ? (
            <div className="automation-empty">
              <div className="empty-icon"><AlarmClock size={34} /></div>
              <h2>{query ? '未找到相关自动化任务' : '还没有自动化任务'}</h2>
              <p>{query ? '请尝试更换关键词。' : '创建自动化任务，让 Comac Claw 按计划替你完成重复工作。'}</p>
              <button className="secondary-action" type="button" onClick={() => query ? setQuery('') : openCreate()}>{query ? '清除搜索' : '添加自动化'}</button>
            </div>
          ) : (
            <>
              <TaskGroup
                title="当前"
                tasks={visibleTasks.filter((task) => task.status === 'active')}
                openMenu={openMenu}
                setOpenMenu={setOpenMenu}
                onEdit={openEdit}
                onRun={runTask}
                onPause={(task) => setConfirm({ type: 'pause', task })}
                onResume={resumeTask}
                onDelete={(task) => setConfirm({ type: 'delete', task })}
              />
              <TaskGroup
                title="已暂停"
                tasks={visibleTasks.filter((task) => task.status === 'paused')}
                openMenu={openMenu}
                setOpenMenu={setOpenMenu}
                onEdit={openEdit}
                onRun={runTask}
                onPause={(task) => setConfirm({ type: 'pause', task })}
                onResume={resumeTask}
                onDelete={(task) => setConfirm({ type: 'delete', task })}
              />
            </>
          )}
        </div>
      )}

      {view === 'runs' && (
        <div className="automation-content runs-content">
          {visibleRuns.length === 0 ? (
            <div className="automation-empty compact">
              <div className="empty-icon"><FileClock size={32} /></div>
              <h2>{runQuery ? '未找到相关运行记录' : '还没有运行记录'}</h2>
              <p>自动化任务执行后，运行结果会显示在这里。</p>
              {runQuery && <button className="secondary-action" type="button" onClick={() => setRunQuery('')}>清除搜索</button>}
            </div>
          ) : (
            <div className="run-list">
              {visibleRuns.map((run) => (
                <button className="run-row" type="button" key={run.id} onClick={() => setSelectedRun(run)}>
                  <div className="run-row-icon"><Bot size={19} /></div>
                  <div className="run-main">
                    <strong>{run.taskName}</strong>
                    <span>{triggerLabel(run.trigger)}</span>
                  </div>
                  <StatusBadge status={run.status} />
                  <span className="run-time">{formatHistoryTime(run.createdAt)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'form' && (
        <AutomationForm initialTask={editingTask ?? createDraft()} onCancel={() => { setView('tasks'); setEditingTask(null) }} onSave={saveTask} />
      )}

      {selectedRun && (
        <RunDetail
          run={runs.find((run) => run.id === selectedRun.id) ?? selectedRun}
          task={tasks.find((task) => task.id === selectedRun.taskId)}
          onClose={() => setSelectedRun(null)}
          onRerun={(task) => { setSelectedRun(null); runTask(task, 'rerun') }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.type === 'pause' ? `暂停“${confirm.task.name}”？` : `删除“${confirm.task.name}”？`}
          description={confirm.type === 'pause' ? '暂停后不会再产生新的计划执行，正在执行的任务不会被终止。' : '删除后不会再产生新的计划执行，该任务的运行记录也会一起删除。'}
          actionLabel={confirm.type === 'pause' ? '暂停任务' : '删除任务'}
          dangerous={confirm.type === 'delete'}
          onCancel={() => setConfirm(null)}
          onConfirm={() => confirm.type === 'pause' ? pauseTask(confirm.task) : deleteTask(confirm.task)}
        />
      )}

      <div className="toast-stack" aria-live="polite">
        {toasts.map((item) => <div className="toast" key={item.id}><Check size={16} />{item.message}</div>)}
      </div>
    </section>
  )
}

type TaskGroupProps = {
  title: string
  tasks: AutomationTask[]
  openMenu: string | null
  setOpenMenu: (id: string | null) => void
  onEdit: (task: AutomationTask) => void
  onRun: (task: AutomationTask) => void
  onPause: (task: AutomationTask) => void
  onResume: (task: AutomationTask) => void
  onDelete: (task: AutomationTask) => void
}

function TaskGroup({ title, tasks, openMenu, setOpenMenu, onEdit, onRun, onPause, onResume, onDelete }: TaskGroupProps) {
  if (!tasks.length) return null
  return (
    <section className="automation-group">
      <div className="automation-group-title"><span>{title}</span><span>{tasks.length}</span></div>
      <div className="automation-task-list">
        {tasks.map((task) => (
          <article className="automation-task-card" key={task.id}>
            <button className="task-card-main" type="button" onClick={() => onEdit(task)}>
              <div className="task-card-icon"><AlarmClock size={21} /></div>
              <div className="task-card-copy">
                <div><strong>{task.name}</strong><span>{scheduleSummary(task.schedule)}</span></div>
              </div>
            </button>
            <div className="task-card-meta">
              <span className={task.status === 'paused' ? 'paused-label' : ''}>{task.status === 'paused' ? '已暂停' : relativeFuture(task.nextRunAt)}</span>
              <button className="task-delete-button" type="button" title="删除任务" onClick={() => onDelete(task)}><Trash2 size={20} /></button>
              <div className="task-menu-wrap">
                <button className="more-button" type="button" title="更多操作" onClick={() => setOpenMenu(openMenu === task.id ? null : task.id)}><Ellipsis size={20} /></button>
                {openMenu === task.id && (
                  <div className="task-menu">
                    <button type="button" onClick={() => { onRun(task); setOpenMenu(null) }}><Play size={16} />立即执行</button>
                    <button type="button" onClick={() => onEdit(task)}><Edit3 size={16} />编辑</button>
                    {task.status === 'active' ? (
                      <button type="button" onClick={() => { onPause(task); setOpenMenu(null) }}><Pause size={16} />暂停</button>
                    ) : (
                      <button type="button" onClick={() => onResume(task)}><RefreshCw size={16} />恢复</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function AutomationForm({ initialTask, onCancel, onSave }: { initialTask: AutomationTask; onCancel: () => void; onSave: (task: AutomationTask) => void }) {
  const [draft, setDraft] = useState<AutomationTask>(() => structuredClone(initialTask))
  const [errors, setErrors] = useState<{ name?: string; prompt?: string; schedule?: string }>({})
  const isEdit = Boolean(initialTask.id)

  const setScheduleMode = (mode: AutomationSchedule['mode']) => {
    if (mode === 'periodic') setDraft((value) => ({ ...value, schedule: { ...defaultSchedule } }))
    if (mode === 'interval') setDraft((value) => ({ ...value, schedule: { mode: 'interval', value: 2, unit: 'hour' } }))
    if (mode === 'once') {
      const date = new Date(Date.now() + 24 * 60 * 60 * 1000)
      date.setSeconds(0, 0)
      setDraft((value) => ({ ...value, schedule: { mode: 'once', runAt: date.toISOString().slice(0, 16) } }))
    }
  }

  const submit = () => {
    const nextErrors: typeof errors = {}
    if (!draft.name.trim()) nextErrors.name = '请输入任务名称'
    if (draft.name.trim().length > 50) nextErrors.name = '任务名称不能超过 50 个字符'
    if (!draft.prompt.trim()) nextErrors.prompt = '请输入任务提示词'
    if (draft.schedule.mode === 'interval' && draft.schedule.unit === 'minute' && draft.schedule.value < 15) nextErrors.schedule = '执行间隔不能少于 15 分钟'
    if (draft.schedule.mode === 'once' && new Date(draft.schedule.runAt).getTime() < Date.now() + 5 * 60_000) nextErrors.schedule = '执行时间至少需要晚于当前时间 5 分钟'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onSave({ ...draft, name: draft.name.trim(), prompt: draft.prompt.trim() })
  }

  return (
    <div className="automation-form-page">
      <header className="form-header">
        <div className="form-title">
          <button type="button" onClick={onCancel}><ArrowLeft size={19} /></button>
          <div><span>自动化</span><strong>{isEdit ? '编辑自动化任务' : '添加自动化任务'}</strong></div>
        </div>
        <div className="form-actions">
          <button className="cancel-action" type="button" onClick={onCancel}>取消</button>
          <button className="save-action" type="button" onClick={submit}>{isEdit ? '保存修改' : '保存'}</button>
        </div>
      </header>

      <div className="automation-form-scroll">
        <div className="form-field">
          <label htmlFor="automation-name">名称 <em>*</em></label>
          <input id="automation-name" value={draft.name} maxLength={51} onChange={(event) => { setDraft({ ...draft, name: event.target.value }); setErrors({ ...errors, name: undefined }) }} placeholder="例如：每日适航动态推送" />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>

        <div className="form-field">
          <label htmlFor="automation-prompt">提示词 <em>*</em></label>
          <div className={`prompt-editor ${errors.prompt ? 'has-error' : ''}`}>
            <textarea id="automation-prompt" value={draft.prompt} maxLength={10001} onChange={(event) => { setDraft({ ...draft, prompt: event.target.value }); setErrors({ ...errors, prompt: undefined }) }} placeholder="描述需要 Comac Claw 定时完成的任务、输入范围和输出要求" />
            <div className="prompt-config-bar">
              <label>模型<select value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })}><option>商飞大模型 L1-S1</option><option>商飞大模型 L1-S2</option></select></label>
              <label>技能<select value={draft.skill} onChange={(event) => setDraft({ ...draft, skill: event.target.value })}><option value="">不使用技能</option><option>适航信息检索</option><option>供应链风险分析</option><option>材料生成</option></select></label>
            </div>
          </div>
          {errors.prompt && <span className="field-error">{errors.prompt}</span>}
          <span className="field-help">正式产品中，模型和技能由服务端返回当前可用于自动化执行的能力。</span>
        </div>

        <div className="form-field schedule-field">
          <label>执行频率 <em>*</em></label>
          <div className="segmented-control">
            <button className={draft.schedule.mode === 'periodic' ? 'active' : ''} type="button" onClick={() => setScheduleMode('periodic')}>周期</button>
            <button className={draft.schedule.mode === 'interval' ? 'active' : ''} type="button" onClick={() => setScheduleMode('interval')}>按间隔</button>
            <button className={draft.schedule.mode === 'once' ? 'active' : ''} type="button" onClick={() => setScheduleMode('once')}>单次</button>
          </div>

          {draft.schedule.mode === 'periodic' && (
            <div className="schedule-controls">
              <select value={draft.schedule.frequency} onChange={(event) => setDraft((value) => value.schedule.mode === 'periodic' ? { ...value, schedule: { ...value.schedule, frequency: event.target.value as 'daily' | 'weekly' | 'monthly' } } : value)}>
                <option value="daily">每天</option><option value="weekly">每周</option><option value="monthly">每月</option>
              </select>
              {draft.schedule.frequency === 'weekly' && (
                <div className="weekday-picker">
                  {['一', '二', '三', '四', '五', '六', '日'].map((name, index) => {
                    const day = index + 1
                    const selected = draft.schedule.mode === 'periodic' && draft.schedule.weekdays.includes(day)
                    return <button className={selected ? 'active' : ''} type="button" key={name} onClick={() => setDraft((value) => value.schedule.mode === 'periodic' ? { ...value, schedule: { ...value.schedule, weekdays: selected ? value.schedule.weekdays.filter((weekday) => weekday !== day) : [...value.schedule.weekdays, day].sort() } } : value)}>周{name}</button>
                  })}
                </div>
              )}
              {draft.schedule.frequency === 'monthly' && <label className="inline-number">每月<input type="number" min="1" max="31" value={draft.schedule.dayOfMonth} onChange={(event) => setDraft((value) => value.schedule.mode === 'periodic' ? { ...value, schedule: { ...value.schedule, dayOfMonth: Number(event.target.value) } } : value)} />日</label>}
              <label className="time-control"><Clock3 size={17} /><input type="time" value={draft.schedule.time} onChange={(event) => setDraft((value) => value.schedule.mode === 'periodic' ? { ...value, schedule: { ...value.schedule, time: event.target.value } } : value)} /></label>
            </div>
          )}

          {draft.schedule.mode === 'interval' && (
            <div className="schedule-controls">
              <span>每</span><input className="interval-input" type="number" min="1" value={draft.schedule.value} onChange={(event) => { setDraft((value) => value.schedule.mode === 'interval' ? { ...value, schedule: { ...value.schedule, value: Number(event.target.value) } } : value); setErrors({ ...errors, schedule: undefined }) }} />
              <select value={draft.schedule.unit} onChange={(event) => setDraft((value) => value.schedule.mode === 'interval' ? { ...value, schedule: { ...value.schedule, unit: event.target.value as 'minute' | 'hour' | 'day' } } : value)}><option value="minute">分钟</option><option value="hour">小时</option><option value="day">天</option></select>
              <span className="schedule-note">保存后经过一个完整间隔首次执行</span>
            </div>
          )}

          {draft.schedule.mode === 'once' && (
            <div className="schedule-controls">
              <CalendarDays size={18} /><input type="datetime-local" value={draft.schedule.runAt} onChange={(event) => { setDraft({ ...draft, schedule: { mode: 'once', runAt: event.target.value } }); setErrors({ ...errors, schedule: undefined }) }} />
            </div>
          )}
          {errors.schedule && <span className="field-error">{errors.schedule}</span>}
        </div>

      </div>
    </div>
  )
}

function RunDetail({ run, task, onClose, onRerun }: { run: AutomationRun; task?: AutomationTask; onClose: () => void; onRerun: (task: AutomationTask) => void }) {
  return (
    <div className="drawer-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
      <aside className="run-drawer">
        <header>
          <div><span>运行详情</span><strong>{run.taskName}</strong></div>
          <button type="button" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="run-drawer-content">
          <div className="detail-status"><StatusBadge status={run.status} /><span>{run.id}</span></div>
          <dl className="detail-grid">
            <div><dt>触发方式</dt><dd>{triggerLabel(run.trigger)}</dd></div>
            <div><dt>创建时间</dt><dd>{formatDateTime(run.createdAt)}</dd></div>
            <div><dt>开始时间</dt><dd>{formatDateTime(run.startedAt)}</dd></div>
            <div><dt>完成时间</dt><dd>{formatDateTime(run.finishedAt)}</dd></div>
          </dl>
          {(run.status === 'queued' || run.status === 'running') && (
            <div className="run-progress"><LoaderCircle size={20} /><div><strong>{run.status === 'queued' ? '等待执行资源' : 'Comac Claw 正在执行任务'}</strong><span>演示环境将在几秒内生成模拟结果</span></div></div>
          )}
          <section className="detail-section">
            <h3>输入快照</h3>
            <div className="prompt-snapshot">{run.prompt}</div>
          </section>
          <section className="detail-section">
            <h3>输出结果</h3>
            {run.status === 'success' ? <pre className="run-result">{run.result}</pre> : run.status === 'failed' ? <div className="run-error">{run.errorMessage}</div> : <div className="result-placeholder">任务完成后，结果会显示在这里。</div>}
          </section>
        </div>
        <footer>
          {(run.status === 'failed' || run.status === 'cancelled') && task && <button className="secondary-action" type="button" onClick={() => onRerun(task)}><RotateCcw size={16} />重新执行</button>}
          <button className="primary-action" type="button" onClick={onClose}>关闭</button>
        </footer>
      </aside>
    </div>
  )
}

function ConfirmDialog({ title, description, actionLabel, dangerous, onCancel, onConfirm }: { title: string; description: string; actionLabel: string; dangerous?: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="modal-backdrop">
      <div className="confirm-dialog" role="dialog" aria-modal="true">
        <div className={`confirm-icon ${dangerous ? 'danger' : ''}`}>{dangerous ? <Trash2 size={22} /> : <CirclePause size={22} />}</div>
        <h2>{title}</h2>
        <p>{description}</p>
        <div><button className="cancel-action" type="button" onClick={onCancel}>取消</button><button className={dangerous ? 'danger-action' : 'primary-action'} type="button" onClick={onConfirm}>{actionLabel}</button></div>
      </div>
    </div>
  )
}

export default AutomationWorkspace
