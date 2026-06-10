import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import { api } from '../api/client';
import type { AdminOrder, AdminProduct, Dashboard, Page, Rates } from '../api/types';
import { C, MONO } from '../theme';
import { Card, Mono, StatusBadge } from '../components/ui';
import { DELIVERY_SHORT, fmtDateTime, fmtMoney, STATUS_META } from '../format';

function MetricIcon({ paths, color }: { paths: string[]; color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<Dashboard>('/api/admin/dashboard'),
    refetchInterval: 30_000,
  });
  const rates = useQuery({
    queryKey: ['rates'],
    queryFn: () => api.get<Rates>('/api/admin/rates'),
  });
  const newOrders = useQuery({
    queryKey: ['orders', 'NEW'],
    queryFn: () => api.get<AdminOrder[]>('/api/admin/orders?status=NEW&size=20'),
    refetchInterval: 30_000,
  });
  const zeroStock = useQuery({
    queryKey: ['products', 'zero-stock'],
    queryFn: () => api.get<Page<AdminProduct>>('/api/admin/products?size=200&includeInactive=true'),
    select: (page) => page.content.filter((p) => p.stockQty === 0).slice(0, 6),
  });

  const d = dashboard.data;
  const isBank = (rates.data?.mode ?? 'BANK') === 'BANK';
  const usdRate = rates.data?.usd ?? d?.usdRate ?? null;

  const metrics = [
    {
      label: 'Новые заказы',
      value: d ? String(d.newOrders) : '…',
      delta: 'требуют обработки',
      deltaColor: C.accent,
      iconBg: C.accentSoft,
      iconColor: C.accent,
      paths: ['M9 4H5a2 2 0 0 0-2 2v14l3-2 3 2 3-2 3 2V6a2 2 0 0 0-2-2h-4', 'M9 8h6M9 12h6M9 16h4'],
      onClick: () => navigate('/orders'),
    },
    {
      label: 'Заказов сегодня',
      value: d ? String(d.ordersToday) : '…',
      delta: 'за текущий день',
      deltaColor: C.ok,
      iconBg: C.paper3,
      iconColor: C.ink2,
      paths: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
      onClick: () => navigate('/orders'),
    },
    {
      label: 'Нулевой остаток',
      value: d ? String(d.zeroStockProducts) : '…',
      delta: 'позиций распродано',
      deltaColor: C.warn,
      iconBg: C.warnSoft,
      iconColor: C.warn,
      paths: ['M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z', 'M12 9v4M12 17h.01'],
      onClick: () => navigate('/products'),
    },
    {
      label: 'Курс USD → MDL',
      value: usdRate != null ? Number(usdRate).toFixed(2) : '…',
      delta: isBank ? 'источник: НБМ' : 'задан вручную',
      deltaColor: isBank ? C.ok : C.amber,
      iconBg: C.okSoft,
      iconColor: C.ok,
      paths: ['M12 1v22', 'M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'],
      onClick: () => navigate('/rates'),
    },
  ];

  const orders = newOrders.data ?? [];

  return (
    <Box sx={{ animation: 'aIn .25s ease both' }}>
      {/* METRICS */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
        {metrics.map((m) => (
          <Card key={m.label} sx={{ p: '18px 20px', cursor: 'pointer' }}>
            <Box onClick={m.onClick}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '9px', mb: '14px' }}>
                <Box sx={{ width: 32, height: 32, borderRadius: '9px', background: m.iconBg, display: 'grid', placeItems: 'center' }}>
                  <MetricIcon paths={m.paths} color={m.iconColor} />
                </Box>
                <Box sx={{ fontSize: '12.5px', color: C.muted, fontWeight: 500 }}>{m.label}</Box>
              </Box>
              <Box sx={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, letterSpacing: '-.01em', lineHeight: 1 }}>{m.value}</Box>
              <Box sx={{ fontSize: 12, color: m.deltaColor, mt: '8px' }}>{m.delta}</Box>
            </Box>
          </Card>
        ))}
      </Box>

      {orders.length === 0 && !newOrders.isLoading ? (
        <Card sx={{ p: '64px 32px', textAlign: 'center', mt: '18px' }}>
          <Box sx={{ width: 64, height: 64, borderRadius: '16px', background: C.okSoft, display: 'grid', placeItems: 'center', m: '0 auto 18px', color: C.ok }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m5 13 4 4L19 7" />
            </svg>
          </Box>
          <Box sx={{ fontSize: 18, fontWeight: 700, mb: '6px' }}>Новых заказов нет</Box>
          <Box sx={{ fontSize: 14, color: C.muted }}>Все заказы обработаны. Новые появятся здесь и в счётчике сверху.</Box>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: '18px', mt: '18px', alignItems: 'start' }}>
          {/* NEW ORDERS */}
          <Card>
            <Box sx={{ p: '16px 20px', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Box sx={{ fontWeight: 700, fontSize: 15 }}>Новые заказы</Box>
                <Mono sx={{ fontSize: '11.5px', fontWeight: 700, color: C.accent, background: C.accentSoft, borderRadius: '6px', p: '2px 8px' }}>
                  {orders.length}
                </Mono>
              </Box>
              <Box
                component="button"
                onClick={() => navigate('/orders')}
                sx={{ background: 0, border: 0, color: C.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Все заказы →
              </Box>
            </Box>
            <Box sx={{ p: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {orders.map((o) => (
                <Box
                  key={o.id}
                  component="button"
                  onClick={() => navigate(`/orders/${o.id}`)}
                  sx={{
                    textAlign: 'left',
                    background: C.paper2,
                    border: `1px solid ${C.line}`,
                    borderRadius: '11px',
                    p: '14px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    fontFamily: 'inherit',
                    width: '100%',
                    '&:hover': { borderColor: C.accent, background: '#fff' },
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', mb: '5px' }}>
                      <Mono sx={{ fontWeight: 700, fontSize: '13.5px' }}>{o.number}</Mono>
                      <StatusBadge
                        label={STATUS_META[o.status].label}
                        color={STATUS_META[o.status].color}
                        bg={STATUS_META[o.status].bg}
                        sx={{ fontSize: '10.5px', px: '7px', py: '2px', borderRadius: '5px' }}
                      />
                    </Box>
                    <Box sx={{ fontSize: '13.5px', fontWeight: 600 }}>{o.customerName}</Box>
                    <Box sx={{ fontSize: 12, color: C.muted, mt: '3px' }}>
                      {o.items.reduce((a, i) => a + i.qty, 0)} поз. · {DELIVERY_SHORT[o.deliveryMethod]?.toLowerCase()} · {fmtDateTime(o.createdAt)}
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    <Mono sx={{ fontWeight: 700, fontSize: 17, whiteSpace: 'nowrap' }}>
                      {fmtMoney(o.grandTotal)}{' '}
                      <Box component="span" sx={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>
                        MDL
                      </Box>
                    </Mono>
                  </Box>
                </Box>
              ))}
            </Box>
          </Card>

          {/* RIGHT COLUMN */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <Card sx={{ p: '18px 20px' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '14px' }}>
                <Box sx={{ fontWeight: 700, fontSize: 15 }}>Курс USD → MDL</Box>
                <Box
                  component="span"
                  sx={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    color: isBank ? C.ok : C.amber,
                    background: isBank ? C.okSoft : C.amberSoft,
                    borderRadius: '5px',
                    p: '3px 8px',
                  }}
                >
                  {isBank ? 'курс НБМ' : 'ручной'}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <Mono sx={{ fontWeight: 700, fontSize: 34, letterSpacing: '-.01em' }}>
                  {usdRate != null ? Number(usdRate).toFixed(2) : '—'}
                </Mono>
                <Box sx={{ fontSize: 13, color: C.muted }}>MDL за $1</Box>
              </Box>
              <Box sx={{ fontSize: 12, color: C.muted, mt: '8px' }}>{isBank ? 'источник: НБМ' : 'задан вручную'}</Box>
              <Box
                component="button"
                onClick={() => navigate('/rates')}
                sx={{
                  mt: '14px',
                  width: '100%',
                  background: C.paper2,
                  border: `1px solid ${C.line}`,
                  color: C.ink2,
                  borderRadius: '9px',
                  p: '9px',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Настроить курс и наценку →
              </Box>
            </Card>

            <Card>
              <Box sx={{ p: '16px 20px', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: C.warn }} />
                <Box sx={{ fontWeight: 700, fontSize: 15 }}>Нулевой остаток</Box>
                <Mono sx={{ fontSize: '11.5px', fontWeight: 700, color: C.warn, background: C.warnSoft, borderRadius: '6px', p: '2px 8px' }}>
                  {d?.zeroStockProducts ?? '…'}
                </Mono>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                {(zeroStock.data ?? []).map((p) => (
                  <Box
                    key={p.id}
                    component="button"
                    onClick={() => navigate(`/products/${p.id}`)}
                    sx={{
                      textAlign: 'left',
                      background: 'transparent',
                      border: 0,
                      borderBottom: `1px solid ${C.line2}`,
                      p: '13px 20px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontFamily: 'inherit',
                      width: '100%',
                      '&:hover': { background: C.paper2 },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ fontSize: '13.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name}
                      </Box>
                      <Mono sx={{ fontSize: '11.5px', color: C.muted, mt: '3px', display: 'block' }}>
                        {p.sku}
                        {p.shelf ? ` · полка ${p.shelf}` : ''}
                      </Mono>
                    </Box>
                    <Mono sx={{ fontSize: '11.5px', fontWeight: 700, color: C.warn }}>0 шт</Mono>
                  </Box>
                ))}
                {(zeroStock.data ?? []).length === 0 && (
                  <Box sx={{ p: '18px 20px', fontSize: 13, color: C.muted }}>Все товары в наличии.</Box>
                )}
              </Box>
            </Card>
          </Box>
        </Box>
      )}
    </Box>
  );
}
