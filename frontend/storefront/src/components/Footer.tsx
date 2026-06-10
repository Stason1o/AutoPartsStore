import Link from 'next/link';
import Logo from '@/components/Logo';
import { T } from '@/tokens';

export default function Footer() {
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
          <a href="tel:+37322001122" style={{ color: '#fff', textDecoration: 'none', fontFamily: T.mono, fontWeight: 600, fontSize: 18, display: 'block', marginBottom: 10 }}>+373 22 00 11 22</a>
          <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>мун. Кишинёв,<br />ул. Каля Орхеюлуй 25<br />info@sacramento.md</div>
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
