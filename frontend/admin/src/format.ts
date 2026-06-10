import type { OrderStatus } from './api/types';
import { C } from './theme';

export function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return Math.round(Number(n)).toLocaleString('ru-RU');
}

export function fmtMoney2(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export const STATUS_META: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  NEW: { label: 'Новый', color: C.accent, bg: C.accentSoft },
  CONFIRMED: { label: 'Подтверждён', color: C.violet, bg: C.violetSoft },
  ASSEMBLING: { label: 'Сборка', color: C.amber, bg: C.amberSoft },
  DELIVERING: { label: 'Доставка', color: C.cyan, bg: C.cyanSoft },
  READY_FOR_PICKUP: { label: 'Готов к выдаче', color: C.ok, bg: C.okSoft },
  DONE: { label: 'Завершён', color: C.muted, bg: C.paper3 },
  CANCELLED: { label: 'Отменён', color: C.warn, bg: C.warnSoft },
};

export const STATUS_FLOW: OrderStatus[] = [
  'NEW', 'CONFIRMED', 'ASSEMBLING', 'DELIVERING', 'READY_FOR_PICKUP', 'DONE',
];

/** Допустимые переходы — зеркало статусной машины бэкенда. */
export function allowedTransitions(status: OrderStatus): OrderStatus[] {
  switch (status) {
    case 'NEW': return ['CONFIRMED', 'CANCELLED'];
    case 'CONFIRMED': return ['ASSEMBLING', 'CANCELLED'];
    case 'ASSEMBLING': return ['DELIVERING', 'READY_FOR_PICKUP', 'CANCELLED'];
    case 'DELIVERING':
    case 'READY_FOR_PICKUP': return ['DONE', 'CANCELLED'];
    default: return [];
  }
}

export const DELIVERY_LABEL: Record<string, string> = {
  COURIER: 'Курьер по Кишинёву',
  PICKUP: 'Самовывоз со склада',
};

export const DELIVERY_SHORT: Record<string, string> = {
  COURIER: 'Курьер',
  PICKUP: 'Самовывоз',
};

export const PAYMENT_LABEL: Record<string, string> = {
  CASH_COURIER: 'Наличными курьеру',
  CARD_PICKUP: 'Картой на месте',
  CASH_PICKUP: 'Наличными в пункте',
};
