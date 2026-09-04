import { BookOpen, FileStack, FileText, GitBranch, LockKeyhole, Target } from 'lucide-react'

export type RoleAssetId = 'description' | 'capability' | 'knowledge' | 'cases' | 'templates' | 'rules'

export const roleAssetCatalog: Array<{ id: RoleAssetId; label: string; value: string; meta: string; icon: typeof FileText }> = [
  { id: 'description', icon: FileText, label: '岗位说明书', value: '1 份', meta: '职责、任职要求、权限边界' },
  { id: 'capability', icon: GitBranch, label: '能力地图', value: '12 个过程', meta: '来自 C 大脑价值流模型' },
  { id: 'knowledge', icon: BookOpen, label: '知识地图', value: '28 项', meta: '制度、规范、方法与知识索引' },
  { id: 'cases', icon: FileStack, label: '历史任务案例', value: '16 个', meta: '标准项目情况与完整上下文' },
  { id: 'templates', icon: Target, label: 'KPI 指标', value: '8 项', meta: '岗位目标、衡量口径与达成标准' },
  { id: 'rules', icon: LockKeyhole, label: '岗位规则', value: '6 条', meta: '组织权限、强制制度与工作边界' },
]
