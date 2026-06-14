import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, Typography, Stack, Chip, Button, IconButton,
  Divider, alpha, CircularProgress, Alert,
} from '@mui/material';
import NotificationsIcon       from '@mui/icons-material/Notifications';
import DoneAllIcon             from '@mui/icons-material/DoneAll';
import DeleteOutlineIcon       from '@mui/icons-material/DeleteOutline';
import SecurityIcon            from '@mui/icons-material/Security';
import AutoFixHighIcon         from '@mui/icons-material/AutoFixHigh';
import WarningAmberIcon        from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon        from '@mui/icons-material/InfoOutlined';
import RefreshIcon             from '@mui/icons-material/Refresh';
import { supabase }            from '../services/supabase';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../services/supabaseQueries';
import { useAuth }             from '../context/AuthContext';

const typeIcon = {
  attack:  <SecurityIcon    sx={{ fontSize: 20, color: '#f44336' }} />,
  healing: <AutoFixHighIcon sx={{ fontSize: 20, color: '#00e676' }} />,
  warning: <WarningAmberIcon sx={{ fontSize: 20, color: '#ff9800' }} />,
  info:    <InfoOutlinedIcon sx={{ fontSize: 20, color: '#00bcd4' }} />,
};
const typeColor = { attack: '#f44336', healing: '#00e676', warning: '#ff9800', info: '#00bcd4' };

const FILTERS = ['All', 'Unread', 'attack', 'healing', 'warning', 'info'];

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [filter,   setFilter]   = useState('All');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchNotifications(user.id);
      setNotifications(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  // Realtime: new notifications for this user
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase.channel('notifications_live')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, payload => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user?.id]);

  const markRead = async (id) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAll = async () => {
    if (!user?.id) return;
    await markAllNotificationsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const dismiss = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const filtered = notifications.filter(n => {
    if (filter === 'All')    return true;
    if (filter === 'Unread') return !n.read;
    return n.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 820, mx: 'auto' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <NotificationsIcon sx={{ color: '#ff9800', fontSize: 28 }} />
            <Typography variant="h5" fontWeight={900} color="white">Notifications</Typography>
            {unreadCount > 0 && (
              <Chip label={`${unreadCount} unread`} size="small"
                sx={{ background: 'rgba(244,67,54,0.15)', color: '#f44336', fontWeight: 700, border: '1px solid rgba(244,67,54,0.25)', fontSize: '0.7rem' }} />
            )}
          </Stack>
          <Typography variant="body2" color="rgba(255,255,255,0.4)">Real-time alerts — auto-updates on new events</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} size="small"
            sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: '#ff9800', color: '#ff9800' } }}>
            Refresh
          </Button>
          <Button variant="outlined" startIcon={<DoneAllIcon />} onClick={markAll} disabled={unreadCount === 0} size="small"
            sx={{ borderColor: 'rgba(0,230,118,0.3)', color: '#00e676', fontWeight: 700, '&:hover': { borderColor: '#00e676', background: 'rgba(0,230,118,0.07)' }, '&.Mui-disabled': { color: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.1)' } }}>
            Mark All Read
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2, background: 'rgba(244,67,54,0.1)', color: '#ef9a9a', border: '1px solid rgba(244,67,54,0.25)' }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Filter chips */}
      <Stack direction="row" spacing={1} mb={2.5} flexWrap="wrap">
        {FILTERS.map(f => (
          <Chip key={f} label={f} size="small" clickable onClick={() => setFilter(f)}
            sx={{
              background: filter === f ? alpha(typeColor[f] || '#ff9800', 0.2) : 'rgba(255,255,255,0.05)',
              color: filter === f ? (typeColor[f] || '#ff9800') : 'rgba(255,255,255,0.5)',
              border: `1px solid ${filter === f ? alpha(typeColor[f] || '#ff9800', 0.4) : 'rgba(255,255,255,0.1)'}`,
              fontWeight: filter === f ? 700 : 400,
              textTransform: 'capitalize',
              fontSize: '0.7rem',
            }} />
        ))}
      </Stack>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress sx={{ color: '#ff9800' }} /></Box>
      ) : filtered.length === 0 ? (
        <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, p: 4, textAlign: 'center' }}>
          <NotificationsIcon sx={{ color: 'rgba(255,255,255,0.15)', fontSize: 48, mb: 1 }} />
          <Typography color="rgba(255,255,255,0.3)">
            {filter === 'All' ? 'No notifications yet. They will appear automatically when attacks or healing events occur.' : `No ${filter} notifications.`}
          </Typography>
        </Card>
      ) : (
        <Stack spacing={1.5}>
          {filtered.map((n, i) => (
            <Card
              key={n.id}
              sx={{
                background: n.read ? 'rgba(255,255,255,0.02)' : alpha(typeColor[n.type] || '#ff9800', 0.05),
                border: `1px solid ${n.read ? 'rgba(255,255,255,0.06)' : alpha(typeColor[n.type] || '#ff9800', 0.2)}`,
                borderRadius: 2.5,
                p: 2,
                transition: 'all 0.2s',
                cursor: 'default',
                '&:hover': { background: alpha(typeColor[n.type] || '#ff9800', 0.08) },
              }}>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box sx={{ mt: 0.3 }}>{typeIcon[n.type] || typeIcon.info}</Box>
                <Box flex={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="body2" fontWeight={n.read ? 500 : 800} color={n.read ? 'rgba(255,255,255,0.6)' : 'white'} sx={{ lineHeight: 1.4 }}>
                        {n.title || n.message}
                      </Typography>
                      {n.title && n.message && (
                        <Typography variant="caption" color="rgba(255,255,255,0.4)" display="block" mt={0.3}>{n.message}</Typography>
                      )}
                    </Box>
                    <Stack direction="row" spacing={0.5} alignItems="center" ml={1}>
                      {!n.read && (
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: typeColor[n.type] || '#ff9800', flexShrink: 0 }} />
                      )}
                      <IconButton size="small" onClick={() => markRead(n.id)} disabled={n.read}
                        sx={{ color: 'rgba(255,255,255,0.3)', '&:hover': { color: '#00e676' }, '&.Mui-disabled': { color: 'rgba(255,255,255,0.1)' } }}>
                        <DoneAllIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                      <IconButton size="small" onClick={() => dismiss(n.id)}
                        sx={{ color: 'rgba(255,255,255,0.3)', '&:hover': { color: '#f44336' } }}>
                        <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Stack>
                  </Stack>
                  <Stack direction="row" spacing={1.5} alignItems="center" mt={0.8}>
                    <Chip label={n.type || 'info'} size="small"
                      sx={{ background: alpha(typeColor[n.type] || '#00bcd4', 0.12), color: typeColor[n.type] || '#00bcd4', fontSize: '0.6rem', height: 18, fontWeight: 700, textTransform: 'capitalize' }} />
                    <Typography variant="caption" color="rgba(255,255,255,0.25)">
                      {n.created_at ? new Date(n.created_at).toLocaleString() : '—'}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
              {i < filtered.length - 1 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.04)', mt: 1 }} />}
            </Card>
          ))}
        </Stack>
      )}

      {!loading && notifications.length > 0 && (
        <Typography variant="caption" color="rgba(255,255,255,0.2)" display="block" textAlign="center" mt={3}>
          Showing {filtered.length} of {notifications.length} notifications
        </Typography>
      )}
    </Box>
  );
}
