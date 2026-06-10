import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import { api } from '../api/client';
import type { Vehicle } from '../api/types';
import { C } from '../theme';
import { Card, Field, Mono } from '../components/ui';

interface DecodeResult {
  vin: string;
  make: string | null;
  model: string | null;
  modelYear: number | null;
  candidates: Vehicle[];
}

/**
 * VIN-поиск для админа: локальный WMI-декодер + NHTSA vPIC на бэкенде.
 * Возвращает марку/год и кандидатов из нашего справочника автомобилей.
 */
export default function VinLookupCard() {
  const [vin, setVin] = useState('');
  const [result, setResult] = useState<DecodeResult | null>(null);

  const decode = useMutation({
    mutationFn: () => api.post<DecodeResult>('/api/vin/decode', { vin: vin.trim() }),
    onSuccess: setResult,
  });

  return (
    <Card sx={{ p: '18px 20px', mb: '20px' }}>
      <Box sx={{ fontWeight: 700, fontSize: 15, mb: '4px' }}>Распознавание VIN</Box>
      <Box sx={{ fontSize: 13, color: C.muted, mb: '14px' }}>
        Введите VIN клиента — определим марку и год, покажем подходящие автомобили из справочника.
      </Box>
      <Box sx={{ display: 'flex', gap: '10px', alignItems: 'flex-end', maxWidth: 560 }}>
        <Box sx={{ flex: 1 }}>
          <Field
            label="VIN (17 символов)"
            value={vin}
            onChange={v => { setVin(v.toUpperCase()); setResult(null); }}
            placeholder="WAUZZZ8K9GA123456"
            mono
          />
        </Box>
        <Box
          component="button"
          onClick={() => vin.trim() && decode.mutate()}
          disabled={decode.isPending || vin.trim().length < 11}
          sx={{
            height: 40, px: '20px', borderRadius: '9px', border: 0, cursor: 'pointer',
            background: C.accent, color: '#fff', fontWeight: 700, fontSize: 13.5,
            opacity: decode.isPending || vin.trim().length < 11 ? 0.5 : 1, flexShrink: 0,
          }}
        >
          {decode.isPending ? 'Распознаём…' : 'Распознать'}
        </Box>
      </Box>

      {decode.isError && (
        <Box sx={{ mt: '12px', fontSize: 13, color: C.warn, fontWeight: 600 }}>
          {decode.error instanceof Error ? decode.error.message : 'Не удалось распознать VIN'}
        </Box>
      )}

      {result && (
        <Box sx={{ mt: '16px', borderTop: `1px solid ${C.line}`, pt: '14px' }}>
          <Box sx={{ display: 'flex', gap: '24px', flexWrap: 'wrap', mb: '12px' }}>
            <Box>
              <Box sx={{ fontSize: 11, color: C.muted2, textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'var(--mono, monospace)' }}>Марка</Box>
              <Box sx={{ fontWeight: 700, fontSize: 15 }}>{result.make ?? 'не определена'}</Box>
            </Box>
            <Box>
              <Box sx={{ fontSize: 11, color: C.muted2, textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'var(--mono, monospace)' }}>Модель (vPIC)</Box>
              <Box sx={{ fontWeight: 700, fontSize: 15 }}>{result.model ?? '—'}</Box>
            </Box>
            <Box>
              <Box sx={{ fontSize: 11, color: C.muted2, textTransform: 'uppercase', letterSpacing: '.1em', fontFamily: 'var(--mono, monospace)' }}>Год</Box>
              <Box sx={{ fontWeight: 700, fontSize: 15 }}><Mono>{result.modelYear ?? '—'}</Mono></Box>
            </Box>
          </Box>
          {result.candidates.length === 0 ? (
            <Box sx={{ fontSize: 13, color: C.muted }}>
              В справочнике нет подходящих автомобилей — добавьте модель ниже, и товары можно будет привязать.
            </Box>
          ) : (
            <Box>
              <Box sx={{ fontSize: 12.5, color: C.muted, mb: '8px' }}>Кандидаты из справочника:</Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {result.candidates.map(c => (
                  <Box key={c.id} sx={{ background: C.accentSoft, color: C.accent, borderRadius: '8px', px: '12px', py: '7px', fontSize: 13, fontWeight: 700 }}>
                    {c.display}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Card>
  );
}
