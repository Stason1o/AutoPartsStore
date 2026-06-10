'use client';
import { useStore } from '@/lib/store';
import { T } from '@/theme';

export default function Toast() {
  const { toast } = useStore();
  if (!toast) return null;
  return (
    <div style={{ position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)', zIndex: 90, background: T.g900, color: '#fff', border: `1px solid ${T.g700}`, borderRadius: 11, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 16px 40px rgba(0,0,0,.35)', animation: 'toastIn .25s ease both', fontSize: 14, fontWeight: 600 }}>
      <span style={{ width: 20, height: 20, borderRadius: '50%', background: T.ok, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5"><path d="m5 13 4 4L19 7" /></svg>
      </span>
      {toast}
    </div>
  );
}
