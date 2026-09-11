# 工作小组执行视图（组织智能 · 协同执行具象化）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个自包含的「工作小组执行视图」组件——用一条全程铺开、逐个点亮的节点轨道，流式地展示一组岗位智能体从"讨论 → 结论 → 执行 → 待确认"的协作过程，每个节点的内容都带"思维链（思考过程）+ 正式输出"的流式呈现。

**Architecture:** 纯前端 React 组件 + Mock 剧本。数据层（types + script）与纯播放逻辑（playback）独立于 React，可被 `scripts/test-working-group.mjs` 用现有 `typescript.transpileModule` 模式断言；播放 Hook（`useWorkingGroupPlayback`）用定时器驱动节点流式推进与"待确认"挂起；渲染层（Node + View）负责视觉呈现。入口与"编排演出（组队确认卡）"不在本计划范围。

**Tech Stack:** React 19 + TypeScript + Vite + lucide-react。测试沿用项目现有模式（`node scripts/test-working-group.mjs`，TypeScript 转译 + `node:assert`）。

**范围边界（明确不在本计划内）：**
- 入口：执行视图最终挂载在哪（独立全屏页 / 助理内嵌 / 组织智能看板）、侧栏入口、回看入口——**待后续讨论**。
- 触发编排演出：自然语言触发、识别→拆解→组队的逐步动画、组队确认卡——**待后续讨论**。本计划只做"组队之后"的执行视图（含一个收起态编排摘要条）。
- 真实数据/接口：全部 Mock，不做后端。

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `src/working-group/types.ts` | 全部类型定义（成员、节点、阶段、Run） |
| `src/working-group/script.ts` | Mock 剧本：发动机适航风险评审（节点、思维链、对话、产物、确认） |
| `src/working-group/playback.ts` | 纯逻辑：剧本校验、阻塞判断、并行分组、拉人成员 |
| `src/working-group/useWorkingGroupPlayback.ts` | 播放 Hook：定时器驱动的流式推进 + 待确认挂起 |
| `src/working-group/WorkingGroupNode.tsx` | 单节点渲染：思维链 + 各类节点内容 |
| `src/working-group/WorkingGroupExecutionView.tsx` | 执行视图：成员胶囊、阶段、节点轨道、进度 |
| `src/working-group/working-group.css` | 样式 |
| `scripts/test-working-group.mjs` | 纯逻辑测试（沿用 test-role-center.mjs 模式） |

---

## Task 1: 类型定义

**Files:**
- Create: `src/working-group/types.ts`

- [ ] **Step 1: 写入完整类型文件**

```ts
export type WorkingGroupMember = {
  id: string
  role: string // 岗位名，如 '质量适航岗'
  person: string // 人名，如 '陈工'
  color: 'blue' | 'green' | 'purple' | 'orange'
}

export type WorkingGroupNodeKind =
  | 'speak' // 发言（对话讨论）
  | 'dispatch' // 下发（任务下发）
  | 'produce' // 产出（产物发送）
  | 'pull' // 拉人（引入新成员，待确认）
  | 'conclusion' // 结论（讨论收敛）
  | 'confirm' // 待确认（对外/拍板动作）

export type WorkingGroupNodeStatus = 'pending' | 'running' | 'done' | 'awaiting'

export type WorkingGroupNode = {
  id: string
  phaseId: string
  actorId: string // WorkingGroupMember.id 或 'user'
  kind: WorkingGroupNodeKind
  thinking: string[] // 思维链步骤，逐条流式展示
  content?: string // speak / conclusion 的正式输出正文
  dispatch?: { assigneeId: string; title: string }
  artifact?: { name: string; kind: 'docx' | 'md' | 'pptx'; summary: string }
  pull?: { role: string; person: string; reason: string }
  confirm?: { question: string; description: string; actionLabel: string }
  parallelGroup?: string // 相同值的节点并行执行
}

export type WorkingGroupPhase = { id: string; title: string }

export type WorkingGroupRun = {
  id: string
  title: string
  orchestrationSummary: string[] // 编排结果摘要（收起态展示）
  members: WorkingGroupMember[]
  phases: WorkingGroupPhase[]
  nodes: WorkingGroupNode[]
}
```

- [ ] **Step 2: 确认类型无运行时依赖**

该文件仅含 `type`/`export type`，无任何运行时代码，`transpileModule` 转译后为空，可安全被 `scripts/test-working-group.mjs` 引用。

- [ ] **Step 3: 提交**

```bash
git add src/working-group/types.ts
git commit -m "feat(working-group): add types for working group execution view"
```

---

## Task 2: Mock 剧本数据

**Files:**
- Create: `src/working-group/script.ts`

- [ ] **Step 1: 写入剧本文件**

```ts
import type { WorkingGroupRun } from './types'

export const engineRiskReviewRun: WorkingGroupRun = {
  id: 'working-group-engine-risk-review',
  title: '发动机适航风险评审',
  orchestrationSummary: [
    '已识别任务：发动机适航风险评审',
    '已拆解 4 项工作事项',
    '已引用能力地图「风险治理」流程',
    '已组建小组：项目管理 · 质量适航 · 总体设计',
  ],
  members: [
    { id: 'pm', role: '项目管理岗', person: '赵总', color: 'purple' },
    { id: 'quality', role: '质量适航岗', person: '陈工', color: 'green' },
    { id: 'overall', role: '总体设计岗', person: '刘工', color: 'blue' },
  ],
  phases: [
    { id: 'discussion', title: '阶段一 · 方案讨论' },
    { id: 'execution', title: '阶段二 · 执行' },
  ],
  nodes: [
    {
      id: 'n1',
      phaseId: 'discussion',
      actorId: 'pm',
      kind: 'speak',
      thinking: [
        '需要先明确本次评审的目标和验收口径，避免后续讨论发散',
        '评审对象是发动机的适航风险，重点在于风险项的识别与关闭责任',
        '验收口径应定为：风险项可追溯、关闭责任到人、有时间节点',
      ],
      content:
        '先明确本次评审目标：识别发动机适航风险项，落实关闭责任人和时间节点，形成可执行的关闭计划。验收口径是——每一项风险都有明确的依据、责任人和关闭时间。',
    },
    {
      id: 'n2',
      phaseId: 'discussion',
      actorId: 'quality',
      kind: 'speak',
      thinking: [
        '从适航符合性角度，我需要核对关键材料的验证范围是否完整',
        '异常项的关闭责任人必须明确，否则评审无法闭环',
        '供应商交付的材料也涉及质量闭环，可能超出当前三个岗位的覆盖',
      ],
      content:
        '从适航符合性看，重点是核对关键材料的符合性验证范围，异常项要有明确的关闭责任人。另外，供应商交付材料也涉及质量闭环，建议引入供应链质量岗一起评审。',
    },
    {
      id: 'n3',
      phaseId: 'discussion',
      actorId: 'quality',
      kind: 'pull',
      thinking: [
        '质量岗提出供应商交付材料的风险，确实超出当前三个岗位的覆盖范围',
        '需要引入供应链质量岗来补充供应商交付风险与验收节点',
      ],
      pull: { role: '供应链质量岗', person: '王五', reason: '补充供应商交付风险与验收节点' },
      confirm: {
        question: '是否拉入「供应链质量岗」进组？',
        description: '质量适航岗建议引入供应链质量岗，补充供应商交付风险与验收节点。',
        actionLabel: '确认拉入',
      },
    },
    {
      id: 'n4',
      phaseId: 'discussion',
      actorId: 'supply',
      kind: 'speak',
      thinking: [
        '刚被拉入，先确认自己的职责边界：供应商交付的进度、质量闭环和验收节点',
        '重点补充供应商材料的交付风险，以及验收时需要供应商侧提供什么',
      ],
      content:
        '我来补充供应商交付风险：重点关注材料交付进度、供应商质量闭环，以及验收时需要供应商提供的符合性证据。',
    },
    {
      id: 'n5',
      phaseId: 'discussion',
      actorId: 'overall',
      kind: 'speak',
      thinking: [
        '在前两位基础上，从总体方案角度补充接口变更的影响',
        '接口变更会影响上下游专业，需要一份影响矩阵避免评审后返工',
      ],
      content:
        '在陈工和王五的基础上，总体方案还应补充接口变更对上下游专业的影响矩阵，避免评审后再次返工。',
    },
    {
      id: 'n6',
      phaseId: 'discussion',
      actorId: 'pm',
      kind: 'conclusion',
      thinking: [
        '综合质量、总体、供应链三方的意见，收敛成一个可执行的评审目标',
        '目标要覆盖：风险梳理、质量符合性、供应商风险、接口影响四个维度',
        '最终落成 4 项工作事项 + 关闭计划',
      ],
      content:
        '目标定稿：① 梳理适航风险项 ② 质量角度核对符合性 ③ 供应商交付风险 ④ 总体接口影响矩阵；最终形成评审结论与关闭计划。',
    },
    {
      id: 'n7',
      phaseId: 'execution',
      actorId: 'pm',
      kind: 'dispatch',
      thinking: ['目标已定，现在把第一项工作下发', '符合性核对是质量岗的职责，先下发给它'],
      dispatch: { assigneeId: 'quality', title: '适航符合性核对' },
    },
    {
      id: 'n8',
      phaseId: 'execution',
      actorId: 'quality',
      kind: 'produce',
      parallelGroup: 'p1',
      thinking: ['开始核对关键材料的符合性验证范围', '汇总异常项和关闭责任人', '形成核对表'],
      artifact: {
        name: '适航符合性核对表.docx',
        kind: 'docx',
        summary: '关键材料的符合性验证范围、异常项与关闭责任人',
      },
    },
    {
      id: 'n9',
      phaseId: 'execution',
      actorId: 'overall',
      kind: 'produce',
      parallelGroup: 'p1',
      thinking: ['并行梳理接口变更对上下游专业的影响', '整理成影响矩阵'],
      artifact: {
        name: '接口影响矩阵.md',
        kind: 'md',
        summary: '接口变更对上下游专业的影响范围',
      },
    },
    {
      id: 'n10',
      phaseId: 'execution',
      actorId: 'supply',
      kind: 'speak',
      thinking: ['供应商交付风险已补充完毕，纳入关闭计划'],
      content: '供应商交付风险已同步：材料交付进度和验收节点已纳入关闭计划。',
    },
    {
      id: 'n11',
      phaseId: 'execution',
      actorId: 'pm',
      kind: 'produce',
      thinking: ['汇总三方结论与风险，形成最终评审结论与关闭计划'],
      artifact: {
        name: '评审结论与关闭计划.pptx',
        kind: 'pptx',
        summary: '评审结论、风险清单与关闭责任人',
      },
    },
    {
      id: 'n12',
      phaseId: 'execution',
      actorId: 'user',
      kind: 'confirm',
      thinking: ['评审已完成，需要用户决定是否对外同步'],
      confirm: {
        question: '是否将评审结论同步给供应商侧？',
        description: '评审结论涉及供应商交付风险，同步后供应商可查看相关风险项与关闭要求。',
        actionLabel: '确认同步',
      },
    },
  ],
}
```

- [ ] **Step 2: 检查剧本完整性**

确认：`supply` 成员不在初始 `members` 里（由 `n3` 拉人动态加入）；`n8`/`n9` 同属 `parallelGroup: 'p1'`；`n3`（pull）和 `n12`（confirm）是仅有的两个阻塞节点。

- [ ] **Step 3: 提交**

```bash
git add src/working-group/script.ts
git commit -m "feat(working-group): add engine risk review demo script"
```

---

## Task 3: 纯播放逻辑 + 测试

**Files:**
- Create: `src/working-group/playback.ts`
- Create: `scripts/test-working-group.mjs`

- [ ] **Step 1: 写入纯逻辑文件**

```ts
import type { WorkingGroupMember, WorkingGroupNode, WorkingGroupRun } from './types'

export function isBlocking(node: WorkingGroupNode): boolean {
  return node.kind === 'pull' || node.kind === 'confirm'
}

export function validateRun(run: WorkingGroupRun): string[] {
  const errors: string[] = []
  const memberIds = new Set(run.members.map((m) => m.id))
  const phaseIds = new Set(run.phases.map((p) => p.id))
  const seen = new Set<string>()
  run.nodes.forEach((node) => {
    if (seen.has(node.id)) errors.push(`重复节点 id：${node.id}`)
    seen.add(node.id)
    if (!phaseIds.has(node.phaseId)) errors.push(`${node.id}：无效 phaseId`)
    if (node.actorId !== 'user' && !memberIds.has(node.actorId)) {
      errors.push(`${node.id}：无效 actorId ${node.actorId}`)
    }
    if (node.thinking.length === 0) errors.push(`${node.id}：缺少思维链`)
    if (node.kind === 'dispatch' && !node.dispatch) errors.push(`${node.id}：下发节点缺少 dispatch`)
    if (node.kind === 'produce' && !node.artifact) errors.push(`${node.id}：产出节点缺少 artifact`)
    if (node.kind === 'pull' && (!node.pull || !node.confirm)) errors.push(`${node.id}：拉人节点缺少 pull/confirm`)
    if (node.kind === 'confirm' && !node.confirm) errors.push(`${node.id}：确认节点缺少 confirm`)
    if ((node.kind === 'speak' || node.kind === 'conclusion') && !node.content) {
      errors.push(`${node.id}：缺少正文`)
    }
    if (node.kind === 'dispatch' && node.dispatch && !memberIds.has(node.dispatch.assigneeId)) {
      errors.push(`${node.id}：下发目标无效 ${node.dispatch.assigneeId}`)
    }
  })
  return errors
}

export function groupNodeIds(run: WorkingGroupRun, node: WorkingGroupNode): string[] {
  if (!node.parallelGroup) return [node.id]
  return run.nodes
    .filter((n) => n.parallelGroup === node.parallelGroup)
    .map((n) => n.id)
}

export function pullMember(node: WorkingGroupNode): WorkingGroupMember | null {
  if (node.kind !== 'pull' || !node.pull) return null
  return {
    id: `member-${node.pull.person}`,
    role: node.pull.role,
    person: node.pull.person,
    color: 'orange',
  }
}
```

- [ ] **Step 2: 写入测试脚本**

```js
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
const cache = resolve("node_modules/.cache");
await mkdir(cache, { recursive: true });
const dir = await mkdtemp(resolve(cache, "working-group-tests-"));
for (const name of ["playback", "script"]) {
  const source = await readFile(`src/working-group/${name}.ts`, "utf8");
  await writeFile(
    resolve(dir, `${name}.mjs`),
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText,
  );
}
const { validateRun, isBlocking, groupNodeIds, pullMember } = await import(
  pathToFileURL(resolve(dir, "playback.mjs"))
);
const { engineRiskReviewRun } = await import(pathToFileURL(resolve(dir, "script.mjs")));

// 1. 剧本结构完整
assert.deepEqual(validateRun(engineRiskReviewRun), []);

// 2. 阻塞节点判定
const pull = engineRiskReviewRun.nodes.find((n) => n.id === "n3");
const confirm = engineRiskReviewRun.nodes.find((n) => n.id === "n12");
const speak = engineRiskReviewRun.nodes.find((n) => n.id === "n1");
assert.equal(isBlocking(pull), true);
assert.equal(isBlocking(confirm), true);
assert.equal(isBlocking(speak), false);

// 3. 并行分组
const p1 = engineRiskReviewRun.nodes.find((n) => n.id === "n8");
assert.deepEqual(groupNodeIds(engineRiskReviewRun, p1).sort(), ["n8", "n9"]);
const n1 = engineRiskReviewRun.nodes.find((n) => n.id === "n1");
assert.deepEqual(groupNodeIds(engineRiskReviewRun, n1), ["n1"]);

// 4. 拉人成员
const added = pullMember(pull);
assert.equal(added.role, "供应链质量岗");
assert.equal(added.person, "王五");
assert.equal(pullMember(speak), null);

// 5. 剧本里 supply 由拉人动态加入，不在初始成员
assert(!engineRiskReviewRun.members.some((m) => m.id === "supply"));

console.log("PASS working-group 剧本校验、阻塞判定、并行分组与拉人成员");
await rm(dir, { recursive: true, force: true });
```

- [ ] **Step 3: 运行测试，确认通过**

Run: `node scripts/test-working-group.mjs`
Expected: 输出 `PASS working-group 剧本校验、阻塞判定、并行分组与拉人成员`，无异常抛出。

- [ ] **Step 4: 提交**

```bash
git add src/working-group/playback.ts scripts/test-working-group.mjs
git commit -m "feat(working-group): add pure playback logic and tests"
```

---

## Task 4: 播放 Hook

**Files:**
- Create: `src/working-group/useWorkingGroupPlayback.ts`

- [ ] **Step 1: 写入 Hook**

```ts
import { useEffect, useRef, useState } from 'react'
import type {
  WorkingGroupMember,
  WorkingGroupNodeStatus,
  WorkingGroupRun,
} from './types'
import { groupNodeIds, isBlocking, pullMember } from './playback'

const THINKING_DELAY = 800 // 每条思维链间隔
const CONTENT_STEP = 5 // 正文每步增加字数
const CONTENT_DELAY = 45 // 正文每步间隔

export function useWorkingGroupPlayback(run: WorkingGroupRun) {
  const [statuses, setStatuses] = useState<Record<string, WorkingGroupNodeStatus>>(() =>
    Object.fromEntries(run.nodes.map((n) => [n.id, 'pending' as const])),
  )
  const [thinking, setThinking] = useState<Record<string, number>>({})
  const [content, setContent] = useState<Record<string, string>>({})
  const [members, setMembers] = useState<WorkingGroupMember[]>(run.members)
  const [cursor, setCursor] = useState(0)
  const timersRef = useRef<number[]>([])

  const clearTimers = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t))
    timersRef.current = []
  }
  useEffect(() => clearTimers, [])

  const node = run.nodes[cursor] ?? null
  const group = node ? groupNodeIds(run, node) : []

  const finish = (id: string) => {
    setStatuses((prev) => (prev[id] === 'awaiting' ? prev : { ...prev, [id]: 'done' }))
  }

  const play = (id: string) => {
    const n = run.nodes.find((x) => x.id === id)
    if (!n) return
    let ti = 0
    const streamThinking = () => {
      if (ti >= n.thinking.length) {
        streamContent()
        return
      }
      setThinking((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
      ti += 1
      timersRef.current.push(window.setTimeout(streamThinking, THINKING_DELAY))
    }
    const streamContent = () => {
      const full = n.content ?? ''
      let ci = 0
      const step = () => {
        ci = Math.min(ci + CONTENT_STEP, full.length)
        setContent((prev) => ({ ...prev, [id]: full.slice(0, ci) }))
        if (ci < full.length) {
          timersRef.current.push(window.setTimeout(step, CONTENT_DELAY))
        } else {
          timersRef.current.push(window.setTimeout(() => finish(id), 400))
        }
      }
      step()
    }
    streamThinking()
  }

  // 启动 cursor 指向的组（若尚未启动）
  useEffect(() => {
    if (!node) return
    const allPending = group.every((id) => statuses[id] === 'pending')
    if (!allPending) return
    group.forEach((id) => {
      const n = run.nodes.find((x) => x.id === id)
      if (!n) return
      if (isBlocking(n)) {
        setStatuses((prev) => ({ ...prev, [id]: 'awaiting' }))
      } else {
        setStatuses((prev) => ({ ...prev, [id]: 'running' }))
        play(id)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor])

  // 组内全部完成后推进 cursor
  useEffect(() => {
    if (!node) return
    const allDone = group.every((id) => statuses[id] === 'done')
    if (allDone) setCursor((c) => Math.min(c + group.length, run.nodes.length))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statuses])

  const confirm = (id: string) => {
    const n = run.nodes.find((x) => x.id === id)
    if (!n) return
    const m = pullMember(n)
    if (m) setMembers((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
    setStatuses((prev) => ({ ...prev, [id]: 'done' }))
  }

  const doneCount = run.nodes.filter((n) => statuses[n.id] === 'done').length

  return {
    statuses,
    thinking,
    content,
    members,
    current: node,
    confirm,
    doneCount,
    total: run.nodes.length,
    isComplete: doneCount === run.nodes.length,
  }
}
```

- [ ] **Step 2: 说明 Hook 契约（供后续渲染层使用）**

返回值：`statuses`（每节点状态）、`thinking`（每节点已展示思维链条数）、`content`（每节点已展示正文）、`members`（动态成员，拉人后 +1）、`confirm(id)`（处理阻塞节点）、`doneCount`/`total`/`isComplete`（进度）。

- [ ] **Step 3: 提交**

```bash
git add src/working-group/useWorkingGroupPlayback.ts
git commit -m "feat(working-group): add playback hook with streaming and confirm pause"
```

---

## Task 5: 单节点渲染器（含思维链流式）

**Files:**
- Create: `src/working-group/WorkingGroupNode.tsx`

- [ ] **Step 1: 写入节点渲染器**

```tsx
import {
  Bot,
  Check,
  CircleDashed,
  FileText,
  GitBranch,
  Loader2,
  Send,
  Sparkles,
  UserPlus,
} from 'lucide-react'
import { useState } from 'react'
import type { WorkingGroupMember, WorkingGroupNode, WorkingGroupNodeStatus } from './types'

function actorOf(node: WorkingGroupNode, members: WorkingGroupMember[]): WorkingGroupMember | null {
  return members.find((m) => m.id === node.actorId) ?? null
}

function statusIcon(status: WorkingGroupNodeStatus) {
  if (status === 'done') return <Check size={16} />
  if (status === 'running') return <Loader2 size={16} className="wg-spin" />
  if (status === 'awaiting') return <UserPlus size={16} />
  return <CircleDashed size={16} />
}

export default function WorkingGroupNode({
  node,
  status,
  thinkingCount,
  content,
  members,
  onConfirm,
}: {
  node: WorkingGroupNode
  status: WorkingGroupNodeStatus
  thinkingCount: number
  content: string
  members: WorkingGroupMember[]
  onConfirm: () => void
}) {
  const [thinkingOpen, setThinkingOpen] = useState(true)
  const actor = actorOf(node, members)
  const isUser = node.actorId === 'user'
  const done = status === 'done'
  const awaiting = status === 'awaiting'
  const running = status === 'running'

  return (
    <article className={`wg-node wg-node--${status}`}>
      <header className="wg-node-head">
        <span className={`wg-status wg-status--${status}`}>{statusIcon(status)}</span>
        <span className={`wg-avatar ${actor ? `wg-avatar--${actor.color}` : 'wg-avatar--user'}`}>
          {isUser ? '我' : (actor?.person ?? '?').slice(0, 1)}
        </span>
        <div className="wg-actor">
          <strong>{isUser ? '你（真人）' : actor?.role ?? '未知岗位'}</strong>
          {actor && <em>{actor.person}</em>}
        </div>
        <span className="wg-kind">{node.kind}</span>
      </header>

      {thinkingCount > 0 && (
        <div className="wg-thinking">
          <button
            className="wg-thinking-toggle"
            type="button"
            onClick={() => setThinkingOpen((v) => !v)}
          >
            <Sparkles size={14} />
            {running ? '思考中…' : `思考过程（${thinkingCount}/${node.thinking.length}）`}
          </button>
          {thinkingOpen && (
            <ol>
              {node.thinking.slice(0, thinkingCount).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className="wg-body">
        {node.kind === 'speak' && <p>{content}{running && <span className="wg-caret" />}</p>}

        {node.kind === 'conclusion' && (
          <div className="wg-conclusion">
            <span className="wg-conclusion-mark">◈</span>
            <p>{content}{running && <span className="wg-caret" />}</p>
          </div>
        )}

        {node.kind === 'dispatch' && node.dispatch && (
          <div className="wg-dispatch">
            <GitBranch size={16} />
            <div>
              <small>任务下发</small>
              <strong>{node.dispatch.title}</strong>
              <em>→ {members.find((m) => m.id === node.dispatch!.assigneeId)?.role ?? '—'}</em>
            </div>
          </div>
        )}

        {node.kind === 'produce' && node.artifact && (
          <div className="wg-artifact">
            <FileText size={18} />
            <div>
              <strong>{node.artifact.name}</strong>
              <em>{node.artifact.summary}</em>
            </div>
          </div>
        )}

        {node.kind === 'pull' && node.pull && (
          <div className="wg-pull">
            <UserPlus size={16} />
            <p>
              建议拉入 <strong>{node.pull.role}</strong>（{node.pull.person}）：{node.pull.reason}
            </p>
          </div>
        )}

        {node.kind === 'confirm' && node.confirm && (
          <div className="wg-confirm">
            <h4>{node.confirm.question}</h4>
            <p>{node.confirm.description}</p>
          </div>
        )}
      </div>

      {awaiting && node.confirm && (
        <footer className="wg-node-action">
          <button className="wg-primary" type="button" onClick={onConfirm}>
            <Send size={15} />
            {node.confirm.actionLabel}
          </button>
          <small>需要你确认后，小组才会继续。</small>
        </footer>
      )}

      {done && <span className="wg-done-tag">已完成</span>}
    </article>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/working-group/WorkingGroupNode.tsx
git commit -m "feat(working-group): add node renderer with thinking chain"
```

---

## Task 6: 执行视图

**Files:**
- Create: `src/working-group/WorkingGroupExecutionView.tsx`

- [ ] **Step 1: 写入执行视图**

```tsx
import { useWorkingGroupPlayback } from './useWorkingGroupPlayback'
import WorkingGroupNode from './WorkingGroupNode'
import type { WorkingGroupRun } from './types'
import './working-group.css'

export default function WorkingGroupExecutionView({ run }: { run: WorkingGroupRun }) {
  const { statuses, thinking, content, members, confirm, doneCount, total, isComplete } =
    useWorkingGroupPlayback(run)

  return (
    <section className="wg-view">
      <header className="wg-header">
        <div>
          <p>工作小组</p>
          <h1>{run.title}</h1>
        </div>
        <div className="wg-members">
          {members.map((m) => (
            <span key={m.id} className={`wg-member wg-member--${m.color}`}>
              <i>{m.person.slice(0, 1)}</i>
              {m.role}
            </span>
          ))}
        </div>
        <span className="wg-progress">{isComplete ? '已完成' : `进行中 ${doneCount}/${total}`}</span>
      </header>

      <div className="wg-orchestration">
        <span>◎ 编排完成</span>
        <span>{run.orchestrationSummary.join(' · ')}</span>
      </div>

      {run.phases.map((phase) => (
        <section key={phase.id} className="wg-phase">
          <h2>{phase.title}</h2>
          <div className="wg-track">
            {run.nodes
              .filter((n) => n.phaseId === phase.id)
              .map((n) => (
                <WorkingGroupNode
                  key={n.id}
                  node={n}
                  status={statuses[n.id]}
                  thinkingCount={thinking[n.id] ?? 0}
                  content={content[n.id] ?? ''}
                  members={members}
                  onConfirm={() => confirm(n.id)}
                />
              ))}
          </div>
        </section>
      ))}
    </section>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/working-group/WorkingGroupExecutionView.tsx
git commit -m "feat(working-group): add execution view with phase track"
```

---

## Task 7: 样式

**Files:**
- Create: `src/working-group/working-group.css`

- [ ] **Step 1: 写入样式**

```css
.wg-view {
  height: 100%;
  overflow-y: auto;
  padding: 24px 28px 40px;
  background: #f6f7fb;
  color: #1c2433;
}
.wg-header {
  display: flex;
  align-items: flex-end;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.wg-header p {
  margin: 0 0 2px;
  font-size: 12px;
  letter-spacing: 2px;
  color: #7a8699;
}
.wg-header h1 {
  margin: 0;
  font-size: 22px;
}
.wg-members {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.wg-member {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 6px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid #e6e9f0;
  font-size: 12px;
}
.wg-member i {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  font-style: normal;
  font-size: 11px;
}
.wg-member--blue i { background: #2e87e7; }
.wg-member--green i { background: #2eb872; }
.wg-member--purple i { background: #7b5fd6; }
.wg-member--orange i { background: #e8942e; }
.wg-progress {
  margin-left: auto;
  font-size: 12px;
  color: #2e87e7;
  font-weight: 600;
}
.wg-orchestration {
  display: flex;
  gap: 10px;
  align-items: baseline;
  padding: 10px 14px;
  margin-bottom: 20px;
  border-radius: 10px;
  background: #eef4fd;
  color: #5a6a84;
  font-size: 12px;
}
.wg-orchestration span:first-child {
  color: #2e87e7;
  font-weight: 600;
  white-space: nowrap;
}
.wg-phase { margin-bottom: 20px; }
.wg-phase > h2 {
  margin: 0 0 12px;
  font-size: 13px;
  color: #7a8699;
  font-weight: 600;
  letter-spacing: 1px;
}
.wg-track {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
}
.wg-track::before {
  content: '';
  position: absolute;
  left: 22px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: #e6e9f0;
}
.wg-node {
  position: relative;
  margin-left: 46px;
  padding: 14px 16px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e6e9f0;
  transition: border-color 0.2s;
}
.wg-node--running { border-color: #2e87e7; }
.wg-node--awaiting { border-color: #e8942e; box-shadow: 0 0 0 3px rgba(232, 148, 46, 0.12); }
.wg-node--done { opacity: 0.9; }
.wg-node-head { display: flex; align-items: center; gap: 10px; }
.wg-status {
  position: absolute;
  left: -34px;
  top: 14px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #fff;
  border: 1px solid #e6e9f0;
  color: #9aa5b5;
}
.wg-status--running { color: #2e87e7; border-color: #2e87e7; }
.wg-status--done { color: #2eb872; border-color: #2eb872; background: #2eb872; color: #fff; }
.wg-status--awaiting { color: #e8942e; border-color: #e8942e; }
.wg-spin { animation: wg-spin 1s linear infinite; }
@keyframes wg-spin { to { transform: rotate(360deg); } }
.wg-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 13px;
}
.wg-avatar--blue { background: #2e87e7; }
.wg-avatar--green { background: #2eb872; }
.wg-avatar--purple { background: #7b5fd6; }
.wg-avatar--orange { background: #e8942e; }
.wg-avatar--user { background: #1c2433; }
.wg-actor strong { display: block; font-size: 13px; }
.wg-actor em { font-style: normal; font-size: 11px; color: #7a8699; }
.wg-kind { margin-left: auto; font-size: 11px; color: #9aa5b5; }
.wg-thinking { margin: 10px 0 0 38px; }
.wg-thinking-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: none;
  padding: 0;
  font-size: 12px;
  color: #7a8699;
  cursor: pointer;
}
.wg-thinking ol {
  margin: 6px 0 0;
  padding-left: 18px;
  color: #7a8699;
  font-size: 12px;
  border-left: 2px solid #eef0f5;
}
.wg-thinking li { margin: 3px 0; }
.wg-body { margin: 8px 0 0 38px; font-size: 13px; line-height: 1.7; }
.wg-body p { margin: 0; }
.wg-caret {
  display: inline-block;
  width: 2px;
  height: 14px;
  margin-left: 2px;
  vertical-align: -2px;
  background: #2e87e7;
  animation: wg-blink 0.9s steps(1) infinite;
}
@keyframes wg-blink { 50% { opacity: 0; } }
.wg-conclusion {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #eef4fd;
}
.wg-conclusion-mark { color: #2e87e7; font-size: 16px; }
.wg-dispatch, .wg-artifact, .wg-pull {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8f9fc;
  border: 1px dashed #e0e4ee;
}
.wg-dispatch small { display: block; font-size: 11px; color: #7a8699; }
.wg-dispatch strong { display: block; }
.wg-dispatch em { font-style: normal; font-size: 12px; color: #7a8699; }
.wg-artifact strong { display: block; }
.wg-artifact em { font-style: normal; font-size: 12px; color: #7a8699; }
.wg-pull p { margin: 0; }
.wg-confirm { padding: 10px 12px; border-radius: 8px; background: #fff7ec; border: 1px solid #f3d9ad; }
.wg-confirm h4 { margin: 0 0 4px; font-size: 13px; }
.wg-confirm p { margin: 0; font-size: 12px; color: #7a8699; }
.wg-node-action {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px 0 0 38px;
}
.wg-node-action small { font-size: 11px; color: #9aa5b5; }
.wg-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: none;
  border-radius: 8px;
  background: #2e87e7;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}
.wg-primary:hover { background: #1f74cf; }
.wg-done-tag {
  position: absolute;
  right: 14px;
  top: 14px;
  font-size: 11px;
  color: #2eb872;
}
```

- [ ] **Step 2: 提交**

```bash
git add src/working-group/working-group.css
git commit -m "feat(working-group): add execution view styles"
```

---

## Task 8: 临时 dev 挂载（待入口方案确定后移除）

**Files:**
- Modify: `src/App.tsx`

> 此任务仅为让组件可预览而加的**临时**挂载，通过 `?view=working-group` 访问。入口方案确定后需移除并替换。

- [ ] **Step 1: 添加导入**

在 `src/App.tsx` 顶部 import 区（`import OrganizationWorkbench ...` 之后）添加：

```ts
import WorkingGroupExecutionView from './working-group/WorkingGroupExecutionView'
import { engineRiskReviewRun } from './working-group/script'
```

- [ ] **Step 2: 在 `App` 函数内添加临时早返回**

在 `const surfaceMode = appMode` 之后、`return (...)` 之前添加：

```ts
  // TODO(临时)：仅用于开发预览，入口方案确定后移除
  if (new URLSearchParams(location.search).get('view') === 'working-group') {
    return <WorkingGroupExecutionView run={engineRiskReviewRun} />
  }
```

- [ ] **Step 3: 运行并验证**

Run: `npm run dev`，浏览器访问 `http://localhost:5173/SFZN-AI/?view=working-group`

Expected:
- 顶部显示成员胶囊（项目管理岗/质量适航岗/总体设计岗）与进度 `进行中 0/12`
- 节点自动依次点亮：发言流式展示思维链 + 正文 → 拉人节点停在"待我确认" → 点「确认拉入」后成员胶囊出现第 4 人「供应链质量岗」并继续 → 结论 → 下发 → 两个产出节点并行 → 发言 → 产出 → 最终"待我确认"节点停下，点「确认同步」后进度变「已完成 12/12」

- [ ] **Step 4: 提交**

```bash
git add src/App.tsx
git commit -m "chore(working-group): add temporary dev mount (?view=working-group)"
```

---

## Self-Review

**1. Spec 覆盖：**
- ✅ 节点三态（待做/在做/完成）→ `WorkingGroupNodeStatus` + `wg-node--{status}` 样式
- ✅ 5+1 节点类型（发言/下发/产出/拉人/结论/待确认）→ `WorkingGroupNodeKind` + 渲染分支
- ✅ 思维链流式 + 正式输出 → `thinking`/`content` 流式 + 思考块 UI
- ✅ 讨论→结论 阶段 → `n1..n6` 串行 + `conclusion` 节点
- ✅ 并行阶段 → `n8`/`n9` 的 `parallelGroup: 'p1'` + `groupNodeIds`
- ✅ 拉人进组（待确认）→ `pull` 节点 + `pullMember` + 成员胶囊动态 +1
- ✅ 待确认（对外）→ `confirm` 节点 + `n12`
- ✅ Mock 数据、纯演示 → 全脚本硬编码，无后端
- ❌ 入口 / 编排演出（组队确认卡）→ 按范围明确排除

**2. Placeholder 扫描：** 无 TBD/TODO 占位（仅 Task 8 有一处明确标注"临时"的 dev 挂载注释，属有意为之）。

**3. 类型一致性：**
- `WorkingGroupNodeStatus`、`WorkingGroupNodeKind`、`WorkingGroupMember`、`WorkingGroupRun` 在 `types.ts` 定义，`script.ts`/`playback.ts`/`useWorkingGroupPlayback.ts`/`WorkingGroupNode.tsx`/`WorkingGroupExecutionView.tsx` 一致引用。
- `pullMember` 返回的 `color: 'orange'` 与 `WorkingGroupMember.color` 枚举一致。
- `confirm(id)` / `pullMember(node)` / `groupNodeIds(run, node)` / `isBlocking(node)` / `validateRun(run)` 函数名在 Hook 与测试中完全一致。
