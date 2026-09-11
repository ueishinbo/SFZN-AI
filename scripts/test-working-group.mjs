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
const { validateRun, isBlocking, groupNodeIds } = await import(
  pathToFileURL(resolve(dir, "playback.mjs"))
);
const { engineRiskReviewRun } = await import(pathToFileURL(resolve(dir, "script.mjs")));

// 1. 剧本结构完整
assert.deepEqual(validateRun(engineRiskReviewRun), []);

// 2. 阻塞节点判定：只有 confirm 阻塞
const confirm = engineRiskReviewRun.nodes.find((n) => n.id === "n11");
const speak = engineRiskReviewRun.nodes.find((n) => n.id === "n1");
assert.equal(isBlocking(confirm), true);
assert.equal(isBlocking(speak), false);

// 3. 并行分组
const p1 = engineRiskReviewRun.nodes.find((n) => n.id === "n7");
assert.deepEqual(groupNodeIds(engineRiskReviewRun, p1).sort(), ["n7", "n8"]);
const n1 = engineRiskReviewRun.nodes.find((n) => n.id === "n1");
assert.deepEqual(groupNodeIds(engineRiskReviewRun, n1), ["n1"]);

// 4. 团队 4 人既定，含供应链质量岗，无拉人节点
assert.equal(engineRiskReviewRun.members.length, 4);
assert(engineRiskReviewRun.members.some((m) => m.id === "supply"));
assert(!engineRiskReviewRun.nodes.some((n) => n.kind === "pull"));

// 5. 分支边：结论节点 n10 有"结论通过"与"未通过·退回补充"两条出边
assert(engineRiskReviewRun.edges.some((e) => e.from === "n10" && e.to === "n11" && e.condition === "结论通过"));
assert(engineRiskReviewRun.edges.some((e) => e.from === "n10" && e.to === "n6" && e.condition.includes("退回补充")));

console.log("PASS working-group 剧本校验、阻塞判定、并行分组与既定团队");
await rm(dir, { recursive: true, force: true });
