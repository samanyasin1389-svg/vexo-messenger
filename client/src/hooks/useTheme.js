import { useCallback, useEffect, useState } from 'react';

const KEY = 'vexo_theme';
const LEGACY_THEME_KEYS = ['nabiro_theme'];

function systemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function migrateTheme() {
  const current = localStorage.getItem(KEY);
  if (current) return current;
  for (const key of LEGACY_THEME_KEYS) {
    const legacy = localStorage.getItem(key);
    if (legacy) {
      localStorage.setItem(KEY, legacy);
      localStorage.removeItem(key);
      return legacy;
    }
  }
  return null;
}

export function readTheme() {
  return migrateTheme() || localStorage.getItem(KEY) || systemTheme();
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'light' ? '#f3f5f9' : '#0b0e13';
}

export default function useTheme() {
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      localStorage.setItem(KEY, next);
      return next;
    });
  }, []);

  return { theme, toggle };
}
