import { T } from '@/tokens';

/** Шестигранник с «S» — фирменный знак Sacramento. */
export default function Logo({ size = 38, compact = false }: { size?: number; compact?: boolean }) {
  const hex = 'polygon(25% 2%,75% 2%,100% 50%,75% 98%,25% 98%,0 50%)';
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', flexShrink: 0 }}>
      <span style={{ position: 'relative', width: size, height: size, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <span style={{ position: 'absolute', inset: 0, background: T.accent, clipPath: hex }} />
        <span style={{ position: 'absolute', inset: size * 0.21, background: T.g800, clipPath: hex }} />
        <span style={{ position: 'relative', fontFamily: T.mono, fontWeight: 700, fontSize: size * 0.42, color: '#fff' }}>S</span>
      </span>
      {!compact && (
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '.14em', color: '#fff' }}>SACRAMENTO</span>
          <span style={{ fontFamily: T.mono, fontSize: 9.5, letterSpacing: '.34em', color: T.muted2, marginTop: 4 }}>
            AUTO PARTS · CHIȘINĂU
          </span>
        </span>
      )}
    </span>
  );
}
