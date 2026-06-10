import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import { api } from '../api/client';
import type { Settings } from '../api/types';
import { C } from '../theme';
import { Card, Field } from '../components/ui';
import { useToast } from '../components/Toast';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api.get<Settings>('/api/admin/settings') });

  const [deliveryFee, setDeliveryFee] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupHours, setPickupHours] = useState('');
  const [photoMax, setPhotoMax] = useState('');
  const [keepCount, setKeepCount] = useState('');

  const [contacts, setContacts] = useState<Record<string, string>>({});

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');

  useEffect(() => {
    const s = settings.data;
    if (!s) return;
    setDeliveryFee(s.delivery_fee_mdl ?? '');
    setPickupAddress(s.pickup_address ?? '');
    setPickupHours(s.pickup_hours ?? '');
    setPhotoMax(s.photo_max_size_mb ?? '');
    setKeepCount(s.snapshot_keep_count ?? '');
    setContacts({
      contact_phone: s.contact_phone ?? '',
      contact_email: s.contact_email ?? '',
      contact_viber: s.contact_viber ?? '',
      contact_whatsapp: s.contact_whatsapp ?? '',
      contact_telegram: s.contact_telegram ?? '',
      contact_instagram: s.contact_instagram ?? '',
    });
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () =>
      api.put<Settings>('/api/admin/settings', {
        delivery_fee_mdl: deliveryFee,
        pickup_address: pickupAddress,
        pickup_hours: pickupHours,
        photo_max_size_mb: photoMax,
        snapshot_keep_count: keepCount,
        ...contacts,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast('Настройки сохранены');
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const changePassword = useMutation({
    mutationFn: () => api.post('/api/admin/password', { currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setRepeatPassword('');
      toast('Пароль изменён');
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const submitPassword = () => {
    if (newPassword.length < 10) {
      toast('Новый пароль — минимум 10 символов', 'error');
      return;
    }
    if (newPassword !== repeatPassword) {
      toast('Пароли не совпадают', 'error');
      return;
    }
    changePassword.mutate();
  };

  const primaryBtn = {
    background: C.accent,
    color: '#fff',
    border: 0,
    borderRadius: '9px',
    p: '12px 26px',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    fontFamily: 'inherit',
    '&:hover': { background: C.accentH },
    '&:disabled': { opacity: 0.6 },
  };

  return (
    <Box sx={{ animation: 'aIn .25s ease both', maxWidth: 880, display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
        <Card sx={{ p: '22px' }}>
          <Box sx={{ fontWeight: 700, fontSize: 15, mb: '16px' }}>Доставка курьером</Box>
          <Field label="Стоимость по Кишинёву, MDL" value={deliveryFee} onChange={setDeliveryFee} mono bold />
        </Card>
        <Card sx={{ p: '22px' }}>
          <Box sx={{ fontWeight: 700, fontSize: 15, mb: '16px' }}>Параметры фото и снэпшотов</Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Макс. размер фото, МБ" value={photoMax} onChange={setPhotoMax} mono />
            <Field label="Хранить снэпшотов, шт" value={keepCount} onChange={setKeepCount} mono />
          </Box>
        </Card>
      </Box>

      <Card sx={{ p: '22px' }}>
        <Box sx={{ fontWeight: 700, fontSize: 15, mb: '16px' }}>Пункт самовывоза</Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
          <Field label="Адрес" value={pickupAddress} onChange={setPickupAddress} />
          <Field label="Часы работы" value={pickupHours} onChange={setPickupHours} />
        </Box>
      </Card>

      <Card sx={{ p: '22px' }}>
        <Box sx={{ fontWeight: 700, fontSize: 15, mb: '4px' }}>Контакты на витрине</Box>
        <Box sx={{ fontSize: 13, color: C.muted, mb: '16px' }}>
          Показываются в подвале сайта. Пустые поля посетители не увидят.
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Field label="Телефон" value={contacts.contact_phone ?? ''} onChange={(v) => setContacts((c) => ({ ...c, contact_phone: v }))} mono />
          <Field label="E-mail" value={contacts.contact_email ?? ''} onChange={(v) => setContacts((c) => ({ ...c, contact_email: v }))} mono />
          <Field label="Viber (номер)" value={contacts.contact_viber ?? ''} onChange={(v) => setContacts((c) => ({ ...c, contact_viber: v }))} mono />
          <Field label="WhatsApp (номер)" value={contacts.contact_whatsapp ?? ''} onChange={(v) => setContacts((c) => ({ ...c, contact_whatsapp: v }))} mono />
          <Field label="Telegram (@ник)" value={contacts.contact_telegram ?? ''} onChange={(v) => setContacts((c) => ({ ...c, contact_telegram: v }))} mono />
          <Field label="Instagram (@ник)" value={contacts.contact_instagram ?? ''} onChange={(v) => setContacts((c) => ({ ...c, contact_instagram: v }))} mono />
        </Box>
      </Card>

      <Box>
        <Box component="button" onClick={() => save.mutate()} disabled={save.isPending} sx={primaryBtn}>
          {save.isPending ? 'Сохранение…' : 'Сохранить настройки'}
        </Box>
      </Box>

      <Card sx={{ p: '22px' }}>
        <Box sx={{ fontWeight: 700, fontSize: 15, mb: '16px' }}>Смена пароля</Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', maxWidth: 760 }}>
          <Field label="Текущий пароль" type="password" value={currentPassword} onChange={setCurrentPassword} />
          <Field label="Новый пароль (мин. 10)" type="password" value={newPassword} onChange={setNewPassword} />
          <Field label="Повторите пароль" type="password" value={repeatPassword} onChange={setRepeatPassword} />
        </Box>
        <Box
          component="button"
          onClick={submitPassword}
          disabled={changePassword.isPending || !currentPassword || !newPassword}
          sx={{ ...primaryBtn, mt: '18px', p: '11px 22px', fontSize: '13.5px' }}
        >
          {changePassword.isPending ? 'Сохранение…' : 'Изменить пароль'}
        </Box>
      </Card>
    </Box>
  );
}
