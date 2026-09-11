# 协同执行演示 · 入口实现计划（Part 2）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> 本计划是 [工作小组执行视图实现计划（Part 1）](./2026-09-10-working-group-execution-view.md) 的续篇。先完成 Part 1（执行视图本身），再按本计划接入入口。两份合起来才是完整功能。

**Goal:** 在后台新增独立菜单「协同执行演示」（位于【岗位智能体管理】与【专家管理】之间），打开后是一个自包含演示页：模拟助理输入框 +「发起演示」→ 编排演出（识别→拆解→目标→流程→岗位）→ 组队确认卡 → 进入执行视图自动播放。

**Architecture:** 复用 Part 1 的 `WorkingGroupExecutionView` + `engineRiskReviewRun`。新增一个顶层演示页（`WorkingGroupDemoPage`）用三态状态机 `idle → orchestrating → running` 串联：`idle` 显示模拟输入框，`orchestrating` 播放编排演出（`OrchestrationReveal`）并在末尾弹组队确认卡，`running` 挂载执行视图。入口通过 `AdminPageId` 新增一项 + `AdminWorkspace` 加一条路由分支接入。

**Tech Stack:** React 19 + TypeScript + Vite + lucide-react（与 Part 1 相同）。

---

## 文件结构（本计划新增/修改）

| 文件 | 动作 | 职责 |
|---|---|---|
| `src/admin/mockAdminData.ts` | 修改 | 新增 `AdminPageId`、导航项、Exclude 列表 |
| `src/admin/AdminWorkspace.tsx` | 修改 | 新增路由分支 + 导入 |
| `src/working-group/OrchestrationReveal.tsx` | 新建 | 编排演出 + 组队确认卡 |
| `src/working-group/WorkingGroupDemoPage.tsx` | 新建 | 顶层演示页（状态机 + 模拟输入框） |
| `src/working-group/working-group.css` | 修改 | 追加演示页/编排演出样式 |
| `src/App.tsx` | 修改 | 移除 Part 1 的临时 `?view=working-group` 挂载 |

---

## Task 1: 菜单与导航项

**Files:**
- Modify: `src/admin/mockAdminData.ts`

- [ ] **Step 1: 新增 `Workflow` 图标导入**

将第 2 行的 lucide-react 导入改为（新增 `Workflow`）：

```ts
import { BadgeCheck, Boxes, BrainCircuit, CalendarClock, Cpu, KeyRound, LayoutDashboard, Network, ShieldCheck, UsersRound, Workflow } from 'lucide-react'
```

- [ ] **Step 2: `AdminPageId` 增加 `workingGroupDemo`**

将类型定义改为：

```ts
export type AdminPageId = 'organizationDefinition' | 'processDefinition' | 'overview' | 'roleAgents' | 'workingGroupDemo' | 'experts' | 'skills' | 'mcp' | 'models' | 'automation' | 'approvals' | 'organization' | 'roles'
```

- [ ] **Step 3: 在 `adminNavigation` 中插入导航项（roleAgents 与 experts 之间）**

```ts
  { id: 'roleAgents', label: '岗位智能体管理', icon: BrainCircuit, description: '维护岗位定义、能力与可添加范围' },
  { id: 'workingGroupDemo', label: '协同执行演示', icon: Workflow, description: '演示岗位智能体自动组队协作执行' },
  { id: 'experts', label: '专家管理', icon: UsersRound, description: '维护可调用的业务专家' },
```

- [ ] **Step 4: `managementRows` 类型排除新增 id**

将 `managementRows` 的 Record 类型改为：

```ts
export const managementRows: Record<Exclude<AdminPageId, 'overview' | 'roleAgents' | 'workingGroupDemo' | 'organizationDefinition' | 'processDefinition'>, Array<[string, string, string]>> = {
```

- [ ] **Step 5: 运行类型检查确认无缺漏**

Run: `npx tsc -b --noEmit`
Expected: 无类型错误（`workingGroupDemo` 不要求出现在 `managementRows` 的键里）。

- [ ] **Step 6: 提交**

```bash
git add src/admin/mockAdminData.ts
git commit -m "feat(working-group): add 协同执行演示 menu item"
```

---

## Task 2: 编排演出组件

**Files:**
- Create: `src/working-group/OrchestrationReveal.tsx`

- [ ] **Step 1: 写入组件**

```tsx
import { Check, Loader2, Sparkles, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { WorkingGroupRun } from './types'

const REVEAL_DELAY = 650

export default function OrchestrationReveal({
  run,
  onConfirm,
}: {
  run: WorkingGroupRun
  onConfirm: () => void
}) {
  const steps = [
    `已识别任务：${run.title}`,
    '已拆解 4 项工作事项：风险梳理 / 质量符合性 / 供应商风险 / 接口影响',
    '已识别目标：形成可执行的评审结论与关闭计划',
    '已设计流程：引用能力地图「风险治理」流程',
    `已识别协助岗位：${run.members.map((m) => m.role).join(' · ')}`,
  ]
  const [revealed, setRevealed] = useState(0)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (revealed >= steps.length) {
      const t = window.setTimeout(() => setConfirming(true), 350)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => setRevealed((r) => r + 1), REVEAL_DELAY)
    return () => window.clearTimeout(t)
  }, [revealed, steps.length])

  return (
    <div className="wg-orch">
      <header className="wg-orch-head">
        <Loader2 size={18} className="wg-spin" />
        <span>数字分身正在编排协作任务…</span>
      </header>
      <ol className="wg-orch-steps">
        {steps.slice(0, revealed).map((step, i) => (
          <li key={i}>
            <Check size={15} />
            <span>{step}</span>
          </li>
        ))}
      </ol>
      {!confirming && (
        <div className="wg-orch-running">
          正在识别{revealed < 3 ? '任务' : '协助岗位'}…
        </div>
      )}
      {confirming && (
        <div className="wg-team-confirm">
          <header>
            <UsersRound size={16} />
            <h3>确认组建工作小组？</h3>
          </header>
          <p>将由以下岗位智能体协作完成「{run.title}」：</p>
          <div className="wg-team-members">
            {run.members.map((m) => (
              <span key={m.id} className={`wg-member wg-member--${m.color}`}>
                <i>{m.person.slice(0, 1)}</i>
                {m.role} · {m.person}
              </span>
            ))}
          </div>
          <button className="wg-primary" type="button" onClick={onConfirm}>
            <Sparkles size={15} />
            确认组建，开始协作
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/working-group/OrchestrationReveal.tsx
git commit -m "feat(working-group): add orchestration reveal and team confirm"
```

---

## Task 3: 演示页组件

**Files:**
- Create: `src/working-group/WorkingGroupDemoPage.tsx`

- [ ] **Step 1: 写入组件**

```tsx
import { Bot, Play, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import WorkingGroupExecutionView from './WorkingGroupExecutionView'
import OrchestrationReveal from './OrchestrationReveal'
import { engineRiskReviewRun } from './script'
import './working-group.css'

const DEMO_PROMPT =
  '帮我组织一次发动机适航风险评审，补充质量和总体两个角度的意见，形成评审结论与关闭计划。'

type DemoStage = 'idle' | 'orchestrating' | 'running'

export default function WorkingGroupDemoPage() {
  const run = engineRiskReviewRun
  const [stage, setStage] = useState<DemoStage>('idle')
  const [prompt, setPrompt] = useState(DEMO_PROMPT)
  const [runKey, setRunKey] = useState(0)

  if (stage === 'running') {
    return (
      <div className="wg-demo">
        <button
          className="wg-restart"
          type="button"
          onClick={() => {
            setRunKey((k) => k + 1)
            setStage('idle')
          }}
        >
          <RotateCcw size={15} />
          重新演示
        </button>
        <WorkingGroupExecutionView key={runKey} run={run} />
      </div>
    )
  }

  return (
    <div className="wg-demo">
      <header className="wg-demo-head">
        <p>协同执行演示</p>
        <h1>一句话，让数字分身自动组队协作</h1>
        <span>演示「组织智能」：岗位智能体从识别任务到协同执行的完整闭环</span>
      </header>

      {stage === 'idle' && (
        <div className="wg-demo-composer">
          <div className="wg-demo-avatar">
            <Bot size={20} />
          </div>
          <label>用自然语言描述一个任务</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="例如：帮我组织一次发动机适航风险评审…"
          />
          <div className="wg-demo-actions">
            <span>这是一段演示：脚本已编排好，内容与输入无关。</span>
            <button
              className="wg-primary"
              type="button"
              onClick={() => setStage('orchestrating')}
            >
              <Play size={15} />
              发起演示
            </button>
          </div>
        </div>
      )}

      {stage === 'orchestrating' && (
        <OrchestrationReveal
          run={run}
          onConfirm={() => {
            setRunKey((k) => k + 1)
            setStage('running')
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/working-group/WorkingGroupDemoPage.tsx
git commit -m "feat(working-group): add demo page with state machine"
```

---

## Task 4: 路由接线 + 移除临时挂载

**Files:**
- Modify: `src/admin/AdminWorkspace.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: `AdminWorkspace.tsx` 添加导入**

在 `import RoleAgentWorkspace from "./RoleAgentWorkspace";` 之后添加：

```ts
import WorkingGroupDemoPage from "../working-group/WorkingGroupDemoPage";
```

- [ ] **Step 2: 添加路由分支**

将主内容区的分支改为（在 `roleAgents` 分支后插入）：

```tsx
        ) : activePage === "roleAgents" ? (
          <RoleAgentWorkspace
            key={viewKey}
            initialPosition={entryPosition}
            onDirtyChange={setDirty}
            onNavigate={(page) => navigate(() => setActivePage(page))}
          />
        ) : activePage === "workingGroupDemo" ? (
          <WorkingGroupDemoPage />
        ) : activePage === "approvals" ? (
          <ApprovalCenter />
        ) : (
          <ResourceConsole key={activePage} pageId={activePage} />
        )}
```

- [ ] **Step 3: `ResourceConsole` 的 pageId 类型排除新增 id**

将 `ResourceConsole` 的参数类型改为：

```ts
function ResourceConsole({
  pageId,
}: {
  pageId: Exclude<
    AdminPageId,
    "overview" | "roleAgents" | "workingGroupDemo" | "approvals" | "logs" | "organizationDefinition" | "processDefinition"
  >;
}) {
```

- [ ] **Step 4: 移除 `App.tsx` 的临时挂载**

删除 Part 1 Task 8 添加的两处：
1. 删除 import：
   ```ts
   import WorkingGroupExecutionView from './working-group/WorkingGroupExecutionView'
   import { engineRiskReviewRun } from './working-group/script'
   ```
2. 删除 `App` 函数内的临时早返回：
   ```ts
   // TODO(临时)：仅用于开发预览，入口方案确定后移除
   if (new URLSearchParams(location.search).get('view') === 'working-group') {
     return <WorkingGroupExecutionView run={engineRiskReviewRun} />
   }
   ```

- [ ] **Step 5: 运行类型检查**

Run: `npx tsc -b --noEmit`
Expected: 无类型错误。

- [ ] **Step 6: 提交**

```bash
git add src/admin/AdminWorkspace.tsx src/App.tsx
git commit -m "feat(working-group): wire 协同执行演示 into admin workspace"
```

---

## Task 5: 样式

**Files:**
- Modify: `src/working-group/working-group.css`

- [ ] **Step 1: 追加演示页与编排演出样式**

在文件末尾追加：

```css
.wg-demo {
  height: 100%;
  overflow-y: auto;
  padding: 28px 32px 40px;
  background: #f6f7fb;
  color: #1c2433;
}
.wg-demo-head { margin-bottom: 22px; }
.wg-demo-head p {
  margin: 0 0 4px;
  font-size: 12px;
  letter-spacing: 2px;
  color: #7a8699;
}
.wg-demo-head h1 { margin: 0 0 6px; font-size: 24px; }
.wg-demo-head span { font-size: 13px; color: #7a8699; }
.wg-demo-composer {
  max-width: 640px;
  padding: 22px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #e6e9f0;
}
.wg-demo-avatar {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #2e87e7, #765dde);
  color: #fff;
  margin-bottom: 12px;
}
.wg-demo-composer label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
}
.wg-demo-composer textarea {
  width: 100%;
  min-height: 88px;
  padding: 12px;
  border: 1px solid #e0e4ee;
  border-radius: 10px;
  resize: vertical;
  font: inherit;
  font-size: 13px;
  line-height: 1.7;
}
.wg-demo-composer textarea:focus { outline: none; border-color: #2e87e7; }
.wg-demo-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
}
.wg-demo-actions span { font-size: 12px; color: #9aa5b5; }
.wg-restart {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  padding: 6px 12px;
  border: 1px solid #e0e4ee;
  border-radius: 8px;
  background: #fff;
  color: #5a6a84;
  font-size: 12px;
  cursor: pointer;
}
.wg-restart:hover { border-color: #2e87e7; color: #2e87e7; }
.wg-orch { max-width: 640px; }
.wg-orch-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  color: #2e87e7;
  font-size: 14px;
  font-weight: 600;
}
.wg-orch-steps { list-style: none; margin: 0; padding: 0; }
.wg-orch-steps li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #e6e9f0;
  color: #1c2433;
  font-size: 13px;
  animation: wg-fade-in 0.3s ease;
}
.wg-orch-steps li svg { color: #2eb872; flex: none; }
@keyframes wg-fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
.wg-orch-running { margin-top: 6px; color: #9aa5b5; font-size: 12px; }
.wg-team-confirm {
  margin-top: 16px;
  padding: 18px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e6e9f0;
  animation: wg-fade-in 0.3s ease;
}
.wg-team-confirm header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.wg-team-confirm header h3 { margin: 0; font-size: 15px; }
.wg-team-confirm > p { margin: 0 0 12px; font-size: 13px; color: #7a8699; }
.wg-team-members { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
```

- [ ] **Step 2: 提交**

```bash
git add src/working-group/working-group.css
git commit -m "feat(working-group): add demo page and orchestration styles"
```

---

## Task 6: 验证

- [ ] **Step 1: 启动开发服务器**

Run: `npm run dev`

- [ ] **Step 2: 走完整演示链路**

访问后台（`http://localhost:5173/SFZN-AI/?view=admin`）→ 左下角/侧栏选择当前工作身份为「赵敏 · 资源管理员」→ 侧栏点击「协同执行演示」。

Expected 依次看到：
1. 演示页：标题 + 预填话术的模拟输入框 +「发起演示」按钮
2. 点「发起演示」→ 编排演出逐步冒出 5 条（识别任务→拆解→目标→流程→岗位）
3. 末尾弹出「确认组建工作小组？」卡（含 3 个岗位智能体成员）
4. 点「确认组建，开始协作」→ 进入执行视图，节点轨道自动流式播放（思维链 + 正文），拉人节点停住等确认，点「确认拉入」后成员胶囊 +1，最终待确认节点停住
5. 点「确认同步」→ 进度变「已完成 12/12」
6. 点「重新演示」→ 回到演示页起始

- [ ] **Step 3: 确认后台其他菜单不受影响**

点击「概览」「岗位智能体管理」「专家管理」等，确认正常渲染、无报错。

- [ ] **Step 4: 提交（如验证中无改动则跳过）**

```bash
git add -A
git commit -m "chore(working-group): verification pass"
```

---

## Self-Review

**1. Spec 覆盖：**
- ✅ 独立菜单 + 位置（岗位智能体管理与专家管理之间）→ Task 1
- ✅ 命名「协同执行演示」→ Task 1
- ✅ 选项 A（模拟助理输入框 + 发起演示）→ Task 3
- ✅ 编排演出 + 组队确认卡 → Task 2
- ✅ 进入执行视图（复用 Part 1）→ Task 3 挂载 `WorkingGroupExecutionView`
- ✅ 不耦合现有功能（自包含目录 `working-group/`，仅路由一行接入）→ Task 4
- ✅ 移除 Part 1 临时挂载 → Task 4 Step 4

**2. Placeholder 扫描：** 无 TBD/TODO。所有组件、路由、样式均有完整代码。

**3. 类型一致性：**
- `AdminPageId` 新增 `workingGroupDemo`，`adminNavigation` / `managementRows` / `ResourceConsole` 的 Exclude 均同步。
- `OrchestrationReveal` / `WorkingGroupDemoPage` 引用 `WorkingGroupRun`（来自 `types.ts`）、`engineRiskReviewRun`（来自 `script.ts`）、`WorkingGroupExecutionView`（Part 1 产物），命名一致。
- CSS 类名（`wg-demo`、`wg-orch`、`wg-team-confirm`、`wg-member--{color}` 等）在组件与样式间一致，并复用 Part 1 已定义的 `wg-primary` / `wg-member` / `wg-spin`。
