import { useWorkingGroupPlayback } from './useWorkingGroupPlayback'
import WorkingGroupNode from './WorkingGroupNode'
import type { WorkingGroupRun } from './types'
import './working-group.css'

export default function WorkingGroupExecutionView({ run }: { run: WorkingGroupRun }) {
  const { statuses, thinking, content, members, confirm, doneCount, total, isComplete } =
    useWorkingGroupPlayback(run)

  return (
    <section className="wg-view">
      <header className="wg-header">
        <div>
          <p>工作小组</p>
          <h1>{run.title}</h1>
        </div>
        <div className="wg-members">
          {members.map((m) => (
            <span key={m.id} className={`wg-member wg-member--${m.color}`}>
              <i>{m.person.slice(0, 1)}</i>
              {m.role}
            </span>
          ))}
        </div>
        <span className="wg-progress">{isComplete ? '已完成' : `进行中 ${doneCount}/${total}`}</span>
      </header>

      <div className="wg-orchestration">
        <span>◎ 编排完成</span>
        <span>{run.orchestrationSummary.join(' · ')}</span>
      </div>

      {run.phases.map((phase) => (
        <section key={phase.id} className="wg-phase">
          <h2>{phase.title}</h2>
          <div className="wg-track">
            {run.nodes
              .filter((n) => n.phaseId === phase.id)
              .map((n) => (
                <WorkingGroupNode
                  key={n.id}
                  node={n}
                  status={statuses[n.id]}
                  thinkingCount={thinking[n.id] ?? 0}
                  content={content[n.id] ?? ''}
                  members={members}
                  onConfirm={() => confirm(n.id)}
                />
              ))}
          </div>
        </section>
      ))}
    </section>
  )
}
