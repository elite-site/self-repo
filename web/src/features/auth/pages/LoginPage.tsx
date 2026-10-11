import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { StudentSession } from '@/shared/types';
import { LoginCard } from '../components';

interface LoginPageProps {
  session: StudentSession | null;
  authChecking: boolean;
  sessionError: string | null;
  onRetry: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  session,
  authChecking,
  sessionError,
  onRetry,
}) => {
  useEffect(() => {
    document.title = 'Sign In — ELITE Portal';
  }, []);

  if (authChecking) {
    return null;
  }

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  if (sessionError) {
    return (
      <div className="min-h-[100dvh] bg-surface flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-black text-ink mb-2">Unable to verify your session</h1>
          <p className="text-sm text-ink-secondary mb-6">{sessionError}</p>
          <button
            type="button"
            onClick={onRetry}
            className="px-5 py-2.5 rounded-xl bg-status-solid-rejected text-on-primary text-sm font-bold hover:bg-brand transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-surface flex items-center justify-center px-6 sm:px-8 py-8">
      <LoginCard />
    </div>
  );
};

export default LoginPage;
