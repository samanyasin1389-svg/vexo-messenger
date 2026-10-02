import { useEffect, useState } from 'react';
import { api } from '../api';
import Avatar from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';

export default function NewGroupModal({ onClose, onCreated }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api(`/users/search?q=${encodeURIComponent(q)}`)
        .then((d) => setResults(d.users))
        .catch(() => setResults([]));
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  function toggle(u) {
    setSelected((prev) => (prev.some((x) => x.id === u.id) ? prev.filter((x) => x.id !== u.id) : [...prev, u]));
  }

  async function create(e) {
    e.preventDefault();
    if (!title.trim() || selected.length === 0) return;
    setBusy(true);
    try {
      const data = await api('/chats/group', {
        method: 'POST',
        body: { title: title.trim(), memberIds: selected.map((u) => u.id) },
      });
      toast.success(`گروه «${data.chat.title}» ساخته شد`);
      onCreated(data.chat);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const selectedIds = new Set(selected.map((u) => u.id));

  return (
    <Modal
      title="گروه جدید"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            انصراف
          </button>
          <button
            type="submit"
            form="group-form"
            className="btn btn-primary"
            disabled={busy || !title.trim() || selected.length === 0}
          >
            {busy ? <span className="spinner" /> : `ساخت گروه (${selected.length + 1} عضو)`}
          </button>
        </>
      }
    >
      <form id="group-form" onSubmit={create} className="stack">
        <label className="field">
          <span>نام گروه</span>
          <div className="input-wrap">
            <Icon name="users" size={18} />
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً تیم محصول" maxLength={60} autoFocus />
          </div>
        </label>

        <label className="field">
          <span>افزودن اعضا</span>
          <div className="input-wrap">
            <Icon name="search" size={18} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجوی نام یا آیدی…" dir="auto" />
          </div>
        </label>

        {selected.length > 0 && (
          <div className="chips">
            {selected.map((u) => (
              <button key={u.id} type="button" className="chip" onClick={() => toggle(u)}>
                <Avatar user={u} size={22} />
                {u.displayName}
                <Icon name="x" size={12} />
              </button>
            ))}
          </div>
        )}

        <div className="pick-list">
          {results.map((u) => (
            <button key={u.id} type="button" className={`pick-item ${selectedIds.has(u.id) ? 'on' : ''}`} onClick={() => toggle(u)}>
              <Avatar user={u} size={38} />
              <div>
                <strong>{u.displayName}</strong>
                <span dir="ltr">@{u.username}</span>
              </div>
              <span className="pick-check">
                <Icon name="check" size={16} />
              </span>
            </button>
          ))}
          {query.trim() && results.length === 0 && <div className="empty-side">کاربری پیدا نشد</div>}
          {!query.trim() && results.length === 0 && (
            <div className="empty-side">برای افزودن عضو، نام یا آیدی را جستجو کنید</div>
          )}
        </div>
      </form>
    </Modal>
  );
}
