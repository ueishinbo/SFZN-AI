import { type CollaborationIssue } from './a2aIssues'
import PeoplePicker from '../components/PeoplePicker'
import { useId, useRef, useState } from 'react'
import { Dialog } from '../role-center/ui'
import { knownA2AMembers, type A2AConversation, type A2AConversationMember } from './a2aConversationTypes'
export type A2AGroupInput = { stayInTask?: boolean; title: string; goal: string; members: A2AConversationMember[]; maxRounds: number; sourceTask?: A2AConversation['sourceTask']; issue?: CollaborationIssue }
export default function CreateA2AGroupDialog({ onClose, onCreate, source, issue, issues = [] }: { issue?: CollaborationIssue; issues?: (CollaborationIssue & {source?: A2AConversation['sourceTask']})[]; source?: A2AConversation['sourceTask']; onClose: () => void; onCreate: (input: A2AGroupInput) => void }) {
  const formId = useId()
  const [issueId, setIssueId] = useState(issue?.id ?? '')
  const chosenIssue = issue ?? issues.find(item => item.id === issueId)
  const chosenSource = source ?? issues.find(item => item.id === issueId)?.source
  const [title, setTitle] = useState('')
  const [goal, setGoal] = useState('')
  const [members, setMembers] = useState<string[]>([])
  const [rounds, setRounds] = useState('3')
  const [error, setError] = useState('')
  const submitting = useRef(false)
  const valid = title.trim() && goal.trim() && members.length >= 2 && Number.isSafeInteger(Number(rounds)) && Number(rounds) >= 1
  return <Dialog title="新建群聊" onClose={onClose} wide footer={<><button type="button" onClick={onClose}>取消</button><button className="rc-primary" type="submit" form={formId} disabled={!valid}>创建群聊</button></>}>
    <form id={formId} className="a2a-create-form" onSubmit={event => {
      event.preventDefault()
      if (!valid || submitting.current) return
      submitting.current = true
      try { onCreate({title:title.trim(),goal:goal.trim(),members:knownA2AMembers.filter(member => members.includes(member.userId)),maxRounds:Number(rounds),sourceTask:chosenSource,issue:chosenIssue}) }
      catch { setError('创建失败，已保留输入，请重试。'); submitting.current=false }
    }}>
      {issue ? <p className="issue-muted">所属事项：{issue.title}</p> : <label className="rc-field">所属事项<select value={issueId} onChange={event => setIssueId(event.target.value)}><option value="">新事项（根据本次会话自动建立）</option>{issues.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select><small>无需单独填写事项表单；也可以加入已有事项。</small></label>}
      {chosenSource && <p className="issue-muted">来源任务：{chosenSource.titleAtReference} · {chosenSource.platform}</p>}
      <label className="rc-field">群名称<input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="例如：本周供应商交付沟通" required /></label>
      <div className="rc-field"><span>参与人</span>
        <PeoplePicker options={knownA2AMembers.map(member => ({id:member.userId,name:member.name,department:member.department}))} value={members} onChange={setMembers}/>
        <small>你将作为群主加入，请再选择至少两位成员。</small>
      </div>
      <label className="rc-field">沟通目标<textarea value={goal} onChange={event => setGoal(event.target.value)} placeholder="希望大家讨论什么、回复哪些信息？" rows={3} required /></label>
      <label className="rc-field">最大轮次<input type="number" min="1" step="1" value={rounds} onChange={event => setRounds(event.target.value)} required /><small>达到该轮次后暂停，由群主明确要求继续。初始建议为 3 轮，可修改。</small></label>
      {error && <p role="alert">{error}</p>}
    </form>
  </Dialog>
}
