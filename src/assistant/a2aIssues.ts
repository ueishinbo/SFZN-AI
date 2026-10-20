import type { A2AConversation } from './a2aConversationTypes'
export type CollaborationIssue = { id: string; title: string; goal: string }
export function issueOf(c: A2AConversation): CollaborationIssue {
  const source = c.sourceTask
  return { id: source ? JSON.stringify([source.platform, source.application, source.taskId]) : c.issue?.id ?? `issue-${c.id}`, title: c.issue?.title ?? source?.titleAtReference ?? c.title, goal: c.issue?.goal ?? (source ? source.titleAtReference : c.goal ?? c.title) }
}
export function issueOptions(conversations: A2AConversation[]) {
  return [...new Map(conversations.map(c => [issueOf(c).id, { ...issueOf(c), source: c.sourceTask }])).values()]
}
