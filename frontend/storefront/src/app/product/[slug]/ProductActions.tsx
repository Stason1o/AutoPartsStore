'use client';
import { useState } from 'react';
import { fmt, type ProductDetail } from '@/lib/api';
import { useStore } from '@/lib/store';
import { stockBadge } from '@/components/ProductCard';
import { T } from '@/theme';

export default function ProductActions({ product: p }: { product: ProductDetail }) {
  const { addToCart, showToast, car } = useStore();
  const [copied, setCopied] = useState('');
  const inStock = p.available > 0 && p.price != null;
  const badge = stockBadge(p.available);

  const copy = (num: string) => {
    try { navigator.clipboard?.writeText(num); } catch { /* без clipboard API просто показываем тост */ }
    setCopied(num);
    showToast(`Артикул скопирован: ${num}`);
    setTimeout(() => setCopied(prev => (prev === num ? '' : prev)), 1500);
  };

  const add = () => {
    if (!inStock) return;
    addToCart({
      productId: p.id, slug: p.slug, sku: p.sku, name: p.name,
      brand: p.brand, price: p.price!, available: p.available,
    });
    showToast(`Добавлено в корзину: ${p.name}`);
  };

  return (
    <div>
      <div style={{ fontFamily: T.mono, fontSize: 11.5, letterSpacing: '.14em', color: T.muted2, textTransform: 'uppercase', marginBottom: 10 }}>
        {p.categoryName ?? 'Запчасти'}{p.brand ? ` · ${p.brand}` : ''}
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.01em', lineHeight: 1.18, margin: '0 0 16px' }}>{p.name}</h1>

      {car && p.fitsVehicles.length > 0 && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: T.okSoft, color: T.ok, borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 700, marginBottom: 18 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="m5 13 4 4L19 7" /></svg>
          Проверьте применимость ниже — ваш {car.label}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 38, letterSpacing: '-.01em', whiteSpace: 'nowrap' }}>
          {p.price != null ? fmt(p.price) : '—'} <span style={{ fontSize: 18, color: T.muted, fontWeight: 500 }}>MDL</span>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 700, color: badge.color, background: badge.bg, borderRadius: 8, padding: '7px 12px' }}>
          {badge.label}
        </span>
      </div>

      <div style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 13, padding: '16px 18px', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 12, borderBottom: `1px solid ${T.line}` }}>
          <span style={{ fontSize: 13, color: T.muted }}>Артикул</span>
          <button onClick={() => copy(p.sku)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: T.paper2, border: `1px solid ${T.line}`, borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontFamily: T.mono, fontSize: 14, fontWeight: 600, color: T.ink }}>
            {p.sku}
            {copied === p.sku && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.ok} strokeWidth="3"><path d="m5 13 4 4L19 7" /></svg>}
          </button>
        </div>
        {p.oemNumbers.length > 0 && (
          <div style={{ paddingTop: 12 }}>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 10 }}>
              OEM-номера <span style={{ color: T.muted2 }}>(нажмите, чтобы скопировать)</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {p.oemNumbers.map(num => (
                <button key={num} onClick={() => copy(num)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: T.paper2, border: `1px solid ${T.line}`, borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontFamily: T.mono, fontSize: 13.5, fontWeight: 600, color: T.ink }}>
                  {num}
                  {copied === num && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.ok} strokeWidth="3"><path d="m5 13 4 4L19 7" /></svg>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button onClick={add} disabled={!inStock} style={{ width: '100%', height: 56, background: inStock ? T.accent : T.muted2, color: '#fff', border: 0, borderRadius: 11, fontWeight: 700, fontSize: 16, cursor: inStock ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h2.2l2.3 12.4a1.6 1.6 0 0 0 1.6 1.3h8.7a1.6 1.6 0 0 0 1.6-1.2L21 7H6" /></svg>
        {inStock ? 'В корзину' : 'Нет в наличии'}
      </button>
      <div style={{ marginTop: 14, display: 'flex', gap: 18, fontSize: 13, color: T.muted, flexWrap: 'wrap' }}>
        <span>Самовывоз сегодня</span><span>·</span><span>Доставка курьером 50 MDL</span><span>·</span><span>Возврат 14 дней</span>
      </div>
    </div>
  );
}
