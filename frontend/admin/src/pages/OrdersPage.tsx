import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import { api } from '../api/client';
import type { AdminOrder, OrderStatus } from '../api/types';
import { C } from '../theme';
import { Card, Mono, StatusBadge, TableHead } from '../components/ui';
import { DELIVERY_SHORT, fmtDateTime, fmtMoney, STATUS_FLOW, STATUS_META } from '../format';

export default function OrdersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const statusFilter = (params.get('status') ?? 'all') as OrderStatus | 'all';

  const orders = useQuery({
    queryKey: ['orders', 'all'],
    queryFn: () => api.get<AdminOrder[]>('/api/admin/orders?size=100'),
    refetchInterval: 30_000,
  });

  const all = orders.data ?? [];
  const chips: { key: OrderStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'Все' },
    ...STATUS_FLOW.map((k) => ({ key: k, label: STATUS_META[k].label })),
    { key: 'CANCELLED' as OrderStatus, label: STATUS_META.CANCELLED.label },
  ];

  const rows = statusFilter === 'all' ? all : all.filter((o) => o.status === statusFilter);
  const grid = '120px minmax(200px,1fr) 90px 150px 150px 110px 56px';

  return (
    <Box sx={{ animation: 'aIn .25s ease both' }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px', mb: '18px' }}>
        {chips.map((c) => {
          const count = c.key === 'all' ? all.length : all.filter((o) => o.status === c.key).length;
          const active = statusFilter === c.key;
          return (
            <Box
              key={c.key}
              component="button"
              onClick={() => setParams(c.key === 'all' ? {} : { status: c.key }, { replace: true })}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                background: active ? C.g800 : C.paper,
                color: active ? '#fff' : C.ink2,
                border: `1px solid ${active ? C.g800 : C.line}`,
                borderRadius: '8px',
                p: '8px 13px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {c.label}
              <Mono sx={{ fontSize: 11, opacity: 0.7 }}>{count}</Mono>
            </Box>
          );
        })}
      </Box>

      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ minWidth: 840 }}>
            <TableHead
              gridTemplateColumns={grid}
              columns={['Заказ', 'Клиент', 'Позиций', 'Статус', 'Получение', 'Сумма', '']}
            />
            {orders.isLoading && <Box sx={{ p: '24px', fontSize: 13, color: C.muted }}>Загрузка…</Box>}
            {!orders.isLoading && rows.length === 0 && (
              <Box sx={{ p: '40px', textAlign: 'center', fontSize: 14, color: C.muted }}>Заказов с таким статусом нет.</Box>
            )}
            {rows.map((o) => (
              <Box
                key={o.id}
                onClick={() => navigate(`/orders/${o.id}`)}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: grid,
                  alignItems: 'center',
                  gap: '12px',
                  p: '13px 20px',
                  borderBottom: `1px solid ${C.line2}`,
                  cursor: 'pointer',
                  background: !o.viewed && o.status === 'NEW' ? C.accentSoft + '55' : 'transparent',
                  '&:hover': { background: C.paper2 },
                }}
              >
                <Mono sx={{ fontWeight: 700, fontSize: 13, color: C.accent }}>{o.number}</Mono>
                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ fontSize: '13.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {o.customerName}
                  </Box>
                  <Mono sx={{ fontSize: '11.5px', color: C.muted, mt: '2px', display: 'block' }}>{o.phone}</Mono>
                </Box>
                <Mono sx={{ fontSize: 13, color: C.ink2 }}>{o.items.reduce((a, i) => a + i.qty, 0)} поз.</Mono>
                <Box sx={{ justifySelf: 'start' }}>
                  <StatusBadge
                    label={STATUS_META[o.status].label}
                    color={STATUS_META[o.status].color}
                    bg={STATUS_META[o.status].bg}
                  />
                </Box>
                <Box sx={{ fontSize: '12.5px', color: C.ink2 }}>
                  {DELIVERY_SHORT[o.deliveryMethod]}
                  <br />
                  <Box component="span" sx={{ fontSize: 11, color: C.muted }}>
                    {fmtDateTime(o.createdAt)}
                  </Box>
                </Box>
                <Mono sx={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>
                  {fmtMoney(o.grandTotal)}{' '}
                  <Box component="span" sx={{ fontSize: 10, color: C.muted, fontWeight: 500 }}>
                    MDL
                  </Box>
                </Mono>
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: '7px',
                    background: C.paper2,
                    border: `1px solid ${C.line}`,
                    display: 'grid',
                    placeItems: 'center',
                    color: C.muted,
                    justifySelf: 'end',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
