import { Dialog } from '../role-center/ui'
import { ARTIFACT_ICON, ARTIFACT_LABEL } from './artifactMeta'
import type { SimArtifact } from './types'

/**
 * 交付物预览。
 * 内容用【示例产物】占位 —— 演示阶段不编造正文，只交代清楚这是谁产出的、什么时候、什么类型。
 */
export default function ArtifactViewer({
  artifact,
  producer,
  nodeAction,
  onClose,
}: {
  artifact: SimArtifact
  producer: string
  nodeAction: string
  onClose: () => void
}) {
  const Icon = ARTIFACT_ICON[artifact.kind]
  return (
    <Dialog
      title={artifact.name}
      wide
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose}>
          关闭
        </button>
      }
    >
      <div className="ps-viewer">
        <div className="ps-viewer-meta">
          <span className="ps-viewer-badge">
            <Icon size={13} />
            {ARTIFACT_LABEL[artifact.kind]}
          </span>
          <span>产出节点：{nodeAction}</span>
          <span>产出方：{producer}</span>
        </div>

        <div className="ps-viewer-canvas">
          <Icon size={30} />
          <strong>【示例产物】</strong>
          <p>{artifact.summary}</p>
          <small>
            演示占位内容。真实环境下，这里会是该岗位智能体在「{nodeAction}」节点生成的
            {ARTIFACT_LABEL[artifact.kind]}正文。
          </small>
        </div>
      </div>
    </Dialog>
  )
}
