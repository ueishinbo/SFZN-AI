import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import AdminOverview from './AdminOverview'
import AdminSidebar from './AdminSidebar'
import { adminNavigation, managementRows, type AdminPageId } from './mockAdminData'
import './admin.css'

export default function AdminWorkspace({ onReturn }: { onReturn: () => void }) {
  const [activePage, setActivePage] = useState<AdminPageId>('overview')
  const page = adminNavigation.find((item) => item.id === activePage)!
  const rows = activePage === 'overview' ? [] : managementRows[activePage]
  return <div className="admin-workspace"><AdminSidebar activePage={activePage} onSelect={setActivePage} onBack={onReturn} /><main className="admin-content">{activePage === 'overview' ? <AdminOverview /> : <><section className="admin-page-heading"><div><p>ADMINISTRATION</p><h1>{page.label}</h1><span>{page.description}。当前为前端演示数据，不会影响实际业务系统。</span></div><button type="button"><Plus size={16} />新增配置</button></section><section className="admin-card admin-management-list"><header><label><Search size={16} /><input placeholder={`搜索${page.label}`} /></label><span>共 {rows.length} 项</span></header>{rows.map(([title, detail, status]) => <article key={title}><i><page.icon size={18} /></i><div><strong>{title}</strong><span>{detail}</span></div><em className={status.includes('待') || status.includes('暂停') ? 'is-warning' : ''}>{status}</em><button type="button">管理</button></article>)}</section></>}</main></div>
}
