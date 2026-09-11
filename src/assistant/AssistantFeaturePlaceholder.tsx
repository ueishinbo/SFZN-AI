import {
  Blocks,
  Bot,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Link2,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { AssistantFeatureId } from './AssistantModeSidebar'

type FeatureDefinition = {
  eyebrow: string
  title: string
  description: string
  icon: ReactNode
  items: Array<{ title: string; detail: string; action: string }>
}

const featureDefinitions: Record<AssistantFeatureId, FeatureDefinition> = {
  automation: {
    eyebrow: 'AUTOMATION',
    title: '自动化任务',
    description: '管理由助理定时执行的提醒、汇总和信息推送。当前页面为功能占位，后续可继续接入真实任务数据。',
    icon: <Clock3 size={25} />,
    items: [
      { title: '每日工作简报', detail: '工作日 08:30 · 正常运行', action: '查看任务' },
      { title: '喝水提醒', detail: '每天 09:00 · 下次明天执行', action: '编辑规则' },
      { title: '项目风险周报', detail: '每周五 17:30 · 已暂停', action: '恢复任务' },
    ],
  },
  experts: {
    eyebrow: 'EXPERTS',
    title: '专家广场',
    description: '从企业专家库中寻找适合当前问题的专家分身，并在获得授权后发起协作。',
    icon: <GraduationCap size={26} />,
    items: [
      { title: '航空结构设计专家', detail: '机体结构 · 复合材料 · 适航', action: '查看专家' },
      { title: '供应链质量专家', detail: '供应商审核 · 质量闭环', action: '查看专家' },
      { title: '项目管理专家', detail: '计划管理 · 风险控制', action: '查看专家' },
    ],
  },
  skills: {
    eyebrow: 'SKILLS',
    title: '技能广场',
    description: '为数字分身装配可复用的工作技能，让助理能按照组织规范完成具体任务。',
    icon: <WandSparkles size={25} />,
    items: [
      { title: '会议纪要整理', detail: '提取结论、行动项与负责人', action: '试用技能' },
      { title: '风险清单生成', detail: '从材料中识别风险与建议', action: '试用技能' },
      { title: '周报自动编写', detail: '汇总进展并套用部门模板', action: '试用技能' },
    ],
  },
  mcp: {
    eyebrow: 'MCP',
    title: 'MCP 广场',
    description: '浏览数字分身可以连接的企业系统与工具。本版本只保留入口和连接状态示意。',
    icon: <Link2 size={25} />,
    items: [
      { title: 'C 项目管理平台', detail: '已连接 · 可读取任务与进展', action: '管理连接' },
      { title: '企业知识库', detail: '已连接 · 按权限检索', action: '管理连接' },
      { title: '文件协作平台', detail: '等待管理员开通', action: '申请开通' },
    ],
  },
  training: {
    eyebrow: 'DIGITAL TWIN',
    title: '训练数字分身',
    description: '通过示例、偏好和反馈让数字分身逐渐理解你的工作方式。这里先搭好后续加工所需的页面骨架。',
    icon: <Bot size={26} />,
    items: [
      { title: '补充个人工作偏好', detail: '已完成 6 项 · 建议继续补充', action: '继续训练' },
      { title: '示范一项典型任务', detail: '让分身学习你的判断过程', action: '开始示范' },
      { title: '校正分身回答', detail: '回顾最近回答并给出反馈', action: '查看回答' },
    ],
  },
  a2a: {
    eyebrow: 'A2A',
    title: 'A2A 任务',
    description: '查看跨分身协作的任务状态与待确认事项。',
    icon: <Bot size={26} />,
    items: [],
  },
}

export default function AssistantFeaturePlaceholder({ featureId }: { featureId: AssistantFeatureId }) {
  const [feedback, setFeedback] = useState('')
  const feature = featureDefinitions[featureId]

  return (
    <section className="assistant-feature-page">
      <header className="assistant-feature-hero">
        <span className="assistant-feature-icon">{feature.icon}</span>
        <div>
          <p>{feature.eyebrow}</p>
          <h2>{feature.title}</h2>
          <span>{feature.description}</span>
        </div>
      </header>

      <div className="assistant-feature-notice">
        <Sparkles size={17} />
        <span>演示入口</span>
        <p>页面结构和按钮已预留，当前不会连接真实业务系统。</p>
      </div>

      <div className="assistant-feature-grid">
        {feature.items.map((item) => (
          <article key={item.title}>
            <span><Blocks size={19} /></span>
            <div><strong>{item.title}</strong><p>{item.detail}</p></div>
            <button type="button" onClick={() => setFeedback(`${item.title}已进入演示状态，后续可在这里继续扩展。`)}>{item.action}</button>
          </article>
        ))}
      </div>

      {feedback && <div className="assistant-feature-feedback"><CheckCircle2 size={17} /><span>{feedback}</span></div>}
    </section>
  )
}
