/**
 * 协同执行演示 · 单文件构建
 *
 * 流程：vite build（vite.demo.config.ts）→ 把产出的 CSS/JS 内联进 HTML → 写出一份自包含文件。
 * 目的：产出一个可以直接双击打开、也可以用「静态产物预览」加载的单文件 demo。
 *
 * 用法：node scripts/build-demo-singlefile.mjs
 * 输出：<工作区根目录>/working-group-demo.html
 */
import { execFileSync } from 'node:child_process'
import { readFile, writeFile, readdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'

const root = process.cwd()
const distDir = resolve(root, 'dist/demo')
const outFile = resolve(root, '..', 'working-group-demo.html')

// 1. 构建
execFileSync(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), 'build', '--config', 'vite.demo.config.ts'], {
  stdio: 'inherit',
  cwd: root,
})

// 2. 读取构建产物
const files = await readdir(distDir)
const htmlName = files.find((f) => f.endsWith('.html'))
if (!htmlName) throw new Error(`dist/demo 下没有找到 html：${files.join(', ')}`)

let html = await readFile(resolve(distDir, htmlName), 'utf8')

const readAsset = (url) => readFile(resolve(distDir, url.replace(/^\.\//, '')), 'utf8')

// 3. 去掉 modulepreload（单文件内联后无意义）
html = html.replace(/<link[^>]*rel="modulepreload"[^>]*>\s*/g, '')

// 4. 内联样式表
// 注意：必须用函数式替换。构建产物里的 `$` 序列（如 $&、$`）会被 String.replace 当成
// 替换模式展开，字符串式替换会污染被内联的代码。
for (const [full, href] of [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map((m) => [m[0], m[1]])) {
  const css = await readAsset(href)
  html = html.replace(full, () => `<style>\n${css}\n</style>`)
}

// 5. 取出脚本，并从原位（通常是 <head>）移除
// 关键：Vite 原产物是 <script type="module">，模块脚本天然 defer，等 DOM 解析完才执行。
// 内联成普通 <script> 后就变成同步执行，若留在 <head> 会早于 <div id="root"> 出现，
// createRoot(null) 直接抛错 → 页面空白。所以必须先摘出来，稍后挪到 </body> 之前。
// （注意：defer 属性对「内联」脚本无效，不能靠 defer 解决。）
const bundles = []
for (const [full, src] of [...html.matchAll(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g)].map((m) => [m[0], m[1]])) {
  bundles.push(await readAsset(src))
  html = html.replace(full, () => '')
}

// 6. 追加到 </body> 之前
if (!/<\/body>/i.test(html)) throw new Error('产物 HTML 里没有 </body>，无法挂载脚本')
html = html.replace(/<\/body>/i, () => `${bundles.map((js) => `<script>\n${js}\n</script>`).join('\n')}\n  </body>`)

// 6. 写出
await writeFile(outFile, html, 'utf8')

// 7. 自检
const leftover = [...html.matchAll(/<(?:script|link)[^>]*(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !u.startsWith('data:'))
const rootAt = html.indexOf('id="root"')
const scriptAt = html.indexOf('<script>')
const orderOk = rootAt !== -1 && scriptAt !== -1 && scriptAt > rootAt
const size = (await stat(outFile)).size

console.log('')
console.log(`输出：${outFile}`)
console.log(`大小：${(size / 1024).toFixed(1)} KB`)
console.log(leftover.length ? `⚠️ 仍有外部引用：${leftover.join(', ')}` : '✅ 无外部引用，自包含')
console.log(orderOk ? '✅ 脚本位于 #root 之后（不会早于挂载点执行）' : '⚠️ 脚本早于 #root，会导致页面空白')
if (leftover.length || !orderOk) process.exitCode = 1
