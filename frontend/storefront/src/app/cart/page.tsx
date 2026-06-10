'use client';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { fmt } from '@/lib/api';
import { T } from '@/theme';

export default function CartPage() {
  const { cart, setQty, removeItem, subtotal } = useStore();

  return (
    <div className="sc-in" style={{ padding: '24px 0 56px' }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.01em', margin: '0 0 24px' }}>Корзина</h1>

      {cart.length === 0 ? (
        <div style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 16, padding: '64px 32px', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: T.paper3, display: 'grid', placeItems: 'center', margin: '0 auto 20px', color: T.muted2 }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="20" r="1.6" /><circle cx="18" cy="20" r="1.6" /><path d="M2 3h2.2l2.3 12.4a1.6 1.6 0 0 0 1.6 1.3h8.7a1.6 1.6 0 0 0 1.6-1.2L21 7H6" /></svg>
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 8 }}>Корзина пуста</div>
          <div style={{ fontSize: 14, color: T.muted, marginBottom: 24 }}>Подберите запчасти по вашему автомобилю или загляните в каталог.</div>
          <Link href="/catalog" style={{ display: 'inline-block', background: T.accent, color: '#fff', borderRadius: 10, padding: '13px 26px', fontWeight: 700, fontSize: 14.5, textDecoration: 'none' }}>
            Перейти в каталог →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cart.map(it => (
              <div key={it.productId} style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
                <Link href={`/product/${it.slug}`} className="placeholder-stripes" style={{ width: 90, height: 90, borderRadius: 10, border: `1px solid ${T.line}`, flexShrink: 0, display: 'grid', placeItems: 'center', textDecoration: 'none' }}>
                  <span style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: '.08em', color: T.muted2 }}>ФОТО</span>
                </Link>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link href={`/product/${it.slug}`} style={{ textDecoration: 'none', fontSize: 15, fontWeight: 600, color: T.ink, lineHeight: 1.35 }}>{it.name}</Link>
                  <div style={{ fontFamily: T.mono, fontSize: 12, color: T.muted, marginTop: 4 }}>арт. {it.sku}{it.brand ? ` · ${it.brand}` : ''}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 13, color: T.muted, marginTop: 6 }}>{fmt(it.price)} MDL / шт</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${T.line}`, borderRadius: 9, overflow: 'hidden' }}>
                    <button onClick={() => setQty(it.productId, it.qty - 1)} style={{ width: 36, height: 36, background: T.paper2, border: 0, borderRight: `1px solid ${T.line}`, cursor: 'pointer', fontSize: 18, color: T.ink, lineHeight: 1 }}>−</button>
                    <span style={{ width: 42, textAlign: 'center', fontFamily: T.mono, fontWeight: 700, fontSize: 15 }}>{it.qty}</span>
                    <button onClick={() => setQty(it.productId, it.qty + 1)} style={{ width: 36, height: 36, background: T.paper2, border: 0, borderLeft: `1px solid ${T.line}`, cursor: 'pointer', fontSize: 18, color: T.ink, lineHeight: 1 }}>+</button>
                  </div>
                  <div style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 18, whiteSpace: 'nowrap' }}>{fmt(it.price * it.qty)} MDL</div>
                  <button onClick={() => removeItem(it.productId)} style={{ background: 'none', border: 0, color: T.muted, fontSize: 12.5, cursor: 'pointer', padding: 0 }}>удалить</button>
                </div>
              </div>
            ))}
          </div>

          <aside style={{ position: 'sticky', top: 96, background: T.paper, border: `1px solid ${T.line}`, borderRadius: 16, padding: 22 }}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Итого</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: T.muted, marginBottom: 10 }}>
              <span>Товары</span>
              <span style={{ fontFamily: T.mono, color: T.ink, fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(subtotal)} MDL</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: T.muted, marginBottom: 16, gap: 10 }}>
              <span>Доставка</span><span style={{ fontSize: 13, textAlign: 'right' }}>рассчитается при оформлении</span>
            </div>
            <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18, gap: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>К оплате</span>
              <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 24, whiteSpace: 'nowrap' }}>
                {fmt(subtotal)} <span style={{ fontSize: 14, color: T.muted, fontWeight: 500 }}>MDL</span>
              </span>
            </div>
            <Link href="/checkout" style={{ display: 'block', textAlign: 'center', lineHeight: '52px', height: 52, background: T.accent, color: '#fff', borderRadius: 11, fontWeight: 700, fontSize: 15.5, textDecoration: 'none' }}>
              Оформить заказ →
            </Link>
            <Link href="/catalog" style={{ display: 'block', textAlign: 'center', marginTop: 10, color: T.muted, fontSize: 13.5, textDecoration: 'none', padding: 8 }}>
              ← продолжить покупки
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
