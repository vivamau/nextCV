import { useState } from 'react';

const STORAGE_KEY = 'nextcv-theme';

function applyTheme(dark) {
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
}

function getInitial() {
  const stored = localStorage.getItem(STORAGE_KEY);
  const dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(dark);
  return dark;
}

export function useTheme() {
  const [dark, setDark] = useState(getInitial);

  const toggle = () => {
    const next = !dark;
    applyTheme(next);
    setDark(next);
  };

  return { dark, toggle };
}
