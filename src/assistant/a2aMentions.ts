import type { A2AConversation, A2AConversationMember } from './a2aConversationTypes'
export function replyCandidates(conversation: A2AConversation): A2AConversationMember[] {
  const all = [{userId:conversation.hostUserId, name:conversation.hostName, department:'发起人', color:'blue' as const}, ...conversation.members]
  return [...new Map(all.filter(member => member.userId !== 'current-user').map(member => [member.userId, member])).values()]
}
export function resolveMentions(text: string, candidates: A2AConversationMember[]) {
  const tokens = [...text.matchAll(/@([^\s@，。！？、:：;；]+)/g)].map(match => match[1])
  const unknown = tokens.filter(name => name !== '所有人' && !candidates.some(member => member.name === name))
  const ambiguous = tokens.filter(name => candidates.filter(member => member.name === name).length > 1)
  const all = tokens.length === 0 || tokens.includes('所有人')
  return { ids: candidates.filter(member => all || tokens.includes(member.name)).map(member => member.userId), error: unknown.length ? `无法找到本会话成员：${unknown.join('、')}。请从 @ 列表中选择。` : ambiguous.length ? '存在同名成员，请先明确对象，本次未发送。' : /@\s*$/.test(text) ? '请先选择 @ 对象。' : '' }
}
export function isPublicReply(text: string) {
  if (/(先别|不要|不用|暂不).*(发|回复|通知)|帮我(理解|分析|解释|拟|写)|这段.*(意思|怎么理解)/.test(text)) return false
  return /^\s*@/.test(text) || /回复|发到|群里说|发给|发送|通知|告诉|帮我问|下一轮|再.*一轮/.test(text)
}
