import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, upload } from '../api';
import Icon from '../components/Icon.jsx';
import { LogoMark } from '../components/Logo.jsx';
import { useToast } from '../components/Toast.jsx';
import useMediaQuery from '../hooks/useMediaQuery.js';
import AttachmentModal from '../messenger/AttachmentModal.jsx';
import ChatInfoPanel from '../messenger/ChatInfoPanel.jsx';
import ChatWindow from '../messenger/ChatWindow.jsx';
import Lightbox from '../messenger/Lightbox.jsx';
import NavRail from '../messenger/NavRail.jsx';
import NewGroupModal from '../messenger/NewGroupModal.jsx';
import ProfileModal from '../messenger/ProfileModal.jsx';
import Sidebar from '../messenger/Sidebar.jsx';

function sortChats(list) {
  return [...list].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export default function Messenger({ user, socket, connection, theme, onToggleTheme, onLogout, onUserUpdate }) {
  const toast = useToast();
  const isMobile = useMediaQuery('(max-width: 900px)');
  const isCompact = useMediaQuery('(max-width: 1240px)');

  const [chats, setChats] = useState([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [unread, setUnread] = useState({});
  const [typingMap, setTypingMap] = useState({});
  const [modal, setModal] = useState(null); // 'profile' | 'group'
  const [showInfo, setShowInfo] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);

  const activeIdRef = useRef(activeId);
  const typingTimers = useRef({});
  activeIdRef.current = activeId;

  const activeChat = useMemo(() => chats.find((c) => c.id === activeId) || null, [chats, activeId]);

  const loadChats = useCallback(async () => {
    try {
      const data = await api('/chats');
      setChats(sortChats(data.chats));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setChatsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setMessagesLoading(true);
    api(`/chats/${activeId}/messages?limit=80`)
      .then((d) => !cancelled && setMessages(d.messages))
      .catch((err) => !cancelled && toast.error(err.message))
      .finally(() => !cancelled && setMessagesLoading(false));
    socket?.emit('chat:join', activeId);
    setUnread((u) => (u[activeId] ? { ...u, [activeId]: 0 } : u));
    return () => {
      cancelled = true;
    };
  }, [activeId, socket, toast]);

  // Browser tab title reflects unread count
  useEffect(() => {
    const total = Object.values(unread).reduce((a, b) => a + b, 0);
    document.title = total ? `(${total}) Vexo` : 'Vexo | پیام‌رسان';
  }, [unread]);

  const setTypingFor = useCallback((chatId, name) => {
    setTypingMap((m) => ({ ...m, [chatId]: name }));
    clearTimeout(typingTimers.current[chatId]);
    typingTimers.current[chatId] = setTimeout(() => {
      setTypingMap((m) => {
        if (!m[chatId]) return m;
        const next = { ...m };
        delete next[chatId];
        return next;
      });
    }, 2000);
  }, []);

  useEffect(() => {
    if (!socket) return;

    function onMessage(msg) {
      let known = false;
      setChats((prev) => {
        known = prev.some((c) => c.id === msg.chatId);
        if (!known) return prev;
        return sortChats(
          prev.map((c) =>
            c.id === msg.chatId
              ? {
                  ...c,
                  updatedAt: msg.createdAt,
                  lastMessage: {
                    id: msg.id,
                    type: msg.type,
                    content: msg.content,
                    fileName: msg.fileName,
                    senderId: msg.sender.id,
                    createdAt: msg.createdAt,
                  },
                }
              : c
          )
        );
      });
      if (!known) loadChats();

      setTypingMap((m) => {
        if (!m[msg.chatId]) return m;
        const next = { ...m };
        delete next[msg.chatId];
        return next;
      });

      if (msg.chatId === activeIdRef.current) {
        setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
      } else if (msg.sender.id !== user.id) {
        setUnread((u) => ({ ...u, [msg.chatId]: (u[msg.chatId] || 0) + 1 }));
      }
    }

    function onTyping({ chatId, userId, username, displayName }) {
      if (userId === user.id) return;
      setTypingFor(chatId, displayName || username);
    }

    function onChatNew(chat) {
      setChats((prev) => (prev.some((c) => c.id === chat.id) ? prev : sortChats([chat, ...prev])));
    }

    socket.on('message:new', onMessage);
    socket.on('typing', onTyping);
    socket.on('chat:new', onChatNew);
    return () => {
      socket.off('message:new', onMessage);
      socket.off('typing', onTyping);
      socket.off('chat:new', onChatNew);
    };
  }, [socket, user.id, loadChats, setTypingFor]);

  async function openDirect(target) {
    try {
      const data = await api('/chats/direct', { method: 'POST', body: { userId: target.id } });
      setChats((prev) => (prev.some((c) => c.id === data.chat.id) ? prev : sortChats([data.chat, ...prev])));
      setActiveId(data.chat.id);
      socket?.emit('chat:join', data.chat.id);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function openSaved() {
    const existing = chats.find((c) => c.type === 'saved');
    if (existing) {
      setActiveId(existing.id);
      return;
    }
    try {
      const data = await api('/chats/saved', { method: 'POST' });
      setChats((prev) => (prev.some((c) => c.id === data.chat.id) ? prev : sortChats([data.chat, ...prev])));
      setActiveId(data.chat.id);
      socket?.emit('chat:join', data.chat.id);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function saveMessage(message) {
    try {
      const data = await api('/chats/saved/messages', { method: 'POST', body: { messageId: message.id } });
      setChats((prev) => {
        const has = prev.some((c) => c.id === data.chat.id);
        return sortChats(has ? prev.map((c) => (c.id === data.chat.id ? data.chat : c)) : [data.chat, ...prev]);
      });
      toast.success('در پیام‌های ذخیره‌شده ذخیره شد');
    } catch (err) {
      toast.error(err.message);
    }
  }

  function onGroupCreated(chat) {
    setChats((prev) => (prev.some((c) => c.id === chat.id) ? prev : sortChats([chat, ...prev])));
    setActiveId(chat.id);
    socket?.emit('chat:join', chat.id);
  }

  function sendText(content) {
    if (!activeId || !socket) return;
    const tempId = `tmp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      chatId: activeId,
      type: 'text',
      content,
      createdAt: new Date().toISOString(),
      sender: user,
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    socket.emit('message:send', { chatId: activeId, content }, (res) => {
      if (res?.error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        toast.error(res.error);
        return;
      }
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        if (res?.message && !withoutTemp.some((m) => m.id === res.message.id)) {
          return [...withoutTemp, res.message];
        }
        return withoutTemp;
      });
    });
  }

  function emitTyping() {
    if (activeId && socket) socket.emit('typing', { chatId: activeId });
  }

  async function sendVoice(file, durationSec) {
    if (!activeId) throw new Error('چتی انتخاب نشده');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('caption', String(durationSec || ''));
    await upload(`/chats/${activeId}/media`, fd);
  }

  const infoVisible = showInfo && activeChat && !isMobile;
  const showSidebar = !isMobile || !activeId;
  const showChat = !isMobile || !!activeId;

  return (
    <div className={`app ${infoVisible ? 'with-info' : ''} ${isCompact ? 'compact' : ''}`}>
      {!isMobile && (
        <NavRail
          user={user}
          theme={theme}
          connection={connection}
          onToggleTheme={onToggleTheme}
          onProfile={() => setModal('profile')}
          onNewGroup={() => setModal('group')}
          onSaved={openSaved}
          savedActive={activeChat?.type === 'saved'}
          onLogout={onLogout}
        />
      )}

      {showSidebar && (
        <Sidebar
          user={user}
          chats={chats}
          loading={chatsLoading}
          activeId={activeId}
          unread={unread}
          typingMap={typingMap}
          connection={connection}
          isMobile={isMobile}
          theme={theme}
          onToggleTheme={onToggleTheme}
          onSelect={(id) => {
            setActiveId(id);
            if (isCompact) setShowInfo(false);
          }}
          onOpenUser={openDirect}
          onNewGroup={() => setModal('group')}
          onSaved={openSaved}
          onProfile={() => setModal('profile')}
          onLogout={onLogout}
        />
      )}

      {showChat && (
        <main className="main">
          {activeChat ? (
            <ChatWindow
              key={activeChat.id}
              chat={activeChat}
              messages={messages}
              loading={messagesLoading}
              user={user}
              typing={typingMap[activeChat.id]}
              connection={connection}
              isMobile={isMobile}
              showInfo={infoVisible}
              onBack={() => setActiveId(null)}
              onSend={sendText}
              onTyping={emitTyping}
              onPickFile={setPendingFile}
              onOpenImage={setLightbox}
              onToggleInfo={() => (isMobile ? setModal('info') : setShowInfo((v) => !v))}
              onSaveMessage={saveMessage}
              onSendVoice={sendVoice}
            />
          ) : (
            <div className="welcome">
              <div className="welcome-art">
                <LogoMark size={104} />
                <i className="orb orb-1" />
                <i className="orb orb-2" />
              </div>
              <h2>
                به <span className="wordmark">vexo</span> خوش آمدید
              </h2>
              <p>یک گفتگو را از فهرست انتخاب کنید، یا با جستجوی آیدی همکارتان چت جدیدی بسازید.</p>
              <div className="welcome-tips">
                <span>
                  <Icon name="search" size={16} /> جستجو با آیدی
                </span>
                <span>
                  <Icon name="users" size={16} /> ساخت گروه
                </span>
                <span>
                  <Icon name="bookmark" size={16} /> پیام‌های ذخیره‌شده
                </span>
                <span>
                  <Icon name="paperclip" size={16} /> کشیدن و رها کردن فایل
                </span>
              </div>
            </div>
          )}
        </main>
      )}

      {infoVisible && (
        <ChatInfoPanel
          chat={activeChat}
          messages={messages}
          user={user}
          onClose={() => setShowInfo(false)}
          onOpenImage={setLightbox}
        />
      )}

      {modal === 'profile' && (
        <ProfileModal user={user} onClose={() => setModal(null)} onUserUpdate={onUserUpdate} />
      )}
      {modal === 'group' && <NewGroupModal onClose={() => setModal(null)} onCreated={onGroupCreated} />}
      {modal === 'info' && activeChat && (
        <div className="modal-backdrop" onMouseDown={() => setModal(null)}>
          <div className="modal modal-md info-modal" onMouseDown={(e) => e.stopPropagation()}>
            <ChatInfoPanel
              chat={activeChat}
              messages={messages}
              user={user}
              onClose={() => setModal(null)}
              onOpenImage={(i) => {
                setModal(null);
                setLightbox(i);
              }}
            />
          </div>
        </div>
      )}
      {pendingFile && activeId && (
        <AttachmentModal file={pendingFile} chatId={activeId} onClose={() => setPendingFile(null)} />
      )}
      <Lightbox item={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
