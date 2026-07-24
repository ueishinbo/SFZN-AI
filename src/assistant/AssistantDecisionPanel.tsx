import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  Check,
  Search,
  Send,
} from 'lucide-react'
import {
  buildDecisionFlow,
  type AssistantDecision,
  type DecisionAnswer,
  type DecisionAnswers,
  type DecisionFlowSpec,
  type DecisionFlowStep,
  type DecisionNotes,
  type DecisionResolution,
} from './assistantDecisionFlow'

export type { AssistantDecision, DecisionResolution } from './assistantDecisionFlow'

function initialAnswers(flow: DecisionFlowSpec): DecisionAnswers {
  return Object.fromEntries(flow.steps.flatMap((step) => {
    if (!step.defaultOptionId) return []
    if (step.control.type === 'single_select') {
      const option = step.control.options.find((item) => item.id === step.defaultOptionId)
      return option ? [[step.id, { optionId: option.id, label: option.label, value: option.value } satisfies DecisionAnswer]] : []
    }
    if (step.control.type === 'person_select') {
      const person = step.control.candidates.find((item) => item.id === step.defaultOptionId)
      return person ? [[step.id, { optionId: person.id, label: person.name, value: person.name } satisfies DecisionAnswer]] : []
    }
    return []
  }))
}

function resolveCopy(copy: DecisionFlowStep['title'] | DecisionFlowStep['description'], answers: DecisionAnswers) {
  return typeof copy === 'function' ? copy(answers) : copy
}

function DeferButton({ onDefer }: { onDefer: () => void }) {
  return (
    <button className="assistant-decision-defer" type="button" onClick={onDefer}>
      稍后处理 <kbd>ESC</kbd>
    </button>
  )
}

export default function AssistantDecisionPanel({
  decision,
  onDefer,
  onResolve,
}: {
  decision: AssistantDecision
  onDefer: () => void
  onResolve: (resolution: DecisionResolution) => void
}) {
  const flow = useMemo(() => buildDecisionFlow(decision), [decision])
  const panelRef = useRef<HTMLElement>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<DecisionAnswers>(() => initialAnswers(flow))
  const [notes, setNotes] = useState<DecisionNotes>({})
  const [personSearchOpen, setPersonSearchOpen] = useState(false)
  const [personQuery, setPersonQuery] = useState('')
  const [customStepId, setCustomStepId] = useState<string | null>(null)
  const [customValues, setCustomValues] = useState<Record<string, string>>({})

  useEffect(() => {
    setStepIndex(0)
    setAnswers(initialAnswers(flow))
    setNotes({})
    setPersonSearchOpen(false)
    setPersonQuery('')
    setCustomStepId(null)
    setCustomValues({})
  }, [flow])

  useEffect(() => {
    const focusTarget = panelRef.current?.querySelector<HTMLElement>('button, input, textarea')
    focusTarget?.focus()
  }, [])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDefer()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onDefer])

  const step = flow.steps[stepIndex]
  const isLastStep = stepIndex === flow.steps.length - 1
  const answer = answers[step.id]
  const canContinue = !step.required || Boolean(answer?.value.trim())

  const chooseAnswer = (nextAnswer: DecisionAnswer) => {
    setAnswers((current) => ({ ...current, [step.id]: nextAnswer }))
    setCustomStepId(null)
  }

  const renderSingleSelect = () => {
    if (step.control.type !== 'single_select') return null
    const control = step.control

    return (
      <div className="assistant-decision-options">
        {control.options.map((option, index) => {
          const selected = answer?.optionId === option.id
          return (
            <button
              className={selected ? 'selected' : ''}
              type="button"
              key={option.id}
              onClick={() => chooseAnswer({ optionId: option.id, label: option.label, value: option.value })}
            >
              <i>{index + 1}</i>
              <span>{option.label}</span>
              {selected ? <Check size={17} /> : <ArrowRight size={17} />}
            </button>
          )
        })}
        {control.allowOther && (
          <>
            <button
              className={customStepId === step.id ? 'selected' : ''}
              type="button"
              onClick={() => {
                setCustomStepId(step.id)
                setAnswers((current) => ({ ...current, [step.id]: undefined }))
              }}
            >
              <i>✎</i>
              <span>其他补充…</span>
              <ArrowRight size={17} />
            </button>
            {customStepId === step.id && (
              <label className="assistant-decision-custom">
                <input
                  autoFocus
                  value={customValues[step.id] ?? ''}
                  onChange={(event) => {
                    const value = event.target.value
                    setCustomValues((current) => ({ ...current, [step.id]: value }))
                    setAnswers((current) => ({
                      ...current,
                      [step.id]: value.trim()
                        ? { optionId: 'custom', label: value.trim(), value: value.trim() }
                        : undefined,
                    }))
                  }}
                  placeholder="输入你的具体要求"
                />
              </label>
            )}
          </>
        )}
        {control.note && (
          <label className="assistant-decision-note">
            <span>{control.note.label}</span>
            <textarea
              value={notes[step.id] ?? ''}
              onChange={(event) => setNotes((current) => ({ ...current, [step.id]: event.target.value }))}
              placeholder={control.note.placeholder}
            />
          </label>
        )}
      </div>
    )
  }

  const renderPersonSelect = () => {
    if (step.control.type !== 'person_select') return null
    const control = step.control
    const normalizedQuery = personQuery.trim().toLowerCase()
    const visiblePeople = control.candidates.filter((person) => {
      if (!personSearchOpen && !person.recommended) return false
      if (!normalizedQuery) return true
      return [person.name, person.department, person.role]
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    })

    return (
      <div className="assistant-decision-people">
        {personSearchOpen && (
          <label className="assistant-people-search">
            <Search size={17} />
            <input
              autoFocus
              value={personQuery}
              onChange={(event) => setPersonQuery(event.target.value)}
              placeholder="搜索姓名、部门或岗位"
            />
          </label>
        )}
        <div className="assistant-people-list">
          {visiblePeople.map((person, index) => {
            const selected = answer?.optionId === person.id
            return (
              <button
                className={selected ? 'selected' : ''}
                type="button"
                key={person.id}
                onClick={() => chooseAnswer({ optionId: person.id, label: person.name, value: person.name })}
              >
                <i>{index + 1}</i>
                <span>
                  <strong>{person.name}</strong>
                  <small>{person.department} · {person.role}</small>
                </span>
                <em>{selected && <Check size={15} />}</em>
              </button>
            )
          })}
          {control.allowSearch && !personSearchOpen && (
            <button className="assistant-people-more" type="button" onClick={() => setPersonSearchOpen(true)}>
              <i>⌕</i>
              <span>
                <strong>选择其他成员</strong>
                <small>按姓名、部门或岗位搜索组织成员</small>
              </span>
              <em><ArrowRight size={15} /></em>
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderReview = () => {
    if (step.control.type !== 'review') return null
    const control = step.control
    const rows = typeof control.rows === 'function' ? control.rows(answers) : control.rows

    return (
      <>
        <dl className="assistant-decision-fields">
          {rows.map((row) => (
            <div className="assistant-decision-field" key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
        {control.callout && (
          <div className="assistant-decision-callout">
            <BellRing size={17} />
            <span>{control.callout}</span>
          </div>
        )}
      </>
    )
  }

  const handlePrimary = () => {
    if (!canContinue) return
    if (!isLastStep) {
      setStepIndex((current) => current + 1)
      setCustomStepId(null)
      return
    }
    onResolve(flow.resolve(answers, notes))
  }

  const primaryLabel = isLastStep ? flow.finalAction.label : '继续'
  const PrimaryIcon = isLastStep
    ? flow.finalAction.icon === 'send' ? Send : Check
    : ArrowRight
  const title = resolveCopy(step.title, answers)
  const description = resolveCopy(step.description, answers)

  return (
    <section
      className={`assistant-decision-panel assistant-decision-panel--${flow.purpose}`}
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label="用户决策"
    >
      <header className="assistant-decision-header">
        <div className="assistant-decision-header-main">
          <span>{flow.contextLabel}</span>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        {flow.steps.length > 1 && (
          <div className="assistant-decision-stepper">
            <button
              type="button"
              aria-label="返回上一步"
              disabled={stepIndex === 0}
              onClick={() => {
                setStepIndex((current) => Math.max(0, current - 1))
                setCustomStepId(null)
              }}
            >
              <ArrowLeft size={17} />
            </button>
            <span>{stepIndex + 1}/{flow.steps.length}</span>
          </div>
        )}
      </header>

      <div className="assistant-decision-content">
        {renderSingleSelect()}
        {renderPersonSelect()}
        {renderReview()}
      </div>

      <footer className="assistant-decision-actions">
        <DeferButton onDefer={onDefer} />
        {isLastStep && flow.secondaryAction && (
          <button
            className="assistant-decision-secondary"
            type="button"
            onClick={() => onResolve(flow.secondaryAction!.resolve)}
          >
            {flow.secondaryAction.label}
          </button>
        )}
        <button
          className="assistant-decision-primary"
          type="button"
          disabled={!canContinue}
          onClick={handlePrimary}
        >
          {primaryLabel}<PrimaryIcon size={17} />
        </button>
      </footer>
    </section>
  )
}
