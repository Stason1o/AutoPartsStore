'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Logo from '@/components/Logo';
import { useStore } from '@/lib/store';
import { T } from '@/tokens';

export default function Header() {
  const { cartCount, car, setCar } = useStore();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/catalog?search=${encodeURIComponent(q)}` : '/catalog');
  };

  return (
    <>
      {/* верхняя полоса */}
      <div style={{ background: T.g900, color: '#aab1bd', fontSize: 12.5, borderBottom: `1px solid ${T.g750}` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '7px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: T.mono, letterSpacing: '.02em' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.ok, boxShadow: '0 0 0 3px rgba(31,157,91,.18)', animation: 'pulseDot 2.4s infinite' }} />
            Склад в Кишинёве · сегодня отгрузка до 17:00
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, whiteSpace: 'nowrap', flexShrink: 0 }}>
            <span style={{ color: '#6b7480' }}>Пн–Сб 09:00–19:00</span>
            <a href="tel:+37322001122" style={{ color: '#fff', textDecoration: 'none', fontFamily: T.mono, fontWeight: 600, letterSpacing: '.02em' }}>+373 22 00 11 22</a>
          </div>
        </div>
      </div>

      {/* шапка */}
      <header style={{ background: T.g800, color: '#fff', position: 'sticky', top: 0, zIndex: 40, borderBottom: `1px solid ${T.g700}`, boxShadow: '0 1px 0 rgba(0,0,0,.4)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 28 }}>
          <Link href="/" style={{ textDecoration: 'none' }}><Logo /></Link>

          <form onSubmit={submitSearch} style={{ flex: 1, maxWidth: 560, display: 'flex', alignItems: 'center', background: T.g700, border: `1px solid ${T.lineD}`, borderRadius: 9, padding: '0 14px', height: 46 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b929d" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Поиск по названию или артикулу (напр. 8K0121251H)"
              style={{ flex: 1, background: 'transparent', border: 0, outline: 'none', color: '#fff', fontSize: 14, padding: '0 12px', fontFamily: T.mono }}
            />
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <Link href="/cart" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, background: T.accent, color: '#fff', border: 0, borderRadius: 9, height: 46, padding: '0 18px 0 16px', fontWeight: 700, fontSize: 14, cursor: 'pointer', textDecoration: 'none' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h2.2l2.3 12.4a1.6 1.6 0 0 0 1.6 1.3h8.7a1.6 1.6 0 0 0 1.6-1.2L21 7H6" /></svg>
              Корзина
              {cartCount > 0 && (
                <span style={{ fontFamily: T.mono, fontWeight: 700, background: '#fff', color: T.accent, borderRadius: 20, minWidth: 22, height: 22, display: 'grid', placeItems: 'center', fontSize: 12, padding: '0 6px' }}>{cartCount}</span>
              )}
            </Link>
          </div>
        </div>

        {/* бейдж выбранного авто */}
        {car && (
          <div style={{ background: T.g850, borderTop: `1px solid ${T.g700}` }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '.16em', color: T.muted2, textTransform: 'uppercase' }}>Ваш автомобиль</span>
              <Link href={`/catalog?vehicleId=${car.vehicleId}`} style={{ display: 'flex', alignItems: 'center', gap: 10, background: T.g700, border: `1px solid ${T.lineD}`, borderRadius: 8, padding: '7px 14px', textDecoration: 'none' }}>
                <span style={{ width: 8, height: 8, background: T.ok, borderRadius: 2, transform: 'rotate(45deg)' }} />
                <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{car.label}</span>
                <span style={{ fontFamily: T.mono, fontSize: 12, color: T.muted2 }}>{car.sub}</span>
              </Link>
              <button onClick={() => setCar(null)} style={{ marginLeft: 'auto', background: 'transparent', border: `1px solid ${T.lineD}`, color: '#cfd4dc', borderRadius: 7, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                сменить авто
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
