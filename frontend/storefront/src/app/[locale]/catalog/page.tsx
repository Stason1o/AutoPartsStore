import Link from 'next/link';
import { serverGet, type CategoryNode, type Page, type ProductListItem } from '@/lib/api';
import { getDict } from '@/i18n/dictionaries';
import ProductCard from '@/components/ProductCard';
import { T } from '@/tokens';

interface CatalogParams {
  search?: string;
  categoryId?: string;
  vehicleId?: string;
  inStock?: string;
  sort?: string;
  dir?: string;
  page?: string;
}

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<CatalogParams>;
};

export async function generateMetadata({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const dict = getDict(locale);
  if (sp.search) {
    return { title: `${dict.meta.searchPrefix} «${sp.search}»`, robots: { index: false } };
  }
  if (sp.categoryId) {
    try {
      const categories = await serverGet<CategoryNode[]>('/api/categories');
      const category = categories.find(c => String(c.id) === sp.categoryId);
      if (category) {
        return {
          title: `${category.name} ${dict.meta.categorySuffix}`,
          description: dict.meta.catalogDescription,
        };
      }
    } catch { /* метаданные по умолчанию */ }
  }
  return { title: dict.meta.catalogTitle, description: dict.meta.catalogDescription };
}

function buildQuery(locale: string, params: CatalogParams, overrides: Partial<CatalogParams>): string {
  const merged: Record<string, string | undefined> = { ...params, ...overrides };
  const qs = Object.entries(merged)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
    .join('&');
  return qs ? `/${locale}/catalog?${qs}` : `/${locale}/catalog`;
}

export default async function CatalogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = getDict(locale).catalog;

  const apiQuery = new URLSearchParams();
  if (sp.search) apiQuery.set('search', sp.search);
  if (sp.categoryId) apiQuery.set('categoryId', sp.categoryId);
  if (sp.vehicleId) apiQuery.set('vehicleId', sp.vehicleId);
  if (sp.inStock === 'true') apiQuery.set('inStock', 'true');
  if (sp.sort) apiQuery.set('sort', sp.sort);
  if (sp.dir) apiQuery.set('dir', sp.dir);
  apiQuery.set('page', sp.page ?? '0');
  apiQuery.set('size', '24');

  let products: Page<ProductListItem> = { content: [], totalElements: 0, totalPages: 0, number: 0 };
  let categories: CategoryNode[] = [];
  try {
    [products, categories] = await Promise.all([
      serverGet<Page<ProductListItem>>(`/api/products?${apiQuery}`),
      serverGet<CategoryNode[]>('/api/categories'),
    ]);
  } catch { /* пустое состояние ниже */ }

  const activeCategory = categories.find(c => String(c.id) === sp.categoryId);
  const title = sp.search
    ? `${t.search}: «${sp.search}»`
    : activeCategory?.name ?? t.allParts;
  const inStockOn = sp.inStock === 'true';
  const currentSort = sp.dir === 'desc' && sp.sort === 'price' ? 'priceDesc'
    : sp.sort === 'price' ? 'priceAsc' : 'pop';
  const page = Number(sp.page ?? '0');

  return (
    <div className="sc-in" style={{ padding: '24px 0 56px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.muted, marginBottom: 14, fontFamily: T.mono }}>
        <Link href={`/${locale}`} style={{ color: T.muted, textDecoration: 'none' }}>{t.home}</Link>
        <span>/</span><span style={{ color: T.ink }}>{title}</span>
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.01em', margin: '0 0 24px' }}>{title}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '262px 1fr', gap: 24, alignItems: 'start' }}>
        {/* ФИЛЬТРЫ */}
        <aside style={{ position: 'sticky', top: 96, background: T.paper, border: `1px solid ${T.line}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{t.filters}</span>
            {(sp.categoryId || inStockOn || sp.search) && (
              <Link href={sp.vehicleId ? `/${locale}/catalog?vehicleId=${sp.vehicleId}` : `/${locale}/catalog`} style={{ color: T.accent, fontSize: 12.5, fontWeight: 600, textDecoration: 'none' }}>{t.reset}</Link>
            )}
          </div>
          <div style={{ padding: '16px 18px', borderBottom: `1px solid ${T.line}` }}>
            <div style={{ fontFamily: T.mono, fontSize: 10.5, letterSpacing: '.14em', color: T.muted2, textTransform: 'uppercase', marginBottom: 12 }}>{t.category}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Link href={buildQuery(locale, sp, { categoryId: undefined, page: undefined })} style={{ display: 'block', background: !sp.categoryId ? T.accentSoft : 'transparent', borderRadius: 8, padding: '8px 10px', textDecoration: 'none', fontSize: 13.5, fontWeight: !sp.categoryId ? 700 : 500, color: !sp.categoryId ? T.accent : T.ink }}>
                {t.allParts}
              </Link>
              {categories.map(c => {
                const active = String(c.id) === sp.categoryId;
                return (
                  <Link key={c.id} href={buildQuery(locale, sp, { categoryId: String(c.id), page: undefined })} style={{ display: 'block', background: active ? T.accentSoft : 'transparent', borderRadius: 8, padding: '8px 10px', textDecoration: 'none', fontSize: 13.5, fontWeight: active ? 700 : 500, color: active ? T.accent : T.ink }}>
                    {c.name}
                  </Link>
                );
              })}
            </div>
          </div>
          <div style={{ padding: '16px 18px' }}>
            <Link href={buildQuery(locale, sp, { inStock: inStockOn ? undefined : 'true', page: undefined })} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
              <span style={{ width: 40, height: 23, borderRadius: 14, background: inStockOn ? T.accent : '#cdd3db', position: 'relative', flexShrink: 0, transition: 'background .15s' }}>
                <span style={{ position: 'absolute', top: 2.5, left: inStockOn ? 19 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,.25)' }} />
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>{t.inStockOnly}</span>
            </Link>
          </div>
        </aside>

        {/* ТОВАРЫ */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: T.mono, fontSize: 13, color: T.muted }}>
              {t.found} <strong style={{ color: T.ink }}>{products.totalElements}</strong>
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { key: 'pop', label: t.sortName, q: { sort: undefined, dir: undefined } },
                { key: 'priceAsc', label: t.sortCheap, q: { sort: 'price', dir: 'asc' } },
                { key: 'priceDesc', label: t.sortExpensive, q: { sort: 'price', dir: 'desc' } },
              ].map(opt => (
                <Link key={opt.key} href={buildQuery(locale, sp, { ...opt.q, page: undefined })} style={{ padding: '9px 14px', borderRadius: 9, border: `1px solid ${currentSort === opt.key ? T.accent : T.line}`, background: currentSort === opt.key ? T.accentSoft : T.paper, color: currentSort === opt.key ? T.accent : T.ink, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
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
                {sp.vehicleId ? t.emptyForCar : t.emptyNothing}
              </div>
              <div style={{ fontSize: 14, color: T.muted, maxWidth: 400, margin: '0 auto 22px', lineHeight: 1.55 }}>
                {t.emptyHint}
              </div>
              <a href="tel:+37322001122" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: T.g800, color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '13px 22px', fontWeight: 700, fontSize: 14.5, fontFamily: T.mono }}>
                +373 22 00 11 22
              </a>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                {products.content.map(p => (
                  <ProductCard key={p.id} product={p} fitsCar={Boolean(sp.vehicleId)} />
                ))}
              </div>
              {products.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 26 }}>
                  {page > 0 && (
                    <Link href={buildQuery(locale, sp, { page: String(page - 1) })} style={{ padding: '11px 20px', borderRadius: 9, border: `1px solid ${T.line}`, background: T.paper, color: T.ink, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>{t.back}</Link>
                  )}
                  <span style={{ padding: '11px 16px', fontFamily: T.mono, fontSize: 14, color: T.muted }}>
                    {page + 1} / {products.totalPages}
                  </span>
                  {page + 1 < products.totalPages && (
                    <Link href={buildQuery(locale, sp, { page: String(page + 1) })} style={{ padding: '11px 20px', borderRadius: 9, border: `1px solid ${T.line}`, background: T.paper, color: T.ink, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>{t.forward}</Link>
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
