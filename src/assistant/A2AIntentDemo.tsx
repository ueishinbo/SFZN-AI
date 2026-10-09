import { knownA2AMembers } from './a2aConversationTypes'
import { AskUserComposer } from './AskUserComposer'
export type IntentDemoQuestion = 'intent' | 'person'
export function A2AIntentDemo({ question, onAnswer, onCancel }: {
  question: IntentDemoQuestion; onAnswer: (answer: string) => void; onCancel: () => void
}) {
  const options = question === 'intent'
    ? [{ id: 'query', name: '先查询信息', description: '只查相关信息，不联系别人' }, { id: 'contact', name: '联系同事的分身', description: '向同事确认本周供应商交付风险' }]
    : knownA2AMembers.map(person => ({ id: person.name, name: person.name, description: person.department }))
  return <AskUserComposer title={question === 'intent' ? '你希望先查信息，还是联系同事确认？' : '你想向哪位同事确认本周供应商交付风险？'} onCancel={onCancel}>
    {options.map((option, index) => <button type="button" key={option.id} onClick={() => onAnswer(option.id)}>
      <i>{index + 1}</i><span><strong>{option.name}</strong><small>{option.description}</small></span>
    </button>)}
  </AskUserComposer>
}
