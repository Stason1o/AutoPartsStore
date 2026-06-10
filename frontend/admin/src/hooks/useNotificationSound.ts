import { useEffect, useRef } from 'react';

/**
 * Короткий приятный «динь» через Web Audio API (без аудиофайлов):
 * две быстрые синусоидальные ноты 880 Гц → 1320 Гц с огибающей громкости.
 */
function playDing(ctx: AudioContext) {
  const t0 = ctx.currentTime;
  const notes: [number, number][] = [
    [880, 0],
    [1320, 0.12],
  ];
  for (const [freq, offset] of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0 + offset);
    gain.gain.exponentialRampToValueAtTime(0.18, t0 + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0 + offset);
    osc.stop(t0 + offset + 0.2);
  }
}

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  const w = window as Window & { webkitAudioContext?: AudioContextCtor };
  return window.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * Играет уведомительный звук, когда любое из переданных значений УВЕЛИЧИЛОСЬ
 * по сравнению с предыдущим опросом. На самой первой загрузке (нет предыдущего
 * значения) звука нет. AudioContext создаётся лениво при первом взаимодействии
 * пользователя со страницей (браузеры блокируют автозапуск звука).
 *
 * @param counts текущие счётчики (null/undefined — данные ещё не загружены)
 */
export function useNotificationSound(counts: number[] | null | undefined) {
  const ctxRef = useRef<AudioContext | null>(null);
  const prevRef = useRef<number[] | null>(null);

  // Лениво создаём/возобновляем AudioContext при первом клике в документе.
  useEffect(() => {
    const unlock = () => {
      if (!ctxRef.current) {
        const Ctor = getAudioContextCtor();
        if (!Ctor) return;
        try {
          ctxRef.current = new Ctor();
        } catch {
          return;
        }
      }
      if (ctxRef.current.state === 'suspended') {
        void ctxRef.current.resume();
      }
    };
    document.addEventListener('pointerdown', unlock, { once: true });
    return () => document.removeEventListener('pointerdown', unlock);
  }, []);

  useEffect(() => {
    if (!counts) return;
    const prev = prevRef.current;
    prevRef.current = counts;
    if (!prev) return; // первая загрузка — не звеним
    const increased = counts.some((v, i) => v > (prev[i] ?? 0));
    if (!increased) return;
    const ctx = ctxRef.current;
    if (ctx && ctx.state === 'running') {
      try {
        playDing(ctx);
      } catch {
        /* ignore */
      }
    }
  }, [counts]);
}
