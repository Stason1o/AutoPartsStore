import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import { api } from '../api/client';
import type { RateRow, Rates } from '../api/types';
import { C, MONO } from '../theme';
import { Card, FieldLabel, Mono } from '../components/ui';
import { fmtDate } from '../format';
import { useToast } from '../components/Toast';

export default function RatesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const rates = useQuery({ queryKey: ['rates'], queryFn: () => api.get<Rates>('/api/admin/rates') });
  const history = useQuery({
    queryKey: ['rates-history'],
    queryFn: () => api.get<RateRow[]>('/api/admin/rates/history?currency=USD&limit=30'),
  });

  const [manualRate, setManualRate] = useState('');
  const [markup, setMarkup] = useState('');
  const [rounding, setRounding] = useState('NONE');

  useEffect(() => {
    if (!rates.data) return;
    if (rates.data.usd != null) setManualRate(String(rates.data.usd));
    setMarkup(rates.data.globalMarkupPercent != null ? String(rates.data.globalMarkupPercent) : '');
    setRounding(rates.data.roundingRule ?? 'NONE');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rates.data?.mode, rates.data?.roundingRule]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['rates'] });
    queryClient.invalidateQueries({ queryKey: ['rates-history'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const modeMut = useMutation({
    mutationFn: (mode: 'BANK' | 'MANUAL') => api.post('/api/admin/rates/mode', { mode }),
    onSuccess: () => {
      invalidate();
      toast('Источник курса обновлён');
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const manualMut = useMutation({
    mutationFn: (rate: number) => api.post('/api/admin/rates/manual', { currency: 'USD', rate }),
    onSuccess: () => {
      invalidate();
      toast('Ручной курс сохранён');
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const saveRules = useMutation({
    mutationFn: async () => {
      const percent = Number(markup.replace(',', '.'));
      if (!Number.isFinite(percent) || percent < 0) throw new Error('Некорректная наценка');
      await api.put('/api/admin/rates/markup', { percent });
      await api.put('/api/admin/rates/rounding', { rule: rounding });
    },
    onSuccess: () => {
      invalidate();
      toast('Правила цен сохранены, цены пересчитаны');
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const isBank = (rates.data?.mode ?? 'BANK') === 'BANK';
  const usd = rates.data?.usd != null ? Number(rates.data.usd).toFixed(2) : '—';
  const rows = history.data ?? [];

  return (
    <Box sx={{ animation: 'aIn .25s ease both', display: 'grid', gridTemplateColumns: '1fr 360px', gap: '18px', alignItems: 'start' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* source */}
        <Card sx={{ p: '22px' }}>
          <Box sx={{ fontWeight: 700, fontSize: 15, mb: '6px' }}>Источник курса USD → MDL</Box>
          <Box sx={{ fontSize: 13, color: C.muted, mb: '16px' }}>Курс используется для пересчёта закупочных цен в леи.</Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Box
              component="button"
              onClick={() => !isBank && modeMut.mutate('BANK')}
              sx={{
                textAlign: 'left',
                border: `1.5px solid ${isBank ? C.accent : C.line}`,
                background: isBank ? C.accentSoft : C.paper,
                borderRadius: '12px',
                p: '18px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '8px' }}>
                <Box sx={{ fontWeight: 700, fontSize: 14 }}>Курс НБМ</Box>
                <Box sx={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${isBank ? C.accent : C.line}`, display: 'grid', placeItems: 'center' }}>
                  {isBank && <Box sx={{ width: 9, height: 9, borderRadius: '50%', background: C.accent }} />}
                </Box>
              </Box>
              <Box sx={{ fontSize: '12.5px', color: C.muted, lineHeight: 1.5 }}>
                Автоматически, ежедневно. Сейчас: <Mono sx={{ color: C.ink }}>{usd}</Mono>
              </Box>
            </Box>

            <Box
              component="button"
              onClick={() => isBank && modeMut.mutate('MANUAL')}
              sx={{
                textAlign: 'left',
                border: `1.5px solid ${!isBank ? C.accent : C.line}`,
                background: !isBank ? C.accentSoft : C.paper,
                borderRadius: '12px',
                p: '18px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '8px' }}>
                <Box sx={{ fontWeight: 700, fontSize: 14 }}>Вручную</Box>
                <Box sx={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${!isBank ? C.accent : C.line}`, display: 'grid', placeItems: 'center' }}>
                  {!isBank && <Box sx={{ width: 9, height: 9, borderRadius: '50%', background: C.accent }} />}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                <InputBase
                  value={manualRate}
                  disabled={isBank}
                  onChange={(e) => setManualRate(e.target.value)}
                  sx={{
                    flex: 1,
                    height: 40,
                    border: `1.5px solid ${C.line}`,
                    borderRadius: '8px',
                    px: '12px',
                    fontFamily: MONO,
                    fontSize: 15,
                    fontWeight: 700,
                    opacity: isBank ? 0.5 : 1,
                    background: '#fff',
                    '&.Mui-focused': { borderColor: C.accent },
                    '& input': { p: 0 },
                  }}
                />
                {!isBank && (
                  <Box
                    component="button"
                    onClick={() => {
                      const v = Number(manualRate.replace(',', '.'));
                      if (!Number.isFinite(v) || v <= 0) {
                        toast('Введите корректный курс', 'error');
                        return;
                      }
                      manualMut.mutate(v);
                    }}
                    sx={{
                      background: C.accent,
                      color: '#fff',
                      border: 0,
                      borderRadius: '8px',
                      px: '14px',
                      fontWeight: 700,
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    OK
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Card>

        {/* price rules */}
        <Card sx={{ p: '22px' }}>
          <Box sx={{ fontWeight: 700, fontSize: 15, mb: '16px' }}>Правила формирования цен</Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Box component="label" sx={{ display: 'block' }}>
              <FieldLabel>Глобальная наценка, %</FieldLabel>
              <InputBase
                value={markup}
                onChange={(e) => setMarkup(e.target.value)}
                sx={{
                  width: '100%',
                  height: 44,
                  border: `1.5px solid ${C.line}`,
                  borderRadius: '9px',
                  px: '13px',
                  fontFamily: MONO,
                  fontSize: 14,
                  fontWeight: 700,
                  '&.Mui-focused': { borderColor: C.accent },
                  '& input': { p: 0 },
                }}
              />
            </Box>
            <Box component="label" sx={{ display: 'block' }}>
              <FieldLabel>Округление цен</FieldLabel>
              <Box
                component="select"
                value={rounding}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRounding(e.target.value)}
                sx={{
                  width: '100%',
                  height: 44,
                  border: `1.5px solid ${C.line}`,
                  borderRadius: '9px',
                  p: '0 12px',
                  fontSize: 14,
                  outline: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: '#fff',
                }}
              >
                <option value="TO_1">до 1 MDL</option>
                <option value="TO_5">до 5 MDL</option>
                <option value="NONE">без округления</option>
              </Box>
            </Box>
          </Box>
          <Box
            component="button"
            onClick={() => saveRules.mutate()}
            disabled={saveRules.isPending}
            sx={{
              mt: '18px',
              background: C.accent,
              color: '#fff',
              border: 0,
              borderRadius: '9px',
              p: '11px 22px',
              fontWeight: 700,
              fontSize: '13.5px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              '&:hover': { background: C.accentH },
              '&:disabled': { opacity: 0.6 },
            }}
          >
            {saveRules.isPending ? 'Сохранение…' : 'Сохранить и пересчитать цены'}
          </Box>
        </Card>
      </Box>

      {/* history */}
      <Card>
        <Box sx={{ p: '15px 20px', borderBottom: `1px solid ${C.line}`, fontWeight: 700, fontSize: 15 }}>История курса USD</Box>
        {history.isLoading && <Box sx={{ p: '18px 20px', fontSize: 13, color: C.muted }}>Загрузка…</Box>}
        {rows.map((h, i) => {
          const prev = rows[i + 1];
          const delta = prev ? Number(h.rate) - Number(prev.rate) : null;
          const deltaStr =
            delta === null ? '—' : delta === 0 ? '0.00' : (delta > 0 ? '+' : '−') + Math.abs(delta).toFixed(2);
          return (
            <Box key={h.date + h.source + i} sx={{ display: 'flex', alignItems: 'center', gap: '12px', p: '12px 20px', borderBottom: `1px solid ${C.line2}` }}>
              <Mono sx={{ fontSize: '12.5px', color: C.muted, flex: 1 }}>{fmtDate(h.date)}</Mono>
              <Box sx={{ fontSize: '10.5px', color: C.muted, background: C.paper3, borderRadius: '5px', p: '2px 7px' }}>
                {h.source === 'BANK' ? 'НБМ' : 'вручную'}
              </Box>
              <Mono sx={{ fontSize: 14, fontWeight: 700, width: 54, textAlign: 'right' }}>{Number(h.rate).toFixed(2)}</Mono>
              <Mono
                sx={{
                  fontSize: '11.5px',
                  color: delta === null || delta === 0 ? C.muted : delta > 0 ? C.ok : C.warn,
                  width: 46,
                  textAlign: 'right',
                }}
              >
                {deltaStr}
              </Mono>
            </Box>
          );
        })}
        {!history.isLoading && rows.length === 0 && (
          <Box sx={{ p: '18px 20px', fontSize: 13, color: C.muted }}>История пока пуста.</Box>
        )}
      </Card>
    </Box>
  );
}
