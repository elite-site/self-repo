import React from 'react';
import { Button } from '@/shared/ui/Button';
import { authApi } from '../api';

export const LoginCard: React.FC = () => {
  return (
    <div className="max-w-md w-full bg-surface-canvas rounded-2xl shadow-xl p-6 sm:p-10 border border-edge">
      <div className="text-center mb-6">
        <h1 className="text-5xl font-heading text-brand mb-2">ELITE Portal</h1>
        <p className="text-ink-secondary">Student Introduction Portal</p>
      </div>

      <div>
        <p className="text-ink-secondary text-sm mb-6">
          Sign in with your SASI college Google account to access the portal.
        </p>
        <Button
          onClick={() => {
            window.location.href = authApi.getOAuthAuthorizeUrl();
          }}
          className="w-full text-left justify-start px-6 py-3 rounded-xl bg-brand text-on-primary hover:bg-red-700 transition-colors"
        >
          Sign in with Google
        </Button>
      </div>
    </div>
  );
};
