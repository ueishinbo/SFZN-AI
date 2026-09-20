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
  const previous = structuredClone(store.getStore().personal.zhangsan);
  const oldGrowth = store.getStore().growth.filter(e => e.userId === 'zhangsan').length;
  memory.set('digital-twin-gm-profile-mind', '原账号画像');
  account.switchDemoAccount('demo-new-user');
  assert.equal(domain.effectiveResources(store.getStore(), account.CURRENT_USER).length, 0);
  assert.equal(store.getStore().runs.filter(r => r.userId === account.CURRENT_USER).length, 0);
  assert.equal(store.getStore().growth.filter(r => r.userId === account.CURRENT_USER).length, 0);
  assert.equal(memory.get(account.personalStorageKey('digital-twin-gm-profile-mind')), undefined);
  const resource = store.getStore().resources.find(r => r.active && !r.restricted && r.kind === 'skill');
  store.actions.personal(resource.id, 'add');
  store.actions.profileGrowth('确认使用个人工作画像');
  memory.set(account.personalStorageKey('digital-twin-gm-profile-mind'), '新用户画像');
  memory.set(account.personalStorageKey('comac-personal-knowledge-gm-v1'), '["新用户知识"]');
  assert.equal(domain.effectiveResources(store.getStore(), account.CURRENT_USER).length, 1);
  assert.deepEqual(store.getStore().personal.zhangsan, previous);
  assert.equal(store.getStore().growth.filter(e => e.userId === 'zhangsan').length, oldGrowth);
  account.switchDemoAccount('zhangsan');
  assert.equal(memory.get(account.personalStorageKey('digital-twin-gm-profile-mind')), '原账号画像');
  assert.equal(memory.get(account.personalStorageKey('comac-personal-knowledge-gm-v1')), undefined);
  account.switchDemoAccount('demo-new-user');
  assert.equal(memory.get(account.personalStorageKey('digital-twin-gm-profile-mind')), '新用户画像');
  const reloaded = await import(`${pathToFileURL(resolve(dir, 'store.mjs'))}?reload`);
  assert.equal(domain.effectiveResources(reloaded.getStore(), account.CURRENT_USER).length, 1);
  assert.equal(reloaded.getStore().people.filter(p => p.id === 'demo-new-user').length, 1);
  assert.deepEqual(reloaded.getStore().personal.zhangsan, previous);
  console.log('PASS 双账号空态、能力与成长写入隔离、画像/知识隔离、切回保留和重新加载');
} finally { await rm(dir, { recursive: true, force: true }); }
