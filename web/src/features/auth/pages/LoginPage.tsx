import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
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
      <div className="min-h-[100dvh] bg-surface-canvas flex items-center justify-center px-6 py-8">
        <div className="card max-w-md w-full text-center p-8 bg-surface border border-edge rounded-2xl shadow-modal space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-status-soft-rejected text-status-rejected">
            <AlertCircle size={24} aria-hidden="true" />
          </div>
          <h1 className="font-heading text-headline-sm font-bold text-ink">
            Unable to verify your session
          </h1>
          <p className="text-body-sm text-ink-secondary leading-relaxed">
            {sessionError}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onRetry}
              className="btn btn-primary min-h-[44px] px-6 py-2.5 rounded-xl font-bold card-lift cursor-pointer"
            >
              Retry verification
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-surface-canvas flex items-center justify-center px-6 sm:px-8 py-10">
      <LoginCard />
    </div>
  );
};

export default LoginPage;
