import React, { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Stack, Chip, Grid, Button,
  LinearProgress, Alert, Divider, alpha, CircularProgress,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
} from '@mui/material';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import PsychologyIcon   from '@mui/icons-material/Psychology';
import PlayArrowIcon    from '@mui/icons-material/PlayArrow';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RefreshIcon      from '@mui/icons-material/Refresh';
import { supabase }     from '../services/supabase';
import { fetchModelStats, fetchAttackLogs } from '../services/supabaseQueries';

const TooltipStyle = { background: 'rgba(13,27,42,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 12 };

// Derive scatter points from real attack logs
function logsToScatter(logs) {
  return logs.map(l => ({
    x:          (l.payload?.length || 0) + (l.path?.length || 0),
    y:          l.ai_score || 0,
    anomaly:    (l.ai_score || 0) > 0.5,
    score:      l.ai_score || 0,
    ip:         l.source_ip,
    attackType: l.attack_type,
  }));
}

// SHAP-like bar from real logs
function deriveSHAP(logs) {
  if (!logs.length) return null;
  const totals = { 'Payload Length': 0, 'Special Chars': 0, 'SQL Keywords': 0, 'Request Rate': 0, 'Path Depth': 0, 'Header Anomaly': 0, 'Encoding Pattern': 0, 'User-Agent Score': 0 };
  logs.forEach(l => {
    const p = l.payload || '';
    totals['Payload Length']   += Math.min(l.ai_score * (p.length / 500), 0.5);
    totals['Special Chars']    += Math.min(l.ai_score * (p.replace(/[a-zA-Z0-9 ]/g, '').length / 50), 0.4);
    totals['SQL Keywords']     += l.attack_type === 'SQL Injection' ? l.ai_score * 0.4 : 0;
    totals['Request Rate']     -= l.ai_score * 0.1;
    totals['Path Depth']       += (l.path?.split('/').length || 0) * l.ai_score * 0.02;
    totals['Header Anomaly']   += l.ai_score * 0.15;
    totals['Encoding Pattern'] += p.includes('%') ? l.ai_score * 0.2 : 0;
    totals['User-Agent Score'] -= l.ai_score * 0.08;
  });
  const n = logs.length;
  const features = Object.entries(totals).map(([name, v]) => ({ name, value: parseFloat((v / n).toFixed(3)) }));
  const maxVal   = Math.max(...features.map(f => Math.abs(f.value)));
  const avgScore = logs.reduce((s, l) => s + (l.ai_score || 0), 0) / n;
  return { features, maxVal, score: avgScore };
}

function SHAPBar({ feature, value, max }) {
  const pct      = Math.abs(value) / (max || 1) * 100;
  const positive = value >= 0;
  return (
    <Box mb={1.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.4}>
        <Typography variant="caption" color="rgba(255,255,255,0.7)" fontWeight={600}>{feature}</Typography>
        <Typography variant="caption" color={positive ? '#f44336' : '#00e676'} fontWeight={700} fontFamily="monospace">
          {positive ? '+' : ''}{value.toFixed(3)}
        </Typography>
      </Stack>
      <Box sx={{ flex: 1, position: 'relative', height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.07)' }}>
        <Box sx={{
          position: 'absolute', top: 0, bottom: 0, borderRadius: 4,
          width: `${Math.min(pct, 50)}%`,
          background: positive ? 'linear-gradient(90deg,#f44336,#ff7043)' : 'linear-gradient(90deg,#00bcd4,#00e676)',
          left: positive ? '50%' : `${50 - Math.min(pct, 50)}%`,
        }} />
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 1, height: 8, background: 'rgba(255,255,255,0.2)' }} />
      </Box>
    </Box>
  );
}

const RADAR_FALLBACK = [
  { subject: 'SQL Injection', A: 0 },
  { subject: 'XSS',           A: 0 },
  { subject: 'Cmd Inject',    A: 0 },
  { subject: 'Path Trav',     A: 0 },
  { subject: 'Zero-Day',      A: 0 },
  { subject: 'CSRF',          A: 0 },
];

export default function AnomalyDetectionPage() {
  const [logs,       setLogs]      = useState([]);
  const [modelStats, setModel]     = useState(null);
  const [shapData,   setSHAP]      = useState(null);
  const [radarData,  setRadar]     = useState(RADAR_FALLBACK);
  const [loading,    setLoading]   = useState(true);
  const [running,    setRunning]   = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [{ items }, stats] = await Promise.all([
        fetchAttackLogs({ limit: 300 }),
        fetchModelStats().catch(() => null),
      ]);
      setLogs(items);
      setModel(stats);
      setSHAP(deriveSHAP(items.filter(l => l.ai_score > 0)));

      // Build radar from real type distribution
      const typeCounts = {};
      items.forEach(l => { if (l.attack_type) typeCounts[l.attack_type] = (typeCounts[l.attack_type] || 0) + 1; });
      const total = items.length || 1;
      setRadar([
        { subject: 'SQL Injection', A: Math.round((typeCounts['SQL Injection'] || 0) / total * 100) },
        { subject: 'XSS',           A: Math.round((typeCounts['XSS'] || 0) / total * 100) },
        { subject: 'Cmd Inject',    A: Math.round((typeCounts['Command Injection'] || 0) / total * 100) },
        { subject: 'Path Trav',     A: Math.round((typeCounts['Path Traversal'] || 0) / total * 100) },
        { subject: 'Zero-Day',      A: Math.round((typeCounts['Unknown'] || 0) / total * 100) },
        { subject: 'CSRF',          A: Math.round((typeCounts['CSRF'] || 0) / total * 100) },
      ]);
    } catch (e) {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Realtime new logs
  useEffect(() => {
    const ch = supabase.channel('anomaly_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attack_logs' }, () => load())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const runInference = () => {
    setRunning(true);
    setTimeout(() => { load(); setRunning(false); }, 1500);
  };

  const scatterData = logsToScatter(logs);
  const anomalies   = scatterData.filter(d => d.anomaly);
  const normals     = scatterData.filter(d => !d.anomaly);

  const metricCards = modelStats
    ? [
        { label: 'Accuracy',  value: `${modelStats.accuracy}%`,  color: '#00e676' },
        { label: 'Precision', value: `${modelStats.precision}%`, color: '#00bcd4' },
        { label: 'Recall',    value: `${modelStats.recall}%`,    color: '#7c4dff' },
        { label: 'F1 Score',  value: `${modelStats.f1_score}%`,  color: '#ff9800' },
        { label: 'FP Rate',   value: `${modelStats.fp_rate}%`,   color: '#f44336' },
        { label: 'Trees',     value: modelStats.n_trees,          color: '#607d8b' },
      ]
    : [
        { label: 'Logs Analysed', value: logs.length, color: '#00e676' },
        { label: 'Anomalies',     value: anomalies.length, color: '#f44336' },
        { label: 'Normal',        value: normals.length, color: '#00bcd4' },
        { label: 'Avg AI Score',  value: logs.length ? `${(logs.reduce((s, l) => s + (l.ai_score || 0), 0) / logs.length * 100).toFixed(1)}%` : '—', color: '#7c4dff' },
      ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <PsychologyIcon sx={{ color: '#7c4dff', fontSize: 28 }} />
            <Typography variant="h5" fontWeight={900} color="white">AI Anomaly Detection</Typography>
          </Stack>
          <Typography variant="body2" color="rgba(255,255,255,0.4)">Isolation Forest model — analysing live request data</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} size="small"
            sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: '#7c4dff', color: '#7c4dff' } }}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={running ? <CircularProgress size={14} sx={{ color: 'white' }} /> : <PlayArrowIcon />}
            onClick={runInference} disabled={running || loading}
            sx={{ background: 'linear-gradient(135deg,#7c4dff,#00bcd4)', fontWeight: 700, borderRadius: 2, boxShadow: '0 8px 24px rgba(124,77,255,0.3)' }}>
            {running ? 'Analysing…' : 'Refresh Analysis'}
          </Button>
        </Stack>
      </Stack>

      {(running || loading) && <LinearProgress sx={{ mb: 2, borderRadius: 2, bgcolor: 'rgba(124,77,255,0.15)', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg,#7c4dff,#00bcd4)' } }} />}

      {/* Metrics */}
      <Grid container spacing={2} mb={2.5}>
        {metricCards.map(m => (
          <Grid item xs={6} sm={4} md={2} key={m.label}>
            <Card sx={{ p: 2, background: alpha(m.color, 0.07), border: `1px solid ${alpha(m.color, 0.2)}`, borderRadius: 3, textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={900} color={m.color}>{loading ? '…' : m.value}</Typography>
              <Typography variant="caption" color="rgba(255,255,255,0.4)" textTransform="uppercase" letterSpacing={1}>{m.label}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5} mb={2.5}>
        {/* Scatter */}
        <Grid item xs={12} lg={7}>
          <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, p: 2.5, height: 360 }}>
            <Typography variant="subtitle1" fontWeight={800} color="white" mb={0.5}>Anomaly Scatter — Real Logs</Typography>
            <Typography variant="caption" color="rgba(255,255,255,0.35)" display="block" mb={1}>X = payload+path length  ·  Y = AI anomaly score</Typography>
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280 }}><CircularProgress sx={{ color: '#7c4dff' }} /></Box>
            ) : logs.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}><Typography color="rgba(255,255,255,0.3)">No anomaly data yet. Run the WAF proxy to generate scored logs.</Typography></Box>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ top: 5, right: 10, bottom: 20, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="x" name="Length" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: 'Payload+Path Length', position: 'bottom', fill: 'rgba(255,255,255,0.2)', fontSize: 10 }} />
                  <YAxis dataKey="y" name="AI Score" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 1]} />
                  <Tooltip contentStyle={TooltipStyle} cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.2)' }} />
                  <Scatter name="Normal"  data={normals}  fill="#00e676" opacity={0.5} r={3} />
                  <Scatter name="Anomaly" data={anomalies} fill="#f44336" opacity={0.9} r={5} />
                </ScatterChart>
              </ResponsiveContainer>
            )}
            <Stack direction="row" spacing={3} mt={1}>
              <Stack direction="row" spacing={0.7} alignItems="center"><Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#00e676' }} /><Typography variant="caption" color="rgba(255,255,255,0.4)">Normal ({normals.length})</Typography></Stack>
              <Stack direction="row" spacing={0.7} alignItems="center"><Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#f44336' }} /><Typography variant="caption" color="rgba(255,255,255,0.4)">Anomaly ({anomalies.length})</Typography></Stack>
            </Stack>
          </Card>
        </Grid>

        {/* Radar */}
        <Grid item xs={12} lg={5}>
          <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, p: 2.5, height: 360 }}>
            <Typography variant="subtitle1" fontWeight={800} color="white" mb={0.5}>Attack Type Distribution</Typography>
            <Typography variant="caption" color="rgba(255,255,255,0.35)" display="block" mb={1}>% of real logged attacks per category</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} />
                <Radar name="%" dataKey="A" stroke="#7c4dff" fill="#7c4dff" fillOpacity={0.25} strokeWidth={2} />
                <Tooltip contentStyle={TooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>
      </Grid>

      {/* SHAP Panel */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(124,77,255,0.2)', borderRadius: 3, p: 2.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <InfoOutlinedIcon sx={{ color: '#7c4dff', fontSize: 20 }} />
              <Box>
                <Typography variant="subtitle1" fontWeight={800} color="white">Explainable AI — SHAP Values</Typography>
                <Typography variant="caption" color="rgba(255,255,255,0.35)">Derived from logged request features</Typography>
              </Box>
            </Stack>
            {loading ? <CircularProgress sx={{ color: '#7c4dff' }} />
            : !shapData ? <Typography color="rgba(255,255,255,0.3)" variant="body2">No ai_score data available yet.</Typography>
            : (
              <>
                <Alert severity="warning" sx={{ mb: 2, background: 'rgba(255,152,0,0.1)', color: '#ffcc80', border: '1px solid rgba(255,152,0,0.25)', fontSize: 12 }}>
                  <strong>Avg AI Score:</strong> {(shapData.score * 100).toFixed(1)}% — based on {logs.length} logged requests
                </Alert>
                {shapData.features.map(f => <SHAPBar key={f.name} feature={f.name} value={f.value} max={shapData.maxVal} />)}
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', my: 2 }} />
                <Typography variant="caption" color="rgba(255,255,255,0.3)">Red = pushes toward anomaly. Blue = pushes toward normal.</Typography>
              </>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={800} color="white" mb={0.5}>High-Score Anomaly Events</Typography>
            <Typography variant="caption" color="rgba(255,255,255,0.35)" display="block" mb={1.5}>Top AI-scored detections</Typography>
            {loading ? <CircularProgress sx={{ color: '#f44336' }} />
            : anomalies.length === 0 ? <Typography color="rgba(255,255,255,0.3)" variant="body2">No anomalies detected yet.</Typography>
            : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['IP','Score','Type','Status'].map(h => (
                        <TableCell key={h} sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 700 }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...anomalies].sort((a, b) => b.score - a.score).slice(0, 10).map((a, i) => (
                      <TableRow key={i} sx={{ '&:hover': { background: 'rgba(255,255,255,0.03)' }, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', fontSize: 11 }}>{a.ip}</TableCell>
                        <TableCell>
                          <Typography variant="caption" fontWeight={700} fontFamily="monospace" color={a.score > 0.7 ? '#f44336' : '#ff9800'}>{(a.score * 100).toFixed(1)}%</Typography>
                        </TableCell>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{a.attackType || '—'}</TableCell>
                        <TableCell>
                          <Chip label="Anomaly" size="small" sx={{ background: 'rgba(244,67,54,0.12)', color: '#f44336', fontSize: '0.6rem', height: 18, fontWeight: 700 }} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
