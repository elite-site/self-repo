import React from 'react';
import { useSession } from '../context/SessionContext';
import { useNavigate } from '@tanstack/react-router';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Menu } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { session, setReducedMotion, reducedMotion } = useSession();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleThemeChange = (theme: 'light' | 'dark') => {
    // Theme preference handled by ThemeContext; persist via session
    showToast({ title: 'Theme updated', description: `Switched to ${theme} mode`, variant: 'default' });
  };

  const handleReducedMotionToggle = (enabled: boolean) => {
    setReducedMotion(enabled);
    showToast({ title = 'Reduced motion', description: enabled ? 'Enabled reduced motion animations' : 'Disabled reduced motion animations', variant: 'default' });
  };

  return (
    <div className="min-h-[100dvh] bg-surface px-6 sm:px-8 py-8">
      <div className="max-w-md w-full bg-surface-canvas rounded-2xl shadow-xl p-8 sm:p-10 border border-surface-border">
        <h2 className="text-2xl font-heading text-brand mb-6">Settings</h2>

        {/* Theme preference */}
        <div className="mb-4">
          <label htmlFor="theme-select" className="block text-text-primary font-medium mb-2">
            Theme
          </label>
          <Select
            id="theme-select"
            onValueChange={handleThemeChange}
            className="bg-surface-foreground"
          >
            <Select.Item value="light">Light</Select.Item>
            <Select.Item value="dark">Dark</Select.Item>
          </Select>
        </div>

        {/* Reduced motion preference */}
        <div className="mb-4">
          <label htmlFor="reduced-motion-select" className="block text-text-primary font-medium mb-2">
            Reduced motion
          </label>
          <Select
            id="reduced-motion-select"
            onValueChange={handleReducedMotionToggle}
            className="bg-surface-foreground"
          >
            <Select.Item value="false">Animation</Select.Item>
            <Select.Item value="true">Reduced motion</Select.Item>
          </Select>
        </div>

        {/* Sign out */}
        <div className="mt-8 pt-8 border-t border-surface-border">
          <Button
            onClick={() => {
              // Sign out logic
              navigate('/login', { replace: true });
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