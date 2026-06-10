import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import { api } from '../api/client';
import type { ImportPreview, ImportReport, SnapshotMeta } from '../api/types';
import { C, MONO } from '../theme';
import { Card, Mono, TableHead } from '../components/ui';
import { fmtDateTime } from '../format';
import { useToast } from '../components/Toast';

type Stage =
  | { kind: 'idle' }
  | { kind: 'preview'; preview: ImportPreview; filename: string; legacy: boolean }
  | { kind: 'report'; report: ImportReport; skipped: number };

export default function ImportExportPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const legacyRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const [dragOver, setDragOver] = useState(false);

  const snapshots = useQuery({
    queryKey: ['snapshots'],
    queryFn: () => api.get<SnapshotMeta[]>('/api/admin/export/snapshots?limit=30'),
  });

  const exportNow = useMutation({
    mutationFn: () => api.post<SnapshotMeta>('/api/admin/export/run'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      toast('Снэпшот сформирован — файл доступен в истории');
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const upload = useMutation({
    mutationFn: ({ file, legacy }: { file: File; legacy: boolean }) => {
      const fd = new FormData();
      fd.append('file', file);
      return api
        .post<ImportPreview>(legacy ? '/api/admin/import/legacy' : '/api/admin/import', fd)
        .then((preview) => ({ preview, filename: file.name, legacy }));
    },
    onSuccess: ({ preview, filename, legacy }) => setStage({ kind: 'preview', preview, filename, legacy }),
    onError: (e) => toast(e.message, 'error'),
  });

  const confirm = useMutation({
    mutationFn: (token: string) => api.post<ImportReport>(`/api/admin/import/${token}/confirm`),
    onSuccess: (report) => {
      const skipped = stage.kind === 'preview' ? stage.preview.errors.length : 0;
      setStage({ kind: 'report', report, skipped });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const onFile = (file: File | null | undefined, legacy: boolean) => {
    if (file) upload.mutate({ file, legacy });
  };

  const triggerLabel: Record<string, string> = { MANUAL: 'вручную', SCHEDULED: 'по расписанию', IMPORT: 'импорт' };

  return (
    <Box sx={{ animation: 'aIn .25s ease both', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', alignItems: 'start' }}>
      {/* EXPORT */}
      <Card>
        <Box sx={{ p: '16px 20px', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ fontWeight: 700, fontSize: 15 }}>Экспорт · снэпшоты</Box>
          <Box
            component="button"
            onClick={() => exportNow.mutate()}
            disabled={exportNow.isPending}
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
              '&:hover': { background: C.accentH },
              '&:disabled': { opacity: 0.6 },
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
              <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
            </svg>
            {exportNow.isPending ? 'Формируется…' : 'Выгрузить сейчас'}
          </Box>
        </Box>
        <TableHead
          gridTemplateColumns="1fr 110px 80px 110px"
          columns={[
            'Дата',
            'Триггер',
            <Box key="r" sx={{ textAlign: 'right' }}>Строк</Box>,
            <Box key="d" sx={{ textAlign: 'right' }}>Скачать</Box>,
          ]}
        />
        {(snapshots.data ?? []).map((s) => (
          <Box
            key={s.id}
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 110px 80px 110px',
              gap: '10px',
              p: '12px 20px',
              borderBottom: `1px solid ${C.line2}`,
              alignItems: 'center',
            }}
          >
            <Box sx={{ fontSize: 13, fontWeight: 600 }}>{fmtDateTime(s.createdAt)}</Box>
            <Box sx={{ fontSize: '11.5px', color: C.muted }}>{triggerLabel[s.trigger] ?? s.trigger.toLowerCase()}</Box>
            <Mono sx={{ fontSize: '12.5px', textAlign: 'right' }}>{s.productCount}</Mono>
            <Box sx={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              {(['csv', 'xlsx'] as const).map((fmt) => (
                <Box
                  key={fmt}
                  component="a"
                  href={`/api/admin/export/snapshots/${s.id}/${fmt}`}
                  download
                  sx={{
                    fontFamily: MONO,
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.accent,
                    background: C.accentSoft,
                    borderRadius: '6px',
                    px: '8px',
                    py: '4px',
                    textDecoration: 'none',
                    '&:hover': { background: C.accent, color: '#fff' },
                  }}
                >
                  {fmt.toUpperCase()}
                </Box>
              ))}
            </Box>
          </Box>
        ))}
        {!snapshots.isLoading && (snapshots.data ?? []).length === 0 && (
          <Box sx={{ p: '18px 20px', fontSize: 13, color: C.muted }}>Снэпшотов ещё нет — нажмите «Выгрузить сейчас».</Box>
        )}
      </Card>

      {/* IMPORT */}
      <Card>
        <Box sx={{ p: '16px 20px', borderBottom: `1px solid ${C.line}`, fontWeight: 700, fontSize: 15 }}>Импорт прайса</Box>
        <Box sx={{ p: '20px' }}>
          <input ref={fileRef} type="file" accept=".csv,.xlsx" hidden onChange={(e) => onFile(e.target.files?.[0], false)} />
          <input ref={legacyRef} type="file" accept=".xls" hidden onChange={(e) => onFile(e.target.files?.[0], true)} />

          {stage.kind === 'idle' && (
            <Box sx={{ animation: 'aIn .2s ease both' }}>
              <Box
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  onFile(e.dataTransfer.files?.[0], false);
                }}
                sx={{
                  border: `2px dashed ${dragOver ? C.accent : C.line}`,
                  borderRadius: '13px',
                  p: '40px 24px',
                  textAlign: 'center',
                  background: dragOver ? C.accentSoft : C.paper2,
                  cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                <Box sx={{ width: 48, height: 48, borderRadius: '12px', background: C.accentSoft, color: C.accent, display: 'grid', placeItems: 'center', m: '0 auto 12px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="M7 10l5 5 5-5" />
                    <path d="M12 15V3" />
                  </svg>
                </Box>
                <Box sx={{ fontSize: '14.5px', fontWeight: 600, mb: '5px' }}>
                  {upload.isPending ? 'Загрузка файла…' : 'Перетащите CSV или XLSX'}
                </Box>
                <Box sx={{ fontSize: '12.5px', color: C.muted, mb: '16px' }}>Колонки: артикул, название, закупка, остаток…</Box>
                <Box
                  component="span"
                  sx={{
                    display: 'inline-block',
                    background: C.accent,
                    color: '#fff',
                    borderRadius: '9px',
                    p: '10px 20px',
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  Выбрать файл
                </Box>
              </Box>
              <Box
                component="button"
                onClick={() => legacyRef.current?.click()}
                sx={{
                  mt: '14px',
                  width: '100%',
                  background: C.paper2,
                  border: `1px solid ${C.line}`,
                  color: C.ink2,
                  borderRadius: '9px',
                  p: '11px',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  '&:hover': { borderColor: C.accent, color: C.accent },
                }}
              >
                Импорт учётного файла (.xls)
              </Box>
            </Box>
          )}

          {stage.kind === 'preview' && (
            <Box sx={{ animation: 'aIn .2s ease both' }}>
              <Mono sx={{ fontSize: 11, color: C.muted, display: 'block', mb: '14px' }}>
                {stage.filename}
                {stage.legacy ? ' · учётный файл' : ''}
              </Mono>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', mb: '16px' }}>
                <Box sx={{ background: C.okSoft, border: '1px solid #c5e8d4', borderRadius: '10px', p: '14px', textAlign: 'center' }}>
                  <Mono sx={{ fontWeight: 700, fontSize: 26, color: C.ok, display: 'block' }}>{stage.preview.toCreate}</Mono>
                  <Box sx={{ fontSize: '11.5px', color: C.ok, mt: '3px' }}>создаётся</Box>
                </Box>
                <Box sx={{ background: C.accentSoft, border: '1px solid #c6d9ff', borderRadius: '10px', p: '14px', textAlign: 'center' }}>
                  <Mono sx={{ fontWeight: 700, fontSize: 26, color: C.accent, display: 'block' }}>{stage.preview.toUpdate}</Mono>
                  <Box sx={{ fontSize: '11.5px', color: C.accent, mt: '3px' }}>обновляется</Box>
                </Box>
                <Box sx={{ background: C.warnSoft, border: '1px solid #f3cabf', borderRadius: '10px', p: '14px', textAlign: 'center' }}>
                  <Mono sx={{ fontWeight: 700, fontSize: 26, color: C.warn, display: 'block' }}>{stage.preview.errors.length}</Mono>
                  <Box sx={{ fontSize: '11.5px', color: C.warn, mt: '3px' }}>ошибки</Box>
                </Box>
              </Box>

              {stage.preview.errors.length > 0 && (
                <Box sx={{ border: `1px solid ${C.warnSoft}`, borderRadius: '10px', overflow: 'hidden', mb: '18px' }}>
                  <Box sx={{ background: C.warnSoft, p: '9px 14px', fontSize: 12, fontWeight: 700, color: C.warn }}>
                    Строки с ошибками — будут пропущены
                  </Box>
                  <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                    {stage.preview.errors.map((e, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: '12px', p: '10px 14px', borderTop: `1px solid ${C.line2}` }}>
                        <Mono sx={{ fontSize: 12, fontWeight: 700, color: C.warn, width: 64, flexShrink: 0 }}>стр. {e.row}</Mono>
                        <Box sx={{ fontSize: 13, color: C.ink2 }}>{e.message}</Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: '10px' }}>
                <Box
                  component="button"
                  onClick={() => setStage({ kind: 'idle' })}
                  sx={{
                    flex: 1,
                    background: C.paper2,
                    border: `1px solid ${C.line}`,
                    color: C.ink2,
                    borderRadius: '9px',
                    p: '11px',
                    fontWeight: 600,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Отмена
                </Box>
                <Box
                  component="button"
                  onClick={() => confirm.mutate(stage.preview.token)}
                  disabled={confirm.isPending}
                  sx={{
                    flex: 2,
                    background: C.accent,
                    color: '#fff',
                    border: 0,
                    borderRadius: '9px',
                    p: '11px',
                    fontWeight: 700,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    '&:hover': { background: C.accentH },
                    '&:disabled': { opacity: 0.6 },
                  }}
                >
                  {confirm.isPending ? 'Применение…' : 'Применить импорт'}
                </Box>
              </Box>
            </Box>
          )}

          {stage.kind === 'report' && (
            <Box sx={{ animation: 'aIn .2s ease both', textAlign: 'center', p: '18px 0' }}>
              <Box sx={{ width: 56, height: 56, borderRadius: '14px', background: C.ok, display: 'grid', placeItems: 'center', m: '0 auto 16px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                  <path d="m5 13 4 4L19 7" />
                </svg>
              </Box>
              <Box sx={{ fontSize: 17, fontWeight: 700, mb: '8px' }}>Импорт применён</Box>
              <Box sx={{ fontSize: '13.5px', color: C.muted, lineHeight: 1.6, mb: '20px' }}>
                Создано <Box component="strong" sx={{ color: C.ink }}>{stage.report.created}</Box>, обновлено{' '}
                <Box component="strong" sx={{ color: C.ink }}>{stage.report.updated}</Box> позиций.
                {stage.skipped > 0 && (
                  <>
                    <br />
                    {stage.skipped} строк пропущено из-за ошибок.
                  </>
                )}
              </Box>
              <Box
                component="button"
                onClick={() => setStage({ kind: 'idle' })}
                sx={{
                  background: C.paper2,
                  border: `1px solid ${C.line}`,
                  color: C.ink2,
                  borderRadius: '9px',
                  p: '10px 22px',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Импортировать ещё
              </Box>
            </Box>
          )}
        </Box>
      </Card>
    </Box>
  );
}
