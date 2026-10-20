import { useState } from 'react'
import { knownA2AMembers } from './a2aConversationTypes'
import { AskUserComposer } from './AskUserComposer'
export type IntentDemoQuestion = 'intent' | 'person' | 'pet-goal' | 'pet-members' | 'pet-rounds'
export function A2AIntentDemo({ question, onAnswer, onCancel }: {
  question: IntentDemoQuestion; onAnswer: (answer: string) => void; onCancel: () => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [goal, setGoal] = useState('')
  const [rounds, setRounds] = useState('')
  if (question === 'pet-goal') return <AskUserComposer
    title="这次讨论希望解决什么问题？" description="1 / 3 · 沟通目标。可以选择一个目标，也可以自行填写。" onCancel={onCancel}>
    {['明确数字宠物首期功能范围及暂不做的内容', '确认数字宠物桌面展示、拖动和点击唤起的交互规则', '确认数字宠物提测前的阻塞问题和下一次反馈时间'].map(value => <button key={value} type="button" onClick={() => onAnswer(value)}>{value}</button>)}
    <label className="ask-user-field">其他目标<textarea aria-label="自定义沟通目标" value={goal} onChange={event => setGoal(event.target.value)} placeholder="例如：对齐研发和测试对首期状态切换规则的理解" /></label>
    <button type="button" disabled={!goal.trim()} onClick={() => onAnswer(goal.trim())}>使用填写的目标，下一步</button>
  </AskUserComposer>
  if (question === 'pet-members') return <AskUserComposer
    title="邀请哪些同事参加讨论？" description="2 / 3 · 参与人。你是群主，请选择至少两位其他成员。" onCancel={onCancel}>
    {knownA2AMembers.map(person => <label className="ask-user-member-option" key={person.userId}>
      <input type="checkbox" checked={selected.includes(person.name)} onChange={event => setSelected(current => event.target.checked ? [...current, person.name] : current.filter(name => name !== person.name))} />
      <span><strong>{person.name}</strong><small>{person.name === '陈工' ? '测试' : person.name === '刘工' ? '研发' : person.department}</small></span>
    </label>)}
    <button type="button" disabled={selected.length < 2} onClick={() => onAnswer(selected.join('、'))}>下一步{selected.length > 0 ? `（已选 ${selected.length} 人）` : ''}</button>
  </AskUserComposer>
  if (question === 'pet-rounds') return <AskUserComposer
    title="本次最多进行几轮沟通？" description="3 / 3 · 最大轮次。达到上限后暂停，需要你明确要求才继续。选择轮次后即创建群聊并发送已确定的目标。" onCancel={onCancel}>
    {[1, 3, 5].map(value => <button key={value} type="button" onClick={() => onAnswer(String(value))}>{value} 轮 · 创建并发送</button>)}
    <label className="ask-user-field">其他轮次<input type="number" min="1" step="1" aria-label="自定义最大轮次" value={rounds} onChange={event => setRounds(event.target.value)} /></label>
    <button type="button" disabled={!Number.isSafeInteger(Number(rounds)) || Number(rounds) < 1} onClick={() => onAnswer(rounds)}>按填写轮次创建并发送</button>
  </AskUserComposer>
  const options = question === 'intent'
    ? [{ id: 'query', name: '先查询信息', description: '只查相关信息，不联系别人' }, { id: 'contact', name: '联系同事的分身', description: '向同事确认本周供应商交付风险' }]
    : knownA2AMembers.map(person => ({ id: person.name, name: person.name, description: person.department }))
  return <AskUserComposer title={question === 'intent' ? '你希望先查信息，还是联系同事确认？' : '你想向哪位同事确认本周供应商交付风险？'} onCancel={onCancel}>
    {options.map((option, index) => <button type="button" key={option.id} onClick={() => onAnswer(option.id)}>
      <i>{index + 1}</i><span><strong>{option.name}</strong><small>{option.description}</small></span>
    </button>)}
  </AskUserComposer>
}
