import assert from 'node:assert/strict'
import { readFile, writeFile, mkdtemp, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'
await mkdir('node_modules/.cache', { recursive: true })
const dir = await mkdtemp(resolve('node_modules/.cache/project-a2a-'))
for (const [name, path] of [['a2aConversationTypes', 'src/assistant/a2aConversationTypes.ts'], ['projectData', 'src/organization/projectData.ts']]) {
 const source = (await readFile(path, 'utf8')).replace('../assistant/a2aConversationTypes', './a2aConversationTypes.mjs')
 await writeFile(resolve(dir, `${name}.mjs`), ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText)
}
const { projects, projectConversations, taskStatus, conversationIdFor } = await import(pathToFileURL(resolve(dir,'projectData.mjs')))
const { createSeedConversationMessages } = await import(pathToFileURL(resolve(dir,'a2aConversationTypes.mjs')))
assert.equal(projects.length,4)
assert.equal(new Set(projectConversations.map(c=>c.id)).size,12)
for(const project of projects){
 assert.deepEqual(new Set(project.tasks.map(t=>t.initialStatus)),new Set(['pending','progress','completed']))
 for(const task of project.tasks){
  const c=projectConversations.find(c=>c.id===conversationIdFor(task))
  assert.ok(c)
  assert.equal(taskStatus(task,c),task.initialStatus)
  assert.equal(taskStatus(task,{...c,status:'completed'}),'completed')
  assert.equal(taskStatus(task,{...c,status:'waiting_replies',pendingCurrentUserConfirmation:undefined}),'progress')
  assert.equal(c.speakingOrder.length,c.members.length)
  for(const id of c.speakingOrder)assert.ok(c.demo.replies[id]?.length>20)
  const messages=createSeedConversationMessages(c)
  if(task.initialStatus==='pending'){
   assert.equal(messages.length,0)
   assert.equal(c.pendingCurrentUserConfirmation.choices[0].commandAction,'send')
  }else{
   assert.deepEqual(messages.filter(m=>m.origin==='participant_twin').map(m=>m.actorUserId),c.speakingOrder)
   if(task.initialStatus==='completed')assert.equal(messages.at(-1).content,task.result)
   else assert.equal(c.pendingCurrentUserConfirmation.choices[0].commandContent,task.result)
  }
 }
 console.log(`PASS ${project.title}: task/conversation mapping, distinct states, ordered replies, confirmation gates and result`)
}
