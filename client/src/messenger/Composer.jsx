import { useEffect, useRef, useState } from 'react';
import { formatDuration } from '../api';
import Icon from '../components/Icon.jsx';
import { useToast } from '../components/Toast.jsx';

const EMOJIS =
  '😀 😂 🤣 😊 😍 😘 😎 🤔 😅 😭 😡 🙄 😴 🤝 👍 👎 👏 🙏 💪 🔥 ✨ ⭐ ❤️ 💙 💚 💛 🎉 🎯 ✅ ❌ ⚠️ 💡 📌 📎 🎤 🚀 ⏰ ☕ 🍕 🎂'.split(' ');

const MAX_VOICE_MS = 5 * 60 * 1000;

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/aac'];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

export default function Composer({ disabled, onSend, onTyping, onPickFile, onSendVoice }) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busyVoice, setBusyVoice] = useState(false);
  const taRef = useRef(null);
  const fileRef = useRef(null);
  const lastTyping = useRef(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAt = useRef(0);
  const timerRef = useRef(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = '0px';
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px';
  }, [text]);

  useEffect(() => {
    if (!emojiOpen) return;
    const close = () => setEmojiOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [emojiOpen]);

  useEffect(() => () => stopTracks(), []);

  function stopTracks() {
    clearInterval(timerRef.current);
    mediaRef.current?.stream?.getTracks?.().forEach((t) => t.stop());
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      try {
        mediaRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    mediaRef.current = null;
  }

  function submit() {
    const content = text.trim();
    if (!content || disabled) return;
    onSend(content);
    setText('');
    taRef.current?.focus();
  }

  function onChange(e) {
    setText(e.target.value);
    const now = Date.now();
    if (now - lastTyping.current > 1200) {
      lastTyping.current = now;
      onTyping?.();
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function onPaste(e) {
    const item = [...(e.clipboardData?.items || [])].find((i) => i.kind === 'file');
    if (item) {
      const file = item.getAsFile();
      if (file) {
        e.preventDefault();
        onPickFile(file);
      }
    }
  }

  function insertEmoji(em) {
    const ta = taRef.current;
    const start = ta?.selectionStart ?? text.length;
    const end = ta?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + em + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      ta?.focus();
      ta?.setSelectionRange(start + em.length, start + em.length);
    });
  }

  async function startRecording() {
    if (disabled || busyVoice || recording) return;
    if (!window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) {
      toast.error('مرورگر شما از ضبط صدا پشتیبانی نمی‌کند');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      cancelRef.current = false;
      recorder.ondataavailable = (e) => {
        if (e.data?.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timerRef.current);
        const secs = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
        setRecording(false);
        setElapsed(0);
        if (cancelRef.current) {
          chunksRef.current = [];
          return;
        }
        if (!chunksRef.current.length || secs < 1) {
          toast.info('ویس خیلی کوتاه بود');
          return;
        }
        const type = recorder.mimeType || mime || 'audio/webm';
        const ext = type.includes('mp4') || type.includes('aac') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type });
        setBusyVoice(true);
        try {
          await onSendVoice?.(file, secs);
        } catch (err) {
          toast.error(err.message || 'ارسال ویس ناموفق بود');
        } finally {
          setBusyVoice(false);
        }
      };
      mediaRef.current = recorder;
      startedAt.current = Date.now();
      setElapsed(0);
      setRecording(true);
      recorder.start(250);
      timerRef.current = setInterval(() => {
        const ms = Date.now() - startedAt.current;
        setElapsed(Math.floor(ms / 1000));
        if (ms >= MAX_VOICE_MS) finishRecording(false);
      }, 200);
    } catch {
      toast.error('دسترسی به میکروفون داده نشد');
    }
  }

  function finishRecording(cancel) {
    cancelRef.current = !!cancel;
    clearInterval(timerRef.current);
    const rec = mediaRef.current;
    if (!rec) {
      setRecording(false);
      return;
    }
    if (rec.state !== 'inactive') rec.stop();
    else setRecording(false);
  }

  const hasText = !!text.trim();

  if (recording) {
    return (
      <div className="composer recording">
        <button type="button" className="icon-btn composer-btn danger" onClick={() => finishRecording(true)} title="لغو">
          <Icon name="trash" size={20} />
        </button>
        <div className="rec-bar">
          <span className="rec-dot" />
          <span className="rec-label">در حال ضبط…</span>
          <span className="rec-time" dir="ltr">
            {formatDuration(elapsed)}
          </span>
          <span className="rec-wave" aria-hidden="true">
            <i /><i /><i /><i /><i />
          </span>
        </div>
        <button type="button" className="send-btn" onClick={() => finishRecording(false)} title="ارسال ویس">
          <Icon name="send" size={20} />
        </button>
      </div>
    );
  }

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        ref={fileRef}
        type="file"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPickFile(f);
          e.target.value = '';
        }}
      />

      <button
        type="button"
        className="icon-btn composer-btn"
        onClick={() => fileRef.current?.click()}
        title="پیوست عکس، ویدیو یا فایل"
        disabled={disabled || busyVoice}
      >
        <Icon name="paperclip" size={22} />
      </button>

      <div className="composer-field">
        <textarea
          ref={taRef}
          rows={1}
          value={text}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder={disabled ? 'اتصال برقرار نیست…' : 'پیام بنویسید…'}
          dir="auto"
          disabled={disabled || busyVoice}
        />
        <div className="emoji-wrap">
          <button
            type="button"
            className="icon-btn composer-btn"
            title="ایموجی"
            onClick={(e) => {
              e.stopPropagation();
              setEmojiOpen((v) => !v);
            }}
            disabled={busyVoice}
          >
            <Icon name="smile" size={22} />
          </button>
          {emojiOpen && (
            <div className="emoji-pop" onClick={(e) => e.stopPropagation()}>
              {EMOJIS.map((em) => (
                <button key={em} type="button" onClick={() => insertEmoji(em)}>
                  {em}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {hasText ? (
        <button type="submit" className="send-btn" disabled={disabled || busyVoice} title="ارسال (Enter)">
          <Icon name="send" size={20} />
        </button>
      ) : (
        <button
          type="button"
          className="send-btn mic-btn"
          disabled={disabled || busyVoice}
          title="ضبط پیام صوتی"
          onClick={startRecording}
        >
          {busyVoice ? <span className="spinner" /> : <Icon name="mic" size={20} />}
        </button>
      )}
    </form>
  );
}
