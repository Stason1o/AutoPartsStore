import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import InputBase from '@mui/material/InputBase';
import { api } from '../api/client';
import type { AdminOrder, OrderStatus } from '../api/types';
import { C, MONO } from '../theme';
import { Card, Mono, StatusBadge, TableHead } from '../components/ui';
import {
  allowedTransitions,
  DELIVERY_LABEL,
  fmtDateTime,
  fmtMoney,
  PAYMENT_LABEL,
  STATUS_FLOW,
  STATUS_META,
} from '../format';
import { useToast } from '../components/Toast';

export default function OrderCardPage() {
  const { id } = useParams();
  const orderId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [confirm, setConfirm] = useState<OrderStatus | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountVal, setDiscountVal] = useState('');
  const viewedSent = useRef(false);

  const order = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => api.get<AdminOrder>(`/api/admin/orders/${orderId}`),
  });
  const o = order.data;

  // Снимаем флажок «новый» при открытии
  useEffect(() => {
    if (o && !o.viewed && !viewedSent.current) {
      viewedSent.current = true;
      api.post(`/api/admin/orders/${orderId}/viewed`).then(() => {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      }).catch(() => {});
    }
  }, [o, orderId, queryClient]);

  // Инициализация поля скидки из заказа
  useEffect(() => {
    if (!o) return;
    if (o.discountPercent != null && Number(o.discountPercent) > 0) {
      setDiscountType('percent');
      setDiscountVal(String(o.discountPercent));
    } else if (o.discountAmount != null && Number(o.discountAmount) > 0) {
      setDiscountType('amount');
      setDiscountVal(String(o.discountAmount));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o?.id]);

  const refresh = (updated: AdminOrder) => {
    queryClient.setQueryData(['order', orderId], updated);
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const statusMut = useMutation({
    mutationFn: ({ status, reason }: { status: OrderStatus; reason?: string }) =>
      api.post<AdminOrder>(`/api/admin/orders/${orderId}/status`, { status, reason }),
    onSuccess: (updated) => {
      refresh(updated);
      setConfirm(null);
      setCancelReason('');
      toast('Статус заказа обновлён');
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const wholesaleMut = useMutation({
    mutationFn: (wholesale: boolean) => api.post<AdminOrder>(`/api/admin/orders/${orderId}/wholesale`, { wholesale }),
    onSuccess: (updated) => {
      refresh(updated);
      toast(updated.wholesale ? 'Применены оптовые цены' : 'Применены розничные цены');
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const discountMut = useMutation({
    mutationFn: (body: { percent?: number; amount?: number }) =>
      api.post<AdminOrder>(`/api/admin/orders/${orderId}/discount`, body),
    onSuccess: (updated) => {
      refresh(updated);
      toast('Скидка применена');
    },
    onError: (e) => toast(e.message, 'error'),
  });

  if (order.isLoading) return <Box sx={{ p: '40px', fontSize: 14, color: C.muted }}>Загрузка…</Box>;
  if (!o) return <Box sx={{ p: '40px', fontSize: 14, color: C.warn }}>Заказ не найден.</Box>;

  const meta = STATUS_META[o.status];
  const allowed = allowedTransitions(o.status);
  const discount =
    o.discountPercent != null && Number(o.discountPercent) > 0
      ? (Number(o.itemsTotal) * Number(o.discountPercent)) / 100
      : Number(o.discountAmount ?? 0);

  const applyDiscount = () => {
    const v = Number(discountVal.replace(',', '.'));
    if (!Number.isFinite(v) || v < 0) {
      toast('Введите корректное значение скидки', 'error');
      return;
    }
    discountMut.mutate(discountType === 'percent' ? { percent: v } : { amount: v });
  };

  const itemsGrid = 'minmax(0,1fr) 60px 110px 120px';

  return (
    <Box sx={{ animation: 'aIn .25s ease both' }}>
      {/* header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px', mb: '20px', '@media print': { display: 'none' } }}>
        <Box
          component="button"
          onClick={() => navigate('/orders')}
          sx={{
            width: 38,
            height: 38,
            borderRadius: '9px',
            background: C.paper,
            border: `1px solid ${C.line}`,
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            color: C.ink2,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <Mono sx={{ fontWeight: 700, fontSize: 21 }}>{o.number}</Mono>
          <StatusBadge label={meta.label} color={meta.color} bg={meta.bg} sx={{ fontSize: 12, px: '11px' }} />
          <Box sx={{ fontSize: 13, color: C.muted }}>{fmtDateTime(o.createdAt)}</Box>
        </Box>
        <Box
          component="button"
          onClick={() => window.print()}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: C.paper,
            border: `1px solid ${C.line}`,
            color: C.ink2,
            borderRadius: '9px',
            p: '10px 16px',
            fontWeight: 600,
            fontSize: '13.5px',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
          </svg>
          Печать
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 330px', gap: '18px', alignItems: 'start', '@media print': { gridTemplateColumns: '1fr' } }}>
        {/* LEFT */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <Card>
            <Box sx={{ p: '15px 20px', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <Box sx={{ fontWeight: 700, fontSize: 15 }}>Состав заказа</Box>
              <Box sx={{ display: 'flex', background: C.paper3, borderRadius: '9px', p: '3px', '@media print': { display: 'none' } }}>
                {([
                  [false, 'Розница'],
                  [true, 'Опт'],
                ] as const).map(([w, label]) => (
                  <Box
                    key={label}
                    component="button"
                    onClick={() => o.wholesale !== w && wholesaleMut.mutate(w)}
                    disabled={wholesaleMut.isPending}
                    sx={{
                      background: o.wholesale === w ? C.paper : 'transparent',
                      color: o.wholesale === w ? C.ink : C.muted,
                      boxShadow: o.wholesale === w ? '0 1px 3px rgba(0,0,0,.12)' : 'none',
                      border: 0,
                      borderRadius: '7px',
                      p: '6px 14px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {label}
                  </Box>
                ))}
              </Box>
            </Box>
            <TableHead
              gridTemplateColumns={itemsGrid}
              columns={[
                'Артикул / название',
                <Box key="q" sx={{ textAlign: 'center' }}>Кол-во</Box>,
                <Box key="p" sx={{ textAlign: 'right' }}>Цена</Box>,
                <Box key="s" sx={{ textAlign: 'right' }}>Сумма</Box>,
              ]}
            />
            {o.items.map((it) => (
              <Box
                key={it.productId}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: itemsGrid,
                  gap: '10px',
                  p: '13px 20px',
                  borderBottom: `1px solid ${C.line2}`,
                  alignItems: 'center',
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Box
                    onClick={() => navigate(`/products/${it.productId}`)}
                    sx={{ fontFamily: MONO, fontSize: '11.5px', color: C.accent, fontWeight: 600, cursor: 'pointer', width: 'fit-content' }}
                  >
                    {it.sku}
                  </Box>
                  <Box sx={{ fontSize: 13, mt: '2px' }}>{it.name}</Box>
                </Box>
                <Mono sx={{ fontSize: '13.5px', textAlign: 'center', fontWeight: 600 }}>{it.qty}</Mono>
                <Mono sx={{ fontSize: 13, textAlign: 'right', color: C.muted }}>{fmtMoney(it.appliedPrice)}</Mono>
                <Mono sx={{ fontSize: 14, textAlign: 'right', fontWeight: 700 }}>{fmtMoney(Number(it.appliedPrice) * it.qty)}</Mono>
              </Box>
            ))}

            {/* discount + totals */}
            <Box sx={{ p: '16px 20px', background: C.paper2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', mb: '14px', flexWrap: 'wrap', '@media print': { display: 'none' } }}>
                <Box sx={{ fontSize: 13, fontWeight: 600, color: C.ink2 }}>Скидка</Box>
                <Box sx={{ display: 'flex', background: C.paper3, borderRadius: '8px', p: '3px' }}>
                  {([
                    ['percent', '%'],
                    ['amount', 'сумма'],
                  ] as const).map(([t, label]) => (
                    <Box
                      key={t}
                      component="button"
                      onClick={() => setDiscountType(t)}
                      sx={{
                        background: discountType === t ? C.accent : C.paper2,
                        color: discountType === t ? '#fff' : C.muted,
                        border: 0,
                        borderRadius: '6px',
                        p: '5px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {label}
                    </Box>
                  ))}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <InputBase
                    value={discountVal}
                    onChange={(e) => setDiscountVal(e.target.value)}
                    sx={{
                      width: 90,
                      height: 36,
                      border: `1.5px solid ${C.line}`,
                      borderRadius: '8px',
                      px: '12px',
                      fontFamily: MONO,
                      fontSize: '13.5px',
                      background: '#fff',
                      '& input': { textAlign: 'right', p: 0 },
                      '&.Mui-focused': { borderColor: C.accent },
                    }}
                  />
                  <Mono sx={{ fontSize: '12.5px', color: C.muted, width: 34 }}>{discountType === 'percent' ? '%' : 'MDL'}</Mono>
                </Box>
                <Box
                  component="button"
                  onClick={applyDiscount}
                  disabled={discountMut.isPending}
                  sx={{
                    background: C.accentSoft,
                    color: C.accentH,
                    border: 0,
                    borderRadius: '7px',
                    p: '8px 14px',
                    fontWeight: 600,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Применить
                </Box>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.muted, mb: '7px' }}>
                <span>Товары</span>
                <Mono sx={{ color: C.ink }}>{fmtMoney(o.itemsTotal)} MDL</Mono>
              </Box>
              {discount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.warn, mb: '7px' }}>
                  <span>Скидка</span>
                  <Mono>−{fmtMoney(discount)} MDL</Mono>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.muted, mb: '12px' }}>
                <span>Доставка</span>
                <Mono sx={{ color: C.ink }}>{fmtMoney(o.deliveryFee)} MDL</Mono>
              </Box>
              <Box sx={{ borderTop: `1px solid ${C.line}`, pt: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Box sx={{ fontWeight: 700, fontSize: '14.5px' }}>Итого</Box>
                <Mono sx={{ fontWeight: 700, fontSize: 22 }}>
                  {fmtMoney(o.grandTotal)}{' '}
                  <Box component="span" sx={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>
                    MDL
                  </Box>
                </Mono>
              </Box>
            </Box>
          </Card>

          {/* status changer */}
          <Card sx={{ p: '18px 20px', '@media print': { display: 'none' } }}>
            <Box sx={{ fontWeight: 700, fontSize: 15, mb: '14px' }}>Смена статуса</Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {[...STATUS_FLOW, 'CANCELLED' as OrderStatus].map((k) => {
                const m = STATUS_META[k];
                const current = o.status === k;
                const enabled = allowed.includes(k);
                return (
                  <Box
                    key={k}
                    component="button"
                    disabled={!enabled}
                    onClick={() => enabled && setConfirm(k)}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      background: m.bg,
                      color: m.color,
                      border: `1.5px solid ${current ? m.color : m.bg}`,
                      borderRadius: '8px',
                      p: '8px 13px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: enabled ? 'pointer' : 'default',
                      opacity: enabled || current ? 1 : 0.45,
                      fontFamily: 'inherit',
                    }}
                  >
                    {current && <Box sx={{ width: 7, height: 7, borderRadius: '50%', background: m.color }} />}
                    {m.label}
                  </Box>
                );
              })}
            </Box>
            {o.status === 'CANCELLED' && o.cancelReason && (
              <Box sx={{ mt: '14px', fontSize: 13, color: C.warn }}>Причина отмены: {o.cancelReason}</Box>
            )}
          </Card>
        </Box>

        {/* RIGHT */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <Card sx={{ p: '18px 20px' }}>
            <Mono sx={{ fontSize: '10.5px', letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase', display: 'block', mb: '13px' }}>
              Клиент
            </Mono>
            <Box sx={{ fontSize: 15, fontWeight: 700, mb: '10px' }}>{o.customerName}</Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '7px', fontSize: 13 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <Box sx={{ color: C.muted }}>Телефон</Box>
                <Mono>{o.phone}</Mono>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <Box sx={{ color: C.muted }}>E-mail</Box>
                <Mono>{o.email || '—'}</Mono>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                <Box sx={{ color: C.muted }}>Тип цен</Box>
                <Box
                  component="span"
                  sx={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: o.wholesale ? C.violet : C.ink2,
                    background: o.wholesale ? C.violetSoft : C.paper3,
                    borderRadius: '5px',
                    px: '8px',
                    py: '2px',
                  }}
                >
                  {o.wholesale ? 'опт' : 'розница'}
                </Box>
              </Box>
            </Box>
          </Card>

          <Card sx={{ p: '18px 20px' }}>
            <Mono sx={{ fontSize: '10.5px', letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase', display: 'block', mb: '13px' }}>
              Получение и оплата
            </Mono>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '13.5px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <Box sx={{ color: C.muted }}>Способ</Box>
                <Box sx={{ fontWeight: 600, textAlign: 'right' }}>{DELIVERY_LABEL[o.deliveryMethod]}</Box>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <Box sx={{ color: C.muted }}>Доставка</Box>
                <Mono>{Number(o.deliveryFee) > 0 ? `${fmtMoney(o.deliveryFee)} MDL` : 'бесплатно'}</Mono>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <Box sx={{ color: C.muted }}>Оплата</Box>
                <Box sx={{ fontWeight: 600, textAlign: 'right' }}>{PAYMENT_LABEL[o.paymentMethod] ?? '—'}</Box>
              </Box>
            </Box>
          </Card>

          {o.comment && (
            <Box sx={{ background: C.amberSoft, border: '1px solid #f0dcb8', borderRadius: '13px', p: '16px 18px' }}>
              <Mono sx={{ fontSize: '10.5px', letterSpacing: '.1em', color: C.amber, textTransform: 'uppercase', display: 'block', mb: '9px' }}>
                Комментарий
              </Mono>
              <Box sx={{ fontSize: '13.5px', color: C.ink2, lineHeight: 1.5 }}>{o.comment}</Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* STATUS CONFIRM MODAL */}
      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        PaperProps={{ sx: { borderRadius: '16px', p: '28px', maxWidth: 440, width: '100%' } }}
      >
        {confirm && (
          <>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                background: confirm === 'CANCELLED' ? C.warnSoft : C.accentSoft,
                color: confirm === 'CANCELLED' ? C.warn : C.accent,
                display: 'grid',
                placeItems: 'center',
                mb: '18px',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
                <path d="M3 8l9 5 9-5M12 13v8" />
              </svg>
            </Box>
            <Box sx={{ fontSize: 18, fontWeight: 700, mb: '8px' }}>Сменить статус на «{STATUS_META[confirm].label}»?</Box>
            <Box sx={{ fontSize: '13.5px', color: C.muted, lineHeight: 1.6, mb: '20px' }}>
              {confirm === 'CONFIRMED'
                ? 'Остатки по позициям заказа будут зарезервированы на складе.'
                : confirm === 'CANCELLED'
                  ? 'Заказ будет отменён, резерв по позициям снят. Укажите причину отмены.'
                  : 'Статус заказа будет обновлён.'}
            </Box>
            {confirm === 'CANCELLED' && (
              <InputBase
                multiline
                minRows={3}
                placeholder="Причина отмены…"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                sx={{
                  width: '100%',
                  border: `1.5px solid ${C.line}`,
                  borderRadius: '9px',
                  p: '11px 13px',
                  fontSize: 14,
                  mb: '20px',
                  '&.Mui-focused': { borderColor: C.accent },
                }}
              />
            )}
            <Box sx={{ display: 'flex', gap: '10px' }}>
              <Box
                component="button"
                onClick={() => setConfirm(null)}
                sx={{
                  flex: 1,
                  background: C.paper2,
                  border: `1px solid ${C.line}`,
                  color: C.ink2,
                  borderRadius: '10px',
                  p: '12px',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Отмена
              </Box>
              <Box
                component="button"
                disabled={statusMut.isPending}
                onClick={() =>
                  statusMut.mutate({ status: confirm, reason: confirm === 'CANCELLED' ? cancelReason.trim() || undefined : undefined })
                }
                sx={{
                  flex: 1,
                  background: confirm === 'CANCELLED' ? C.warn : C.accent,
                  color: '#fff',
                  border: 0,
                  borderRadius: '10px',
                  p: '12px',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  '&:disabled': { opacity: 0.6 },
                }}
              >
                {statusMut.isPending ? 'Сохранение…' : 'Подтвердить'}
              </Box>
            </Box>
          </>
        )}
      </Dialog>
    </Box>
  );
}
