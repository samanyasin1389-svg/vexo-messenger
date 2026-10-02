import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatDayLabel, isSameDay } from '../api';
import { ChatAvatar } from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';
import Composer from './Composer.jsx';
import MessageBubble from './MessageBubble.jsx';

const GROUP_GAP_MS = 5 * 60 * 1000;

function buildRows(messages) {
  const rows = [];
  messages.forEach((m, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    if (!prev || !isSameDay(prev.createdAt, m.createdAt)) {
      rows.push({ kind: 'day', id: `day-${m.id}`, label: formatDayLabel(m.createdAt) });
    }
    const sameAsPrev =
      prev &&
      prev.sender.id === m.sender.id &&
      isSameDay(prev.createdAt, m.createdAt) &&
      new Date(m.createdAt) - new Date(prev.createdAt) < GROUP_GAP_MS;
    const sameAsNext =
      next &&
      next.sender.id === m.sender.id &&
      isSameDay(next.createdAt, m.createdAt) &&
      new Date(next.createdAt) - new Date(m.createdAt) < GROUP_GAP_MS;
    rows.push({ kind: 'msg', id: m.id, message: m, first: !sameAsPrev, last: !sameAsNext });
  });
  return rows;
}

export default function ChatWindow({
  chat,
  messages,
  loading,
  user,
  typing,
  connection,
  isMobile,
  showInfo,
  onBack,
  onSend,
  onTyping,
  onPickFile,
  onOpenImage,
  onToggleInfo,
  onSaveMessage,
  onSendVoice,
}) {
  const listRef = useRef(null);
  const [atBottom, setAtBottom] = useState(true);
  const [newBelow, setNewBelow] = useState(0);
  const [dragging, setDragging] = useState(false);
  const prevCount = useRef(0);

  const rows = useMemo(() => buildRows(messages), [messages]);
  const isGroup = chat.type === 'group';
  const isSaved = chat.type === 'saved';

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
    setNewBelow(0);
  }, []);

  // Jump to bottom when switching chats / first load
  useEffect(() => {
    prevCount.current = 0;
    setNewBelow(0);
    requestAnimationFrame(() => scrollToBottom('auto'));
  }, [chat.id, loading, scrollToBottom]);

  // On new messages: follow if at bottom, else count them
  useEffect(() => {
    const added = messages.length - prevCount.current;
    prevCount.current = messages.length;
    if (added <= 0) return;
    const lastMine = messages[messages.length - 1]?.sender.id === user.id;
    if (atBottom || lastMine) requestAnimationFrame(() => scrollToBottom());
    else setNewBelow((n) => n + added);
  }, [messages, atBottom, user.id, scrollToBottom]);

  useEffect(() => {
    if (typing && atBottom) requestAnimationFrame(() => scrollToBottom());
  }, [typing, atBottom, scrollToBottom]);

  function onScroll() {
    const el = listRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = dist < 80;
    setAtBottom(nearBottom);
    if (nearBottom) setNewBelow(0);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) onPickFile(file);
  }

  const subtitle = typing
    ? `${typing} در حال نوشتن…`
    : isSaved
      ? 'یادداشت‌های شخصی شما — فقط خودتان می‌بینید'
      : isGroup
        ? `${chat.members?.length || 0} عضو`
        : `@${chat.otherUser?.username || ''}`;

  return (
    <section
      className={`chat-window ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <header className="chat-head">
        {isMobile && (
          <button className="icon-btn" onClick={onBack} aria-label="بازگشت">
            <Icon name="forward" />
          </button>
        )}
        <button className="chat-head-main" onClick={onToggleInfo}>
          <ChatAvatar chat={chat} size={42} />
          <div className="chat-head-text">
            <strong>{chat.title}</strong>
            <span className={typing ? 'typing-text' : ''} dir={typing || isGroup || isSaved ? 'auto' : 'ltr'}>
              {subtitle}
            </span>
          </div>
        </button>
        <div className="chat-head-actions">
          {connection !== 'online' && (
            <span className={`conn conn-${connection}`} title="وضعیت اتصال">
              <Icon name="wifiOff" size={14} />
              {connection === 'offline' ? 'آفلاین' : 'اتصال…'}
            </span>
          )}
          <button className={`icon-btn ${showInfo ? 'active' : ''}`} onClick={onToggleInfo} title="اطلاعات گفتگو">
            <Icon name="info" />
          </button>
        </div>
      </header>

      <div className="messages" ref={listRef} onScroll={onScroll}>
        {loading && !messages.length ? (
          <div className="messages-loading">
            <span className="spinner" />
          </div>
        ) : rows.length === 0 ? (
          <div className="messages-empty">
            <div className="empty-side-icon">
              <Icon name={isSaved ? 'bookmark' : 'chat'} size={28} />
            </div>
            <strong>{isSaved ? 'پیام‌های ذخیره‌شده' : 'شروع گفتگو'}</strong>
            <span>
              {isSaved
                ? 'یادداشت بنویسید، فایل نگه دارید، یا روی هر پیامی در چت‌ها آیکون نشانک را بزنید.'
                : `اولین پیام را برای ${chat.title} بفرستید.`}
            </span>
          </div>
        ) : (
          rows.map((r) =>
            r.kind === 'day' ? (
              <div key={r.id} className="day-divider">
                <span>{r.label}</span>
              </div>
            ) : (
              <MessageBubble
                key={r.id}
                message={r.message}
                mine={r.message.sender.id === user.id}
                isGroup={isGroup}
                first={r.first}
                last={r.last}
                onOpenImage={onOpenImage}
                onSave={isSaved ? undefined : onSaveMessage}
              />
            )
          )
        )}

        {typing && (
          <div className="msg theirs first last">
            {isGroup && <span className="msg-avatar" />}
            <div className="bubble typing-bubble">
              <span className="typing-dots">
                <i />
                <i />
                <i />
              </span>
            </div>
          </div>
        )}
      </div>

      {!atBottom && (
        <button className="jump-btn" onClick={() => scrollToBottom()} aria-label="رفتن به آخرین پیام">
          {newBelow > 0 && <span className="badge">{newBelow}</span>}
          <Icon name="chevronDown" size={22} />
        </button>
      )}

      {dragging && (
        <div className="drop-overlay">
          <Icon name="paperclip" size={36} />
          <strong>فایل را اینجا رها کنید</strong>
        </div>
      )}

      <Composer
        disabled={connection === 'offline'}
        onSend={onSend}
        onTyping={onTyping}
        onPickFile={onPickFile}
        onSendVoice={onSendVoice}
      />
    </section>
  );
}
