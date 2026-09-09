import { useState } from 'react';
import { Building2, ChevronDown, GitBranch, Plus, UsersRound } from 'lucide-react';
import { baseDefinition, currentDefinition, ORGS } from '../role-center/domain';
import { useRoleStore } from '../role-center/store';
import { Badge, Dialog, Empty } from '../role-center/ui';
import { DEMO_ORGANIZATION, DEMO_POSITIONS, LOCAL_PROCESS, modelsForPosition, POSITIONS, type Position } from './positionModels';
import { PositionCapabilityMap } from './PositionCapabilityMap';
import './definitions.css';

// Additional display-only examples; the scenario validation group remains the working demo.
const SAMPLE_PROJECTS = [
  { id: 'sample-quality', name: '质量提升行动组', positions: ['质量工程师', '问题分析专员', '整改负责人'], members: [['刘洋', '陈晨'], ['吴迪'], ['杨帆']] },
  { id: 'sample-data', name: '数据治理工作组', positions: ['数据架构师', '数据治理专员', '数据质量工程师'], members: [['陆远'], ['顾佳', '何川'], ['沈悦']] },
  { id: 'sample-delivery', name: '交付保障专项组', positions: ['交付协调员', '计划专员', '验收工程师'], members: [['许航'], ['林悦', '徐磊'], ['周宁']] },
];
const SAMPLE_DEPARTMENTS = [
  { id: 'comac/quality-demo', name: '质量管理部', positions: ['质量工程师', '质量体系专员', '质量审核员'], members: [['刘洋', '陈晨'], ['吴迪'], ['杨帆']] },
  { id: 'comac/data-demo', name: '数据平台部', positions: ['数据架构师', '数据治理专员', '数据质量工程师'], members: [['陆远'], ['顾佳', '何川'], ['沈悦']] },
];
const COMPANY_ORGS = [...ORGS, ...SAMPLE_DEPARTMENTS];
const COMPANY_POSITIONS = [...POSITIONS, ...SAMPLE_DEPARTMENTS.flatMap(org => org.positions.map((name, i) => ({ id: `${org.id}/position-${i}`, org: org.id, name })))];
const SAMPLE_FLOWS = [
  { code: 'FLOW-002', name: '验证问题复盘流程', organization: DEMO_ORGANIZATION, positions: '产品经理、项目经理' },
  { code: 'FLOW-003', name: '质量问题整改流程', organization: '质量提升行动组', positions: '质量工程师、整改负责人' },
  { code: 'FLOW-004', name: '交付验收协同流程', organization: '交付保障专项组', positions: '交付协调员、验收工程师' },
];

export default function DefinitionWorkspace({ page, onConfigure }: { page: 'organizationDefinition' | 'processDefinition'; onConfigure: (position: Position) => void }) {
  const store = useRoleStore();
  const [selected, setSelected] = useState('demo');
  const [organizations, setOrganizations] = useState<string[]>(() => {
    try { const saved: unknown = JSON.parse(localStorage.getItem('comac-demo-project-organizations') || '[]'); return Array.isArray(saved) ? saved.filter((n): n is string => typeof n === 'string') : []; } catch { return []; }
  });
  const [modal, setModal] = useState<'organization' | 'create' | 'import' | 'view' | null>(null);
  const [name, setName] = useState('');
  const isOrganization = page === 'organizationDefinition';
  const sampleProject = SAMPLE_PROJECTS.find(p => p.id === selected);
  const sampleDepartment = SAMPLE_DEPARTMENTS.find(p => p.id === selected);
  const project = selected === 'demo' || !!sampleProject || selected.startsWith('project-');
  const orgName = sampleDepartment ? sampleDepartment.name : sampleProject ? sampleProject.name : selected === 'demo' ? DEMO_ORGANIZATION : selected.startsWith('project-') ? organizations[Number(selected.slice(8))] : ORGS.find(o => o.id === selected)?.name || '公司组织';
  const positions = sampleProject ? sampleProject.positions.map((name, i) => ({ id: `${sampleProject.id}/position-${i}`, org: sampleProject.id, name })) : selected === 'demo' ? DEMO_POSITIONS : selected.startsWith('project-') ? [] : COMPANY_POSITIONS.filter(p => p.org === selected || p.org.startsWith(selected + '/'));
  const configured = (position: Position) => !sampleProject && store.roles.some(r => currentDefinition(r).position?.id === position.id);
  const peopleFor = (position: Position): { id: string; name: string }[] => {
    const sampleOrg = [...SAMPLE_PROJECTS, ...SAMPLE_DEPARTMENTS].find(org => org.id === position.org);
    if (sampleOrg) {
      const index = Number(position.id.split('-').at(-1));
      return (sampleOrg.members[index] || []).map((name, i) => ({ id: `${position.id}/person-${i}`, name }));
    }
    const members = store.people.filter(p => p.active && p.org === position.org);
    const index = Number(position.id.split('-').at(-1)) || 0;
    return members.length ? Array.from({ length: Math.min(2, members.length) }, (_, i) => members[(index + i) % members.length]) : [];
  };
  const memberCount = new Set(positions.flatMap(p => peopleFor(p).map(person => person.id))).size;
  const addOrganization = () => {
    const next = [...organizations, name.trim()];
    try { localStorage.setItem('comac-demo-project-organizations', JSON.stringify(next)); } catch { /* Keep the current session usable when browser storage is unavailable. */ }
    setOrganizations(next); setSelected(`project-${next.length - 1}`); setModal(null); setName('');
  };
  return <div className="rc rc-shell definition-shell">
    <div className="rc-heading"><div><h1>{isOrganization ? '组织定义' : '流程定义'}</h1><p>{isOrganization ? '定义项目组织，明确岗位、人员与智能体配置。' : '管理组织内的业务流程与岗位协作关系。'}</p></div></div>
    {isOrganization ? <div className="definition-layout">
      <aside className="rc-section definition-tree"><header><h2>组织架构</h2><button className="rc-icon" aria-label="添加项目组织" onClick={() => { setName(''); setModal('organization'); }}><Plus size={18}/></button></header>
        <small>公司组织</small><button className={selected === 'comac' ? 'selected' : ''} onClick={() => setSelected('comac')}><ChevronDown size={15}/><Building2 size={16}/>{ORGS.find(o => o.id === 'comac')?.name || '公司组织'}</button>
        {COMPANY_ORGS.filter(o => COMPANY_POSITIONS.some(p => p.org === o.id)).map(o => <button key={o.id} className={`definition-child ${selected === o.id ? 'selected' : ''}`} onClick={() => setSelected(o.id)}>{o.name.split(' / ').at(-1)}</button>)}
        <small>项目组织</small><button className={selected === 'demo' ? 'selected' : ''} onClick={() => setSelected('demo')}><UsersRound size={16}/>{DEMO_ORGANIZATION}</button>
        {SAMPLE_PROJECTS.map(org => <button key={org.id} className={selected === org.id ? 'selected' : ''} onClick={() => setSelected(org.id)}><UsersRound size={16}/>{org.name}</button>)}
        {organizations.map((org, i) => <button key={i} className={selected === `project-${i}` ? 'selected' : ''} onClick={() => setSelected(`project-${i}`)}><UsersRound size={16}/>{org}</button>)}
      </aside>
      <div className="definition-main"><section className="rc-section"><header><div><h2>{orgName}</h2><p>{positions.length} 个岗位 · {memberCount} 名人员 · {positions.filter(configured).length}/{positions.length} 岗位已配置智能体</p></div><Badge tone="blue">{project ? '项目组织' : '公司组织'}</Badge></header>{project && <p className="definition-note">成员来自公司组织，按项目岗位开展协作。</p>}</section>
      <section className="rc-section"><header><h2>岗位列表</h2><small>关联价值流来自本体平台</small></header><div className="definition-table-scroll"><table className="definition-table"><thead><tr>{['岗位名称', '所属组织', '人员', '关联价值流', '智能体', '操作'].map(t => <th key={t}>{t}</th>)}</tr></thead><tbody>{positions.map(position => <tr key={position.id}><td><strong>{position.name}</strong></td><td>{project ? orgName : COMPANY_ORGS.find(o => o.id === position.org)?.name.split(' / ').at(-1)}</td><td>{peopleFor(position).map(p => p.name).join('、') || '待分配'}</td><td><div className="definition-tags">{!modelsForPosition(position).length && <span>—</span>}{modelsForPosition(position).map(m => <Badge key={m.id} tone="blue">{m.name}</Badge>)}</div></td><td><Badge tone={configured(position) ? 'green' : 'gray'}>{configured(position) ? '已配置' : '未配置'}</Badge></td><td><button disabled={!POSITIONS.some(p => p.id === position.id)} title={!POSITIONS.some(p => p.id === position.id) ? "此岗位暂未开放配置" : undefined} onClick={() => onConfigure(position)}>配置智能体</button></td></tr>)}</tbody></table></div>{!positions.length && <Empty title="暂无岗位">项目组织已创建，后续可配置岗位与人员。</Empty>}</section></div>
    </div> : <section className="rc-section"><header><div><h2>全部流程</h2><p>{1 + SAMPLE_FLOWS.length} 条组织流程 · 1 条已定义 · {SAMPLE_FLOWS.length} 条草稿</p></div><div className="rc-actions"><button onClick={() => setModal('import')}>导入</button><button className="rc-primary" onClick={() => setModal('create')}><Plus size={16}/>新建流程</button></div></header><div className="definition-table-scroll"><table className="definition-table"><thead><tr>{['流程名称', '编码', '所属组织', '关联岗位', '节点数', '状态', '操作'].map(t => <th key={t}>{t}</th>)}</tr></thead><tbody><tr><td><strong>{LOCAL_PROCESS.name}</strong></td><td>FLOW-001</td><td>{DEMO_ORGANIZATION}</td><td>产品经理、项目经理</td><td>{LOCAL_PROCESS.nodes.length}</td><td><Badge tone="green">已定义</Badge></td><td><div className="rc-actions"><button onClick={() => setModal('view')}>查看</button><button disabled title="本次演示暂不开放编辑">编辑</button></div></td></tr>{SAMPLE_FLOWS.map(flow => <tr key={flow.code}><td><strong>{flow.name}</strong></td><td>{flow.code}</td><td>{flow.organization}</td><td>{flow.positions}</td><td>—</td><td><Badge tone="orange">草稿</Badge></td><td><div className="rc-actions"><button disabled title="流程节点待配置">查看</button><button disabled title="本次演示暂不开放编辑">编辑</button></div></td></tr>)}</tbody></table></div></section>}
    {modal === 'organization' && <Dialog title="添加项目组织" onClose={() => setModal(null)} footer={<><button onClick={() => setModal(null)}>取消</button><button className="rc-primary" disabled={!name.trim() || [DEMO_ORGANIZATION, ...SAMPLE_PROJECTS.map(p => p.name), ...organizations].includes(name.trim())} onClick={addOrganization}>创建组织</button></>}><label className="definition-field">组织名称<input value={name} maxLength={40} onChange={e => setName(e.target.value)} placeholder="例如：XX 验证小组"/></label><p>项目组织独立管理，不改变成员的公司组织归属。</p></Dialog>}
    {(modal === 'create' || modal === 'import') && <Dialog title={modal === 'create' ? '新建流程' : '导入流程'} onClose={() => setModal(null)} footer={<button className="rc-primary" onClick={() => setModal(null)}>知道了</button>}><div className="definition-placeholder"><GitBranch size={32}/><h3>{modal === 'create' ? '创建组织协作流程' : '导入已有业务流程'}</h3><p>本次演示暂未开放此功能，可在列表中查看“场景验证流程”。</p></div></Dialog>}
    {modal === 'view' && <Dialog title={LOCAL_PROCESS.name} wide onClose={() => setModal(null)}><div className="definition-flow-summary"><Badge tone="green">当前后台 · 手动定义</Badge><span>{DEMO_ORGANIZATION}</span><span>{LOCAL_PROCESS.nodes.length} 个节点</span></div><PositionCapabilityMap definition={{ ...baseDefinition('产品经理智能体', store.adminId), position: DEMO_POSITIONS[0] }} initialSource="local" processView/></Dialog>}
  </div>;
}
