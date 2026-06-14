import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Card, Typography, Stack, Chip, Grid,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  alpha, CircularProgress, Button,
} from '@mui/material';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import RefreshIcon           from '@mui/icons-material/Refresh';
import { supabase }          from '../services/supabase';
import { fetchAttackLogs }   from '../services/supabaseQueries';

const TooltipStyle = { background: 'rgba(13,27,42,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 12 };

const statusColor = { Blocked: '#f44336', Healed: '#00e676', Allowed: '#00bcd4', Flagged: '#ff9800' };
const methodColor = { GET: '#00bcd4', POST: '#7c4dff', PUT: '#ff9800', DELETE: '#f44336', PATCH: '#00e676' };

function buildSparkline(logs) {
  const now = Date.now();
  const buckets = {};
  for (let i = 19; i >= 0; i--) {
    buckets[`${i}m`] = { time: `${i}m`, requests: 0, blocked: 0 };
  }
  logs.forEach(l => {
    const age = Math.floor((now - new Date(l.timestamp).getTime()) / 60000);
    if (age >= 0 && age < 20) {
      const key = `${age}m`;
      if (buckets[key]) {
        buckets[key].requests++;
        if (l.status === 'Blocked') buckets[key].blocked++;
      }
    }
  });
  return Object.values(buckets).reverse();
}

export default function TrafficMonitorPage() {
  const [logs,   setLogs]   = useState([]);
  const [spark,  setSpark]  = useState([]);
  const [stats,  setStats]  = useState({ rps: 0, total: 0, blocked: 0, allowed: 0 });
  const [loading, setLoading] = useState(true);
  const [live,   setLive]   = useState(true);
  const channelRef = useRef(null);

  const refreshStats = (items) => {
    const now = Date.now();
    const last60 = items.filter(l => (now - new Date(l.timestamp).getTime()) < 60000);
    setStats({
      rps:     parseFloat((last60.length / 60).toFixed(2)),
      total:   items.length,
      blocked: items.filter(l => l.status === 'Blocked').length,
      allowed: items.filter(l => l.status === 'Allowed').length,
    });
    setSpark(buildSparkline(items));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await fetchAttackLogs({ limit: 100 });
      setLogs(items);
      refreshStats(items);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!live) {
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
      return;
    }
    const ch = supabase.channel('traffic_monitor_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attack_logs' }, payload => {
        setLogs(prev => {
          const updated = [payload.new, ...prev].slice(0, 100);
          refreshStats(updated);
          return updated;
        });
      })
      .subscribe();
    channelRef.current = ch;
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [live]);

  const statCards = [
    { label: 'Req/s (last 60s)', value: stats.rps,     color: '#00e676' },
    { label: 'Total Loaded',     value: stats.total,   color: '#00bcd4' },
    { label: 'Blocked',          value: stats.blocked, color: '#f44336' },
    { label: 'Allowed',          value: stats.allowed, color: '#7c4dff' },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <FiberManualRecordIcon sx={{ color: live ? '#00e676' : '#f44336', fontSize: 14 }} />
            <Typography variant="h5" fontWeight={900} color="white">Live Traffic Monitor</Typography>
          </Stack>
          <Typography variant="body2" color="rgba(255,255,255,0.4)">
            {live ? 'Real-time — auto-updates on every new request' : 'Paused — click Live to resume'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} size="small"
            sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: '#00e676', color: '#00e676' } }}>
            Refresh
          </Button>
          <Button variant={live ? 'contained' : 'outlined'} size="small" onClick={() => setLive(p => !p)}
            sx={live
              ? { background: 'linear-gradient(135deg,#00e676,#00bcd4)', color: '#0a0e1a', fontWeight: 800, borderRadius: 2 }
              : { borderColor: 'rgba(0,230,118,0.3)', color: '#00e676', fontWeight: 700 }
            }>
            {live ? '● Live' : '○ Paused'}
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2} mb={2.5}>
        {statCards.map(s => (
          <Grid item xs={6} sm={3} key={s.label}>
            <Card sx={{ p: 2, background: alpha(s.color, 0.07), border: `1px solid ${alpha(s.color, 0.2)}`, borderRadius: 3, textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={900} color={s.color}>{loading ? '…' : s.value}</Typography>
              <Typography variant="caption" color="rgba(255,255,255,0.4)" textTransform="uppercase" letterSpacing={1}>{s.label}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, p: 2.5, mb: 2.5, height: 220 }}>
        <Typography variant="subtitle2" fontWeight={700} color="white" mb={1}>Requests per Minute — Last 20 min</Typography>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 150 }}><CircularProgress sx={{ color: '#00e676' }} /></Box>
        ) : spark.every(s => s.requests === 0) ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="rgba(255,255,255,0.3)">No recent traffic in the last 20 minutes.</Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={spark} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="tgReq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00e676" stopOpacity={0.3} /><stop offset="95%" stopColor="#00e676" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="tgBlk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f44336" stopOpacity={0.3} /><stop offset="95%" stopColor="#f44336" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TooltipStyle} />
              <Area type="monotone" dataKey="requests" stroke="#00e676" fill="url(#tgReq)" strokeWidth={2} name="Requests" />
              <Area type="monotone" dataKey="blocked"  stroke="#f44336" fill="url(#tgBlk)" strokeWidth={1.5} name="Blocked" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, p: 2.5 }}>
        <Typography variant="subtitle1" fontWeight={800} color="white" mb={1.5}>Recent Requests — Last 100</Typography>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress sx={{ color: '#00e676' }} /></Box>
        ) : logs.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="rgba(255,255,255,0.3)">No traffic logged yet. Start the WAF proxy to begin monitoring.</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 480 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {['Time','IP','Method','Path','Type','Status','Score'].map(h => (
                    <TableCell key={h} sx={{ background: '#0a0e1a', color: 'rgba(255,255,255,0.3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id} sx={{ '&:hover': { background: 'rgba(255,255,255,0.02)' }, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: 10 }}>{new Date(log.timestamp).toLocaleTimeString()}</TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', fontSize: 11 }}>{log.source_ip}</TableCell>
                    <TableCell>
                      <Chip label={log.method || 'GET'} size="small"
                        sx={{ background: alpha(methodColor[log.method] || '#607d8b', 0.15), color: methodColor[log.method] || '#607d8b', fontWeight: 700, fontSize: '0.6rem', height: 18 }} />
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.path}</TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{log.attack_type || '—'}</TableCell>
                    <TableCell>
                      <Chip label={log.status} size="small"
                        sx={{ background: alpha(statusColor[log.status] || '#607d8b', 0.12), color: statusColor[log.status] || '#607d8b', border: `1px solid ${alpha(statusColor[log.status] || '#607d8b', 0.25)}`, fontWeight: 700, fontSize: '0.6rem', height: 18 }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" fontWeight={700} fontFamily="monospace"
                        color={log.ai_score > 0.7 ? '#f44336' : log.ai_score > 0.4 ? '#ff9800' : '#00e676'}>
                        {log.ai_score != null ? `${(log.ai_score * 100).toFixed(0)}%` : '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  );
}
