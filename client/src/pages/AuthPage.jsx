import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import Logo from '../components/Logo.jsx';

const features = [
  { icon: 'bolt', title: 'لحظه‌ای', text: 'تحویل پیام‌ها در همان ثانیه با WebSocket' },
  { icon: 'shield', title: 'خصوصی', text: 'بدون شماره موبایل؛ فقط آیدی و رمز' },
  { icon: 'server', title: 'روی سرور شما', text: 'داده‌ها فقط روی زیرساخت خودتان می‌مانند' },
];

export default function AuthPage({ onLogin, onRegister, theme, onToggleTheme }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function switchMode(next) {
    setMode(next);
    setError('');
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await onLogin(username.trim(), password, remember);
      else await onRegister(username.trim(), password, displayName.trim() || username.trim(), remember);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <button className="icon-btn auth-theme" onClick={onToggleTheme} title="تغییر تم">
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
      </button>

      <section className="auth-hero">
        <div className="auth-brand">
          <Logo size={72} className="logo-lg" />
        </div>
        <ul className="auth-features">
          {features.map((f) => (
            <li key={f.title}>
              <span className="feat-icon">
                <Icon name={f.icon} size={18} />
              </span>
              <div>
                <strong>{f.title}</strong>
                <span>{f.text}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit} noValidate>
          <div className="auth-card-head">
            <h2>{mode === 'login' ? 'خوش برگشتید' : 'ساخت حساب جدید'}</h2>
            <p>
              {mode === 'login'
                ? 'برای ادامه با آیدی و رمز خود وارد شوید'
                : 'در کمتر از یک دقیقه به تیم بپیوندید'}
            </p>
          </div>

          <div className="segment" role="tablist">
            <span className="segment-thumb" data-pos={mode === 'login' ? 0 : 1} />
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'active' : ''}
              onClick={() => switchMode('login')}
            >
              ورود
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={mode === 'register' ? 'active' : ''}
              onClick={() => switchMode('register')}
            >
              ثبت‌نام
            </button>
          </div>

          {mode === 'register' && (
            <label className="field">
              <span>نام نمایشی</span>
              <div className="input-wrap">
                <Icon name="edit" size={18} />
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="مثلاً سامان"
                  autoComplete="name"
                />
              </div>
            </label>
          )}

          <label className="field">
            <span>آیدی</span>
            <div className="input-wrap">
              <Icon name="at" size={18} />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="saman"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                dir="ltr"
              />
            </div>
          </label>

          <label className="field">
            <span>رمز عبور</span>
            <div className="input-wrap">
              <Icon name="lock" size={18} />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                dir="ltr"
              />
              <button
                type="button"
                className="input-action"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'مخفی کردن رمز' : 'نمایش رمز'}
              >
                <Icon name={showPass ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </div>
          </label>

          <label className="remember-check">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span className="remember-label">مرا به خاطر بسپار</span>
          </label>

          {error && (
            <div className="alert alert-error" role="alert">
              <Icon name="info" size={18} />
              <span>{error}</span>
            </div>
          )}

          <button className="btn btn-primary btn-lg" disabled={busy || !username || !password}>
            {busy ? (
              <span className="spinner" />
            ) : mode === 'login' ? (
              'ورود به Vexo'
            ) : (
              'ساخت حساب'
            )}
          </button>

          <p className="auth-switch">
            {mode === 'login' ? (
              <>
                حساب ندارید؟{' '}
                <button type="button" onClick={() => switchMode('register')}>
                  ثبت‌نام کنید
                </button>
              </>
            ) : (
              <>
                قبلاً ثبت‌نام کرده‌اید؟{' '}
                <button type="button" onClick={() => switchMode('login')}>
                  وارد شوید
                </button>
              </>
            )}
          </p>
        </form>
      </section>
    </div>
  );
}
