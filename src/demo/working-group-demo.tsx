import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import WorkingGroupDemoPage from '../working-group/WorkingGroupDemoPage'
import '../index.css'

/**
 * 协同执行演示 · 独立打包入口
 *
 * 只挂载 WorkingGroupDemoPage，不带 App 的其他模块，
 * 目的是产出一份自包含的单文件 HTML（可直接双击打开 / 静态产物预览 / 发给同事）。
 * 「返回流程定义」在独立 demo 中没有可返回的目标，改为重置演示。
 */
function DemoShell() {
  const [runKey, setRunKey] = useState(0)

  return (
    <WorkingGroupDemoPage key={runKey} onBack={() => setRunKey((k) => k + 1)} backLabel="重新演示" />
  )
}

const el = document.getElementById('root')

function mount() {
  if (!el) throw new Error('协同执行 demo：找不到 #root 挂载点')
  createRoot(el).render(
    <StrictMode>
      <DemoShell />
    </StrictMode>,
  )
}

// 兜底：不依赖脚本标签的位置。
// 单文件产物里脚本被内联成普通 <script>（不再是天然 defer 的 module），
// 若脚本出现在 <head> 就会早于 #root 执行，导致整页空白。这里显式等 DOM 就绪。
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true })
} else {
  mount()
}
