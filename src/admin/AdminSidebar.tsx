import { ArrowLeft, ChevronRight } from "lucide-react";
import { useRoleStore } from "../role-center/store";
import { adminNavigation, adminNavigationGroups, type AdminPageId } from "./mockAdminData";

export default function AdminSidebar({
  activePage,
  onSelect,
  onBack,
  onAccount,
}: {
  activePage: AdminPageId;
  onSelect: (page: AdminPageId) => void;
  onBack: () => void;
  onAccount: (id: string) => void;
}) {
  const store = useRoleStore();
  return (
    <aside className="admin-sidebar">
      <header>
        <span className="admin-brand-mark">C</span>
        <div>
          <small>Comac Claw</small>
          <strong>后台管理</strong>
        </div>
      </header>
      <button className="admin-return" type="button" onClick={onBack}>
        <ArrowLeft size={16} />
        返回助理
      </button>
      <nav aria-label="后台管理导航">
        {adminNavigationGroups.map(({ label: groupLabel, items }) => (
          <section className="admin-nav-group" key={groupLabel} aria-label={groupLabel}>
            <h2>{groupLabel}</h2>
            {items.map((id) => {
              const { label, icon: Icon } = adminNavigation.find((item) => item.id === id)!;
              return (
                <button
                  key={id}
                  className={activePage === id ? "active" : ""}
                  aria-current={activePage === id ? "page" : undefined}
                  type="button"
                  onClick={() => onSelect(id)}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                  {activePage === id && <ChevronRight size={14} />}
                </button>
              );
            })}
          </section>
        ))}
      </nav>
      <div className="rc rc-user-select">
        <label htmlFor="admin-account">当前工作身份</label>
        <select
          id="admin-account"
          value={store.adminId}
          onChange={(e) => onAccount(e.target.value)}
        >
          {store.people
            .filter((p) => p.active && p.role !== "user")
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ·{" "}
                {p.role === "approver"
                  ? "审批人"
                  : p.role === "sys_admin"
                    ? "平台管理员"
                    : "资源管理员"}
              </option>
            ))}
        </select>
      </div>
      <footer>
        <span>COMAC CLAW</span>
        <small>岗位智能体与数字分身管理</small>
      </footer>
    </aside>
  );
}
