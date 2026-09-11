import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 协同执行演示 · 独立构建配置
//
// 用途：只打包 WorkingGroupDemoPage，产出一份可内联成单文件的 HTML。
// 与主原型 vite.config.ts 的区别：
//   - base './'（单文件/file:// 场景不能用绝对路径）
//   - 只打一个入口，iife 格式 + inlineDynamicImports，避免代码分割产生外部模块文件
//   - 不走 role-center（那里的 mammoth / pdfjs-dist 会把包撑到数 MB）
//
// 产物：dist/demo/working-group-demo.html，再由 scripts/build-demo-singlefile.mjs 内联。
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist/demo',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100 * 1024 * 1024,
    rollupOptions: {
      input: 'working-group-demo.html',
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'demo.js',
        assetFileNames: 'demo.[ext]',
      },
    },
  },
})
