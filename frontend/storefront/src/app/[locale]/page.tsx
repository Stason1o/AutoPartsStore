import Link from 'next/link';
import { serverGet, categoryImageUrl, type CategoryNode } from '@/lib/api';
import { getDict } from '@/i18n/dictionaries';
import VehiclePicker from '@/components/VehiclePicker';
import { T } from '@/tokens';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDict(locale);
  const t = dict.home;

  let categories: CategoryNode[] = [];
  try {
    categories = await serverGet<CategoryNode[]>('/api/categories');
  } catch { /* бэкенд недоступен — показываем страницу без категорий */ }

  return (
    <div className="sc-in">
      {/* HERO */}
      <section style={{ margin: '28px 0 0', background: T.g800, borderRadius: 18, overflow: 'hidden', position: 'relative', color: '#fff' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(900px 380px at 82% -10%,rgba(43,108,255,.28),transparent 60%)' }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: '46%', height: '100%', opacity: .5, backgroundImage: 'repeating-linear-gradient(115deg,rgba(255,255,255,.05) 0 1px,transparent 1px 26px)' }} />
        <div style={{ position: 'relative', padding: '54px 56px 48px', maxWidth: 760 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'rgba(43,108,255,.16)', border: '1px solid rgba(43,108,255,.4)', color: '#9cc0ff', borderRadius: 30, padding: '6px 14px', fontFamily: T.mono, fontSize: 12, letterSpacing: '.08em', marginBottom: 24 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent }} />{t.badge}
          </div>
          <h1 style={{ fontSize: 46, lineHeight: 1.04, fontWeight: 800, letterSpacing: '-.02em', margin: '0 0 16px' }}>
            {t.title1}<br />{t.title2}
          </h1>
          <p style={{ fontSize: 17, color: '#aeb6c2', margin: '0 0 30px', maxWidth: 520 }}>{t.subtitle}</p>
          <VehiclePicker />
        </div>
      </section>

      {/* КАТЕГОРИИ */}
      <section style={{ margin: '40px 0 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.01em', margin: 0 }}>{t.popularCategories}</h2>
          <Link href={`/${locale}/catalog`} style={{ color: T.accent, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>{t.allCatalog}</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {categories.slice(0, 8).map(cat => (
            <Link key={cat.id} href={`/${locale}/catalog?categoryId=${cat.id}`} style={{ textAlign: 'left', background: T.paper, border: `1px solid ${T.line}`, borderRadius: 14, padding: 20, textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className={cat.hasImage ? undefined : 'placeholder-stripes'} style={{ height: 88, borderRadius: 10, display: 'grid', placeItems: 'center', border: `1px solid ${T.line}`, overflow: 'hidden', background: cat.hasImage ? '#fff' : undefined }}>
                {cat.hasImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={categoryImageUrl(cat.id)} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '.1em', color: T.muted2, textTransform: 'uppercase' }}>{cat.slug}</span>
                )}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15.5, color: T.ink }}>{cat.name}</div>
            </Link>
          ))}
          {categories.length === 0 && (
            <div style={{ gridColumn: '1/-1', background: T.paper, border: `1px solid ${T.line}`, borderRadius: 14, padding: 32, textAlign: 'center', color: T.muted, fontSize: 14 }}>
              {t.catalogFilling}
            </div>
          )}
        </div>
      </section>

      {/* ПРЕИМУЩЕСТВА */}
      <section style={{ margin: '40px 0 56px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {t.adv.map(adv => (
          <div key={adv.title} style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 14, padding: 24, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <span style={{ width: 46, height: 46, borderRadius: 11, background: T.accentSoft, display: 'grid', placeItems: 'center', flexShrink: 0, color: T.accent }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m5 13 4 4L19 7" /></svg>
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{adv.title}</div>
              <div style={{ fontSize: 13.5, color: T.muted, lineHeight: 1.5 }}>{adv.text}</div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
