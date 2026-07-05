import React, { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Stack, Grid, Button, Chip,
  ToggleButton, ToggleButtonGroup, Alert, CircularProgress, alpha, Divider,
  Collapse, TextField, MenuItem, IconButton,
} from '@mui/material';
import {
  FaDatabase, FaCode, FaTerminal, FaFolderOpen, FaTheaterMasks,
  FaFileCode, FaGlobe, FaHammer, FaBug, FaRocket, FaRandom,
  FaCheckCircle, FaChevronDown, FaBolt,
} from 'react-icons/fa';
import { wafApi } from '../services/api';

const SEV_COLOR = { Critical: '#f44336', High: '#ff9800', Medium: '#ffc107', Low: '#00bcd4' };

const ATTACK_ICON = {
  'SQL Injection':     FaDatabase,
  'XSS':               FaCode,
  'Command Injection': FaTerminal,
  'Path Traversal':    FaFolderOpen,
  'CSRF':              FaTheaterMasks,
  'XXE':               FaFileCode,
  'SSRF':              FaGlobe,
  'Brute Force':       FaHammer,
};

const menuProps = { PaperProps: { sx: { background: '#0d1b2a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', maxHeight: 320 } } };

export default function SimulatorPage() {
  const [types, setTypes]       = useState([]);
  const [count, setCount]       = useState(1);
  const [sending, setSending]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');
  const [history, setHistory]   = useState([]);
  const [expanded, setExpanded] = useState(null);      // which card is open
  const [choice, setChoice]     = useState({});        // per-type: {payload, path, custom}

  useEffect(() => {
    wafApi.getAttackTypes()
      .then(d => setTypes((d.types || []).filter(t => t.name !== 'Normal')))
      .catch(e => setError(e.message));
  }, []);

  const fire = async (attackType, opts = {}) => {
    setSending(true); setError(''); setResult(null);
    try {
      const body = { attack_type: attackType, count, notify: true };
      if (opts.payload) body.payload = opts.payload;
      if (opts.path)    body.path    = opts.path;
      const r = await wafApi.simulateAttack(body);
      setResult(r);
      setHistory(prev => [
        { type: attackType, inserted: r.inserted, notified: r.notified_users, payload: opts.payload, at: new Date() },
        ...prev,
      ].slice(0, 12));
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const setC = (name, patch) => setChoice(p => ({ ...p, [name]: { ...p[name], ...patch } }));

  const fieldSx = {
    '& .MuiOutlinedInput-root': { color: '#fff', background: 'rgba(0,0,0,0.25)', borderRadius: 1.5, fontSize: 13,
      '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' }, '&:hover fieldset': { borderColor: 'rgba(0,230,118,0.3)' },
      '&.Mui-focused fieldset': { borderColor: '#00e676' } },
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
    '& .MuiInputLabel-root.Mui-focused': { color: '#00e676' },
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
        <FaBug size={26} color="#f44336" />
        <Typography variant="h5" fontWeight={900} color="white">Attack Simulator</Typography>
        <Chip label="LIVE DEMO" size="small"
          sx={{ background: 'rgba(244,67,54,0.15)', color: '#f44336', fontWeight: 800, fontSize: '0.6rem', border: '1px solid rgba(244,67,54,0.3)' }} />
      </Stack>
      <Typography variant="body2" color="rgba(255,255,255,0.4)" mb={3}>
        Fire simulated attacks and watch them appear live in Attack Logs, Traffic Monitor & Notifications.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, background: 'rgba(244,67,54,0.1)', color: '#ef9a9a', border: '1px solid rgba(244,67,54,0.25)' }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {result && (
        <Alert icon={<FaCheckCircle />} severity="success"
          sx={{ mb: 2, background: 'rgba(0,230,118,0.1)', color: '#b9f6ca', border: '1px solid rgba(0,230,118,0.25)' }}
          onClose={() => setResult(null)}>
          Fired {result.inserted} × <strong>{result.attack_type}</strong> — {result.notified_users} notification{result.notified_users !== 1 ? 's' : ''} sent. Check the dashboard!
        </Alert>
      )}

      {/* Burst count selector */}
      <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, p: 2.5, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <Box>
            <Typography variant="body2" color="white" fontWeight={700}>How many per click?</Typography>
            <Typography variant="caption" color="rgba(255,255,255,0.4)">Custom payload works with a single request</Typography>
          </Box>
          <ToggleButtonGroup
            value={count} exclusive size="small"
            onChange={(_, v) => v && setCount(v)}
            sx={{ '& .MuiToggleButton-root': { color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.15)', px: 2, fontWeight: 700,
              '&.Mui-selected': { background: 'rgba(0,230,118,0.15)', color: '#00e676', '&:hover': { background: 'rgba(0,230,118,0.2)' } } } }}>
            {[1, 5, 10, 25].map(n => <ToggleButton key={n} value={n}>{n}</ToggleButton>)}
          </ToggleButtonGroup>
          <Button
            variant="contained" startIcon={sending ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <FaRandom />}
            disabled={sending} onClick={() => fire('Random')}
            sx={{ background: 'linear-gradient(135deg,#7c4dff,#00bcd4)', color: '#fff', fontWeight: 800, borderRadius: 2,
              '&:hover': { boxShadow: '0 8px 24px rgba(124,77,255,0.4)' } }}>
            Random Burst
          </Button>
        </Stack>
      </Card>

      {/* Attack type grid */}
      <Grid container spacing={2}>
        {types.map(t => {
          const Icon = ATTACK_ICON[t.name] || FaBug;
          const clr  = SEV_COLOR[t.severity] || '#f44336';
          const isOpen = expanded === t.name;
          const c = choice[t.name] || {};
          const usingCustom = c.payload === '__custom__';
          const effPayload = usingCustom ? (c.custom || '') : c.payload;

          return (
            <Grid item xs={12} sm={6} md={4} key={t.name}>
              <Card sx={{
                background: alpha(clr, 0.06),
                border: `1px solid ${alpha(clr, isOpen ? 0.5 : 0.25)}`,
                borderRadius: 3, overflow: 'hidden', transition: 'all 0.2s',
                '&:hover': { border: `1px solid ${alpha(clr, 0.5)}` },
              }}>
                {/* Card head — click to fire quickly */}
                <Box sx={{ p: 2.5, cursor: sending ? 'wait' : 'pointer' }}
                  onClick={() => !sending && fire(t.name)}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                    <Box sx={{ color: clr, display: 'flex' }}><Icon size={26} /></Box>
                    <Chip label={t.severity} size="small"
                      sx={{ background: alpha(clr, 0.15), color: clr, fontWeight: 700, fontSize: '0.6rem', height: 20 }} />
                  </Stack>
                  <Typography variant="subtitle1" fontWeight={800} color="white">{t.name}</Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center" mt={1} sx={{ color: clr }}>
                    <FaRocket size={12} />
                    <Typography variant="caption" fontWeight={700}>Click to fire ×{count}</Typography>
                  </Stack>
                </Box>

                {/* Expand toggle */}
                <Box
                  onClick={() => setExpanded(isOpen ? null : t.name)}
                  sx={{ px: 2.5, py: 0.8, cursor: 'pointer', borderTop: `1px solid ${alpha(clr, 0.15)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    '&:hover': { background: alpha(clr, 0.05) } }}>
                  <Typography variant="caption" color="rgba(255,255,255,0.5)" fontWeight={600}>
                    Choose / custom payload
                  </Typography>
                  <Box sx={{ color: 'rgba(255,255,255,0.5)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'flex' }}>
                    <FaChevronDown size={12} />
                  </Box>
                </Box>

                {/* Expanded panel */}
                <Collapse in={isOpen}>
                  <Box sx={{ p: 2.5, pt: 1.5, borderTop: `1px solid ${alpha(clr, 0.12)}`, background: 'rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
                    <Stack spacing={1.5}>
                      <TextField select size="small" fullWidth label="Payload" sx={fieldSx}
                        value={c.payload || ''} SelectProps={{ MenuProps: menuProps }}
                        onChange={e => setC(t.name, { payload: e.target.value })}>
                        {(t.payloads || []).map((p, i) => (
                          <MenuItem key={i} value={p} sx={{ fontSize: 12, fontFamily: 'monospace', whiteSpace: 'normal', wordBreak: 'break-all' }}>{p || '(empty)'}</MenuItem>
                        ))}
                        <MenuItem value="__custom__" sx={{ fontSize: 12, fontWeight: 700, color: '#00e676' }}>✎ Custom payload…</MenuItem>
                      </TextField>

                      {usingCustom && (
                        <TextField size="small" fullWidth label="Custom payload" sx={fieldSx}
                          placeholder="e.g. ' OR 1=1 --"
                          value={c.custom || ''} onChange={e => setC(t.name, { custom: e.target.value })} />
                      )}

                      <TextField select size="small" fullWidth label="Target path (optional)" sx={fieldSx}
                        value={c.path || ''} SelectProps={{ MenuProps: menuProps }}
                        onChange={e => setC(t.name, { path: e.target.value })}>
                        <MenuItem value="" sx={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>(random)</MenuItem>
                        {(t.paths || []).map((p, i) => (
                          <MenuItem key={i} value={p} sx={{ fontSize: 12, fontFamily: 'monospace' }}>{p}</MenuItem>
                        ))}
                      </TextField>

                      <Button
                        variant="contained" size="small" fullWidth disabled={sending || !effPayload}
                        startIcon={<FaBolt />}
                        onClick={() => fire(t.name, { payload: effPayload, path: c.path })}
                        sx={{ background: alpha(clr, 0.9), color: '#fff', fontWeight: 800, borderRadius: 1.5,
                          '&:hover': { background: clr }, '&.Mui-disabled': { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' } }}>
                        Fire this payload
                      </Button>
                    </Stack>
                  </Box>
                </Collapse>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Recent fires */}
      {history.length > 0 && (
        <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, p: 2.5, mt: 3 }}>
          <Typography variant="subtitle2" fontWeight={800} color="white" mb={1.5}>Recent Simulations</Typography>
          <Stack spacing={1} divider={<Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />}>
            {history.map((h, i) => {
              const Icon = ATTACK_ICON[h.type] || FaRandom;
              return (
                <Stack key={i} direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                    <Box sx={{ color: SEV_COLOR[types.find(t => t.name === h.type)?.severity] || '#7c4dff', display: 'flex' }}><Icon size={14} /></Box>
                    <Typography variant="body2" color="white" fontWeight={600}>{h.type}</Typography>
                    <Chip label={`×${h.inserted}`} size="small" sx={{ height: 18, fontSize: '0.6rem', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }} />
                    {h.payload && <Typography variant="caption" color="rgba(255,255,255,0.35)" fontFamily="monospace" noWrap sx={{ maxWidth: 260 }}>{h.payload}</Typography>}
                  </Stack>
                  <Typography variant="caption" color="rgba(255,255,255,0.3)">{h.at.toLocaleTimeString()}</Typography>
                </Stack>
              );
            })}
          </Stack>
        </Card>
      )}
    </Box>
  );
}
