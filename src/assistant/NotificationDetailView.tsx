import { Bot, Clock3, LockKeyhole, MessageSquareText, Send } from 'lucide-react'
import { notificationKindLabel, type AssistantNotification } from './mockNotifications'

function formatReceivedAt(receivedAt: string) {
  return new Date(receivedAt).toLocaleString('zh-CN', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export default function NotificationDetailView({ notification }: { notification: AssistantNotification | null }) {
  return (
    <section className="notification-detail-view" aria-label="消息结果查看">
      <header className="notification-detail-header">
        <div>
          <p>消息通知 · 只读查看</p>
          <h2>{notification?.title ?? '消息结果'}</h2>
        </div>
        <span><LockKeyhole size={14} />查看模式</span>
      </header>

      <div className="notification-detail-scroll">
        {notification ? (
          <article className="notification-result-card">
            <div className="notification-result-source">
              <span className={`notification-result-icon notification-result-icon--${notification.kind}`}>
                {notification.kind === 'a2a' ? <Bot size={20} /> : <Clock3 size={20} />}
              </span>
              <div>
                <strong>{notificationKindLabel(notification.kind)}</strong>
                <p>{notification.source}{notification.project ? ` · ${notification.project}` : ''}</p>
              </div>
              <time>{formatReceivedAt(notification.receivedAt)}</time>
            </div>

            <div className="notification-result-body">
              <span className="notification-result-eyebrow">{notification.result.eyebrow}</span>
              <h1>{notification.title}</h1>
              <p className="notification-result-overview">{notification.result.overview}</p>

              {notification.result.sections.map((section) => (
                <section key={section.heading}>
                  <h3>{section.heading}</h3>
                  <ul>
                    {section.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </section>
              ))}

              {notification.result.conclusion && (
                <div className="notification-result-conclusion">
                  <MessageSquareText size={17} />
                  <p>{notification.result.conclusion}</p>
                </div>
              )}
            </div>
          </article>
        ) : (
          <div className="notification-detail-empty">
            <span><MessageSquareText size={32} /></span>
            <h2>选择一条消息查看结果</h2>
            <p>查看不会占用或打断助理长会话。</p>
          </div>
        )}
      </div>

      <section className="notification-readonly-composer" aria-label="消息查看输入器">
        <textarea
          aria-label="消息查看模式不可输入"
          disabled
          placeholder="当前为消息查看模式，不能直接聊天"
        />
        <div>
          <span><LockKeyhole size={15} />如需继续交流，请悬浮左侧消息并点击“处理”</span>
          <button type="button" disabled aria-label="消息查看模式不可发送"><Send size={19} /></button>
        </div>
      </section>
    </section>
  )
}
