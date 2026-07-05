import React, { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Stack, Chip, Grid, Button,
  TextField, MenuItem, LinearProgress, Alert, Divider,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  alpha, CircularProgress,
} from '@mui/material';
import DownloadIcon    from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon  from '@mui/icons-material/TableChart';
import AssessmentIcon  from '@mui/icons-material/Assessment';
import RefreshIcon     from '@mui/icons-material/Refresh';
import TrendingUpIcon   from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { fetchAttackLogs, fetchWeeklyAttackData, fetchAttackDistribution, fetchPeriodAnalysis } from '../services/supabaseQueries';

const PERIOD_DAYS = { 'Last 24 Hours': 1, 'Last 7 Days': 7, 'Last 30 Days': 30, 'Last 90 Days': 90 };

const PERIODS     = ['Last 24 Hours','Last 7 Days','Last 30 Days','Last 90 Days'];
const FORMATS     = ['CSV','JSON'];
const REPORT_TYPES= ['Attack Summary','Traffic Analysis','Rule Performance'];
const TooltipStyle= { background: '#0d1b2a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff', fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' };
const tooltipItemStyle  = { color: '#fff' };
const tooltipLabelStyle = { color: 'rgba(255,255,255,0.7)', fontWeight: 700, marginBottom: 4 };
const tooltipCursor     = { fill: 'rgba(255,255,255,0.06)' };

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    color: '#fff', background: 'rgba(255,255,255,0.04)', borderRadius: 2,
    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(0,230,118,0.3)' },
    '&.Mui-focused fieldset': { borderColor: '#00e676' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#00e676' },
  '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.4)' },
};
const menuProps = { PaperProps: { sx: { background: '#0d1b2a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } } };

export default function ReportsPage() {
  const [period,      setPeriod]   = useState('Last 7 Days');
  const [format,      setFormat]   = useState('CSV');
  const [reportType,  setType]     = useState('Attack Summary');
  const [generating,  setGen]      = useState(false);
  const [loading,     setLoading]  = useState(true);
  const [success,     setSuccess]  = useState('');
  const [allLogs,     setAllLogs]  = useState([]);
  const [weeklyData,  setWeekly]   = useState([]);
  const [pieData,     setPie]      = useState([]);
  const [topSources,  setTopSrc]   = useState([]);
  const [analysis,    setAnalysis] = useState(null);
  const [analyzing,   setAnalyzing]= useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [{ items }, weekly, dist] = await Promise.all([
        fetchAttackLogs({ limit: 500 }),
        fetchWeeklyAttackData(),
        fetchAttackDistribution(),
      ]);
      setAllLogs(items);
      setWeekly(weekly);
      setPie(dist);

      // Top sources
      const ipCount = {};
      items.forEach(l => { ipCount[l.source_ip] = (ipCount[l.source_ip] || 0) + 1; });
      const sorted = Object.entries(ipCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
      setTopSrc(sorted.map(([ip, count]) => ({ ip, attacks: count, country: '—' })));
    } catch (e) {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Re-run period analysis whenever the selected time period changes.
  useEffect(() => {
    let cancelled = false;
    setAnalyzing(true);
    fetchPeriodAnalysis(PERIOD_DAYS[period] || 30)
      .then(a => { if (!cancelled) setAnalysis(a); })
      .catch(() => { if (!cancelled) setAnalysis(null); })
      .finally(() => { if (!cancelled) setAnalyzing(false); });
    return () => { cancelled = true; };
  }, [period]);

  const exportCSV = (logs) => {
    const headers = 'ID,Time,Type,IP,Path,Severity,Status,AI Score\n';
    const rows = logs.map(l => `${l.id},${l.timestamp},${l.attack_type},${l.source_ip},${l.path},${l.severity},${l.status},${l.ai_score}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sh_waf_report.csv'; a.click();
    setSuccess('CSV report downloaded successfully');
    setTimeout(() => setSuccess(''), 4000);
  };

  const exportJSON = (logs) => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sh_waf_report.json'; a.click();
    setSuccess('JSON report downloaded successfully');
    setTimeout(() => setSuccess(''), 4000);
  };

  const generateReport = async () => {
    setGen(true);
    try {
      const daysMap = { 'Last 24 Hours': 1, 'Last 7 Days': 7, 'Last 30 Days': 30, 'Last 90 Days': 90 };
      const days = daysMap[period] || 7;
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { items } = await fetchAttackLogs({ limit: 1000 });
      const filtered = items.filter(l => new Date(l.timestamp) >= new Date(since));
      if (format === 'CSV')  exportCSV(filtered);
      else                   exportJSON(filtered);
    } catch (e) {
      setSuccess(`Error: ${e.message}`);
    } finally {
      setGen(false);
    }
  };

  const totalAttacks = allLogs.length;
  const blocked      = allLogs.filter(l => l.status === 'Blocked').length;
  const healed       = allLogs.filter(l => l.status === 'Healed').length;
  const critical     = allLogs.filter(l => l.severity === 'Critical').length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <AssessmentIcon sx={{ color: '#00bcd4', fontSize: 28 }} />
            <Typography variant="h5" fontWeight={900} color="white">Reports & Export</Typography>
          </Stack>
          <Typography variant="body2" color="rgba(255,255,255,0.4)">Export filtered reports in CSV or JSON format</Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} size="small"
          sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: '#00bcd4', color: '#00bcd4' } }}>
          Refresh
        </Button>
      </Stack>

      {success && <Alert severity={success.startsWith('Error') ? 'error' : 'success'} sx={{ mb: 2, background: 'rgba(0,230,118,0.1)', color: '#b9f6ca', border: '1px solid rgba(0,230,118,0.25)' }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Grid container spacing={2.5}>
        {/* Generator Panel */}
        <Grid item xs={12} md={4}>
          <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,188,212,0.2)', borderRadius: 3, p: 3 }}>
            <Typography variant="subtitle1" fontWeight={800} color="white" mb={2.5}>Generate Report</Typography>
            <Stack spacing={2.5}>
              <TextField select label="Report Type" value={reportType} onChange={e => setType(e.target.value)} fullWidth sx={fieldSx} SelectProps={{ MenuProps: menuProps }}>
                {REPORT_TYPES.map(t => <MenuItem key={t} value={t} sx={{ fontSize: 13 }}>{t}</MenuItem>)}
              </TextField>
              <TextField select label="Time Period" value={period} onChange={e => setPeriod(e.target.value)} fullWidth sx={fieldSx} SelectProps={{ MenuProps: menuProps }}>
                {PERIODS.map(p => <MenuItem key={p} value={p} sx={{ fontSize: 13 }}>{p}</MenuItem>)}
              </TextField>
              <TextField select label="Export Format" value={format} onChange={e => setFormat(e.target.value)} fullWidth sx={fieldSx} SelectProps={{ MenuProps: menuProps }}>
                {FORMATS.map(f => <MenuItem key={f} value={f} sx={{ fontSize: 13 }}>{f}</MenuItem>)}
              </TextField>

              {generating && <LinearProgress sx={{ borderRadius: 2, bgcolor: 'rgba(0,188,212,0.15)', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg,#00bcd4,#00e676)' } }} />}

              <Button variant="contained" fullWidth size="large"
                startIcon={format === 'PDF' ? <PictureAsPdfIcon /> : <TableChartIcon />}
                onClick={generateReport} disabled={generating || loading}
                sx={{ background: 'linear-gradient(135deg,#00bcd4,#00e676)', color: '#0a0e1a', fontWeight: 900, borderRadius: 2, boxShadow: '0 8px 24px rgba(0,188,212,0.3)' }}>
                {generating ? 'Generating report…' : `Export ${format}`}
              </Button>
            </Stack>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', my: 3 }} />

            <Typography variant="subtitle2" fontWeight={700} color="white" mb={1.5}>Quick Export (All Data)</Typography>
            <Stack spacing={1.5}>
              <Button fullWidth variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportCSV(allLogs)} disabled={loading}
                sx={{ borderColor: 'rgba(0,230,118,0.3)', color: '#00e676', fontSize: 12, fontWeight: 700, '&:hover': { borderColor: '#00e676', background: 'rgba(0,230,118,0.07)' } }}>
                All Logs as CSV
              </Button>
              <Button fullWidth variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportJSON(allLogs)} disabled={loading}
                sx={{ borderColor: 'rgba(0,188,212,0.3)', color: '#00bcd4', fontSize: 12, fontWeight: 700, '&:hover': { borderColor: '#00bcd4', background: 'rgba(0,188,212,0.07)' } }}>
                All Logs as JSON
              </Button>
            </Stack>
          </Card>
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={8}>
          <Stack spacing={2.5}>
            {/* Summary Cards */}
            <Grid container spacing={2}>
              {[
                { label: 'Total Logged', value: loading ? '…' : totalAttacks, color: '#f44336' },
                { label: 'Blocked',      value: loading ? '…' : blocked,      color: '#ff9800' },
                { label: 'Auto-Healed', value: loading ? '…' : healed,        color: '#00e676' },
                { label: 'Critical',    value: loading ? '…' : critical,       color: '#7c4dff' },
              ].map(s => (
                <Grid item xs={6} sm={3} key={s.label}>
                  <Card sx={{ p: 2, background: alpha(s.color, 0.07), border: `1px solid ${alpha(s.color, 0.2)}`, borderRadius: 3, textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight={900} color={s.color}>{s.value}</Typography>
                    <Typography variant="caption" color="rgba(255,255,255,0.4)" textTransform="uppercase" letterSpacing={1}>{s.label}</Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Period Comparison — history by time range */}
            <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,188,212,0.2)', borderRadius: 3, p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} color="white">Period Analysis</Typography>
                  <Typography variant="caption" color="rgba(255,255,255,0.35)">Attacks in the {period.toLowerCase()} — vs the previous {period.replace('Last ', '').toLowerCase()}</Typography>
                </Box>
                <Chip label={period} size="small" sx={{ background: 'rgba(0,188,212,0.12)', color: '#00bcd4', fontWeight: 700, fontSize: '0.65rem', border: '1px solid rgba(0,188,212,0.25)' }} />
              </Stack>

              {analyzing ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 140 }}><CircularProgress sx={{ color: '#00bcd4' }} /></Box>
              ) : !analysis || analysis.totalAttacks === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}><Typography color="rgba(255,255,255,0.3)" variant="body2">No attacks in this period.</Typography></Box>
              ) : (
                <>
                  {/* Headline numbers */}
                  <Grid container spacing={2} mb={2}>
                    <Grid item xs={6} sm={3}>
                      <Box>
                        <Typography variant="h4" fontWeight={900} color="white">{analysis.totalAttacks.toLocaleString()}</Typography>
                        <Typography variant="caption" color="rgba(255,255,255,0.4)">Total Attacks</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          {analysis.change == null ? (
                            <Typography variant="h5" fontWeight={900} color="rgba(255,255,255,0.5)">—</Typography>
                          ) : (
                            <>
                              {analysis.change >= 0
                                ? <TrendingUpIcon sx={{ color: '#f44336', fontSize: 22 }} />
                                : <TrendingDownIcon sx={{ color: '#00e676', fontSize: 22 }} />}
                              <Typography variant="h5" fontWeight={900} color={analysis.change >= 0 ? '#f44336' : '#00e676'}>
                                {analysis.change >= 0 ? '+' : ''}{analysis.change}%
                              </Typography>
                            </>
                          )}
                        </Stack>
                        <Typography variant="caption" color="rgba(255,255,255,0.4)">vs previous period</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      {analysis.topAttack && (
                        <Box sx={{ p: 1.5, background: alpha(analysis.topAttack.color, 0.1), border: `1px solid ${alpha(analysis.topAttack.color, 0.3)}`, borderRadius: 2 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <LocalFireDepartmentIcon sx={{ color: analysis.topAttack.color, fontSize: 24 }} />
                            <Box>
                              <Typography variant="caption" color="rgba(255,255,255,0.5)" display="block">Most frequent attack</Typography>
                              <Typography variant="body2" fontWeight={800} color="white">
                                {analysis.topAttack.name} <span style={{ color: analysis.topAttack.color }}>· {analysis.topAttack.count} ({analysis.topAttack.pct}%)</span>
                              </Typography>
                            </Box>
                          </Stack>
                        </Box>
                      )}
                    </Grid>
                  </Grid>

                  {/* Per-type breakdown bars */}
                  <Stack spacing={1}>
                    {analysis.breakdown.map(b => (
                      <Box key={b.name}>
                        <Stack direction="row" justifyContent="space-between" mb={0.3}>
                          <Typography variant="caption" color="rgba(255,255,255,0.6)">{b.name}</Typography>
                          <Typography variant="caption" color="white" fontWeight={700}>{b.count} <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>({b.pct}%)</span></Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={b.pct}
                          sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.06)',
                            '& .MuiLinearProgress-bar': { background: b.color, borderRadius: 3 } }} />
                      </Box>
                    ))}
                  </Stack>
                </>
              )}
            </Card>

            {/* Weekly Bar Chart */}
            <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, p: 2.5, height: 240 }}>
              <Typography variant="subtitle2" fontWeight={700} color="white" mb={1}>Weekly Attack Overview</Typography>
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180 }}><CircularProgress sx={{ color: '#00bcd4' }} /></Box>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={weeklyData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} cursor={tooltipCursor} />
                    <Bar dataKey="attacks" fill="#f44336" radius={[3,3,0,0]} name="Total Attacks" opacity={0.7} />
                    <Bar dataKey="blocked" fill="#00e676" radius={[3,3,0,0]} name="Blocked" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Pie + Top Sources */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={5}>
                <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, p: 2.5, height: 200 }}>
                  <Typography variant="subtitle2" fontWeight={700} color="white" mb={1}>By Attack Type</Typography>
                  {loading ? <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 140 }}><CircularProgress size={28} sx={{ color: '#7c4dff' }} /></Box>
                  : pieData.length === 0 ? <Typography color="rgba(255,255,255,0.3)" variant="caption">No data yet</Typography>
                  : (
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}
                          label={({ value }) => {
                            const tot = pieData.reduce((s, p) => s + p.value, 0) || 1;
                            return `${((value / tot) * 100).toFixed(0)}%`;
                          }}
                          labelLine={false} style={{ fontSize: 9, fontWeight: 700 }}>
                          {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip contentStyle={TooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle}
                          formatter={(value, name) => {
                            const tot = pieData.reduce((s, p) => s + p.value, 0) || 1;
                            return [`${value} (${((value / tot) * 100).toFixed(1)}%)`, name];
                          }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </Card>
              </Grid>
              <Grid item xs={12} sm={7}>
                <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, p: 2.5, height: 200, overflow: 'auto' }}>
                  <Typography variant="subtitle2" fontWeight={700} color="white" mb={1}>Top Attack Sources</Typography>
                  {loading ? <CircularProgress size={20} sx={{ color: '#f44336' }} />
                  : topSources.length === 0 ? <Typography color="rgba(255,255,255,0.3)" variant="caption">No data yet</Typography>
                  : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {['IP','Attacks'].map(h => (
                              <TableCell key={h} sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, textTransform: 'uppercase', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {topSources.map(r => (
                            <TableRow key={r.ip} sx={{ '&:hover': { background: 'rgba(255,255,255,0.02)' }, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <TableCell sx={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', fontSize: 11 }}>{r.ip}</TableCell>
                              <TableCell sx={{ color: '#f44336', fontWeight: 700, fontSize: 12 }}>{r.attacks}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Card>
              </Grid>
            </Grid>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
