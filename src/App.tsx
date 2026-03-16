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
const AppContent: React.FC = () => {
  const { user, profile, loading, signOut } = useAuth();
  // 持久化到 sessionStorage，避免刷新后重新经历 Landing
  const [hasViewedLanding, setHasViewedLanding] = useState<boolean>(() => {
    return sessionStorage.getItem('hasViewedLanding') === 'true';
  });
  const [isRecovery, setIsRecovery] = useState<boolean>(() => isPasswordRecovery());
  const [isConsent] = useState<boolean>(() => isConsentFlow());
  const [authView, setAuthView] = useState<AuthView>('login');
  const [locale, setLocale] = useState<Locale>('zh-CN');
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

  // Show loading while checking auth state OR while user is logged in but profile not yet loaded
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

// Root App with AuthProvider wrapper
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;