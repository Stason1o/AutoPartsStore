'use client';
import Link from 'next/link';
import { fmt, photoUrl, type ProductListItem } from '@/lib/api';
import { useStore } from '@/lib/store';
import { T } from '@/tokens';

export function stockBadge(available: number) {
  return available > 0
    ? { label: `В наличии: ${available} шт`, color: T.ok, bg: T.okSoft }
    : { label: 'Нет в наличии', color: T.warn, bg: T.warnSoft };
}

export default function ProductCard({ product, fitsCar }: { product: ProductListItem; fitsCar?: boolean }) {
  const { addToCart, showToast } = useStore();
  const inStock = product.available > 0 && product.price != null;
  const badge = stockBadge(product.available);

  const add = () => {
    if (!inStock) return;
    addToCart({
      productId: product.id, slug: product.slug, sku: product.sku, name: product.name,
      brand: product.brand, price: product.price!, available: product.available,
    });
    showToast(`Добавлено в корзину: ${product.name}`);
  };

  return (
    <div style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Link href={`/product/${product.slug}`} style={{ display: 'block', position: 'relative', textDecoration: 'none' }}>
        <div className={product.mainPhotoId ? undefined : 'placeholder-stripes'} style={{ height: 150, display: 'grid', placeItems: 'center', borderBottom: `1px solid ${T.line}`, overflow: 'hidden', background: product.mainPhotoId ? '#fff' : undefined }}>
          {product.mainPhotoId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl(product.mainPhotoId, true)} alt={product.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '.1em', color: T.muted2 }}>ФОТО</span>
          )}
        </div>
        <span style={{ position: 'absolute', top: 10, left: 10, fontFamily: T.mono, fontSize: 10.5, fontWeight: 600, color: badge.color, background: badge.bg, borderRadius: 6, padding: '4px 8px' }}>
          {badge.label}
        </span>
      </Link>
      <div style={{ padding: '14px 15px 16px', display: 'flex', flexDirection: 'column', flex: 1, gap: 9 }}>
        {fitsCar && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', background: T.okSoft, color: T.ok, borderRadius: 6, padding: '4px 8px', fontSize: 11.5, fontWeight: 700 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="m5 13 4 4L19 7" /></svg>
            Подходит для вашего авто
          </span>
        )}
        <Link href={`/product/${product.slug}`} style={{ textDecoration: 'none', fontSize: 14.5, fontWeight: 600, lineHeight: 1.35, color: T.ink, minHeight: 39 }}>
          {product.name}
        </Link>
        <div style={{ fontFamily: T.mono, fontSize: 12, color: T.muted }}>арт. {product.sku}</div>
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, paddingTop: 6 }}>
          <div style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 21, color: T.ink, whiteSpace: 'nowrap' }}>
            {product.price != null ? fmt(product.price) : '—'} <span style={{ fontSize: 13, color: T.muted, fontWeight: 500 }}>MDL</span>
          </div>
        </div>
        <button onClick={add} disabled={!inStock} style={{ marginTop: 2, width: '100%', height: 42, background: inStock ? T.accent : T.paper3, color: inStock ? '#fff' : T.muted, border: 0, borderRadius: 9, fontWeight: 700, fontSize: 13.5, cursor: inStock ? 'pointer' : 'default' }}>
          {inStock ? 'В корзину' : 'Нет в наличии'}
        </button>
      </div>
    </div>
  );
}
