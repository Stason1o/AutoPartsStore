'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientFetch, type VehicleCandidate } from '@/lib/api';
import { useStore } from '@/lib/store';
import { T } from '@/theme';

const selectStyle: React.CSSProperties = {
  height: 52, background: T.g700, border: `1px solid ${T.lineD}`, borderRadius: 10,
  color: '#fff', padding: '0 14px', fontSize: 15, cursor: 'pointer', outline: 'none',
};

/** Подбор «марка → модель → год» в hero-блоке главной. */
export default function VehiclePicker() {
  const { car, setCar, showToast } = useStore();
  const router = useRouter();

  const [makes, setMakes] = useState<string[]>([]);
  const [vehicles, setVehicles] = useState<VehicleCandidate[]>([]);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');

  useEffect(() => {
    clientFetch<string[]>('/api/vehicles/makes').then(setMakes).catch(() => setMakes([]));
  }, []);

  useEffect(() => {
    if (!make) { setVehicles([]); return; }
    clientFetch<VehicleCandidate[]>(`/api/vehicles?make=${encodeURIComponent(make)}`)
      .then(setVehicles).catch(() => setVehicles([]));
  }, [make]);

  const models = useMemo(
    () => [...new Set(vehicles.map(v => v.model))],
    [vehicles]);

  const years = useMemo(() => {
    const matching = vehicles.filter(v => v.model === model);
    if (!matching.length) return [];
    const now = new Date().getFullYear();
    const from = Math.min(...matching.map(v => v.yearFrom ?? 1990));
    const to = Math.max(...matching.map(v => v.yearTo ?? now));
    const list: number[] = [];
    for (let y = Math.min(to, now + 1); y >= from; y--) list.push(y);
    return list;
  }, [vehicles, model]);

  const apply = () => {
    if (!make || !model || !year) return;
    const y = Number(year);
    const vehicle = vehicles.find(v => v.model === model
      && (v.yearFrom == null || v.yearFrom <= y)
      && (v.yearTo == null || v.yearTo >= y))
      ?? vehicles.find(v => v.model === model);
    if (!vehicle) return;
    setCar({ vehicleId: vehicle.id, label: `${make} ${model}`, sub: String(y) });
    showToast(`Автомобиль сохранён: ${make} ${model}`);
  };

  if (car) {
    return (
      <div className="sc-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(31,157,91,.12)', border: '1px solid rgba(31,157,91,.4)', borderRadius: 13, padding: '20px 22px', maxWidth: 600 }}>
          <span style={{ width: 46, height: 46, borderRadius: 11, background: T.ok, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="m5 13 4 4L19 7" /></svg>
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#fff' }}>{car.label} · {car.sub}</div>
            <div style={{ fontSize: 13.5, color: '#aeb6c2' }}>Каталог отфильтрован под ваш автомобиль</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
          <button onClick={() => router.push(`/catalog?vehicleId=${car.vehicleId}`)} style={{ background: T.accent, color: '#fff', border: 0, borderRadius: 10, padding: '14px 26px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            Перейти в каталог →
          </button>
          <button onClick={() => setCar(null)} style={{ background: 'transparent', border: `1px solid ${T.lineD}`, color: '#cfd4dc', borderRadius: 10, padding: '14px 22px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
            Сменить авто
          </button>
        </div>
      </div>
    );
  }

  const canApply = make && model && year;
  return (
    <div style={{ background: 'rgba(255,255,255,.04)', border: `1px solid ${T.lineD}`, borderRadius: 14, padding: 22, maxWidth: 620 }}>
      <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '.16em', color: T.muted2, textTransform: 'uppercase', marginBottom: 14 }}>
        Марка → модель → год выпуска
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 10 }}>
        <select value={make} onChange={e => { setMake(e.target.value); setModel(''); setYear(''); }} style={selectStyle}>
          <option value="">Марка</option>
          {makes.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={model} onChange={e => { setModel(e.target.value); setYear(''); }} disabled={!make} style={{ ...selectStyle, opacity: make ? 1 : 0.45 }}>
          <option value="">Модель</option>
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(e.target.value)} disabled={!model} style={{ ...selectStyle, padding: '0 12px', opacity: model ? 1 : 0.45 }}>
          <option value="">Год</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <button onClick={apply} disabled={!canApply} style={{ marginTop: 14, width: '100%', background: canApply ? T.accent : T.g700, color: '#fff', border: 0, borderRadius: 10, height: 54, fontWeight: 700, fontSize: 16, cursor: canApply ? 'pointer' : 'default' }}>
        Подобрать запчасти →
      </button>
      <div style={{ marginTop: 14, fontSize: 13, color: '#8b929d' }}>
        Не нашли модель? Позвоните <a href="tel:+37322001122" style={{ color: '#9cc0ff', textDecoration: 'none', fontFamily: T.mono }}>+373 22 00 11 22</a> — подберём по телефону.
      </div>
    </div>
  );
}
