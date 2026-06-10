import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import { C, MONO } from '../theme';

/** Шестиугольный логотип «S». */
export function HexLogo({ size = 34, inner = '#111419' }: { size?: number; inner?: string }) {
  const clip = 'polygon(25% 2%,75% 2%,100% 50%,75% 98%,25% 98%,0 50%)';
  return (
    <Box sx={{ position: 'relative', width: size, height: size, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      <Box sx={{ position: 'absolute', inset: 0, background: C.accent, clipPath: clip }} />
      <Box sx={{ position: 'absolute', inset: `${Math.round(size / 5)}px`, background: inner, clipPath: clip }} />
      <Box component="span" sx={{ position: 'relative', fontFamily: MONO, fontWeight: 700, fontSize: size * 0.41, color: '#fff' }}>
        S
      </Box>
    </Box>
  );
}

/** Карточка-панель в стиле прототипа. */
export function Card({ children, sx }: { children: ReactNode; sx?: object }) {
  return (
    <Box
      sx={{
        background: C.paper,
        border: `1px solid ${C.line}`,
        borderRadius: '13px',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(13,15,18,.04)',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

/** Подпись поля. */
export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <Box component="span" sx={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: C.ink2, mb: '7px' }}>
      {children}
    </Box>
  );
}

const inputSx = {
  width: '100%',
  height: 44,
  border: `1.5px solid ${C.line}`,
  borderRadius: '9px',
  px: '13px',
  fontSize: 14,
  color: C.ink,
  background: '#fff',
  '&.Mui-focused': { borderColor: C.accent },
  '&.Mui-disabled': { opacity: 0.55, background: C.paper2 },
  '& input': { p: 0, height: '100%' },
};

/** Текстовое поле в стиле прототипа. */
export function Field(props: {
  label?: ReactNode;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  bold?: boolean;
  type?: string;
  disabled?: boolean;
  multiline?: boolean;
  sx?: object;
  gridColumn?: string;
}) {
  const { label, value, onChange, placeholder, mono, bold, type, disabled, multiline, sx, gridColumn } = props;
  const input = (
    <InputBase
      value={value}
      type={type}
      disabled={disabled}
      multiline={multiline}
      minRows={multiline ? 3 : undefined}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
      sx={{
        ...inputSx,
        ...(mono ? { fontFamily: MONO } : {}),
        ...(bold ? { fontWeight: 700 } : {}),
        ...(multiline ? { height: 'auto', minHeight: 90, py: '11px', alignItems: 'flex-start' } : {}),
        ...sx,
      }}
    />
  );
  if (!label) return input;
  return (
    <Box component="label" sx={{ display: 'block', gridColumn }}>
      <FieldLabel>{label}</FieldLabel>
      {input}
    </Box>
  );
}

/** Переключатель-тумблер как в прототипе. */
export function Toggle({ on, onClick, small }: { on: boolean; onClick?: () => void; small?: boolean }) {
  const w = small ? 34 : 36;
  const h = small ? 19 : 20;
  const knob = small ? 15 : 16;
  return (
    <Box
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      sx={{
        width: w,
        height: h,
        borderRadius: h / 2 + 'px',
        background: on ? C.ok : '#cfd4db',
        position: 'relative',
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
        display: 'inline-block',
        transition: 'background .15s',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: '2px',
          left: on ? `${w - knob - 2}px` : '2px',
          width: knob,
          height: knob,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 2px rgba(0,0,0,.25)',
          transition: 'left .15s',
        }}
      />
    </Box>
  );
}

/** Цветной бейдж статуса. */
export function StatusBadge({ label, color, bg, sx }: { label: string; color: string; bg: string; sx?: object }) {
  return (
    <Box
      component="span"
      sx={{
        fontSize: '11.5px',
        fontWeight: 700,
        color,
        background: bg,
        borderRadius: '6px',
        px: '10px',
        py: '4px',
        whiteSpace: 'nowrap',
        ...sx,
      }}
    >
      {label}
    </Box>
  );
}

/** Моноширинный текст. */
export function Mono({ children, sx }: { children: ReactNode; sx?: object }) {
  return (
    <Box component="span" sx={{ fontFamily: MONO, ...sx }}>
      {children}
    </Box>
  );
}

/** Заголовок секции таблицы (uppercase mono). */
export function TableHead({ columns, gridTemplateColumns, px = '20px' }: {
  columns: ReactNode[];
  gridTemplateColumns: string;
  px?: string;
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns,
        alignItems: 'center',
        gap: '10px',
        px,
        py: '12px',
        borderBottom: `1px solid ${C.line}`,
        fontFamily: MONO,
        fontSize: '10.5px',
        letterSpacing: '.08em',
        color: C.muted,
        textTransform: 'uppercase',
      }}
    >
      {columns.map((c, i) => (
        <span key={i}>{c}</span>
      ))}
    </Box>
  );
}
