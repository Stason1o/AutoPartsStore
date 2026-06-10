import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useAuth } from '../auth/AuthContext';
import { C, MONO } from '../theme';
import { Field, HexLogo } from '../components/ui';
import { ApiError } from '../api/client';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || busy) return;
    setBusy(true);
    setError('');
    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось войти. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `radial-gradient(800px 500px at 70% -10%, ${C.g780}, ${C.g900})`,
        display: 'grid',
        placeItems: 'center',
        p: '24px',
      }}
    >
      <Box
        component="form"
        onSubmit={submit}
        sx={{
          width: '100%',
          maxWidth: 400,
          background: C.paper,
          borderRadius: '16px',
          p: '34px 32px',
          boxShadow: '0 24px 60px rgba(0,0,0,.4)',
          animation: 'aIn .25s ease both',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '13px', mb: '26px' }}>
          <HexLogo size={42} />
          <Box sx={{ lineHeight: 1 }}>
            <Box sx={{ fontWeight: 800, fontSize: 17, letterSpacing: '.1em', color: C.ink }}>SACRAMENTO</Box>
            <Box sx={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.22em', color: C.muted2, mt: '5px' }}>ADMIN PANEL</Box>
          </Box>
        </Box>

        <Box sx={{ fontSize: 19, fontWeight: 700, mb: '6px' }}>Вход в админ-панель</Box>
        <Box sx={{ fontSize: '13.5px', color: C.muted, mb: '22px' }}>Авторизуйтесь, чтобы управлять магазином.</Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Field label="Логин" value={username} onChange={setUsername} placeholder="admin" mono />
          <Field label="Пароль" value={password} onChange={setPassword} type="password" placeholder="••••••••••" mono />
        </Box>

        {error && (
          <Box
            sx={{
              mt: '16px',
              background: C.warnSoft,
              border: '1px solid #f3cabf',
              color: C.warn,
              borderRadius: '9px',
              p: '11px 14px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {error}
          </Box>
        )}

        <Button
          type="submit"
          fullWidth
          disabled={busy || !username || !password}
          sx={{
            mt: '22px',
            background: C.accent,
            color: '#fff',
            borderRadius: '10px',
            py: '12px',
            fontWeight: 700,
            fontSize: 14,
            '&:hover': { background: C.accentH },
            '&.Mui-disabled': { background: C.accentSoft, color: C.accent },
          }}
        >
          {busy ? 'Вход…' : 'Войти'}
        </Button>
      </Box>
    </Box>
  );
}
