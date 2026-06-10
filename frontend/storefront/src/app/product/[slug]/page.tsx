import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { serverGet, type ProductDetail } from '@/lib/api';
import ProductActions from './ProductActions';
import Gallery from './Gallery';
import { T } from '@/theme';

async function loadProduct(slug: string): Promise<ProductDetail | null> {
  try {
    return await serverGet<ProductDetail>(`/api/products/${encodeURIComponent(slug)}`);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await loadProduct(slug);
  if (!p) return { title: 'Товар не найден' };
  const description = `${p.name}${p.brand ? ` (${p.brand})` : ''}. ${p.available > 0 ? 'В наличии в Кишинёве.' : 'Уточняйте наличие.'} Цена: ${p.price ?? '—'} MDL. Артикул ${p.sku}.`;
  return {
    title: `${p.name} — арт. ${p.sku}`,
    description,
    alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title: p.name, description, type: 'website' },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await loadProduct(slug);
  if (!p) notFound();

  const inStock = p.available > 0;

  return (
    <div className="sc-in" style={{ padding: '24px 0 56px' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'Product',
            name: p.name, sku: p.sku, brand: p.brand ?? undefined,
            offers: {
              '@type': 'Offer', priceCurrency: 'MDL', price: p.price ?? undefined,
              availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            },
          }),
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.muted, marginBottom: 18, fontFamily: T.mono, flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: T.muted, textDecoration: 'none' }}>Главная</Link>
        <span>/</span>
        <Link href={p.categoryId ? `/catalog?categoryId=${p.categoryId}` : '/catalog'} style={{ color: T.muted, textDecoration: 'none' }}>
          {p.categoryName ?? 'Каталог'}
        </Link>
        <span>/</span><span style={{ color: T.ink }}>{p.sku}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, alignItems: 'start' }}>
        <Gallery photoIds={p.photoIds} name={p.name} />
        <ProductActions product={p} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 36 }}>
        <div style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 14, padding: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 12px' }}>Описание</h3>
          <p style={{ fontSize: 14.5, color: '#3c424b', lineHeight: 1.65, margin: 0 }}>
            {p.description || 'Подробное описание уточняйте у менеджера по телефону +373 22 00 11 22.'}
          </p>
        </div>
        <div style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 14, padding: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 14px' }}>Применимость</h3>
          {p.fitsVehicles.length === 0 ? (
            <p style={{ fontSize: 14, color: T.muted, margin: 0 }}>Совместимость уточняйте по VIN у менеджера.</p>
          ) : (
            <div>
              {p.fitsVehicles.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: `1px solid ${T.line}` }}>
                  <span style={{ width: 7, height: 7, background: T.accent, borderRadius: 2, transform: 'rotate(45deg)', flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{f}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
