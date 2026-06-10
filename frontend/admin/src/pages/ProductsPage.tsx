import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import Pagination from '@mui/material/Pagination';
import { api, qs } from '../api/client';
import type { AdminProduct, Category, Page, ProductRequest, Rates } from '../api/types';
import { C } from '../theme';
import { Card, Mono, TableHead, Toggle } from '../components/ui';
import { fmtMoney } from '../format';
import { useToast } from '../components/Toast';

const selectSx = {
  height: 40,
  background: C.paper,
  border: `1px solid ${C.line}`,
  borderRadius: '9px',
  p: '0 14px',
  fontSize: '13.5px',
  color: C.ink,
  cursor: 'pointer',
  outline: 'none',
  fontFamily: 'inherit',
};

export function toProductRequest(p: AdminProduct): ProductRequest {
  return {
    sku: p.sku,
    name: p.name,
    brand: p.brand,
    description: p.description,
    categoryId: p.categoryId,
    purchasePrice: p.purchasePrice,
    purchaseCurrency: p.purchaseCurrency,
    markupPercent: p.markupPercent,
    retailPrice: p.retailPrice,
    retailPriceManual: p.retailPriceManual,
    wholesalePrice: p.wholesalePrice,
    stockQty: p.stockQty,
    shelf: p.shelf,
    adminNote: p.adminNote,
    active: p.active,
    oemNumbers: p.oemNumbers,
  };
}

export default function ProductsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();

  const search = params.get('search') ?? '';
  const categoryId = params.get('categoryId') ?? '';
  const brand = params.get('brand') ?? '';
  const inStock = params.get('inStock') === 'true';
  const activeOnly = params.get('includeInactive') !== 'true';
  const page = Number(params.get('page') ?? '0');

  const [searchDraft, setSearchDraft] = useState(search);
  const [brandDraft, setBrandDraft] = useState(brand);

  useEffect(() => setSearchDraft(search), [search]);
  useEffect(() => setBrandDraft(brand), [brand]);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null || value === '') next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  // debounce search / brand
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchDraft !== search) setParam('search', searchDraft || null);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (brandDraft !== brand) setParam('brand', brandDraft || null);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandDraft]);

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/api/admin/categories'),
  });

  const products = useQuery({
    queryKey: ['products', { search, categoryId, brand, inStock, activeOnly, page }],
    queryFn: () =>
      api.get<Page<AdminProduct>>(
        '/api/admin/products' +
          qs({
            search: search || undefined,
            categoryId: categoryId || undefined,
            brand: brand || undefined,
            inStock: inStock || undefined,
            includeInactive: !activeOnly || undefined,
            page,
            size: 50,
            sort: 'name',
            dir: 'asc',
          }),
      ),
  });

  const rates = useQuery({ queryKey: ['rates'], queryFn: () => api.get<Rates>('/api/admin/rates') });
  const usd = rates.data?.usd != null ? Number(rates.data.usd) : null;
  const eur = rates.data?.eur != null ? Number(rates.data.eur) : null;

  const toggleActive = useMutation({
    mutationFn: (p: AdminProduct) =>
      api.put<AdminProduct>(`/api/admin/products/${p.id}`, { ...toProductRequest(p), active: !p.active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast('Товар обновлён');
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const catName = (id: number | null) => categories.data?.find((c) => c.id === id)?.name ?? '—';

  const purchaseMdl = (p: AdminProduct): string => {
    if (p.purchasePrice == null) return '';
    const cur = p.purchaseCurrency ?? 'MDL';
    if (cur === 'USD' && usd) return '≈ ' + fmtMoney(Number(p.purchasePrice) * usd);
    if (cur === 'EUR' && eur) return '≈ ' + fmtMoney(Number(p.purchasePrice) * eur);
    return '';
  };

  const purchaseFmt = (p: AdminProduct): string => {
    if (p.purchasePrice == null) return '—';
    const cur = p.purchaseCurrency ?? 'MDL';
    const sym = cur === 'USD' ? '$' : cur === 'EUR' ? '€' : '';
    return sym ? sym + Number(p.purchasePrice) : `${fmtMoney(p.purchasePrice)} L`;
  };

  const grid = '52px minmax(220px,1fr) 130px 104px 92px 84px 78px 80px 64px 44px';
  const data = products.data;

  return (
    <Box sx={{ animation: 'aIn .25s ease both' }}>
      {/* toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', mb: '16px', flexWrap: 'wrap' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            background: C.paper,
            border: `1px solid ${C.line}`,
            borderRadius: '9px',
            px: '12px',
            height: 40,
            width: 260,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.muted2} strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <InputBase
            placeholder="Артикул, название, OEM…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            sx={{ flex: 1, fontSize: '13.5px', px: '9px' }}
          />
        </Box>

        <Box
          component="select"
          value={categoryId}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setParam('categoryId', e.target.value || null)}
          sx={selectSx}
        >
          <option value="">Все категории</option>
          {(categories.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Box>

        <InputBase
          placeholder="Бренд"
          value={brandDraft}
          onChange={(e) => setBrandDraft(e.target.value)}
          sx={{
            height: 40,
            width: 130,
            background: C.paper,
            border: `1px solid ${C.line}`,
            borderRadius: '9px',
            px: '14px',
            fontSize: '13.5px',
          }}
        />

        <Box
          component="label"
          onClick={() => setParam('inStock', inStock ? null : 'true')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            background: C.paper,
            border: `1px solid ${C.line}`,
            borderRadius: '9px',
            px: '14px',
            height: 40,
          }}
        >
          <Toggle on={inStock} />
          <Box sx={{ fontSize: 13, fontWeight: 600 }}>В наличии</Box>
        </Box>

        <Box
          component="label"
          onClick={() => setParam('includeInactive', activeOnly ? 'true' : null)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            background: C.paper,
            border: `1px solid ${C.line}`,
            borderRadius: '9px',
            px: '14px',
            height: 40,
          }}
        >
          <Toggle on={activeOnly} />
          <Box sx={{ fontSize: 13, fontWeight: 600 }}>Только активные</Box>
        </Box>

        <Box
          component="button"
          onClick={() => navigate('/products/new')}
          sx={{
            ml: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: C.accent,
            color: '#fff',
            border: 0,
            borderRadius: '9px',
            height: 40,
            px: '18px',
            fontWeight: 700,
            fontSize: '13.5px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            '&:hover': { background: C.accentH },
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Добавить товар
        </Box>
      </Box>

      {/* table */}
      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ minWidth: 980 }}>
            <TableHead
              gridTemplateColumns={grid}
              px="18px"
              columns={['', 'Артикул / название', 'Категория', 'Закупка', 'Розница', 'Опт', 'Остаток', 'Полка', 'Активн.', '']}
            />
            {products.isLoading && <Box sx={{ p: '24px', fontSize: 13, color: C.muted }}>Загрузка…</Box>}
            {data?.content.length === 0 && (
              <Box sx={{ p: '40px', textAlign: 'center', fontSize: 14, color: C.muted }}>Ничего не найдено. Измените фильтры или поиск.</Box>
            )}
            {(data?.content ?? []).map((p) => (
              <Box
                key={p.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: grid,
                  alignItems: 'center',
                  gap: '10px',
                  p: '12px 18px',
                  borderBottom: `1px solid ${C.line2}`,
                  opacity: p.active ? 1 : 0.6,
                  '&:hover': { background: C.paper2 },
                }}
              >
                <Box
                  onClick={() => navigate(`/products/${p.id}`)}
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '8px',
                    background: 'repeating-linear-gradient(135deg,#eef0f4 0 6px,#f6f7f9 6px 12px)',
                    border: `1px solid ${C.line}`,
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <Mono sx={{ fontSize: '7px', color: C.muted2, letterSpacing: '.04em' }}>{p.sku.split('-')[0]}</Mono>
                </Box>
                <Box onClick={() => navigate(`/products/${p.id}`)} sx={{ textAlign: 'left', cursor: 'pointer', minWidth: 0 }}>
                  <Mono sx={{ fontSize: '11.5px', fontWeight: 600, color: C.accent, display: 'block' }}>{p.sku}</Mono>
                  <Box sx={{ fontSize: 13, fontWeight: 500, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', mt: '2px' }}>
                    {p.name}
                  </Box>
                </Box>
                <Box sx={{ fontSize: '12.5px', color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {catName(p.categoryId)}
                </Box>
                <Box sx={{ lineHeight: 1.25 }}>
                  <Mono sx={{ fontSize: 13, fontWeight: 600 }}>{purchaseFmt(p)}</Mono>
                  <br />
                  <Mono sx={{ fontSize: '10.5px', color: C.muted2 }}>{purchaseMdl(p)}</Mono>
                </Box>
                <Mono sx={{ fontSize: '13.5px', fontWeight: 700 }}>{fmtMoney(p.retailPrice)}</Mono>
                <Mono sx={{ fontSize: 13, color: C.muted }}>{fmtMoney(p.wholesalePrice)}</Mono>
                <Mono
                  sx={{
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: p.stockQty === 0 ? C.warn : p.stockQty <= 3 ? C.amber : C.ink,
                  }}
                >
                  {p.stockQty}
                </Mono>
                <Mono sx={{ fontSize: 12, color: C.ink2 }}>{p.shelf ?? '—'}</Mono>
                <Box sx={{ justifySelf: 'start' }}>
                  <Toggle small on={p.active} onClick={() => toggleActive.mutate(p)} />
                </Box>
                <Box
                  component="button"
                  onClick={() => navigate(`/products/${p.id}`)}
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
          </Box>
        </Box>
        {data && data.totalPages > 1 && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '14px 18px' }}>
            <Box sx={{ fontSize: '12.5px', color: C.muted }}>
              Всего: <Mono sx={{ fontWeight: 600 }}>{data.totalElements}</Mono>
            </Box>
            <Pagination
              count={data.totalPages}
              page={page + 1}
              onChange={(_, v) => setParam('page', String(v - 1))}
              shape="rounded"
              size="small"
            />
          </Box>
        )}
      </Card>
    </Box>
  );
}
