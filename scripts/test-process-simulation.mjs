/**
 * 流程仿真 · 剧本结构校验
 *
 * 运行：node scripts/test-process-simulation.mjs
 *
 * 与 scripts/test-working-group.mjs 同一套做法：把 .ts 现场转译成 .mjs 再 import。
 * 约束与产品约定保持一致：流程是纯线性的（流程定义里没有大节点层级）。
 */
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const cache = resolve('node_modules/.cache')
await mkdir(cache, { recursive: true })
const dir = await mkdtemp(resolve(cache, 'process-simulation-tests-'))

const MODULES = [{ dir: 'process-simulation', withExchange: false, label: 'V1' }]
const loaded = []
for (const m of MODULES) {
  const source = await readFile(`src/${m.dir}/script.ts`, 'utf8')
  const out = resolve(dir, `script-${m.dir}.mjs`)
  await writeFile(
    out,
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText,
  )
  const mod = await import(pathToFileURL(out))
  loaded.push({ ...m, runs: mod.simulationRuns })
}

/** 每个题材约定的节点数 */
const EXPECTED_NODES = { '软件需求交付流程': 7, '采购申请与执行流程': 5 }

let checks = 0
const ok = (label) => {
  checks += 1
  console.log(`PASS ${label}`)
}

function validateRuns(runs, withExchange, moduleLabel) {
assert.equal(runs.length, 2, `${moduleLabel} 应当正好有 2 个题材`)
ok(`【${moduleLabel}】题材数量：${runs.length}`)

for (const run of runs) {
  const tag = `[${moduleLabel}·${run.workflow}]`
  const ids = new Set(run.nodes.map((n) => n.id))
  const memberById = new Map(run.members.map((m) => [m.id, m]))
  const indexOf = (id) => run.nodes.findIndex((n) => n.id === id)

  // ① 节点数量与唯一性
  const expected = EXPECTED_NODES[run.workflow]
  assert.equal(run.nodes.length, expected, `${tag} 节点数应为 ${expected}`)
  assert.equal(ids.size, run.nodes.length, `${tag} 节点 id 有重复`)
  ok(`${tag} 节点数 ${run.nodes.length}、id 唯一`)

  // ② 纯线性：每个节点最多一条正向出边，正向边恰好覆盖整条链
  const forward = run.edges.filter((e) => indexOf(e.to) > indexOf(e.from))
  const back = run.edges.filter((e) => indexOf(e.to) < indexOf(e.from))
  for (const n of run.nodes) {
    const outs = forward.filter((e) => e.from === n.id)
    assert.ok(outs.length <= 1, `${tag} ${n.id} 有多条正向出边，不是线性流程`)
  }
  assert.equal(forward.length, run.nodes.length - 1, `${tag} 正向边数应等于 节点数 - 1`)
  for (let i = 0; i < run.nodes.length - 1; i += 1) {
    const e = forward.find((x) => x.from === run.nodes[i].id)
    assert.ok(e, `${tag} ${run.nodes[i].id} 没有连到下一个节点`)
    assert.equal(e.to, run.nodes[i + 1].id, `${tag} ${run.nodes[i].id} 的下一个节点不是数组里的下一个`)
    assert.ok(e.condition, `${tag} 边 ${e.from}→${e.to} 缺少条件`)
  }
  ok(`${tag} 纯线性：${forward.length} 条正向边首尾相接`)

  // ③ 执行人与其持有的岗位智能体必须对得上
  for (const n of run.nodes) {
    const m = memberById.get(n.actorId)
    assert.ok(m, `${tag} ${n.id} 的 actorId ${n.actorId} 不存在`)
    if (n.confirm) {
      assert.ok(m.human, `${tag} ${n.id} 是人工介入，执行人必须是真人`)
      continue
    }
    assert.ok(
      m.positions.some((p) => p.id === n.positionId),
      `${tag} ${n.id} 以「${n.positionId}」执行，但 ${m.person} 的分身并未持有该岗位智能体`,
    )
  }
  ok(`${tag} 每个节点的「人 + 岗位智能体」都能对上（含一人多岗）`)

  // ④ 至少有一人持有多个岗位智能体（一人多岗要能演出来）
  const multi = run.members.filter((m) => m.positions.length > 1)
  assert.ok(multi.length >= 1, `${tag} 没有体现「一人多岗」`)
  ok(`${tag} 一人多岗：${multi.map((m) => `${m.person}（${m.positions.length} 个）`).join('、')}`)

  // ⑤ 执行内容完整性
  for (const n of run.nodes) {
    if (n.confirm) {
      const c = n.confirm
      for (const k of ['question', 'description', 'approveLabel', 'rejectLabel', 'rejectTo', 'rejectReason']) {
        assert.ok(c[k], `${tag} ${n.id} 的 confirm 缺少 ${k}`)
      }
      assert.ok(ids.has(c.rejectTo), `${tag} ${n.id} 的 rejectTo=${c.rejectTo} 不存在`)
      continue
    }
    assert.ok(n.run, `${tag} ${n.id} 缺少 run 内容`)
    assert.ok(n.run.thinking?.length >= 2, `${tag} ${n.id} 思维链少于 2 条，看不出思考过程`)
    assert.ok(n.run.work, `${tag} ${n.id} 缺少 work`)
    assert.ok(n.run.conclusion, `${tag} ${n.id} 缺少 conclusion`)
    assert.ok(n.run.handoff, `${tag} ${n.id} 缺少「需要下面岗位做什么」`)
    assert.ok(n.dispatch, `${tag} ${n.id} 缺少「分身唤起岗位智能体」事件`)
  }
  ok(`${tag} 每个节点都有思维链 / 做了什么 / 结论 / 下游要求 / 调度事件`)

  // ⑥ 风险传递：承接上游风险的节点不少于一半，且必须有回退边
  const inherits = run.nodes.filter((n) => n.inherits)
  assert.ok(
    inherits.length >= Math.floor(run.nodes.length / 2),
    `${tag} 承接上游风险的节点只有 ${inherits.length} 个，风险传递不明显`,
  )
  for (const n of inherits) {
    assert.ok(ids.has(n.inherits.fromNodeId), `${tag} ${n.id} 承接的 ${n.inherits.fromNodeId} 不存在`)
    assert.ok(indexOf(n.inherits.fromNodeId) < indexOf(n.id), `${tag} ${n.id} 承接的是下游节点的风险`)
    assert.ok(n.inherits.label, `${tag} ${n.id} 承接风险缺少描述`)
  }
  const withRisk = run.nodes.filter((n) => n.run?.risks?.length).length
  assert.ok(withRisk >= 3, `${tag} 给出风险提示的节点只有 ${withRisk} 个`)
  assert.ok(back.length >= 1, `${tag} 没有回退边`)
  ok(`${tag} 风险传递：${inherits.length} 个节点承接上游 · ${withRisk} 个节点给出风险 · 回退边 ${back.length} 条`)

  // ⑦ 回退目标到确认节点之间存在 revisit 内容，否则重跑看不出区别
  const confirmNode = run.nodes.find((n) => n.confirm)
  assert.ok(confirmNode, `${tag} 没有人工介入节点`)
  const confirmed = run.edges.filter((e) => e.from === confirmNode.id)
  assert.equal(confirmed.length, 1, `${tag} 确认节点应有且只有一条回退边`)
  assert.equal(confirmed[0].to, confirmNode.confirm.rejectTo, `${tag} 回退边的目标与 confirm.rejectTo 不一致`)
  const rolled = run.nodes.slice(indexOf(confirmNode.confirm.rejectTo), indexOf(confirmNode.id))
  const withRevisit = rolled.filter((n) => n.revisit).length
  assert.ok(withRevisit >= 1, `${tag} 回退路径上没有 revisit 内容，重跑会重复播放`)
  ok(
    `${tag} 回退：${confirmNode.action} → ${run.nodes.find((n) => n.id === confirmNode.confirm.rejectTo).action}，` +
      `${withRevisit}/${rolled.length} 个节点有重跑内容`,
  )

  // ⑧ 编排内容完整，且「岗位到人」必须覆盖全部节点
  const orch = run.orchestration
  assert.ok(orch, `${tag} 缺少 orchestration`)
  assert.ok(orch.summary, `${tag} orchestration 缺少 summary`)
  assert.ok(orch.steps.length >= 3, `${tag} 编排步骤少于 3 步`)
  for (const s of orch.steps) {
    assert.ok(s.title, `${tag} 编排步骤 ${s.id} 缺少 title`)
    assert.ok(s.thinking, `${tag} 编排步骤 ${s.id} 缺少 thinking`)
    assert.ok(s.items?.length >= 2, `${tag} 编排步骤 ${s.id} 内容少于 2 条`)
    s.items.forEach((it, i) => {
      assert.ok(it.text, `${tag} 编排 ${s.id} 第 ${i + 1} 条缺少 text`)
      assert.ok(it.meta, `${tag} 编排 ${s.id} 第 ${i + 1} 条缺少 meta`)
    })
  }
  const assignStep = orch.steps.find((s) => s.title.includes('岗位到人'))
  assert.ok(assignStep, `${tag} 编排里没有「岗位到人」这一步`)
  assert.equal(
    assignStep.items.length,
    run.nodes.length,
    `${tag} 「岗位到人」覆盖 ${assignStep.items.length} 个节点，但流程有 ${run.nodes.length} 个`,
  )
  ok(`${tag} 编排 ${orch.steps.length} 步 · 岗位到人覆盖 ${assignStep.items.length}/${run.nodes.length} 个节点`)

  // ⑨ 全流程结论
  assert.ok(run.conclusion?.points?.length >= 3, `${tag} 缺少全流程结论`)
  ok(`${tag} 全流程结论 ${run.conclusion.points.length} 条`)

  // ⑩ V2 专属：每个节点都要有沟通过程，且必须是有信息量的往返
  if (withExchange) {
    for (const n of run.nodes) {
      const ex = n.confirm ? n.confirmExchange : n.run?.exchange
      assert.ok(Array.isArray(ex) && ex.length >= 2, `${tag} ${n.id} 缺少沟通过程（至少 2 句）`)
      assert.equal(ex[0].from, 'twin', `${tag} ${n.id} 的沟通过程不是从分身派活开始`)
      ex.forEach((t, i) => {
        assert.ok(t.from === 'twin' || t.from === 'agent', `${tag} ${n.id} 第 ${i + 1} 句 from 非法`)
        assert.ok(t.text && t.text.length >= 12, `${tag} ${n.id} 第 ${i + 1} 句太短，像客套话`)
      })
      // 非人工介入节点：必须有来有回（至少一条子代理发言），且最后一句是子代理收
      if (!n.confirm) {
        const peerLines = ex.filter((t) => t.from === 'agent').length
        assert.ok(peerLines >= 1, `${tag} ${n.id} 的子代理一句话没说，不是对话`)
        assert.equal(ex[ex.length - 1].from, 'agent', `${tag} ${n.id} 的沟通过程不是子代理收尾`)
        // 承接上游风险的节点，派单里必须转达上游信息
        if (n.inherits) {
          const first = ex[0].text
          assert.ok(
            first.length >= 40,
            `${tag} ${n.id} 承接了上游风险，但派单只说了 ${first.length} 字，没转达上游信息`,
          )
        }
      }
    }
    // 重跑也必须换一套对话，否则重跑时沟通视图会重复播放
    for (const n of run.nodes) {
      if (n.revisit) {
        assert.ok(
          Array.isArray(n.revisit.exchange) && n.revisit.exchange.length >= 2,
          `${tag} ${n.id} 有重跑内容，但没写重跑的沟通过程`,
        )
        assert.notDeepEqual(n.revisit.exchange, n.run.exchange, `${tag} ${n.id} 的重跑对话与首次完全相同`)
      }
    }
    const turns = run.nodes.reduce(
      (a, n) => a + ((n.confirm ? n.confirmExchange : n.run?.exchange)?.length ?? 0),
      0,
    )
    ok(`${tag} 沟通过程齐备：${run.nodes.length} 个节点共 ${turns} 句往返`)
  }
}
}

validateRuns(loaded[0].runs, loaded[0].withExchange, loaded[0].label)

console.log(`\n${checks} 项剧本校验通过。`)
