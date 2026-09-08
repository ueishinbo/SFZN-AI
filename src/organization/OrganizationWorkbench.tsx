import { ArrowLeft, Bot, CalendarDays, CheckCircle2, ChevronRight, CircleDashed, Clock3, FileCheck2, FileText, FolderKanban, MessageSquareText, MoreHorizontal, PlayCircle, Search, Sparkles, UsersRound } from 'lucide-react'
import { useState } from 'react'
import './organization.css'

type WorkbenchItem = {
  id: string
  title: string
  description: string
  icon: typeof Sparkles
  tone: 'blue' | 'violet' | 'orange' | 'green'
}

const workbenches: WorkbenchItem[] = [
  { id: 'weekly', title: '周报智能编制', description: '汇总本周进展、风险与下周重点', icon: FileText, tone: 'blue' },
  { id: 'risk', title: '项目风险识别', description: '识别关键节点与潜在交付风险', icon: Sparkles, tone: 'orange' },
  { id: 'meeting', title: '会议纪要落实', description: '将会议结论自动拆解为行动计划', icon: MessageSquareText, tone: 'violet' },
  { id: 'review', title: '需求评审协同', description: '组织跨角色评审与意见归集', icon: UsersRound, tone: 'blue' },
  { id: 'delivery', title: '交付物检查', description: '检查交付材料的完整性与一致性', icon: FileCheck2, tone: 'green' },
  { id: 'knowledge', title: '项目知识问答', description: '快速定位项目资料与历史决策', icon: Bot, tone: 'violet' },
]

const planColumns = [
  {
    id: 'pending', title: '待开始', count: 3, icon: CircleDashed,
    cards: [
      ['梳理设计输入与约束条件', '9月10日', '高'],
      ['组织总体方案评审会', '9月12日', '中'],
      ['确认交付物清单与责任人', '9月15日', '中'],
    ],
  },
  {
    id: 'progress', title: '进行中', count: 2, icon: PlayCircle,
    cards: [
      ['汇总各专业本周进展', '今天', '高'],
      ['识别关键节点风险项', '9月8日', '高'],
    ],
  },
  {
    id: 'completed', title: '已完成', count: 3, icon: CheckCircle2,
    cards: [
      ['建立项目协同工作台', '9月4日', '已完成'],
      ['明确周报编制模板', '9月3日', '已完成'],
      ['收集各专业基础资料', '9月2日', '已完成'],
    ],
  },
]

export default function OrganizationWorkbench() {
  const [selected, setSelected] = useState<WorkbenchItem | null>(null)
  const [tab, setTab] = useState<'plan' | 'tasks'>('plan')

  if (selected) {
    return (
      <section className="organization-workbench organization-workbench--detail">
        <header className="org-detail-header">
          <button type="button" className="org-crumb" onClick={() => setSelected(null)}><ArrowLeft size={18} /><span>组织智能工作台</span></button>
          <ChevronRight size={16} className="org-crumb-separator" />
          <strong>{selected.title}</strong>
          <span className="org-demo-badge">演示任务</span>
        </header>

        <div className="org-detail-content">
          <div className="org-detail-title-row">
            <div><span className={`org-icon org-icon--${selected.tone}`}><selected.icon size={23} /></span><div><h1>{selected.title}</h1><p>{selected.description}，由 AI 协助完成计划编排和过程跟踪。</p></div></div>
            <div className="org-detail-meta"><CalendarDays size={16} />更新于今天 09:30</div>
          </div>

          <div className="org-tabs" role="tablist">
            <button className={tab === 'plan' ? 'active' : ''} type="button" onClick={() => setTab('plan')}>计划</button>
            <button className={tab === 'tasks' ? 'active' : ''} type="button" onClick={() => setTab('tasks')}>任务</button>
          </div>

          {tab === 'plan' ? (
            <div className="org-plan-board">
              {planColumns.map((column) => {
                const StatusIcon = column.icon
                return <section className={`org-plan-column org-plan-column--${column.id}`} key={column.id}>
                  <header><span><StatusIcon size={19} /><strong>{column.title}</strong><em>{column.count}</em></span><button type="button" aria-label={`${column.title}更多操作`}><MoreHorizontal size={19} /></button></header>
                  <div className="org-plan-cards">
                    {column.cards.map(([title, date, tag], index) => <article className="org-plan-card" key={title}>
                      <div className="org-plan-card-title"><span className="org-card-index">{index + 1}</span><strong>{title}</strong></div>
                      <div><span className={`org-priority ${tag === '高' ? 'is-high' : tag === '中' ? 'is-medium' : 'is-done'}`}>{tag}</span><span className="org-card-date"><Clock3 size={13} />{date}</span></div>
                      <footer><span className="org-avatar">{['李', '陈', '王'][index]}</span><small>{index === 0 ? '李明' : index === 1 ? '陈琳' : '王伟'}</small></footer>
                    </article>)}
                  </div>
                </section>
              })}
            </div>
          ) : (
            <div className="org-task-list-view">
              <div className="org-task-list-head"><span>任务名称</span><span>状态</span><span>负责人</span><span>计划完成时间</span></div>
              {planColumns.flatMap((column) => column.cards).map(([title, date, tag], index) => <div className="org-task-list-row" key={title}><strong>{title}</strong><span className={`org-priority ${tag === '高' ? 'is-high' : tag === '中' ? 'is-medium' : 'is-done'}`}>{tag === '已完成' ? '已完成' : tag === '高' ? '进行中' : '待开始'}</span><span className="org-person"><i>{['李', '陈', '王'][index % 3]}</i>{['李明', '陈琳', '王伟'][index % 3]}</span><span>{date}</span></div>)}
            </div>
          )}
        </div>
        <div className="org-ai-composer"><div><Sparkles size={18} /><span>请输入任务指令，AI 将协助拆解计划与推进事项</span></div><button type="button" disabled title="演示版暂不支持发送"><ArrowLeft size={18} /></button></div>
      </section>
    )
  }

  return (
    <section className="organization-workbench">
      <header className="org-home-header"><div><span className="org-eyebrow">ORGANIZATION WORKBENCH</span><h1>组织智能工作台</h1><p>围绕组织目标，快速进入常用协同任务，让 AI 帮助团队有序推进。</p></div><div className="org-header-icon"><FolderKanban size={28} /></div></header>
      <div className="org-overview"><article><span className="org-overview-icon blue"><PlayCircle size={19} /></span><div><strong>8</strong><span>进行中任务</span></div></article><article><span className="org-overview-icon orange"><Clock3 size={19} /></span><div><strong>12</strong><span>本周待处理</span></div></article><article><span className="org-overview-icon green"><CheckCircle2 size={19} /></span><div><strong>24</strong><span>本月已完成</span></div></article></div>
      <div className="org-section-title"><div><h2>任务入口</h2><p>选择一个场景，开始组织协同工作。</p></div><label><Search size={17} /><input placeholder="搜索任务入口" readOnly /></label></div>
      <div className="org-entry-grid">{workbenches.map((item) => { const Icon = item.icon; return <button className="org-entry-card" type="button" key={item.id} onClick={() => setSelected(item)}><span className={`org-icon org-icon--${item.tone}`}><Icon size={22} /></span><span className="org-entry-main"><strong>{item.title}</strong><small>{item.description}</small></span><ChevronRight size={19} /></button> })}</div>
    </section>
  )
}
