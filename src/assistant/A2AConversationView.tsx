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
  mechanismLabels,
  scopeLabels,
  type A2AConfirmationChoice,
  type A2AConversation,
  type A2AConversationCommand,
  type A2AConversationMessage,
  type A2AConversationStatus,
  type A2AUserConfirmation,
} from './a2aConversationTypes'
import './a2a-groups.css'

type ConversationActivityPatch = Partial<Pick<
  A2AConversation,
  'preview' | 'updatedAt' | 'status' | 'repliedCount' | 'round' | 'pendingCurrentUserConfirmation'
>>

type PrivateAssistantMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type A2AConversationViewProps = {
  conversations: A2AConversation[]
  onComplete: (id: string) => void
  onBack: () => void
  selectedConversationId: string | null
  commands: A2AConversationCommand[]
  onCommandHandled: (commandId: string) => void
  onConversationActivity: (conversationId: string, patch: ConversationActivityPatch) => void
  onSubmitCommand: (conversationId: string, action: A2AConversationCommand['action'], content: string) => void
}

function speakerReply(memberName: string, previousName?: string) {
  if (!previousName) {
    return `${memberName}的分身回复：我已经收到这一事项。建议先把交付承诺、关键材料和责任人三个部分确认清楚，我会同步检查当前风险。`
  }
  return `在${previousName}回复的基础上，${memberName}的分身补充：还需要验证方案对上下游专业的影响，并明确下一步关闭时间。`
}

function initialPrivateMessages(conversation: A2AConversation): PrivateAssistantMessage[] {
  if (conversation.demo?.readOnly) return (conversation.demo.privateMessages ?? [{ role: 'assistant' as const, content: '你可以在这里与我私下讨论当前任务。我会帮助你梳理协作进展，不会在群聊中代你发言。' }]).map((message, index) => ({ ...message, id: `private-demo-${conversation.id}-${index}` }));
  const conversationType = `${conversation.scope === 'group' ? '多人' : '单人'}${mechanismLabels[conversation.mechanism]}`
  const perspectiveCopy = conversation.perspective === 'recipient'
    ? `你是接收方。${conversation.hostName}的分身已经将事项送达；请先判断是否需要回复、确认或转为自己的待办。`
    : '你是发起方。这里说的话只有你和自己的分身可见。'
  const pendingCopy = conversation.pendingCurrentUserConfirmation
    ? '当前会话正在等待你的确认。完成下方选择后，我才会继续代表你处理这个会话。'
    : `这里是“${conversation.title}”的私人分身对话。${perspectiveCopy}`

  return [{
    id: `private-assistant-initial-${conversation.id}`,
    role: 'assistant',
    content: `${conversationType} · ${pendingCopy}`,
  }]
}

function createSendConfirmation(
  conversation: A2AConversation,
  content: string,
): A2AUserConfirmation {
  const resumeStatus: Exclude<A2AConversationStatus, 'waiting_user_confirmation'> = conversation.status === 'waiting_user_confirmation'
    ? conversation.pendingCurrentUserConfirmation?.resumeStatus ?? 'response_received'
    : conversation.status
  const resumePreview = conversation.status === 'waiting_user_confirmation'
    ? conversation.pendingCurrentUserConfirmation?.resumePreview ?? conversation.preview
    : conversation.preview

  return {
    id: `a2a-confirm-send-${Date.now()}`,
    question: `是否让你的分身在“${conversation.title}”中发出这段内容？`,
    description: content,
    resumeStatus,
    resumePreview,
    choices: [
      {
        id: 'confirm-send',
        label: '确认发送',
        description: '内容将以你的数字分身身份进入正式会话记录。',
        commandAction: 'send',
        commandContent: content,
      },
      {
        id: 'continue-editing',
        label: '继续修改',
        description: '暂不发送，回到右侧私人对话继续补充。',
      },
    ],
  }
}

function createRoundCompletionConfirmation(conversation: A2AConversation): A2AUserConfirmation {
  return {
    id: `a2a-confirm-round-${conversation.id}-${Date.now()}`,
    question: `“${conversation.title}”本轮回复已经收齐，接下来怎么处理？`,
    description: conversation.demo?.completionSummary ?? '会话会保持挂起，只有你完成确认后，分身才会执行下一步。',
    resumeStatus: 'response_received',
    resumePreview: `本轮已收到全部回复 · ${conversation.members.length}/${conversation.members.length}`,
    choices: [
      {
        id: 'continue-round',
        label: '继续下一轮',
        description: '让各分身基于本轮回答继续补充风险、责任人和关闭计划。',
        commandAction: 'send',
        commandContent: '请基于本轮回答，继续补充风险、责任人和关闭计划。',
      },
      {
        id: 'complete-goal',
        label: '确认完成',
        description: '结束当前目标协作，不再自动发起下一轮。',
        commandAction: 'complete',
        commandContent: conversation.demo?.completionSummary ?? `确认“${conversation.title}”当前目标已经完成。`,
      },
    ],
  }
}

export default function A2AConversationView({
  conversations,
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
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, A2AConversationMessage[]>>(() => (
    Object.fromEntries(conversations.map((conversation) => [conversation.id, createSeedConversationMessages(conversation)]))
  ))
  const [privateMessagesByConversation, setPrivateMessagesByConversation] = useState<Record<string, PrivateAssistantMessage[]>>(() => (
    Object.fromEntries(conversations.map((conversation) => [conversation.id, initialPrivateMessages(conversation)]))
  ))
  const [runningSpeakerByConversation, setRunningSpeakerByConversation] = useState<Record<string, string | null>>({})
  const [privateDraft, setPrivateDraft] = useState('')
  const runVersions = useRef<Record<string, number>>({})
  const latestConversations = useRef(conversations)
  latestConversations.current = conversations
  const [menuOpen, setMenuOpen] = useState(false)
  const [fileRequests, setFileRequests] = useState<Record<string, {id: string; serial: number}>>({})
  const [rightWidth, setRightWidth] = useState<number | null>(null)
  const layoutRef = useRef<HTMLDivElement>(null)
  const [rightView, setRightView] = useState<'assistant' | 'workspace'>('assistant')

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  )
  const messages = selectedConversation?.demo?.readOnly
    ? selectedConversation.demo.messages
    : selectedConversation ? messagesByConversation[selectedConversation.id] ?? [] : []
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
  }, [conversations])

  useEffect(() => {
    setPrivateDraft('')
    setRightView('assistant')
    setMenuOpen(false)
  }, [selectedConversationId])

  useEffect(() => {
    const thread = threadRef.current
    if (!thread) return
    thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' })
  }, [messages.length, runningSpeaker, selectedConversationId])

  useEffect(() => {
    const thread = privateThreadRef.current
    if (!thread) return
    thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' })
  }, [pendingConfirmation?.id, privateMessages.length, selectedConversationId])

  const appendMessage = (conversationId: string, message: A2AConversationMessage) => {
    setMessagesByConversation((current) => ({
      ...current,
      [conversationId]: [...(current[conversationId] ?? []), message],
    }))
  }

  const appendPrivateMessage = (conversationId: string, message: Omit<PrivateAssistantMessage, 'id'>) => {
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
      const confirmation = createRoundCompletionConfirmation(conversation)
      onConversationActivity(conversation.id, {
        status: 'waiting_user_confirmation',
        repliedCount: conversation.members.length,
        updatedAt: '刚刚',
        preview: '等待你确认下一步',
        pendingCurrentUserConfirmation: confirmation,
      })
      appendPrivateMessage(conversation.id, {
        role: 'assistant',
        content: '本轮分身发言已经全部完成。我需要你确认是结束当前目标，还是继续发起下一轮。',
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
      const previousId = conversation.speakingOrder[speakerIndex - 1]
      const previousMember = conversation.members.find((candidate) => candidate.userId === previousId)
      appendMessage(conversation.id, {
        id: `a2a-message-${Date.now()}-${member.userId}`,
        conversationId: conversation.id,
        roundId,
        actorUserId: member.userId,
        actorName: member.name,
        origin: 'participant_twin',
        content: conversation.demo?.replies[member.userId] ?? speakerReply(member.name, previousMember?.name),
        sequence: Date.now(),
        createdAt: '刚刚',
      })
      runSpeaker(conversation, roundId, speakerIndex + 1, runVersion)
    }, 1050)
    timersRef.current.push(timer)
  }

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
        setRunningSpeakerByConversation(current => ({...current, [conversation.id]:null}))
        return
      }
      const roundId = `a2a-round-${Date.now()}`
      const isRecipientReply = conversation.perspective === 'recipient'
      appendMessage(conversation.id, {
        id: `a2a-message-host-${Date.now()}`,
        conversationId: conversation.id,
        roundId,
        actorUserId: isRecipientReply ? 'current-user' : conversation.hostUserId,
        actorName: isRecipientReply ? '张三' : conversation.hostName,
        origin: isRecipientReply ? 'participant_twin' : 'initiator_twin',
        content: command.content,
        sequence: Date.now(),
        createdAt: command.createdAt,
      })
      onCommandHandled(command.id)
      if (conversation.mechanism === 'collaboration' && !isRecipientReply) {
        const nextRound = conversation.round + (conversation.repliedCount > 0 ? 1 : 0)
        onConversationActivity(conversation.id, {
          status: 'waiting_replies',
          repliedCount: 0,
          round: nextRound,
          updatedAt: '刚刚',
          preview: `等待回复 · 0/${conversation.members.length}`,
          pendingCurrentUserConfirmation: undefined,
        })
        runSpeaker({ ...conversation, round: nextRound }, roundId, 0)
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
    appendPrivateMessage(selectedConversation.id, { role: 'user', content: value })
    if (/^(?:本次|这个|这次|任务|会话|沟通|协作|已经|已|都|可以|就|\s)*(?:完成了|完成|结束了|结束)(?:吧|了|。|！|!|\s)*$/.test(value)) {
      if (!canManageA2A(selectedConversation)) {
        appendPrivateMessage(selectedConversation.id, {role:'assistant', content:'只有群主可以确认完成本次沟通。'})
      } else {
        onConversationActivity(selectedConversation.id, { pendingCurrentUserConfirmation: completionQuestion(selectedConversation) })
      }
      return
    }
    if (selectedConversation.demo?.readOnly) {
      appendPrivateMessage(selectedConversation.id, { role: 'assistant', content: `根据当前协作记录：${selectedConversation.demo.completionSummary}\n\n已记录你的关注点“${value}”，后续可据此核对责任分工、时间安排和风险。本次交流仅自己可见。` })
      return
    }
    appendPrivateMessage(selectedConversation.id, {
      role: 'assistant',
      content: '我已经结合当前会话整理为一条分身发言。正式进入会话前，需要你确认。',
    })
    onConversationActivity(selectedConversation.id, {
      status: 'waiting_user_confirmation',
      updatedAt: '刚刚',
      preview: '等待你确认发送',
      pendingCurrentUserConfirmation: createSendConfirmation(selectedConversation, value),
    })
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
          : '收到。我会以你的分身身份发送，并等待其他分身按顺序继续。',
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

  if (!selectedConversation) {
    return (
      <section className="a2a-group-workspace a2a-group-workspace--empty">
        <MessageCircleMore size={34} />
        <h2>选择一个 A2A 会话</h2>
        <p>选择后可查看分身正式记录，并在右侧私下告诉自己的分身如何处理。</p>
      </section>
    )
  }

  const typeName = selectedConversation.scope === 'group' ? '群聊' : '单人'
  const isRecipientPerspective = selectedConversation.perspective === 'recipient'

  return (
    <div className="a2a-conversation-layout" ref={layoutRef}>
      <section className="a2a-group-workspace">
        <header className="a2a-group-header">
          <div className="a2a-heading-start">
            <button className="a2a-back-button" type="button" aria-label="返回" title="返回 A2A 任务" onClick={onBack}><ArrowLeft size={20} /></button>
            <div className="a2a-heading-copy">
            <p>A2A {scopeLabels[selectedConversation.scope]} · {selectedConversation.hostName}发起</p>
            <h2>{selectedConversation.title}</h2>
            <div className="a2a-conversation-badges">
              <span>{typeName}</span>{selectedConversation.status === 'completed' && <span title={selectedConversation.completionReason}>已完成 · 只读{selectedConversation.completionSource === 'model' ? ' · 模型判定' : selectedConversation.completionSource === 'host' ? ' · 群主确认' : ''}</span>}
            </div>
            </div>
          </div>
          <div className="a2a-group-header-members" title={selectedConversation.members.map((member) => member.name).join('、')}>
            <span className="a2a-group-member-stack">
              <i className="a2a-person-avatar a2a-person-avatar--blue">{selectedConversation.hostName.slice(0, 1)}</i>
              {selectedConversation.members.slice(0, 3).map((member) => (
                <i className={`a2a-person-avatar a2a-person-avatar--${member.color}`} key={member.userId}>{member.name.slice(0, 1)}</i>
              ))}
            </span>
            <strong>{selectedConversation.members.length + 1} 人</strong>
            {canManageA2A(selectedConversation) && selectedConversation.status !== 'completed' && <div className="a2a-host-menu">
              <button type="button" aria-label="会话管理" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><MoreHorizontal size={20}/></button>
              {menuOpen && <div role="menu"><button role="menuitem" type="button" onClick={() => {
                onConversationActivity(selectedConversation.id, {pendingCurrentUserConfirmation: completionQuestion(selectedConversation)})
                setRightView('assistant'); setMenuOpen(false)
              }}>标记完成</button></div>}
            </div>}
          </div>
        </header>

        <section className="a2a-group-thread a2a-conversation-thread" ref={threadRef} aria-label={`${selectedConversation.title}会话记录`}>
          {messages.length === 0 && (
            <div className="a2a-group-empty-thread">
              <Bot size={24} />
              <strong>会话已创建</strong>
              <span>请在右侧私下告诉自己的分身要传达什么</span>
            </div>
          )}

          {messages.map((message) => {
            const isMyMessage = isRecipientPerspective ? message.actorUserId === 'current-user' : message.origin === 'initiator_twin'
            const actorColor = selectedConversation.members.find((member) => member.userId === message.actorUserId)?.color ?? 'blue'
            return <article className={`a2a-group-message ${isMyMessage ? 'is-host' : ''}`} key={message.id}>
              {!isMyMessage && (
                <span className={`a2a-person-avatar a2a-person-avatar--${actorColor}`}>
                  {message.actorName.slice(0, 1)}
                </span>
              )}
              <div>
                <strong>
                  {message.actorName}
                  <em>{isMyMessage ? '我的分身' : message.origin === 'initiator_twin' ? '发起方分身' : '分身回复'}</em>
                </strong>
                <p>{message.content}</p>
                {message.attachments?.map(file => <button type="button" className="a2a-message-file" key={file.id} onClick={() => {
                  setFileRequests(current => ({...current, [selectedConversation.id]: {id: file.id, serial: Date.now()}}))
                  setRightWidth(current => current ?? 560)
                  setRightView('workspace')
                }}><FileText size={19}/><span><strong>{file.name}</strong><small>{file.kind === 'html' ? 'HTML' : 'Markdown'} · {fileSize(file.content)}</small></span></button>)}
              </div>
            </article>
          })}

          {runningSpeaker && selectedConversation.status !== 'completed' && (
            <div className="a2a-group-running"><i /><span>{runningSpeaker}的分身正在阅读本轮前序回答并组织回复…</span></div>
          )}

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
            <button className={rightView === 'assistant' ? 'active' : ''} type="button" onClick={() => setRightView('assistant')} role="tab" aria-selected={rightView === 'assistant'}><Bot size={16} />我的分身{pendingConfirmation && <i className="a2a-my-assistant-dot" aria-label="有待本人处理的事项" />}</button>
            <button className={rightView === 'workspace' ? 'active' : ''} type="button" onClick={() => { setRightWidth(current => current ?? 560); setRightView('workspace') }} role="tab" aria-selected={rightView === 'workspace'}><FileText size={16} />Workspace</button>
          </div>
        </header>

        <div style={{display: rightView === 'assistant' ? 'contents' : 'none'}}>
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

          <textarea
            ref={privateComposerRef}
            value={privateDraft}
            disabled={Boolean(pendingConfirmation)}
            onChange={(event) => setPrivateDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                submitPrivatePrompt()
              }
            }}
            placeholder={pendingConfirmation ? '请先完成上方确认' : selectedConversation.demo?.readOnly ? '与我的分身私下讨论当前任务…' : '私下告诉我的分身要在当前会话中如何处理…'}
            aria-label="私下告诉我的分身"
          />
          <div>
            <span>{pendingConfirmation ? '会话正在等待本人确认' : selectedConversation.demo?.readOnly ? '仅自己可见' : '确认后才会进入正式会话'}</span>
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
        </div>
        {conversations.map(conversation => {
          const records = conversation.demo?.readOnly ? conversation.demo.messages : messagesByConversation[conversation.id] ?? []
          const files = [...new Map(records.flatMap(message => (message.attachments ?? []).map(file => [file.id, {...file, sender:message.actorName, sentAt:message.createdAt}] as [string, ConversationFile]))).values()]
          return <div className="a2a-conversation-files-panel" key={conversation.id} style={{display: rightView === 'workspace' && conversation.id === selectedConversation.id ? 'flex' : 'none'}}>
            <A2AFileWorkspace files={files} request={fileRequests[conversation.id]}/>
          </div>
        })}
      </aside>
    </div>
  )
}

export type { ConversationActivityPatch }
