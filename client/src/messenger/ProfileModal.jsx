import { useEffect, useRef, useState } from 'react';
import { api, upload } from '../api';
import Avatar from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';

export default function ProfileModal({ user, onClose, onUserUpdate }) {
  const toast = useToast();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!avatarFile) return;
    const url = URL.createObjectURL(avatarFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  async function save(e) {
    e.preventDefault();
    if (!displayName.trim()) return;
    setBusy(true);
    try {
      const data = await api('/users/me', {
        method: 'PATCH',
        body: { displayName: displayName.trim(), bio },
      });
      let next = data.user;
      if (avatarFile) {
        const fd = new FormData();
        fd.append('avatar', avatarFile);
        const av = await upload('/users/me/avatar', fd);
        next = av.user;
      }
      onUserUpdate(next);
      toast.success('پروفایل ذخیره شد');
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const previewUser = preview ? { ...user, avatarUrl: preview } : user;

  return (
    <Modal
      title="پروفایل من"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            انصراف
          </button>
          <button type="submit" form="profile-form" className="btn btn-primary" disabled={busy || !displayName.trim()}>
            {busy ? <span className="spinner" /> : 'ذخیره تغییرات'}
          </button>
        </>
      }
    >
      <form id="profile-form" onSubmit={save} className="stack">
        <div className="avatar-edit">
          <input
            ref={fileRef}
            type="file"
            hidden
            accept="image/*"
            onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
          />
          <button type="button" className="avatar-edit-btn" onClick={() => fileRef.current?.click()}>
            <Avatar user={previewUser} size={96} />
            <span className="avatar-edit-badge">
              <Icon name="camera" size={16} />
            </span>
          </button>
          <div className="avatar-edit-text">
            <strong>{user.displayName}</strong>
            <span dir="ltr">@{user.username}</span>
          </div>
        </div>

        <label className="field">
          <span>نام نمایشی</span>
          <div className="input-wrap">
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} required />
          </div>
        </label>

        <label className="field">
          <span>
            بیو <small>{bio.length}/200</small>
          </span>
          <div className="input-wrap">
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 200))}
              placeholder="چند کلمه درباره خودتان…"
              dir="auto"
            />
          </div>
        </label>

        <div className="hint">
          <Icon name="info" size={16} />
          آیدی شما <b dir="ltr">@{user.username}</b> است و قابل تغییر نیست. همکاران با همین آیدی شما را پیدا می‌کنند.
        </div>
      </form>
    </Modal>
  );
}
