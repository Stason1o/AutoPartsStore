'use client';
import { createTheme } from '@mui/material/styles';

/** Дизайн-токены из прототипа Sacramento.dc.html */
export const T = {
  g900: '#0d0f12',
  g850: '#111419',
  g800: '#16191f',
  g750: '#1c2027',
  g700: '#23272f',
  lineD: '#2d323b',
  paper: '#ffffff',
  paper2: '#f3f5f8',
  paper3: '#e9ecf1',
  line: '#e0e4ea',
  ink: '#13161b',
  muted: '#697079',
  muted2: '#98a0ab',
  accent: '#2b6cff',
  accentH: '#1a4fd6',
  accentSoft: '#e9f0ff',
  ok: '#1f9d5b',
  okSoft: '#e6f5ed',
  warn: '#d6442a',
  warnSoft: '#fbeae6',
  mono: 'var(--font-mono), ui-monospace, monospace',
  sans: 'var(--font-sans), system-ui, sans-serif',
};

export const theme = createTheme({
  palette: {
    primary: { main: T.accent, dark: T.accentH },
    success: { main: T.ok },
    error: { main: T.warn },
    text: { primary: T.ink, secondary: T.muted },
    background: { default: T.paper2, paper: T.paper },
  },
  typography: {
    fontFamily: 'var(--font-sans), system-ui, sans-serif',
    button: { textTransform: 'none', fontWeight: 700 },
  },
  shape: { borderRadius: 10 },
});
