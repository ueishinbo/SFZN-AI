import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { ArrowLeft, ArrowUpRight, Bot, Check, ChevronDown, ChevronRight, Circle, FileText, Flag, Link2, ListTodo, MessageSquare, Paperclip, Plus, Send, X } from 'lucide-react'
import { Dialog, Markdown } from '../role-center/ui'
import PeoplePicker from '../components/PeoplePicker'
import { type ConversationFile } from './A2AFileWorkspace'
import { AskUserComposer } from './AskUserComposer'
import { issueOf, type CollaborationIssue } from './a2aIssues'
import { canManageA2A, completionQuestion, a2aBoardState } from './a2aLifecycle'
import type { A2AConversation, A2AConversationMessage, A2AConversationCommand, A2AConfirmationChoice } from './a2aConversationTypes'
import type { A2AGroupInput } from './CreateA2AGroupDialog'
import { resolveTaskSendTarget, taskPendingReview, conversationSummary, isGroupRequest, nextMissing, parseGroupRequest, seedTaskChat, taskPeople, taskSnapshot, type DraftStep, type GroupDraft, type TaskChat, type TaskItem } from './taskProductModel'
import { useProductState } from './localProductStore'
import TaskActionsMenu from './TaskActionsMenu'
import TaskCollaborationPanel from './TaskCollaborationPanel'
import type { ConversationActivityPatch } from './A2AConversationView'
import { isPublicReply, replyCandidates, resolveMentions } from './a2aMentions'
import './task-workspace.css'
import './task-collaboration.css'

type Target = {fileId?:string;messageId?:string;draft?:string}
type Props = {
 a2aConversations:A2AConversation[]; records:Record<string,A2AConversationMessage[]>;
 incomingTasks?:CollaborationIssue[]; taskFocus?:{id:string;serial:number;conversationId?:string};
 onCreateGroup:(input:A2AGroupInput)=>string;
 onRenameIssue:(id:string,title:string)=>void;
 onStartTask:()=>void;
 history:Record<string,TaskChat[]>; setHistory:Dispatch<SetStateAction<Record<string,TaskChat[]>>>;
 onConversationActivity:(id:string,patch:ConversationActivityPatch)=>void;
 onSubmitCommand:(id:string,action:A2AConversationCommand['action'],content:string)=>void;
}
type TaskEvent={id:string;description:string;time:string;fileId?:string;conversationId?:string}
const statusLabels={confirm:'待我处理',doing:'进行中',done:'已结束'}
const clock=()=>new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})
const uid=()=>crypto.randomUUID()
const emptyTasks:CollaborationIssue[]=[]
function initialFiles(t:TaskItem):ConversationFile[] {
 if(t.items.some(c=>c.id==='demo-review-interactive'))return [{id:'task-pet-scope',name:'数字宠物首期范围与待确认项.md',kind:'markdown',sender:'我的分身',sentAt:'10月13日 09:20',content:'# 数字宠物首期范围与待确认项\n\n## 首期目标\n提供轻量桌面陪伴，帮助用户感知任务状态并快速唤起助理。\n\n## 当前讨论方向\n- 桌面形象展示、位置拖动、点击唤起。\n- 执行中、等待确认、完成等状态采用无声反馈。\n- 主动聊天、声音提醒暂不默认纳入。\n\n## 尚待确认\n- 多个任务同时运行时的状态优先级。\n- 窗口置顶与免打扰规则。\n- 测试所需待测包、安装入口和变更清单。\n\n## 后续跟进\n需求范围继续在评审群核对；测试材料与可安排时间在测试跟进单聊中确认。陈工16:00反馈材料情况，不代表16:00完成测试。'}]
 if(t.items.some(c=>c.id==='demo-purchase-process'))return [{id:'task-purchase-prep',name:'用户研究工具采购准备清单.md',kind:'markdown',sender:'我的分身',sentAt:'10月12日 11:20',content:'# 用户研究工具采购准备清单\n\n## 采购背景\n产品团队拟采购20个用户研究工具账号，按年订阅；尚未确定供应商。\n\n## 材料准备\n- 使用场景与账号数量。\n- 年度报价和预算负责人。\n- 数据存储区域、导出和删除方式。\n\n## 合同待补内容\n- 明确终止后数据删除的时限。\n- 明确删除证明或确认方式。\n- 补充自动续费提醒期限和取消约定。\n\n## 当前结论\n采购路径已明确，合同仍待补充。当前材料不能视为法务审核通过，也未发起正式采购。'}]
 return []
}

export default function TaskWorkspace({a2aConversations:conversations,records,onCreateGroup,onRenameIssue,onStartTask,history,setHistory,onConversationActivity,onSubmitCommand,incomingTasks=emptyTasks,taskFocus}:Props) {
 const [localTasks,setLocalTasks]=useProductState<CollaborationIssue[]>('local-tasks',[])
 const [selected,setSelected]=useProductState<string>('selected-task','')
 const [done,setDone]=useProductState<string[]>('done-tasks',[])
 const [notice,setNotice]=useState<{message:string}|null>(null)
 const [outputs,setOutputs]=useProductState<Record<string,ConversationFile[]>>('task-files',{})
 const [events,setEvents]=useProductState<Record<string,TaskEvent[]>>('task-events',{})
 const [inputs,setInputs]=useProductState<Record<string,string>>('task-inputs',{})
 const [drafts,setDrafts]=useProductState<Record<string,GroupDraft|undefined>>('task-group-drafts',{})
 const [filter,setFilter]=useState('all')
 const [details,setDetails]=useState(false)
 const [workspace,setWorkspace]=useState(()=>window.innerWidth>760)
 const [rightView,setRightView]=useState<'records'|'files'>('records')
 const [activeCollaborations,setActiveCollaborations]=useProductState<Record<string,string>>('task-active-collaborations',{})
 const [references,setReferences]=useProductState<Record<string,{conversationId:string;messageId?:string;quote?:string}>>('task-references',{})
 const [reviewId,setReviewId]=useState<string|null>(null)
 const [mentionAt,setMentionAt]=useState<number|null>(null)
 const [mentionQuery,setMentionQuery]=useState('')
 const [mentionIndex,setMentionIndex]=useState(0)
 const [fileRequest,setFileRequest]=useState<{id:string;serial:number}>()
 const [editId,setEditId]=useState<string|null>(null)
 const [action,setAction]=useState<{taskId:string}|null>(null)
 const [name,setName]=useState('')
 const [draftSteps,setDraftSteps]=useProductState<Record<string,DraftStep|null>>('task-group-steps',{})
 const setStepOverride=(value:DraftStep|null)=>setDraftSteps(s=>({...s,[selected]:value}))
 const [error,setError]=useState('')
 const [busy,setBusy]=useState(false)
 const [routeRequest,setRouteRequest]=useState<string|null>(null)
 const scroller=useRef<HTMLDivElement>(null)
 const composer=useRef<HTMLTextAreaElement>(null)
 const reviewPanel=useRef<HTMLDivElement>(null)
 const attachmentInput=useRef<HTMLInputElement>(null)
 const submitting=useRef(false)
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null)
 const tasks=useMemo(()=>{
  const map=new Map<string,TaskItem>([...incomingTasks,...localTasks].map(t=>[t.id,{...t,items:[]}]))
  conversations.forEach(c=>{
   const info=issueOf(c),existing=map.get(info.id)
   if(existing){existing.items.push(c);existing.source??=c.sourceTask}
   else map.set(info.id,{...info,goal:c.sourceTask?.taskId==='demo-task-pet-202610'?'明确桌面数字宠物首期范围，形成评审结论与测试准备要求。':info.goal,items:[c],source:c.sourceTask})
  })
  return [...map.values()].sort((a,b)=>Number(done.includes(a.id))-Number(done.includes(b.id))||Number(b.items.some(c=>c.pendingCurrentUserConfirmation))-Number(a.items.some(c=>c.pendingCurrentUserConfirmation)))
 },[conversations,incomingTasks,localTasks,done])
 const task=tasks.find(t=>t.id===selected)
 const actionTask=tasks.find(t=>t.id===action?.taskId)
 const editingTask=tasks.find(t=>t.id===editId)
 const unfinished=actionTask?.items.filter(c=>c.status!=='completed')??[]
 const completed=!!task&&done.includes(task.id)
 const draft=task?drafts[task.id]:undefined
 const step=draft?(draftSteps[selected]??nextMissing(draft)??'rounds'):null
 const input=task?inputs[task.id]??'':''
 const people=useMemo(()=>taskPeople(task?.items??[]),[task?.items])
 const messages=useMemo(()=>task?history[task.id]??seedTaskChat(task):[],[task,history])
 const reference=references[selected]
 const referencedConversation=task?.items.find(c=>c.id===reference?.conversationId)
 const reviewing=completed?undefined:taskPendingReview(task?.items??[],reviewId)
 const mentionOptions=referencedConversation?[{userId:'all',name:'所有人',department:'本协作其他成员'},...replyCandidates(referencedConversation)].filter(m=>m.name.includes(mentionQuery)||m.department.includes(mentionQuery)):[]
 const pending=task?.items.filter(c=>c.status!=='completed'&&c.pendingCurrentUserConfirmation)??[]
 const entries=task?.items.flatMap(c=>(records[c.id]??c.demo?.messages??[]).map(m=>({c,m})))??[]
 const files:ConversationFile[]=task?[...new Map([...initialFiles(task),...entries.flatMap(({c,m})=>(m.attachments??[]).map(f=>({...f,sender:c.title,sentAt:m.createdAt}))),...outputs[task.id]??[]].map(f=>[f.id,f])).values()]:[]
 const snapshot=task?taskSnapshot(task,completed):null
 useEffect(()=>{if(reviewing&&reviewId!==reviewing.id)setReviewId(reviewing.id)},[reviewing,reviewId])
 useEffect(()=>{if(taskFocus){setSelected(taskFocus.id);setDetails(false);setWorkspace(window.innerWidth>760);setRightView('records');setReviewId(taskFocus.conversationId??null);setMentionAt(null);if(taskFocus.conversationId)setWorkspace(true);if(taskFocus.conversationId)setActiveCollaborations(v=>({...v,[taskFocus.id]:taskFocus.conversationId!}));setError('');setRouteRequest(null);setAction(null);setEditId(null)}},[taskFocus,setSelected,setActiveCollaborations])
 useEffect(()=>{const node=scroller.current;if(node)node.scrollTo({top:node.scrollHeight,behavior:'smooth'})},[selected,messages.length])
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[])

 const patchDraft=(value:GroupDraft|undefined)=>{if(task)setDrafts(d=>({...d,[task.id]:value}))}
 const appendTo=(t:TaskItem,...items:Omit<TaskChat,'id'>[])=>setHistory(h=>({...h,[t.id]:[...h[t.id]??seedTaskChat(t),...items.map(m=>({...m,id:uid(),time:clock()}))]}))
 const log=(t:TaskItem,description:string,extra:Partial<TaskEvent>={})=>setEvents(e=>({...e,[t.id]:[{id:uid(),description,time:clock(),...extra},...e[t.id]??[]]}))
 const enter=(id:string)=>{setSelected(id);setDetails(false);setWorkspace(window.innerWidth>760);setRightView('records');setReviewId(null);setMentionAt(null);setFileRequest(undefined);setError('');setRouteRequest(null)}
 const openChild=(id:string,target?:Target)=>{
  const owner=tasks.find(t=>t.items.some(c=>c.id===id));if(!owner)return
  setSelected(owner.id);setActiveCollaborations(v=>({...v,[owner.id]:id}));setDetails(false);setWorkspace(true);setRightView('records')
  if(target?.draft){setReferences(v=>({...v,[owner.id]:{conversationId:id}}));setInputs(v=>({...v,[owner.id]:target.draft!}));requestAnimationFrame(()=>composer.current?.focus())}
 }
 const clearReference=()=>{setReferences(v=>{const next={...v};delete next[selected];return next});setMentionAt(null)}
 const useReference=(c:A2AConversation,m?:A2AConversationMessage)=>{
  if(!task||reviewing)return
  setReferences(v=>({...v,[task.id]:{conversationId:c.id,messageId:m?.id,quote:m?.content}}));setReviewId(null);setMentionAt(null);setWorkspace(window.innerWidth>760);setRightView('records');setActiveCollaborations(v=>({...v,[task.id]:c.id}));requestAnimationFrame(()=>composer.current?.focus())
 }
 const review=(id:string)=>{openChild(id);setReviewId(id);if(window.innerWidth<=760)setWorkspace(false);requestAnimationFrame(()=>reviewPanel.current?.focus())}
 const resolveTaskConfirmation=(choice:A2AConfirmationChoice)=>{
  const confirmation=reviewing?.pendingCurrentUserConfirmation
  if(!task||!reviewing||!confirmation)return
  appendTo(task,{role:'user',content:`针对「${reviewing.title}」：${choice.label}`,conversationIds:[reviewing.id]})
  onConversationActivity(reviewing.id,{status:confirmation.resumeStatus,preview:confirmation.resumePreview,pendingCurrentUserConfirmation:undefined,updatedAt:'刚刚'})
  if(choice.commandAction&&choice.commandContent)onSubmitCommand(reviewing.id,choice.commandAction,choice.commandContent)
  setReviewId(null)
 }
 const requestConversationCompletion=(id:string)=>{
  const c=task?.items.find(c=>c.id===id);if(!c||c.pendingCurrentUserConfirmation||!canManageA2A(c))return
  onConversationActivity(id,{pendingCurrentUserConfirmation:completionQuestion(c)});review(id)
 }
 const chooseMention=(name:string)=>{
  const start=mentionAt??input.length,cursor=composer.current?.selectionStart??input.length
  setInputs(v=>({...v,[selected]:`${input.slice(0,start)}@${name} ${input.slice(cursor)}`}));setMentionAt(null)
  requestAnimationFrame(()=>{composer.current?.focus();composer.current?.setSelectionRange(start+name.length+2,start+name.length+2)})
 }
 const preview=(id:string)=>{setDetails(false);setWorkspace(true);setRightView('files');setFileRequest({id,serial:Date.now()})}
 const requestStatus=(t:TaskItem)=>{
  if(done.includes(t.id))return
  setDetails(false);setAction({taskId:t.id})
 }
 const requestEdit=(t:TaskItem)=>{setDetails(false);setName(t.title);setEditId(t.id)}
 const applyAction=()=>{
  if(!action||!actionTask||done.includes(actionTask.id)||actionTask.items.some(c=>c.status!=='completed'))return
  setDone(ids=>[...new Set([...ids,actionTask.id])]);log(actionTask,'你确认本次任务目标已达成')
  setNotice({message:`「${actionTask.title}」已移至已完成`});setAction(null)
 }
 const taskMenu=(t:TaskItem)=><TaskActionsMenu title={t.title} completed={done.includes(t.id)} onChangeStatus={()=>requestStatus(t)} onEdit={()=>requestEdit(t)}/>

 const completeCreation=(d:GroupDraft)=>{
  if(!task||nextMissing(d)||submitting.current)return
  submitting.current=true
  try{
   const id=onCreateGroup({title:d.title,goal:d.goal.trim(),members:people.filter(p=>d.memberIds.includes(p.userId)),maxRounds:Number(d.rounds),issue:{id:task.id,title:task.title,goal:task.goal},sourceTask:task.source,stayInTask:true})
   appendTo(task,{role:'assistant',content:`已创建「${d.title}」，邀请${people.filter(p=>d.memberIds.includes(p.userId)).map(p=>p.name).join('、')}，最多沟通 ${d.rounds} 轮。\n\n我已发出首条消息，${d.goal.replace(/[。！!]+$/,'')}。收到反馈后，会汇入这项任务的进展。`,conversationIds:[id]})
   setActiveCollaborations(v=>({...v,[task.id]:id}));setWorkspace(true);setRightView('records');
   patchDraft(undefined);setStepOverride(null);log(task,`发起「${d.title}」`,{conversationId:id})
  }catch{setError('会话创建失败，信息已保留，请重试。')}finally{submitting.current=false}
 }
 const advance=()=>{if(!draft)return;const missing=nextMissing(draft);setStepOverride(missing);if(!missing)completeCreation(draft)}
 const answer=(t:TaskItem,text:string,filesForTask:ConversationFile[])=>{
  if(/整理|输出|清单|写一|形成.*文档/.test(text)){
   const file:ConversationFile={id:uid(),name:`${t.title}推进清单.md`,kind:'markdown',sender:'我的分身',sentAt:`今天 ${clock()}`,content:`# ${t.title} · 推进清单\n\n## 目标\n${t.goal}\n\n## 当前进展\n${taskSnapshot(t).summary}\n\n## 后续行动\n${taskSnapshot(t).next}\n\n## 沟通依据\n${t.items.map(c=>`- **${c.title}**：${conversationSummary(c)}`).join('\n')||'当前尚未发起对外沟通，待补充背景材料。'}`}
   setOutputs(o=>({...o,[t.id]:[...o[t.id]??[],file]}));appendTo(t,{role:'assistant',content:'已经把当前结论、待核实问题和下一步整理成清单。尚未确认的内容单独保留，便于继续跟进。',fileId:file.id});log(t,'整理了任务推进清单',{fileId:file.id});return
  }
  if(/材料|文件|文档/.test(text)&&filesForTask.length){appendTo(t,{role:'assistant',content:`目前有 ${filesForTask.length} 份材料。先看这份，它记录了当前结论和待补信息。`,fileId:filesForTask[0].id});return}
  if(/测试/.test(text)&&t.items.some(c=>c.id==='demo-pet-test-followup')){appendTo(t,{role:'assistant',content:'测试还没有开始。陈工收到的是上周体验包，本次待测版本、安装入口和变更清单没有齐备；状态优先级也仍待评审。\n\n他约定 16:00 反馈材料齐备情况和可安排的测试时间，尚未承诺测试完成时间。建议先补材料，再核实安排。',conversationIds:['demo-pet-test-followup']});return}
  appendTo(t,{role:'assistant',content:`${taskSnapshot(t).summary}\n\n**下一步**\n${taskSnapshot(t).next}`,conversationIds:t.items.map(c=>c.id)})
 }
 const send=()=>{
  if(!task||!input.trim()||completed||reviewing||busy)return
  const text=input.trim();setMentionAt(null);setInputs(v=>({...v,[task.id]:''}));setError('');appendTo(task,{role:'user',content:text,conversationIds:referencedConversation?[referencedConversation.id]:undefined,referenceQuote:reference?.quote})
  if(/^(任务|这件事|这个任务|本次任务)?(已经|已)?(完成了|完成|结束了)[。！!]?$/u.test(text)){requestStatus(task);return}
  if(isGroupRequest(text)&&!referencedConversation){
   const parsed=parseGroupRequest(text,task,people)
   if(!nextMissing(parsed))completeCreation(parsed)
   else {patchDraft(parsed);setStepOverride(nextMissing(parsed))}
   return
  }
  if(referencedConversation && !isPublicReply(text)){
   appendTo(task,{role:'assistant',content:`关于「${referencedConversation.title}」：${conversationSummary(referencedConversation)}${reference?.quote ? `\n\n你引用的消息是：${reference.quote}` : ''}\n\n这段讨论只留在任务里。需要我代为回复时，请明确说明发送内容。`,conversationIds:[referencedConversation.id]});return
  }
  if(isPublicReply(text)){
   const target=resolveTaskSendTarget(text,task.items,referencedConversation?.id)
   if(!target){setRouteRequest(text);return}
   if(target.status==='completed'){setInputs(v=>({...v,[task.id]:text}));setError('这一路协作已结束，可以私下讨论历史记录；如需继续沟通，请发起新的协作。');return}
   const routing=resolveMentions(text,replyCandidates(target))
   if(routing.error){setInputs(v=>({...v,[task.id]:text}));setError(routing.error);return}
   openChild(target.id);onSubmitCommand(target.id,'send',text);return
  }
  setBusy(true);const captured=task;timer.current=setTimeout(()=>{answer(captured,text,files);setBusy(false)},700)
 }
 const upload=async(file:File)=>{
  if(!task||completed)return
  if(!/\.(md|txt|html?)$/i.test(file.name)){setError('当前支持 Markdown、TXT 和 HTML 文件。');return}
  if(file.size>5*1024*1024){setError('请选择不超过 5 MB 的文本文件。');return}
  try{const item:ConversationFile={id:uid(),name:file.name,kind:/\.html?$/i.test(file.name)?'html':'markdown',content:await file.text(),sender:'我',sentAt:`今天 ${clock()}`};setOutputs(o=>({...o,[task.id]:[...o[task.id]??[],item]}));appendTo(task,{role:'user',content:'补充一份任务材料。',fileId:item.id});log(task,'添加了任务材料',{fileId:item.id})}catch{setError('文件读取失败，请重新选择。')}
 }
 const matching=(t:TaskItem,f=filter)=>(f==='all'||(f==='done'?done.includes(t.id):f==='doing'?!done.includes(t.id):!done.includes(t.id)&&t.items.some(c=>c.status!=='completed'&&c.pendingCurrentUserConfirmation)))
 const fileButton=(f:ConversationFile)=> <button className="tp-file" key={f.id} onClick={()=>preview(f.id)}><span><FileText size={20}/></span><div><strong>{f.name}</strong><small>{f.sender} · {f.sentAt}</small></div><ArrowUpRight size={15}/></button>
 const conversationLink=(c:A2AConversation)=> <button className="tp-related" key={c.id} onClick={()=>openChild(c.id)}><i className="tp-conversation-icon"><MessageSquare size={18}/></i><span><strong>{c.title}</strong><small className="tp-related-people">{c.scope==='direct'?'单聊':'群聊'} · {c.members.map(m=>m.name).join('、')}</small><small className="tp-related-summary">{conversationSummary(c)}</small></span><em className={`tp-state ${a2aBoardState(c)}`}>{statusLabels[a2aBoardState(c)]}</em><ChevronRight size={15}/></button>
 return <div className="tp-root">
 {!task?<section className="tp-list-page"><header><div><span className="tp-eyebrow">ASSISTANT TASKS</span><h1>助理任务</h1><p>目标、进展与每一次协作，都留在同一件事里。</p></div><button className="tp-new" onClick={onStartTask}><Plus size={17}/>新建任务</button></header>
 <nav className="tp-filters" aria-label="任务筛选">{[['all','全部'],['attention','待我处理'],['doing','进行中'],['done','已完成']].map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}<span>{tasks.filter(t=>matching(t,id)).length}</span></button>)}</nav>
 <div className="tp-task-list">{tasks.filter(t=>matching(t)).map(t=><article key={t.id} className={done.includes(t.id)?'is-completed':''}>
 <div className="tp-task-row"><button className="tp-task-check" disabled={done.includes(t.id)} role="checkbox" aria-checked={done.includes(t.id)} aria-label={`${done.includes(t.id)?'已完成':'标记已完成'}：${t.title}`} title={done.includes(t.id)?'已完成':'标记已完成'} onClick={()=>requestStatus(t)}>{done.includes(t.id)&&<Check size={16}/>}</button>
 <button className="tp-task-entry" onClick={()=>enter(t.id)}><div className="tp-task-copy"><h2>{t.title}</h2><p>{taskSnapshot(t,done.includes(t.id)).summary}</p><span>{t.source&&<><Link2 size={12}/>{t.source.platform}<i>·</i></>}{done.includes(t.id)?'已完成':t.items.some(c=>c.status!=='completed'&&c.pendingCurrentUserConfirmation)?`${t.items.filter(c=>c.status!=='completed'&&c.pendingCurrentUserConfirmation).length} 项待你确认`:'进行中'}</span></div><ChevronRight size={18}/></button>{taskMenu(t)}</div>

 </article>)}</div>
 {!tasks.some(t=>matching(t))&&<div className="tp-empty"><Flag size={28}/><h3>这里还没有任务</h3><p>换个筛选查看，或从一个新的委托开始。</p><button onClick={()=>setFilter('all')}>查看全部任务</button></div>}
 </section>:<section className={`tp-task ${workspace?'with-workspace':''}`}>
 <header className="tp-header">
 <div className="tp-header-top"><button className="tp-back" aria-label="返回助理任务" onClick={()=>enter('')}><ArrowLeft size={19}/></button><div className="tp-title-line"><h1>{task.title}</h1><span className={`tp-header-status ${completed?'done':''}`}><span className={`tp-status-dot ${completed?'done':''}`}/>{completed?'已完成':'进行中'}</span></div><div className="tp-header-actions"><button className="tp-detail-trigger" aria-label="打开协作过程" aria-pressed={workspace&&rightView==='records'} onClick={()=>{setWorkspace(true);setRightView('records')}}><MessageSquare size={16}/><span>协作过程</span></button><button className="tp-detail-trigger" aria-label="任务详情" onClick={()=>setDetails(true)}><ListTodo size={16}/><span>任务详情</span></button><button className="tp-workspace-trigger" aria-label="打开任务 Workspace" title="Workspace" aria-pressed={workspace&&rightView==='files'} onClick={()=>{setWorkspace(true);setRightView('files')}}><FileText size={18}/></button></div></div>
 <div className="tp-heading-context"><p title={task.goal}><span>目标</span>{task.goal}</p><p className="tp-heading-progress" title={snapshot?.summary}><span>进展</span>{snapshot?.summary}</p></div>
 </header>
 <div className="tp-body"><main className="tp-main"><div className="tp-thread" ref={scroller} aria-label="任务主会话"><div className="tp-date">任务记录</div>
 {messages.map(m=><article key={m.id} className={`tp-message ${m.role}`}><span className="tp-avatar">{m.role==='assistant'?<Bot size={19}/>:'我'}</span><div><div className="tp-message-author">{m.role==='assistant'?'我的分身':'我'}{m.time&&<time>{m.time}</time>}</div><Markdown content={m.content}/>{m.referenceQuote&&<blockquote className="tp-history-quote">{m.referenceQuote}</blockquote>}{m.fileId&&files.find(f=>f.id===m.fileId)&&fileButton(files.find(f=>f.id===m.fileId)!)}{m.conversationIds&&<div className="tp-links">{m.conversationIds.map(id=>{const c=task.items.find(c=>c.id===id);return c?<button key={id} onClick={()=>openChild(id)}>{c.title}<ArrowUpRight size={12}/></button>:null})}</div>}</div></article>)}
 {busy&&<div className="tp-thinking"><Bot size={17}/><span>正在整理当前任务的信息<span>···</span></span></div>}
 </div><div className="tp-compose-wrap">{error&&<p className="tp-error" role="alert">{error}<button aria-label="关闭提示" onClick={()=>setError('')}><X size={13}/></button></p>}
 {completed?<div className="tp-readonly"><Check size={15}/>这项任务已完成，可查看历史记录和文件。如需继续推进，请新建任务。</div>:
 reviewing?.pendingCurrentUserConfirmation?<div className="tp-ask tp-review-ask" ref={reviewPanel} tabIndex={-1}><div className="tp-review-source">{pending.length>1?<label>待确认问题 · {pending.length} 项<select aria-label="切换待确认问题" value={reviewing.id} onChange={e=>review(e.target.value)}>{pending.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>:<>来自：{reviewing.title}</>}</div><AskUserComposer title={reviewing.pendingCurrentUserConfirmation.question} description={reviewing.pendingCurrentUserConfirmation.description}>{reviewing.pendingCurrentUserConfirmation.choices.map((choice,index)=><button key={choice.id} onClick={()=>resolveTaskConfirmation(choice)}><i>{index+1}</i><span><strong>{choice.label}</strong><small>{choice.description}</small></span></button>)}</AskUserComposer><footer><small>请先作出选择，再继续任务对话。{pending.length>1?'处理后将显示下一项待确认问题。':''}</small></footer></div>:
 draft&&step?<div className="tp-ask"><AskUserComposer title={step==='goal'?'这次沟通希望解决什么问题？':step==='people'?'这次需要联系谁？':'这次最多沟通几轮？'} description={step==='goal'?'请补充本次沟通目标，已有任务背景会自动带入。':step==='people'?`沟通目标：${draft.goal}`:`${people.filter(p=>draft.memberIds.includes(p.userId)).map(p=>p.name).join('、')} · ${draft.goal}`}>
 {step==='goal'?<label className="tp-ask-field">沟通目标<textarea autoFocus aria-label="沟通目标" rows={2} value={draft.goal} onChange={e=>patchDraft({...draft,goal:e.target.value})} placeholder="例如：确认点击、拖动和免打扰的首期交互边界"/></label>:step==='people'?<div className="tp-people"><PeoplePicker options={people.map(m=>({id:m.userId,name:m.name,department:m.department}))} value={draft.memberIds} onChange={ids=>patchDraft({...draft,memberIds:ids})}/></div>:<div className="tp-rounds">{['1','3','5'].map(r=><button key={r} aria-pressed={draft.rounds===r} onClick={()=>patchDraft({...draft,rounds:r})}>{r} 轮{r==='3'&&<small>建议</small>}</button>)}<label>自定义<input aria-label="自定义最大轮次" type="number" min="1" max="50" value={draft.rounds} onChange={e=>patchDraft({...draft,rounds:e.target.value})}/></label><p>达到上限后暂停，由群主决定是否继续。</p></div>}
 </AskUserComposer><footer><button onClick={()=>{patchDraft(undefined);setStepOverride(null);appendTo(task,{role:'assistant',content:'已取消本次创建，未创建协作或发送消息。'})}}>取消创建</button>{step!=='goal'&&<button onClick={()=>setStepOverride(step==='rounds'?'people':'goal')}>上一步</button>}<small>{step==='people'?'一位联系人为单聊，多位联系人为群聊。':''}</small><button className="tp-primary" disabled={step==='goal'?!draft.goal.trim():step==='people'?!draft.memberIds.length:!Number.isSafeInteger(+draft.rounds)||+draft.rounds<1||+draft.rounds>50} onClick={advance}>{nextMissing(draft)?'继续':'创建并发送'}</button></footer></div>:
 routeRequest?<div className="tp-ask"><AskUserComposer title="这条消息要跟进哪个会话？" description={routeRequest}>{task.items.filter(c=>c.status!=='completed').map((c,i)=><button key={c.id} onClick={()=>{openChild(c.id);onSubmitCommand(c.id,'send',routeRequest);setRouteRequest(null)}}><i>{i+1}</i><span><strong>{c.title}</strong><small>{c.members.map(m=>m.name).join('、')}</small></span></button>)}{!task.items.some(c=>c.status!=='completed')&&<p>当前没有可继续的会话，请先说明希望联系谁。</p>}<button onClick={()=>{setInputs(v=>({...v,[task.id]:routeRequest}));setRouteRequest(null)}}><span><strong>不发送，返回修改</strong><small>保留消息草稿，不向任何协作发送。</small></span></button></AskUserComposer></div>:
 <>
 {referencedConversation&&<div className="tp-reply-context"><MessageSquare size={15}/><div><strong>正在讨论 · {referencedConversation.title}</strong>{reference?.quote&&<p>{reference.quote}</p>}</div><button aria-label="取消消息引用" onClick={clearReference}><X size={14}/></button></div>}
 <form className="tp-composer" onSubmit={e=>{e.preventDefault();send()}}>{mentionAt!==null&&referencedConversation&&<div className="tp-mention-picker" role="listbox" aria-label="选择回复对象">{mentionOptions.map((m,i)=><button type="button" role="option" aria-selected={i===mentionIndex} key={m.userId} onMouseDown={e=>e.preventDefault()} onClick={()=>chooseMention(m.name)}><strong>{m.name}</strong><small>{m.department}</small></button>)}{!mentionOptions.length&&<p>没有匹配的会话成员</p>}</div>}<textarea ref={composer} aria-label="任务主会话输入" placeholder="继续这项任务，说说你接下来想做什么…" value={input} disabled={busy} onChange={e=>{setInputs(v=>({...v,[task.id]:e.target.value}));const before=e.target.value.slice(0,e.target.selectionStart),match=before.match(/@([^\s@]*)$/);setMentionAt(match?before.length-match[0].length:null);setMentionQuery(match?.[1]??'');setMentionIndex(0)}} onKeyDown={e=>{if(mentionAt!==null&&referencedConversation){if(e.key==='Escape'){e.preventDefault();setMentionAt(null);return}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setMentionIndex(i=>Math.max(0,Math.min(mentionOptions.length-1,i+(e.key==='ArrowDown'?1:-1))));return}if(e.key==='Enter'&&!e.nativeEvent.isComposing){e.preventDefault();if(mentionOptions[mentionIndex])chooseMention(mentionOptions[mentionIndex].name);return}}if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send()}}}/><footer><span>商飞大模型 L1-S1 <ChevronDown size={12}/></span><button type="button" aria-label="添加任务附件" title="添加 Markdown、TXT 或 HTML 材料" onClick={()=>attachmentInput.current?.click()}><Paperclip size={17}/></button><button className="tp-send" aria-label="发送任务消息" disabled={!input.trim()||busy}><Send size={17}/></button></footer></form><input hidden type="file" accept=".md,.txt,.html,.htm" ref={attachmentInput} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);e.target.value=''}}/>
 </>}
 </div></main>
 {workspace&&<TaskCollaborationPanel taskId={task.id} conversations={task.items} records={records} selectedId={activeCollaborations[task.id]} onSelect={id=>setActiveCollaborations(v=>({...v,[task.id]:id}))} view={rightView} onView={setRightView} files={files} fileRequest={fileRequest} messageId={reference?.conversationId===activeCollaborations[task.id]?reference?.messageId:undefined} onFile={preview} onReference={useReference} onReview={review} reviewingId={reviewing?.id} onComplete={requestConversationCompletion} onClose={()=>setWorkspace(false)} readOnly={completed}/>}

 </div></section>}
 {details&&task&&<Dialog title="任务详情" wide onClose={()=>setDetails(false)}><div className="tp-detail"><div className="tp-detail-heading"><h2>{task.title}</h2>{taskMenu(task)}</div>
 <p className="tp-detail-goal">{task.goal}</p><p className="tp-detail-summary">{snapshot?.summary} {snapshot?.next}</p>
 {task.source&&<div className="tp-detail-source"><Link2 size={13}/><span>{task.source.platform} · {task.source.titleAtReference}</span>{task.source.url&&!task.source.unavailable&&/^https?:\/\//.test(task.source.url)?<a href={task.source.url} target="_blank" rel="noopener noreferrer">查看来源 ↗</a>:<span>来源引用</span>}</div>}
 <section className="tp-detail-files"><header><span className={`tp-status-dot ${completed?'done':''}`}/>{completed?'已完成':'进行中'}<small>{files.length} 份产出物</small></header>{files.length?files.map(fileButton):<p className="tp-empty-inline">{completed?'本任务没有产出物。':'还没有产出物，后续整理的文件会保留在这里。'}</p>}</section>
 <section><h3>相关会话 <small>{task.items.length}</small></h3>{task.items.length?task.items.map(conversationLink):<p className="tp-empty-inline">{completed?'本任务未发起对外沟通。':'暂未发起对外沟通。需要他人协助时，直接在主会话中告诉分身。'}</p>}</section>
 <section className="tp-timeline"><h3>动态</h3>{(events[task.id]??[]).map(e=><button className="tp-event" key={e.id} disabled={!e.fileId&&!e.conversationId} onClick={()=>e.fileId?preview(e.fileId):e.conversationId?openChild(e.conversationId):undefined}><span><Check size={12}/></span><div><small>今天 {e.time}</small><strong>{e.description}</strong></div></button>)}
 {task.items.map(c=><button className="tp-event" key={c.id} onClick={()=>openChild(c.id)}><span>{c.pendingCurrentUserConfirmation?<Circle size={12}/>:<MessageSquare size={12}/>}</span><div><small>{c.updatedAt} · {c.title}</small><strong>{c.pendingCurrentUserConfirmation?'需要你的决定':c.status==='completed'?'本次沟通已结束':'收到沟通反馈'}</strong><p>{conversationSummary(c)}</p></div></button>)}
 <div className="tp-event"><span><Flag size={12}/></span><div><small>任务建立</small><strong>记录目标，开始推进</strong><p>{task.goal}</p></div></div></section></div></Dialog>}
 {editingTask&&<Dialog title="编辑名称" onClose={()=>setEditId(null)} footer={<><button onClick={()=>setEditId(null)}>取消</button><button className="rc-primary" disabled={!name.trim()} onClick={()=>{onRenameIssue(editingTask.id,name.trim());setLocalTasks(ts=>[{id:editingTask.id,title:name.trim(),goal:editingTask.goal},...ts.filter(t=>t.id!==editingTask.id)]);log(editingTask,'更新了任务名称');setNotice({message:'任务名称已保存'});setEditId(null)}}>保存</button></>}><label className="rc-field">任务名称<input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="请输入任务名称"/></label></Dialog>}
 {action&&actionTask&&<Dialog title="确认任务完成" onClose={()=>setAction(null)} footer={<><button onClick={()=>setAction(null)}>取消</button><button className="rc-primary" disabled={unfinished.length>0} onClick={applyAction}>确认完成</button></>}>
 <div className="tp-task-action-copy"><h3>{actionTask.title}</h3>{unfinished.length>0?<><p>还有 {unfinished.length} 个 A2A 会话未结束，请先处理后再完成任务。</p><p className="tp-action-note">只有各会话的群主可以结束沟通。点击下方会话前往处理。</p><div className="tp-blocking-conversations">{unfinished.map(c=><button key={c.id} onClick={()=>{setAction(null);openChild(c.id)}}><MessageSquare size={16}/><span>{c.title}</span><ChevronRight size={15}/></button>)}</div></>:<><p>确认这个任务的目标已经达成？确认后将移至“已完成”，主会话停止接收新消息。</p><p className="tp-action-note">完成后不能恢复进行中，对话和文件会保留。如需继续推进，请新建任务。原系统任务状态不会改变。</p></>}</div>
 </Dialog>}
 {notice&&<div className="tp-toast" role="status"><Check size={17}/><span>{notice.message}</span><button aria-label="关闭操作提示" onClick={()=>setNotice(null)}><X size={14}/></button></div>}
 </div>
}
