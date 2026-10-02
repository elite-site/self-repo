import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui/Button';
import { useEffect } from 'react';

interface LoginPageProps {
  session: any;
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
  const navigate = useNavigate();
  const { setSession } = useSession();
  const { showToast } = useToast();

  useEffect(() => {
    // If already signed in, redirect to dashboard
    if (session?.accessToken) {
      navigate('/dashboard', { replace: true });
    }
  }, [session, navigate]);

  if (authChecking) {
    return null; // Loading state handled by parent RouteLoadingFallback
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
      <div className="max-w-md w-full bg-surface-canvas rounded-2xl shadow-xl p-8 sm:p-10 border border-surface-border">
        <div className="text-center mb-6">
          <h1 className="text-5xl font-heading text-brand mb-2">ELITE Portal</h1>
          <p className="text-text-secondary">Student Introduction Portal</p>
        </div>

        {session?.accessToken ? null : (
          <div>
            <p className="text-text-secondary text-sm mb-6">
              Sign in with your SASI college Google account to access the portal.
            </p>
            <Button
              onClick={() => setSession({
                accessToken: 'google-token-placeholder',
                userId: 'sasi-student',
                name: '',
                email: '',
                picture: '',
                reducedMotion: false,
              } as any)}
              className="w-full text-left justify-start px-6 py-3 rounded-xl bg-brand text-on-primary hover:bg-red-700 transition-colors"
            >
              Sign in with Google
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;