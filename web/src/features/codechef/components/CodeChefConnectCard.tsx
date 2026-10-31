import React, { useState } from 'react';
import { Terminal, Shield, ArrowRight } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';

interface CodeChefConnectCardProps {
  onConnect: (handle: string) => void;
  connecting: boolean;
  error: string | null;
}

export const CodeChefConnectCard: React.FC<CodeChefConnectCardProps> = ({ onConnect, connecting, error }) => {
  const [handle, setHandle] = useState('');
  const [validationErr, setValidationErr] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = handle.trim();
    if (!clean) {
      setValidationErr('Please enter your CodeChef handle');
      return;
    }
    if (!/^[A-Za-z0-9_.]{3,30}$/.test(clean)) {
      setValidationErr('Handle must be 3-30 characters (letters, numbers, underscore, dot)');
      return;
    }
    setValidationErr(null);
    onConnect(clean);
  };

  return (
    <Card className="p-8 max-w-xl mx-auto border border-border bg-surface text-foreground shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Terminal className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Connect CodeChef Profile</h2>
          <p className="text-sm text-foreground-muted">Track your competitive programming progress and contest ratings</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            label="CodeChef Handle"
            value={handle}
            onChange={(e) => {
              setHandle(e.target.value);
              setValidationErr(null);
            }}
            placeholder="e.g. tourist, chef_123"
            disabled={connecting}
            className="w-full"
          />
          {(validationErr || error) && (
            <p className="text-xs text-danger mt-1.5">{validationErr || error}</p>
          )}
        </div>

        <div className="p-3 bg-surface-muted border border-border rounded-lg text-xs text-foreground-muted space-y-1">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>
              <strong>Ownership Verification:</strong> After connecting, you will receive a 30-minute code to paste in your CodeChef bio. If your CodeChef account already links to your verified GitHub, it will verify automatically!
            </span>
          </div>
        </div>

        <Button type="submit" variant="primary" disabled={connecting} className="w-full">
          {connecting ? 'Connecting...' : 'Connect CodeChef'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </form>
    </Card>
  );
};
