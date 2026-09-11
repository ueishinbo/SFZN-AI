import {
  ClipboardCheck,
  Code2,
  FileSignature,
  FileSpreadsheet,
  FileText,
  Presentation,
} from 'lucide-react'
import type { SimArtifact } from './types'

/** 交付物类型 → 图标 */
export const ARTIFACT_ICON = {
  doc: FileText,
  sheet: FileSpreadsheet,
  slide: Presentation,
  code: Code2,
  contract: FileSignature,
  report: ClipboardCheck,
} as const

/** 交付物类型 → 短标签 */
export const ARTIFACT_LABEL: Record<SimArtifact['kind'], string> = {
  doc: '文档',
  sheet: '表格',
  slide: '演示',
  code: '代码',
  contract: '合同',
  report: '报告',
}
