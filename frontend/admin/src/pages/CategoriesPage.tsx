import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import { api } from '../api/client';
import type { Category } from '../api/types';
import { C, MONO } from '../theme';
import { Card, Field, FieldLabel, Mono, TableHead, Toggle } from '../components/ui';
import { useToast } from '../components/Toast';

interface CategoryForm {
  name: string;
  parentId: string;
  markupPercent: string;
  sortOrder: string;
}

const EMPTY_FORM: CategoryForm = { name: '', parentId: '', markupPercent: '', sortOrder: '' };

function num(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Плоский список с глубиной — дерево по parentId, сортировка по sortOrder, затем по имени. */
function flattenTree(cats: Category[]): { cat: Category; depth: number }[] {
  const byParent = new Map<number | null, Category[]>();
  const ids = new Set(cats.map((c) => c.id));
  for (const c of cats) {
    const key = c.parentId != null && ids.has(c.parentId) ? c.parentId : null;
    const list = byParent.get(key);
    if (list) list.push(c);
    else byParent.set(key, [c]);
  }
  const sorted = (list: Category[]) =>
    [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru'));
  const out: { cat: Category; depth: number }[] = [];
  const walk = (parentId: number | null, depth: number) => {
    for (const c of sorted(byParent.get(parentId) ?? [])) {
      out.push({ cat: c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

/** id категории + всех её потомков (нельзя выбирать родителем). */
function withDescendants(cats: Category[], rootId: number): Set<number> {
  const res = new Set<number>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of cats) {
      if (c.parentId != null && res.has(c.parentId) && !res.has(c.id)) {
        res.add(c.id);
        grew = true;
      }
    }
  }
  return res;
}

const GRID = '1fr 110px 80px 80px 80px';

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editActive, setEditActive] = useState(true);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/api/admin/categories'),
  });

  const rows = useMemo(() => flattenTree(categories.data ?? []), [categories.data]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['categories'] });

  const save = useMutation({
    mutationFn: () => {
      const parentId = form.parentId ? Number(form.parentId) : null;
      const markupPercent = num(form.markupPercent);
      const sortOrder = num(form.sortOrder) ?? 0;
      return editId == null
        ? api.post<Category>('/api/admin/categories', { name: form.name.trim(), parentId, markupPercent, sortOrder })
        : api.put<Category>(`/api/admin/categories/${editId}`, {
            name: form.name.trim(),
            parentId,
            markupPercent,
            sortOrder,
            active: editActive,
          });
    },
    onSuccess: () => {
      invalidate();
      setEditorOpen(false);
      toast(editId == null ? 'Категория добавлена' : 'Категория обновлена');
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const toggleActive = useMutation({
    mutationFn: (c: Category) =>
      api.put<Category>(`/api/admin/categories/${c.id}`, {
        name: c.name,
        parentId: c.parentId,
        markupPercent: c.markupPercent,
        sortOrder: c.sortOrder,
        active: !c.active,
      }),
    onSuccess: () => invalidate(),
    onError: (e) => toast(e.message, 'error'),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/api/admin/categories/${id}`),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      toast('Категория удалена');
    },
    onError: (e) => {
      setDeleteTarget(null);
      toast(e.message, 'error');
    },
  });

  const openCreate = () => {
    setEditId(null);
    setEditActive(true);
    setForm(EMPTY_FORM);
    setEditorOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditId(c.id);
    setEditActive(c.active);
    setForm({
      name: c.name,
      parentId: c.parentId != null ? String(c.parentId) : '',
      markupPercent: c.markupPercent != null ? String(c.markupPercent) : '',
      sortOrder: String(c.sortOrder),
    });
    setEditorOpen(true);
  };

  // Кандидаты в родители: все, кроме редактируемой категории и её потомков.
  const excluded = useMemo(
    () => (editId != null ? withDescendants(categories.data ?? [], editId) : new Set<number>()),
    [categories.data, editId],
  );
  const parentOptions = rows.filter(({ cat }) => !excluded.has(cat.id));

  return (
    <Box sx={{ animation: 'aIn .25s ease both', maxWidth: 860 }}>
      <Card>
        <Box sx={{ p: '16px 20px', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <Box sx={{ fontWeight: 700, fontSize: 15 }}>Дерево категорий</Box>
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
            Добавить категорию
          </Box>
        </Box>

        <TableHead
          gridTemplateColumns={GRID}
          columns={[
            'Название',
            <Box key="m" sx={{ textAlign: 'right' }}>Наценка %</Box>,
            <Box key="o" sx={{ textAlign: 'right' }}>Порядок</Box>,
            <Box key="a" sx={{ textAlign: 'center' }}>Активна</Box>,
            '',
          ]}
        />

        {categories.isLoading && <Box sx={{ p: '20px', fontSize: 13, color: C.muted }}>Загрузка…</Box>}

        {rows.map(({ cat, depth }) => (
          <Box
            key={cat.id}
            sx={{
              display: 'grid',
              gridTemplateColumns: GRID,
              gap: '10px',
              p: '11px 20px',
              borderBottom: `1px solid ${C.line2}`,
              alignItems: 'center',
              opacity: cat.active ? 1 : 0.55,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', pl: `${depth * 22}px`, minWidth: 0 }}>
              {depth > 0 && (
                <Box component="span" sx={{ fontFamily: MONO, fontSize: 12, color: C.muted2, flexShrink: 0 }}>
                  └
                </Box>
              )}
              <Box sx={{ fontSize: '13.5px', fontWeight: depth === 0 ? 700 : 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {cat.name}
              </Box>
              <Mono sx={{ fontSize: 11, color: C.muted2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {cat.slug}
              </Mono>
            </Box>
            <Mono sx={{ fontSize: '12.5px', textAlign: 'right', color: cat.markupPercent != null ? C.ink : C.muted2 }}>
              {cat.markupPercent != null ? `${cat.markupPercent}%` : '—'}
            </Mono>
            <Mono sx={{ fontSize: '12.5px', textAlign: 'right', color: C.muted }}>{cat.sortOrder}</Mono>
            <Box sx={{ textAlign: 'center' }}>
              <Toggle small on={cat.active} onClick={() => toggleActive.mutate(cat)} />
            </Box>
            <Box sx={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <Box
                component="button"
                title="Редактировать"
                onClick={() => openEdit(cat)}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '7px',
                  background: C.paper2,
                  border: `1px solid ${C.line}`,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  color: C.muted,
                  '&:hover': { color: C.accent, borderColor: C.accent },
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4v16h16v-7" />
                  <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
                </svg>
              </Box>
              <Box
                component="button"
                title="Удалить"
                onClick={() => setDeleteTarget(cat)}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '7px',
                  background: C.paper2,
                  border: `1px solid ${C.line}`,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  color: C.muted,
                  '&:hover': { color: C.warn, borderColor: C.warn },
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                </svg>
              </Box>
            </Box>
          </Box>
        ))}

        {!categories.isLoading && rows.length === 0 && (
          <Box sx={{ p: '20px', fontSize: 13, color: C.muted }}>Категорий ещё нет — добавьте первую.</Box>
        )}
      </Card>

      {/* editor dialog */}
      <Dialog open={editorOpen} onClose={() => setEditorOpen(false)} PaperProps={{ sx: { borderRadius: '16px', p: '28px', maxWidth: 460, width: '100%' } }}>
        <Box sx={{ fontSize: 18, fontWeight: 700, mb: '20px' }}>
          {editId == null ? 'Добавить категорию' : 'Редактировать категорию'}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <Field label="Название" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Тормозная система" gridColumn="1 / -1" />
          <Box component="label" sx={{ display: 'block', gridColumn: '1 / -1' }}>
            <FieldLabel>Родительская категория</FieldLabel>
            <Box
              component="select"
              value={form.parentId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((f) => ({ ...f, parentId: e.target.value }))}
              sx={{
                width: '100%',
                height: 44,
                border: `1.5px solid ${C.line}`,
                borderRadius: '9px',
                p: '0 10px',
                fontSize: 14,
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                background: '#fff',
                color: C.ink,
              }}
            >
              <option value="">— корневая —</option>
              {parentOptions.map(({ cat, depth }) => (
                <option key={cat.id} value={cat.id}>
                  {'  '.repeat(depth)}
                  {cat.name}
                </option>
              ))}
            </Box>
          </Box>
          <Field
            label="Наценка, % (пусто — глобальная)"
            value={form.markupPercent}
            onChange={(v) => setForm((f) => ({ ...f, markupPercent: v }))}
            mono
            placeholder="—"
          />
          <Field label="Порядок" value={form.sortOrder} onChange={(v) => setForm((f) => ({ ...f, sortOrder: v }))} mono placeholder="0" />
        </Box>
        <Box sx={{ display: 'flex', gap: '10px', mt: '24px' }}>
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
            disabled={!form.name.trim() || save.isPending}
            onClick={() => save.mutate()}
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
            {save.isPending ? 'Сохранение…' : 'Сохранить'}
          </Box>
        </Box>
      </Dialog>

      {/* delete confirm */}
      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} PaperProps={{ sx: { borderRadius: '16px', p: '28px', maxWidth: 420 } }}>
        <Box sx={{ fontSize: 18, fontWeight: 700, mb: '8px' }}>Удалить категорию?</Box>
        <Box sx={{ fontSize: '13.5px', color: C.muted, lineHeight: 1.6, mb: '24px' }}>
          Категория «{deleteTarget?.name}» будет удалена. Товары этой категории останутся в каталоге, но будут
          отвязаны от неё. Категорию с подкатегориями удалить нельзя — сначала удалите вложенные.
        </Box>
        <Box sx={{ display: 'flex', gap: '10px' }}>
          <Box
            component="button"
            onClick={() => setDeleteTarget(null)}
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
            disabled={remove.isPending}
            onClick={() => deleteTarget && remove.mutate(deleteTarget.id)}
            sx={{
              flex: 1,
              background: C.warn,
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
            {remove.isPending ? 'Удаление…' : 'Удалить'}
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}
