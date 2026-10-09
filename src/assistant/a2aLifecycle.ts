import type { A2AConversation, A2AUserConfirmation } from './a2aConversationTypes'
export const canManageA2A = (conversation: A2AConversation) => conversation.hostUserId === 'current-user' && conversation.perspective !== 'recipient'
export const a2aBoardState = (conversation: A2AConversation) => conversation.status === 'completed' ? 'done' : conversation.pendingCurrentUserConfirmation ? 'confirm' : 'doing'
export function completeA2A(conversation: A2AConversation): A2AConversation {
  if (!canManageA2A(conversation) || conversation.status === 'completed') return conversation
  return { ...conversation, status: 'completed', completedAt: new Date().toISOString(), completionSource: 'host', completionReason: '群主确认本次 A2A 沟通已完成', pendingCurrentUserConfirmation: undefined, preview: '群主已确认完成本次沟通', updatedAt: '刚刚' }
}
export function completionQuestion(conversation: A2AConversation): A2AUserConfirmation {
  return { id: `finish-${conversation.id}-${Date.now()}`, question: '确认本次 A2A 沟通已完成？', description: '确认后所有成员均只能查看历史消息和附件，不能继续聊天。本操作不修改 C 大脑任务状态。', resumeStatus: 'response_received', resumePreview: conversation.preview, choices: [
    { id: 'finish', label: '确认完成', description: '移入已完成，保留记录并设为只读', commandAction: 'complete', commandContent: '群主确认本次 A2A 沟通已完成。' },
    { id: 'keep', label: '继续沟通', description: '保持当前会话开放' },
  ] }
}
