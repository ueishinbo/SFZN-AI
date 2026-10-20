import { useEffect, useId, useRef, useState } from 'react'
import { Check, MoreHorizontal, Pencil, RotateCcw, Trash2 } from 'lucide-react'

type Props = {
  title: string
  completed: boolean
  onChangeStatus: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function TaskActionsMenu({ title, completed, onChangeStatus, onEdit, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const [above, setAbove] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    menu.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])

  const run = (action: () => void) => { setOpen(false); action() }

  return <div className="tp-task-actions" ref={root} onKeyDown={event => {
    if (!open) return
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus()
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      const items = [...menu.current?.querySelectorAll<HTMLButtonElement>('button') ?? []]
      const index = items.findIndex(item => item === document.activeElement)
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
      items[next]?.focus()
    } else if (event.key === 'Tab') setOpen(false)
  }}>
    <button className="tp-actions-trigger" ref={trigger} aria-label={`${title}的更多操作`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => {
      setAbove((trigger.current?.getBoundingClientRect().bottom ?? 0) > window.innerHeight - 190)
      setOpen(value => !value)
    }}><MoreHorizontal size={20}/></button>
    {open && <div className={`tp-action-menu ${above ? 'opens-above' : ''}`} id={menuId} role="menu" aria-label="任务操作" ref={menu}>
      <button role="menuitem" onClick={() => run(onChangeStatus)}>{completed ? <RotateCcw size={16}/> : <Check size={16}/>}<span>{completed ? '恢复进行中' : '标记已完成'}</span></button>
      <button role="menuitem" onClick={() => run(onEdit)}><Pencil size={16}/><span>编辑名称与目标</span></button>
      <div className="tp-menu-divider" role="separator"/>
      <button className="tp-menu-delete" role="menuitem" onClick={() => run(onDelete)}><Trash2 size={16}/><span>删除任务</span></button>
    </div>}
  </div>
}
