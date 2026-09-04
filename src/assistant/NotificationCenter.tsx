import { Bot, Check, Clock3, Inbox, LoaderCircle } from 'lucide-react'
import {
  notificationKindLabel,
  type AssistantNotification,
} from './mockNotifications'

type NotificationCenterProps = {
  notifications: AssistantNotification[]
  assistantBusy: boolean
  selectedNotificationId: string | null
  onSelect: (notification: AssistantNotification) => void
}

export default function NotificationCenter({
  notifications,
  assistantBusy,
  selectedNotificationId,
  onSelect,
}: NotificationCenterProps) {
  // 队首即最早到达的消息，展示顺序与自动投递顺序保持一致。
  const queue = [...notifications].sort((left, right) => (
    new Date(left.receivedAt).getTime() - new Date(right.receivedAt).getTime()
  ))

  return (
    <section className="notification-center" aria-label="消息通知中心">
      <header className="notification-center-header">
        <div>
          <h2>消息通知</h2>
          <p>堵塞期间临时暂存 · 先进先出</p>
        </div>
      </header>

      <div className={`notification-session-state ${assistantBusy ? 'is-busy' : 'is-idle'}`}>
        <span>{assistantBusy ? <LoaderCircle size={15} /> : <Check size={15} />}</span>
        <div>
          <strong>{assistantBusy ? '助理正在处理当前任务' : '助理长会话空闲'}</strong>
          <p>{assistantBusy ? '新消息暂存在这里，恢复空闲后自动推入长会话' : '空闲期间收到的消息将直接进入长会话'}</p>
        </div>
      </div>

      <div className="notification-groups">
        {queue.length === 0 ? (
          <div className="notification-empty">
            <Inbox size={28} />
            <p>当前没有等待推送的消息</p>
          </div>
        ) : (
          <div className="notification-list" aria-label="等待自动推送的消息">
            {queue.map((notification) => (
              <article
                className={[
                  'notification-item',
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
                  <span>{notificationKindLabel(notification.kind)}</span>
                  <strong>{notification.title}</strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <footer className="notification-demo-tip">
        在助理中输入“模拟长任务”，可体验消息排队并自动进入长会话。
      </footer>
    </section>
  )
}
