import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeModeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import MainLayout      from './layouts/MainLayout';
import AuthLayout      from './layouts/AuthLayout';
import ProtectedLayout from './layouts/ProtectedLayout';
import SplashPage      from './pages/SplashPage';
import LoginPage       from './pages/LoginPage';
import RegisterPage    from './pages/RegisterPage';
import DashboardPage       from './pages/DashboardPage';
import TrafficMonitorPage  from './pages/TrafficMonitorPage';
import AttackLogsPage      from './pages/AttackLogsPage';
import AnomalyDetectionPage from './pages/AnomalyDetectionPage';
import RuleManagementPage  from './pages/RuleManagementPage';
import SelfHealingPage     from './pages/SelfHealingPage';
import ReportsPage         from './pages/ReportsPage';
import NotificationsPage   from './pages/NotificationsPage';
import SettingsPage        from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeModeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/" element={<SplashPage />} />

              {/* Auth */}
              <Route element={<AuthLayout />}>
                <Route path="/login"    element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>

              {/* Protected */}
              <Route element={<ProtectedLayout />}>
                <Route element={<MainLayout />}>
                  <Route path="/dashboard"      element={<DashboardPage />} />
                  <Route path="/traffic"        element={<TrafficMonitorPage />} />
                  <Route path="/logs"           element={<AttackLogsPage />} />
                  <Route path="/anomaly"        element={<AnomalyDetectionPage />} />
                  <Route path="/rules"          element={<RuleManagementPage />} />
                  <Route path="/healing"        element={<SelfHealingPage />} />
                  <Route path="/reports"        element={<ReportsPage />} />
                  <Route path="/notifications"  element={<NotificationsPage />} />
                  <Route path="/settings"       element={<SettingsPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeModeProvider>
    </QueryClientProvider>
  );
}
