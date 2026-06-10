import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import Pagination from '@mui/material/Pagination';
import { api, qs } from '../api/client';
import type { ChatMessage, ChatStatus, ChatSummary, Page } from '../api/types';
import { C, MONO } from '../theme';
import { Card, Mono, StatusBadge } from '../components/ui';
import { useToast } from '../components/Toast';

type Filter = 'all' | 'OPEN' | 'CLOSED';

/** Сегодня → HH:mm, иначе дата dd.mm.yyyy. */
function fmtChatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  if (sameDay) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtMsgTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return time;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) + ' ' + time;
}

export default function ChatsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [chatPage, setChatPage] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // Снимок выбранного диалога — чтобы шапка работала, даже если диалог выпал из отфильтрованного списка.
  const [snapshot, setSnapshot] = useState<ChatSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const lastIdRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const chats = useQuery({
    queryKey: ['chats', filter, chatPage],
    queryFn: () =>
      api.get<Page<ChatSummary>>(
        `/api/admin/chats${qs({ status: filter === 'all' ? null : filter, page: chatPage, size: 30 })}`,
      ),
    refetchInterval: 5_000,
  });

  const list = chats.data?.content ?? [];
  const selected = list.find((c) => c.id === selectedId) ?? (snapshot?.id === selectedId ? snapshot : null);

  // Поллинг сообщений выбранного диалога каждые 3 секунды (afterId — накапливаем).
  useEffect(() => {
    if (selectedId == null) return;
    let cancelled = false;
    let timer = 0;
    setMessages([]);
    lastIdRef.current = 0;

    const tick = async (initial: boolean) => {
      let gotVisitor = false;
      try {
        const batch = await api.get<ChatMessage[]>(`/api/admin/chats/${selectedId}/messages?afterId=${lastIdRef.current}`);
        if (cancelled) return;
        if (batch.length > 0) {
          lastIdRef.current = Math.max(lastIdRef.current, batch[batch.length - 1].id);
          gotVisitor = batch.some((m) => m.sender === 'VISITOR');
          setMessages((prev) => {
            const known = new Set(prev.map((m) => m.id));
            const fresh = batch.filter((m) => !known.has(m.id));
            return fresh.length ? [...prev, ...fresh] : prev;
          });
        }
        // GET помечает сообщения посетителя прочитанными — обновляем бейджи.
        if (initial || gotVisitor) {
          void qc.invalidateQueries({ queryKey: ['chats'] });
          void qc.invalidateQueries({ queryKey: ['dashboard'] });
        }
      } catch {
        /* временная ошибка сети — повторим на следующем тике */
      }
      if (!cancelled) timer = window.setTimeout(() => void tick(false), 3_000);
    };

    void tick(true);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [selectedId, qc]);

  // Автопрокрутка вниз при новых сообщениях.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, selectedId]);

  const send = useMutation({
    mutationFn: (body: string) => api.post<ChatMessage>(`/api/admin/chats/${selectedId}/messages`, { body }),
    onSuccess: (msg) => {
      lastIdRef.current = Math.max(lastIdRef.current, msg.id);
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setDraft('');
      void qc.invalidateQueries({ queryKey: ['chats'] });
    },
    onError: (e: Error) => toast(e.message || 'Не удалось отправить сообщение', 'error'),
  });

  const setStatus = useMutation({
    mutationFn: (status: ChatStatus) => api.post(`/api/admin/chats/${selectedId}/status`, { status }),
    onSuccess: (_d, status) => {
      setSnapshot((s) => (s && s.id === selectedId ? { ...s, status } : s));
      void qc.invalidateQueries({ queryKey: ['chats'] });
      toast(status === 'CLOSED' ? 'Диалог закрыт' : 'Диалог снова открыт');
    },
    onError: (e: Error) => toast(e.message || 'Не удалось изменить статус', 'error'),
  });

  const doSend = () => {
    const body = draft.trim();
    if (!body || selectedId == null || send.isPending) return;
    if (body.length > 2000) {
      toast('Сообщение слишком длинное (максимум 2000 символов)', 'error');
      return;
    }
    send.mutate(body);
  };

  const chips: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Все' },
    { key: 'OPEN', label: 'Открытые' },
    { key: 'CLOSED', label: 'Закрытые' },
  ];

  return (
    <Box sx={{ animation: 'aIn .25s ease both' }}>
      <Card sx={{ display: 'grid', gridTemplateColumns: '330px 1fr', height: 'calc(100vh - 150px)', minHeight: 480 }}>
        {/* ===== Левая колонка: список диалогов ===== */}
        <Box sx={{ borderRight: `1px solid ${C.line}`, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Box sx={{ p: '12px 14px', borderBottom: `1px solid ${C.line}`, display: 'flex', gap: '6px' }}>
            {chips.map((c) => {
              const active = filter === c.key;
              return (
                <Box
                  key={c.key}
                  component="button"
                  onClick={() => {
                    setFilter(c.key);
                    setChatPage(0);
                  }}
                  sx={{
                    background: active ? C.g800 : C.paper,
                    color: active ? '#fff' : C.ink2,
                    border: `1px solid ${active ? C.g800 : C.line}`,
                    borderRadius: '8px',
                    p: '6px 11px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {c.label}
                </Box>
              );
            })}
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {chats.isLoading && <Box sx={{ p: '20px', fontSize: 13, color: C.muted }}>Загрузка…</Box>}
            {!chats.isLoading && list.length === 0 && (
              <Box sx={{ p: '32px 20px', textAlign: 'center', fontSize: '13.5px', color: C.muted }}>Диалогов нет.</Box>
            )}
            {list.map((c) => {
              const active = c.id === selectedId;
              return (
                <Box
                  key={c.id}
                  onClick={() => {
                    setSelectedId(c.id);
                    setSnapshot(c);
                  }}
                  sx={{
                    p: '11px 14px',
                    borderBottom: `1px solid ${C.line2}`,
                    cursor: 'pointer',
                    background: active ? C.accentSoft : 'transparent',
                    '&:hover': { background: active ? C.accentSoft : C.paper2 },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Box
                      sx={{
                        fontSize: '13.5px',
                        fontWeight: c.unread > 0 ? 800 : 600,
                        flex: 1,
                        minWidth: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {c.visitorName || 'Гость'}
                    </Box>
                    {c.status === 'CLOSED' && (
                      <StatusBadge label="Закрыт" color={C.muted} bg={C.paper3} sx={{ fontSize: '10.5px', px: '7px', py: '2px' }} />
                    )}
                    <Mono sx={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>{fmtChatTime(c.lastMessageAt)}</Mono>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mt: '3px' }}>
                    <Box
                      sx={{
                        fontSize: '12.5px',
                        color: c.unread > 0 ? C.ink2 : C.muted,
                        fontWeight: c.unread > 0 ? 600 : 400,
                        flex: 1,
                        minWidth: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {c.lastMessage}
                    </Box>
                    {c.unread > 0 && (
                      <Box
                        component="span"
                        sx={{
                          fontFamily: MONO,
                          fontSize: '10.5px',
                          fontWeight: 700,
                          background: C.accent,
                          color: '#fff',
                          borderRadius: '20px',
                          minWidth: 19,
                          height: 19,
                          display: 'grid',
                          placeItems: 'center',
                          px: '5px',
                          flexShrink: 0,
                        }}
                      >
                        {c.unread}
                      </Box>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
          {chats.data && chats.data.totalPages > 1 && (
            <Box sx={{ p: '8px 10px', borderTop: `1px solid ${C.line}`, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
              <Pagination
                count={chats.data.totalPages}
                page={chatPage + 1}
                onChange={(_, v) => setChatPage(v - 1)}
                shape="rounded"
                size="small"
              />
            </Box>
          )}
        </Box>

        {/* ===== Правая колонка: выбранный диалог ===== */}
        {selected == null ? (
          <Box sx={{ display: 'grid', placeItems: 'center', color: C.muted }}>
            <Box sx={{ textAlign: 'center' }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={C.muted2} strokeWidth="1.6" style={{ marginBottom: 10 }}>
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
              </svg>
              <Box sx={{ fontSize: 14 }}>Выберите диалог слева</Box>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Шапка диалога */}
            <Box sx={{ p: '12px 18px', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selected.visitorName || 'Гость'}
                </Box>
              </Box>
              {selected.status === 'CLOSED' && <StatusBadge label="Закрыт" color={C.muted} bg={C.paper3} />}
              <Box
                component="button"
                disabled={setStatus.isPending}
                onClick={() => setStatus.mutate(selected.status === 'OPEN' ? 'CLOSED' : 'OPEN')}
                sx={{
                  background: C.paper,
                  border: `1px solid ${C.line}`,
                  borderRadius: '8px',
                  p: '8px 13px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: selected.status === 'OPEN' ? C.warn : C.ink2,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  '&:hover': { background: C.paper2 },
                  '&:disabled': { opacity: 0.5, cursor: 'default' },
                }}
              >
                {selected.status === 'OPEN' ? 'Закрыть диалог' : 'Открыть заново'}
              </Box>
            </Box>

            {/* Лента сообщений */}
            <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', minHeight: 0, p: '16px 18px', background: C.paper2, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {messages.length === 0 && (
                <Box sx={{ m: 'auto', fontSize: 13, color: C.muted }}>Сообщений пока нет.</Box>
              )}
              {messages.map((m) => {
                const admin = m.sender === 'ADMIN';
                return (
                  <Box key={m.id} sx={{ alignSelf: admin ? 'flex-end' : 'flex-start', maxWidth: '72%' }}>
                    <Box
                      sx={{
                        background: admin ? C.accent : C.paper3,
                        color: admin ? '#fff' : C.ink,
                        borderRadius: admin ? '13px 13px 4px 13px' : '13px 13px 13px 4px',
                        p: '9px 13px',
                        fontSize: '13.5px',
                        lineHeight: 1.45,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {m.body}
                    </Box>
                    <Mono sx={{ display: 'block', fontSize: 10.5, color: C.muted2, mt: '3px', textAlign: admin ? 'right' : 'left' }}>
                      {fmtMsgTime(m.createdAt)}
                    </Mono>
                  </Box>
                );
              })}
            </Box>

            {/* Ввод сообщения */}
            <Box sx={{ p: '12px 14px', borderTop: `1px solid ${C.line}`, display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
              <InputBase
                multiline
                maxRows={5}
                placeholder="Введите сообщение… (Enter — отправить, Shift+Enter — новая строка)"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    doSend();
                  }
                }}
                sx={{
                  flex: 1,
                  border: `1.5px solid ${C.line}`,
                  borderRadius: '9px',
                  px: '13px',
                  py: '9px',
                  fontSize: 14,
                  color: C.ink,
                  background: '#fff',
                  '&.Mui-focused': { borderColor: C.accent },
                }}
              />
              <Box
                component="button"
                disabled={!draft.trim() || send.isPending}
                onClick={doSend}
                title="Отправить"
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: '9px',
                  background: C.accent,
                  border: 0,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                  flexShrink: 0,
                  '&:hover': { background: C.accentH },
                  '&:disabled': { opacity: 0.45, cursor: 'default' },
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
                </svg>
              </Box>
            </Box>
          </Box>
        )}
      </Card>
    </Box>
  );
}
