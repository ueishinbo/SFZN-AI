// 流程定义原型验收脚本（Edge headless + 断言链 + 截图）
// 运行：先 npm install --no-save playwright-core，再 node scripts/accept-flow-definition.mjs
// 前置：dev server 已在 localhost:5173 运行；浏览器 localStorage 中无残留绑定数据时结果最干净
import { chromium } from 'playwright-core'
import { strict as assert } from 'node:assert'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const URL = 'http://localhost:5173/SFZN-AI/?view=admin&page=processDefinition'
const results = []
const ok = (name) => { results.push(['PASS', name]); console.log('PASS', name) }

const browser = await chromium.launch({ executablePath: EDGE, headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } })
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

await page.goto(URL)
await page.waitForSelector('.fd-table tbody tr')

// 1 列表：3 条价值流，默认工作队列排序，状态未绑定
const rowCount = await page.locator('.fd-table tbody tr').count()
assert.equal(rowCount, 4, '列表应为 4 条（3 根 + 1 已引入子流）')
const firstStatus = await page.locator('.fd-table tbody tr').first().locator('td').nth(4).innerText()
assert.equal(firstStatus.trim(), '未绑定', '初始状态应为未绑定')
const summary = await page.locator('.rc-heading + .rc-section header p, .rc-section header p').first().innerText()
assert.match(summary, /共 4 条/, '计数行应显示共 4 条')
const sysOrgText = (await page.locator('.fd-table tbody tr', { hasText: '系统产研开发流程' }).locator('.fd-orgs').innerText()).trim()
assert.equal(sysOrgText, '综合项目室', '系统产研开发流责任组织应仅综合项目室: ' + sysOrgText)
ok('列表 3 条 / 状态未绑定 / 计数行 / 责任组织列')
await page.screenshot({ path: 'scripts/_accept-list.png' })

// 2 筛选：状态=已绑定 → 空态
await page.selectOption('.fd-filter select >> nth=0', 'done')
await page.waitForSelector('.rc-empty')
ok('筛选已绑定 → 空态')
await page.selectOption('.fd-filter select >> nth=0', 'all')
await page.waitForSelector('.fd-table tbody tr')

// 3 打开大图：节点数 27、minimap、工具栏
await page.locator('.fd-table tbody tr', { hasText: '产品研发全流程' }).getByRole('button', { name: '查看详情' }).click()
await page.waitForSelector('.fg-svg')
const nodeCount = await page.locator('.fg-node-name').count()
assert.equal(nodeCount, 27, '大图应渲染 27 个节点')
await page.waitForSelector('.fg-minimap')
await page.waitForSelector('.fg-toolbar')
ok('大图 27 节点 / minimap / 工具栏')

// 5 点 P/V 节点开绑定面板（精确匹配节点名，避免命中「产品设计室」）
await page.locator('.fg-node-name', { hasText: /^产品设计$/ }).click()
await page.waitForSelector('.fd-panel')
const panelText = await page.locator('.fd-panel').innerText()
assert.match(panelText, /所有者组织/, '面板应含所有者组织')
assert.match(panelText, /产品设计室/, '所有者组织应为产品设计室')
assert.match(panelText, /还没绑智能体/, '初始空态文案')
ok('绑定面板上下文（所有者组织）')

// 6 添加绑定：策略 A 选择器；持有提示口语化（zhangsan 实际持有 gm- 两个演示智能体）
await page.getByRole('button', { name: /添加绑定/ }).click()
await page.waitForSelector('.fd-picker-list')
const pick = async (keyword) => {
  await page.fill('input[placeholder="搜索智能体、岗位或组织"]', keyword)
  await page.waitForTimeout(120)
  await page.locator('.fd-picker-list section button:not([disabled])').first().click()
}
await pick('项目总监')
await pick('经营管理')
await pick('财务报销')
await page.getByRole('button', { name: '完成' }).click()
const bindings = await page.locator('.fd-binding').count()
assert.equal(bindings, 3, '应绑定 3 个智能体')
const introTexts = await page.locator('.fd-binding-intro').allInnerTexts()
assert.ok(introTexts.some((t) => t.includes('统筹重点项目')), '绑定卡应展示智能体简介（岗位目标）: ' + introTexts.join('|'))
assert.equal(await page.locator('.fd-binding-holders').count(), 0, '不应再展示持有提示')
assert.equal(await page.locator('.fd-binding-meta').count(), 0, '不应再展示版本/岗位 meta 行')
await page.getByRole('tab', { name: /绑定清单/ }).click()
const listHeader = await page.locator('.fd-list-section header p').innerText()
assert.match(listHeader, /已绑 1\/9/, '进度应更新为 1/9: ' + listHeader)
await page.getByRole('tab', { name: /流程图/ }).click()
ok('添加绑定 ×3 / 持有提示两种文案 / 进度 1/9')
await page.screenshot({ path: 'scripts/_accept-panel.png' })

// 7 移除绑定：二次确认
await page.locator('.fd-binding').first().getByRole('button', { name: '移除' }).click()
await page.getByRole('button', { name: '解除绑定' }).click()
assert.equal(await page.locator('.fd-binding').count(), 2, '移除后应剩 2 个绑定')
ok('移除绑定二次确认')

// 8 只读节点：点击不弹窗；悬浮高亮关联关系
await page.getByRole('button', { name: "收起绑定面板" }).click()
const docNode = page.locator('.fg-node-name', { hasText: /评审完的PRD文档/ })
await docNode.click()
await page.waitForTimeout(200)
assert.equal(await page.locator('.rc-dialog, [role="dialog"]').count(), 0, '点击只读节点不应弹窗')
await docNode.hover()
await page.waitForTimeout(200)
const dimmed = await page.locator('.fg-svg g[opacity="0.3"]').count()
assert.ok(dimmed > 0, '悬浮只读节点应高亮关联、降权其余: dimmed=' + dimmed)
ok('只读节点点击不弹窗 / 悬浮看关系保留')

// 9 绑定清单页签：9 行、只看未绑定 8 行、在图中定位
await page.getByRole('tab', { name: /绑定清单/ }).click()
await page.waitForSelector('.fd-list-section tbody tr')
assert.equal(await page.locator('.fd-list-section tbody tr').count(), 9, '清单应 9 行')
await page.locator('.fd-switch input').check()
assert.equal(await page.locator('.fd-list-section tbody tr').count(), 8, '只看未绑定应 8 行')
await page.locator('.fd-switch input').uncheck()
await page.locator('.fd-list-section tbody tr').first().getByRole('button', { name: '在图中定位' }).click()
await page.waitForSelector('.fg-svg')
await page.waitForSelector('.fd-panel')
ok('绑定清单 9/8 行 / 在图中定位回图并开面板')

// 10 返回列表：状态变为部分绑定
await page.locator('.org-crumb').click()
await page.waitForSelector('.fd-table tbody tr')
const partial = await page.locator('.fd-table tbody tr', { hasText: '产品研发全流程' }).locator('td').nth(4).innerText()
assert.equal(partial.trim(), '部分绑定', '返回列表后应为部分绑定')
ok('列表状态同步为部分绑定')
await page.screenshot({ path: 'scripts/_accept-list-after.png' })

// 11 取消引入：带 1 个节点绑定的流，确认文案含绑定数；取消后离开队列
await page.locator('.fd-table tbody tr', { hasText: '产品研发全流程' }).getByRole('button', { name: '删除' }).click()
const confirmText = await page.locator('.rc-dialog, [role="dialog"]').last().innerText()
assert.match(confirmText, /1 个节点/, '确认文案应写明连带删除的绑定节点数: ' + confirmText)
await page.locator('.rc-dialog, [role="dialog"]').last().getByRole('button', { name: '删除' }).click()
await page.waitForTimeout(150)
assert.equal(await page.locator('.fd-table tbody tr', { hasText: '产品研发全流程' }).count(), 0, '取消引入后应离开队列')
ok('删除（带绑定全量删除）')

// 11b 引入门禁：此刻父流（产品研发全流程）未引入，其子流应置灰标「待父流」
await page.getByRole('button', { name: /引入价值流/ }).click()
await page.waitForSelector('.fd-catalog')
await page.locator('.rc-dialog, [role="dialog"]').last().locator('select').first().selectOption('all')
const gated = page.locator('.fd-catalog section button', { hasText: '测试执行流程' })
assert.equal(await gated.locator('.rc-badge').innerText(), '待父流', '父流未引入的子流应标待父流')
assert.ok(await gated.isDisabled(), '父流未引入的子流不可引入')
await page.getByRole('button', { name: '完成' }).click()
ok('子流引入门禁（需父流已引入）')

// 12 引入：从目录引入刚取消的流，绑定已清空，状态未绑定
await page.getByRole('button', { name: /引入价值流/ }).click()
await page.waitForSelector('.fd-catalog')
// 弹窗默认筛「未引入」；本步要观察引入后徽标变化，切到「全部」
await page.locator('.rc-dialog, [role="dialog"]').last().locator('select').first().selectOption('all')
await page.locator('.rc-dialog, [role="dialog"]').last().locator('input[placeholder="搜索名称或编码"]').fill('产品研发全流程')
await page.waitForTimeout(120)
const row = page.locator('.fd-catalog section button', { hasText: '产品研发全流程' })
assert.equal(await row.locator('.rc-badge').innerText(), '引入', '目录中应为可引入态')
await row.click()
await page.waitForTimeout(150)
assert.equal(await page.locator('.fd-catalog section button', { hasText: '产品研发全流程' }).locator('.rc-badge').innerText(), '已引入', '引入后目录应标已引入')
await page.getByRole('button', { name: '完成' }).click()
const newRow = page.locator('.fd-table tbody tr', { hasText: '产品研发全流程' })
assert.equal(await newRow.count(), 1, '重新引入后应回到队列')
assert.match(await newRow.innerText(), /0\/9/, '重新引入后绑定应已清空')
assert.match(await newRow.innerText(), /未绑定/, '重新引入后状态应为未绑定')
ok('引入价值流（目录+搜索+幂等+绑定清空）')

// 13 树形：先引入子流，再验证收起/展开
await page.getByRole('button', { name: /引入价值流/ }).click()
await page.waitForSelector('.fd-catalog')
await page.locator('.rc-dialog, [role="dialog"]').last().locator('select').first().selectOption('all')
await page.locator('.fd-catalog section button', { hasText: '软件UI设计流程' }).click()
await page.getByRole('button', { name: '完成' }).click()
await page.waitForTimeout(200)
const childRow = page.locator('.fd-table tbody tr', { hasText: '软件UI设计流程' })
assert.equal(await childRow.count(), 1, '子流应作为树行显示')
await page.locator('.fd-tree-toggle[aria-expanded="true"]').first().click()
assert.equal(await childRow.count(), 0, '收起后子流行应隐藏')
await page.locator('.fd-tree-toggle[aria-expanded="false"]').first().click()
assert.equal(await childRow.count(), 1, '展开后子流行应恢复')
ok('树形展开/收起')

// 15 控制台无错误
assert.deepEqual(errors, [], '不应有控制台错误: ' + errors.join(' | '))
ok('无控制台错误')

await browser.close()
console.log('\n验收通过：' + results.length + ' 项')
