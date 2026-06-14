import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  AppBar, Toolbar, Typography, IconButton, Avatar, Stack, Tooltip,
  Badge, Divider, alpha, useTheme, useMediaQuery,
} from '@mui/material';
import DashboardIcon    from '@mui/icons-material/Dashboard';
import TrafficIcon      from '@mui/icons-material/Traffic';
import BugReportIcon    from '@mui/icons-material/BugReport';
import PsychologyIcon   from '@mui/icons-material/Psychology';
import ShieldIcon       from '@mui/icons-material/Shield';
import AutoFixHighIcon  from '@mui/icons-material/AutoFixHigh';
import AssessmentIcon   from '@mui/icons-material/Assessment';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon     from '@mui/icons-material/Settings';
import MenuIcon         from '@mui/icons-material/Menu';
import ChevronLeftIcon  from '@mui/icons-material/ChevronLeft';
import SecurityIcon     from '@mui/icons-material/Security';
import LogoutIcon       from '@mui/icons-material/Logout';
import { useAuth }      from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import Brightness4Icon  from '@mui/icons-material/Brightness4';
import Brightness7Icon  from '@mui/icons-material/Brightness7';
import HomeIcon         from '@mui/icons-material/Home';

const DRAWER_WIDTH = 240;
const MINI_WIDTH   = 68;

const NAV_ITEMS = [
  { path: '/dashboard',          label: 'Dashboard',        icon: <DashboardIcon /> },
  { path: '/traffic',            label: 'Live Traffic',     icon: <TrafficIcon /> },
  { path: '/logs',               label: 'Attack Logs',      icon: <BugReportIcon /> },
  { path: '/anomaly',            label: 'AI Detection',     icon: <PsychologyIcon /> },
  { path: '/rules',              label: 'Rule Management',  icon: <ShieldIcon /> },
  { path: '/healing',            label: 'Self-Healing',     icon: <AutoFixHighIcon /> },
  { path: '/reports',            label: 'Reports',          icon: <AssessmentIcon /> },
];

const BOTTOM_ITEMS = [
  { path: '/notifications', label: 'Notifications', icon: <NotificationsIcon /> },
  { path: '/settings',      label: 'Settings',      icon: <SettingsIcon /> },
];

export default function MainLayout() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { user, signOut } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const theme       = useTheme();
  const isMobile    = useMediaQuery(theme.breakpoints.down('md'));
  const [open,  setOpen]  = useState(!isMobile);
  const [mOpen, setMOpen] = useState(false);

  const drawerWidth = open ? DRAWER_WIDTH : MINI_WIDTH;
  const handleSignOut = async () => { await signOut(); navigate('/login'); };

  const isActive = (path) => location.pathname === path;

  const SidebarContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(10,14,26,0.98)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Logo */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 64,
        borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
          background: 'linear-gradient(135deg,#00e676,#00bcd4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <SecurityIcon sx={{ fontSize: 20, color: '#0a0e1a' }} />
        </Box>
        {(open || isMobile) && (
          <Box>
            <Typography variant="subtitle1" fontWeight={900} sx={{ lineHeight: 1.1,
              background: 'linear-gradient(90deg,#00e676,#00bcd4)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              EVOSHIELD
            </Typography>
            <Typography variant="caption" color="rgba(255,255,255,0.3)" fontSize={9} lineHeight={1}>
              EvoShield WAF
            </Typography>
          </Box>
        )}
      </Box>

      {/* Nav */}
      <List sx={{ flex: 1, px: 1, pt: 1 }}>
        {NAV_ITEMS.map(item => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.3 }}>
            <Tooltip title={!open && !isMobile ? item.label : ''} placement="right">
              <ListItemButton
                component={Link} to={item.path}
                onClick={() => isMobile && setMOpen(false)}
                sx={{
                  borderRadius: 2, minHeight: 44,
                  background: isActive(item.path) ? 'rgba(0,230,118,0.12)' : 'transparent',
                  border: isActive(item.path) ? '1px solid rgba(0,230,118,0.2)' : '1px solid transparent',
                  '&:hover': { background: 'rgba(0,230,118,0.07)', border: '1px solid rgba(0,230,118,0.12)' },
                  justifyContent: !open && !isMobile ? 'center' : 'flex-start',
                  px: !open && !isMobile ? 0 : 1.5,
                }}>
                <ListItemIcon sx={{ minWidth: 0, mr: open || isMobile ? 1.5 : 0,
                  color: isActive(item.path) ? '#00e676' : 'rgba(255,255,255,0.45)',
                  '& svg': { fontSize: 20 } }}>
                  {item.icon}
                </ListItemIcon>
                {(open || isMobile) && (
                  <ListItemText primary={item.label}
                    primaryTypographyProps={{ fontSize: 13, fontWeight: isActive(item.path) ? 700 : 500,
                      color: isActive(item.path) ? '#00e676' : 'rgba(255,255,255,0.7)' }} />
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

      {/* Bottom */}
      <List sx={{ px: 1, py: 1 }}>
        {BOTTOM_ITEMS.map(item => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.3 }}>
            <Tooltip title={!open && !isMobile ? item.label : ''} placement="right">
              <ListItemButton component={Link} to={item.path}
                onClick={() => isMobile && setMOpen(false)}
                sx={{ borderRadius: 2, minHeight: 40,
                  background: isActive(item.path) ? 'rgba(0,230,118,0.12)' : 'transparent',
                  '&:hover': { background: 'rgba(0,230,118,0.07)' },
                  justifyContent: !open && !isMobile ? 'center' : 'flex-start',
                  px: !open && !isMobile ? 0 : 1.5 }}>
                <ListItemIcon sx={{ minWidth: 0, mr: open || isMobile ? 1.5 : 0,
                  color: isActive(item.path) ? '#00e676' : 'rgba(255,255,255,0.45)',
                  '& svg': { fontSize: 20 } }}>
                  {item.badge ? <Badge badgeContent={item.badge} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 9, minWidth: 14, height: 14 } }}>{item.icon}</Badge> : item.icon}
                </ListItemIcon>
                {(open || isMobile) && (
                  <ListItemText primary={item.label}
                    primaryTypographyProps={{ fontSize: 13, fontWeight: isActive(item.path) ? 700 : 500,
                      color: isActive(item.path) ? '#00e676' : 'rgba(255,255,255,0.7)' }} />
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

      {/* User */}
      <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5,
        justifyContent: !open && !isMobile ? 'center' : 'flex-start' }}>
        <Avatar sx={{ width: 34, height: 34, background: 'linear-gradient(135deg,#00e676,#00bcd4)', fontSize: 13, fontWeight: 700, color: '#0a0e1a', flexShrink: 0 }}>
          {user?.email?.[0]?.toUpperCase() || 'A'}
        </Avatar>
        {(open || isMobile) && (
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="white" fontWeight={700} display="block" noWrap>{user?.user_metadata?.full_name || 'Admin'}</Typography>
            <Typography variant="caption" color="rgba(255,255,255,0.35)" display="block" noWrap fontSize={10}>{user?.email || 'admin@evoshield.io'}</Typography>
          </Box>
        )}
        {(open || isMobile) && (
          <Tooltip title="Sign Out">
            <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.3)', '&:hover': { color: '#f44336' } }} onClick={handleSignOut}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#0a0e1a' }}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Box sx={{ width: drawerWidth, flexShrink: 0, transition: 'width 0.3s ease' }}>
          <Box sx={{ position: 'fixed', top: 0, left: 0, height: '100vh', width: drawerWidth, transition: 'width 0.3s ease', zIndex: 1200, overflow: 'hidden' }}>
            {SidebarContent}
          </Box>
        </Box>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer open={mOpen} onClose={() => setMOpen(false)}
          PaperProps={{ sx: { width: DRAWER_WIDTH, background: 'transparent', border: 'none' } }}>
          {SidebarContent}
        </Drawer>
      )}

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top AppBar */}
        <AppBar position="sticky" elevation={0} sx={{
          background: 'rgba(10,14,26,0.9)', backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)', zIndex: 1100,
        }}>
          <Toolbar sx={{ minHeight: '56px !important', px: 2 }}>
            <IconButton sx={{ color: 'rgba(255,255,255,0.6)', mr: 1 }}
              onClick={() => isMobile ? setMOpen(o => !o) : setOpen(o => !o)}>
              {isMobile ? <MenuIcon /> : open ? <ChevronLeftIcon /> : <MenuIcon />}
            </IconButton>

            {/* Live status */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, px: 1.5, py: 0.5,
              background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.15)', borderRadius: 6, mr: 2 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#00e676',
                animation: 'blink 1.5s ease infinite',
                '@keyframes blink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.2 } } }} />
              <Typography variant="caption" color="#00e676" fontWeight={700} fontSize={10}>LIVE</Typography>
            </Box>

            <Box sx={{ flex: 1 }} />

            <Stack direction="row" spacing={0.5} alignItems="center">
              <Tooltip title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} Mode`}>
                <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.5)' }} onClick={toggleMode}>
                  {mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Home">
                <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.5)' }} onClick={() => navigate('/')}>
                  <HomeIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Notifications">
                <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.5)' }} onClick={() => navigate('/notifications')}>
                  <NotificationsIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Avatar sx={{ width: 30, height: 30, background: 'linear-gradient(135deg,#00e676,#00bcd4)', fontSize: 12, fontWeight: 700, color: '#0a0e1a', ml: 0.5, cursor: 'pointer' }}
                onClick={() => navigate('/settings')}>
                {user?.email?.[0]?.toUpperCase() || 'A'}
              </Avatar>
            </Stack>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box sx={{ flex: 1, overflow: 'auto',
          '&::-webkit-scrollbar': { width: 5 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.08)', borderRadius: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
