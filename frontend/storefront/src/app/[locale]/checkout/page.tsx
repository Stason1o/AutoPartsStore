'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clientFetch, fmt } from '@/lib/api';
import { useStore } from '@/lib/store';
import { useI18n } from '@/i18n/I18nProvider';
import { T } from '@/tokens';

type Delivery = 'COURIER' | 'PICKUP';
type Payment = 'CASH_COURIER' | 'CARD_PICKUP' | 'CASH_PICKUP';

const inputStyle: React.CSSProperties = {
  width: '100%', height: 48, background: T.paper, border: `1.5px solid ${T.line}`,
  borderRadius: 10, padding: '0 14px', fontSize: 15, outline: 'none', color: T.ink,
};

interface PublicSettings { deliveryFeeMdl: string; pickupAddress: string; pickupHours: string }

export default function CheckoutPage() {
  const { cart, subtotal, clearCart } = useStore();
  const { dict, lp } = useI18n();
  const t = dict.checkout;
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [comment, setComment] = useState('');
  const [delivery, setDelivery] = useState<Delivery>('COURIER');
  const [payment, setPayment] = useState<Payment | ''>('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<PublicSettings>({
    deliveryFeeMdl: '50', pickupAddress: 'mun. Chișinău, str. Calea Orheiului 25', pickupHours: 'Lun–Sâm 09:00–19:00',
  });

  useEffect(() => {
    clientFetch<PublicSettings>('/api/public-settings').then(setSettings).catch(() => {});
  }, []);

  const deliveryFee = delivery === 'COURIER' ? Number(settings.deliveryFeeMdl) : 0;
  const grandTotal = subtotal + deliveryFee;

  const paymentOptions: { value: Payment; label: string; sub: string }[] = delivery === 'COURIER'
    ? [{ value: 'CASH_COURIER', label: t.cashCourier, sub: t.cashCourierHint }]
    : [
        { value: 'CARD_PICKUP', label: t.cardPickup, sub: t.cardPickupHint },
        { value: 'CASH_PICKUP', label: t.cashPickup, sub: t.cashPickupHint },
      ];

  const next = () => {
    setError('');
    if (step === 0 && (!name.trim() || !phone.trim())) {
      setError(t.errContacts);
      return;
    }
    if (step === 1) setPayment(delivery === 'COURIER' ? 'CASH_COURIER' : '');
    if (step === 2 && !payment) {
      setError(t.errPayment);
      return;
    }
    setStep(step + 1);
  };

  const placeOrder = async () => {
    setError('');
    setSubmitting(true);
    try {
      const result = await clientFetch<{ number: string; grandTotal: number }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerName: name.trim(), phone: phone.trim(), email: email.trim() || null,
          deliveryMethod: delivery, paymentMethod: payment, comment: comment.trim() || null,
          items: cart.map(i => ({ productId: i.productId, qty: i.qty })),
        }),
      });
      sessionStorage.setItem('sacramento.lastOrder', JSON.stringify({
        number: result.number, grandTotal: result.grandTotal, delivery,
        pickupAddress: settings.pickupAddress, pickupHours: settings.pickupHours,
      }));
      clearCart();
      router.push(lp(`/order/${result.number}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errGeneric);
      setSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="sc-in" style={{ padding: '56px 0', textAlign: 'center' }}>
        <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 12 }}>{t.cartEmpty}</div>
        <Link href={lp('/catalog')} style={{ color: T.accent, fontWeight: 600, textDecoration: 'none' }}>{dict.cart.goCatalog}</Link>
      </div>
    );
  }

  const radioCard = (selected: boolean): React.CSSProperties => ({
    textAlign: 'left', border: `1.5px solid ${selected ? T.accent : T.line}`,
    background: selected ? T.accentSoft : T.paper, borderRadius: 13, padding: 18,
    cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'flex-start', width: '100%',
  });
  const radioDot = (selected: boolean) => (
    <span style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${selected ? T.accent : '#c4c9d1'}`, background: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 1 }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: selected ? T.accent : 'transparent' }} />
    </span>
  );

  return (
    <div className="sc-in" style={{ padding: '24px 0 56px', maxWidth: 1060, margin: '0 auto' }}>
      <Link href={lp('/cart')} style={{ color: T.muted, fontSize: 13.5, textDecoration: 'none', fontFamily: T.mono, display: 'inline-block', marginBottom: 14 }}>{t.backToCart}</Link>
      <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.01em', margin: '0 0 26px' }}>{t.title}</h1>

      {/* СТЕППЕР */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
        {t.steps.map((label, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <span style={{ width: 32, height: 32, borderRadius: '50%', background: i <= step ? T.accent : T.paper3, color: i <= step ? '#fff' : T.muted, display: 'grid', placeItems: 'center', fontFamily: T.mono, fontWeight: 700, fontSize: 14 }}>{i + 1}</span>
              <span style={{ fontSize: 13.5, color: i <= step ? T.ink : T.muted, fontWeight: i === step ? 700 : 500, whiteSpace: 'nowrap' }}>{label}</span>
            </div>
            <span style={{ flex: 1, height: 2, background: i < step ? T.accent : T.line, margin: '0 14px', borderRadius: 2 }} />
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
        <div style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 16, padding: 28 }}>
          {step === 0 && (
            <div className="sc-in">
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>{t.contactsTitle}</h2>
              <p style={{ fontSize: 13.5, color: T.muted, margin: '0 0 22px' }}>{t.contactsHint}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <label>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 7 }}>{t.name} <span style={{ color: T.warn }}>*</span></span>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder={t.namePlaceholder} style={inputStyle} />
                </label>
                <label>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 7 }}>{t.phone} <span style={{ color: T.warn }}>*</span></span>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+373 6X XXX XXX" style={{ ...inputStyle, fontFamily: T.mono }} />
                </label>
                <label>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 7 }}>{t.email} <span style={{ color: T.muted2, fontWeight: 400 }}>{t.optional}</span></span>
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="mail@example.md" style={{ ...inputStyle, fontFamily: T.mono }} />
                </label>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="sc-in">
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px' }}>{t.deliveryTitle}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button onClick={() => setDelivery('COURIER')} style={radioCard(delivery === 'COURIER')}>
                  {radioDot(delivery === 'COURIER')}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 15.5 }}>{t.courier}</span>
                      <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 15 }}>{settings.deliveryFeeMdl} MDL</span>
                    </div>
                    <div style={{ fontSize: 13, color: T.muted, marginTop: 5 }}>{t.courierHint}</div>
                  </div>
                </button>
                <button onClick={() => setDelivery('PICKUP')} style={radioCard(delivery === 'PICKUP')}>
                  {radioDot(delivery === 'PICKUP')}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 15.5 }}>{t.pickup}</span>
                      <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 15, color: T.ok }}>{t.free}</span>
                    </div>
                    <div style={{ fontSize: 13, color: T.muted, marginTop: 5 }}>{settings.pickupAddress} · {settings.pickupHours}. {t.pickupToday}</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="sc-in">
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px' }}>{t.paymentTitle}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {paymentOptions.map(po => (
                  <button key={po.value} onClick={() => setPayment(po.value)} style={radioCard(payment === po.value)}>
                    {radioDot(payment === po.value)}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15.5 }}>{po.label}</div>
                      <div style={{ fontSize: 13, color: T.muted, marginTop: 5 }}>{po.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="sc-in">
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>{t.commentTitle}</h2>
              <p style={{ fontSize: 13.5, color: T.muted, margin: '0 0 18px' }}>{t.commentHint}</p>
              <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder={t.commentPlaceholder}
                style={{ width: '100%', minHeight: 120, background: T.paper, border: `1.5px solid ${T.line}`, borderRadius: 10, padding: 14, fontSize: 14.5, outline: 'none', color: T.ink, resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
          )}

          {error && (
            <div style={{ marginTop: 18, background: T.warnSoft, color: T.warn, border: `1px solid ${T.warn}33`, borderRadius: 10, padding: '12px 16px', fontSize: 13.5, fontWeight: 600 }}>{error}</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 26, paddingTop: 22, borderTop: `1px solid ${T.line}` }}>
            <button onClick={() => (step === 0 ? router.push(lp('/cart')) : setStep(step - 1))} style={{ background: T.paper2, border: `1px solid ${T.line}`, color: T.ink, borderRadius: 10, padding: '13px 22px', fontWeight: 600, fontSize: 14.5, cursor: 'pointer' }}>{t.backBtn}</button>
            {step === 3 ? (
              <button onClick={placeOrder} disabled={submitting} style={{ background: T.ok, color: '#fff', border: 0, borderRadius: 10, padding: '13px 30px', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: submitting ? .7 : 1 }}>
                {submitting ? t.placing : t.placeOrder}
              </button>
            ) : (
              <button onClick={next} style={{ background: T.accent, color: '#fff', border: 0, borderRadius: 10, padding: '13px 30px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>{t.nextBtn}</button>
            )}
          </div>
        </div>

        {/* СВОДКА */}
        <aside style={{ position: 'sticky', top: 96, background: T.paper, border: `1px solid ${T.line}`, borderRadius: 16, padding: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>{t.yourOrder} {cart.reduce((a, i) => a + i.qty, 0)} {t.pcs}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 16, maxHeight: 220, overflow: 'auto', paddingRight: 6 }}>
            {cart.map(i => (
              <div key={i.productId} style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 13, lineHeight: 1.4, color: '#3c424b' }}>
                  {i.name} <span style={{ fontFamily: T.mono, color: T.muted2 }}>×{i.qty}</span>
                </span>
                <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(i.price * i.qty)}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13.5, color: T.muted }}>
              <span>{t.items}</span><span style={{ fontFamily: T.mono, color: T.ink, whiteSpace: 'nowrap' }}>{fmt(subtotal)} MDL</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13.5, color: T.muted }}>
              <span>{t.delivery}</span>
              <span style={{ fontFamily: T.mono, color: T.ink, whiteSpace: 'nowrap' }}>{deliveryFee > 0 ? `${fmt(deliveryFee)} MDL` : t.free}</span>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${T.line}`, marginTop: 14, paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{t.toPay}</span>
            <span style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 22, whiteSpace: 'nowrap' }}>
              {fmt(grandTotal)} <span style={{ fontSize: 13, color: T.muted, fontWeight: 500 }}>MDL</span>
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
