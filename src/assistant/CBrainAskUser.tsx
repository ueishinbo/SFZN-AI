import { useState } from 'react'
import { AskUserComposer } from './AskUserComposer'

export function CBrainAskUser({ question, onAnswer, onCancel }: {
  question: 'category' | 'form'
  onAnswer: (answer: string) => void
  onCancel: () => void
}) {
  const [answer, setAnswer] = useState('')
  const options = question === 'category'
    ? [{ title: '报销表单', detail: '查找费用报销相关入口' }, { title: '请假申请', detail: '人事系统 · 请假申请' }]
    : [{ title: '差旅报销申请', detail: '财务系统 · 出差交通、住宿等费用' }, { title: '日常费用报销申请', detail: '财务系统 · 日常办公等费用' }]
  return <AskUserComposer
    title={question === 'category' ? '你想处理哪一类表单？' : '你想打开哪个报销表单？'}
    description={question === 'category' ? '可以选择一个类别，也可以填写具体名称或用途。' : '请选择对应入口，确认后我会提供打开链接。'}
    onCancel={onCancel}>
    {options.map((option, index) => <button key={option.title} type="button" onClick={() => onAnswer(option.title)}>
      <i>{index + 1}</i><span><strong>{option.title}</strong><small>{option.detail}</small></span>
    </button>)}
    <label className="ask-user-field">补充说明<input aria-label="补充表单需求" placeholder="例如：差旅报销申请" value={answer} onChange={event => setAnswer(event.target.value)}
      onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing && answer.trim()) { event.preventDefault(); onAnswer(answer.trim()) } }} /></label>
    <button type="button" disabled={!answer.trim()} onClick={() => onAnswer(answer.trim())}>确认补充</button>
  </AskUserComposer>
}
