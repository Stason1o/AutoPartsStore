'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { T } from '@/theme';

interface LastOrder {
  number: string;
  grandTotal: number;
  delivery: 'COURIER' | 'PICKUP';
  pickupAddress: string;
  pickupHours: string;
}

export default function OrderDonePage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = use(params);
  const [info, setInfo] = useState<LastOrder | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('sacramento.lastOrder');
      if (saved) {
        const parsed: LastOrder = JSON.parse(saved);
        if (parsed.number === decodeURIComponent(number)) setInfo(parsed);
      }
    } catch { /* нет данных — покажем только номер */ }
  }, [number]);

  const deliveryText = info?.delivery === 'PICKUP'
    ? `Самовывоз: ${info.pickupAddress} · ${info.pickupHours}. Дождитесь звонка — сообщим, когда заказ будет собран.`
    : 'Курьер привезёт заказ по согласованному с менеджером адресу. Оплата наличными при получении.';

  return (
    <div className="sc-in" style={{ padding: '56px 0 72px', maxWidth: 580, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ width: 84, height: 84, borderRadius: 22, background: T.ok, display: 'grid', placeItems: 'center', margin: '0 auto 24px', boxShadow: '0 12px 30px rgba(31,157,91,.3)' }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="m5 13 4 4L19 7" /></svg>
      </div>
      <h1 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 10px' }}>Заказ принят</h1>
      <p style={{ fontSize: 15.5, color: T.muted, margin: '0 0 28px' }}>Спасибо! Мы получили ваш заказ и уже резервируем запчасти на складе.</p>
      <div style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 16, padding: 26, textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 18, borderBottom: `1px dashed ${T.line}` }}>
          <span style={{ fontSize: 13.5, color: T.muted }}>Номер заказа</span>
          <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 22, letterSpacing: '.04em' }}>{decodeURIComponent(number)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, padding: '18px 0', borderBottom: `1px solid ${T.line}` }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: T.accentSoft, color: T.accent, display: 'grid', placeItems: 'center', flexShrink: 0, fontFamily: T.mono, fontWeight: 700 }}>1</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>Менеджер позвонит для подтверждения</div>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 3 }}>В рабочее время — в течение 15–30 минут.</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13, paddingTop: 18 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: T.accentSoft, color: T.accent, display: 'grid', placeItems: 'center', flexShrink: 0, fontFamily: T.mono, fontWeight: 700 }}>2</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>Получение</div>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 3 }}>{deliveryText}</div>
          </div>
        </div>
      </div>
      <Link href="/" style={{ display: 'inline-block', marginTop: 24, background: T.g800, color: '#fff', borderRadius: 11, padding: '14px 28px', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
        На главную
      </Link>
    </div>
  );
}
