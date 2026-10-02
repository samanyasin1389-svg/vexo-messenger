import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { api, clearToken, getToken, setToken } from './api';
import { ToastProvider } from './components/Toast.jsx';
import { LogoMark } from './components/Logo.jsx';
import useTheme from './hooks/useTheme.js';
import AuthPage from './pages/AuthPage.jsx';
import Messenger from './pages/Messenger.jsx';

function Boot() {
  return (
    <div className="boot">
      <div className="boot-logo">
        <LogoMark size={72} />
      </div>
      <div className="boot-bar">
        <i />
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [connection, setConnection] = useState('connecting');
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api('/auth/me')
      .then((data) => setUser(data.user))
      .catch((err) => {
        if (err.status === 401) clearToken();
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) {
      setSocket((s) => {
        s?.disconnect();
        return null;
      });
      return;
    }
    const s = io('/', {
      auth: { token: getToken() },
      transports: ['websocket', 'polling'],
    });
    s.on('connect', () => setConnection('online'));
    s.on('disconnect', () => setConnection('offline'));
    s.io.on('reconnect_attempt', () => setConnection('connecting'));
    setSocket(s);
    return () => s.disconnect();
  }, [user?.id]);

  const authHandlers = useMemo(
    () => ({
      async login(username, password, remember = true) {
        const data = await api('/auth/login', {
          method: 'POST',
          body: { username, password },
        });
        setToken(data.token, remember);
        setUser(data.user);
      },
      async register(username, password, displayName, remember = true) {
        const data = await api('/auth/register', {
          method: 'POST',
          body: { username, password, displayName },
        });
        setToken(data.token, remember);
        setUser(data.user);
      },
      logout() {
        clearToken();
        setUser(null);
      },
      setUser,
    }),
    []
  );

  let view;
  if (loading) view = <Boot />;
  else if (!user)
    view = (
      <AuthPage
        onLogin={authHandlers.login}
        onRegister={authHandlers.register}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  else
    view = (
      <Messenger
        user={user}
        socket={socket}
        connection={connection}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={authHandlers.logout}
        onUserUpdate={authHandlers.setUser}
      />
    );

  return <ToastProvider>{view}</ToastProvider>;
}
