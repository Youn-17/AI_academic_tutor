import React from 'react';
import { Locale } from '@/types';

interface Props {
  locale: Locale;
  children: React.ReactNode;
}
interface State {
  hasError: boolean;
}

// Catches render-time exceptions anywhere below it so a single component crash shows a recoverable
// fallback instead of a blank white screen — important for an unattended research pilot. Must be a
// class component (getDerivedStateFromError has no hook equivalent).
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const en = this.props.locale === 'en';
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-slate-50 text-slate-700">
        <div className="text-4xl">😵</div>
        <p className="max-w-sm text-sm">
          {en ? 'Something went wrong while rendering this page.' : '页面渲染出错了，请刷新重试。'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          {en ? 'Reload' : '刷新重试'}
        </button>
      </div>
    );
  }
}
