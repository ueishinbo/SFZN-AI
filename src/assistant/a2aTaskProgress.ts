import type { A2AConversation, A2AConversationMessage } from './a2aConversationTypes'

export function taskProgress(c: A2AConversation, messages: A2AConversationMessage[]) {
  const completed = c.status === 'completed'
  const paused = !completed && c.status === 'response_received' && Boolean(c.maxRounds && c.round >= c.maxRounds)
  const pending = !completed && Boolean(c.pendingCurrentUserConfirmation)
  const currentRound = messages.at(-1)?.roundId
  const replies = messages.filter(m => m.roundId === currentRound && m.origin === 'participant_twin')
  const summary = replies.length && c.repliedCount >= c.expectedReplyCount ? c.demo?.roundSummaries?.[String(c.round)] : undefined
  const fact = completed ? (c.completionReason || '本次协作已结束，记录与文件可继续查看。')
    : !messages.length ? '正在同步首条协作消息，请稍候。'
    : pending ? '需要你作出决定，请在下方输入区处理。'
    : paused ? `已完成 ${c.round} 轮沟通，等待发起人决定是否继续。`
    : c.perspective === 'recipient' && c.status === 'response_received' ? '已按你的意见回复，等待发起人安排后续沟通。'
    : c.status === 'response_received' ? '本轮沟通已结束，等待发起人决定下一步。'
    : c.mechanism === 'notice' && c.expectedReplyCount === 0 ? '通知已送达，本条无需逐人回复。'
    : `询问已发送，${c.repliedCount ? '已收到部分回复，' : ''}等待本轮指定成员回复。`
  return { status: completed ? '已完成 · 只读' : !messages.length ? '同步中' : pending ? '待我处理' : paused ? null : '进行中', text: summary && !completed ? `${summary} ${fact}` : fact }
}
