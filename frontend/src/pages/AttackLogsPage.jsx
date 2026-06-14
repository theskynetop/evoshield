import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, Typography, Stack, Chip, Grid, TextField,
  MenuItem, Button, InputAdornment, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, alpha, Pagination, CircularProgress,
} from '@mui/material';
import SearchIcon    from '@mui/icons-material/Search';
import DownloadIcon  from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import BlockIcon      from '@mui/icons-material/Block';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import RefreshIcon    from '@mui/icons-material/Refresh';
import { supabase }   from '../services/supabase';
import { fetchAttackLogs } from '../services/supabaseQueries';

const ATTACK_TYPES = ['All','SQL Injection','XSS','Command Injection','Path Traversal','CSRF','XXE','SSRF'];
const SEVERITIES   = ['All','Critical','High','Medium','Low'];
const STATUSES     = ['All','Blocked','Healed','Allowed','Flagged'];
const severityColor = { Critical: '#f44336', High: '#ff9800', Medium: '#ffeb3b', Low: '#00e676' };
const PER_PAGE = 15;

function DetailRow({ log }) {
  return (
    <Box sx={{ p: 2.5, background: 'rgba(255,255,255,0.02)', borderRadius: 2, mt: 1 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="caption" color="rgba(255,255,255,0.35)" display="block" mb={0.5} textTransform="uppercase" letterSpacing={1}>Payload</Typography>
          <Box sx={{ p: 1.5, background: 'rgba(244,67,54,0.08)', borderRadius: 1.5, border: '1px solid rgba(244,67,54,0.15)', fontFamily: 'monospace', fontSize: 12, color: '#ef9a9a', wordBreak: 'break-all' }}>
            {log.payload || '—'}
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="caption" color="rgba(255,255,255,0.35)" display="block" mb={0.5} textTransform="uppercase" letterSpacing={1}>Request Details</Typography>
          <Box sx={{ p: 1.5, background: 'rgba(0,188,212,0.08)', borderRadius: 1.5, border: '1px solid rgba(0,188,212,0.15)', fontFamily: 'monospace', fontSize: 12, color: '#80deea' }}>
            Method: {log.method || '—'} | Code: {log.response_code || '—'} | Bytes: {log.bytes_in || '—'}
          </Box>
          <Stack direction="row" spacing={2} mt={1.5}>
            <Box>
              <Typography variant="caption" color="rgba(255,255,255,0.35)">AI Score</Typography>
              <Typography variant="body2" color="#7c4dff" fontWeight={700}>{log.ai_score ? `${(log.ai_score * 100).toFixed(0)}%` : '—'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="rgba(255,255,255,0.35)">Country</Typography>
              <Typography variant="body2" color="white" fontWeight={700}>{log.country || '—'}</Typography>
            </Box>
          </Stack>
          {log.user_agent && (
            <Typography variant="caption" color="rgba(255,255,255,0.3)" display="block" mt={1} sx={{ wordBreak: 'break-all' }}>{log.user_agent}</Typography>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

export default function AttackLogsPage() {
  const [logs,     setLogs]     = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [typeF,    setTypeF]    = useState('All');
  const [sevF,     setSevF]     = useState('All');
  const [statF,    setStatF]    = useState('All');
  const [expanded, setExpanded] = useState(null);
  const [page,     setPage]     = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items, total: t } = await fetchAttackLogs({
        page, limit: PER_PAGE,
        attackType: typeF, severity: sevF, status: statF, search,
      });
      setLogs(items);
      setTotal(t);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  }, [page, typeF, sevF, statF, search]);

  useEffect(() => { load(); }, [load]);

  // Realtime: new attack logs push
  useEffect(() => {
    const channel = supabase
      .channel('attack_logs_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attack_logs' }, () => {
        if (page === 1) load();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [page, load]);

  const exportCSV = () => {
    const headers = 'ID,Time,Type,IP,Path,Severity,Status,AI Score\n';
    const rows = logs.map(l => `${l.id},${l.timestamp},${l.attack_type},${l.source_ip},${l.path},${l.severity},${l.status},${l.ai_score}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'attack_logs.csv'; a.click();
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      color: '#fff', background: 'rgba(255,255,255,0.04)', borderRadius: 2,
      '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
      '&:hover fieldset': { borderColor: 'rgba(0,230,118,0.3)' },
      '&.Mui-focused fieldset': { borderColor: '#00e676' },
    },
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)' },
    '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.4)' },
  };
  const menuProps = { PaperProps: { sx: { background: '#0d1b2a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } } };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={900} color="white">Attack Logs</Typography>
          <Typography variant="body2" color="rgba(255,255,255,0.4)">{total} events logged</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} size="small"
            sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: '#00e676', color: '#00e676' } }}>
            Refresh
          </Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCSV} size="small"
            sx={{ borderColor: 'rgba(0,230,118,0.3)', color: '#00e676', '&:hover': { borderColor: '#00e676', background: 'rgba(0,230,118,0.08)' }, fontWeight: 700 }}>
            Export CSV
          </Button>
        </Stack>
      </Stack>

      {/* Filters */}
      <Card sx={{ p: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, mb: 2.5 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField fullWidth size="small" placeholder="Search IP, path, type…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }} /></InputAdornment> }}
              sx={fieldSx} />
          </Grid>
          <Grid item xs={12} sm={4} md={2.5}>
            <TextField select fullWidth size="small" label="Attack Type" value={typeF}
              onChange={e => { setTypeF(e.target.value); setPage(1); }} sx={fieldSx} SelectProps={{ MenuProps: menuProps }}>
              {ATTACK_TYPES.map(t => <MenuItem key={t} value={t} sx={{ fontSize: 13 }}>{t}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <TextField select fullWidth size="small" label="Severity" value={sevF}
              onChange={e => { setSevF(e.target.value); setPage(1); }} sx={fieldSx} SelectProps={{ MenuProps: menuProps }}>
              {SEVERITIES.map(s => <MenuItem key={s} value={s} sx={{ fontSize: 13 }}>{s}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <TextField select fullWidth size="small" label="Status" value={statF}
              onChange={e => { setStatF(e.target.value); setPage(1); }} sx={fieldSx} SelectProps={{ MenuProps: menuProps }}>
              {STATUSES.map(s => <MenuItem key={s} value={s} sx={{ fontSize: 13 }}>{s}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={1.5}>
            <Button fullWidth variant="outlined" size="small"
              onClick={() => { setSearch(''); setTypeF('All'); setSevF('All'); setStatF('All'); setPage(1); }}
              sx={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)' }}>
              Reset
            </Button>
          </Grid>
        </Grid>
      </Card>

      <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, p: 2.5 }}>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress sx={{ color: '#00e676' }} /></Box>
        ) : logs.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="rgba(255,255,255,0.3)">No attack logs found. Run the WAF proxy to start logging traffic.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['','Time','Type','Source IP','Path','Severity','Status','AI Score'].map(h => (
                    <TableCell key={h} sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 700 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map(log => (
                  <React.Fragment key={log.id}>
                    <TableRow
                      sx={{ cursor: 'pointer', background: expanded === log.id ? 'rgba(0,230,118,0.04)' : 'transparent', '&:hover': { background: 'rgba(255,255,255,0.03)' }, borderBottom: expanded === log.id ? 'none' : '1px solid rgba(255,255,255,0.04)' }}
                      onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                      <TableCell sx={{ width: 32, pr: 0 }}>
                        <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.3)' }}>
                          {expanded === log.id ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                        </IconButton>
                      </TableCell>
                      <TableCell sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'monospace' }}>{new Date(log.timestamp).toLocaleString()}</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: 12 }}>{log.attack_type || '—'}</TableCell>
                      <TableCell sx={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', fontSize: 11 }}>{log.source_ip}</TableCell>
                      <TableCell sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.path}</TableCell>
                      <TableCell>
                        <Chip label={log.severity || '—'} size="small" sx={{ background: alpha(severityColor[log.severity] || '#607d8b', 0.15), color: severityColor[log.severity] || '#607d8b', border: `1px solid ${alpha(severityColor[log.severity] || '#607d8b', 0.3)}`, fontWeight: 700, fontSize: '0.6rem', height: 20 }} />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          {log.status === 'Blocked' ? <BlockIcon sx={{ fontSize: 14, color: '#f44336' }} /> : <AutoFixHighIcon sx={{ fontSize: 14, color: '#00e676' }} />}
                          <Typography variant="caption" fontWeight={700} color={log.status === 'Blocked' ? '#f44336' : log.status === 'Healed' ? '#00e676' : 'rgba(255,255,255,0.5)'}>{log.status}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" fontWeight={700} fontFamily="monospace"
                          color={log.ai_score > 0.8 ? '#f44336' : log.ai_score > 0.5 ? '#ff9800' : '#00e676'}>
                          {log.ai_score != null ? `${(log.ai_score * 100).toFixed(0)}%` : '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    {expanded === log.id && (
                      <TableRow sx={{ background: 'rgba(0,0,0,0.2)' }}>
                        <TableCell colSpan={8} sx={{ border: 'none', pb: 2 }}>
                          <DetailRow log={log} />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {total > PER_PAGE && (
          <Stack alignItems="center" mt={2}>
            <Pagination count={Math.ceil(total / PER_PAGE)} page={page} onChange={(_, v) => setPage(v)}
              sx={{ '& .MuiPaginationItem-root': { color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.1)' }, '& .Mui-selected': { background: 'rgba(0,230,118,0.15) !important', color: '#00e676', borderColor: 'rgba(0,230,118,0.3) !important' } }}
              variant="outlined" shape="rounded" size="small" />
          </Stack>
        )}
      </Card>
    </Box>
  );
}
