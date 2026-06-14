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
  fetchAttackDistribution,
  fetchHealingActivity,
  fetchRecentAttacks,
} from '../services/supabaseQueries';

const severityColor = { Critical: '#f44336', High: '#ff9800', Medium: '#ffeb3b', Low: '#00e676' };
const statusColor   = { Blocked: '#f44336', Healed: '#00e676', Allowed: '#607d8b' };
const TooltipStyle  = { background: 'rgba(13,27,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 12 };

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

  const load = async () => {
    setLoading(true);
    try {
      const [s, t, d, h, r] = await Promise.all([
        fetchDashboardStats(),
        fetchTrafficChartData(),
        fetchAttackDistribution(),
        fetchHealingActivity(),
        fetchRecentAttacks(6),
      ]);
      setStats(s);
      setTraffic(t);
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
        <Grid item xs={12} lg={8}>
          <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, p: 2.5, height: 320 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Box>
                <Typography variant="subtitle1" fontWeight={800} color="white">Traffic Overview</Typography>
                <Typography variant="caption" color="rgba(255,255,255,0.35)">Attacks logged in the last 24 hours</Typography>
              </Box>
              <Chip label="24H" size="small" sx={{ background: 'rgba(0,230,118,0.1)', color: '#00e676', border: '1px solid rgba(0,230,118,0.2)', fontWeight: 700, fontSize: '0.65rem' }} />
            </Stack>
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 230 }}>
                <CircularProgress sx={{ color: '#00e676' }} />
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
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
                  <XAxis dataKey="time" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <RTooltip contentStyle={TooltipStyle} />
                  <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                  <Area type="monotone" dataKey="requests" stroke="#00e676" strokeWidth={2} fill="url(#gRequests)" name="Total Logs" />
                  <Area type="monotone" dataKey="attacks"  stroke="#f44336" strokeWidth={2} fill="url(#gAttacks)"  name="Attacks"    />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Grid>

        {/* Attack Distribution */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, p: 2.5, height: 320 }}>
            <Typography variant="subtitle1" fontWeight={800} color="white" mb={0.5}>Attack Distribution</Typography>
            <Typography variant="caption" color="rgba(255,255,255,0.35)" display="block" mb={1}>Real breakdown by type</Typography>
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180 }}><CircularProgress sx={{ color: '#7c4dff' }} /></Box>
            ) : attackDist.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}><Typography color="rgba(255,255,255,0.3)" variant="body2">No attack data yet</Typography></Box>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={attackDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                      {attackDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <RTooltip contentStyle={TooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <Stack spacing={0.6}>
                  {attackDist.map(t => (
                    <Stack key={t.name} direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={0.8} alignItems="center">
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: t.color }} />
                        <Typography variant="caption" color="rgba(255,255,255,0.55)">{t.name}</Typography>
                      </Stack>
                      <Typography variant="caption" color="white" fontWeight={700}>{t.value}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </>
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
                <RTooltip contentStyle={TooltipStyle} />
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
