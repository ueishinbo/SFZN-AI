import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
const cache = resolve("node_modules/.cache");
await mkdir(cache, { recursive: true });
const dir = await mkdtemp(resolve(cache, "role-tests-"));
for (const [name, sourcePath] of Object.entries({ demoAccount: 'src/role-center/demoAccount.ts', executiveDemo: 'src/role-center/executiveDemo.ts', domain: 'src/role-center/domain.ts', store: 'src/role-center/store.ts', positionModels: 'src/admin/positionModels.ts', procurementDemo: 'src/admin/procurementDemo.ts' })) {
  const source = await readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    .replace(/from ["'][^"']*\/(demoAccount|executiveDemo|domain|procurementDemo|positionModels)["']/g, 'from "./$1.mjs"');
  await writeFile(resolve(dir, `${name}.mjs`), output);
}
const purchase = await import(pathToFileURL(resolve(dir, 'procurementDemo.mjs')));
let trial = purchase.createTrial(purchase.DEFAULT_PURCHASE);
trial = purchase.advanceTrial(trial);
assert.equal(trial.stage, 'blocked');
assert.equal(trial.artifacts.length, 0);
assert.equal(purchase.resumeTrial(trial, '-1'), trial);
trial = purchase.resumeTrial(trial, '30');
trial = purchase.advanceTrial(trial);
assert.equal(trial.step, 1);
assert.match(trial.artifacts[0], /30 万元/);
trial = purchase.advanceTrial(trial);
assert.equal(trial.stage, 'approval');
assert.equal(trial.artifacts[2], undefined);
assert.equal(purchase.advanceTrial(trial), trial);
trial = purchase.advanceTrial(purchase.approveTrial(trial));
assert.equal(trial.stage, 'complete');
assert.equal(trial.artifacts.length, 3);
assert.equal(trial.hadBlock, true);
let normal = purchase.createTrial({ ...purchase.DEFAULT_PURCHASE, item: '测试工装', quantity: 3, budget: '20' });
normal = purchase.advanceTrial(purchase.advanceTrial(normal));
assert.equal(normal.stage, 'approval');
assert.match(normal.artifacts[0], /测试工装/);
assert.match(normal.artifacts[0], /3 台/);
normal = purchase.advanceTrial(purchase.approveTrial(normal));
assert.equal(normal.hadBlock, false);
assert.equal(normal.stage, 'complete');
console.log('PASS 采购试运行：缺失预算阻塞、补充重跑、人工确认门禁、正常路径与输入传递');
const { POSITIONS, modelsForPosition } = await import(pathToFileURL(resolve(dir, "positionModels.mjs")));
for (const position of POSITIONS) {
  const flows = modelsForPosition(position);
  if (position.org === purchase.PROCUREMENT_ORG) {
    assert.equal(flows.length, 0);
    assert(purchase.PROCUREMENT_PROCESS.nodes.some(n => n.owner === position.name));
    continue;
  }
  assert(flows.length >= 2);
  for (const flow of flows) {
    const ids = new Set(flow.nodes.map(n => n.id));
    assert.equal(ids.size, flow.nodes.length);
    assert(flow.nodes.filter(n => n.owner === position.name).length >= 2);
    assert(flow.edges.every(e => ids.has(e.from) && ids.has(e.to) && e.condition));
    assert(flow.nodes.every(n => n.input && n.output && n.owner));
  }
}
assert.deepEqual(modelsForPosition({ id: "unknown", org: "unknown", name: "产品经理" }), []);
console.log("PASS 本体示例多流程、多岗位节点、有效边与未知岗位空状态");
const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: (key) => memory.delete(key),
};
globalThis.window = { addEventListener() {} };
const domain = await import(pathToFileURL(resolve(dir, "domain.mjs")));
let seq = 0,
  passed = 0;
const fresh = async () => {
  memory.clear();
  return import(pathToFileURL(resolve(dir, "store.mjs")) + `?case=${seq++}`);
};
async function test(name, run) {
  try {
    await run(await fresh());
    passed++;
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}
try {
  await test("移除模板用例后，岗位关联可保存且审批仍需独立复核", ({ actions, getStore }) => {
    actions.newDraft("functional-pm");
    const d = structuredClone(getStore().roles.find(r => r.id === "functional-pm").draft.definition);
    d.position = { id: "comac/product/position-0", org: "comac/product", name: "产品经理" };
    d.capabilityMap = [];
    d.templates = [];
    d.tests = [];
    actions.save("functional-pm", d);
    assert.deepEqual(getStore().roles.find(r => r.id === "functional-pm").draft.definition.position, d.position);
    actions.startEvaluation("functional-pm");
    assert.equal(domain.readyForApproval(getStore().roles.find(r => r.id === "functional-pm")), false);
    actions.review("functional-pm", "核对岗位职责、能力与工作边界", true);
    assert.equal(domain.readyForApproval(getStore().roles.find(r => r.id === "functional-pm")), true);
  });
  await test("组织、小组和指定人员按或关系命中，父组织覆盖子组织", () => {
    const s = domain.seedStore(),
      p = s.people.find((p) => p.id === domain.CURRENT_USER);
    assert(domain.matchesScope(p, { orgs: ["comac"], groups: [], users: [] }));
    assert(
      domain.matchesScope(p, { orgs: [], groups: ["product"], users: [] }),
    );
    assert(domain.matchesScope(p, { orgs: [], groups: [], users: [p.id] }));
    assert(
      !domain.matchesScope(p, {
        orgs: ["comac/finance"],
        groups: [],
        users: [],
      }),
    );
  });
  await test("岗位能力按 ID 去重，停用撤销独占能力并保留共享和个人能力", ({
    actions,
    getStore,
  }) => {
    let r = domain.effectiveResources(getStore());
    assert.equal(r.filter((r) => r.id === "e4").length, 1);
    assert(r.some((r) => r.id === "s6"));
    actions.member("functional-pm", "toggle");
    r = domain.effectiveResources(getStore());
    assert(!r.some((r) => r.id === "s6"));
    assert(r.some((r) => r.id === "e4"));
    assert(r.some((r) => r.id === "s3"));
    actions.member("interaction-pm", "remove");
    r = domain.effectiveResources(getStore());
    assert(!r.some((r) => r.id === "e4"));
    assert(r.some((r) => r.id === "s3"));
    actions.member("functional-pm", "toggle");
    assert(domain.effectiveResources(getStore()).some((r) => r.id === "s6"));
  });
  await test("未授权的 MCP 添加岗位后仍不可用，访问审批后才启用", ({
    actions,
    getStore,
  }) => {
    actions.member("data-pm", "add");
    assert.equal(
      domain.effectiveResources(getStore()).find((r) => r.id === "m4").enabled,
      false,
    );
    actions.requestAccess("m4");
    assert.throws(() => actions.requestAccess("m4"), /正在审批/);
    const a = getStore().approvals.find((a) => a.resourceId === "m4");
    actions.setAdmin("liming");
    actions.decide(a.id, true, "业务范围和调用用途已核验");
    assert.equal(
      domain.effectiveResources(getStore()).find((r) => r.id === "m4").enabled,
      true,
    );
  });
  await test("新建草稿必须有名称和范围，重复名称不能保存", ({ actions }) => {
    assert.throws(
      () => actions.create("A", "zhaomin", domain.emptyScope()),
      /名称|范围/,
    );
    assert.throws(
      () =>
        actions.create("功能型产品经理智能体", "zhaomin", {
          orgs: ["comac"],
          groups: [],
          users: [],
        }),
      /同名/,
    );
    assert.throws(() => actions.startEvaluation("airworthiness"), /岗位说明书/);
  });
  await test("完整发布闭环：草稿→评测→复核→独立审批→V1.0", ({
    actions,
    getStore,
  }) => {
    const id = actions.create("新岗位测试智能体", "zhaomin", {
      orgs: ["comac/marketing"],
      groups: [],
      users: [],
    });
    const d = domain.baseDefinition("新岗位测试智能体");
    d.scope = { orgs: ["comac/marketing"], groups: [], users: [] };
    actions.save(id, d);
    assert.throws(() => actions.submit(id), /评测/);
    actions.startEvaluation(id);
    assert.throws(() => actions.save(id, d), /不可直接修改/);
    assert.throws(() => actions.submit(id), /复核/);
    actions.review(id, "职责边界与用例已逐项人工核验", true);
    actions.submit(id);
    const a = getStore().approvals.find((a) => a.roleId === id);
    assert.throws(
      () => actions.decide(a.id, true, "本人审核全部通过"),
      /提交人和维护人/,
    );
    actions.setAdmin("liming");
    actions.decide(a.id, true, "全部评测通过，允许发布使用");
    const role = getStore().roles.find((r) => r.id === id);
    assert.equal(role.published.version, "V1.0");
    assert(!role.draft);
    assert(domain.availableRole(getStore(), role));
    assert.equal(
      getStore().approvals.find((x) => x.id === a.id).status,
      "已通过",
    );
  });
  await test("草稿修改可添加范围不影响当前线上版本", ({
    actions,
    getStore,
  }) => {
    actions.newDraft("functional-pm");
    const before = structuredClone(
      getStore().roles.find((r) => r.id === "functional-pm").published,
    );
    const d = structuredClone(before.definition);
    const changedScope = structuredClone(d);
    changedScope.scope = { orgs: ["comac/finance"], groups: [], users: [] };
    actions.save("functional-pm", changedScope);
    assert.deepEqual(getStore().roles.find(r => r.id === "functional-pm").published, before);
    assert.deepEqual(getStore().roles.find(r => r.id === "functional-pm").draft.definition.scope, changedScope.scope);
    d.responsibilities += "\n\n## 变更说明\n补充交付验收口径。";
    actions.save("functional-pm", d);
    assert(
      domain.availableRole(
        getStore(),
        getStore().roles.find((r) => r.id === "functional-pm"),
      ),
    );
    actions.startEvaluation("functional-pm");
    actions.review("functional-pm", "核对所有岗位资产与边界要求", true);
    actions.submit("functional-pm");
    const a = getStore().approvals.find((a) => a.roleId === "functional-pm");
    actions.setAdmin("liming");
    actions.decide(a.id, false, "岗位职责仍需补充验收依据");
    const r = getStore().roles.find((r) => r.id === "functional-pm");
    assert.equal(r.draft.status, "草稿");
    assert.deepEqual(r.published, before);
    assert.equal(r.draft.rejection, "岗位职责仍需补充验收依据");
  });
  await test("资源失效阻止发布，保留失效引用和审计", ({
    actions,
    getStore,
  }) => {
    actions.newDraft("functional-pm");
    actions.resourceState("s6", false);
    assert.throws(() => actions.startEvaluation("functional-pm"), /不可用/);
    assert(
      getStore()
        .roles.find((r) => r.id === "functional-pm")
        .draft.definition.resourceIds.includes("s6"),
    );
    assert(getStore().audit.some((a) => a.action === "停用资源"));
  });
  await test("审批时再次验证资源状态，不能发布失效版本", ({
    actions,
    getStore,
  }) => {
    actions.resourceState("s8", false);
    actions.setAdmin("liming");
    const a = getStore().approvals.find((a) => a.roleId === "project-manager");
    assert.throws(
      () => actions.decide(a.id, true, "评测结果核验后批准发布"),
      /不可用/,
    );
    assert.equal(
      getStore().approvals.find((x) => x.id === a.id).status,
      "待审批",
    );
  });
  await test("采纳建议只修改草稿并保留线上，拒绝必须有原因", ({
    actions,
    getStore,
  }) => {
    const original = structuredClone(
      getStore().roles.find((r) => r.id === "functional-pm").published,
    );
    actions.handleSuggestion(
      "suggest-1",
      true,
      "该重复问题影响需求排序，应纳入优化",
      "能力地图",
    );
    let role = getStore().roles.find((r) => r.id === "functional-pm");
    assert.deepEqual(role.published, original);
    assert(role.draft.suggestionIds.includes("suggest-1"));
    assert(role.draft.definition.capabilityMap.some((a) => a.name.includes("业务价值")));
    assert.equal(
      getStore().suggestions.find((s) => s.id === "suggest-1").status,
      "已采纳",
    );
    assert.throws(
      () => actions.handleSuggestion("suggest-2", false, "", "能力地图"),
      /处理意见/,
    );
    actions.handleSuggestion(
      "suggest-2",
      false,
      "当前方法适用，先补充代表性证据",
      "能力地图",
    );
    assert.equal(
      getStore().suggestions.find((s) => s.id === "suggest-2").status,
      "已拒绝",
    );
  });
  await test("任务记录保存实际岗位版本，后台投影不含原文和用户 ID", ({
    actions,
    getStore,
    governanceProjection,
  }) => {
    const id = actions.run("内部项目私有材料：请准备需求评审");
    const run = getStore().runs.find((r) => r.id === id);
    assert.equal(run.role_contexts.length, 2);
    const projection = governanceProjection(run);
    assert(!("messages" in projection));
    assert(!("output" in projection));
    assert(!("userId" in projection));
    assert(!JSON.stringify(projection).includes("内部项目私有材料"));
    actions.setAdmin("admin");
    actions.restore(
      "functional-pm",
      "V1.1",
      "当前发布版本需要恢复到历史稳定版本",
    );
    assert.equal(
      getStore().runs.find((r) => r.id === id).role_contexts[0].version,
      "V1.2",
    );
  });
  await test("单次问题只保留信号，第三次重复反馈形成建议", ({
    actions,
    getStore,
  }) => {
    const before = getStore().suggestions.length;
    const a = actions.run("任务一：准备交付评审材料");
    actions.feedback(a, "bad", "上下文不足");
    assert.equal(getStore().suggestions.length, before);
    const b = actions.run("任务二：准备交付评审材料");
    actions.feedback(b, "bad", "上下文不足");
    assert.equal(getStore().suggestions.length, before);
    const c = actions.run("任务三：准备交付评审材料");
    actions.feedback(c, "bad", "上下文不足");
    assert.equal(getStore().suggestions.length, before + 2);
    actions.feedback(c, "good");
    assert.equal(getStore().runs.find((r) => r.id === c).cause, "");
  });
  await test("停用、恢复和持久化同步，已停用岗位无法启用", ({
    actions,
    getStore,
  }) => {
    actions.setAdmin("admin");
    actions.disable(
      "functional-pm",
      "版本维护，暂停新增运行",
      "按原版本继续完成",
    );
    assert.throws(() => actions.member("functional-pm", "toggle"), /不可用/);
    assert(!domain.effectiveResources(getStore()).some((r) => r.id === "s6"));
    actions.restore("functional-pm", "V1.2", "完成版本检查，恢复正常运行");
    assert(domain.effectiveResources(getStore()).some((r) => r.id === "s6"));
    const saved = JSON.parse(memory.get("comac-role-center-v3"));
    assert.deepEqual(saved, JSON.parse(JSON.stringify(getStore())));
  });
  await test("发布新版本后资格保持不变，历史运行快照保持不变", ({
    actions,
    getStore,
  }) => {
    const runId = actions.run("准备产品方案评审工作");
    actions.newDraft("functional-pm");
    const d = structuredClone(
      getStore().roles.find((r) => r.id === "functional-pm").draft.definition,
    );
    d.permissionRules += "\n- 关键评审结论须由责任人确认。";
    actions.save("functional-pm", d);
    actions.startEvaluation("functional-pm");
    actions.review("functional-pm", "用例边界和职责已人工核对", true);
    actions.submit("functional-pm");
    actions.setAdmin("liming");
    actions.decide(
      getStore().approvals.find((a) => a.roleId === "functional-pm").id,
      true,
      "岗位规则已确认，批准新版本",
    );
    const r = getStore().roles.find((r) => r.id === "functional-pm");
    assert.equal(r.published.version, "V1.3");
    assert(domain.availableRole(getStore(), r));
    assert(domain.effectiveResources(getStore()).some((r) => r.id === "s6"));
    assert.equal(
      getStore().runs.find((r) => r.id === runId).role_contexts[0].version,
      "V1.2",
    );
  });
  await test("版本按主次编号递增，V1.9 后为 V1.10", () => {
    const role = domain.seedStore().roles[0];
    role.versions = [{ version: "V1.9" }, { version: "V1.10" }];
    assert.equal(domain.nextVersion(role), "V1.11");
  });
  await test("评测撤回后仍保留历史复核与试运行证据", ({
    actions,
    getStore,
  }) => {
    actions.newDraft("functional-pm");
    actions.startEvaluation("functional-pm");
    actions.trial("functional-pm", "准备一次需求优先级评审");
    actions.review("functional-pm", "任务方法与交付模板已核验", true);
    actions.withdraw("functional-pm");
    let r = getStore().roles.find((r) => r.id === "functional-pm");
    assert(!r.draft.evaluation);
    assert.equal(r.evaluations.length, 1);
    assert(r.evaluations[0].review);
    assert(r.evaluations[0].trial.output.includes("处理步骤"));
    actions.startEvaluation("functional-pm");
    r = getStore().roles.find((r) => r.id === "functional-pm");
    assert.equal(r.evaluations.length, 2);
  });
  await test("能力建议采纳须选择有效资源，并真正补充引用", ({
    actions,
    getStore,
  }) => {
    assert.throws(
      () =>
        actions.handleSuggestion(
          "suggest-1",
          true,
          "补充缺少的指标分析能力",
          "能力包",
        ),
      /请选择/,
    );
    assert.equal(
      getStore().suggestions.find((s) => s.id === "suggest-1").status,
      "待处理",
    );
    actions.handleSuggestion(
      "suggest-1",
      true,
      "补充缺少的指标分析能力",
      "能力包",
      "s2",
    );
    const r = getStore().roles.find((r) => r.id === "functional-pm");
    assert(r.draft.definition.resourceIds.includes("s2"));
    assert(!r.published.definition.resourceIds.includes("s2"));
  });
  await test("审批影响保留提交前版本，不随发布后当前版本变化", ({
    actions,
    getStore,
  }) => {
    actions.newDraft("functional-pm");
    actions.startEvaluation("functional-pm");
    actions.review("functional-pm", "逐项核验复核结果与边界", true);
    actions.submit("functional-pm");
    const a = getStore().approvals.find((a) => a.roleId === "functional-pm");
    assert.equal(a.baseVersion, "V1.2");
    actions.setAdmin("liming");
    actions.decide(a.id, true, "确认符合发布标准，同意发布");
    assert.equal(
      getStore().approvals.find((x) => x.id === a.id).baseVersion,
      "V1.2",
    );
  });
  console.log(`\n${passed} domain scenarios passed.`);
} finally {
  await rm(dir, { recursive: true, force: true });
}
