import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import InputBase from '@mui/material/InputBase';
import Pagination from '@mui/material/Pagination';
import { api, qs } from '../api/client';
import type { AdminProduct, Page, Vehicle } from '../api/types';
import { C } from '../theme';
import { Card, Field, Mono, TableHead } from '../components/ui';
import { useToast } from '../components/Toast';
import { useDebounced } from '../hooks/useDebounced';
import VinLookupCard from './VinLookupCard';

interface VehicleForm {
  make: string;
  model: string;
  yearFrom: string;
  yearTo: string;
  engine: string;
}

const EMPTY_FORM: VehicleForm = { make: '', model: '', yearFrom: '', yearTo: '', engine: '' };

export default function ApplicabilityPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<VehicleForm>(EMPTY_FORM);
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [vehiclePage, setVehiclePage] = useState(0);
  const [unmatchedPage, setUnmatchedPage] = useState(0);
  const [assignProduct, setAssignProduct] = useState<AdminProduct | null>(null);
  const [assignFilter, setAssignFilter] = useState('');

  const vehicleSearch = useDebounced(vehicleFilter.trim(), 300);
  const assignSearch = useDebounced(assignFilter.trim(), 300);

  const vehicles = useQuery({
    queryKey: ['vehicles', vehicleSearch, vehiclePage],
    queryFn: () =>
      api.get<Page<Vehicle>>(`/api/admin/vehicles${qs({ search: vehicleSearch, page: vehiclePage, size: 50 })}`),
  });
  const assignVehicles = useQuery({
    queryKey: ['vehicles', 'assign', assignSearch],
    queryFn: () => api.get<Page<Vehicle>>(`/api/admin/vehicles${qs({ search: assignSearch, page: 0, size: 50 })}`),
    enabled: assignProduct !== null,
  });
  const unmatched = useQuery({
    queryKey: ['unmatched', unmatchedPage],
    queryFn: () => api.get<Page<AdminProduct>>(`/api/admin/vehicles/unmatched-products?page=${unmatchedPage}&size=20`),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    queryClient.invalidateQueries({ queryKey: ['unmatched'] });
  };

  const saveVehicle = useMutation({
    mutationFn: () => {
      const body = {
        make: form.make.trim(),
        model: form.model.trim(),
        yearFrom: form.yearFrom ? Number(form.yearFrom) : null,
        yearTo: form.yearTo ? Number(form.yearTo) : null,
        engine: form.engine.trim() || null,
      };
      return editId == null
        ? api.post<Vehicle>('/api/admin/vehicles', body)
        : api.put<Vehicle>(`/api/admin/vehicles/${editId}`, body);
    },
    onSuccess: () => {
      invalidate();
      setEditorOpen(false);
      toast(editId == null ? 'Автомобиль добавлен' : 'Автомобиль обновлён');
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const deleteVehicle = useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/vehicles/${id}`),
    onSuccess: () => {
      invalidate();
      setEditorOpen(false);
      toast('Автомобиль удалён');
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const link = useMutation({
    mutationFn: ({ vehicleId, productId }: { vehicleId: number; productId: number }) =>
      api.post(`/api/admin/vehicles/${vehicleId}/products/${productId}`),
    onSuccess: () => {
      invalidate();
      setAssignProduct(null);
      setAssignFilter('');
      toast('Товар привязан к автомобилю');
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setEditorOpen(true);
  };
  const openEdit = (v: Vehicle) => {
    setEditId(v.id);
    setForm({
      make: v.make,
      model: v.model,
      yearFrom: v.yearFrom != null ? String(v.yearFrom) : '',
      yearTo: v.yearTo != null ? String(v.yearTo) : '',
      engine: v.engine ?? '',
    });
    setEditorOpen(true);
  };

  const rows = vehicles.data?.content ?? [];
  const assignCandidates = assignVehicles.data?.content ?? [];

  const grid = '1fr 140px 140px 40px';

  return (
    <Box sx={{ animation: 'aIn .25s ease both' }}>
    <VinLookupCard />
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '18px', alignItems: 'start' }}>
      {/* directory */}
      <Card>
        <Box sx={{ p: '16px 20px', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <Box sx={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>Справочник автомобилей</Box>
          {vehicles.data && (
            <Mono sx={{ fontSize: '11.5px', color: C.muted, whiteSpace: 'nowrap', flexShrink: 0 }}>
              всего {vehicles.data.totalElements}
            </Mono>
          )}
          <InputBase
            placeholder="Поиск…"
            value={vehicleFilter}
            onChange={(e) => {
              setVehicleFilter(e.target.value);
              setVehiclePage(0);
            }}
            sx={{
              flex: 1,
              maxWidth: 220,
              height: 34,
              border: `1px solid ${C.line}`,
              borderRadius: '8px',
              px: '11px',
              fontSize: 13,
              '&.Mui-focused': { borderColor: C.accent },
            }}
          />
          <Box
            component="button"
            onClick={openCreate}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              background: C.accent,
              color: '#fff',
              border: 0,
              borderRadius: '8px',
              p: '8px 14px',
              fontWeight: 700,
              fontSize: '12.5px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
              '&:hover': { background: C.accentH },
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Добавить авто
          </Box>
        </Box>
        <TableHead gridTemplateColumns={grid} columns={['Марка / модель', 'Годы', 'Двигатель', '']} />
        {vehicles.isLoading && <Box sx={{ p: '20px', fontSize: 13, color: C.muted }}>Загрузка…</Box>}
        {rows.map((v) => (
          <Box
            key={v.id}
            sx={{ display: 'grid', gridTemplateColumns: grid, gap: '12px', p: '13px 20px', borderBottom: `1px solid ${C.line2}`, alignItems: 'center' }}
          >
            <Box sx={{ fontSize: '13.5px', fontWeight: 600 }}>
              {v.make} {v.model}
            </Box>
            <Mono sx={{ fontSize: '12.5px', color: C.muted }}>
              {v.yearFrom ?? '…'}–{v.yearTo ?? '…'}
            </Mono>
            <Mono sx={{ fontSize: '12.5px', color: C.muted }}>{v.engine ?? '—'}</Mono>
            <Box
              component="button"
              onClick={() => openEdit(v)}
              sx={{
                width: 30,
                height: 30,
                borderRadius: '7px',
                background: C.paper2,
                border: `1px solid ${C.line}`,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                color: C.muted,
                justifySelf: 'end',
                '&:hover': { color: C.accent, borderColor: C.accent },
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4v16h16v-7" />
                <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
              </svg>
            </Box>
          </Box>
        ))}
        {!vehicles.isLoading && rows.length === 0 && (
          <Box sx={{ p: '20px', fontSize: 13, color: C.muted }}>
            {vehicleSearch ? 'Ничего не найдено — измените запрос.' : 'Справочник пуст — добавьте первый автомобиль.'}
          </Box>
        )}
        {vehicles.data && vehicles.data.totalPages > 1 && (
          <Box sx={{ p: '12px 20px', borderTop: `1px solid ${C.line}`, display: 'flex', justifyContent: 'center' }}>
            <Pagination
              count={vehicles.data.totalPages}
              page={vehiclePage + 1}
              onChange={(_, v) => setVehiclePage(v - 1)}
              shape="rounded"
              size="small"
            />
          </Box>
        )}
      </Card>

      {/* unmatched queue */}
      <Card>
        <Box sx={{ p: '16px 20px', borderBottom: `1px solid ${C.line}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', mb: '6px' }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: C.amber, flexShrink: 0 }} />
            <Box sx={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>Нераспознанные товары</Box>
            <Mono sx={{ fontSize: '11.5px', fontWeight: 700, color: C.amber, background: C.amberSoft, borderRadius: '6px', p: '2px 8px', flexShrink: 0 }}>
              {unmatched.data?.totalElements ?? '…'}
            </Mono>
          </Box>
          <Box sx={{ fontSize: 12, color: C.muted }}>Не привязаны ни к одному авто — не видны в подборе.</Box>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {(unmatched.data?.content ?? []).map((u) => (
            <Box key={u.id} sx={{ display: 'flex', alignItems: 'center', gap: '12px', p: '13px 20px', borderBottom: `1px solid ${C.line2}` }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ fontSize: '13.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</Box>
                <Mono sx={{ fontSize: '11.5px', color: C.muted, mt: '2px', display: 'block' }}>{u.sku}</Mono>
              </Box>
              <Box
                component="button"
                onClick={() => {
                  setAssignProduct(u);
                  setAssignFilter('');
                }}
                sx={{
                  background: C.accentSoft,
                  color: C.accentH,
                  border: 0,
                  borderRadius: '7px',
                  p: '7px 12px',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                  '&:hover': { background: C.accent, color: '#fff' },
                }}
              >
                привязать
              </Box>
            </Box>
          ))}
          {!unmatched.isLoading && (unmatched.data?.content ?? []).length === 0 && (
            <Box sx={{ p: '20px', fontSize: 13, color: C.muted }}>Очередь пуста — все товары привязаны.</Box>
          )}
        </Box>
        {unmatched.data && unmatched.data.totalPages > 1 && (
          <Box sx={{ p: '12px 20px', borderTop: `1px solid ${C.line}`, display: 'flex', justifyContent: 'center' }}>
            <Pagination
              count={unmatched.data.totalPages}
              page={unmatchedPage + 1}
              onChange={(_, v) => setUnmatchedPage(v - 1)}
              shape="rounded"
              size="small"
            />
          </Box>
        )}
      </Card>

      {/* vehicle editor dialog */}
      <Dialog open={editorOpen} onClose={() => setEditorOpen(false)} PaperProps={{ sx: { borderRadius: '16px', p: '28px', maxWidth: 460, width: '100%' } }}>
        <Box sx={{ fontSize: 18, fontWeight: 700, mb: '20px' }}>
          {editId == null ? 'Добавить автомобиль' : 'Редактировать автомобиль'}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <Field label="Марка" value={form.make} onChange={(v) => setForm((f) => ({ ...f, make: v }))} placeholder="Audi" />
          <Field label="Модель" value={form.model} onChange={(v) => setForm((f) => ({ ...f, model: v }))} placeholder="A4 (B9)" />
          <Field label="Год с" value={form.yearFrom} onChange={(v) => setForm((f) => ({ ...f, yearFrom: v }))} mono placeholder="2015" />
          <Field label="Год по" value={form.yearTo} onChange={(v) => setForm((f) => ({ ...f, yearTo: v }))} mono placeholder="2019" />
          <Field label="Двигатель" value={form.engine} onChange={(v) => setForm((f) => ({ ...f, engine: v }))} placeholder="2.0 TDI" gridColumn="1 / -1" />
        </Box>
        <Box sx={{ display: 'flex', gap: '10px', mt: '24px' }}>
          {editId != null && (
            <Box
              component="button"
              onClick={() => deleteVehicle.mutate(editId)}
              sx={{
                background: C.paper,
                border: `1px solid ${C.line}`,
                color: C.warn,
                borderRadius: '10px',
                p: '12px 16px',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'inherit',
                '&:hover': { borderColor: C.warn },
              }}
            >
              Удалить
            </Box>
          )}
          <Box
            component="button"
            onClick={() => setEditorOpen(false)}
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
            disabled={!form.make.trim() || !form.model.trim() || saveVehicle.isPending}
            onClick={() => saveVehicle.mutate()}
            sx={{
              flex: 1,
              background: C.accent,
              color: '#fff',
              border: 0,
              borderRadius: '10px',
              p: '12px',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: 'inherit',
              '&:disabled': { opacity: 0.5 },
            }}
          >
            Сохранить
          </Box>
        </Box>
      </Dialog>

      {/* assign dialog */}
      <Dialog
        open={assignProduct !== null}
        onClose={() => setAssignProduct(null)}
        PaperProps={{ sx: { borderRadius: '16px', p: '28px', maxWidth: 460, width: '100%' } }}
      >
        {assignProduct && (
          <>
            <Box sx={{ fontSize: 18, fontWeight: 700, mb: '4px' }}>Привязать к автомобилю</Box>
            <Mono sx={{ fontSize: 12, color: C.muted, display: 'block', mb: '18px' }}>
              {assignProduct.sku} · {assignProduct.name}
            </Mono>
            <InputBase
              autoFocus
              placeholder="Поиск: марка, модель…"
              value={assignFilter}
              onChange={(e) => setAssignFilter(e.target.value)}
              sx={{
                width: '100%',
                height: 42,
                border: `1.5px solid ${C.line}`,
                borderRadius: '9px',
                px: '13px',
                fontSize: '13.5px',
                mb: '10px',
                '&.Mui-focused': { borderColor: C.accent },
              }}
            />
            <Box sx={{ border: `1px solid ${C.line}`, borderRadius: '11px', overflow: 'auto', maxHeight: 280 }}>
              {assignVehicles.isLoading && <Box sx={{ p: '14px 16px', fontSize: 13, color: C.muted }}>Загрузка…</Box>}
              {assignCandidates.map((v) => (
                <Box
                  key={v.id}
                  onClick={() => link.mutate({ vehicleId: v.id, productId: assignProduct.id })}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    p: '11px 16px',
                    borderBottom: `1px solid ${C.line2}`,
                    cursor: 'pointer',
                    '&:hover': { background: C.accentSoft },
                  }}
                >
                  <Box sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{v.display}</Box>
                  <Box sx={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>+ привязать</Box>
                </Box>
              ))}
              {!assignVehicles.isLoading && assignCandidates.length === 0 && (
                <Box sx={{ p: '14px 16px', fontSize: 13, color: C.muted }}>Нет совпадений — добавьте авто в справочник.</Box>
              )}
            </Box>
            {(assignVehicles.data?.totalElements ?? 0) > 50 && (
              <Box sx={{ mt: '8px', fontSize: 12, color: C.muted }}>
                Показаны первые 50 из {assignVehicles.data?.totalElements} — уточните поиск.
              </Box>
            )}
          </>
        )}
      </Dialog>
    </Box>
    </Box>
  );
}
