import type { LucideIcon } from 'lucide-react'
import { BadgeCheck, Boxes, BrainCircuit, CalendarClock, Cpu, GitBranch, KeyRound, Network, ShieldCheck, UsersRound } from 'lucide-react'

export type AdminPageId = 'organizationDefinition' | 'processDefinition' | 'processSimulation' | 'roleAgents' | 'experts' | 'skills' | 'mcp' | 'models' | 'automation' | 'approvals' | 'organization' | 'roles'

export type AdminNavItem = { id: AdminPageId; label: string; icon: LucideIcon; description: string }

export const adminNavigation: AdminNavItem[] = [
  { id: 'experts', label: '专家管理', icon: UsersRound, description: '维护可调用的业务专家' },
  { id: 'skills', label: '技能管理', icon: Boxes, description: '维护专项能力与授权范围' },
  { id: 'mcp', label: 'MCP 连接', icon: Network, description: '管理外部业务系统连接' },
  { id: 'models', label: '模型管理', icon: Cpu, description: '配置可用模型与策略' },
  { id: 'organizationDefinition', label: '组织定义', icon: UsersRound, description: '定义项目组织、岗位与人员' },
  { id: 'processDefinition', label: '流程定义', icon: Network, description: '管理组织内的业务流程与岗位协作关系' },
  { id: 'roleAgents', label: '岗位智能体管理', icon: BrainCircuit, description: '维护岗位定义、能力与可添加范围' },
  { id: 'processSimulation', label: '流程试运行', icon: GitBranch, description: '验证流程协作、调试阻塞并查看运行结果' },
  { id: 'automation', label: '自动化管理', icon: CalendarClock, description: '查看定时任务与运行状态' },
  { id: 'approvals', label: '审批中心', icon: BadgeCheck, description: '处理待审批的访问与执行申请' },
  { id: 'organization', label: '组织与成员', icon: UsersRound, description: '维护组织、成员与归属关系' },
  { id: 'roles', label: '角色与权限', icon: ShieldCheck, description: '配置角色权限边界' },
]

export const adminNavigationGroups: Array<{ label: string; items: AdminPageId[] }> = [
  { label: '资源管理', items: ['experts', 'skills', 'mcp', 'models'] },
  { label: '组织智能', items: ['organizationDefinition', 'processDefinition', 'roleAgents', 'processSimulation'] },
  { label: '运行管理', items: ['automation'] },
  { label: '审批管理', items: ['approvals'] },
  { label: '权限管理', items: ['organization', 'roles'] },
]

export const overviewMetrics = [
  { label: '已启用数字分身', value: '18', hint: '较上周 +2', tone: 'blue' },
  { label: '可用技能', value: '46', hint: '41 项已授权', tone: 'purple' },
  { label: '已连接 MCP', value: '12', hint: '118 个可调用工具', tone: 'green' },
  { label: '运行中的自动化', value: '27', hint: '今日执行 86 次', tone: 'orange' },
]

export const overviewActivities = [
  ['供应链质量专家', '完成权限更新，新增“供应商审核”数据范围', '10 分钟前'],
  ['适航动态日报', '自动化任务执行成功，已生成今日输出', '28 分钟前'],
  ['经营数据平台', 'MCP 连接健康检查完成，状态正常', '1 小时前'],
  ['张敏', '提交了“项目管理专家”启用申请', '2 小时前'],
]

export const managementRows: Record<Exclude<AdminPageId, 'roleAgents' | 'organizationDefinition' | 'processDefinition' | 'processSimulation'>, Array<[string, string, string]>> = {
  experts: [['航空结构设计专家', '机体结构 · 复合材料 · 适航', '已启用'], ['供应链质量专家', '供应商审核 · 质量闭环', '已启用'], ['项目管理专家', '计划管理 · 风险控制', '待审批']],
  skills: [['经营指标分析', '企业数据分析 · 只读', '已启用'], ['方案文档生成', '文档与模板生成', '已启用'], ['风险识别与闭环', '项目风险提取与跟踪', '已启用']],
  mcp: [['C 项目管理平台', '6 个工具 · 受控写入', '已连接'], ['C 大脑知识库', '8 个工具 · 只读', '已连接'], ['经营数据平台', '5 个工具 · 待授权', '待审批']],
  models: [['商飞大模型 L1-S1', '默认通用模型 · 128K 上下文', '可用'], ['商飞大模型 L1-A2', '分析推理模型 · 64K 上下文', '可用'], ['文档理解模型', '附件解析与结构化抽取', '可用']],
  automation: [['每日适航动态推送', '工作日 08:30 · 最近执行成功', '运行中'], ['供应商风险周报', '每周五 16:00 · 最近执行成功', '运行中'], ['项目例会材料准备', '每周一 09:00 · 等待配置', '已暂停']],
  approvals: [['经营数据平台访问申请', '申请人：张敏 · 读取经营指标', '待审批'], ['项目管理专家启用申请', '申请人：李华 · 调用专家能力', '待审批'], ['供应商资料导出申请', '申请人：王强 · 导出受控文件', '已通过']],
  organization: [['研发中心', '42 名成员 · 岗位与权限归属', '正常'], ['项目管理部', '28 名成员 · 岗位与权限归属', '正常'], ['供应链管理部', '35 名成员 · 岗位与权限归属', '正常']],
  roles: [['平台管理员', '系统配置、授权与审计', '3 人'], ['业务管理员', '组织资源与审批管理', '12 人'], ['普通用户', '按授权范围使用能力', '108 人']],
}

export const permissionIcon = KeyRound
