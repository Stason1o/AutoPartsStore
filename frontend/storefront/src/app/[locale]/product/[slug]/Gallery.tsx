'use client';
import { useCallback, useEffect, useState } from 'react';
import { photoUrl } from '@/lib/api';
import { useI18n } from '@/i18n/I18nProvider';
import { T } from '@/tokens';

export default function Gallery({ photoIds, name }: { photoIds: number[]; name: string }) {
  const { dict } = useI18n();
  const t = dict.product;
  const [active, setActive] = useState(photoIds[0] ?? null);
  const [lightbox, setLightbox] = useState(false);

  const index = active ? photoIds.indexOf(active) : -1;

  const step = useCallback((delta: number) => {
    if (index < 0) return;
    const next = (index + delta + photoIds.length) % photoIds.length;
    setActive(photoIds[next]);
  }, [index, photoIds]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightbox, step]);

  return (
    <div>
      <button
        onClick={() => active && setLightbox(true)}
        className={active ? undefined : 'placeholder-stripes'}
        style={{ width: '100%', height: 380, borderRadius: 16, display: 'grid', placeItems: 'center', border: `1px solid ${T.line}`, overflow: 'hidden', cursor: active ? 'zoom-in' : 'default', padding: 0, background: active ? '#fff' : undefined }}
        aria-label={t.openPhoto}
      >
        {active ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl(active)} alt={name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        ) : (
          <span style={{ fontFamily: T.mono, fontSize: 13, letterSpacing: '.12em', color: T.muted2 }}>{t.photoSoon}</span>
        )}
      </button>

      {photoIds.length > 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 10 }}>
          {photoIds.map(id => (
            <button key={id} onClick={() => setActive(id)} style={{ height: 74, borderRadius: 10, border: `1px solid ${id === active ? T.accent : T.line}`, cursor: 'pointer', overflow: 'hidden', padding: 0, background: '#fff' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(id, true)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </button>
          ))}
        </div>
      )}

      {/* ЛАЙТБОКС — полноэкранный просмотр */}
      {lightbox && active && (
        <div
          onClick={() => setLightbox(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(13,15,18,.92)', display: 'grid', placeItems: 'center', animation: 'scIn .15s ease both' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl(active)}
            alt={name}
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '92vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: 8 }}
          />
          <button onClick={() => setLightbox(false)} aria-label="Закрыть" style={{ position: 'fixed', top: 20, right: 24, width: 44, height: 44, borderRadius: 11, background: 'rgba(255,255,255,.1)', border: `1px solid ${T.lineD}`, color: '#fff', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
          {photoIds.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); step(-1); }} aria-label="Предыдущее" style={{ position: 'fixed', left: 20, top: '50%', transform: 'translateY(-50%)', width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,.1)', border: `1px solid ${T.lineD}`, color: '#fff', fontSize: 22, cursor: 'pointer' }}>‹</button>
              <button onClick={e => { e.stopPropagation(); step(1); }} aria-label="Следующее" style={{ position: 'fixed', right: 20, top: '50%', transform: 'translateY(-50%)', width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,.1)', border: `1px solid ${T.lineD}`, color: '#fff', fontSize: 22, cursor: 'pointer' }}>›</button>
              <span style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', fontFamily: T.mono, color: '#fff', fontSize: 14 }}>{index + 1} / {photoIds.length}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
