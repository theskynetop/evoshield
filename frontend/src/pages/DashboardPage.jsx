import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Typography, Card, CardContent, Chip, Stack,
  LinearProgress, Avatar, IconButton, Tooltip, alpha, CircularProgress,
} from '@mui/material';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import ShieldIcon       from '@mui/icons-material/Shield';
import BugReportIcon    from '@mui/icons-material/BugReport';
import TrafficIcon      from '@mui/icons-material/Traffic';
import AutoFixHighIcon  from '@mui/icons-material/AutoFixHigh';
import TrendingUpIcon   from '@mui/icons-material/TrendingUp';
import RefreshIcon      from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon  from '@mui/icons-material/CheckCircle';
import {
  fetchDashboardStats,
  fetchTrafficChartData,
  fetchDailyTrafficData,
  fetchAttackDistribution,
  fetchHealingActivity,
  fetchRecentAttacks,
} from '../services/supabaseQueries';
import { ToggleButton, ToggleButtonGroup, TextField, MenuItem } from '@mui/material';

const TRAFFIC_RANGES = { '24H': 0, '7D': 7, '30D': 30, '90D': 90 };
const ATTACK_FILTER_TYPES = ['All', 'SQL Injection', 'XSS', 'Command Injection', 'Path Traversal', 'CSRF', 'XXE', 'SSRF', 'Brute Force'];
const trafMenuProps = { PaperProps: { sx: { background: '#0d1b2a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } } };

const severityColor = { Critical: '#f44336', High: '#ff9800', Medium: '#ffeb3b', Low: '#00e676' };
const statusColor   = { Blocked: '#f44336', Healed: '#00e676', Allowed: '#607d8b' };
const TooltipStyle       = { background: '#0d1b2a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff', fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' };
const tooltipItemStyle   = { color: '#fff' };
const tooltipLabelStyle  = { color: 'rgba(255,255,255,0.7)', fontWeight: 700, marginBottom: 4 };
const tooltipCursor      = { fill: 'rgba(255,255,255,0.06)' };

function StatCard({ label, value, icon, color, bg, loading }) {
  return (
    <Card sx={{
      background: bg, border: `1px solid ${alpha(color, 0.2)}`, borderRadius: 3,
      transition: 'all 0.3s',
      '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 12px 40px ${alpha(color, 0.2)}`, border: `1px solid ${alpha(color, 0.4)}` },
    }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="caption" color="rgba(255,255,255,0.5)" textTransform="uppercase" letterSpacing={1.5} fontWeight={700}>
              {label}
            </Typography>
            {loading
              ? <CircularProgress size={20} sx={{ color, mt: 1 }} />
              : <Typography variant="h4" fontWeight={900} color="white" mt={0.5}>{value}</Typography>
            }
            <Stack direction="row" spacing={0.5} alignItems="center" mt={1}>
              <TrendingUpIcon sx={{ fontSize: 16, color: '#00e676' }} />
              <Typography variant="caption" color="#00e676" fontWeight={700}>Live</Typography>
            </Stack>
          </Box>
          <Avatar sx={{ background: alpha(color, 0.2), color, width: 52, height: 52 }}>{icon}</Avatar>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [stats,        setStats]      = useState(null);
  const [trafficData,  setTraffic]    = useState([]);
  const [attackDist,   setDist]       = useState([]);
  const [healingData,  setHealing]    = useState([]);
  const [recentAtks,   setRecent]     = useState([]);
  const [loading,      setLoading]    = useState(true);
  const [lastRefresh,  setRefresh]    = useState(new Date());
  const [trafRange,    setTrafRange]  = useState('24H');    // 24H | 7D | 30D | 90D
  const [trafType,     setTrafType]   = useState('All');    // attack-type filter
  const [trafLoading,  setTrafLoading]= useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, d, h, r] = await Promise.all([
        fetchDashboardStats(),
        fetchAttackDistribution(),
        fetchHealingActivity(),
        fetchRecentAttacks(6),
      ]);
      setStats(s);
      setDist(d);
      setHealing(h);
      setRecent(r);
      setRefresh(new Date());
    } catch (e) {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);

  // Reload the Traffic Overview whenever the range or attack-type filter changes.
  useEffect(() => {
    let cancelled = false;
    setTrafLoading(true);
    const days = TRAFFIC_RANGES[trafRange];
    const loader = days === 0
      ? fetchTrafficChartData()                       // hourly, last 24h (ignores type filter)
      : fetchDailyTrafficData(days, trafType);        // daily buckets, filterable
    loader
      .then(d => { if (!cancelled) setTraffic(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setTrafLoading(false); });
    return () => { cancelled = true; };
  }, [trafRange, trafType]);

  const statCards = [
    { label: 'Attacks Today',    value: stats?.totalRequests?.toLocaleString()  || '0', icon: <TrafficIcon />,    color: '#00e676', bg: 'rgba(0,230,118,0.08)'   },
    { label: 'Attacks Blocked',  value: stats?.attacksBlocked?.toLocaleString() || '0', icon: <ShieldIcon />,     color: '#00bcd4', bg: 'rgba(0,188,212,0.08)'   },
    { label: 'Active Threats',   value: stats?.activeThreat?.toLocaleString()   || '0', icon: <BugReportIcon />,  color: '#ff9800', bg: 'rgba(255,152,0,0.08)'   },
    { label: 'Rules Auto-Healed',value: stats?.rulesHealed?.toLocaleString()    || '0', icon: <AutoFixHighIcon />,color: '#7c4dff', bg: 'rgba(124,77,255,0.08)' },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={900} color="white">Security Dashboard</Typography>
          <Typography variant="body2" color="rgba(255,255,255,0.4)">Real-time threat intelligence — auto-refreshes every 30s</Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, px: 1.5, py: 0.6,
            background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.2)', borderRadius: 6 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#00e676',
              animation: 'pulse 2s infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }} />
            <Typography variant="caption" color="#00e676" fontWeight={700}>LIVE</Typography>
          </Box>
          <Typography variant="caption" color="rgba(255,255,255,0.3)">Updated {lastRefresh.toLocaleTimeString()}</Typography>
          <Tooltip title="Refresh">
            <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#00e676' } }} onClick={load}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Stat Cards */}
      <Grid container spacing={2.5} mb={3}>
        {statCards.map(c => (
          <Grid item xs={12} sm={6} lg={3} key={c.label}>
            <StatCard {...c} loading={loading} />
          </Grid>
        ))}
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={2.5} mb={2.5}>
        {/* Traffic Chart */}
        <Grid item xs={12} lg={8} sx={{ display: 'flex' }}>
          <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, p: 2.5, minHeight: 320, width: '100%', display: 'flex', flexDirection: 'column' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={1.5} mb={2}>
              <Box>
                <Typography variant="subtitle1" fontWeight={800} color="white">Traffic Overview</Typography>
                <Typography variant="caption" color="rgba(255,255,255,0.35)">
                  {trafRange === '24H'
                    ? 'Attacks logged in the last 24 hours (hourly)'
                    : `Daily attacks over the last ${TRAFFIC_RANGES[trafRange]} days${trafType !== 'All' ? ` — ${trafType}` : ''}`}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                {/* Attack-type filter (only meaningful for day ranges) */}
                <TextField select size="small" value={trafType} onChange={e => setTrafType(e.target.value)}
                  disabled={trafRange === '24H'}
                  SelectProps={{ MenuProps: trafMenuProps }}
                  sx={{ minWidth: 130, '& .MuiOutlinedInput-root': { color: '#fff', fontSize: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 1.5,
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' }, '&.Mui-focused fieldset': { borderColor: '#00e676' } },
                    '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.4)' }, '& .Mui-disabled': { opacity: 0.4 } }}>
                  {ATTACK_FILTER_TYPES.map(t => <MenuItem key={t} value={t} sx={{ fontSize: 12 }}>{t === 'All' ? 'All Types' : t}</MenuItem>)}
                </TextField>
                {/* Range toggle */}
                <ToggleButtonGroup value={trafRange} exclusive size="small"
                  onChange={(_, v) => v && setTrafRange(v)}
                  sx={{ '& .MuiToggleButton-root': { color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.15)', px: 1.3, py: 0.4, fontSize: 11, fontWeight: 700,
                    '&.Mui-selected': { background: 'rgba(0,230,118,0.15)', color: '#00e676', '&:hover': { background: 'rgba(0,230,118,0.22)' } } } }}>
                  {Object.keys(TRAFFIC_RANGES).map(r => <ToggleButton key={r} value={r}>{r}</ToggleButton>)}
                </ToggleButtonGroup>
              </Stack>
            </Stack>
            {loading || trafLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 230 }}>
                <CircularProgress sx={{ color: '#00e676' }} />
              </Box>
            ) : (
              <Box sx={{ flex: 1, minHeight: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="gRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#00e676" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00e676" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gAttacks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f44336" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f44336" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey={trafRange === '24H' ? 'time' : 'date'} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <RTooltip contentStyle={TooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
                  <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                  <Area type="monotone" dataKey="requests" stroke="#00e676" strokeWidth={2} fill="url(#gRequests)" name="Total Logs" />
                  <Area type="monotone" dataKey="attacks"  stroke="#f44336" strokeWidth={2} fill="url(#gAttacks)"  name="Attacks"    />
                </AreaChart>
              </ResponsiveContainer>
              </Box>
            )}
          </Card>
        </Grid>

        {/* Attack Distribution */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, p: 2.5, minHeight: 320 }}>
            <Typography variant="subtitle1" fontWeight={800} color="white" mb={0.5}>Attack Distribution</Typography>
            <Typography variant="caption" color="rgba(255,255,255,0.35)" display="block" mb={1}>Real breakdown by type</Typography>
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180 }}><CircularProgress sx={{ color: '#7c4dff' }} /></Box>
            ) : attackDist.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}><Typography color="rgba(255,255,255,0.3)" variant="body2">No attack data yet</Typography></Box>
            ) : (
              (() => {
                const distTotal = attackDist.reduce((sum, t) => sum + t.value, 0) || 1;
                const pct = v => ((v / distTotal) * 100).toFixed(1);
                return (
                  <>
                    <ResponsiveContainer width="100%" height={190}>
                      <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                        <Pie data={attackDist} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={3}
                          label={({ percent }) => percent >= 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                          labelLine={false}
                          style={{ fontSize: 10, fontWeight: 700 }}>
                          {attackDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <RTooltip contentStyle={TooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle}
                          formatter={(value, name) => [`${value} (${pct(value)}%)`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <Stack spacing={0.7} mt={1}>
                      {attackDist.map(t => (
                        <Stack key={t.name} direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minWidth: 0 }}>
                            <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: t.color, flexShrink: 0 }} />
                            <Typography variant="caption" color="rgba(255,255,255,0.6)" noWrap>{t.name}</Typography>
                          </Stack>
                          <Typography variant="caption" color="white" fontWeight={700} sx={{ flexShrink: 0, ml: 1 }}>
                            {t.value} <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>({pct(t.value)}%)</span>
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </>
                );
              })()
            )}
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={2.5} mb={2.5}>
        {/* Healing Activity */}
        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, p: 2.5, height: 280 }}>
            <Typography variant="subtitle1" fontWeight={800} color="white" mb={0.5}>Self-Healing Activity</Typography>
            <Typography variant="caption" color="rgba(255,255,255,0.35)" display="block" mb={1}>Rules auto-generated this week</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={healingData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <RTooltip contentStyle={TooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} cursor={tooltipCursor} />
                <Bar dataKey="rules" fill="url(#barGrad)" radius={[4, 4, 0, 0]} name="Rules Healed" />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#7c4dff" />
                    <stop offset="100%" stopColor="#00bcd4" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* System Health */}
        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, p: 2.5, height: 280 }}>
            <Typography variant="subtitle1" fontWeight={800} color="white" mb={2}>System Health</Typography>
            {[
              { label: 'Blocked Rate',   value: stats ? Math.round((stats.attacksBlocked / Math.max(stats.totalRequests, 1)) * 100) : 0, color: '#00e676' },
              { label: 'Healed Rate',    value: stats ? Math.round((stats.rulesHealed    / Math.max(stats.totalRequests, 1)) * 100) : 0, color: '#00bcd4' },
              { label: 'Critical Events',value: stats ? Math.min(Math.round((stats.activeThreat / Math.max(stats.totalRequests, 1)) * 100), 100) : 0, color: '#f44336', invert: true },
            ].map(item => (
              <Box key={item.label} mb={2.5}>
                <Stack direction="row" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" color="rgba(255,255,255,0.55)">{item.label}</Typography>
                  <Typography variant="caption" color={item.color} fontWeight={700}>{item.value}%</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate" value={item.value}
                  sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.06)',
                    '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg, ${item.color}, ${alpha(item.color, 0.6)})`, borderRadius: 3 } }}
                />
              </Box>
            ))}
            <Typography variant="caption" color="rgba(255,255,255,0.3)">
              Based on the last 24 hours of traffic
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Attacks */}
      <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} color="white">Recent Attacks</Typography>
            <Typography variant="caption" color="rgba(255,255,255,0.35)">Most recent detections</Typography>
          </Box>
          <Chip label="Live" size="small" icon={<WarningAmberIcon sx={{ fontSize: 12, color: '#ff9800 !important' }} />}
            sx={{ background: 'rgba(255,152,0,0.1)', color: '#ff9800', border: '1px solid rgba(255,152,0,0.3)', fontWeight: 700, fontSize: '0.65rem' }} />
        </Stack>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress sx={{ color: '#00e676' }} /></Box>
        ) : recentAtks.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="rgba(255,255,255,0.3)">No attacks logged yet. Send test traffic to populate data.</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Attack Type','Source IP','Path','Severity','Status','Time'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'rgba(255,255,255,0.35)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentAtks.map(a => (
                  <tr key={a.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 12px', color: 'white', fontWeight: 600 }}>{a.attack_type || '—'}</td>
                    <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', fontSize: 12 }}>{a.source_ip}</td>
                    <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: 12 }}>{a.path}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <Chip label={a.severity || '—'} size="small" sx={{ background: alpha(severityColor[a.severity] || '#607d8b', 0.15), color: severityColor[a.severity] || '#607d8b', border: `1px solid ${alpha(severityColor[a.severity] || '#607d8b', 0.3)}`, fontWeight: 700, fontSize: '0.65rem' }} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {a.status === 'Blocked' ? <ShieldIcon sx={{ fontSize: 14, color: '#f44336' }} /> : <CheckCircleIcon sx={{ fontSize: 14, color: '#00e676' }} />}
                        <Typography variant="caption" color={statusColor[a.status] || '#607d8b'} fontWeight={700}>{a.status}</Typography>
                      </Stack>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}
      </Card>
    </Box>
  );
}
