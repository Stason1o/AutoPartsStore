import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import InputBase from '@mui/material/InputBase';
import { api, qs } from '../api/client';
import type { AdminProduct, Category, Page, PhotoMeta, ProductRequest, Rates, Vehicle } from '../api/types';
import { C, MONO } from '../theme';
import { Card, Field, FieldLabel, Mono, Toggle } from '../components/ui';
import { fmtMoney, fmtMoney2 } from '../format';
import { useToast } from '../components/Toast';
import { useDebounced } from '../hooks/useDebounced';

interface FormState {
  sku: string;
  name: string;
  brand: string;
  description: string;
  categoryId: string;
  purchasePrice: string;
  purchaseCurrency: string;
  markupPercent: string;
  retailPrice: string;
  retailPriceManual: boolean;
  wholesalePrice: string;
  stockQty: string;
  shelf: string;
  adminNote: string;
  active: boolean;
  oemNumbers: string[];
}

const EMPTY: FormState = {
  sku: '',
  name: '',
  brand: '',
  description: '',
  categoryId: '',
  purchasePrice: '',
  purchaseCurrency: 'USD',
  markupPercent: '',
  retailPrice: '',
  retailPriceManual: false,
  wholesalePrice: '',
  stockQty: '0',
  shelf: '',
  adminNote: '',
  active: true,
  oemNumbers: [],
};

function fromProduct(p: AdminProduct): FormState {
  return {
    sku: p.sku,
    name: p.name,
    brand: p.brand ?? '',
    description: p.description ?? '',
    categoryId: p.categoryId != null ? String(p.categoryId) : '',
    purchasePrice: p.purchasePrice != null ? String(p.purchasePrice) : '',
    purchaseCurrency: p.purchaseCurrency ?? 'USD',
    markupPercent: p.markupPercent != null ? String(p.markupPercent) : '',
    retailPrice: p.retailPrice != null ? String(p.retailPrice) : '',
    retailPriceManual: p.retailPriceManual,
    wholesalePrice: p.wholesalePrice != null ? String(p.wholesalePrice) : '',
    stockQty: String(p.stockQty),
    shelf: p.shelf ?? '',
    adminNote: p.adminNote ?? '',
    active: p.active,
    oemNumbers: p.oemNumbers ?? [],
  };
}

function num(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function toRequest(f: FormState): ProductRequest {
  return {
    sku: f.sku.trim(),
    name: f.name.trim(),
    brand: f.brand.trim() || null,
    description: f.description.trim() || null,
    categoryId: f.categoryId ? Number(f.categoryId) : null,
    purchasePrice: num(f.purchasePrice),
    purchaseCurrency: f.purchaseCurrency || null,
    markupPercent: num(f.markupPercent),
    retailPrice: num(f.retailPrice),
    retailPriceManual: f.retailPriceManual,
    wholesalePrice: num(f.wholesalePrice),
    stockQty: num(f.stockQty) ?? 0,
    shelf: f.shelf.trim() || null,
    adminNote: f.adminNote.trim() || null,
    active: f.active,
    oemNumbers: f.oemNumbers,
  };
}

const TABS = [
  ['main', 'Основное'],
  ['prices', 'Цены'],
  ['photo', 'Фото'],
  ['fit', 'Применимость'],
  ['stock', 'Склад'],
] as const;

export default function ProductEditorPage() {
  const { id } = useParams();
  const isNew = id === undefined;
  const productId = isNew ? null : Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [tab, setTab] = useState<(typeof TABS)[number][0]>('main');
  const [form, setForm] = useState<FormState>(EMPTY);
  const [oemDraft, setOemDraft] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const product = useQuery({
    queryKey: ['product', productId],
    queryFn: () => api.get<AdminProduct>(`/api/admin/products/${productId}`),
    enabled: productId != null,
  });

  useEffect(() => {
    if (product.data) setForm(fromProduct(product.data));
  }, [product.data]);

  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api.get<Category[]>('/api/admin/categories') });
  const rates = useQuery({ queryKey: ['rates'], queryFn: () => api.get<Rates>('/api/admin/rates') });

  const save = useMutation({
    mutationFn: (body: ProductRequest) =>
      isNew
        ? api.post<AdminProduct>('/api/admin/products', body)
        : api.put<AdminProduct>(`/api/admin/products/${productId}`, body),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', saved.id] });
      toast(isNew ? 'Товар создан' : 'Товар сохранён');
      if (isNew) navigate(`/products/${saved.id}`, { replace: true });
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/api/admin/products/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast('Товар удалён');
      navigate('/products');
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const doSave = () => {
    if (!form.sku.trim() || !form.name.trim()) {
      toast('Заполните артикул и название', 'error');
      setTab('main');
      return;
    }
    save.mutate(toRequest(form));
  };

  const addOem = () => {
    const v = oemDraft.trim();
    if (v && !form.oemNumbers.includes(v)) set('oemNumbers', [...form.oemNumbers, v]);
    setOemDraft('');
  };

  // ---- computed price preview ----
  const usd = rates.data?.usd != null ? Number(rates.data.usd) : null;
  const eur = rates.data?.eur != null ? Number(rates.data.eur) : null;
  const globalMarkup = rates.data?.globalMarkupPercent != null ? Number(rates.data.globalMarkupPercent) : 0;
  const rounding = rates.data?.roundingRule ?? 'NONE';

  const preview = useMemo(() => {
    const cost = num(form.purchasePrice);
    if (cost == null) return null;
    const cur = form.purchaseCurrency;
    const rate = cur === 'USD' ? usd : cur === 'EUR' ? eur : 1;
    if (rate == null) return null;
    const markup = num(form.markupPercent) ?? globalMarkup;
    const costMdl = cost * rate;
    let price = costMdl * (1 + markup / 100);
    if (rounding === 'TO_1') price = Math.ceil(price);
    else if (rounding === 'TO_5') price = Math.ceil(price / 5) * 5;
    return { cost, cur, rate, markup, costMdl, price };
  }, [form.purchasePrice, form.purchaseCurrency, form.markupPercent, usd, eur, globalMarkup, rounding]);

  const title = isNew ? 'Новый товар' : form.name || '…';

  if (productId != null && product.isLoading) {
    return <Box sx={{ p: '40px', fontSize: 14, color: C.muted }}>Загрузка…</Box>;
  }
  if (productId != null && product.isError) {
    return <Box sx={{ p: '40px', fontSize: 14, color: C.warn }}>Товар не найден.</Box>;
  }

  return (
    <Box sx={{ animation: 'aIn .25s ease both' }}>
      {/* header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '16px', mb: '20px' }}>
        <Box
          component="button"
          onClick={() => navigate('/products')}
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
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </Box>
          <Mono sx={{ fontSize: 12, color: C.muted, mt: '2px', display: 'block' }}>
            {isNew ? 'новая позиция каталога' : `арт. ${form.sku}${form.brand ? ' · ' + form.brand : ''}`}
          </Mono>
        </Box>
        {!isNew && (
          <Box
            component="button"
            onClick={() => setDeleteOpen(true)}
            sx={{
              background: C.paper,
              border: `1px solid ${C.line}`,
              color: C.warn,
              borderRadius: '9px',
              p: '10px 16px',
              fontWeight: 600,
              fontSize: '13.5px',
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
          onClick={() => navigate('/products')}
          sx={{
            background: C.paper,
            border: `1px solid ${C.line}`,
            color: C.ink2,
            borderRadius: '9px',
            p: '10px 18px',
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
          onClick={doSave}
          disabled={save.isPending}
          sx={{
            background: C.accent,
            color: '#fff',
            border: 0,
            borderRadius: '9px',
            p: '10px 22px',
            fontWeight: 700,
            fontSize: '13.5px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            '&:hover': { background: C.accentH },
            '&:disabled': { opacity: 0.6 },
          }}
        >
          {save.isPending ? 'Сохранение…' : 'Сохранить'}
        </Box>
      </Box>

      <Card>
        {/* tabs */}
        <Box sx={{ display: 'flex', gap: '4px', px: '18px', borderBottom: `1px solid ${C.line}` }}>
          {TABS.map(([key, label]) => (
            <Box
              key={key}
              component="button"
              onClick={() => setTab(key)}
              sx={{
                background: 0,
                border: 0,
                borderBottom: `2px solid ${tab === key ? C.accent : 'transparent'}`,
                color: tab === key ? C.ink : C.muted,
                fontWeight: tab === key ? 700 : 500,
                fontSize: '13.5px',
                p: '14px',
                cursor: 'pointer',
                mb: '-1px',
                fontFamily: 'inherit',
              }}
            >
              {label}
            </Box>
          ))}
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: '10px', pr: '4px' }}>
            <Box sx={{ fontSize: '12.5px', fontWeight: 600, color: C.muted }}>Активен</Box>
            <Toggle on={form.active} onClick={() => set('active', !form.active)} />
          </Box>
        </Box>

        <Box sx={{ p: '26px' }}>
          {tab === 'main' && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', maxWidth: 760, animation: 'aIn .2s ease both' }}>
              <Field label="Артикул" value={form.sku} onChange={(v) => set('sku', v)} mono />
              <Field label="Бренд" value={form.brand} onChange={(v) => set('brand', v)} />
              <Field label="Название" value={form.name} onChange={(v) => set('name', v)} gridColumn="1 / -1" />
              <Box component="label" sx={{ display: 'block' }}>
                <FieldLabel>Категория</FieldLabel>
                <Box
                  component="select"
                  value={form.categoryId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set('categoryId', e.target.value)}
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
                  <option value="">— без категории —</option>
                  {(categories.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Box>
              </Box>
              <Box />
              <Field label="Описание" value={form.description} onChange={(v) => set('description', v)} multiline gridColumn="1 / -1" />
              <Box sx={{ gridColumn: '1 / -1' }}>
                <FieldLabel>OEM-номера</FieldLabel>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  {form.oemNumbers.map((o) => (
                    <Box
                      key={o}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: C.accentSoft,
                        color: C.accentH,
                        borderRadius: '7px',
                        p: '7px 10px',
                        fontFamily: MONO,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {o}
                      <Box
                        component="span"
                        onClick={() => set('oemNumbers', form.oemNumbers.filter((x) => x !== o))}
                        sx={{ cursor: 'pointer', color: C.accent, fontSize: 15, lineHeight: 1 }}
                      >
                        ×
                      </Box>
                    </Box>
                  ))}
                  <InputBase
                    placeholder="+ добавить номер"
                    value={oemDraft}
                    onChange={(e) => setOemDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        addOem();
                      }
                    }}
                    onBlur={addOem}
                    sx={{
                      height: 36,
                      border: `1.5px dashed ${C.line}`,
                      borderRadius: '7px',
                      px: '12px',
                      fontFamily: MONO,
                      fontSize: 13,
                      width: 170,
                      '&.Mui-focused': { borderColor: C.accent },
                    }}
                  />
                </Box>
              </Box>
            </Box>
          )}

          {tab === 'prices' && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '28px', maxWidth: 820, animation: 'aIn .2s ease both' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '12px' }}>
                  <Field label="Закупочная цена" value={form.purchasePrice} onChange={(v) => set('purchasePrice', v)} mono />
                  <Box component="label" sx={{ display: 'block' }}>
                    <FieldLabel>Валюта</FieldLabel>
                    <Box
                      component="select"
                      value={form.purchaseCurrency}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set('purchaseCurrency', e.target.value)}
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
                      }}
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="MDL">MDL</option>
                    </Box>
                  </Box>
                </Box>
                <Field
                  label={`Наценка, % (пусто — глобальная ${globalMarkup}%)`}
                  value={form.markupPercent}
                  onChange={(v) => set('markupPercent', v)}
                  mono
                />
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', mb: '7px' }}>
                    <Box component="span" sx={{ fontSize: '12.5px', fontWeight: 600, color: C.ink2 }}>
                      Розничная цена (ручная)
                    </Box>
                    <Toggle small on={form.retailPriceManual} onClick={() => set('retailPriceManual', !form.retailPriceManual)} />
                  </Box>
                  <Field
                    value={form.retailPrice}
                    onChange={(v) => set('retailPrice', v)}
                    mono
                    bold
                    disabled={!form.retailPriceManual}
                    placeholder={preview ? fmtMoney(preview.price) : ''}
                  />
                  {!form.retailPriceManual && (
                    <Box sx={{ fontSize: 12, color: C.muted, mt: '6px' }}>
                      Розница рассчитывается автоматически по курсу и наценке.
                    </Box>
                  )}
                </Box>
                <Field label="Оптовая цена" value={form.wholesalePrice} onChange={(v) => set('wholesalePrice', v)} mono />
              </Box>

              <Box sx={{ background: C.paper2, border: `1px solid ${C.line}`, borderRadius: '12px', p: '20px', alignSelf: 'start' }}>
                <Mono sx={{ fontSize: '10.5px', letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase', display: 'block', mb: '14px' }}>
                  Расчёт по курсу
                </Mono>
                {preview ? (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.muted, mb: '9px' }}>
                      <span>Закупка</span>
                      <Mono sx={{ color: C.ink }}>
                        {preview.cur === 'USD' ? '$' : preview.cur === 'EUR' ? '€' : ''}
                        {preview.cost}
                        {preview.cur === 'MDL' ? ' MDL' : ''}
                      </Mono>
                    </Box>
                    {preview.cur !== 'MDL' && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.muted, mb: '9px' }}>
                        <span>Курс {preview.cur}→MDL</span>
                        <Mono sx={{ color: C.ink }}>{preview.rate.toFixed(2)}</Mono>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.muted, mb: '9px' }}>
                      <span>≈ в MDL</span>
                      <Mono sx={{ color: C.ink }}>{fmtMoney2(preview.costMdl)}</Mono>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.muted, mb: '14px' }}>
                      <span>Наценка</span>
                      <Mono sx={{ color: C.ink }}>{preview.markup}%</Mono>
                    </Box>
                    <Box sx={{ borderTop: `1px solid ${C.line}`, pt: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Box sx={{ fontWeight: 700, fontSize: '13.5px' }}>Расчётная цена</Box>
                      <Mono sx={{ fontWeight: 700, fontSize: 20, color: C.accent }}>{fmtMoney(preview.price)}</Mono>
                    </Box>
                  </>
                ) : (
                  <Box sx={{ fontSize: 13, color: C.muted }}>Укажите закупочную цену — расчёт появится здесь.</Box>
                )}
              </Box>
            </Box>
          )}

          {tab === 'photo' &&
            (isNew ? (
              <Box sx={{ fontSize: 14, color: C.muted, p: '8px 0' }}>Сначала сохраните товар — затем можно будет загрузить фото.</Box>
            ) : (
              <PhotosTab productId={productId!} />
            ))}

          {tab === 'fit' &&
            (isNew ? (
              <Box sx={{ fontSize: 14, color: C.muted, p: '8px 0' }}>Сначала сохраните товар — затем можно будет привязать автомобили.</Box>
            ) : (
              <FitTab productId={productId!} slug={product.data?.slug ?? null} active={product.data?.active ?? false} />
            ))}

          {tab === 'stock' && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', maxWidth: 520, animation: 'aIn .2s ease both' }}>
              <Field label="Остаток, шт" value={form.stockQty} onChange={(v) => set('stockQty', v)} mono bold />
              <Field label="Полка" value={form.shelf} onChange={(v) => set('shelf', v)} mono placeholder="43*19" />
              <Box component="label" sx={{ display: 'block' }}>
                <FieldLabel>Зарезервировано</FieldLabel>
                <Field value={String(product.data?.reservedQty ?? 0)} mono disabled />
              </Box>
              <Box />
              <Field label="Заметка администратора" value={form.adminNote} onChange={(v) => set('adminNote', v)} multiline gridColumn="1 / -1" />
              <Box
                sx={{
                  gridColumn: '1 / -1',
                  fontSize: '12.5px',
                  color: C.muted,
                  lineHeight: 1.5,
                  background: C.paper2,
                  borderRadius: '9px',
                  p: '13px 15px',
                }}
              >
                Формат полки: <Mono sx={{ color: C.ink }}>стеллаж*ячейка</Mono>, например <Mono sx={{ color: C.ink }}>43*19</Mono>. Используется
                при сборке заказа. Резерв создаётся автоматически при подтверждении заказа.
              </Box>
            </Box>
          )}
        </Box>
      </Card>

      {/* delete confirm */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} PaperProps={{ sx: { borderRadius: '16px', p: '28px', maxWidth: 420 } }}>
        <Box sx={{ fontSize: 18, fontWeight: 700, mb: '8px' }}>Удалить товар?</Box>
        <Box sx={{ fontSize: '13.5px', color: C.muted, lineHeight: 1.6, mb: '24px' }}>
          Позиция «{form.name}» будет удалена из каталога. Действие необратимо.
        </Box>
        <Box sx={{ display: 'flex', gap: '10px' }}>
          <Box
            component="button"
            onClick={() => setDeleteOpen(false)}
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
            onClick={() => remove.mutate()}
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
            }}
          >
            Удалить
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}

/* ===================== PHOTOS TAB ===================== */

function PhotosTab({ productId }: { productId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const photos = useQuery({
    queryKey: ['photos', productId],
    queryFn: () => api.get<PhotoMeta[]>(`/api/admin/products/${productId}/photos`),
  });

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      // Загружаем последовательно — по одному файлу за запрос.
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        await api.post(`/api/admin/products/${productId}/photos`, fd);
      }
      return files.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['photos', productId] });
      toast(count === 1 ? 'Фото загружено' : `Загружено ${count} фото`);
    },
    onError: (e) => {
      // Часть файлов могла успеть загрузиться — обновляем список.
      queryClient.invalidateQueries({ queryKey: ['photos', productId] });
      toast(e.message, 'error');
    },
  });

  const setMain = useMutation({
    mutationFn: (photoId: number) => api.post(`/api/admin/photos/${photoId}/main`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['photos', productId] }),
    onError: (e) => toast(e.message, 'error'),
  });

  const remove = useMutation({
    mutationFn: (photoId: number) => api.delete(`/api/admin/photos/${photoId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos', productId] });
      toast('Фото удалено');
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    upload.mutate(Array.from(files));
  };

  return (
    <Box sx={{ maxWidth: 680, animation: 'aIn .2s ease both' }}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = ''; // повторный выбор тех же файлов снова вызовет onChange
        }}
      />
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
          onFiles(e.dataTransfer.files);
        }}
        sx={{
          border: `2px dashed ${dragOver ? C.accent : C.line}`,
          borderRadius: '13px',
          p: '34px',
          textAlign: 'center',
          background: dragOver ? C.accentSoft : C.paper2,
          mb: '18px',
          cursor: 'pointer',
          transition: 'all .15s',
        }}
      >
        <Box sx={{ width: 48, height: 48, borderRadius: '12px', background: C.accentSoft, color: C.accent, display: 'grid', placeItems: 'center', m: '0 auto 12px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M17 8l-5-5-5 5" />
            <path d="M12 3v12" />
          </svg>
        </Box>
        <Box sx={{ fontSize: '14.5px', fontWeight: 600, mb: '5px' }}>
          {upload.isPending ? 'Загрузка…' : 'Перетащите фото сюда'}
        </Box>
        <Box sx={{ fontSize: '12.5px', color: C.muted }}>JPG, PNG · или нажмите для выбора</Box>
      </Box>

      <Box sx={{ fontSize: '12.5px', fontWeight: 600, color: C.ink2, mb: '10px' }}>Загруженные · отмеченное — главное</Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
        {(photos.data ?? []).map((ph) => (
          <Box
            key={ph.id}
            sx={{
              position: 'relative',
              aspectRatio: '1',
              borderRadius: '11px',
              border: `2px solid ${ph.isMain ? C.accent : C.line}`,
              overflow: 'hidden',
              background: C.paper2,
              '&:hover .photo-actions': { opacity: 1 },
            }}
          >
            <Box
              component="img"
              src={`/api/photos/${ph.id}?thumb=1`}
              alt=""
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {ph.isMain && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 6,
                  left: 6,
                  background: C.accent,
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  borderRadius: '5px',
                  px: '6px',
                  py: '2px',
                }}
              >
                главное
              </Box>
            )}
            <Box
              className="photo-actions"
              sx={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(13,15,18,.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: 0,
                transition: 'opacity .15s',
              }}
            >
              {!ph.isMain && (
                <Box
                  component="button"
                  title="Сделать главным"
                  onClick={() => setMain.mutate(ph.id)}
                  sx={{
                    background: '#fff',
                    border: 0,
                    borderRadius: '7px',
                    p: '6px 10px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  главное
                </Box>
              )}
              <Box
                component="button"
                title="Удалить"
                onClick={() => remove.mutate(ph.id)}
                sx={{
                  background: C.warn,
                  color: '#fff',
                  border: 0,
                  borderRadius: '7px',
                  p: '6px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                удалить
              </Box>
            </Box>
          </Box>
        ))}
        {(photos.data ?? []).length === 0 && (
          <Box sx={{ gridColumn: '1 / -1', fontSize: 13, color: C.muted }}>Фото ещё не загружены.</Box>
        )}
      </Box>
    </Box>
  );
}

/* ===================== FIT TAB ===================== */

function FitTab({ productId, slug, active }: { productId: number; slug: string | null; active: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState('');
  const [linked, setLinked] = useState<Vehicle[]>([]);
  const [initialized, setInitialized] = useState(false);

  const search = useDebounced(filter.trim(), 300);

  const vehicles = useQuery({
    queryKey: ['vehicles', 'fit-search', search],
    queryFn: () => api.get<Page<Vehicle>>(`/api/admin/vehicles${qs({ search, page: 0, size: 50 })}`),
  });

  // Полный справочник нужен один раз — чтобы сматчить display-строки привязок к id.
  // Эндпоинт пагинирован (max size 200), поэтому собираем все страницы.
  const allVehicles = useQuery({
    queryKey: ['vehicles', 'fit-init'],
    queryFn: async () => {
      const out: Vehicle[] = [];
      for (let page = 0; ; page++) {
        const p = await api.get<Page<Vehicle>>(`/api/admin/vehicles${qs({ page, size: 200 })}`);
        out.push(...p.content);
        if (page + 1 >= p.totalPages || p.content.length === 0) break;
      }
      return out;
    },
    staleTime: 60_000,
  });

  // Список привязок берём из публичной карточки (display-строки) и матчим к справочнику.
  const detail = useQuery({
    queryKey: ['product-fits', slug],
    queryFn: () => api.get<{ fitsVehicles: string[] }>(`/api/products/${slug}`),
    enabled: !!slug && active,
    retry: false,
  });

  useEffect(() => {
    if (initialized || !allVehicles.data) return;
    if (slug && active && !detail.data && !detail.isError) return;
    const fits = detail.data?.fitsVehicles ?? [];
    setLinked(allVehicles.data.filter((v) => fits.includes(v.display)));
    setInitialized(true);
  }, [allVehicles.data, detail.data, detail.isError, initialized, slug, active]);

  const link = useMutation({
    mutationFn: (vehicleId: number) => api.post(`/api/admin/vehicles/${vehicleId}/products/${productId}`),
    onError: (e) => toast(e.message, 'error'),
  });

  const unlink = useMutation({
    mutationFn: (vehicleId: number) => api.delete(`/api/admin/vehicles/${vehicleId}/products/${productId}`),
    onError: (e) => toast(e.message, 'error'),
  });

  const addVehicle = async (v: Vehicle) => {
    if (linked.some((x) => x.id === v.id)) return;
    await link.mutateAsync(v.id);
    setLinked((l) => [...l, v]);
    setFilter('');
    queryClient.invalidateQueries({ queryKey: ['unmatched'] });
    toast('Автомобиль привязан');
  };

  const removeVehicle = async (v: Vehicle) => {
    await unlink.mutateAsync(v.id);
    setLinked((l) => l.filter((x) => x.id !== v.id));
    queryClient.invalidateQueries({ queryKey: ['unmatched'] });
    toast('Привязка удалена');
  };

  const candidates = (vehicles.data?.content ?? []).filter((v) => !linked.some((x) => x.id === v.id));
  const totalFound = vehicles.data?.totalElements ?? 0;

  return (
    <Box sx={{ maxWidth: 680, animation: 'aIn .2s ease both' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '14px' }}>
        <Box sx={{ fontSize: '13.5px', fontWeight: 600 }}>Привязанные автомобили</Box>
      </Box>
      <Box sx={{ border: `1px solid ${C.line}`, borderRadius: '11px', overflow: 'hidden', mb: '20px' }}>
        {linked.map((v) => (
          <Box key={v.id} sx={{ display: 'flex', alignItems: 'center', gap: '12px', p: '13px 16px', borderBottom: `1px solid ${C.line2}` }}>
            <Box sx={{ width: 7, height: 7, background: C.accent, borderRadius: '2px', transform: 'rotate(45deg)', flexShrink: 0 }} />
            <Box sx={{ fontSize: '13.5px', fontWeight: 600, flex: 1 }}>
              {v.make} {v.model}
            </Box>
            <Mono sx={{ fontSize: 12, color: C.muted }}>
              {v.yearFrom ?? '…'}–{v.yearTo ?? '…'}
              {v.engine ? ` · ${v.engine}` : ''}
            </Mono>
            <Box
              component="span"
              onClick={() => removeVehicle(v)}
              sx={{ cursor: 'pointer', color: C.muted2, fontSize: 16, '&:hover': { color: C.warn } }}
            >
              ×
            </Box>
          </Box>
        ))}
        {linked.length === 0 && (
          <Box sx={{ p: '16px', fontSize: 13, color: C.muted }}>
            Пока нет привязок — товар не виден в подборе по авто.
          </Box>
        )}
      </Box>

      <Box sx={{ fontSize: '13.5px', fontWeight: 600, mb: '10px' }}>Добавить из справочника</Box>
      <InputBase
        placeholder="Поиск: марка, модель…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
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
      <Box sx={{ border: `1px solid ${C.line}`, borderRadius: '11px', overflow: 'auto', maxHeight: 260 }}>
        {vehicles.isLoading && <Box sx={{ p: '14px 16px', fontSize: 13, color: C.muted }}>Загрузка…</Box>}
        {candidates.map((v) => (
          <Box
            key={v.id}
            onClick={() => addVehicle(v)}
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
        {!vehicles.isLoading && candidates.length === 0 && (
          <Box sx={{ p: '14px 16px', fontSize: 13, color: C.muted }}>Нет совпадений.</Box>
        )}
      </Box>
      {totalFound > 50 && (
        <Box sx={{ mt: '8px', fontSize: 12, color: C.muted }}>
          Показаны первые 50 из {totalFound} — уточните поиск.
        </Box>
      )}
    </Box>
  );
}
