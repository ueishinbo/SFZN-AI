import { Bot, Check, ChevronRight, Clock3, Inbox, LoaderCircle } from 'lucide-react'
import {
  notificationKindLabel,
  type AssistantNotification,
} from './mockNotifications'

type NotificationCenterProps = {
  notifications: AssistantNotification[]
  assistantBusy: boolean
  feedback: string
  selectedNotificationId: string | null
  onProcess: (notification: AssistantNotification) => void
  onSelect: (notification: AssistantNotification) => void
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
}

function groupLabel(receivedAt: string) {
  const date = new Date(receivedAt)
  const today = new Date()
  const dayDifference = Math.round((startOfDay(today) - startOfDay(date)) / 86_400_000)
  if (dayDifference === 0) return '今天'
  if (dayDifference === 1) return '昨天'
  if (dayDifference < 7) return date.toLocaleDateString('zh-CN', { weekday: 'long' })
  return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
}

function formatTime(receivedAt: string) {
  return new Date(receivedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function NotificationCenter({
  notifications,
  assistantBusy,
  feedback,
  selectedNotificationId,
  onProcess,
  onSelect,
}: NotificationCenterProps) {
  const sorted = [...notifications].sort((left, right) => (
    new Date(right.receivedAt).getTime() - new Date(left.receivedAt).getTime()
  ))
  const groups = sorted.reduce<Array<{ label: string; items: AssistantNotification[] }>>((result, notification) => {
    const label = groupLabel(notification.receivedAt)
    const current = result[result.length - 1]
    if (current?.label === label) current.items.push(notification)
    else result.push({ label, items: [notification] })
    return result
  }, [])

  return (
    <section className="notification-center" aria-label="消息通知中心">
      <header className="notification-center-header">
        <div>
          <h2>消息通知</h2>
          <p>异步消息按收到时间排列</p>
        </div>
        <span>{notifications.filter((item) => item.status === 'unread').length} 条未读</span>
      </header>

      <div className={`notification-session-state ${assistantBusy ? 'is-busy' : 'is-idle'}`}>
        <span>{assistantBusy ? <LoaderCircle size={15} /> : <Check size={15} />}</span>
        <div>
          <strong>{assistantBusy ? '助理正在处理当前任务' : '助理长会话空闲'}</strong>
          <p>{assistantBusy ? '新消息已安全暂存，输出结束后可处理' : '悬浮消息并点击“处理”，即可带回长会话'}</p>
        </div>
      </div>

      {feedback && <div className="notification-feedback" role="status">{feedback}</div>}

      <div className="notification-groups">
        {groups.length === 0 ? (
          <div className="notification-empty"><Inbox size={28} /><p>暂时没有新消息</p></div>
        ) : groups.map((group) => (
          <section className="notification-group" key={group.label}>
            <h3>{group.label}</h3>
            <div className="notification-list">
              {group.items.map((notification) => {
                const isHandled = notification.status === 'handled'
                const isProcessing = notification.status === 'processing'
                const processDisabled = assistantBusy || isHandled || isProcessing
                const disabledTitle = assistantBusy
                  ? '助理正在输出，结束后可处理'
                  : isProcessing
                    ? '消息正在处理中'
                    : isHandled
                      ? '消息已处理'
                      : '带回助理长会话处理'
                return (
                  <article
                    className={[
                      'notification-item',
                      `notification-item--${notification.status}`,
                      selectedNotificationId === notification.id ? 'is-selected' : '',
                    ].filter(Boolean).join(' ')}
                    key={notification.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`查看消息：${notification.title}`}
                    aria-current={selectedNotificationId === notification.id ? 'true' : undefined}
                    onClick={() => onSelect(notification)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return
                      event.preventDefault()
                      onSelect(notification)
                    }}
                  >
                    <span className={`notification-kind-icon notification-kind-icon--${notification.kind}`}>
                      {notification.kind === 'a2a' ? <Bot size={16} /> : <Clock3 size={16} />}
                    </span>
                    <div className="notification-item-main">
                      <div className="notification-item-meta">
                        <span>{notificationKindLabel(notification.kind)}</span>
                        <time>{formatTime(notification.receivedAt)}</time>
                      </div>
                      <strong>{notification.title}</strong>
                      <p>{notification.summary}</p>
                      <small>{notification.source}{notification.project ? ` · ${notification.project}` : ''}</small>
                    </div>
                    {notification.status === 'unread' && <i className="notification-unread-dot" aria-label="未读" />}
                    <button
                      className="notification-process-button"
                      type="button"
                      disabled={processDisabled}
                      title={disabledTitle}
                      onClick={(event) => {
                        event.stopPropagation()
                        onProcess(notification)
                      }}
                    >
                      {isHandled ? <><Check size={14} /><span>已处理</span></> : isProcessing ? <><LoaderCircle size={14} /><span>处理中</span></> : <><span>处理</span><ChevronRight size={14} /></>}
                    </button>
                  </article>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <footer className="notification-demo-tip">
        在助理中输入“模拟长任务”，可体验输出期间收到 A2A 消息。
      </footer>
    </section>
  )
}
