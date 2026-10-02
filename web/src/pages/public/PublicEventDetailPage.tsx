import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Calendar, Clock, Users, ArrowLeft, AlertCircle, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';
import { StudentSession } from '../../types';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { SkeletonPage } from '../../components/ui/Skeleton';

interface PublicEventDetailPageProps {
  session?: StudentSession | null;
  onLogout?: () => void;
}

interface PublicEventDetail {
  id: string;
  title: string;
  description?: string | null;
  date?: string | null;
  deadline?: string | null;
  type?: string | null;
  eligibility?: string | null;
  status?: string | null;
  registrationFields?: Array<{ id: string; label: string; required?: boolean }> | null;
}

/**
 * Read-only event detail for visitors who are not signed in.
 *
 * Registration needs an authenticated student, so the page states what the event
 * requires and points at sign-in instead of rendering a form that cannot submit.
 */
export const PublicEventDetailPage: React.FC<PublicEventDetailPageProps> = ({ session, onLogout }) => {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<PublicEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const shouldReduce = useReducedMotion();
  const staggerContainer = selectVariantsByName(shouldReduce, 'staggerFastContainer');
  const staggerItem = selectVariantsByName(shouldReduce, 'staggerItem');

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    setLoading(true);
    setError(null);

    api
      .getPublicEvent(id)
      .then((data) => {
        if (mounted) setEvent(data ?? null);
      })
      .catch((err) => {
        console.error('Failed to load public event:', err);
        if (mounted) {
          setError(
            err?.response?.status === 404
              ? 'This event does not exist or is no longer open.'
              : 'Could not load this event. Please retry.',
          );
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  const formatDate = (value?: string | null) => {
    if (!value) return 'To be announced';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'To be announced';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleSignIn = () => {
    window.location.href = api.getOAuthAuthorizeUrl();
  };

  const renderBody = () => {
    if (loading) {
      return <SkeletonPage label="Loading event" cards={1} rows={3} />;
    }

    if (error || !event) {
      return (
        <div className="surface border border-status-rejected/20 p-10 text-center space-y-3" role="alert">
          <AlertCircle className="w-10 h-10 text-status-rejected mx-auto" aria-hidden="true" />
          <h2 className="text-body-md font-bold text-ink font-heading">Event unavailable</h2>
          <p className="text-label-sm text-ink-secondary">{error ?? 'This event could not be found.'}</p>
          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 text-label-sm font-bold text-brand hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Back to all events
          </Link>
        </div>
      );
    }

    const fields = event.registrationFields ?? [];

    return (
      <div className="space-y-6">
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 text-label-sm font-bold text-brand hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          All events
        </Link>

        <div className="surface p-6 sm:p-8 space-y-5">
          <div className="space-y-2">
            {event.status && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-status-bg-approved text-status-approved border border-status-bg-approved">
                <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                {event.status}
              </span>
            )}
            <h1 className="text-headline-md font-extrabold text-ink font-heading tracking-tight leading-tight">
              {event.title}
            </h1>
          </div>

          {event.description && (
            <p className="text-body-sm text-ink-secondary leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-edge text-label-sm">
            <div className="flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-brand shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <div className="text-ink-muted">Announced</div>
                <div className="font-semibold text-ink mt-0.5">{formatDate(event.date)}</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-brand shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <div className="text-ink-muted">Registration closes</div>
                <div className="font-semibold text-ink mt-0.5">{formatDate(event.deadline)}</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Users className="w-4 h-4 text-brand shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <div className="text-ink-muted">Eligibility</div>
                <div className="font-semibold text-ink mt-0.5">
                  {event.eligibility || 'All students'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {fields.length > 0 && (
          <div className="surface p-6 space-y-3">
            <h2 className="text-body-sm font-bold text-ink font-heading">What registration asks for</h2>
            <ul className="space-y-1.5 text-label-sm text-ink-secondary">
              {fields.map((field) => (
                <li key={field.id} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" aria-hidden="true" />
                  <span>
                    {field.label}
                    {field.required && <span className="text-status-rejected font-semibold"> (required)</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-brand-soft border border-brand-soft rounded-lg p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-body-sm font-bold text-ink font-heading">Want to register?</h2>
            <p className="text-label-sm text-ink-secondary mt-1">
              Registration is tied to your student account so coordinators can track your entry.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignIn}
            className="shrink-0 btn btn-primary"
          >
            Sign in to register
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-surface-canvas text-ink flex flex-col justify-between">
      <Navbar session={session} onLogout={onLogout} />

      <main className="flex-1 px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto">{renderBody()}</div>
      </main>

      <Footer />
    </div>
  );
};

export default PublicEventDetailPage;
