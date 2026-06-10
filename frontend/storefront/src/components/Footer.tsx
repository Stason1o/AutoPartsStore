import Link from 'next/link';
import Logo from '@/components/Logo';
import { serverGet } from '@/lib/api';
import { T } from '@/tokens';

interface Contacts {
  contact_phone?: string;
  contact_email?: string;
  contact_viber?: string;
  contact_whatsapp?: string;
  contact_telegram?: string;
  contact_instagram?: string;
  pickupAddress?: string;
}

const MESSENGERS: { key: keyof Contacts; label: string; href: (v: string) => string }[] = [
  { key: 'contact_viber', label: 'Viber', href: v => `viber://chat?number=${encodeURIComponent(v)}` },
  { key: 'contact_whatsapp', label: 'WhatsApp', href: v => `https://wa.me/${v.replace(/\D/g, '')}` },
  { key: 'contact_telegram', label: 'Telegram', href: v => `https://t.me/${v.replace('@', '')}` },
  { key: 'contact_instagram', label: 'Instagram', href: v => `https://instagram.com/${v.replace('@', '')}` },
];

export default async function Footer() {
  let contacts: Contacts = {};
  try {
    contacts = await serverGet<Contacts>('/api/public-settings');
  } catch { /* подвал работает и без настроек */ }

  const phone = contacts.contact_phone || '+373 22 00 11 22';
  const email = contacts.contact_email || 'info@sacramento.md';
  const messengers = MESSENGERS
    .map(m => ({ ...m, value: (contacts[m.key] ?? '').trim() }))
    .filter(m => m.value !== '');

  return (
    <footer style={{ background: T.g800, color: '#aab1bd', marginTop: 20, borderTop: `1px solid ${T.g700}` }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '44px 24px 28px', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1.2fr', gap: 36 }}>
        <div>
          <div style={{ marginBottom: 16 }}><Logo size={32} /></div>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, maxWidth: 280, margin: 0 }}>
            Запчасти для европейских и азиатских авто. Наличие на складе в Кишинёве, самовывоз и доставка по Молдове.
          </p>
        </div>
        <div>
          <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '.16em', color: T.muted2, textTransform: 'uppercase', marginBottom: 14 }}>Каталог</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 14 }}>
            <Link href="/catalog" style={{ color: '#aab1bd', textDecoration: 'none' }}>Весь каталог</Link>
            <Link href="/cart" style={{ color: '#aab1bd', textDecoration: 'none' }}>Корзина</Link>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '.16em', color: T.muted2, textTransform: 'uppercase', marginBottom: 14 }}>Часы работы</div>
          <div style={{ fontSize: 14, lineHeight: 1.9 }}>
            Пн–Пт&nbsp;&nbsp;09:00–19:00<br />Сб&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;10:00–16:00<br />Вс&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;выходной
          </div>
        </div>
        <div>
          <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '.16em', color: T.muted2, textTransform: 'uppercase', marginBottom: 14 }}>Контакты</div>
          <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} style={{ color: '#fff', textDecoration: 'none', fontFamily: T.mono, fontWeight: 600, fontSize: 18, display: 'block', marginBottom: 10 }}>{phone}</a>
          <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>
            {contacts.pickupAddress || 'мун. Кишинёв, ул. Каля Орхеюлуй 25'}<br />
            <a href={`mailto:${email}`} style={{ color: '#aab1bd', textDecoration: 'none' }}>{email}</a>
          </div>
          {messengers.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              {messengers.map(m => (
                <a key={m.key} href={m.href(m.value)} target="_blank" rel="noopener noreferrer"
                   style={{ display: 'inline-flex', alignItems: 'center', background: T.g700, border: `1px solid ${T.lineD}`, color: '#fff', borderRadius: 8, padding: '7px 13px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  {m.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${T.g700}` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#6b7480', fontFamily: T.mono, letterSpacing: '.02em' }}>
          <span>© 2026 SACRAMENTO AUTO PARTS</span>
          <span>Цены указаны в молдавских леях (MDL)</span>
        </div>
      </div>
    </footer>
  );
}
