import React, { useState } from 'react';
import {
  Box, Card, Typography, Stack, Grid, Button, TextField,
  Switch, FormControlLabel, Divider, Alert, Slider,
  MenuItem, Chip, alpha,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SecurityIcon from '@mui/icons-material/Security';
import NotificationsIcon from '@mui/icons-material/Notifications';
import StorageIcon from '@mui/icons-material/Storage';
import PaletteIcon from '@mui/icons-material/Palette';
import { useThemeMode } from '../context/ThemeContext';

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
const switchSx = {
  '& .MuiSwitch-switchBase.Mui-checked': { color: '#00e676' },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#00e676' },
};
const menuProps = { PaperProps: { sx: { background: '#0d1b2a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } } };

function Section({ icon, title, children }) {
  return (
    <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, p: 3, mb: 2.5 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2.5}>
        <Box sx={{ color: '#00e676' }}>{icon}</Box>
        <Typography variant="subtitle1" fontWeight={800} color="white">{title}</Typography>
      </Stack>
      {children}
    </Card>
  );
}

export default function SettingsPage() {
  const { mode, toggleMode } = useThemeMode();
  const [saved, setSaved] = useState('');
  const [cfg, setCfg] = useState({
    wafMode: 'Blocking',
    threshold: 75,
    maxRps: 1000,
    logRetention: '90',
    emailAlerts: true,
    slackAlerts: false,
    autoHeal: true,
    federatedLearning: true,
    edgeDeploy: false,
    twoFA: false,
    apiKey: 'sk-waf-••••••••••••••••••••••',
    supabaseUrl: 'https://xxxxxxxxxxx.supabase.co',
    backendUrl: 'http://localhost:8000',
  });

  const update = (key, val) => setCfg(p => ({ ...p, [key]: val }));

  const save = () => {
    setSaved('Settings saved successfully');
    setTimeout(() => setSaved(''), 3500);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <SettingsIcon sx={{ color: '#00e676', fontSize: 28 }} />
            <Typography variant="h5" fontWeight={900} color="white">Settings</Typography>
          </Stack>
          <Typography variant="body2" color="rgba(255,255,255,0.4)">Configure WAF behavior, integrations, and preferences</Typography>
        </Box>
        <Button variant="contained" onClick={save}
          sx={{ background: 'linear-gradient(135deg,#00e676,#00bcd4)', color: '#0a0e1a', fontWeight: 900, borderRadius: 2,
            boxShadow: '0 8px 24px rgba(0,230,118,0.3)', '&:hover': { boxShadow: '0 12px 32px rgba(0,230,118,0.5)' } }}>
          Save Changes
        </Button>
      </Stack>

      {saved && <Alert severity="success" sx={{ mb: 2.5, background: 'rgba(0,230,118,0.1)', color: '#b9f6ca', border: '1px solid rgba(0,230,118,0.25)' }} onClose={() => setSaved('')}>{saved}</Alert>}

      <Grid container spacing={0}>
        <Grid item xs={12} lg={7}>
          {/* WAF Engine */}
          <Section icon={<SecurityIcon />} title="WAF Engine Configuration">
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="WAF Mode" value={cfg.wafMode} onChange={e => update('wafMode', e.target.value)} sx={fieldSx} SelectProps={{ MenuProps: menuProps }}>
                  {['Blocking','Detection Only','Learning','Bypass'].map(m => (
                    <MenuItem key={m} value={m} sx={{ fontSize: 13, '&:hover': { background: 'rgba(0,230,118,0.08)' } }}>{m}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Max Requests/sec" type="number" value={cfg.maxRps} onChange={e => update('maxRps', e.target.value)} sx={fieldSx} />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="rgba(255,255,255,0.55)" mb={1}>
                  Anomaly Detection Threshold: <strong style={{ color: '#00e676' }}>{cfg.threshold}%</strong>
                </Typography>
                <Slider value={cfg.threshold} onChange={(_, v) => update('threshold', v)}
                  min={50} max={99} step={1}
                  sx={{ color: '#00e676', '& .MuiSlider-thumb': { bgcolor: '#00e676' }, '& .MuiSlider-rail': { bgcolor: 'rgba(255,255,255,0.1)' } }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="rgba(255,255,255,0.3)">More sensitive (50%)</Typography>
                  <Typography variant="caption" color="rgba(255,255,255,0.3)">More precise (99%)</Typography>
                </Stack>
              </Grid>
            </Grid>
          </Section>

          {/* Notifications */}
          <Section icon={<NotificationsIcon />} title="Notifications">
            <Stack spacing={2}>
              <FormControlLabel control={<Switch checked={cfg.emailAlerts} onChange={e => update('emailAlerts', e.target.checked)} sx={switchSx} />}
                label={<Box><Typography variant="body2" color="white" fontWeight={600}>Email Alerts</Typography><Typography variant="caption" color="rgba(255,255,255,0.4)">Receive critical attack notifications via email</Typography></Box>} />
              <FormControlLabel control={<Switch checked={cfg.slackAlerts} onChange={e => update('slackAlerts', e.target.checked)} sx={switchSx} />}
                label={<Box><Typography variant="body2" color="white" fontWeight={600}>Slack Notifications</Typography><Typography variant="caption" color="rgba(255,255,255,0.4)">Push alerts to Slack channel</Typography></Box>} />
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)' }} />
              <TextField fullWidth label="Log Retention (days)" type="number" value={cfg.logRetention} onChange={e => update('logRetention', e.target.value)} sx={fieldSx} />
            </Stack>
          </Section>
        </Grid>

        <Grid item xs={12} lg={5} sx={{ pl: { lg: 2.5 } }}>
          {/* AI/ML Features */}
          <Section icon={<SecurityIcon />} title="AI / ML Features">
            <Stack spacing={2}>
              <FormControlLabel control={<Switch checked={cfg.autoHeal} onChange={e => update('autoHeal', e.target.checked)} sx={switchSx} />}
                label={<Box><Typography variant="body2" color="white" fontWeight={600}>Self-Healing Engine</Typography><Typography variant="caption" color="rgba(255,255,255,0.4)">Auto-generate rules on attack bypass</Typography></Box>} />
              <FormControlLabel control={<Switch checked={cfg.federatedLearning} onChange={e => update('federatedLearning', e.target.checked)} sx={switchSx} />}
                label={<Box><Typography variant="body2" color="white" fontWeight={600}>Federated Learning</Typography><Typography variant="caption" color="rgba(255,255,255,0.4)">Collaborative model training (privacy-preserving)</Typography></Box>} />
              <FormControlLabel control={<Switch checked={cfg.edgeDeploy} onChange={e => update('edgeDeploy', e.target.checked)} sx={switchSx} />}
                label={<Box><Typography variant="body2" color="white" fontWeight={600}>Edge Deployment Mode</Typography><Typography variant="caption" color="rgba(255,255,255,0.4)">Optimized for low-resource devices (&lt;15ms)</Typography></Box>} />
            </Stack>
          </Section>

          {/* Integrations */}
          <Section icon={<StorageIcon />} title="Integrations & API">
            <Stack spacing={2.5}>
              <TextField fullWidth label="Backend API URL" value={cfg.backendUrl} onChange={e => update('backendUrl', e.target.value)} sx={fieldSx} />
              <TextField fullWidth label="Supabase URL" value={cfg.supabaseUrl} onChange={e => update('supabaseUrl', e.target.value)} sx={fieldSx} />
              <TextField fullWidth label="API Key" value={cfg.apiKey} onChange={e => update('apiKey', e.target.value)} sx={fieldSx} type="password" />
            </Stack>
          </Section>

          {/* Appearance */}
          <Section icon={<PaletteIcon />} title="Appearance">
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="body2" color="white" fontWeight={600}>Dark Mode</Typography>
                <Typography variant="caption" color="rgba(255,255,255,0.4)">Toggle dark/light interface</Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={mode === 'dark' ? 'Dark' : 'Light'} size="small"
                  sx={{ background: mode === 'dark' ? 'rgba(124,77,255,0.15)' : 'rgba(255,235,59,0.15)',
                    color: mode === 'dark' ? '#b39ddb' : '#f9a825', fontWeight: 700 }} />
                <Switch checked={mode === 'dark'} onChange={toggleMode} sx={switchSx} />
              </Stack>
            </Stack>
          </Section>

          {/* Security */}
          <Section icon={<SecurityIcon />} title="Account Security">
            <FormControlLabel control={<Switch checked={cfg.twoFA} onChange={e => update('twoFA', e.target.checked)} sx={switchSx} />}
              label={<Box><Typography variant="body2" color="white" fontWeight={600}>Two-Factor Authentication</Typography><Typography variant="caption" color="rgba(255,255,255,0.4)">Add extra login security via TOTP</Typography></Box>} />
          </Section>
        </Grid>
      </Grid>
    </Box>
  );
}
