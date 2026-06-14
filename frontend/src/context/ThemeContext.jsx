import React, { createContext, useContext, useState, useMemo } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

const ThemeModeContext = createContext({ mode: 'dark', toggleMode: () => {} });

export function ThemeModeProvider({ children }) {
  const [mode, setMode] = useState('dark');
  const toggleMode = () => setMode(m => m === 'dark' ? 'light' : 'dark');

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      ...(mode === 'dark' ? {
        background: { default: '#0a0e1a', paper: '#0d1b2a' },
        primary:    { main: '#00e676' },
        secondary:  { main: '#00bcd4' },
        text:       { primary: '#ffffff', secondary: 'rgba(255,255,255,0.6)' },
      } : {
        background: { default: '#f0f4f8', paper: '#ffffff' },
        primary:    { main: '#1976d2' },
        secondary:  { main: '#0288d1' },
        text:       { primary: '#0a1929', secondary: 'rgba(0,0,0,0.6)' },
      }),
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", sans-serif',
    },
    shape: { borderRadius: 10 },
    components: {
      MuiCard:    { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiButton:  { styleOverrides: { root: { textTransform: 'none', fontWeight: 700 } } },
      MuiChip:    { styleOverrides: { root: { fontWeight: 600 } } },
    },
  }), [mode]);

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export const useThemeMode = () => useContext(ThemeModeContext);
