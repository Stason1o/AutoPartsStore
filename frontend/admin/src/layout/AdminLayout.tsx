import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import Popover from '@mui/material/Popover';
import { api } from '../api/client';
import type { Dashboard, Rates } from '../api/types';
import { C, MONO } from '../theme';
import { HexLogo, Mono } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { useNotificationSound } from '../hooks/useNotificationSound';

function NavIcon({ paths, size = 18 }: { paths: string[]; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

const NAV = [
  { to: '/', label: 'Сводка', match: (p: string) => p === '/', icon: ['M3 13h8V3H3zM13 21h8V11h-8zM13 3v6h8V3zM3 21h8v-6H3z'] },
  { to: '/products', label: 'Товары', match: (p: string) => p.startsWith('/products'), icon: ['M21 8 12 3 3 8v8l9 5 9-5z', 'M3 8l9 5 9-5M12 13v8'] },
  { to: '/categories', label: 'Категории', match: (p: string) => p.startsWith('/categories'), icon: ['M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'] },
  { to: '/orders', label: 'Заказы', match: (p: string) => p.startsWith('/orders'), badge: 'orders', icon: ['M9 4H5a2 2 0 0 0-2 2v14l3-2 3 2 3-2 3 2V6a2 2 0 0 0-2-2h-4', 'M9 8h6M9 12h6M9 16h4'] },
  { to: '/chats', label: 'Чаты', match: (p: string) => p.startsWith('/chats'), badge: 'chats', icon: ['M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z'] },
  { to: '/rates', label: 'Курс и цены', match: (p: string) => p.startsWith('/rates'), icon: ['M12 1v22', 'M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'] },
  { to: '/import-export', label: 'Импорт / экспорт', match: (p: string) => p.startsWith('/import-export'), icon: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'] },
  { to: '/applicability', label: 'Применимость', match: (p: string) => p.startsWith('/applicability'), icon: ['M5 17H3v-5l2-5h14l2 5v5h-2', 'M5 17a2 2 0 1 0 4 0M15 17a2 2 0 1 0 4 0', 'M5 17h10'] },
  { to: '/settings', label: 'Настройки', match: (p: string) => p.startsWith('/settings'), icon: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 7.6 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 14H4a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 6 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 10 4.6V4a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 2.4 1.5 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 10H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'] },
];

function pageTitle(path: string): string {
  if (path === '/') return 'Сводка';
  if (path === '/products/new') return 'Новый товар';
  if (/^\/products\/\d+/.test(path)) return 'Редактор товара';
  if (path.startsWith('/products')) return 'Товары';
  if (path.startsWith('/categories')) return 'Категории';
  if (/^\/orders\/\d+/.test(path)) return 'Карточка заказа';
  if (path.startsWith('/orders')) return 'Заказы';
  if (path.startsWith('/chats')) return 'Чаты';
  if (path.startsWith('/rates')) return 'Курс и цены';
  if (path.startsWith('/import-export')) return 'Импорт / экспорт';
  if (path.startsWith('/applicability')) return 'Применимость';
  if (path.startsWith('/settings')) return 'Настройки';
  return 'Админ';
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { username, logout } = useAuth();
  const [search, setSearch] = useState('');
  const [bellAnchor, setBellAnchor] = useState<HTMLElement | null>(null);

  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<Dashboard>('/api/admin/dashboard'),
    refetchInterval: 10_000,
  });
  const rates = useQuery({
    queryKey: ['rates'],
    queryFn: () => api.get<Rates>('/api/admin/rates'),
  });

  const newCount = dashboard.data?.newOrders ?? 0;
  const unreadChats = dashboard.data?.unreadChats ?? 0;
  const totalNotif = newCount + unreadChats;
  const usdRate = rates.data?.usd ?? dashboard.data?.usdRate ?? null;
  const isBank = (rates.data?.mode ?? 'BANK') === 'BANK';

  // Звук при росте счётчиков (новые заказы / непрочитанные чаты).
  const soundCounts = useMemo(
    () => (dashboard.data ? [dashboard.data.newOrders ?? 0, dashboard.data.unreadChats ?? 0] : null),
    [dashboard.data],
  );
  useNotificationSound(soundCounts);

  // Счётчик непрочитанного в заголовке вкладки.
  useEffect(() => {
    const base = 'Sacramento Admin';
    document.title = totalNotif > 0 ? `(${totalNotif}) ${base}` : base;
    return () => {
      document.title = base;
    };
  }, [totalNotif]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: C.bg, color: C.ink, lineHeight: 1.45 }}>
      {/* ===== SIDEBAR ===== */}
      <Box
        component="aside"
        sx={{
          width: 236,
          flexShrink: 0,
          background: C.g850,
          color: '#cfd4dc',
          minHeight: '100vh',
          position: 'sticky',
          top: 0,
          alignSelf: 'flex-start',
          display: 'flex',
          flexDirection: 'column',
          borderRight: `1px solid ${C.g700}`,
          height: '100vh',
        }}
      >
        <Box sx={{ p: '20px 18px', borderBottom: `1px solid ${C.g750}`, display: 'flex', alignItems: 'center', gap: '11px' }}>
          <HexLogo />
          <Box sx={{ lineHeight: 1 }}>
            <Box sx={{ fontWeight: 800, fontSize: 15, letterSpacing: '.1em', color: '#fff' }}>SACRAMENTO</Box>
            <Box sx={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.22em', color: C.muted2, mt: '4px' }}>ADMIN PANEL</Box>
          </Box>
        </Box>

        <Box component="nav" sx={{ p: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV.map((n) => {
            const active = n.match(location.pathname);
            const badgeCount = n.badge === 'orders' ? newCount : n.badge === 'chats' ? unreadChats : 0;
            return (
              <Box
                key={n.to}
                component="button"
                onClick={() => navigate(n.to)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: active ? C.accent : 'transparent',
                  border: 0,
                  borderRadius: '9px',
                  p: '10px 12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  color: active ? '#fff' : '#cfd4dc',
                  transition: 'background .12s',
                  fontFamily: 'inherit',
                  '&:hover': { background: active ? C.accent : C.g750 },
                }}
              >
                <Box sx={{ width: 20, height: 20, display: 'grid', placeItems: 'center', flexShrink: 0, color: active ? '#fff' : C.muted2 }}>
                  <NavIcon paths={n.icon} />
                </Box>
                <Box component="span" sx={{ fontSize: 14, fontWeight: active ? 700 : 500, flex: 1 }}>
                  {n.label}
                </Box>
                {badgeCount > 0 && (
                  <Box
                    component="span"
                    sx={{
                      fontFamily: MONO,
                      fontSize: 11,
                      fontWeight: 700,
                      background: C.accent,
                      color: '#fff',
                      borderRadius: '20px',
                      minWidth: 20,
                      height: 20,
                      display: 'grid',
                      placeItems: 'center',
                      px: '6px',
                    }}
                  >
                    {badgeCount}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        <Box sx={{ p: '14px 16px', borderTop: `1px solid ${C.g750}`, display: 'flex', alignItems: 'center', gap: '11px' }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: '9px',
              background: C.g700,
              display: 'grid',
              placeItems: 'center',
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 13,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {(username ?? 'АД').slice(0, 2).toUpperCase()}
          </Box>
          <Box sx={{ lineHeight: 1.3, minWidth: 0, flex: 1 }}>
            <Box sx={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Администратор
            </Box>
            <Box sx={{ fontSize: '11.5px', color: C.muted2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {username ?? ''}
            </Box>
          </Box>
          <Box
            component="button"
            title="Выйти"
            onClick={() => logout()}
            sx={{
              background: 'transparent',
              border: 0,
              color: C.muted2,
              cursor: 'pointer',
              p: '6px',
              borderRadius: '7px',
              display: 'grid',
              placeItems: 'center',
              '&:hover': { color: '#fff', background: C.g700 },
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5M21 12H9" />
            </svg>
          </Box>
        </Box>
      </Box>

      {/* ===== MAIN ===== */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Box component="header" sx={{ background: C.paper, borderBottom: `1px solid ${C.line}`, position: 'sticky', top: 0, zIndex: 30 }}>
          <Box sx={{ p: '14px 28px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Box component="h1" sx={{ fontSize: 19, fontWeight: 700, m: 0, letterSpacing: '-.01em', whiteSpace: 'nowrap' }}>
              {pageTitle(location.pathname)}
            </Box>
            <Box
              component="form"
              onSubmit={(e) => {
                e.preventDefault();
                if (search.trim()) {
                  navigate(`/products?search=${encodeURIComponent(search.trim())}`);
                  setSearch('');
                }
              }}
              sx={{
                flex: 1,
                maxWidth: 380,
                ml: '12px',
                display: 'flex',
                alignItems: 'center',
                background: C.paper2,
                border: `1px solid ${C.line}`,
                borderRadius: '9px',
                px: '12px',
                height: 40,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted2} strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <InputBase
                placeholder="Поиск по артикулу, названию, бренду…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ flex: 1, fontSize: '13.5px', px: '10px', color: C.ink }}
              />
            </Box>
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  background: C.paper2,
                  border: `1px solid ${C.line}`,
                  borderRadius: '9px',
                  p: '7px 12px',
                  cursor: 'pointer',
                }}
                onClick={() => navigate('/rates')}
              >
                <Mono sx={{ fontSize: 11, color: C.muted }}>USD→MDL</Mono>
                <Mono sx={{ fontWeight: 700, fontSize: 14 }}>{usdRate != null ? Number(usdRate).toFixed(2) : '—'}</Mono>
                <Box
                  component="span"
                  sx={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    color: isBank ? C.ok : C.amber,
                    background: isBank ? C.okSoft : C.amberSoft,
                    borderRadius: '5px',
                    p: '2px 6px',
                  }}
                >
                  {isBank ? 'курс НБМ' : 'ручной'}
                </Box>
              </Box>
              <Box
                component="button"
                onClick={(e: MouseEvent<HTMLElement>) => setBellAnchor(e.currentTarget)}
                sx={{
                  position: 'relative',
                  width: 40,
                  height: 40,
                  borderRadius: '9px',
                  background: C.paper2,
                  border: `1px solid ${C.line}`,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={C.ink2} strokeWidth="2">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                </svg>
                {totalNotif > 0 && (
                  <Box
                    component="span"
                    sx={{
                      position: 'absolute',
                      top: -5,
                      right: -5,
                      fontFamily: MONO,
                      fontSize: '10.5px',
                      fontWeight: 700,
                      background: C.warn,
                      color: '#fff',
                      borderRadius: '20px',
                      minWidth: 19,
                      height: 19,
                      display: 'grid',
                      placeItems: 'center',
                      px: '5px',
                      border: `2px solid ${C.paper}`,
                    }}
                  >
                    {totalNotif}
                  </Box>
                )}
              </Box>
              <Popover
                open={bellAnchor != null}
                anchorEl={bellAnchor}
                onClose={() => setBellAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                  paper: {
                    sx: { mt: '8px', border: `1px solid ${C.line}`, borderRadius: '11px', boxShadow: '0 10px 30px rgba(13,15,18,.12)', minWidth: 250 },
                  },
                }}
              >
                <Box sx={{ p: '6px' }}>
                  {(
                    [
                      { label: 'Новые заказы', count: newCount, to: '/orders' },
                      { label: 'Непрочитанные чаты', count: unreadChats, to: '/chats' },
                    ] as const
                  ).map((row) => (
                    <Box
                      key={row.to}
                      component="button"
                      onClick={() => {
                        setBellAnchor(null);
                        navigate(row.to);
                      }}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        background: 'transparent',
                        border: 0,
                        borderRadius: '8px',
                        p: '10px 12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        color: C.ink,
                        '&:hover': { background: C.paper2 },
                      }}
                    >
                      <Box component="span" sx={{ flex: 1 }}>{row.label}</Box>
                      <Mono
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                          background: row.count > 0 ? C.accent : C.paper3,
                          color: row.count > 0 ? '#fff' : C.muted,
                          borderRadius: '20px',
                          minWidth: 20,
                          height: 20,
                          display: 'grid',
                          placeItems: 'center',
                          px: '6px',
                        }}
                      >
                        {row.count}
                      </Mono>
                    </Box>
                  ))}
                  {totalNotif === 0 && (
                    <Box sx={{ p: '4px 12px 8px', fontSize: '12.5px', color: C.muted }}>Новых уведомлений нет.</Box>
                  )}
                </Box>
              </Popover>
            </Box>
          </Box>
        </Box>

        <Box sx={{ p: '26px 28px 48px', flex: 1 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
