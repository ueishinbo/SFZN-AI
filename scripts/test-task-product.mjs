import assert from 'node:assert/strict'
import { nextMissing, parseGroupRequest, isGroupRequest, productPeople, taskSnapshot } from '../src/assistant/taskProductModel.ts'
const task={id:'pet',title:'数字宠物首期需求',goal:'明确范围',items:[]}
const full=parseGroupRequest('帮我拉陈工、刘工建个群，确认数字宠物首期交互边界，最多3轮',task,productPeople)
assert.equal(isGroupRequest('帮我拉陈工、刘工建个群，确认数字宠物首期交互边界，最多3轮'),true)
assert.equal(nextMissing(full),null)
assert.equal(full.rounds,'3')
assert.deepEqual(full.memberIds,['user-chen-gong','user-liu-gong'])
assert.ok(!full.goal.includes('最多3轮'))
assert.equal(nextMissing(parseGroupRequest('帮我建个群',task,productPeople)),'goal')
assert.equal(nextMissing(parseGroupRequest('帮我找陈工确认测试启动条件',task,productPeople)),'rounds')
assert.equal(isGroupRequest('先别拉群，我想再想一下'),false)
assert.equal(nextMissing({...full,rounds:'0'}),'rounds')
assert.equal(nextMissing({...full,rounds:'1.5'}),'rounds')
const ended={...task,items:[{status:'completed',preview:'沟通结束'}]}
assert.match(taskSnapshot(ended).summary,/等待你核对任务目标/)
assert.match(taskSnapshot(task,true).summary,/你已确认/)
console.log('Task product checks passed: missing information, direct creation, negation, rounds, independent completion.')
