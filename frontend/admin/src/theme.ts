import { createTheme } from '@mui/material/styles';

/** Палитра прототипа — используется в sx по всему приложению. */
export const C = {
  g900: '#0d0f12',
  g850: '#111419',
  g800: '#16191f',
  g780: '#191d24',
  g750: '#1c2027',
  g700: '#23272f',
  lineD: '#2d323b',
  paper: '#ffffff',
  bg: '#f4f5f7',
  paper2: '#f7f8fa',
  paper3: '#eceef2',
  line: '#e3e6ec',
  line2: '#edeff3',
  ink: '#13161b',
  ink2: '#2c313a',
  muted: '#697079',
  muted2: '#9aa1ac',
  accent: '#2b6cff',
  accentH: '#1a4fd6',
  accentSoft: '#e9f0ff',
  ok: '#1f9d5b',
  okSoft: '#e7f5ee',
  warn: '#d6442a',
  warnSoft: '#fbeae6',
  amber: '#c77d11',
  amberSoft: '#fbf0dd',
  violet: '#6b4fd6',
  violetSoft: '#eee9fb',
  cyan: '#0e8aa8',
  cyanSoft: '#e1f3f8',
};

export const MONO = "'JetBrains Mono', ui-monospace, monospace";
export const SANS = "'Inter', system-ui, sans-serif";

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: C.accent, dark: C.accentH },
    success: { main: C.ok },
    error: { main: C.warn },
    warning: { main: C.amber },
    background: { default: C.bg, paper: C.paper },
    text: { primary: C.ink, secondary: C.muted },
    divider: C.line,
  },
  typography: {
    fontFamily: SANS,
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 9 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
    },
    MuiPaper: {
      styleOverrides: {
        root: { boxShadow: '0 1px 2px rgba(13,15,18,.04)' },
      },
    },
  },
});
