import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

/**
 * The public footer.
 *
 * It used to sit on `surface-inverse` while reading the light theme's muted
 * text tokens, which put #6B7688 grey on navy, and its separator pill used
 * `border-border`, a class that generates nothing. Sitting on the normal
 * surface keeps every label on a pair the contrast table actually checks.
 */
export const Footer: React.FC = () => (
  <footer className="mt-auto border-t border-edge bg-surface">
    <div className="mx-auto max-w-canvas px-6 py-10 sm:px-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-heading text-label-lg font-extrabold tracking-tight text-brand">ELITE</span>
            <span className="font-heading text-label-lg font-semibold text-ink">Student Portal</span>
          </div>
          <p className="mt-2 max-w-prose text-body-sm text-ink-secondary">
            Department of Information Technology · SASI Institute of Technology and Engineering
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link to="/students" className="inline-flex min-h-[44px] items-center text-label-lg text-ink-secondary hover:text-ink">
            Students
          </Link>
          <Link to="/events" className="inline-flex min-h-[44px] items-center text-label-lg text-ink-secondary hover:text-ink">
            Events
          </Link>
        </nav>
      </div>

      <div className="mt-8 flex flex-col gap-2 border-t border-edge pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-label-md text-ink-muted">
          <ShieldCheck size={14} strokeWidth={2} className="text-status-approved" aria-hidden="true" />
          <span>Official institutional portal</span>
        </p>
        <p className="text-label-md text-ink-muted">
          © {new Date().getFullYear()} SASI IT. Authorized student and institutional access only.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
