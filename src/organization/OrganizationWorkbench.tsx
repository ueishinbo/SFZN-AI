import { CheckCircle2, CircleDashed, Clock3, FolderKanban, MoreHorizontal, PlayCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import './organization.css'

type TaskStatus = 'pending' | 'progress' | 'completed'
type TaskCard = { title: string; due: string; priority: '高' | '中' | '低' | '已完成'; owner: string }
type TaskColumn = { id: TaskStatus; title: string; description: string; icon: typeof CircleDashed; cards: TaskCard[] }

const taskBoards: Record<'brain' | 'project', { title: string; description: string; columns: TaskColumn[] }> = {
  brain: {
    title: 'C大脑任务', description: '由 C大脑发起并跟踪的组织协同事项，聚焦计划、分析与管理闭环。', columns: [
      { id: 'pending', title: '待开始', description: '等待负责人启动', icon: CircleDashed, cards: [
        { title: '梳理设计输入与约束条件', due: '9月10日', priority: '高', owner: '李明' },
        { title: '组织总体方案评审会', due: '9月12日', priority: '中', owner: '陈琳' },
        { title: '确认交付物清单与责任人', due: '9月15日', priority: '中', owner: '王伟' },
      ] },
      { id: 'progress', title: '进行中', description: '正在推进与反馈', icon: PlayCircle, cards: [
        { title: '汇总各专业本周进展', due: '今天', priority: '高', owner: '李明' },
        { title: '识别关键节点风险项', due: '9月8日', priority: '高', owner: '陈琳' },
      ] },
      { id: 'completed', title: '已完成', description: '已形成可追溯结果', icon: CheckCircle2, cards: [
        { title: '建立项目协同工作台', due: '9月4日', priority: '已完成', owner: '李明' },
        { title: '明确周报编制模板', due: '9月3日', priority: '已完成', owner: '陈琳' },
        { title: '收集各专业基础资料', due: '9月2日', priority: '已完成', owner: '王伟' },
      ] },
    ],
  },
  project: {
    title: '项目任务', description: '由项目 AI 协助拆解和推进的执行任务，聚焦具体交付与跨角色协同。', columns: [
      { id: 'pending', title: '待开始', description: '等待负责人启动', icon: CircleDashed, cards: [
        { title: '补齐试验验证计划', due: '9月11日', priority: '高', owner: '赵敏' },
        { title: '准备供应商评审材料', due: '9月13日', priority: '中', owner: '周航' },
      ] },
      { id: 'progress', title: '进行中', description: '正在推进与反馈', icon: PlayCircle, cards: [
        { title: '跟进结构件交付风险', due: '今天', priority: '高', owner: '孙捷' },
        { title: '核对设计变更影响范围', due: '9月9日', priority: '中', owner: '赵敏' },
        { title: '编制项目阶段汇报材料', due: '9月10日', priority: '中', owner: '周航' },
      ] },
      { id: 'completed', title: '已完成', description: '已形成可追溯结果', icon: CheckCircle2, cards: [
        { title: '完成项目启动信息同步', due: '9月5日', priority: '已完成', owner: '孙捷' },
        { title: '归档首轮需求澄清记录', due: '9月4日', priority: '已完成', owner: '赵敏' },
      ] },
    ],
  },
}

const priorityClass = (priority: TaskCard['priority']) => priority === '高' ? 'is-high' : priority === '中' ? 'is-medium' : priority === '低' ? 'is-low' : 'is-done'

export default function OrganizationWorkbench() {
  const [source, setSource] = useState<'brain' | 'project'>('brain')
  const board = taskBoards[source]
  const summary = useMemo(() => board.columns.reduce((total, column) => total + column.cards.length, 0), [board])

  return (
    <section className="organization-workbench organization-workbench--task-center">
      <header className="org-task-center-header">
        <div><span className="org-task-center-kicker">组织智能</span><h1>任务协同</h1><p>在同一个工作台查看组织管理事项与项目 AI 执行任务。</p></div>
        <span className="org-header-icon"><FolderKanban size={27} /></span>
      </header>
      <div className="org-task-source-tabs" role="tablist" aria-label="任务来源">
        <button className={source === 'brain' ? 'active' : ''} type="button" role="tab" aria-selected={source === 'brain'} onClick={() => setSource('brain')}>C大脑任务</button>
        <button className={source === 'project' ? 'active' : ''} type="button" role="tab" aria-selected={source === 'project'} onClick={() => setSource('project')}>项目任务</button>
      </div>
      <section className="org-task-board-intro"><div><h2>{board.title}</h2><p>{board.description}</p></div><span>{summary} 项任务</span></section>
      <div className="org-plan-board org-task-source-board">
        {board.columns.map((column) => {
          const StatusIcon = column.icon
          return <section className={`org-plan-column org-plan-column--${column.id}`} key={column.id}>
            <header><span><StatusIcon size={20} /><strong>{column.title}</strong><em>{column.cards.length}</em></span><button type="button" aria-label={`${column.title}更多操作`}><MoreHorizontal size={19} /></button></header>
            <small className="org-column-description">{column.description}</small>
            <div className="org-plan-cards">{column.cards.map((card, index) => <article className="org-plan-card" key={card.title}>
              <div className="org-plan-card-title"><span className="org-card-index">{index + 1}</span><strong>{card.title}</strong></div>
              <div><span className={`org-priority ${priorityClass(card.priority)}`}>{card.priority}</span><span className="org-card-date"><Clock3 size={13} />{card.due}</span></div>
              <footer><span className="org-avatar">{card.owner.slice(0, 1)}</span><small>{card.owner}</small></footer>
            </article>)}</div>
          </section>
        })}
      </div>
    </section>
  )
}
