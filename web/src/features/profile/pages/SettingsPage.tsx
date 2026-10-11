import React, { useEffect } from 'react';
import { useSession } from '@/context/SessionContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/shared/ui/Toast';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';

export const SettingsPage: React.FC = () => {
  const { logout } = useSession();
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    document.title = 'Settings — ELITE Portal';
  }, []);

  const handleThemeChange = (theme: 'light' | 'dark') => {
    showToast(`Switched to ${theme} mode`);
  };

  return (
    <div className="min-h-[100dvh] bg-surface px-6 sm:px-8 py-8">
      <div className="max-w-md w-full bg-surface-canvas rounded-2xl shadow-xl p-8 sm:p-10 border border-edge">
        <h1 className="text-2xl font-heading text-brand mb-6">Settings</h1>

        <div className="mb-4">
          <Select
            id="theme-select"
            label="Theme"
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark')}
            className="bg-surface-sunken"
          />
        </div>

        <div className="mt-8 pt-8 border-t border-edge">
          <Button
            onClick={async () => {
              await logout();
              navigate('/', { replace: true });
            }}
            className="w-full text-left justify-start px-6 py-3 rounded-xl bg-status-solid-rejected text-on-primary hover:bg-brand transition-colors"
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
