import { useEffect, useRef, useState } from 'react';
import { api, formatListTime } from '../api';
import Avatar, { ChatAvatar } from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';

function previewOf(chat, me) {
  const m = chat.lastMessage;
  if (!m) return { text: chat.type === 'saved' ? 'یادداشت‌ها و پیام‌های ذخیره‌شده شما' : 'هنوز پیامی نیست', icon: null, mine: false };
  const mine = m.senderId === me.id && chat.type !== 'saved';
  if (m.type === 'image') return { text: 'تصویر', icon: 'image', mine };
  if (m.type === 'video') return { text: 'ویدیو', icon: 'video', mine };
  if (m.type === 'voice') return { text: 'پیام صوتی', icon: 'mic', mine };
  if (m.type === 'file') return { text: m.fileName || 'فایل', icon: 'file', mine };
  return { text: m.content, icon: null, mine };
}

function ChatItem({ chat, me, active, unread, typing, onClick }) {
  const p = previewOf(chat, me);
  const stamp = chat.lastMessage?.createdAt || chat.updatedAt;
  return (
    <button className={`chat-item ${active ? 'active' : ''}`} onClick={onClick}>
      <ChatAvatar chat={chat} size={50} />
      <div className="chat-item-body">
        <div className="chat-item-row">
          <strong className="chat-item-title">
            {chat.type === 'group' && <Icon name="users" size={14} className="chat-item-kind" />}
            {chat.title}
          </strong>
          <time>{formatListTime(stamp)}</time>
        </div>
        <div className="chat-item-row">
          {typing ? (
            <span className="chat-item-preview typing-text">{typing} در حال نوشتن…</span>
          ) : (
            <span className="chat-item-preview">
              {p.mine && <span className="preview-you">شما: </span>}
              {p.icon && <Icon name={p.icon} size={14} />}
              {p.text}
            </span>
          )}
          {unread > 0 && <span className="badge">{unread > 99 ? '+99' : unread}</span>}
        </div>
      </div>
    </button>
  );
}

function Skeleton() {
  return (
    <div className="chat-item skeleton">
      <span className="sk sk-avatar" />
      <div className="chat-item-body">
        <span className="sk sk-line" style={{ width: '55%' }} />
        <span className="sk sk-line" style={{ width: '80%' }} />
      </div>
    </div>
  );
}

export default function Sidebar({
  user,
  chats,
  loading,
  activeId,
  unread,
  typingMap,
  connection,
  isMobile,
  theme,
  onToggleTheme,
  onSelect,
  onOpenUser,
  onNewGroup,
  onSaved,
  onProfile,
  onLogout,
}) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef(null);

  const q = query.trim().toLowerCase();

  useEffect(() => {
    if (!q) {
      setUsers([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      api(`/users/search?q=${encodeURIComponent(q)}`)
        .then((d) => setUsers(d.users))
        .catch(() => setUsers([]))
        .finally(() => setSearching(false));
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

  const filtered = q
    ? chats.filter(
        (c) =>
          c.title.toLowerCase().includes(q) || c.otherUser?.username?.toLowerCase().includes(q)
      )
    : chats;

  const existingUserIds = new Set(chats.map((c) => c.otherUser?.id).filter(Boolean));
  const newUsers = users.filter((u) => !existingUserIds.has(u.id));

  return (
    <aside className="sidebar">
      <header className="sidebar-head">
        {isMobile ? (
          <div className="sidebar-menu-wrap">
            <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }} aria-label="منو">
              <Icon name="more" />
            </button>
            {menuOpen && (
              <div className="menu">
                <button onClick={onProfile}>
                  <Avatar user={user} size={22} /> پروفایل من
                </button>
                <button onClick={onSaved}>
                  <Icon name="bookmark" size={18} /> پیام‌های ذخیره‌شده
                </button>
                <button onClick={onNewGroup}>
                  <Icon name="users" size={18} /> گروه جدید
                </button>
                <button onClick={onToggleTheme}>
                  <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />{' '}
                  {theme === 'dark' ? 'تم روشن' : 'تم تیره'}
                </button>
                <button className="danger" onClick={onLogout}>
                  <Icon name="logout" size={18} /> خروج
                </button>
              </div>
            )}
          </div>
        ) : null}
        <h1 className="sidebar-title">
          گفتگوها
          {connection !== 'online' && (
            <span className={`conn conn-${connection}`}>
              {connection === 'offline' ? 'آفلاین' : 'اتصال…'}
            </span>
          )}
        </h1>
        <button className="icon-btn" title="گروه جدید" onClick={onNewGroup}>
          <Icon name="userPlus" />
        </button>
      </header>

      <div className="search">
        <Icon name="search" size={18} className="search-icon" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجوی نام یا آیدی…"
          dir="auto"
        />
        {query && (
          <button className="search-clear" onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label="پاک کردن">
            <Icon name="x" size={14} />
          </button>
        )}
      </div>

      <div className="chat-list">
        {loading && !chats.length ? (
          <>
            <Skeleton />
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </>
        ) : (
          <>
            {q && (
              <>
                {filtered.length > 0 && <div className="list-label">گفتگوها</div>}
                {filtered.map((c) => (
                  <ChatItem
                    key={c.id}
                    chat={c}
                    me={user}
                    active={c.id === activeId}
                    unread={unread[c.id] || 0}
                    typing={typingMap[c.id]}
                    onClick={() => onSelect(c.id)}
                  />
                ))}
                <div className="list-label">
                  کاربران {searching && <span className="spinner spinner-sm" />}
                </div>
                {newUsers.map((u) => (
                  <button key={u.id} className="chat-item" onClick={() => { onOpenUser(u); setQuery(''); }}>
                    <Avatar user={u} size={50} />
                    <div className="chat-item-body">
                      <div className="chat-item-row">
                        <strong className="chat-item-title">{u.displayName}</strong>
                      </div>
                      <div className="chat-item-row">
                        <span className="chat-item-preview" dir="ltr">@{u.username}</span>
                      </div>
                    </div>
                    <Icon name="plus" size={18} className="chat-item-action" />
                  </button>
                ))}
                {!searching && newUsers.length === 0 && filtered.length === 0 && (
                  <div className="empty-side">نتیجه‌ای برای «{query}» پیدا نشد</div>
                )}
              </>
            )}

            {!q &&
              chats.map((c) => (
                <ChatItem
                  key={c.id}
                  chat={c}
                  me={user}
                  active={c.id === activeId}
                  unread={unread[c.id] || 0}
                  typing={typingMap[c.id]}
                  onClick={() => onSelect(c.id)}
                />
              ))}

            {!q && !chats.length && (
              <div className="empty-side">
                <div className="empty-side-icon">
                  <Icon name="chat" size={28} />
                </div>
                <strong>هنوز گفتگویی ندارید</strong>
                <span>آیدی همکارتان را جستجو کنید تا اولین چت را شروع کنید.</span>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
