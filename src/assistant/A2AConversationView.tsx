import { issueOf } from './a2aIssues'
import { useProductState, readProductState } from './localProductStore'
import type { A2AFocus } from './A2AIssueBoard'
import { replyCandidates, resolveMentions, isPublicReply } from './a2aMentions'
import A2AFileWorkspace, { type ConversationFile } from './A2AFileWorkspace'
import { canManageA2A, completionQuestion } from './a2aLifecycle'
import { AskUserComposer } from './AskUserComposer'
import {
  Bot,
  ArrowLeft,
  MessageCircleMore,
  Send,
  FileText,
  MoreHorizontal,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createSeedConversationMessages,
  fileSize,
  type A2AConfirmationChoice,
  type A2AConversation,
  type A2AConversationCommand,
  type A2AConversationMessage,
  type A2AUserConfirmation,
} from './a2aConversationTypes'
import A2ATaskOverview from './A2ATaskOverview'
import { taskProgress } from './a2aTaskProgress'
import './a2a-groups.css'

type ConversationActivityPatch = Partial<Pick<
  A2AConversation,
  'preview' | 'updatedAt' | 'status' | 'repliedCount' | 'round' | 'maxRounds' | 'expectedReplyCount' | 'pendingCurrentUserConfirmation'
>>

type PrivateAssistantMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type A2AConversationViewProps = {
  headless?: boolean
  onTaskFeedback?: (id: string, content: string) => void
  onRecordsChange?: (records: Record<string, A2AConversationMessage[]>) => void
  focusRequest?: A2AFocus
  conversations: A2AConversation[]
  onComplete: (id: string) => void
  onBack: () => void
  selectedConversationId: string | null
  commands: A2AConversationCommand[]
  onCommandHandled: (commandId: string) => void
  onConversationActivity: (conversationId: string, patch: ConversationActivityPatch) => void
  onSubmitCommand: (conversationId: string, action: A2AConversationCommand['action'], content: string) => void
}

function speakerReply(conversation: A2AConversation, memberId: string) {
  const member = conversation.members.find(item => item.userId === memberId)
  const topic = `${conversation.title} ${conversation.goal ?? ''}`
  if (/宠物/.test(topic)) {
    if (/测试/.test(member?.department ?? '')) return conversation.round === 1
      ? '测试建议先明确拖动边界、点击唤起、免打扰和多任务状态优先级。收到待测包、安装入口与变更清单后，才能核实覆盖范围和测试安排；目前不能承诺完成时间。'
      : '补充测试关注点：全屏应用下是否隐藏、跨屏拖动后的位置记忆，以及等待确认时的提示是否会打扰用户。以上规则明确后才能形成可执行的验收用例。'
    return conversation.round === 1
      ? '客户端建议首期保留桌面展示、拖动和点击唤起，状态反馈先做无声切换。窗口置顶、免打扰和多个任务同时运行时的优先级，需要产品先明确，暂不承诺开发排期。'
      : '研发侧建议把状态优先级明确为待确认、执行中、空闲，并允许用户隐藏形象。这是待评审建议，确认后再据此评估实现范围。'
  }
  if (/采购|合同|订阅/.test(topic)) return /法务/.test(member?.department ?? '')
    ? '合同核对需要供应商提供完整条款，尤其是数据删除时限、删除证明和续费通知方式。缺少这些信息时，不能给出审核通过结论。'
    : '请补充使用场景、账号数量、年度报价和预算负责人。资料齐备后再确认采购审批路径，本次沟通不代表已发起采购。'
  return `已收到“${conversation.goal ?? conversation.title}”这项沟通。需要先明确现有材料与希望我回答的问题；当前还没有可核实的业务结论，也未形成时间承诺。`
}

function initialPrivateMessages(conversation: A2AConversation): PrivateAssistantMessage[] {
  if (conversation.demo?.privateMessages?.length || conversation.demo?.readOnly) return (conversation.demo.privateMessages ?? [{ role: 'assistant' as const, content: '你可以在这里与我私下讨论当前任务。我会帮助你梳理协作进展，不会在群聊中代你发言。' }]).map((message, index) => ({ ...message, id: `private-demo-${conversation.id}-${index}` }));
  const perspectiveCopy = conversation.perspective === 'recipient'
    ? `你是接收方。${conversation.hostName}的分身已经将事项送达；请先判断是否需要回复、确认或转为自己的待办。`
    : '你是发起方。这里说的话只有你和自己的分身可见。'
  const pendingCopy = conversation.pendingCurrentUserConfirmation
    ? '当前会话正在等待你的确认。完成下方选择后，我才会继续代表你处理这个会话。'
    : `这里是“${conversation.title}”的私人分身对话。${perspectiveCopy}`

  return [{
    id: `private-assistant-initial-${conversation.id}`,
    role: 'assistant',
    content: conversation.pendingCurrentUserConfirmation ? pendingCopy : `本次目标：${conversation.goal || createSeedConversationMessages(conversation).find(message => message.origin === 'initiator_twin')?.content || conversation.title}。\n当前情况：${conversation.preview}。\n你可以告诉我需要补充什么，或让我向参与人继续询问；这里的讨论仅你我可见。`,
  }]
}

function createRoundCompletionConfirmation(conversation: A2AConversation): A2AUserConfirmation {
  return {
    id: `a2a-confirm-round-${conversation.id}-${Date.now()}`,
    question: `“${conversation.title}”本轮回复已经收齐，接下来怎么处理？`,
    description: conversation.demo?.completionSummary || '本轮沟通已结束，请决定是否继续；回复收齐不表示业务事项已完成。',
    resumeStatus: 'response_received',
    resumePreview: `本轮已收到全部回复 · ${conversation.members.length}/${conversation.members.length}`,
    choices: [
      {
        id: 'continue-round',
        label: '继续下一轮',
        description: '围绕本次沟通目标继续核实未明确的问题。',
        commandAction: 'send',
        commandContent: `下一轮，请围绕“${conversation.goal ?? conversation.title}”，继续补充尚未明确的问题与所需材料。`,
      },
      {
        id: 'complete-goal',
        label: '确认完成',
        description: '结束当前目标协作，不再自动发起下一轮。',
        commandAction: 'complete',
        commandContent: conversation.demo?.completionSummary || `确认“${conversation.title}”当前目标已经完成。`,
      },
    ],
  }
}

export default function A2AConversationView({
  headless, onTaskFeedback,
  conversations,
  onRecordsChange,
  focusRequest,
  selectedConversationId,
  onComplete,
  onBack,
  commands,
  onCommandHandled,
  onConversationActivity,
  onSubmitCommand,
}: A2AConversationViewProps) {
  const threadRef = useRef<HTMLElement>(null)
  const privateThreadRef = useRef<HTMLElement>(null)
  const privateComposerRef = useRef<HTMLTextAreaElement>(null)
  const timersRef = useRef<number[]>([])
  const processedCommandIdsRef = useRef(new Set<string>())
  const [messagesByConversation, setMessagesByConversation] = useProductState<Record<string, A2AConversationMessage[]>>('records',() => (
    Object.fromEntries(conversations.map((conversation) => [conversation.id, createSeedConversationMessages(conversation)]))
  ))
  const [privateMessagesByConversation, setPrivateMessagesByConversation] = useProductState<Record<string, PrivateAssistantMessage[]>>('private-history',() => (
    Object.fromEntries(conversations.map((conversation) => [conversation.id, initialPrivateMessages(conversation)]))
  ))
  const [runningSpeakerByConversation, setRunningSpeakerByConversation] = useState<Record<string, string | null>>({})
  const [privateDrafts, setPrivateDrafts] = useProductState<Record<string,string>>('private-drafts', {})
  const privateDraft = selectedConversationId ? privateDrafts[selectedConversationId] ?? '' : ''
  const setPrivateDraft = (value:string) => { if(selectedConversationId) setPrivateDrafts(current=>({...current,[selectedConversationId]:value})) }
  const [mentionAt, setMentionAt] = useState<number | null>(null)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)
  const replyingConversations = useRef(new Set<string>())
  const runVersions = useRef<Record<string, number>>({})
  const latestConversations = useRef(conversations)
  latestConversations.current = conversations
  const [menuOpen, setMenuOpen] = useState(false)
  const [fileRequests, setFileRequests] = useState<Record<string, {id: string; serial: number}>>({})
  const [rightWidth, setRightWidth] = useState<number | null>(null)
  const layoutRef = useRef<HTMLDivElement>(null)
  const [rightView, setRightView] = useState<'records' | 'workspace'>('records')

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  )
  const messages = selectedConversation ? messagesByConversation[selectedConversation.id] ?? [] : []
  const privateMessages = selectedConversation ? privateMessagesByConversation[selectedConversation.id] ?? [] : []
  const runningSpeaker = selectedConversation ? runningSpeakerByConversation[selectedConversation.id] ?? null : null
  const pendingConfirmation = selectedConversation?.status === 'completed' ? undefined : selectedConversation?.pendingCurrentUserConfirmation

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
  }, [])

  useEffect(() => {
    setMessagesByConversation((current) => {
      const missing = conversations.filter((conversation) => !current[conversation.id])
      if (missing.length === 0) return current
      return {
        ...current,
        ...Object.fromEntries(missing.map((conversation) => [conversation.id, createSeedConversationMessages(conversation)])),
      }
    })
    setPrivateMessagesByConversation((current) => {
      const missing = conversations.filter((conversation) => !current[conversation.id])
      if (missing.length === 0) return current
      return {
        ...current,
        ...Object.fromEntries(missing.map((conversation) => [conversation.id, initialPrivateMessages(conversation)])),
      }
    })
  }, [conversations, setMessagesByConversation, setPrivateMessagesByConversation])

  useEffect(() => {
    setMentionAt(null)
    setRightView('records')
    setMenuOpen(false)
  }, [selectedConversationId])

  useEffect(() => {
    const thread = threadRef.current
    if (!thread) return
    if (focusRequest?.conversationId === selectedConversationId && focusRequest.messageId) return
    thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' })
  }, [focusRequest, messages.length, runningSpeaker, selectedConversationId])

  useEffect(() => {
    const thread = privateThreadRef.current
    if (!thread) return
    thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' })
  }, [pendingConfirmation?.id, privateMessages.length, selectedConversationId])

  useEffect(() => { onRecordsChange?.(messagesByConversation) }, [messagesByConversation, onRecordsChange])
  useEffect(() => {
    if (!focusRequest || focusRequest.conversationId !== selectedConversationId) return
    if (focusRequest.draft) {
      setPrivateDrafts(current=>({...current,[focusRequest.conversationId]:focusRequest.draft!}))
      requestAnimationFrame(()=>privateComposerRef.current?.focus())
    } else if (focusRequest.fileId) {
      setRightWidth(current => current ?? 560)
      setRightView('workspace')
      setFileRequests(current => ({ ...current, [focusRequest.conversationId]: { id: focusRequest.fileId!, serial: focusRequest.serial } }))
    } else if (focusRequest.messageId) {
      setRightView('records')
      const frame = requestAnimationFrame(() => document.getElementById(`record-${focusRequest.messageId}`)?.scrollIntoView({ block: 'center' }))
      return () => cancelAnimationFrame(frame)
    }
  }, [focusRequest, selectedConversationId, setPrivateDrafts])

  const appendMessage = (conversationId: string, message: A2AConversationMessage) => {
    setMessagesByConversation((current) => ({
      ...current,
      [conversationId]: [...(current[conversationId] ?? []), message],
    }))
  }

  const feedbackRef = useRef(onTaskFeedback)
  feedbackRef.current = onTaskFeedback
  const appendPrivateMessage = (conversationId: string, message: Omit<PrivateAssistantMessage, 'id'>) => {
    if (message.role === 'assistant') feedbackRef.current?.(conversationId, message.content)
    setPrivateMessagesByConversation((current) => ({
      ...current,
      [conversationId]: [...(current[conversationId] ?? []), {
        ...message,
        id: `private-message-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      }],
    }))
  }

  const runSpeaker = (conversation: A2AConversation, roundId: string, speakerIndex: number, runVersion = runVersions.current[conversation.id] ?? 0) => {
    if (latestConversations.current.find(item => item.id === conversation.id)?.status === 'completed' || runVersion !== (runVersions.current[conversation.id] ?? 0)) return
    const memberId = conversation.speakingOrder[speakerIndex]
    if (!memberId) {
      setRunningSpeakerByConversation((current) => ({ ...current, [conversation.id]: null }))
      replyingConversations.current.delete(conversation.id)
      const confirmation = createRoundCompletionConfirmation(conversation)
      const originalMembers = latestConversations.current.find(item => item.id === conversation.id)?.members ?? []
      const fullRound = originalMembers.length === conversation.speakingOrder.length
      const scriptedSummary = fullRound ? conversation.demo?.roundSummaries?.[String(conversation.round)] : undefined
      const received = conversation.members.flatMap(member => {
        const reply = conversation.demo?.roundReplies?.[String(conversation.round)]?.[member.userId] ?? conversation.demo?.replies[member.userId] ?? (!conversation.demo ? speakerReply(conversation,member.userId) : undefined)
        return reply ? [`${member.name}：${reply}`] : []
      })
      const privateReport = scriptedSummary ? `这轮沟通的要点是：${scriptedSummary}` : received.length ? `收到本轮指定成员的意见：\n${received.join('\n\n')}` : '本轮指定成员的回复已收齐。'
      if (conversation.maxRounds && conversation.round >= conversation.maxRounds) {
        onConversationActivity(conversation.id, {status:'response_received',repliedCount:conversation.speakingOrder.length,preview:`已达到 ${conversation.maxRounds} 轮上限，等待群主指示`,pendingCurrentUserConfirmation:undefined})
        appendPrivateMessage(conversation.id,{role:'assistant',content:`${privateReport}\n\n本轮沟通已达到预设的 ${conversation.maxRounds} 轮，你可以决定是否继续核对尚未明确的部分。业务事项仍在推进中。`})
        return
      }
      onConversationActivity(conversation.id, {
        status: 'waiting_user_confirmation',
        repliedCount: conversation.speakingOrder.length,
        updatedAt: '刚刚',
        preview: '等待你确认下一步',
        pendingCurrentUserConfirmation: confirmation,
      })
      appendPrivateMessage(conversation.id, {
        role: 'assistant',
        content: `${privateReport}\n\n你可以继续下一轮补问，或在本次沟通目标已满足时确认完成。下方选择只决定后续通信，不会操作业务系统。`,
      })
      return
    }

    const member = conversation.members.find((candidate) => candidate.userId === memberId)
    if (!member) {
      runSpeaker(conversation, roundId, speakerIndex + 1, runVersion)
      return
    }

    setRunningSpeakerByConversation((current) => ({ ...current, [conversation.id]: member.name }))
    onConversationActivity(conversation.id, {
      status: 'waiting_replies',
      repliedCount: speakerIndex,
      updatedAt: '刚刚',
      preview: `${member.name}的分身正在回复…`,
    })
    const timer = window.setTimeout(() => {
      if (latestConversations.current.find(item => item.id === conversation.id)?.status === 'completed' || runVersion !== (runVersions.current[conversation.id] ?? 0)) {
        setRunningSpeakerByConversation(current => ({ ...current, [conversation.id]: null }))
        return
      }
      appendMessage(conversation.id, {
        id: `a2a-message-${Date.now()}-${member.userId}`,
        conversationId: conversation.id,
        roundId,
        actorUserId: member.userId,
        actorName: member.name,
        origin: 'participant_twin',
        content: conversation.demo?.roundReplies?.[String(conversation.round)]?.[member.userId] ?? conversation.demo?.replies[member.userId] ?? (conversation.demo?.roundReplies ? '已收到。本次演示尚无更多已核实信息，不新增业务结论或交付承诺。' : speakerReply(conversation, member.userId)),
        sequence: Date.now(),
        createdAt: '刚刚',
      })
      runSpeaker(conversation, roundId, speakerIndex + 1, runVersion)
    }, 1050)
    timersRef.current.push(timer)
  }

  const restoredOnce = useRef(false)
  const resumeSpeaker = useRef(runSpeaker)
  resumeSpeaker.current = runSpeaker
  useEffect(() => {
    if (restoredOnce.current) return
    let active = true
    queueMicrotask(() => {
    if (!active || restoredOnce.current) return
    restoredOnce.current = true
    const saved = readProductState<Record<string,A2AConversationMessage[]>>('records',{})
    conversations.forEach(c => {
      if(c.status !== 'waiting_replies' || !saved[c.id]?.length || c.perspective === 'recipient' || commands.some(cmd=>cmd.conversationId===c.id)) return
      const lastRound=saved[c.id].at(-1)?.roundId
      if(!lastRound)return
      const replies=saved[c.id].filter(m=>m.roundId===lastRound&&m.origin==='participant_twin').length
      if(replies>=c.expectedReplyCount)return
      replyingConversations.current.add(c.id)
      resumeSpeaker.current(c,lastRound,replies)
    })
    })
    return () => { active = false }
  }, [conversations, commands])

  useEffect(() => {
    commands.forEach((command) => {
      if (processedCommandIdsRef.current.has(command.id)) return
      const conversation = conversations.find((candidate) => candidate.id === command.conversationId)
      if (!conversation) return
      processedCommandIdsRef.current.add(command.id)
      if (conversation.status === 'completed') { onCommandHandled(command.id); appendPrivateMessage(conversation.id, {role: 'assistant', content: '该会话已完成，本次消息未发送。'}); return }
      if (command.action === 'complete') {
        onCommandHandled(command.id)
        if (!canManageA2A(conversation)) { appendPrivateMessage(conversation.id, {role:'assistant', content:'只有群主可以确认完成本次沟通。'}); return }
        onComplete(conversation.id)
        appendPrivateMessage(conversation.id, {role:'assistant', content:`「${conversation.title}」已结束，记录与材料会保留在当前任务中。任务是否完成仍由你决定。`})
        setRunningSpeakerByConversation(current => ({...current, [conversation.id]:null}))
        return
      }
      const candidates = replyCandidates(conversation)
      const routing = resolveMentions(command.content, candidates)
      if (routing.error) { onCommandHandled(command.id); appendPrivateMessage(conversation.id, {role:'assistant', content:routing.error}); return }
      const recipientIds = command.replyToUserIds ?? routing.ids
      const recipients = candidates.filter(member => recipientIds.includes(member.userId))
      if (replyingConversations.current.has(conversation.id)) {
        onCommandHandled(command.id); appendPrivateMessage(conversation.id, {role:'assistant', content:'本轮仍在等待回复，请等待本轮结束后由群主继续下一轮。'}); return
      }
      if (conversation.perspective === 'recipient' && (/下一轮|继续.*轮|再.*轮/.test(command.content) || conversation.status === 'response_received')) {
        onCommandHandled(command.id); appendPrivateMessage(conversation.id, {role:'assistant', content:'你是本次协作的成员，本轮回复后请等待发起人继续，不能自行开启下一轮。'}); return
      }
      if (conversation.perspective !== 'recipient' && conversation.repliedCount > 0 && (!canManageA2A(conversation) || !/下一轮|继续.*轮|再.*轮/.test(command.content))) {
        onCommandHandled(command.id)
        appendPrivateMessage(conversation.id, {role:'assistant', content:'本轮已有正式回复。请群主明确说“下一轮”并指定要讨论的内容；@ 不会重置发言次数。'})
        return
      }
      const isRecipientReply = conversation.perspective === 'recipient'
      const startsNextRound = !isRecipientReply && conversation.repliedCount > 0
      const currentRoundId = messagesByConversation[conversation.id]?.at(-1)?.roundId
      const roundId = !startsNextRound && currentRoundId ? currentRoundId : `a2a-round-${Date.now()}`
      appendMessage(conversation.id, {
        id: `a2a-message-host-${Date.now()}`,
        conversationId: conversation.id,
        roundId,
        actorUserId: isRecipientReply ? 'current-user' : conversation.hostUserId,
        actorName: isRecipientReply ? (conversation.members.find(member => member.userId === 'current-user')?.name ?? '我') : conversation.hostName,
        origin: isRecipientReply ? 'participant_twin' : 'initiator_twin',
        content: command.content,
        sequence: Date.now(),
        createdAt: command.createdAt,
      })
      onCommandHandled(command.id)
      if (!isRecipientReply) appendPrivateMessage(conversation.id, {role:'assistant', content:`已发送到「${conversation.title}」。${recipients.length ? `等待${recipients.map(m => m.name).join('、')}回复。` : ''}`})
      if (isRecipientReply) {
        onConversationActivity(conversation.id, {status:'response_received', repliedCount: Math.min(conversation.expectedReplyCount, conversation.repliedCount + 1), pendingCurrentUserConfirmation:undefined, updatedAt:'刚刚', preview:'已按本人意见回复，等待发起人安排后续沟通。'})
        appendPrivateMessage(conversation.id, {role:'assistant', content:'已按你的意见发送到协作记录。本轮不再重复发言，等待发起人继续；没有操作业务系统。'})
        return
      }
      if (recipients.length > 0) {
        const nextRound = conversation.round + (conversation.repliedCount > 0 ? 1 : 0)
        const limit = conversation.maxRounds
        // Only an explicit host continuation can extend a reached limit.
        const continuedLimit = limit && nextRound > limit && canManageA2A(conversation) && /下一轮|继续.*轮|再.*轮/.test(command.content) ? nextRound : limit
        onConversationActivity(conversation.id, {
          status: 'waiting_replies',
          repliedCount: 0,
          expectedReplyCount: recipients.length,
          round: nextRound,
          maxRounds: continuedLimit,
          updatedAt: '刚刚',
          preview: `等待回复 · 0/${recipients.length}`,
          pendingCurrentUserConfirmation: undefined,
        })
        replyingConversations.current.add(conversation.id)
        runSpeaker({ ...conversation, maxRounds: continuedLimit, members: recipients, speakingOrder: recipients.map(member => member.userId), expectedReplyCount: recipients.length, round: nextRound }, roundId, 0)
      } else {
        onConversationActivity(conversation.id, {
          status: isRecipientReply ? 'response_received' : 'delivered',
          updatedAt: '刚刚',
          preview: isRecipientReply ? '已代表你回复发起方' : command.content,
          pendingCurrentUserConfirmation: undefined,
        })
      }
    })
  })

  const submitPrivatePrompt = () => {
    if (!selectedConversation || selectedConversation.status === 'completed' || pendingConfirmation) return
    const value = privateDraft.trim()
    if (!value) return
    setPrivateDraft('')
    setMentionAt(null)
    appendPrivateMessage(selectedConversation.id, { role: 'user', content: value })
    if (/^(?:本次|这个|这次|任务|会话|沟通|协作|已经|已|都|可以|就|\s)*(?:完成了|完成|结束了|结束)(?:吧|了|。|！|!|\s)*$/.test(value)) {
      if (!canManageA2A(selectedConversation)) {
        appendPrivateMessage(selectedConversation.id, {role:'assistant', content:'只有群主可以确认完成本次沟通。'})
      } else {
        onConversationActivity(selectedConversation.id, { pendingCurrentUserConfirmation: completionQuestion(selectedConversation) })
      }
      return
    }
    if (!isPublicReply(value)) {
      appendPrivateMessage(selectedConversation.id, { role:'assistant', content: `这次沟通的目标是：${selectedConversation.goal ?? selectedConversation.title}。\n\n${selectedConversation.demo?.roundSummaries?.[String(selectedConversation.round)] ?? selectedConversation.preview}\n\n${selectedConversation.id.includes('pet-test') ? '目前要先补齐待测包、安装入口和变更清单。16:00是反馈材料情况的时间，不是测试完成承诺。' : '可以继续核实尚未明确的内容。需要我代为发送时，告诉我具体回复内容；也可以 @ 指定本轮回复的人。'}` })
      return
    }
    const routing = resolveMentions(value, replyCandidates(selectedConversation))
    if (routing.error) { setPrivateDraft(value); appendPrivateMessage(selectedConversation.id, {role:'assistant', content:routing.error}); return }
    if (replyingConversations.current.has(selectedConversation.id)) {
      setPrivateDraft(value); appendPrivateMessage(selectedConversation.id, {role:'assistant', content:'本轮仍在等待回复，请先等待本轮结束。'}); return
    }
    onSubmitCommand(selectedConversation.id, 'send', value)

  }

  const resolveConfirmation = (choice: A2AConfirmationChoice) => {
    if (!selectedConversation || selectedConversation.status === 'completed' || !pendingConfirmation) return
    appendPrivateMessage(selectedConversation.id, { role: 'user', content: `已选择：${choice.label}` })
    onConversationActivity(selectedConversation.id, {
      status: pendingConfirmation.resumeStatus,
      preview: pendingConfirmation.resumePreview,
      updatedAt: '刚刚',
      pendingCurrentUserConfirmation: undefined,
    })
    if (choice.commandAction && choice.commandContent) {
      appendPrivateMessage(selectedConversation.id, {
        role: 'assistant',
        content: choice.commandAction === 'complete'
          ? '收到。我会以你的分身身份确认完成当前协作。'
          : '收到。我会按你确认的内容发送到协作记录。',
      })
      onSubmitCommand(selectedConversation.id, choice.commandAction, choice.commandContent)
    } else {
      appendPrivateMessage(selectedConversation.id, {
        role: 'assistant',
        content: '好的，当前内容没有发送。你可以在下面继续补充或修改。',
      })
      window.setTimeout(() => privateComposerRef.current?.focus(), 40)
    }
  }

  if (headless) return null

  if (!selectedConversation) {
    return (
      <section className="a2a-group-workspace a2a-group-workspace--empty">
        <MessageCircleMore size={34} />
        <h2>选择一个协同会话</h2>
        <p>选择后可与自己的分身推进任务，并查看任务概况、协作记录与文件。</p>
      </section>
    )
  }

  const mentionOptions = [{userId:'all',name:'所有人',department:'本会话其他参与人'}, ...replyCandidates(selectedConversation)]
    .filter(member => member.name.includes(mentionQuery) || member.department.includes(mentionQuery))
  const chooseMention = (name: string) => {
    const start = mentionAt ?? privateDraft.length
    const cursor = privateComposerRef.current?.selectionStart ?? privateDraft.length
    const next = `${privateDraft.slice(0,start)}@${name} ${privateDraft.slice(cursor)}`
    setPrivateDraft(next); setMentionAt(null)
    requestAnimationFrame(() => { privateComposerRef.current?.focus(); privateComposerRef.current?.setSelectionRange(start+name.length+2,start+name.length+2) })
  }
  const isRecipientPerspective = selectedConversation.perspective === 'recipient'
  const progress = taskProgress(selectedConversation, messages)

  return (
    <div className="a2a-conversation-layout a2a-task-layout" ref={layoutRef}>
        <header className="a2a-group-header">
          <div className="a2a-heading-start">
            <button className="a2a-back-button" type="button" aria-label="返回" title="返回所属任务" onClick={onBack}><ArrowLeft size={20} /></button>
            <div className="a2a-heading-copy">
            <button className="a2a-parent-task-link" onClick={onBack}>我的任务 / {issueOf(selectedConversation).title}</button>
            <h2>{selectedConversation.title}</h2>

            {progress.status && <div className="a2a-conversation-badges">
              <span>{progress.status}</span>
            </div>}
            </div>
          </div>
          <div className="a2a-group-header-members" title={selectedConversation.members.map((member) => member.name).join('、')}>
            <details className="a2a-member-details" key={selectedConversation.id}>
              <summary>参与人 {new Set([selectedConversation.hostUserId, ...selectedConversation.members.map(m => m.userId)]).size} 人</summary>
              <div className="a2a-member-popover">
                {[...new Map([{userId:selectedConversation.hostUserId, name:selectedConversation.hostName}, ...selectedConversation.members].map(m => [m.userId,m])).values()].map(m => <p key={m.userId}><strong>{m.name}</strong><span>{m.userId === selectedConversation.hostUserId ? '发起人' : '成员'}{m.userId === 'current-user' ? ' · 我' : ''}</span></p>)}
                <footer>第 {selectedConversation.round} 轮{selectedConversation.maxRounds ? ` / 最多 ${selectedConversation.maxRounds} 轮` : ''}<br/>创建于 {selectedConversation.createdAt}</footer>
              </div>
            </details>
            {canManageA2A(selectedConversation) && selectedConversation.status !== 'completed' && <div className="a2a-host-menu">
              <button type="button" aria-label="会话管理" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><MoreHorizontal size={20}/></button>
              {menuOpen && <div role="menu"><button role="menuitem" type="button" onClick={() => {
                onConversationActivity(selectedConversation.id, {pendingCurrentUserConfirmation: completionQuestion(selectedConversation)})
                setMenuOpen(false)
              }}>标记完成</button></div>}
            </div>}
          </div>
        </header>
        <A2ATaskOverview conversation={selectedConversation} messages={messages} />
        <div className="a2a-task-body">
        <section className="a2a-group-workspace">
        <div className="a2a-private-label">我的分身 · 私人对话</div>

        <section className="a2a-private-thread" ref={privateThreadRef}>
          {privateMessages.map((message) => (
            <article className={`a2a-private-message is-${message.role}`} key={message.id}>
              {message.role === 'assistant' && <span><Bot size={14} /></span>}
              <div><p>{message.content}</p></div>
            </article>
          ))}

          {pendingConfirmation && <p className="ask-user-waiting">正在等待你的回答</p>}
        </section>

        <section className={`a2a-private-composer ${pendingConfirmation ? 'has-ask-user' : ''}`}>
          {selectedConversation.status === 'completed' ? <p className="a2a-archive-readonly">本次 A2A 沟通已完成，所有成员均只能查看历史消息和附件，不能继续聊天。</p> : pendingConfirmation ? <AskUserComposer title={pendingConfirmation.question} description={pendingConfirmation.description}
            onCancel={() => resolveConfirmation({ id: 'cancel-ask', label: '取消本次操作', description: '不执行本次动作' })}>
            {pendingConfirmation.choices.map((choice, index) => <button type="button" key={choice.id} onClick={() => resolveConfirmation(choice)}>
              <i>{index + 1}</i><span><strong>{choice.label}</strong><small>{choice.description}</small></span>
            </button>)}
          </AskUserComposer> : <>

          {mentionAt !== null && <div className="a2a-mention-picker" role="listbox" aria-label="选择回复对象">
            {mentionOptions.map((member,index) => <button key={member.userId} type="button" role="option" aria-selected={index === mentionIndex} onMouseDown={event => event.preventDefault()} onClick={() => chooseMention(member.name)}>
              <strong>{member.name}</strong><small>{member.department}</small>
            </button>)}
            {!mentionOptions.length && <p>没有匹配的会话成员</p>}
          </div>}
          <textarea
            ref={privateComposerRef}
            value={privateDraft}
            disabled={Boolean(pendingConfirmation)}
            onChange={event => {
              setPrivateDraft(event.target.value)
              const before=event.target.value.slice(0,event.target.selectionStart)
              const match=before.match(/@([^\s@]*)$/)
              setMentionAt(match ? before.length-match[0].length : null)
              setMentionQuery(match?.[1] ?? ''); setMentionIndex(0)
            }}
            onKeyDown={(event) => {
              if (mentionAt !== null) {
                if (event.key === 'Escape') {event.preventDefault(); setMentionAt(null); return}
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {event.preventDefault(); setMentionIndex(index => Math.max(0,Math.min(mentionOptions.length-1,index+(event.key==='ArrowDown'?1:-1)))); return}
                if (event.key === 'Enter') {event.preventDefault(); if(mentionOptions[mentionIndex]) chooseMention(mentionOptions[mentionIndex].name); return}
              }
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                submitPrivatePrompt()
              }
            }}
            placeholder={pendingConfirmation ? '请先完成上方确认' : selectedConversation.demo?.readOnly ? '与我的分身私下讨论当前任务…' : '私下告诉我的分身要在当前会话中如何处理…'}
            aria-label="私下告诉我的分身"
          />
          <div>
            <span>{pendingConfirmation ? '会话正在等待本人确认' : '发到会话时，未指定 @ 则所有参与人回复'}</span>
            <button
              className={privateDraft.trim() && !pendingConfirmation ? 'is-ready' : ''}
              type="button"
              disabled={Boolean(pendingConfirmation) || !privateDraft.trim()}
              onClick={submitPrivatePrompt}
              aria-label="发送给我的分身"
            >
              <Send size={17} />
            </button>
          </div>
          </>}
        </section>

      </section>

      <aside className="a2a-private-assistant" aria-label="当前会话右侧工作区" style={rightWidth ? {width: rightWidth, maxWidth:'70%'} : undefined}>
        <button className="a2a-right-resize" type="button" aria-label="调整右侧工作区宽度"
          onPointerDown={event => {event.currentTarget.setPointerCapture(event.pointerId)}}
          onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId) && layoutRef.current) { const rect=layoutRef.current.getBoundingClientRect(); setRightWidth(Math.max(300, Math.min(rect.width * .7, rect.right-event.clientX))) } }}
          onPointerUp={event => {if(event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)}}
          onKeyDown={event => {if(event.key === 'ArrowLeft' || event.key === 'ArrowRight') {event.preventDefault(); const max=(layoutRef.current?.clientWidth ?? 900)*.7; setRightWidth(current => Math.max(300,Math.min(max,(current ?? 400)+(event.key==='ArrowLeft'?40:-40))))}}}/>

        <header>
          <div className="a2a-right-view-tabs" role="tablist" aria-label="A2A 右侧工作区">
            <button className={rightView === 'records' ? 'active' : ''} type="button" onClick={() => setRightView('records')} role="tab" aria-selected={rightView === 'records'}><MessageCircleMore size={16} />协作记录</button>
            <button className={rightView === 'workspace' ? 'active' : ''} type="button" onClick={() => { setRightWidth(current => current ?? 560); setRightView('workspace') }} role="tab" aria-selected={rightView === 'workspace'}><FileText size={16} />Workspace</button>
          </div>
        </header>

        <section className="a2a-group-thread a2a-conversation-thread" ref={threadRef} aria-label={`${selectedConversation.title}协作记录`} style={{display: rightView === 'records' ? undefined : 'none'}}>
          {messages.length === 0 && (
            <div className="a2a-group-empty-thread">
              <Bot size={24} />
              <strong>正在同步协作记录</strong>
              <span>首条消息正在准备展示，无需再次确认发起</span>
            </div>
          )}

          {messages.map((message) => {
            const isMyMessage = isRecipientPerspective ? message.actorUserId === 'current-user' : message.origin === 'initiator_twin'
            const actorColor = selectedConversation.members.find((member) => member.userId === message.actorUserId)?.color ?? 'blue'
            return <div id={`record-${message.id}`} className={`a2a-record-entry ${focusRequest?.messageId === message.id ? 'issue-record-highlight' : ''}`} key={message.id}>
              {message.roundId && messages.findIndex(item => item.roundId === message.roundId) === messages.indexOf(message) && <div className="a2a-round-divider">第 {[...new Set(messages.slice(0, messages.indexOf(message) + 1).map(item => item.roundId).filter(Boolean))].length} 轮</div>}
              <article className={`a2a-group-message ${isMyMessage ? 'is-host' : ''}`} key={message.id}>
              {!isMyMessage && (
                <span className={`a2a-person-avatar a2a-person-avatar--${actorColor}`}>
                  {message.actorName.slice(0, 1)}
                </span>
              )}
              <div>
                <strong>
                  {message.actorName}
                  <em>{isMyMessage ? '我的分身' : message.origin === 'initiator_twin' ? '发起方分身' : '分身回复'}</em><time>{message.createdAt}</time>
                </strong>
                <p>{message.content}</p>
                {message.attachments?.map(file => <button type="button" className="a2a-message-file" key={file.id} onClick={() => {
                  setFileRequests(current => ({...current, [selectedConversation.id]: {id: file.id, serial: Date.now()}}))
                  setRightWidth(current => current ?? 560)
                  setRightView('workspace')
                }}><FileText size={19}/><span><strong>{file.name}</strong><small>{file.kind === 'html' ? 'HTML' : 'Markdown'} · {fileSize(file.content)}</small></span></button>)}
              </div>
            </article></div>
          })}

          {runningSpeaker && selectedConversation.status !== 'completed' && (
            <div className="a2a-group-running"><i /><span>{runningSpeaker}的分身正在阅读本轮前序回答并组织回复…</span></div>
          )}

        </section>
        {conversations.map(conversation => {
          const records = conversation.demo?.readOnly ? conversation.demo.messages : messagesByConversation[conversation.id] ?? []
          const files = [...new Map(records.flatMap(message => (message.attachments ?? []).map(file => [file.id, {...file, sender:message.actorName, sentAt:message.createdAt}] as [string, ConversationFile]))).values()]
          return <div className="a2a-conversation-files-panel" key={conversation.id} style={{display: rightView === 'workspace' && conversation.id === selectedConversation.id ? 'flex' : 'none'}}>
            <A2AFileWorkspace files={files} request={fileRequests[conversation.id]}/>
          </div>
        })}
      </aside>
      </div>
    </div>
  )
}

export type { ConversationActivityPatch }
