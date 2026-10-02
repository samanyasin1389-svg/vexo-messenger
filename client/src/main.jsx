import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { applyTheme, readTheme } from './hooks/useTheme.js';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/auth.css';
import './styles/messenger.css';

applyTheme(readTheme());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
