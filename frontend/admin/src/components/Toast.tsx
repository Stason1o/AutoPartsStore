import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Box from '@mui/material/Box';
import { C } from '../theme';

type ToastKind = 'success' | 'error';

interface ToastCtxValue {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastCtx = createContext<ToastCtxValue>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState<ToastKind>('success');

  const toast = useCallback((msg: string, k: ToastKind = 'success') => {
    setMessage(msg);
    setKind(k);
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={2600}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Box
          sx={{
            background: C.g900,
            color: '#fff',
            borderRadius: '11px',
            px: '20px',
            py: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 16px 40px rgba(0,0,0,.35)',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <Box
            sx={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: kind === 'success' ? C.ok : C.warn,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            {kind === 'success' ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                <path d="m5 13 4 4L19 7" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            )}
          </Box>
          {message}
        </Box>
      </Snackbar>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
