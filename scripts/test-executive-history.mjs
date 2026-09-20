import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
const memory = new Map();
globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
globalThis.window = { addEventListener() {} };
const cache = resolve('node_modules/.cache');
await mkdir(cache, { recursive: true });
const dir = await mkdtemp(resolve(cache, 'account-tests-'));
try {
  const files = { demoAccount: 'role-center/demoAccount', executiveDemo: 'role-center/executiveDemo', domain: 'role-center/domain', store: 'role-center/store', procurementDemo: 'admin/procurementDemo', positionModels: 'admin/positionModels' };
  for (const [name, source] of Object.entries(files)) {
    const text = await readFile(`src/${source}.ts`, 'utf8');
    const output = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
      .replace(/from ["'][^"']*\/(demoAccount|executiveDemo|domain|procurementDemo|positionModels)["']/g, 'from "./$1.mjs"');
    await writeFile(resolve(dir, `${name}.mjs`), output);
  }
  const account = await import(pathToFileURL(resolve(dir, 'demoAccount.mjs')));
  const store = await import(pathToFileURL(resolve(dir, 'store.mjs')));
  const domain = await import(pathToFileURL(resolve(dir, 'domain.mjs')));
  const { withExecutiveDemo } = await import(pathToFileURL(resolve(dir, 'executiveDemo.mjs')));
  const sample = structuredClone(store.getStore());
  sample.executiveDemoVersion = 2;
  const ownRun = { ...sample.runs[0], id: 'manual-history-1' };
  sample.runs.push(ownRun);
  const ownGrowth = { ...sample.growth[0], id: 'manual-growth-1' };
  sample.growth.push(ownGrowth);
  const upgraded = withExecutiveDemo(sample);
  const runs = upgraded.runs.filter(r => /^GM-RUN-/.test(r.id));
  const growth = upgraded.growth.filter(e => /^gm-growth-/.test(e.id));
  assert.equal(runs.length, 9);
  assert.equal(growth.length, 8);
  assert.equal(new Set(growth.map(e => e.at.slice(0, 10))).size, 8);
  assert(runs.every(r => r.at < '2026-09-29' && r.messages.length === 4));
  assert.equal(runs.filter(r => r.feedback === 'bad').length, 1);
  assert.equal(runs.filter(r => r.feedback === null).length, 2);
  assert(upgraded.runs.includes(ownRun));
  assert(upgraded.growth.includes(ownGrowth));
  const before = JSON.stringify(upgraded);
  assert.equal(JSON.stringify(withExecutiveDemo(upgraded)), before);
  console.log('PASS 9.28演示记录、日期分散、多轮日志、评价分布、旧版迁移保留手工记录及幂等性');

} finally { await rm(dir, { recursive: true, force: true }); }
