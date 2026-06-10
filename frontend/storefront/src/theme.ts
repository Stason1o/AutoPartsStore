'use client';
import { createTheme } from '@mui/material/styles';
import { T } from '@/tokens';

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
