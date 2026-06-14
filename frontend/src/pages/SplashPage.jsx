import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Chip, Divider, Stack, keyframes,
} from '@mui/material';
import SecurityIcon     from '@mui/icons-material/Security';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoFixHighIcon  from '@mui/icons-material/AutoFixHigh';
import PsychologyIcon   from '@mui/icons-material/Psychology';
import ShieldIcon       from '@mui/icons-material/Shield';

const pulse = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(0,230,118,0.5); }
  70%  { box-shadow: 0 0 0 20px rgba(0,230,118,0); }
  100% { box-shadow: 0 0 0 0 rgba(0,230,118,0); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-12px); }
`;

const scanline = keyframes`
  0%   { top: -10%; }
  100% { top: 110%; }
`;

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(30px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

export default function SplashPage() {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <Box sx={{
      minHeight: '100vh',
      background: '#080c18',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Grid background */}
      <Box sx={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(0,230,118,0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,230,118,0.035) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        pointerEvents: 'none',
      }} />

      {/* Scanline */}
      <Box sx={{
        position: 'fixed', left: 0, right: 0, height: '2px', zIndex: 0,
        background: 'linear-gradient(90deg,transparent,rgba(0,230,118,0.25),transparent)',
        animation: `${scanline} 8s linear infinite`,
        pointerEvents: 'none',
      }} />

      {/* Top radial glow */}
      <Box sx={{
        position: 'fixed', top: '-30%', left: '50%', transform: 'translateX(-50%)',
        width: '1000px', height: '1000px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,230,118,0.07) 0%, transparent 65%)',
        zIndex: 0, pointerEvents: 'none',
      }} />

      {/* Bottom-left accent glow */}
      <Box sx={{
        position: 'fixed', bottom: '-20%', left: '-10%',
        width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,77,255,0.06) 0%, transparent 65%)',
        zIndex: 0, pointerEvents: 'none',
      }} />

      <Box sx={{ position: 'relative', zIndex: 1 }}>

        {/* ── TOP NAV ── */}
        <Box sx={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          px: { xs: 2, md: 6 }, py: 2,
          borderBottom: '1px solid rgba(0,230,118,0.08)',
          backdropFilter: 'blur(20px)',
          background: 'rgba(8,12,24,0.8)',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{
              width: 34, height: 34, borderRadius: '8px',
              background: 'linear-gradient(135deg,#00e676,#00bcd4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: `${pulse} 2.5s ease-in-out infinite`,
            }}>
              <SecurityIcon sx={{ fontSize: 18, color: '#080c18' }} />
            </Box>
            <Typography variant="h6" fontWeight={900} sx={{
              background: 'linear-gradient(90deg,#00e676,#00bcd4)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              letterSpacing: 2, fontSize: '1rem',
            }}>EVOSHIELD</Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center"
            sx={{ display: { xs: 'none', sm: 'flex' } }}>
            <Box sx={{
              width: 7, height: 7, borderRadius: '50%', bgcolor: '#00e676',
              animation: `${pulse} 2s ease-in-out infinite`,
            }} />
            <Typography variant="caption" color="#00e676" fontFamily="monospace" fontSize="0.7rem">
              SYSTEM LIVE — {time.toLocaleTimeString()}
            </Typography>
          </Stack>

          <Button variant="outlined" size="small" onClick={() => navigate('/login')}
            endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
            sx={{
              borderColor: 'rgba(0,230,118,0.4)', color: '#00e676',
              '&:hover': { background: 'rgba(0,230,118,0.1)', borderColor: '#00e676' },
              fontWeight: 700, borderRadius: 2, fontSize: '0.75rem',
            }}>
            Launch Console
          </Button>
        </Box>

        {/* ── HERO ── */}
        <Box sx={{
          minHeight: 'calc(100vh - 57px)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', px: { xs: 2, md: 4 },
          py: 6,
        }}>

          {/* College block */}
          <Box sx={{
            animation: `${fadeUp} 0.7s ease both`,
            mb: 4,
          }}>
            {/* Logo */}
            <Box sx={{
              width: 110, height: 110, borderRadius: '50%', mx: 'auto', mb: 2.5,
              border: '2px solid rgba(0,230,118,0.2)',
              boxShadow: '0 0 40px rgba(0,230,118,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: `${float} 5s ease-in-out infinite`,
              overflow: 'hidden',
              background: 'rgba(0,230,118,0.03)',
            }}>
              <img
                src="/college-logo.png"
                alt="Pillai HOC College of Engineering and Technology"
                style={{ width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'screen' }}
              />
            </Box>

            <Typography fontSize="0.65rem" letterSpacing={4} textTransform="uppercase"
              color="rgba(255,255,255,0.35)" mb={0.5}>
              Mahatma Education Society's
            </Typography>
            <Typography fontWeight={700} color="rgba(255,255,255,0.75)" fontSize="0.95rem" letterSpacing={0.5} mb={0.5}>
              Pillai HOC College of Engineering and Technology
            </Typography>
            <Typography fontSize="0.65rem" letterSpacing={3} textTransform="uppercase"
              color="rgba(255,255,255,0.28)">
              Department of Master of Computer Applications · 2024–25
            </Typography>
          </Box>

          {/* Badge */}
          <Box sx={{ animation: `${fadeUp} 0.7s 0.1s ease both`, opacity: 0, mb: 3 }}>
            <Chip
              label="FINAL YEAR PROJECT — MASTER OF COMPUTER APPLICATIONS"
              size="small"
              icon={<ShieldIcon sx={{ fontSize: '14px !important', color: '#00e676 !important' }} />}
              sx={{
                background: 'rgba(0,230,118,0.08)',
                border: '1px solid rgba(0,230,118,0.25)',
                color: '#00e676', letterSpacing: 1.5, fontSize: '0.6rem', fontWeight: 700,
                px: 1,
              }}
            />
          </Box>

          {/* Main title */}
          <Box sx={{ animation: `${fadeUp} 0.7s 0.2s ease both`, opacity: 0 }}>
            <Typography variant="h1" fontWeight={900} sx={{
              fontSize: { xs: '3rem', sm: '4.5rem', md: '6.5rem' },
              lineHeight: 1,
              background: 'linear-gradient(135deg, #00e676 0%, #00bcd4 45%, #7c4dff 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              animation: `${shimmer} 4s linear infinite`,
              letterSpacing: { xs: 2, md: 6 },
              mb: 1.5,
            }}>
              EVOSHIELD
            </Typography>

            <Typography fontWeight={500} letterSpacing={3} textTransform="uppercase"
              color="rgba(255,255,255,0.45)" fontSize={{ xs: '0.75rem', md: '0.9rem' }} mb={5}>
              Self-Healing Web Application Firewall
            </Typography>
          </Box>

          {/* Pill stats row */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            justifyContent="center"
            mb={5}
            sx={{ animation: `${fadeUp} 0.7s 0.3s ease both`, opacity: 0 }}
          >
            {[
              { icon: <AutoFixHighIcon sx={{ fontSize: 14 }} />, label: 'Genetic Algorithm', color: '#00e676' },
              { icon: <PsychologyIcon  sx={{ fontSize: 14 }} />, label: 'Isolation Forest AI', color: '#7c4dff' },
              { icon: <ShieldIcon      sx={{ fontSize: 14 }} />, label: 'Zero-Day Protection', color: '#00bcd4' },
            ].map(p => (
              <Box key={p.label} sx={{
                display: 'flex', alignItems: 'center', gap: 0.7,
                px: 2, py: 0.8, borderRadius: 6,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: p.color,
              }}>
                {p.icon}
                <Typography fontSize="0.72rem" fontWeight={600} color="rgba(255,255,255,0.6)">
                  {p.label}
                </Typography>
              </Box>
            ))}
          </Stack>

          {/* Submitted By card */}
          <Box sx={{
            animation: `${fadeUp} 0.7s 0.4s ease both`, opacity: 0,
            mb: 5, width: '100%', maxWidth: 560,
          }}>
            <Box sx={{
              px: { xs: 3, sm: 5 }, py: 3.5, borderRadius: 4,
              background: 'linear-gradient(135deg, rgba(0,230,118,0.05) 0%, rgba(0,188,212,0.03) 100%)',
              border: '1px solid rgba(0,230,118,0.25)',
              boxShadow: '0 0 40px rgba(0,230,118,0.06), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}>
              {/* Students */}
              <Typography fontSize="0.6rem" letterSpacing={4} textTransform="uppercase"
                color="rgba(0,230,118,0.6)" mb={2} display="block">
                Submitted By
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4} justifyContent="center" mb={2.5}>
                {['Keyur Devlekar', 'Prachi Ghodvinde'].map(name => (
                  <Box key={name} textAlign="center">
                    <Typography fontWeight={800} color="white" fontSize="0.95rem">{name}</Typography>
                  </Box>
                ))}
              </Stack>

              <Divider sx={{ borderColor: 'rgba(0,230,118,0.12)', mb: 2.5 }} />

              {/* Teachers */}
              <Typography fontSize="0.6rem" letterSpacing={4} textTransform="uppercase"
                color="rgba(0,230,118,0.6)" mb={2} display="block">
                Under the Guidance of
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="center">
                <Box textAlign="center">
                  <Typography fontWeight={700} color="rgba(255,255,255,0.9)" fontSize="0.9rem">
                    Prof. Tejashree Patil
                  </Typography>
                  <Typography fontSize="0.7rem" color="rgba(255,255,255,0.35)" letterSpacing={1}>
                    PROJECT GUIDE
                  </Typography>
                </Box>
                <Box sx={{ borderLeft: { sm: '1px solid rgba(255,255,255,0.08)' }, pl: { sm: 3 } }} textAlign="center">
                  <Typography fontWeight={700} color="rgba(255,255,255,0.9)" fontSize="0.9rem">
                    Prof. Abhijeet More
                  </Typography>
                  <Typography fontSize="0.7rem" color="rgba(255,255,255,0.35)" letterSpacing={1}>
                    HEAD OF DEPARTMENT
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Box>

          {/* CTA */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}
            sx={{ animation: `${fadeUp} 0.7s 0.5s ease both`, opacity: 0 }}>
            <Button variant="contained" size="large" endIcon={<ArrowForwardIcon />}
              onClick={() => navigate('/login')}
              sx={{
                background: 'linear-gradient(135deg,#00e676,#00bcd4)',
                color: '#080c18', fontWeight: 900, px: 5, py: 1.6,
                borderRadius: 3, fontSize: '0.95rem', letterSpacing: 1,
                boxShadow: '0 8px 32px rgba(0,230,118,0.35)',
                '&:hover': { boxShadow: '0 12px 48px rgba(0,230,118,0.55)', transform: 'translateY(-2px)' },
                transition: 'all 0.3s ease',
              }}>
              Enter Dashboard
            </Button>
            <Button variant="outlined" size="large" onClick={() => navigate('/register')}
              sx={{
                borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)',
                fontWeight: 600, px: 5, py: 1.6, borderRadius: 3, fontSize: '0.95rem',
                '&:hover': { borderColor: 'rgba(0,230,118,0.4)', color: '#00e676', background: 'rgba(0,230,118,0.04)' },
                transition: 'all 0.3s ease',
              }}>
              Create Account
            </Button>
          </Stack>
        </Box>

        {/* ── FOOTER ── */}
        <Box sx={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          py: 3, textAlign: 'center',
          background: 'rgba(0,0,0,0.4)',
        }}>
          <Typography variant="caption" color="rgba(255,255,255,0.2)" letterSpacing={1}>
            © 2025 EVOSHIELD · Pillai HOC College of Engineering and Technology · All Rights Reserved
          </Typography>
          <Typography variant="caption" color="rgba(255,255,255,0.1)" display="block" mt={0.5} fontSize="0.65rem">
            Self-Healing Web Application Firewall — Final Year Project, Master of Computer Applications
          </Typography>
        </Box>

      </Box>
    </Box>
  );
}
