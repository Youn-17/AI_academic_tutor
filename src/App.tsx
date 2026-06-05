import React, { useState, useEffect } from 'react';
import LandingPage from '@/features/landing/LandingPage';
import StudentView from '@/features/student/StudentView';
import SupervisorView from '@/features/supervisor/SupervisorView';
import AdminView from '@/features/admin/AdminView';
import LoginPage from '@/features/auth/LoginPage';
import RegisterPage from '@/features/auth/RegisterPage';
import ForgotPasswordPage from '@/features/auth/ForgotPasswordPage';
import PendingApprovalPage from '@/features/auth/PendingApprovalPage';
import ResetPasswordPage from '@/features/auth/ResetPasswordPage';
import ConsentPage from '@/features/auth/ConsentPage';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { Loader2 } from 'lucide-react';
import { Locale, Theme } from '@/types';
import ErrorBoundary from '@/shared/components/ErrorBoundary';
import { FeedbackProvider } from '@/shared/components/FeedbackProvider';

type AuthView = 'login' | 'register' | 'forgot-password';

// Detect Supabase password recovery flow from URL hash
function isPasswordRecovery(): boolean {
  const hash = window.location.hash;
  return hash.includes('type=recovery') || hash.includes('type=passwordRecovery');
}

// Detect consent response flow from URL search params
function isConsentFlow(): boolean {
  const s = window.location.search;
  return s.includes('token=') && (s.includes('role=teacher') || s.includes('role=student'));
}

// Inner App component that uses auth context
const AppContent: React.FC<{ locale: Locale; setLocale: (l: Locale) => void }> = ({ locale, setLocale }) => {
  const { user, profile, loading, profileError, signOut, refreshProfile } = useAuth();
  // 持久化到 sessionStorage，避免刷新后重新经历 Landing
  const [hasViewedLanding, setHasViewedLanding] = useState<boolean>(() => {
    return sessionStorage.getItem('hasViewedLanding') === 'true';
  });
  const [isRecovery, setIsRecovery] = useState<boolean>(() => isPasswordRecovery());
  const [isConsent] = useState<boolean>(() => isConsentFlow());
  const [authView, setAuthView] = useState<AuthView>('login');
  const [theme, setTheme] = useState<Theme>('light');

  const currentRole = profile?.role;

  // Apply theme to html element
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    await signOut();
    sessionStorage.removeItem('hasViewedLanding');
    setHasViewedLanding(false);
  };

  // Consent response flow — standalone, no auth required
  if (isConsent) {
    return <ConsentPage />;
  }

  // Password recovery flow — must be handled before any other routing
  if (isRecovery) {
    return (
      <ResetPasswordPage
        theme={theme}
        onComplete={() => {
          setIsRecovery(false);
          // Clear the hash so normal routing resumes
          window.history.replaceState(null, '', window.location.pathname);
        }}
      />
    );
  }

  // Logged in but profile fetch failed/timed out → explicit error + retry (never an endless spinner)
  if (user && !profile && profileError) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center ${theme === 'dark' ? 'bg-[#0B0F19] text-slate-200' : 'bg-slate-50 text-slate-700'}`}>
        <p className="text-sm max-w-sm">{locale === 'en' ? 'Could not load your profile (slow network or session issue).' : '无法加载个人资料(网络较慢或登录态异常)。'}</p>
        <div className="flex gap-3">
          <button onClick={() => refreshProfile()} className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors">{locale === 'en' ? 'Retry' : '重试'}</button>
          <button onClick={handleLogout} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-black/5 transition-colors">{locale === 'en' ? 'Sign out' : '重新登录'}</button>
        </div>
      </div>
    );
  }

  // Show loading while checking auth state OR while profile is still being fetched (not errored)
  if (loading || (user && !profile)) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0B0F19]' : 'bg-slate-50'}`}>
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  // Show landing page first (before auth check)
  if (!hasViewedLanding) {
    return (
      <LandingPage
        onEnter={() => {
          sessionStorage.setItem('hasViewedLanding', 'true');
          setHasViewedLanding(true);
        }}
        locale={locale}
        setLocale={setLocale}
        theme={theme}
        setTheme={setTheme}
      />
    );
  }

  // If not logged in, show auth pages
  if (!user) {
    if (authView === 'register') {
      return (
        <RegisterPage
          onSwitchToLogin={() => setAuthView('login')}
          onSuccess={() => setAuthView('login')}
          theme={theme}
        />
      );
    }
    if (authView === 'forgot-password') {
      return (
        <ForgotPasswordPage
          onSwitchToLogin={() => setAuthView('login')}
          theme={theme}
        />
      );
    }
    return (
      <LoginPage
        onSwitchToRegister={() => setAuthView('register')}
        onSwitchToForgotPassword={() => setAuthView('forgot-password')}
        onSuccess={() => { }} // Auth state will update automatically
        theme={theme}
      />
    );
  }

  // User is authenticated - route based on role
  if (currentRole === 'admin') {
    return (
      <AdminView
        onLogout={handleLogout}
        locale={locale}
        setLocale={setLocale}
      />
    );
  }

  if (currentRole === 'pending_supervisor') {
    return (
      <PendingApprovalPage
        onLogout={handleLogout}
        theme={theme}
      />
    );
  }

  if (currentRole === 'supervisor') {
    return (
      <SupervisorView
        onLogout={handleLogout}
        locale={locale}
        setLocale={setLocale}
      />
    );
  }

  // Default: student
  return (
    <StudentView
      onLogout={handleLogout}
      locale={locale}
      setLocale={setLocale}
      theme={theme}
      setTheme={setTheme}
    />
  );
};

// Root App with AuthProvider wrapper. Locale lives here (read once from the landing-page choice)
// so it can feed the ErrorBoundary + FeedbackProvider fallbacks and persist across the auth flow.
const App: React.FC = () => {
  const [locale, setLocale] = useState<Locale>(
    () => (localStorage.getItem('preferred-locale') as Locale) || 'zh-CN',
  );
  useEffect(() => {
    localStorage.setItem('preferred-locale', locale);
  }, [locale]);

  return (
    <AuthProvider>
      <ErrorBoundary locale={locale}>
        <FeedbackProvider locale={locale}>
          <AppContent locale={locale} setLocale={setLocale} />
        </FeedbackProvider>
      </ErrorBoundary>
    </AuthProvider>
  );
};

export default App;