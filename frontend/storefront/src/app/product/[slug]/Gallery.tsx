'use client';
import { useState } from 'react';
import { photoUrl } from '@/lib/api';
import { T } from '@/theme';

export default function Gallery({ photoIds, name }: { photoIds: number[]; name: string }) {
  const [active, setActive] = useState(photoIds[0] ?? null);

  return (
    <div>
      <div className="placeholder-stripes" style={{ height: 380, borderRadius: 16, display: 'grid', placeItems: 'center', border: `1px solid ${T.line}`, overflow: 'hidden' }}>
        {active ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl(active)} alt={name} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#fff' }} />
        ) : (
          <span style={{ fontFamily: T.mono, fontSize: 13, letterSpacing: '.12em', color: T.muted2 }}>ФОТО СКОРО ПОЯВИТСЯ</span>
        )}
      </div>
      {photoIds.length > 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 10 }}>
          {photoIds.map(id => (
            <button key={id} onClick={() => setActive(id)} style={{ height: 74, borderRadius: 10, border: `1px solid ${id === active ? T.accent : T.line}`, cursor: 'pointer', overflow: 'hidden', padding: 0, background: '#fff' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(id, true)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
