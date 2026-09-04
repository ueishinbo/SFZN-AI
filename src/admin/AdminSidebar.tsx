import { ArrowLeft, ChevronRight } from 'lucide-react'
import { adminNavigation, type AdminPageId } from './mockAdminData'

export default function AdminSidebar({ activePage, onSelect, onBack }: { activePage: AdminPageId; onSelect: (page: AdminPageId) => void; onBack: () => void }) {
  return <aside className="admin-sidebar">
    <header><span className="admin-brand-mark">C</span><div><small>COMAC AI</small><strong>后台管理</strong></div></header>
    <button className="admin-return" type="button" onClick={onBack}><ArrowLeft size={16} />返回助理</button>
    <nav aria-label="后台管理导航">{adminNavigation.map(({ id, label, icon: Icon }) => <button key={id} className={activePage === id ? 'active' : ''} type="button" onClick={() => onSelect(id)}><Icon size={17} /><span>{label}</span>{activePage === id && <ChevronRight size={14} />}</button>)}</nav>
    <footer><span>管理员：当前用户</span><small>演示环境 · Mock 数据</small></footer>
  </aside>
}
