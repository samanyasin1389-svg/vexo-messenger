const TOKEN_KEY = 'vexo_token';
const TOKEN_SESSION_KEY = 'vexo_token_session';
const LEGACY_TOKEN_KEYS = ['nabiro_token', 'nabiro_messenger_token'];

/** Keep users logged in after rename / old key names. */
function migrateToken() {
  const current = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_SESSION_KEY);
  if (current) return current;
  for (const key of LEGACY_TOKEN_KEYS) {
    const legacy = localStorage.getItem(key);
    if (legacy) {
      localStorage.setItem(TOKEN_KEY, legacy);
      localStorage.removeItem(key);
      return legacy;
    }
  }
  return null;
}

migrateToken();

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_SESSION_KEY) || migrateToken();
}

export function setToken(token, remember = true) {
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_SESSION_KEY);
  } else {
    sessionStorage.setItem(TOKEN_SESSION_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
  }
  for (const key of LEGACY_TOKEN_KEYS) localStorage.removeItem(key);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_SESSION_KEY);
  for (const key of LEGACY_TOKEN_KEYS) localStorage.removeItem(key);
}

export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(`/api${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'خطا در ارتباط با سرور');
    err.status = res.status;
    throw err;
  }
  return data;
}

/** Upload with progress (XHR, because fetch has no upload progress). */
export function upload(path, formData, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api${path}`);
    const token = getToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText || '{}');
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data.error || 'آپلود ناموفق بود'));
    };
    xhr.onerror = () => reject(new Error('خطا در ارتباط با سرور'));
    xhr.onabort = () => reject(new Error('آپلود لغو شد'));
    if (signal) signal.addEventListener('abort', () => xhr.abort());
    xhr.send(formData);
  });
}

export function mediaUrl(url) {
  if (!url) return null;
  return url;
}

/* ---------- formatting helpers ---------- */

const timeFmt = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long' });
const dayYearFmt = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long', year: 'numeric' });
const weekdayFmt = new Intl.DateTimeFormat('fa-IR', { weekday: 'long' });
const shortDateFmt = new Intl.DateTimeFormat('fa-IR', { month: 'numeric', day: 'numeric' });

export function formatTime(iso) {
  if (!iso) return '';
  return timeFmt.format(new Date(iso));
}

export function isSameDay(a, b) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayDiff(iso) {
  const today = startOfDay(new Date());
  const that = startOfDay(new Date(iso));
  return Math.round((today - that) / 86400000);
}

/** Label used for date dividers inside a conversation. */
export function formatDayLabel(iso) {
  if (!iso) return '';
  const diff = dayDiff(iso);
  if (diff === 0) return 'امروز';
  if (diff === 1) return 'دیروز';
  const d = new Date(iso);
  return d.getFullYear() === new Date().getFullYear() ? dayFmt.format(d) : dayYearFmt.format(d);
}

/** Compact timestamp used in the chat list. */
export function formatListTime(iso) {
  if (!iso) return '';
  const diff = dayDiff(iso);
  const d = new Date(iso);
  if (diff === 0) return timeFmt.format(d);
  if (diff === 1) return 'دیروز';
  if (diff < 7) return weekdayFmt.format(d);
  return shortDateFmt.format(d);
}

export function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** mm:ss for voice messages (seconds can be string from content). */
export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function fileExt(name = '') {
  const i = name.lastIndexOf('.');
  return i > -1 ? name.slice(i + 1).toUpperCase().slice(0, 4) : 'FILE';
}

/** Stable pastel hue per string, used for avatar fallbacks. */
export function hueFor(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % 360;
}
