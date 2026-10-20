import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Bot, Check, ChevronDown, ChevronRight, Circle, FileText, Flag, Link2, ListTodo, MessageSquare, Paperclip, Plus, RotateCcw, Send, Trash2, X } from 'lucide-react'
import { Dialog, Markdown } from '../role-center/ui'
import PeoplePicker from '../components/PeoplePicker'
import A2AFileWorkspace, { type ConversationFile } from './A2AFileWorkspace'
import { AskUserComposer } from './AskUserComposer'
import { issueOf, type CollaborationIssue } from './a2aIssues'
import { a2aBoardState } from './a2aLifecycle'
import type { A2AConversation, A2AConversationMessage } from './a2aConversationTypes'
import type { A2AGroupInput } from './CreateA2AGroupDialog'
import { conversationSummary, isGroupRequest, nextMissing, parseGroupRequest, seedTaskChat, taskPeople, taskSnapshot, type DraftStep, type GroupDraft, type TaskChat, type TaskItem } from './taskProductModel'
import { useProductState } from './localProductStore'
import TaskActionsMenu from './TaskActionsMenu'
import './task-workspace.css'

type Target = {fileId?:string;messageId?:string;draft?:string}
type Props = {
 a2aConversations:A2AConversation[]; records:Record<string,A2AConversationMessage[]>;
 incomingTasks?:CollaborationIssue[]; taskFocus?:{id:string;serial:number};
 onCreateGroup:(input:A2AGroupInput)=>string;
 onRenameIssue:(id:string,title:string)=>void;
 onOpenA2AConversation:(id:string,target?:Target)=>void;
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

export default function TaskWorkspace({a2aConversations:conversations,records,onCreateGroup,onRenameIssue,onOpenA2AConversation:openConversation,incomingTasks=emptyTasks,taskFocus}:Props) {
 const [localTasks,setLocalTasks]=useProductState<CollaborationIssue[]>('local-tasks',[])
 const [selected,setSelected]=useProductState<string>('selected-task','')
 const [done,setDone]=useProductState<string[]>('done-tasks',[])
 const [removed,setRemoved]=useProductState<Record<string,{deletedAt:string}>>('removed-tasks',{})
 const [showRemoved,setShowRemoved]=useState(false)
 const [notice,setNotice]=useState<{message:string;undoId?:string}|null>(null)
 const [history,setHistory]=useProductState<Record<string,TaskChat[]>>('task-history',{})
 const [outputs,setOutputs]=useProductState<Record<string,ConversationFile[]>>('task-files',{})
 const [events,setEvents]=useProductState<Record<string,TaskEvent[]>>('task-events',{})
 const [inputs,setInputs]=useProductState<Record<string,string>>('task-inputs',{})
 const [drafts,setDrafts]=useProductState<Record<string,GroupDraft|undefined>>('task-group-drafts',{})
 const [filter,setFilter]=useState('all')
 const [expanded,setExpanded]=useState<string[]>([])
 const [details,setDetails]=useState(false)
 const [workspace,setWorkspace]=useState(false)
 const [fileRequest,setFileRequest]=useState<{id:string;serial:number}>()
 const [editId,setEditId]=useState<string|null>(null)
 const [newTask,setNewTask]=useState(false)
 const [action,setAction]=useState<{kind:'complete'|'delete';taskId:string}|null>(null)
 const [name,setName]=useState('')
 const [goal,setGoal]=useState('')
 const [draftSteps,setDraftSteps]=useProductState<Record<string,DraftStep|null>>('task-group-steps',{})
 const setStepOverride=(value:DraftStep|null)=>setDraftSteps(s=>({...s,[selected]:value}))
 const [error,setError]=useState('')
 const [busy,setBusy]=useState(false)
 const [routeRequest,setRouteRequest]=useState<string|null>(null)
 const scroller=useRef<HTMLDivElement>(null)
 const composer=useRef<HTMLTextAreaElement>(null)
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
 const removedTasks=tasks.filter(t=>removed[t.id]).sort((a,b)=>removed[b.id].deletedAt.localeCompare(removed[a.id].deletedAt))
 const unfinished=actionTask?.items.filter(c=>c.status!=='completed')??[]
 const completed=!!task&&done.includes(task.id)
 const draft=task?drafts[task.id]:undefined
 const step=draft?(draftSteps[selected]??nextMissing(draft)??'rounds'):null
 const input=task?inputs[task.id]??'':''
 const people=useMemo(()=>taskPeople(task?.items??[]),[task?.items])
 const messages=useMemo(()=>task?history[task.id]??seedTaskChat(task):[],[task,history])
 const pending=task?.items.filter(c=>c.status!=='completed'&&c.pendingCurrentUserConfirmation)??[]
 const entries=task?.items.flatMap(c=>(records[c.id]??c.demo?.messages??[]).map(m=>({c,m})))??[]
 const files:ConversationFile[]=task?[...new Map([...initialFiles(task),...entries.flatMap(({c,m})=>(m.attachments??[]).map(f=>({...f,sender:c.title,sentAt:m.createdAt}))),...outputs[task.id]??[]].map(f=>[f.id,f])).values()]:[]
 const snapshot=task?taskSnapshot(task,completed):null
 useEffect(()=>{if(taskFocus){setSelected(taskFocus.id);setDetails(false);setWorkspace(false);setError('');setRouteRequest(null);setAction(null);setEditId(null);setShowRemoved(false)}},[taskFocus,setSelected])
 useEffect(()=>{const node=scroller.current;if(node)node.scrollTo({top:node.scrollHeight,behavior:'smooth'})},[selected,messages.length])
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[])

 const patchDraft=(value:GroupDraft|undefined)=>{if(task)setDrafts(d=>({...d,[task.id]:value}))}
 const appendTo=(t:TaskItem,...items:Omit<TaskChat,'id'>[])=>setHistory(h=>({...h,[t.id]:[...h[t.id]??seedTaskChat(t),...items.map(m=>({...m,id:uid(),time:clock()}))]}))
 const log=(t:TaskItem,description:string,extra:Partial<TaskEvent>={})=>setEvents(e=>({...e,[t.id]:[{id:uid(),description,time:clock(),...extra},...e[t.id]??[]]}))
 const enter=(id:string)=>{setSelected(id);setDetails(false);setWorkspace(false);setFileRequest(undefined);setError('');setRouteRequest(null)}
 const openChild=(id:string,target?:Target)=>{setDetails(false);openConversation(id,target)}
 const preview=(id:string)=>{setDetails(false);setWorkspace(true);setFileRequest({id,serial:Date.now()})}
 const reopenTask=(t:TaskItem)=>{
  if(removed[t.id])return
  setDone(ids=>ids.filter(id=>id!==t.id));log(t,'恢复进行中');setNotice({message:`「${t.title}」已恢复进行中`})
 }
 const requestStatus=(t:TaskItem)=>{
  setDetails(false)
  if(done.includes(t.id))reopenTask(t)
  else setAction({kind:'complete',taskId:t.id})
 }
 const requestEdit=(t:TaskItem)=>{setDetails(false);setName(t.title);setGoal(t.goal);setEditId(t.id)}
 const requestDelete=(t:TaskItem)=>{setDetails(false);setAction({kind:'delete',taskId:t.id})}
 const restoreTask=(t:TaskItem)=>{
  setRemoved(current=>{const next={...current};delete next[t.id];return next})
  log(t,'从已删除中恢复任务');setNotice({message:`「${t.title}」已恢复，保留${done.includes(t.id)?'已完成':'进行中'}状态`})
 }
 const applyAction=()=>{
  if(!action||!actionTask||removed[actionTask.id]||actionTask.items.some(c=>c.status!=='completed'))return
  if(action.kind==='complete'){
   setDone(ids=>[...new Set([...ids,actionTask.id])]);log(actionTask,'你确认本次任务目标已达成')
   setNotice({message:`「${actionTask.title}」已移至已完成`})
  }else{
   setRemoved(current=>({...current,[actionTask.id]:{deletedAt:new Date().toISOString()}}))
   log(actionTask,'从我的任务中删除');setNotice({message:`「${actionTask.title}」已从我的任务中删除`,undoId:actionTask.id})
   if(selected===actionTask.id)enter('')
  }
  setAction(null)
 }
 const taskMenu=(t:TaskItem)=><TaskActionsMenu title={t.title} completed={done.includes(t.id)} onChangeStatus={()=>requestStatus(t)} onEdit={()=>requestEdit(t)} onDelete={()=>requestDelete(t)}/>

 const completeCreation=(d:GroupDraft)=>{
  if(!task||nextMissing(d)||submitting.current)return
  submitting.current=true
  try{
   const id=onCreateGroup({title:d.title,goal:d.goal.trim(),members:people.filter(p=>d.memberIds.includes(p.userId)),maxRounds:Number(d.rounds),issue:{id:task.id,title:task.title,goal:task.goal},sourceTask:task.source,stayInTask:true})
   appendTo(task,{role:'assistant',content:`已创建「${d.title}」，邀请${people.filter(p=>d.memberIds.includes(p.userId)).map(p=>p.name).join('、')}，最多沟通 ${d.rounds} 轮。\n\n我已发出首条消息，${d.goal.replace(/[。！!]+$/,'')}。收到反馈后，会汇入这项任务的进展。`,conversationIds:[id]})
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
  if(!task||!input.trim()||completed||busy)return
  const text=input.trim();setInputs(v=>({...v,[task.id]:''}));setError('');appendTo(task,{role:'user',content:text})
  if(/^(任务|这件事|这个任务|本次任务)?(已经|已)?(完成了|完成|结束了)[。！!]?$/u.test(text)){requestStatus(task);return}
  if(isGroupRequest(text)){
   const parsed=parseGroupRequest(text,task,people)
   if(!nextMissing(parsed))completeCreation(parsed)
   else {patchDraft(parsed);setStepOverride(nextMissing(parsed))}
   return
  }
  if(!/(先别|不要|不用|暂不).*(发|回复|通知)/.test(text)&&/告诉|发到|回复.*群|通知|催一下/.test(text)){
   const matched=task.items.filter(c=>c.status!=='completed'&&(text.includes(c.title)||(/测试/.test(text)&&/测试/.test(c.title))||(/评审/.test(text)&&/评审/.test(c.title))))
   if(matched.length===1){appendTo(task,{role:'assistant',content:`我已为「${matched[0].title}」准备好这条跟进内容。进入对应会话后可以核对发送对象与当前轮次。`,conversationIds:[matched[0].id]});openChild(matched[0].id,{draft:text})}
   else setRouteRequest(text)
   return
  }
  setBusy(true);const captured=task;timer.current=setTimeout(()=>{answer(captured,text,files);setBusy(false)},700)
 }
 const upload=async(file:File)=>{
  if(!task||completed)return
  if(!/\.(md|txt|html?)$/i.test(file.name)){setError('当前支持 Markdown、TXT 和 HTML 文件。');return}
  if(file.size>5*1024*1024){setError('请选择不超过 5 MB 的文本文件。');return}
  try{const item:ConversationFile={id:uid(),name:file.name,kind:/\.html?$/i.test(file.name)?'html':'markdown',content:await file.text(),sender:'我',sentAt:`今天 ${clock()}`};setOutputs(o=>({...o,[task.id]:[...o[task.id]??[],item]}));appendTo(task,{role:'user',content:'补充一份任务材料。',fileId:item.id});log(task,'添加了任务材料',{fileId:item.id})}catch{setError('文件读取失败，请重新选择。')}
 }
 const matching=(t:TaskItem,f=filter)=>!removed[t.id]&&(f==='all'||(f==='done'?done.includes(t.id):f==='doing'?!done.includes(t.id):!done.includes(t.id)&&t.items.some(c=>c.status!=='completed'&&c.pendingCurrentUserConfirmation)))
 const fileButton=(f:ConversationFile)=> <button className="tp-file" key={f.id} onClick={()=>preview(f.id)}><span><FileText size={20}/></span><div><strong>{f.name}</strong><small>{f.sender} · {f.sentAt}</small></div><ArrowUpRight size={15}/></button>
 const conversationLink=(c:A2AConversation)=> <button className="tp-related" key={c.id} onClick={()=>openChild(c.id)}><i className="tp-conversation-icon"><MessageSquare size={18}/></i><span><strong>{c.title}</strong><small className="tp-related-people">{c.scope==='direct'?'单聊':'群聊'} · {c.members.map(m=>m.name).join('、')}</small><small className="tp-related-summary">{conversationSummary(c)}</small></span><em className={`tp-state ${a2aBoardState(c)}`}>{statusLabels[a2aBoardState(c)]}</em><ChevronRight size={15}/></button>
 return <div className="tp-root">
 {task&&removed[task.id]?<section className="tp-removed-task"><Trash2 size={34}/><h1>这个任务已从我的任务中删除</h1><p>{task.title}</p><p>任务记录和文件仍保留，恢复后可以继续查看。</p><div><button onClick={()=>enter('')}>返回我的任务</button><button className="tp-primary" onClick={()=>restoreTask(task)}>恢复任务</button></div></section>:!task?<section className="tp-list-page"><header><div><span className="tp-eyebrow">MY TASKS</span><h1>我的任务</h1><p>目标、进展与每一次协作，都留在同一件事里。</p></div><button className="tp-new" onClick={()=>{setName('');setGoal('');setEditId(null);setNewTask(true)}}><Plus size={17}/>新建任务</button></header>
 <nav className="tp-filters" aria-label="任务筛选">{[['all','全部'],['attention','待我处理'],['doing','进行中'],['done','已完成']].map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}<span>{tasks.filter(t=>matching(t,id)).length}</span></button>)}<button className="tp-trash-link" onClick={()=>{setNotice(null);setShowRemoved(true)}}><Trash2 size={14}/>已删除{removedTasks.length>0&&<span>{removedTasks.length}</span>}</button></nav>
 <div className="tp-task-list">{tasks.filter(t=>matching(t)).map(t=><article key={t.id} className={done.includes(t.id)?'is-completed':''}>
 <div className="tp-task-row"><button className="tp-task-check" role="checkbox" aria-checked={done.includes(t.id)} aria-label={`${done.includes(t.id)?'恢复进行中':'标记已完成'}：${t.title}`} title={done.includes(t.id)?'恢复进行中':'标记已完成'} onClick={()=>requestStatus(t)}>{done.includes(t.id)&&<Check size={16}/>}</button>
 <button className="tp-task-entry" onClick={()=>enter(t.id)}><div className="tp-task-copy"><h2>{t.title}</h2><p>{taskSnapshot(t,done.includes(t.id)).summary}</p><span>{t.source&&<><Link2 size={12}/>{t.source.platform}<i>·</i></>}{done.includes(t.id)?'已完成':t.items.some(c=>c.status!=='completed'&&c.pendingCurrentUserConfirmation)?'有沟通需要你处理':'进行中'}</span></div><ChevronRight size={18}/></button>{taskMenu(t)}</div>
 {t.items.length>0&&<div className="tp-task-children"><button className="tp-children-toggle" aria-label={`${expanded.includes(t.id)?'收起':'展开'}${t.title}的 A2A 会话`} aria-expanded={expanded.includes(t.id)} aria-controls={`task-conversations-${t.id}`} onClick={()=>setExpanded(v=>v.includes(t.id)?v.filter(id=>id!==t.id):[...v,t.id])}><MessageSquare size={15}/><strong>A2A 会话</strong><span className="tp-children-count">{t.items.length}</span><small>{expanded.includes(t.id)?'收起':'展开'}</small><ChevronRight size={14} className={expanded.includes(t.id)?'rotated':''}/></button>{expanded.includes(t.id)&&<div className="tp-conversation-list" id={`task-conversations-${t.id}`}>{t.items.map(conversationLink)}</div>}</div>}
 </article>)}</div>
 {!tasks.some(t=>matching(t))&&<div className="tp-empty"><Flag size={28}/><h3>这里还没有任务</h3><p>换个筛选查看，或从一个新的委托开始。</p><button onClick={()=>setFilter('all')}>查看全部任务</button></div>}
 </section>:<section className={`tp-task ${workspace?'with-workspace':''}`}>
 <header className="tp-header">
 <div className="tp-header-top"><button className="tp-back" aria-label="返回我的任务" onClick={()=>enter('')}><ArrowLeft size={19}/></button><div className="tp-title-line"><h1>{task.title}</h1><span className={`tp-header-status ${completed?'done':''}`}><span className={`tp-status-dot ${completed?'done':''}`}/>{completed?'已完成':'进行中'}</span></div><div className="tp-header-actions"><button className="tp-detail-trigger" aria-label="任务详情" onClick={()=>setDetails(true)}><ListTodo size={16}/><span>任务详情</span></button><button className="tp-workspace-trigger" aria-label="打开任务 Workspace" title="Workspace" aria-pressed={workspace} onClick={()=>setWorkspace(v=>!v)}><FileText size={18}/></button></div></div>
 <div className="tp-heading-context"><p title={task.goal}><span>目标</span>{task.goal}</p><p className="tp-heading-progress" title={snapshot?.summary}><span>进展</span>{snapshot?.summary}</p></div>
 </header>
 <div className="tp-body"><main className="tp-main"><div className="tp-thread" ref={scroller} aria-label="任务主会话"><div className="tp-date">任务记录</div>
 {messages.map(m=><article key={m.id} className={`tp-message ${m.role}`}><span className="tp-avatar">{m.role==='assistant'?<Bot size={19}/>:'我'}</span><div><div className="tp-message-author">{m.role==='assistant'?'我的分身':'我'}{m.time&&<time>{m.time}</time>}</div><Markdown content={m.content}/>{m.fileId&&files.find(f=>f.id===m.fileId)&&fileButton(files.find(f=>f.id===m.fileId)!)}{m.conversationIds&&<div className="tp-links">{m.conversationIds.map(id=>{const c=task.items.find(c=>c.id===id);return c?<button key={id} onClick={()=>openChild(id)}>{c.title}<ArrowUpRight size={12}/></button>:null})}</div>}</div></article>)}
 {busy&&<div className="tp-thinking"><Bot size={17}/><span>正在整理当前任务的信息<span>···</span></span></div>}
 </div><div className="tp-compose-wrap">{error&&<p className="tp-error" role="alert">{error}<button aria-label="关闭提示" onClick={()=>setError('')}><X size={13}/></button></p>}
 {completed?<div className="tp-readonly"><Check size={15}/>这项任务已完成。<button onClick={()=>reopenTask(task)}>恢复进行中</button></div>:
 draft&&step?<div className="tp-ask"><AskUserComposer title={step==='goal'?'这次沟通希望解决什么问题？':step==='people'?'这次需要联系谁？':'这次最多沟通几轮？'} description={step==='goal'?'请补充本次沟通目标，已有任务背景会自动带入。':step==='people'?`沟通目标：${draft.goal}`:`${people.filter(p=>draft.memberIds.includes(p.userId)).map(p=>p.name).join('、')} · ${draft.goal}`} onCancel={()=>{patchDraft(undefined);setStepOverride(null);appendTo(task,{role:'assistant',content:'本次沟通尚未创建。你可以继续和我讨论，需要时再联系相关人员。'})}}>
 {step==='goal'?<label className="tp-ask-field">沟通目标<textarea autoFocus aria-label="沟通目标" rows={2} value={draft.goal} onChange={e=>patchDraft({...draft,goal:e.target.value})} placeholder="例如：确认点击、拖动和免打扰的首期交互边界"/></label>:step==='people'?<div className="tp-people"><PeoplePicker options={people.map(m=>({id:m.userId,name:m.name,department:m.department}))} value={draft.memberIds} onChange={ids=>patchDraft({...draft,memberIds:ids})}/></div>:<div className="tp-rounds">{['1','3','5'].map(r=><button key={r} aria-pressed={draft.rounds===r} onClick={()=>patchDraft({...draft,rounds:r})}>{r} 轮{r==='3'&&<small>建议</small>}</button>)}<label>自定义<input aria-label="自定义最大轮次" type="number" min="1" max="50" value={draft.rounds} onChange={e=>patchDraft({...draft,rounds:e.target.value})}/></label><p>达到上限后暂停，由群主决定是否继续。</p></div>}
 </AskUserComposer><footer>{step!=='goal'&&<button onClick={()=>setStepOverride(step==='rounds'?'people':'goal')}>上一步</button>}<small>{step==='people'?'一位联系人为单聊，多位联系人为群聊。':''}</small><button className="tp-primary" disabled={step==='goal'?!draft.goal.trim():step==='people'?!draft.memberIds.length:!Number.isSafeInteger(+draft.rounds)||+draft.rounds<1||+draft.rounds>50} onClick={advance}>{nextMissing(draft)?'继续':'创建并发送'}</button></footer></div>:
 routeRequest?<div className="tp-ask"><AskUserComposer title="这条消息要跟进哪个会话？" description={routeRequest} onCancel={()=>setRouteRequest(null)}>{task.items.filter(c=>c.status!=='completed').map((c,i)=><button key={c.id} onClick={()=>{openChild(c.id,{draft:routeRequest});setRouteRequest(null)}}><i>{i+1}</i><span><strong>{c.title}</strong><small>{c.members.map(m=>m.name).join('、')}</small></span></button>)}{!task.items.some(c=>c.status!=='completed')&&<p>当前没有可继续的会话，请先说明希望联系谁。</p>}</AskUserComposer></div>:
 <><form className="tp-composer" onSubmit={e=>{e.preventDefault();send()}}><textarea ref={composer} aria-label="任务主会话输入" placeholder="继续这项任务，说说你接下来想做什么…" value={input} disabled={busy} onChange={e=>setInputs(v=>({...v,[task.id]:e.target.value}))} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send()}}}/><footer><span>商飞大模型 L1-S1 <ChevronDown size={12}/></span><button type="button" aria-label="添加任务附件" title="添加 Markdown、TXT 或 HTML 材料" onClick={()=>attachmentInput.current?.click()}><Paperclip size={17}/></button><button className="tp-send" aria-label="发送任务消息" disabled={!input.trim()||busy}><Send size={17}/></button></footer></form><input hidden type="file" accept=".md,.txt,.html,.htm" ref={attachmentInput} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);e.target.value=''}}/>
 {pending.length>0&&<p className="tp-attention">{pending.length} 个相关会话需要你处理。<button onClick={()=>openChild(pending[0].id)}>前往{pending[0].title}<ArrowUpRight size={11}/></button></p>}</>}
 </div></main>
 {workspace&&<aside className="tp-workspace" aria-label="任务 Workspace"><header><strong><FileText size={16}/>Workspace</strong><button aria-label="收起任务 Workspace" onClick={()=>setWorkspace(false)}><X size={17}/></button></header><A2AFileWorkspace key={task.id} files={files} request={fileRequest}/></aside>}
 </div></section>}
 {details&&task&&!removed[task.id]&&<Dialog title="任务详情" wide onClose={()=>setDetails(false)}><div className="tp-detail"><div className="tp-detail-heading"><h2>{task.title}</h2>{taskMenu(task)}</div>
 <p className="tp-detail-goal">{task.goal}</p><p className="tp-detail-summary">{snapshot?.summary} {snapshot?.next}</p>
 {task.source&&<div className="tp-detail-source"><Link2 size={13}/><span>{task.source.platform} · {task.source.titleAtReference}</span>{task.source.url&&!task.source.unavailable&&/^https?:\/\//.test(task.source.url)?<a href={task.source.url} target="_blank" rel="noopener noreferrer">查看来源 ↗</a>:<span>来源引用</span>}</div>}
 <section className="tp-detail-files"><header><span className={`tp-status-dot ${completed?'done':''}`}/>{completed?'已完成':'进行中'}<small>{files.length} 份产出物</small></header>{files.length?files.map(fileButton):<p className="tp-empty-inline">还没有产出物，后续整理的文件会保留在这里。</p>}</section>
 <section><h3>相关会话 <small>{task.items.length}</small></h3>{task.items.length?task.items.map(conversationLink):<p className="tp-empty-inline">暂未发起对外沟通。需要他人协助时，直接在主会话中告诉分身。</p>}</section>
 <section className="tp-timeline"><h3>动态</h3>{(events[task.id]??[]).map(e=><button className="tp-event" key={e.id} disabled={!e.fileId&&!e.conversationId} onClick={()=>e.fileId?preview(e.fileId):e.conversationId?openChild(e.conversationId):undefined}><span><Check size={12}/></span><div><small>今天 {e.time}</small><strong>{e.description}</strong></div></button>)}
 {task.items.map(c=><button className="tp-event" key={c.id} onClick={()=>openChild(c.id)}><span>{c.pendingCurrentUserConfirmation?<Circle size={12}/>:<MessageSquare size={12}/>}</span><div><small>{c.updatedAt} · {c.title}</small><strong>{c.pendingCurrentUserConfirmation?'需要你的决定':c.status==='completed'?'本次沟通已结束':'收到沟通反馈'}</strong><p>{conversationSummary(c)}</p></div></button>)}
 <div className="tp-event"><span><Flag size={12}/></span><div><small>任务建立</small><strong>记录目标，开始推进</strong><p>{task.goal}</p></div></div></section></div></Dialog>}
 {(newTask||editingTask)&&<Dialog title={editingTask?'编辑任务':'新建任务'} onClose={()=>{setNewTask(false);setEditId(null)}} footer={<><button onClick={()=>{setNewTask(false);setEditId(null)}}>取消</button><button className="rc-primary" disabled={!name.trim()||!goal.trim()} onClick={()=>{if(editingTask){onRenameIssue(editingTask.id,name.trim());setLocalTasks(ts=>[{id:editingTask.id,title:name.trim(),goal:goal.trim()},...ts.filter(t=>t.id!==editingTask.id)]);log(editingTask,'更新了任务名称与目标');setNotice({message:'任务名称与目标已保存'})}else{const t={id:`task-${uid()}`,title:name.trim(),goal:goal.trim()};setLocalTasks(ts=>[t,...ts]);enter(t.id)}setEditId(null);setNewTask(false)}}>{editingTask?'保存':'开始任务'}</button></>}><label className="rc-field">任务名称<input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="这次想推进什么事情？"/></label><label className="rc-field">目标<textarea rows={3} value={goal} onChange={e=>setGoal(e.target.value)} placeholder="描述希望达成的结果，后续可以继续和分身澄清。"/></label></Dialog>}
 {action&&actionTask&&<Dialog title={action.kind==='complete'?'确认任务完成':'删除任务'} onClose={()=>setAction(null)} footer={<><button onClick={()=>setAction(null)}>取消</button><button className={action.kind==='delete'?'tp-danger-button':'rc-primary'} disabled={unfinished.length>0} onClick={applyAction}>{action.kind==='complete'?'确认完成':'确认删除'}</button></>}>
 <div className="tp-task-action-copy"><h3>{actionTask.title}</h3>{unfinished.length>0?<><p>还有 {unfinished.length} 个 A2A 会话未结束，请先处理后再{action.kind==='complete'?'完成':'删除'}任务。</p><p className="tp-action-note">只有各会话的群主可以结束沟通。点击下方会话前往处理。</p><div className="tp-blocking-conversations">{unfinished.map(c=><button key={c.id} onClick={()=>{setAction(null);openChild(c.id)}}><MessageSquare size={16}/><span>{c.title}</span><ChevronRight size={15}/></button>)}</div></>:action.kind==='complete'?<><p>确认这个任务的目标已经达成？确认后将移至“已完成”，主会话停止接收新消息。</p><p className="tp-action-note">对话和文件会保留，可随时恢复进行中。原系统任务状态不会改变。</p></>:<><p>将从“我的任务”中移除这项任务及其会话入口。你可以通过“已删除”恢复，恢复后保留原来的完成状态、对话和文件。</p><p className="tp-action-note">不会删除 C 大脑等原系统任务，也不会删除其他成员的 A2A 记录。</p></>}</div>
 </Dialog>}
 {showRemoved&&<Dialog title="已删除的任务" wide onClose={()=>setShowRemoved(false)}><div className="tp-trash"><p>恢复后保留删除前的状态、对话和文件。</p>{removedTasks.length?<div className="tp-trash-list">{removedTasks.map(t=><article key={t.id}><span className="tp-trash-icon"><Trash2 size={18}/></span><div><h3>{t.title}</h3><p>删除前：{done.includes(t.id)?'已完成':'进行中'} · {new Date(removed[t.id].deletedAt).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})} 删除</p></div><button aria-label={`恢复任务：${t.title}`} onClick={()=>restoreTask(t)}><RotateCcw size={15}/>恢复</button></article>)}</div>:<div className="tp-trash-empty"><Trash2 size={30}/><h3>没有已删除的任务</h3><p>删除的任务会保留在这里，可以随时恢复。</p></div>}</div></Dialog>}
 {notice&&<div className="tp-toast" role="status"><Check size={17}/><span>{notice.message}</span>{notice.undoId&&removed[notice.undoId]&&<button onClick={()=>{const t=tasks.find(item=>item.id===notice.undoId);if(t)restoreTask(t)}}>撤销</button>}<button aria-label="关闭操作提示" onClick={()=>setNotice(null)}><X size={14}/></button></div>}
 </div>
}
