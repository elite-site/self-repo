import React, { useEffect } from 'react';
import { useSession } from '@/context/SessionContext';
import { useThemeState } from '@/context/ThemeContext';
import type { Theme } from '@/shared/lib/theme';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/shared/ui/Toast';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';

export const SettingsPage: React.FC = () => {
  const { logout } = useSession();
  const { theme, setTheme } = useThemeState();
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    document.title = 'Settings — ELITE Portal';
  }, []);

  const handleThemeChange = (nextTheme: Theme) => {
    setTheme(nextTheme);
    const label = nextTheme === 'system' ? 'system default' : `${nextTheme} mode`;
    showToast(`Switched to ${label}`);
  };

  return (
    <div className="py-2 sm:py-4">
      <div className="max-w-md w-full bg-surface rounded-2xl shadow-sm p-6 sm:p-8 border border-edge">
        <h1 className="font-ui text-headline-md font-bold text-ink mb-6">Settings</h1>

        <div className="mb-4">
          <Select
            id="theme-select"
            label="Theme"
            value={theme}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            onChange={(e) => handleThemeChange(e.target.value as Theme)}
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
