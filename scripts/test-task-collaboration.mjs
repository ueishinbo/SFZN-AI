import assert from 'node:assert/strict'
import {resolveTaskSendTarget, taskPendingReview} from '../src/assistant/taskProductModel.ts'
import {isPublicReply, resolveMentions} from '../src/assistant/a2aMentions.ts'
const review={id:'review',title:'首期需求评审',status:'response_received'}
const test={id:'test',title:'测试准备跟进',status:'response_received'}
const ended={id:'ended',title:'采购路径咨询',status:'completed'}
const items=[review,test,ended]
assert.equal(resolveTaskSendTarget('请发送这个意见',items),undefined,'Multiple collaborations require an explicit destination')
assert.equal(resolveTaskSendTarget('请发送这个意见',items,'test'),test,'An explicit reference binds the destination')
assert.equal(resolveTaskSendTarget('请发到首期需求评审',items,'test'),review,'Explicitly named destination wins over an older reference')
assert.equal(resolveTaskSendTarget('请发给首期需求评审和测试准备跟进',items),undefined,'Never silently broadcast across collaborations')
assert.equal(resolveTaskSendTarget('发送到采购路径咨询',items),ended,'Retain ended destination so caller can reject, never fall back to another group')
assert.equal(resolveTaskSendTarget('发送这个意见',items,'other-task'),undefined,'Reference from another task cannot route here')
assert.equal(resolveTaskSendTarget('发送这个意见',[test]),test)
assert.equal(isPublicReply('帮我理解 @陈工 的话，先别发送'),false)
assert.equal(isPublicReply('下一轮 @陈工 请确认材料'),true)
assert.ok(resolveMentions('下一轮 @不在群里 请确认材料',[{userId:'chen',name:'陈工'}]).error)
assert.deepEqual(resolveMentions('下一轮 @陈工 请确认材料',[{userId:'chen',name:'陈工'},{userId:'liu',name:'刘工'}]).ids,['chen'])
console.log('Task collaboration checks passed: explicit destination, ambiguity, ended/cross-task references, private intent and mention isolation.')

const pendingA={...review,pendingCurrentUserConfirmation:{id:'a'}}
const pendingB={...test,pendingCurrentUserConfirmation:{id:'b'}}
assert.equal(taskPendingReview([pendingA,pendingB],null),pendingA,'A pending question opens without an explicit selection')
assert.equal(taskPendingReview([pendingA,pendingB],'test'),pendingB,'User can choose a different pending question')
assert.equal(taskPendingReview([review,pendingB],'review'),pendingB,'After an answer the next question is required')
assert.equal(taskPendingReview([{...pendingA,status:'completed'},pendingB],'review'),pendingB,'Ended requests do not block input')
assert.equal(taskPendingReview([review,test],'review'),undefined,'Input resumes only after no pending questions remain')
assert.equal(taskPendingReview([pendingB,pendingA],'review'),pendingA,'New arrivals do not replace an explicit active question')
