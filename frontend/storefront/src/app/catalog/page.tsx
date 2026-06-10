import Link from 'next/link';
import { serverGet, type CategoryNode, type Page, type ProductListItem } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { T } from '@/tokens';

export async function generateMetadata({ searchParams }: { searchParams: Promise<CatalogParams> }) {
  const params = await searchParams;
  if (params.search) {
    return { title: `Поиск «${params.search}»`, robots: { index: false } };
  }
  if (params.categoryId) {
    try {
      const categories = await serverGet<CategoryNode[]>('/api/categories');
      const category = categories.find(c => String(c.id) === params.categoryId);
      if (category) {
        return {
          title: `${category.name} — купить в Кишинёве`,
          description: `${category.name}: наличие на складе в Кишинёве, самовывоз сегодня, доставка курьером. Подбор по марке и модели автомобиля.`,
        };
      }
    } catch { /* метаданные по умолчанию */ }
  }
  return {
    title: 'Каталог автозапчастей',
    description: 'Весь каталог запчастей Sacramento: радиаторы, оптика, кузов и другое. Реальные остатки склада в Кишинёве.',
  };
}

interface CatalogParams {
  search?: string;
  categoryId?: string;
  vehicleId?: string;
  inStock?: string;
  sort?: string;
  dir?: string;
  page?: string;
}

function buildQuery(params: CatalogParams, overrides: Partial<CatalogParams>): string {
  const merged: Record<string, string | undefined> = { ...params, ...overrides };
  const qs = Object.entries(merged)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
    .join('&');
  return qs ? `/catalog?${qs}` : '/catalog';
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<CatalogParams> }) {
  const params = await searchParams;
  const apiQuery = new URLSearchParams();
  if (params.search) apiQuery.set('search', params.search);
  if (params.categoryId) apiQuery.set('categoryId', params.categoryId);
  if (params.vehicleId) apiQuery.set('vehicleId', params.vehicleId);
  if (params.inStock === 'true') apiQuery.set('inStock', 'true');
  if (params.sort) apiQuery.set('sort', params.sort);
  if (params.dir) apiQuery.set('dir', params.dir);
  apiQuery.set('page', params.page ?? '0');
  apiQuery.set('size', '24');

  let products: Page<ProductListItem> = { content: [], totalElements: 0, totalPages: 0, number: 0 };
  let categories: CategoryNode[] = [];
  try {
    [products, categories] = await Promise.all([
      serverGet<Page<ProductListItem>>(`/api/products?${apiQuery}`),
      serverGet<CategoryNode[]>('/api/categories'),
    ]);
  } catch { /* пустое состояние ниже */ }

  const activeCategory = categories.find(c => String(c.id) === params.categoryId);
  const title = params.search
    ? `Поиск: «${params.search}»`
    : activeCategory?.name ?? 'Все запчасти';
  const inStockOn = params.inStock === 'true';
  const currentSort = params.dir === 'desc' && params.sort === 'price' ? 'priceDesc'
    : params.sort === 'price' ? 'priceAsc' : 'pop';
  const page = Number(params.page ?? '0');

  return (
    <div className="sc-in" style={{ padding: '24px 0 56px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.muted, marginBottom: 14, fontFamily: T.mono }}>
        <Link href="/" style={{ color: T.muted, textDecoration: 'none' }}>Главная</Link>
        <span>/</span><span style={{ color: T.ink }}>{title}</span>
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.01em', margin: '0 0 24px' }}>{title}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '262px 1fr', gap: 24, alignItems: 'start' }}>
        {/* ФИЛЬТРЫ */}
        <aside style={{ position: 'sticky', top: 96, background: T.paper, border: `1px solid ${T.line}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Фильтры</span>
            {(params.categoryId || inStockOn || params.search) && (
              <Link href={params.vehicleId ? `/catalog?vehicleId=${params.vehicleId}` : '/catalog'} style={{ color: T.accent, fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}>сбросить</Link>
            )}
          </div>
          <div style={{ padding: '16px 18px', borderBottom: `1px solid ${T.line}` }}>
            <div style={{ fontFamily: T.mono, fontSize: 10.5, letterSpacing: '.14em', color: T.muted2, textTransform: 'uppercase', marginBottom: 12 }}>Категория</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Link href={buildQuery(params, { categoryId: undefined, page: undefined })} style={{ display: 'block', background: !params.categoryId ? T.accentSoft : 'transparent', borderRadius: 8, padding: '8px 10px', textDecoration: 'none', fontSize: 13.5, fontWeight: !params.categoryId ? 700 : 500, color: !params.categoryId ? T.accent : T.ink }}>
                Все запчасти
              </Link>
              {categories.map(c => {
                const active = String(c.id) === params.categoryId;
                return (
                  <Link key={c.id} href={buildQuery(params, { categoryId: String(c.id), page: undefined })} style={{ display: 'block', background: active ? T.accentSoft : 'transparent', borderRadius: 8, padding: '8px 10px', textDecoration: 'none', fontSize: 13.5, fontWeight: active ? 700 : 500, color: active ? T.accent : T.ink }}>
                    {c.name}
                  </Link>
                );
              })}
            </div>
          </div>
          <div style={{ padding: '16px 18px' }}>
            <Link href={buildQuery(params, { inStock: inStockOn ? undefined : 'true', page: undefined })} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
              <span style={{ width: 40, height: 23, borderRadius: 14, background: inStockOn ? T.accent : '#cdd3db', position: 'relative', flexShrink: 0, transition: 'background .15s' }}>
                <span style={{ position: 'absolute', top: 2.5, left: inStockOn ? 19 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>Только в наличии</span>
            </Link>
          </div>
        </aside>

        {/* ТОВАРЫ */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: T.mono, fontSize: 13, color: T.muted }}>
              Найдено: <strong style={{ color: T.ink }}>{products.totalElements}</strong>
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { key: 'pop', label: 'По названию', q: { sort: undefined, dir: undefined } },
                { key: 'priceAsc', label: 'Дешевле', q: { sort: 'price', dir: 'asc' } },
                { key: 'priceDesc', label: 'Дороже', q: { sort: 'price', dir: 'desc' } },
              ].map(opt => (
                <Link key={opt.key} href={buildQuery(params, { ...opt.q, page: undefined })} style={{ padding: '9px 14px', borderRadius: 9, border: `1px solid ${currentSort === opt.key ? T.accent : T.line}`, background: currentSort === opt.key ? T.accentSoft : T.paper, color: currentSort === opt.key ? T.accent : T.ink, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  {opt.label}
                </Link>
              ))}
            </div>
          </div>

          {products.content.length === 0 ? (
            <div style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 14, padding: '56px 32px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: T.paper3, display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={T.muted2} strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                {params.vehicleId ? 'Для вашего авто пока ничего нет в наличии' : 'Ничего не найдено'}
              </div>
              <div style={{ fontSize: 14, color: T.muted, maxWidth: 400, margin: '0 auto 22px', lineHeight: 1.55 }}>
                Попробуйте изменить запрос или фильтры — либо позвоните, подберём вручную и привезём под заказ.
              </div>
              <a href="tel:+37322001122" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: T.g800, color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '13px 22px', fontWeight: 700, fontSize: 14.5, fontFamily: T.mono }}>
                +373 22 00 11 22
              </a>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                {products.content.map(p => (
                  <ProductCard key={p.id} product={p} fitsCar={Boolean(params.vehicleId)} />
                ))}
              </div>
              {products.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 26 }}>
                  {page > 0 && (
                    <Link href={buildQuery(params, { page: String(page - 1) })} style={{ padding: '11px 20px', borderRadius: 9, border: `1px solid ${T.line}`, background: T.paper, color: T.ink, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>← Назад</Link>
                  )}
                  <span style={{ padding: '11px 16px', fontFamily: T.mono, fontSize: 14, color: T.muted }}>
                    {page + 1} / {products.totalPages}
                  </span>
                  {page + 1 < products.totalPages && (
                    <Link href={buildQuery(params, { page: String(page + 1) })} style={{ padding: '11px 20px', borderRadius: 9, border: `1px solid ${T.line}`, background: T.paper, color: T.ink, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>Вперёд →</Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
