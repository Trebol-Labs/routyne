'use client';
import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="liquid-bg-dark min-h-screen flex items-center justify-center p-6">
          <div className="glass-panel p-8 max-w-sm w-full text-center space-y-4">
            <h2 className="text-liquid text-2xl font-black tracking-tight">
              Something went wrong
            </h2>
            <p className="text-white/50 text-sm font-mono break-all">
              {this.state.error?.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="active-glass-btn w-full py-3 rounded-xl font-bold text-white"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
