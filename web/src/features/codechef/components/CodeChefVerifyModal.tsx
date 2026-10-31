import React, { useState } from 'react';
import { Copy, Check, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';

interface CodeChefVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  verifyCode: string | null;
  handle: string | null;
  onVerify: () => void;
  verifying: boolean;
  error: string | null;
}

export const CodeChefVerifyModal: React.FC<CodeChefVerifyModalProps> = ({
  isOpen,
  onClose,
  verifyCode,
  handle,
  onVerify,
  verifying,
  error,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!verifyCode) return;
    navigator.clipboard.writeText(verifyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Verify CodeChef Account Ownership">
      <div className="space-y-4">
        <p className="text-sm text-foreground-muted">
          To verify that you own <strong>@{handle}</strong>, please paste this temporary code into your{' '}
          <strong>CodeChef Bio</strong> (or Full Name), then click <strong>Verify</strong> below.
        </p>

        {verifyCode && (
          <div className="flex items-center justify-between p-3.5 bg-surface-muted border border-border rounded-xl">
            <span className="font-mono font-bold text-lg text-primary tracking-wider">{verifyCode}</span>
            <Button size="sm" variant="secondary" onClick={handleCopy} className="flex items-center gap-1.5">
              {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy Code'}
            </Button>
          </div>
        )}

        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs space-y-1.5 text-foreground-muted">
          <p className="font-semibold text-foreground flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-primary" /> Steps to verify:
          </p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Copy the code above.</li>
            <li>
              Go to your{' '}
              <a
                href="https://www.codechef.com"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline inline-flex items-center gap-0.5"
              >
                CodeChef Profile Settings <ExternalLink className="w-2.5 h-2.5" />
              </a>
              .
            </li>
            <li>Paste the code into your <strong>About Me (Bio)</strong> and save.</li>
            <li>Return here and click the <strong>Verify Ownership</strong> button.</li>
          </ol>
        </div>

        {error && (
          <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-xs text-danger flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={verifying}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onVerify} disabled={verifying}>
            {verifying ? 'Checking...' : 'Verify Ownership'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
