import type { A2AConversation, A2AConversationMember } from './a2aConversationTypes'
import type { CollaborationIssue } from './a2aIssues'

export type TaskItem = CollaborationIssue & { items: A2AConversation[]; source?: A2AConversation['sourceTask'] }
export type TaskChat = { id: string; role: 'user' | 'assistant'; content: string; conversationIds?: string[]; referenceQuote?: string; fileId?: string; time?: string }
export type GroupDraft = { title: string; goal: string; memberIds: string[]; rounds: string }
export type DraftStep = 'goal' | 'people' | 'rounds'

export function taskPendingReview(items:A2AConversation[], selectedId:string|null) {
 const pending=items.filter(c=>c.status!=='completed'&&c.pendingCurrentUserConfirmation)
 return pending.find(c=>c.id===selectedId)??pending[0]
}

// Viewing a collaboration is deliberately not an input to message routing.
export function resolveTaskSendTarget(text:string, items:A2AConversation[], referenceId?:string) {
 const named=items.filter(c=>text.includes(c.title))
 const reference=items.find(c=>c.id===referenceId)
 const matched=named.length?named:reference?[reference]:items.filter(c=>c.status!=='completed'&&((/测试/.test(text)&&/测试/.test(c.title))||(/评审/.test(text)&&/评审/.test(c.title))))
 if(matched.length===1)return matched[0]
 if(matched.length>1)return undefined
 const active=items.filter(c=>c.status!=='completed')
 return active.length===1?active[0]:undefined
}

export const TASK_GOAL_PLACEHOLDER = '［具体事项］'
export const TASK_RESULT_PLACEHOLDER = '［达成什么结果］'
export const TASK_CREATION_PREFIX = '帮我推进'
export const TASK_CREATION_PROMPT = `${TASK_CREATION_PREFIX}${TASK_GOAL_PLACEHOLDER}，希望最终${TASK_RESULT_PLACEHOLDER}`
export const TASK_CREATION_EXAMPLE = '例如：帮我推进数字宠物首期需求评审，希望最终明确首期范围和待确认事项。'

export function normalizeTaskCreationPrompt(text:string) {
 return text.trim().replace(/[，,；;\s]*希望最终\s*(?:［达成什么结果］)?[。！!\s]*$/u,'').trim()
}

export function cancelsTaskCreation(text:string) {
 return /(先别|不要|暂不|不用|不需要|取消).{0,8}(创建|新建|建立|任务)/.test(text)
}
export function isTaskDelegationRequest(text:string) {
 return !cancelsTaskCreation(text)&&/^(?:请帮我|帮我|请)?\s*(?:(?:创建|新建|建立)(?:一个|一项|个)?任务|推进|持续推进|持续跟进)/.test(text.trim())
}
export function taskDelegationGoal(text:string) {
 if(text.includes(TASK_GOAL_PLACEHOLDER)||text.includes('［描述要推进的事情和希望达成的结果］')||cancelsTaskCreation(text))return ''
 const goal=normalizeTaskCreationPrompt(text)
  .replace(/^(?:请帮我|帮我|请)?\s*(?:创建|新建|建立)(?:一个|一项|个)?任务[，,：:\s]*/, '')
  .replace(/^(?:请帮我|帮我|请)\s*推进\s*/,'')
  .replace(/^[，,：:\s]+|[，,。！!？?\s]+$/g,'').trim()
 if(!goal.split('希望最终')[0].replace(/[，,：:\s]/g,'')||goal.includes(TASK_RESULT_PLACEHOLDER))return ''
 return goal
}

export const productPeople: A2AConversationMember[] = [
 {userId:'user-chen-gong',name:'陈工',department:'测试',color:'orange'},
 {userId:'user-liu-gong',name:'刘工',department:'客户端研发',color:'blue'},
 {userId:'user-wang-wu',name:'王五',department:'采购',color:'purple'},
 {userId:'user-zhou-ning',name:'周宁',department:'法务',color:'green'},
 {userId:'user-xu-chen',name:'许晨',department:'信息安全',color:'blue'},
 {userId:'user-lin-yue',name:'林悦',department:'产品设计',color:'purple'},
 {userId:'user-li-si',name:'李四',department:'运营',color:'green'},
]
export function taskPeople(items:A2AConversation[]) {
 return [...new Map([...items.flatMap(c=>c.members),...productPeople].filter(m=>m.userId!=='current-user').map(m=>[m.userId,m])).values()]
}
export function conversationSummary(c:A2AConversation) {
 if(c.status==='completed')return c.completionReason||c.preview
 if(c.status==='waiting_replies')return c.preview
 return c.demo?.roundSummaries?.[String(c.round)]||c.preview
}
export function taskSnapshot(task:TaskItem, completed=false) {
 if(completed)return {summary:'你已确认本次目标达成，相关材料与沟通记录已保留。',next:'任务已完成，可随时查看历史记录。'}
 const review=task.items.find(c=>c.id==='demo-review-interactive')
 const test=task.items.find(c=>c.id==='demo-pet-test-followup')
 if(review&&test)return {
  summary:review.status==='completed'?'需求评审沟通已结束；测试仍在等待待测包和变更清单，尚未开始验证。':review.round>1?'首期按轻量陪伴方向推进，状态优先级仍待确认；测试等待提测材料。':'首期范围尚有分歧，需要明确状态反馈与免打扰规则；测试尚未启动，提测材料待补齐。',
  next:review.pendingCurrentUserConfirmation?'需要你决定下一轮评审方向。':'下一步补齐待测包、安装入口与变更清单，再核实测试安排。',
 }
 const legal=task.items.find(c=>c.id==='demo-targeted-reply')
 if(legal)return {summary:legal.status==='completed'?'采购流程与合同核对沟通已结束，采购材料仍需你确认后在原系统办理。':'采购所需材料已明确；合同的数据删除时限和自动续费约定仍待补充，尚未进入正式采购。',next:'补齐报价与预算负责人，并请供应商明确数据删除与续费条款。'}
 const pending=task.items.find(c=>c.pendingCurrentUserConfirmation)
 if(pending)return {summary:conversationSummary(pending),next:pending.pendingCurrentUserConfirmation!.question}
 if(!task.items.length)return {summary:'目标已记录，正在梳理背景与推进路径。',next:'先明确已有材料和需要核实的问题，再按需联系相关人员。'}
 if(task.items.every(c=>c.status==='completed'))return {summary:'相关沟通已结束，结论和材料已汇集，等待你核对任务目标是否达成。',next:'核对产出与目标，决定是否结束本次任务。'}
 return {summary:conversationSummary(task.items.find(c=>c.status!=='completed')!),next:'根据最新反馈继续核实未明确的问题。'}
}
export function seedTaskChat(task:TaskItem):TaskChat[] {
 const seed=(role:'user'|'assistant',content:string,conversationIds?:string[],fileId?:string):TaskChat=>({id:`seed-${task.id}-${content.slice(0,14)}`,role,content,conversationIds,fileId})
 if(task.items.some(c=>c.id==='demo-review-interactive'))return [
  seed('user','数字宠物首期先做一个轻量的桌面形象。能拖动、点击唤起助理，在任务执行时给一点状态反馈。帮我把需求方案推进清楚，别做成一个一直打扰人的聊天宠物。'),
  seed('assistant','我先把首期目标收敛为 **“看得见任务状态，随时唤起助理，平时不打扰”**。\n\n基础范围包括桌面展示、位置拖动、点击唤起和无声状态反馈。主动聊天、声音提醒暂不默认纳入。\n\n还需要研发和测试一起明确三个边界：窗口置顶、免打扰时的表现，以及多个任务同时运行时显示哪个状态。'),
  seed('user','跟陈工、刘工对齐一下。另外测试迟迟没反馈，你单独问一下陈工卡在哪，别在评审群里混着催。'),
  seed('assistant','已分别发起两路沟通：\n\n**需求评审**：和陈工、刘工核对首期范围及交互边界。\n**测试跟进**：单独请陈工说明未开始验证的原因、前置材料和下一次反馈时间。',['demo-review-interactive','demo-pet-test-followup']),
  seed('assistant','陈工反馈：目前只有上周体验包，本次待测版本和变更清单还没齐，测试尚未启动。他会在 **16:00 反馈材料齐备情况及可安排的测试时间**，这不是测试完成时间。\n\n我把需求范围和待确认项整理成了工作稿。评审群还有一个范围问题需要你决定，可以在下方待处理事项中确认；右侧可核对两路协作记录。',['demo-review-interactive','demo-pet-test-followup'],'task-pet-scope'),
 ]
 if(task.items.some(c=>c.id==='demo-purchase-process'))return [
  seed('user','产品团队要采购20个用户研究工具账号，按年订阅。我们可能会上传访谈录音，先帮我把需要准备什么、哪些条款容易有问题弄清楚。现在还没决定供应商。'),
  seed('assistant','我会先核对采购准备和数据条款两部分。涉及录音，需要特别确认数据存储位置、删除方式和导出能力；费用方面还要补齐报价和预算负责人。\n\n我已分别联系采购和法务，两路沟通都归在这个任务下。',['demo-purchase-process','demo-targeted-reply']),
  seed('user','先把两个方向的结论汇总给我。没有明确的地方别当成已经审核通过。'),
  seed('assistant','**采购路径已经明确**：需要使用场景、账号数量、年度报价和预算负责人，采购会据此确认审批路径。\n\n**合同仍有两处缺口**：终止后只写“合理期限内”删除数据，没有明确时限或删除证明；自动续费条款也缺少提醒期限。法务建议请供应商补充，目前不能视为审核通过。\n\n我整理了一份准备清单，接下来可以用它补齐材料。',['demo-purchase-process','demo-targeted-reply'],'task-purchase-prep'),
 ]
 return [seed('user',task.goal),seed('assistant',task.items.length?`我会持续跟进「${task.title}」。目前的情况是：${taskSnapshot(task).summary}\n\n${taskSnapshot(task).next}`:'目标已记下。我会先整理现有信息，明确需要核实的地方；需要其他人协助时，再为这项任务发起沟通。',task.items.map(c=>c.id))]
}
export function nextMissing(d:GroupDraft):DraftStep|null {
 if(!d.goal.trim())return 'goal'
 if(!d.memberIds.length)return 'people'
 if(!Number.isSafeInteger(Number(d.rounds))||Number(d.rounds)<1||Number(d.rounds)>50)return 'rounds'
 return null
}
export function parseGroupRequest(text:string,task:TaskItem,people:A2AConversationMember[]):GroupDraft {
 const raw=String(text.match(/(?:最多|上限|限定|设为|限制|先聊|聊|讨论)\s*([一二三四五六七八九十\d]+)\s*轮/)?.[1]??'')
 const numbers:Record<string,string>={一:'1',二:'2',三:'3',四:'4',五:'5',六:'6',七:'7',八:'8',九:'9',十:'10'}
 const quoted=text.match(/(?:主题|群名|名称)(?:是|叫|为|[:：])?[「“"『]([^」”"』]+)[」”"』]/)?.[1]
 const intent=text.match(/(?:目标(?:是|为|[:：])|确认|核对|讨论|了解|问清|询问|催办)(.+)/)?.[0]??''
 const goal=intent.replace(/[，,；;。]?\s*(?:最多|上限|限定|设为|限制|先聊|聊)\s*[一二三四五六七八九十\d]+\s*轮.*$/,'').trim()
 return {title:quoted||(task.title.includes('宠物')?/交互/.test(text)?'数字宠物交互细节确认':/测试/.test(text)?'数字宠物测试进度跟进':'数字宠物首期需求沟通':`${task.title.replace(/准备$|推进$/,'')}沟通`),goal:goal.length>=6?goal:'',memberIds:people.filter(m=>text.includes(m.name)||(m.department==='法务'&&text.includes('法务'))||(m.department==='采购'&&text.includes('采购同事'))||(m.department==='产品设计'&&text.includes('设计同事'))).map(m=>m.userId),rounds:numbers[raw]??raw}
}
export function isGroupRequest(text:string) {
 return !/(先别|不要|暂不|不用).*(联系|拉|建|发|问)/.test(text)&&/拉.{0,18}群|建.{0,18}群|创建.{0,18}会话|发起.{0,8}(沟通|协作)|单独.{0,10}(联系|问|聊)|帮我(找|联系|问)/.test(text)
}
