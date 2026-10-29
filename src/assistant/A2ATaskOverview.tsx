import type { A2AConversation, A2AConversationMessage } from './a2aConversationTypes'

import { taskProgress } from './a2aTaskProgress'

type Props = { conversation: A2AConversation; messages: A2AConversationMessage[] }
export default function A2ATaskOverview({ conversation: c, messages }: Props) {
  const goal = c.goal || messages.find(m => m.origin === 'initiator_twin')?.content || '尚未明确，请与我的分身补充本次目标。'
  return <div className="a2a-task-brief" aria-label="任务目标与当前进展">
    <details className="a2a-goal-details" key={c.id}><summary><span>目标</span><p>{goal}</p><small className="a2a-goal-expand">展开</small><small className="a2a-goal-collapse">收起</small></summary><p>{goal}</p></details>
    <div className="a2a-task-current"><span>当前</span><p title={taskProgress(c, messages).text}>{taskProgress(c, messages).text}</p></div>
  </div>
}
