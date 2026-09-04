import { Activity, ArrowUpRight, CheckCircle2, CircleAlert } from 'lucide-react'
import { overviewActivities, overviewMetrics } from './mockAdminData'

export default function AdminOverview() {
  return <><section className="admin-page-heading"><div><p>PLATFORM OVERVIEW</p><h1>平台概览</h1><span>查看当前组织内的资源、连接和自动化运行情况。</span></div><button type="button"><Activity size={16} />导出运行摘要</button></section>
    <section className="admin-metric-grid">{overviewMetrics.map((metric) => <article className={`tone-${metric.tone}`} key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small><ArrowUpRight size={13} />{metric.hint}</small></article>)}</section>
    <section className="admin-overview-grid"><article className="admin-card admin-health"><header><div><h2>平台健康度</h2><span>所有核心服务状态正常</span></div><em><CheckCircle2 size={15} />正常</em></header><div className="admin-health-list"><span><i />模型服务<strong>正常</strong></span><span><i />MCP 网关<strong>正常</strong></span><span><i />自动化调度<strong>正常</strong></span><span><i />审批服务<strong>正常</strong></span></div></article><article className="admin-card"><header><div><h2>待处理事项</h2><span>需要管理员关注的申请与异常</span></div><em className="is-warning"><CircleAlert size={15} />3 项</em></header><div className="admin-pending"><button type="button">2 个访问授权申请 <ArrowUpRight size={14} /></button><button type="button">1 个专家启用申请 <ArrowUpRight size={14} /></button><button type="button">0 个运行异常 <ArrowUpRight size={14} /></button></div></article></section>
    <section className="admin-card admin-activity"><header><div><h2>最近活动</h2><span>资源配置与平台运行记录</span></div><button type="button">查看全部</button></header>{overviewActivities.map(([title, detail, time]) => <article key={title}><i><Activity size={15} /></i><div><strong>{title}</strong><span>{detail}</span></div><time>{time}</time></article>)}</section>
  </>
}
