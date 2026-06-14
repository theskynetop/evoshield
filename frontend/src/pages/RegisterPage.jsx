import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, InputAdornment,
  IconButton, Alert, CircularProgress, Stack,
  Paper, keyframes, MenuItem,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import BadgeIcon from '@mui/icons-material/Badge';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import SecurityIcon from '@mui/icons-material/Security';
import { useAuth } from '../context/AuthContext';

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(0,188,212,0.4); }
  50%       { box-shadow: 0 0 0 16px rgba(0,188,212,0); }
`;

const ROLES = ['Admin', 'Analyst', 'Viewer'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '', role: 'Analyst' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await signUp(form.email, form.password, { full_name: form.fullName, role: form.role });
      setSuccess('Account created! Check your email for verification.');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      color: '#fff', background: 'rgba(255,255,255,0.04)', borderRadius: 2,
      '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
      '&:hover fieldset': { borderColor: 'rgba(0,188,212,0.4)' },
      '&.Mui-focused fieldset': { borderColor: '#00bcd4' },
    },
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#00bcd4' },
    '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.4)' },
  };

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1b2a 100%)', px: 2, py: 4,
    }}>
      <Box sx={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(0,188,212,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,188,212,0.03) 1px, transparent 1px)',
        backgroundSize: '50px 50px', pointerEvents: 'none',
      }} />

      <Paper elevation={0} sx={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: 460, p: { xs: 3, sm: 5 },
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(0,188,212,0.15)',
        borderRadius: 4, backdropFilter: 'blur(20px)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{
            width: 72, height: 72, borderRadius: '20px', mx: 'auto', mb: 2,
            background: 'linear-gradient(135deg,#00bcd4,#7c4dff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: `${pulse} 3s ease-in-out infinite`,
          }}>
            <SecurityIcon sx={{ fontSize: 36, color: '#fff' }} />
          </Box>
          <Typography variant="h5" fontWeight={900} sx={{
            background: 'linear-gradient(90deg,#00bcd4,#7c4dff)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Create Account
          </Typography>
          <Typography variant="body2" color="rgba(255,255,255,0.4)" mt={0.5}>
            Join the EVOSHIELD security platform
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3, background: 'rgba(211,47,47,0.15)', color: '#ef9a9a', border: '1px solid rgba(211,47,47,0.3)' }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 3, background: 'rgba(0,230,118,0.1)', color: '#b9f6ca', border: '1px solid rgba(0,230,118,0.3)' }}>{success}</Alert>}

        <form onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            <TextField
              label="Full Name" name="fullName" value={form.fullName}
              onChange={handleChange} required fullWidth
              InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }} /></InputAdornment> }}
              sx={fieldSx}
            />
            <TextField
              label="Email Address" name="email" type="email"
              value={form.email} onChange={handleChange} required fullWidth
              InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }} /></InputAdornment> }}
              sx={fieldSx}
            />
            <TextField
              select label="Role" name="role" value={form.role}
              onChange={handleChange} fullWidth
              InputProps={{ startAdornment: <InputAdornment position="start"><BadgeIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }} /></InputAdornment> }}
              sx={fieldSx}
              SelectProps={{ MenuProps: { PaperProps: { sx: { background: '#0d1b2a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' } } } }}
            >
              {ROLES.map(r => <MenuItem key={r} value={r} sx={{ color: '#fff', '&:hover': { background: 'rgba(0,188,212,0.1)' } }}>{r}</MenuItem>)}
            </TextField>
            <TextField
              label="Password" name="password" type={showPass ? 'text' : 'password'}
              value={form.password} onChange={handleChange} required fullWidth
              InputProps={{
                startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }} /></InputAdornment>,
                endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPass(p => !p)} size="small" sx={{ color: 'rgba(255,255,255,0.3)' }}>{showPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment>,
              }}
              sx={fieldSx}
            />
            <TextField
              label="Confirm Password" name="confirm" type="password"
              value={form.confirm} onChange={handleChange} required fullWidth
              InputProps={{ startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }} /></InputAdornment> }}
              sx={fieldSx}
            />

            <Button
              type="submit" variant="contained" fullWidth size="large"
              disabled={loading}
              sx={{
                mt: 1, py: 1.6, fontWeight: 900, fontSize: '1rem',
                background: 'linear-gradient(135deg,#00bcd4,#7c4dff)',
                color: '#fff', borderRadius: 2,
                boxShadow: '0 8px 24px rgba(0,188,212,0.3)',
                '&:hover': { boxShadow: '0 12px 32px rgba(0,188,212,0.5)', transform: 'translateY(-1px)' },
                '&:disabled': { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' },
                transition: 'all 0.3s',
              }}
            >
              {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Create Account'}
            </Button>
          </Stack>
        </form>

        <Typography variant="body2" textAlign="center" color="rgba(255,255,255,0.4)" mt={3}>
          Already have an account?{' '}
          <Typography component={Link} to="/login" variant="body2" sx={{ color: '#00bcd4', textDecoration: 'none', fontWeight: 700, '&:hover': { textDecoration: 'underline' } }}>
            Sign in
          </Typography>
        </Typography>
      </Paper>
    </Box>
  );
}
