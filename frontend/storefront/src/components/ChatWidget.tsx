'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { clientFetch } from '@/lib/api';
import { T } from '@/tokens';

interface ChatMessage {
  id: number;
  sender: 'VISITOR' | 'ADMIN';
  body: string;
  createdAt: string;
}

interface ChatReply {
  token: string;
  status: 'OPEN' | 'CLOSED';
  unread: number;
  messages: ChatMessage[];
}

const TOKEN_KEY = 'sacramento.chat.token';

/** Короткий «дзынь» через Web Audio — без аудиофайлов. */
function ding() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  } catch { /* звук необязателен */ }
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const tokenRef = useRef<string | null>(null);
  const lastIdRef = useRef(0);
  const openRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  openRef.current = open;

  useEffect(() => {
    tokenRef.current = localStorage.getItem(TOKEN_KEY);
  }, []);

  const applyReply = useCallback((reply: ChatReply, notify: boolean) => {
    tokenRef.current = reply.token;
    localStorage.setItem(TOKEN_KEY, reply.token);
    if (reply.messages.length > 0) {
      const fresh = reply.messages.filter(m => m.id > lastIdRef.current);
      if (fresh.length > 0) {
        lastIdRef.current = reply.messages[reply.messages.length - 1].id;
        setMessages(prev => [...prev, ...fresh]);
        if (notify && fresh.some(m => m.sender === 'ADMIN')) {
          ding();
        }
      }
    }
    setUnread(reply.unread);
  }, []);

  // опрос: открытый виджет — каждые 4 с (и читаем), свёрнутый — каждые 15 с (peek)
  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      const token = tokenRef.current;
      if (!token || stopped) return;
      try {
        const reply = await clientFetch<ChatReply>(
          `/api/chat/${token}/messages?afterId=${lastIdRef.current}&peek=${!openRef.current}`);
        if (!stopped) applyReply(reply, true);
      } catch { /* сеть моргнула — попробуем в следующий раз */ }
    };
    poll();
    const fast = setInterval(() => { if (openRef.current) poll(); }, 4000);
    const slow = setInterval(() => { if (!openRef.current) poll(); }, 15000);
    return () => { stopped = true; clearInterval(fast); clearInterval(slow); };
  }, [applyReply]);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [open, messages]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    try {
      const reply = await clientFetch<ChatReply>('/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify({ token: tokenRef.current, name: name.trim() || null, body }),
      });
      setText('');
      applyReply(reply, false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отправить');
    } finally {
      setSending(false);
    }
  };

  const firstMessage = messages.length === 0;

  return (
    <>
      {/* плавающая кнопка */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Чат с менеджером"
        style={{ position: 'fixed', right: 22, bottom: 22, zIndex: 95, width: 58, height: 58, borderRadius: 18, background: open ? T.g800 : T.accent, color: '#fff', border: 0, cursor: 'pointer', boxShadow: '0 10px 28px rgba(43,108,255,.4)', display: 'grid', placeItems: 'center', transition: 'background .15s' }}
      >
        {open ? (
          <span style={{ fontSize: 24, lineHeight: 1 }}>×</span>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 12a8 8 0 0 1-8 8H4l1.6-3.2A8 8 0 1 1 21 12Z" /></svg>
        )}
        {!open && unread > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 22, height: 22, borderRadius: 12, background: T.warn, color: '#fff', fontFamily: T.mono, fontWeight: 700, fontSize: 12, display: 'grid', placeItems: 'center', padding: '0 6px', border: '2px solid #fff' }}>{unread}</span>
        )}
      </button>

      {/* панель чата */}
      {open && (
        <div style={{ position: 'fixed', right: 22, bottom: 92, zIndex: 95, width: 360, maxWidth: 'calc(100vw - 44px)', height: 480, maxHeight: 'calc(100vh - 130px)', background: T.paper, border: `1px solid ${T.line}`, borderRadius: 16, boxShadow: '0 24px 60px rgba(13,15,18,.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'scIn .2s ease both' }}>
          <div style={{ background: T.g800, color: '#fff', padding: '14px 18px' }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Чат с менеджером</div>
            <div style={{ fontSize: 12, color: '#aab1bd', marginTop: 2, display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.ok, animation: 'pulseDot 2.4s infinite' }} />
              Отвечаем Пн–Сб 09:00–19:00
            </div>
          </div>

          <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, background: T.paper2 }}>
            {firstMessage && (
              <div style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 12, padding: '12px 14px', fontSize: 13.5, color: T.muted, lineHeight: 1.5 }}>
                Здравствуйте! Напишите вопрос — подскажем по наличию, подбору и ценам.
              </div>
            )}
            {messages.map(m => (
              <div key={m.id} style={{ alignSelf: m.sender === 'VISITOR' ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
                <div style={{ background: m.sender === 'VISITOR' ? T.accent : T.paper, color: m.sender === 'VISITOR' ? '#fff' : T.ink, border: m.sender === 'VISITOR' ? 0 : `1px solid ${T.line}`, borderRadius: 12, padding: '9px 13px', fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {m.body}
                </div>
                <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.muted2, marginTop: 3, textAlign: m.sender === 'VISITOR' ? 'right' : 'left' }}>
                  {new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>

          {error && <div style={{ padding: '8px 16px', background: T.warnSoft, color: T.warn, fontSize: 12.5, fontWeight: 600 }}>{error}</div>}

          <div style={{ borderTop: `1px solid ${T.line}`, padding: 12, background: T.paper }}>
            {firstMessage && (
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ваше имя (необязательно)"
                style={{ width: '100%', height: 38, border: `1px solid ${T.line}`, borderRadius: 9, padding: '0 12px', fontSize: 13.5, outline: 'none', marginBottom: 8, color: T.ink }}
              />
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Напишите сообщение…"
                rows={1}
                style={{ flex: 1, border: `1px solid ${T.line}`, borderRadius: 9, padding: '10px 12px', fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', color: T.ink, maxHeight: 90 }}
              />
              <button onClick={send} disabled={sending || !text.trim()} aria-label="Отправить" style={{ width: 42, height: 42, borderRadius: 10, background: text.trim() ? T.accent : T.paper3, color: text.trim() ? '#fff' : T.muted2, border: 0, cursor: text.trim() ? 'pointer' : 'default', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
