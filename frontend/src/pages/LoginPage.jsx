import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, InputAdornment,
  IconButton, Alert, CircularProgress, Divider, Stack,
  Paper, alpha, keyframes,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import SecurityIcon from '@mui/icons-material/Security';
import { useAuth } from '../context/AuthContext';

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(0,230,118,0.4); }
  50%       { box-shadow: 0 0 0 16px rgba(0,230,118,0); }
`;

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      color: '#fff',
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 2,
      '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
      '&:hover fieldset': { borderColor: 'rgba(0,230,118,0.4)' },
      '&.Mui-focused fieldset': { borderColor: '#00e676' },
    },
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#00e676' },
  };

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1b2a 100%)',
      backgroundImage: `
        linear-gradient(135deg, #0a0e1a 0%, #0d1b2a 100%),
        radial-gradient(ellipse at 20% 80%, rgba(0,230,118,0.08) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 20%, rgba(0,188,212,0.06) 0%, transparent 50%)
      `,
      px: 2,
    }}>
      {/* Background grid */}
      <Box sx={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(0,230,118,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,230,118,0.03) 1px, transparent 1px)',
        backgroundSize: '50px 50px', pointerEvents: 'none',
      }} />

      <Paper elevation={0} sx={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 440, p: { xs: 3, sm: 5 },
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(0,230,118,0.15)',
        borderRadius: 4,
        backdropFilter: 'blur(20px)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{
            width: 72, height: 72, borderRadius: '20px', mx: 'auto', mb: 2,
            background: 'linear-gradient(135deg,#00e676,#00bcd4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: `${pulse} 3s ease-in-out infinite`,
          }}>
            <SecurityIcon sx={{ fontSize: 36, color: '#0a0e1a' }} />
          </Box>
          <Typography variant="h5" fontWeight={900} sx={{
            background: 'linear-gradient(90deg,#00e676,#00bcd4)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            EVOSHIELD CONSOLE
          </Typography>
          <Typography variant="body2" color="rgba(255,255,255,0.4)" mt={0.5}>
            Authenticate to access the security dashboard
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, background: 'rgba(211,47,47,0.15)', color: '#ef9a9a', border: '1px solid rgba(211,47,47,0.3)' }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            <TextField
              label="Email Address" name="email" type="email"
              value={form.email} onChange={handleChange} required fullWidth
              InputProps={{
                startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }} /></InputAdornment>,
              }}
              sx={fieldSx}
            />
            <TextField
              label="Password" name="password"
              type={showPass ? 'text' : 'password'}
              value={form.password} onChange={handleChange} required fullWidth
              InputProps={{
                startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }} /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPass(p => !p)} edge="end" size="small" sx={{ color: 'rgba(255,255,255,0.3)' }}>
                      {showPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={fieldSx}
            />

            <Button
              type="submit" variant="contained" fullWidth size="large"
              disabled={loading}
              sx={{
                mt: 1, py: 1.6, fontWeight: 900, fontSize: '1rem',
                background: 'linear-gradient(135deg,#00e676,#00bcd4)',
                color: '#0a0e1a', borderRadius: 2,
                boxShadow: '0 8px 24px rgba(0,230,118,0.3)',
                '&:hover': { boxShadow: '0 12px 32px rgba(0,230,118,0.5)', transform: 'translateY(-1px)' },
                '&:disabled': { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' },
                transition: 'all 0.3s',
              }}
            >
              {loading ? <CircularProgress size={22} sx={{ color: '#0a0e1a' }} /> : 'Access Dashboard'}
            </Button>
          </Stack>
        </form>

        <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.08)' }}>
          <Typography variant="caption" color="rgba(255,255,255,0.25)">OR</Typography>
        </Divider>

        <Typography variant="body2" textAlign="center" color="rgba(255,255,255,0.4)">
          No account?{' '}
          <Typography component={Link} to="/register" variant="body2" sx={{
            color: '#00e676', textDecoration: 'none', fontWeight: 700,
            '&:hover': { textDecoration: 'underline' },
          }}>
            Create one here
          </Typography>
        </Typography>

      </Paper>
    </Box>
  );
}
