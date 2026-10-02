import { useEffect, useRef, useState } from 'react';
import { fileExt, formatSize, upload } from '../api';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';

const MAX = 200 * 1024 * 1024;

export default function AttachmentModal({ file, chatId, onClose }) {
  const toast = useToast();
  const [caption, setCaption] = useState('');
  const [progress, setProgress] = useState(null);
  const [preview, setPreview] = useState(null);
  const abortRef = useRef(null);

  const kind = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';

  useEffect(() => {
    if (kind === 'file') return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, kind]);

  async function send(e) {
    e?.preventDefault();
    if (file.size > MAX) {
      toast.error('حجم فایل بیشتر از ۲۰۰ مگابایت است');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    if (caption.trim()) fd.append('caption', caption.trim());
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setProgress(0);
    try {
      await upload(`/chats/${chatId}/media`, fd, { onProgress: setProgress, signal: ctrl.signal });
      onClose();
    } catch (err) {
      toast.error(err.message);
      setProgress(null);
    }
  }

  function cancel() {
    abortRef.current?.abort();
    onClose();
  }

  const uploading = progress !== null;

  return (
    <Modal
      title={kind === 'image' ? 'ارسال تصویر' : kind === 'video' ? 'ارسال ویدیو' : 'ارسال فایل'}
      onClose={cancel}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={cancel}>
            {uploading ? 'لغو' : 'انصراف'}
          </button>
          <button type="submit" form="attach-form" className="btn btn-primary" disabled={uploading}>
            {uploading ? `${progress}%` : 'ارسال'}
          </button>
        </>
      }
    >
      <form id="attach-form" onSubmit={send} className="stack">
        <div className="attach-preview">
          {kind === 'image' && preview && <img src={preview} alt={file.name} />}
          {kind === 'video' && preview && <video src={preview} controls />}
          {kind === 'file' && (
            <div className="file-card static">
              <span className="file-ext">{fileExt(file.name)}</span>
              <span className="file-meta">
                <strong dir="auto">{file.name}</strong>
                <small>{formatSize(file.size)}</small>
              </span>
              <Icon name="file" size={18} className="file-dl" />
            </div>
          )}
        </div>
        {kind !== 'file' && (
          <div className="attach-name" dir="auto">
            {file.name} · {formatSize(file.size)}
          </div>
        )}

        <label className="field">
          <span>توضیح (اختیاری)</span>
          <div className="input-wrap">
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="چیزی درباره این فایل بنویسید…"
              dir="auto"
              autoFocus
              disabled={uploading}
            />
          </div>
        </label>

        {uploading && (
          <div className="progress">
            <i style={{ width: `${progress}%` }} />
          </div>
        )}
      </form>
    </Modal>
  );
}
