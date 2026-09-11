import { ArrowLeft, CheckCircle2, ChevronRight, CircleDashed, Clock3, Factory, FolderKanban, FlaskConical, PlayCircle, Search, ShieldCheck, Truck } from 'lucide-react'
import { useState } from 'react'
import type { A2AConversation } from '../assistant/a2aConversationTypes'
import { projects, conversationIdFor, taskStatus, type ProjectTask } from './projectData'
import './organization.css'

const icons = { production: Factory, supply: Truck, quality: ShieldCheck, engineering: FlaskConical }
const columns = [
  { id: 'pending', title: '待开始', icon: CircleDashed },
  { id: 'progress', title: '进行中', icon: PlayCircle },
  { id: 'completed', title: '已完成', icon: CheckCircle2 },
] as const

export default function OrganizationWorkbench({ conversations, onOpenConversation }: {
  conversations: A2AConversation[]
  onOpenConversation: (id: string) => void
}) {
  const [projectId, setProjectId] = useState<string | null>(null)
  const [tab, setTab] = useState<'plan' | 'tasks'>('plan')
  const [query, setQuery] = useState('')
  const selected = projects.find(project => project.id === projectId)
  const statusOf = (task: ProjectTask) => taskStatus(task, conversations.find(c => c.id === conversationIdFor(task)))
  const open = (task: ProjectTask) => onOpenConversation(conversationIdFor(task))
  if (selected) {
    const Icon = icons[selected.id as keyof typeof icons]
    return <section className="organization-workbench organization-workbench--detail org-project-detail">
      <header className="org-detail-header"><button type="button" className="org-crumb" onClick={() => setProjectId(null)}><ArrowLeft size={18}/><span>系统智能</span></button><ChevronRight size={16}/><strong>{selected.title}</strong></header>
      <div className="org-detail-content">
        <div className="org-detail-title-row"><div><span className={`org-icon org-icon--${selected.tone}`}><Icon size={23}/></span><div><h1>{selected.title}</h1><p>{selected.description}</p></div></div></div>
        <div className="org-tabs" role="tablist" aria-label="项目任务视图">
          <button type="button" role="tab" aria-selected={tab==='plan'} className={tab==='plan'?'active':''} onClick={()=>setTab('plan')}>计划</button>
          <button type="button" role="tab" aria-selected={tab==='tasks'} className={tab==='tasks'?'active':''} onClick={()=>setTab('tasks')}>任务</button>
        </div>
        {tab === 'plan' ? <div className="org-plan-board">{columns.map(column=>{
          const StatusIcon=column.icon, tasks=selected.tasks.filter(task=>statusOf(task)===column.id)
          return <section className={`org-plan-column org-plan-column--${column.id}`} key={column.id}>
            <header><span><StatusIcon size={19}/><strong>{column.title}</strong><em>{tasks.length}</em></span></header>
            <div className="org-plan-cards">{tasks.map(task=><button type="button" className="org-plan-card org-task-card-button" key={task.id} onClick={()=>open(task)}>
              <div className="org-plan-card-title"><strong>{task.title}</strong><ChevronRight size={16}/></div>
              <p className="org-task-goal">{task.goal}</p>
              <div><span className={`org-priority ${task.priority==='高'?'is-high':'is-medium'}`}>{task.priority}优先级</span><span className="org-card-date"><Clock3 size={13}/>{task.due}</span></div>
              <footer><span className="org-avatar">{task.owner.slice(0,1)}</span><small>{task.owner} · 负责人</small><span className="org-a2a-link">A2A 协作</span></footer>
            </button>)}{!tasks.length && <p className="org-empty-column">暂无{column.title}任务</p>}</div>
          </section>
        })}</div> : <div className="org-task-list-view">
          <div className="org-task-list-head"><span>任务名称</span><span>状态</span><span>负责人</span><span>计划完成时间</span></div>
          {selected.tasks.map(task=><button type="button" key={task.id} className="org-task-list-row org-task-row-button" onClick={()=>open(task)}><strong>{task.title}</strong><span>{columns.find(c=>c.id===statusOf(task))?.title}</span><span>{task.owner}</span><span>{task.due}</span></button>)}
        </div>}
      </div>
    </section>
  }
  const filtered = projects.filter(project=>`${project.title}${project.description}`.includes(query.trim()))
  return <section className="organization-workbench">
    <header className="org-home-header"><div><span className="org-eyebrow">SYSTEM INTELLIGENCE</span><h1>系统智能</h1><p>围绕生产、供应链、质量与研发，跟踪项目任务和跨岗位协作。</p></div><div className="org-header-icon"><FolderKanban size={28}/></div></header>
    <div className="org-section-title"><div><h2>项目</h2><p>进入项目查看任务，跟进数字分身的协作进展。</p></div><label><Search size={17}/><input aria-label="搜索项目" placeholder="搜索项目" value={query} onChange={event=>setQuery(event.target.value)}/></label></div>
    <div className="org-entry-grid org-project-grid">{filtered.map(project=>{const Icon=icons[project.id as keyof typeof icons];return <button className="org-entry-card" type="button" key={project.id} onClick={()=>{setProjectId(project.id);setTab('plan')}}><span className={`org-icon org-icon--${project.tone}`}><Icon size={24}/></span><span className="org-entry-main"><strong>{project.title}</strong><small>{project.description}</small></span><ChevronRight size={19}/></button>})}</div>
    {!filtered.length && <p className="org-empty-column">没有匹配的项目，请调整搜索内容。</p>}
  </section>
}
