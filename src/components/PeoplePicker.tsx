import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, Search, UserRound, X } from 'lucide-react'
import './people-picker.css'
export type PersonOption = { id: string; name: string; department: string }
export default function PeoplePicker({ options, value, onChange, label = '参与人' }: {
  options: PersonOption[]; value: string[]; onChange: (ids: string[]) => void; label?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const selected = options.filter(person => value.includes(person.id))
  const matched = options.filter(person => `${person.name} ${person.department}`.toLowerCase().includes(query.trim().toLowerCase()))
  useEffect(() => {
    if (!open) return
    search.current?.focus()
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  return <div className="people-picker" ref={root} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.stopPropagation(); event.preventDefault(); setOpen(false); trigger.current?.focus() }
    if (event.key === 'Enter' && event.target === search.current) event.preventDefault()
  }}>
    <div className="people-picker-field">
      <div className="people-picker-chips">{selected.map(person => <span className="people-picker-chip" key={person.id}>
        {person.name}<button type="button" aria-label={`移除${person.name}`} onClick={() => onChange(value.filter(id => id !== person.id))}><X size={12}/></button>
      </span>)}</div>
      <button ref={trigger} className="people-picker-trigger" type="button" aria-label={`选择${label}`} aria-expanded={open} aria-controls={listId} onClick={() => { setOpen(!open); setQuery('') }}>
        <UserRound size={16}/><span>{selected.length ? '添加人员' : '请选择人员'}</span><ChevronDown size={15}/>
      </button>
    </div>
    {open && <div className="people-picker-panel">
      <label className="people-picker-search"><Search size={15}/><input ref={search} aria-label="搜索人员" placeholder="搜索姓名或部门" value={query} onChange={event => setQuery(event.target.value)}/></label>
      <div className="people-picker-options" id={listId} role="listbox" aria-label="人员候选" aria-multiselectable="true">
        {matched.map(person => <button type="button" role="option" aria-selected={value.includes(person.id)} key={person.id} onClick={() => onChange(value.includes(person.id) ? value.filter(id => id !== person.id) : [...value, person.id])}>
          <i>{person.name.slice(0,1)}</i><span><strong>{person.name}</strong><small>{person.department}</small></span>{value.includes(person.id) && <Check size={16}/>}
        </button>)}
        {!matched.length && <p className="people-picker-empty">没有匹配的人员</p>}
      </div>
      <footer><span>已选 {selected.length} 人</span><button type="button" onClick={() => { setOpen(false); trigger.current?.focus() }}>完成选择</button></footer>
    </div>}
  </div>
}
