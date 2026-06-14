import React, { useState, useEffect } from 'react';
import {
  Box, Card, Typography, Stack, Chip, Button, Grid,
  TextField, MenuItem, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Switch, FormControlLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  InputAdornment, Alert, Tooltip, alpha, CircularProgress,
} from '@mui/material';
import AddIcon         from '@mui/icons-material/Add';
import EditIcon        from '@mui/icons-material/Edit';
import DeleteIcon      from '@mui/icons-material/Delete';
import SearchIcon      from '@mui/icons-material/Search';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ShieldIcon      from '@mui/icons-material/Shield';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import RefreshIcon     from '@mui/icons-material/Refresh';
import { fetchRules, createRule, updateRule, deleteRule } from '../services/supabaseQueries';

const TYPES      = ['SQL Injection','XSS','Command Injection','Path Traversal','CSRF','XXE','Custom'];
const ACTIONS    = ['Block','Allow','Log','Rate Limit','Redirect'];
const SEVERITIES = ['Critical','High','Medium','Low'];
const EMPTY_RULE = { name: '', attack_type: 'SQL Injection', pattern: '', action: 'Block', severity: 'High', enabled: true, description: '' };

const sevColor = { Critical: '#f44336', High: '#ff9800', Medium: '#ffeb3b', Low: '#00e676' };
const actColor = { Block: '#f44336', Allow: '#00e676', Log: '#00bcd4', 'Rate Limit': '#ff9800', Redirect: '#7c4dff' };

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
const menuProps   = { PaperProps: { sx: { background: '#0d1b2a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } } };
const menuItemSx  = { fontSize: 13, '&:hover': { background: 'rgba(0,230,118,0.08)' } };

export default function RuleManagementPage() {
  const [rules,    setRules]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [typeF,    setTypeF]    = useState('All');
  const [dialog,   setDialog]   = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(EMPTY_RULE);
  const [delConfirm, setDel]    = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [copied,   setCopied]   = useState(null);
  const [snack,    setSnack]    = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchRules();
      setRules(data);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = rules.filter(r => {
    if (typeF !== 'All' && r.attack_type !== typeF) return false;
    if (search && !JSON.stringify(r).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openAdd  = ()  => { setForm(EMPTY_RULE); setEditing(null); setDialog(true); };
  const openEdit = (r) => { setForm({ name: r.name, attack_type: r.attack_type, pattern: r.pattern, action: r.action, severity: r.severity, enabled: r.enabled, description: r.description || '' }); setEditing(r.id); setDialog(true); };
  const handleClose = () => { setDialog(false); setForm(EMPTY_RULE); setEditing(null); };

  const handleSave = async () => {
    if (!form.name || !form.pattern) { setSnack('Name and pattern are required'); return; }
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateRule(editing, form);
        setRules(prev => prev.map(r => r.id === editing ? updated : r));
        setSnack('Rule updated successfully');
      } else {
        const created = await createRule(form);
        setRules(prev => [created, ...prev]);
        setSnack('Rule created successfully');
      }
      handleClose();
    } catch (e) {
      setSnack(`Error: ${e.message}`);
    } finally {
      setSaving(false);
      setTimeout(() => setSnack(''), 3500);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteRule(id);
      setRules(prev => prev.filter(r => r.id !== id));
      setSnack('Rule deleted successfully');
    } catch (e) {
      setSnack(`Error: ${e.message}`);
    } finally {
      setDel(null);
      setTimeout(() => setSnack(''), 3000);
    }
  };

  const toggleRule = async (r) => {
    try {
      const updated = await updateRule(r.id, { enabled: !r.enabled });
      setRules(prev => prev.map(x => x.id === r.id ? updated : x));
    } catch (_) {}
  };

  const copyPattern = (pattern, id) => {
    navigator.clipboard?.writeText(pattern);
    setCopied(id); setTimeout(() => setCopied(null), 1800);
  };

  const enabled = rules.filter(r => r.enabled).length;
  const autoGen = rules.filter(r => r.auto_generated).length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={900} color="white">Rule Management</Typography>
          <Typography variant="body2" color="rgba(255,255,255,0.4)">Manage detection rules — add, edit, enable or disable</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} size="small"
            sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: '#00e676', color: '#00e676' } }}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}
            sx={{ background: 'linear-gradient(135deg,#00e676,#00bcd4)', color: '#0a0e1a', fontWeight: 900, borderRadius: 2, boxShadow: '0 8px 24px rgba(0,230,118,0.3)' }}>
            Add Rule
          </Button>
        </Stack>
      </Stack>

      {snack && <Alert severity={snack.startsWith('Error') ? 'error' : 'success'} sx={{ mb: 2, background: snack.startsWith('Error') ? 'rgba(211,47,47,0.15)' : 'rgba(0,230,118,0.1)', color: snack.startsWith('Error') ? '#ef9a9a' : '#b9f6ca', border: `1px solid ${snack.startsWith('Error') ? 'rgba(211,47,47,0.3)' : 'rgba(0,230,118,0.25)'}` }} onClose={() => setSnack('')}>{snack}</Alert>}

      <Grid container spacing={2} mb={2.5}>
        {[
          { label: 'Total Rules',    value: rules.length,  color: '#00bcd4' },
          { label: 'Active',         value: enabled,        color: '#00e676' },
          { label: 'AI-Generated',   value: autoGen,        color: '#7c4dff' },
          { label: 'Disabled',       value: rules.length - enabled, color: '#607d8b' },
        ].map(s => (
          <Grid item xs={6} sm={3} key={s.label}>
            <Card sx={{ p: 2, background: alpha(s.color, 0.07), border: `1px solid ${alpha(s.color, 0.2)}`, borderRadius: 3, textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={900} color={s.color}>{loading ? '…' : s.value}</Typography>
              <Typography variant="caption" color="rgba(255,255,255,0.4)" textTransform="uppercase" letterSpacing={1}>{s.label}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ p: 2, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, mb: 2.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField size="small" placeholder="Search rules…" value={search} onChange={e => setSearch(e.target.value)}
            sx={{ ...fieldSx, flex: 1 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }} /></InputAdornment> }} />
          <TextField select size="small" label="Type" value={typeF} onChange={e => setTypeF(e.target.value)}
            sx={{ ...fieldSx, minWidth: 180 }} SelectProps={{ MenuProps: menuProps }}>
            {['All', ...TYPES].map(t => <MenuItem key={t} value={t} sx={menuItemSx}>{t}</MenuItem>)}
          </TextField>
          <Button size="small" onClick={() => { setSearch(''); setTypeF('All'); }}
            sx={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)', '&:hover': { borderColor: 'rgba(255,255,255,0.3)' } }}>
            Reset
          </Button>
        </Stack>
      </Card>

      <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, p: 2.5 }}>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress sx={{ color: '#00e676' }} /></Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="rgba(255,255,255,0.3)">No rules found. Click "Add Rule" to create your first detection rule.</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 520 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {['Enabled','Name','Type','Pattern','Action','Severity','Hits','AI','Created','Actions'].map(h => (
                    <TableCell key={h} sx={{ background: 'rgba(13,27,42,0.95)', color: 'rgba(255,255,255,0.35)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 700 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id} sx={{ opacity: r.enabled ? 1 : 0.45, '&:hover': { background: 'rgba(255,255,255,0.03)' }, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <TableCell>
                      <Switch size="small" checked={r.enabled} onChange={() => toggleRule(r)}
                        sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#00e676' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#00e676' } }} />
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: 12, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</TableCell>
                    <TableCell>
                      <Chip label={r.attack_type} size="small" sx={{ background: 'rgba(0,188,212,0.12)', color: '#00bcd4', fontSize: '0.6rem', height: 20, fontWeight: 700 }} />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 160 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="caption" fontFamily="monospace" color="rgba(255,255,255,0.55)"
                          sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                          {r.pattern}
                        </Typography>
                        <Tooltip title={copied === r.id ? 'Copied!' : 'Copy'}>
                          <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.25)', p: 0.3 }} onClick={() => copyPattern(r.pattern, r.id)}>
                            <ContentCopyIcon sx={{ fontSize: 12 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip label={r.action} size="small" sx={{ background: alpha(actColor[r.action] || '#607d8b', 0.15), color: actColor[r.action] || '#607d8b', fontSize: '0.6rem', height: 20, fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      <Chip label={r.severity} size="small" sx={{ background: alpha(sevColor[r.severity] || '#607d8b', 0.15), color: sevColor[r.severity] || '#607d8b', fontSize: '0.6rem', height: 20, fontWeight: 700 }} />
                    </TableCell>
                    <TableCell sx={{ color: '#00bcd4', fontWeight: 700, fontFamily: 'monospace', fontSize: 12 }}>{r.hits?.toLocaleString() || 0}</TableCell>
                    <TableCell>
                      {r.auto_generated && <Chip label="AI" size="small" sx={{ background: 'rgba(124,77,255,0.15)', color: '#7c4dff', fontSize: '0.6rem', height: 18, fontWeight: 700 }} />}
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.3}>
                        <Tooltip title="Edit">
                          <IconButton size="small" sx={{ color: '#00bcd4', '&:hover': { background: 'rgba(0,188,212,0.1)' } }} onClick={() => openEdit(r)}>
                            <EditIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" sx={{ color: '#f44336', '&:hover': { background: 'rgba(244,67,54,0.1)' } }} onClick={() => setDel(r.id)}>
                            <DeleteIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialog} onClose={handleClose} maxWidth="sm" fullWidth
        PaperProps={{ sx: { background: '#0d1b2a', border: '1px solid rgba(0,230,118,0.2)', borderRadius: 3 } }}>
        <DialogTitle sx={{ color: 'white', fontWeight: 800, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {editing ? 'Edit Rule' : 'Add New Rule'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Stack spacing={2.5} mt={1}>
            <TextField label="Rule Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} fullWidth sx={fieldSx} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField select label="Attack Type" value={form.attack_type} onChange={e => setForm(p => ({ ...p, attack_type: e.target.value }))} fullWidth sx={fieldSx} SelectProps={{ MenuProps: menuProps }}>
                  {TYPES.map(t => <MenuItem key={t} value={t} sx={menuItemSx}>{t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select label="Action" value={form.action} onChange={e => setForm(p => ({ ...p, action: e.target.value }))} fullWidth sx={fieldSx} SelectProps={{ MenuProps: menuProps }}>
                  {ACTIONS.map(a => <MenuItem key={a} value={a} sx={menuItemSx}>{a}</MenuItem>)}
                </TextField>
              </Grid>
            </Grid>
            <TextField label="Regex Pattern" value={form.pattern} onChange={e => setForm(p => ({ ...p, pattern: e.target.value }))} fullWidth multiline rows={2} sx={fieldSx} placeholder="e.g. (?i)(union\s+select|drop\s+table)" />
            <TextField select label="Severity" value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))} fullWidth sx={fieldSx} SelectProps={{ MenuProps: menuProps }}>
              {SEVERITIES.map(s => <MenuItem key={s} value={s} sx={menuItemSx}>{s}</MenuItem>)}
            </TextField>
            <TextField label="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} fullWidth multiline rows={2} sx={fieldSx} />
            <FormControlLabel control={<Switch checked={form.enabled} onChange={e => setForm(p => ({ ...p, enabled: e.target.checked }))} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#00e676' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#00e676' } }} />}
              label={<Typography variant="body2" color="rgba(255,255,255,0.7)">Enabled</Typography>} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <Button onClick={handleClose} sx={{ color: 'rgba(255,255,255,0.4)' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}
            sx={{ background: 'linear-gradient(135deg,#00e676,#00bcd4)', color: '#0a0e1a', fontWeight: 800 }}>
            {saving ? <CircularProgress size={18} sx={{ color: '#0a0e1a' }} /> : editing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!delConfirm} onClose={() => setDel(null)} maxWidth="xs"
        PaperProps={{ sx: { background: '#0d1b2a', border: '1px solid rgba(244,67,54,0.3)', borderRadius: 3 } }}>
        <DialogTitle sx={{ color: '#f44336', fontWeight: 800 }}>Delete Rule?</DialogTitle>
        <DialogContent><Typography variant="body2" color="rgba(255,255,255,0.6)">This action is permanent and cannot be undone.</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDel(null)} sx={{ color: 'rgba(255,255,255,0.4)' }}>Cancel</Button>
          <Button variant="contained" onClick={() => handleDelete(delConfirm)}
            sx={{ background: '#f44336', '&:hover': { background: '#d32f2f' }, fontWeight: 800 }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
