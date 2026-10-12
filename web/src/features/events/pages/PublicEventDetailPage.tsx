import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Calendar, Clock, Users, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';
import { eventsApi } from '../api';
import { PublicEventDetail } from '../types';
import { StudentSession } from '@/shared/types';
import { Navbar } from '@/shared/layout/Navbar';
import { FooterReveal } from '@/shared/layout/FooterReveal';
import { SkeletonPage } from '@/shared/ui/Skeleton';
import { authApi } from '@/features/auth/api';

interface PublicEventDetailPageProps {
  session?: StudentSession | null;
  onLogout?: () => void;
}

export const PublicEventDetailPage: React.FC<PublicEventDetailPageProps> = ({ session, onLogout }) => {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<PublicEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    setError(null);

    eventsApi
      .getPublicEvent(id)
      .then((data) => {
        if (mounted) setEvent(data ?? null);
      })
      .catch((err) => {
        if (mounted) {
          setError(err?.response?.status === 404 ? 'Event not found.' : 'Failed to load event details.');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  const formatDate = (val?: string | null) => (val ? new Date(val).toLocaleDateString() : 'TBA');

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface-canvas text-ink">
      <Navbar session={session ?? null} onLogout={onLogout ?? (() => {})} />

      <main className="flex-1 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl px-6 sm:px-10">
          <Link to="/events" className="inline-flex items-center gap-1.5 text-body-sm text-ink-secondary hover:text-ink font-semibold mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to all events
          </Link>

          {loading ? (
            <SkeletonPage label="Loading event details" cards={1} rows={4} />
          ) : error || !event ? (
            <div className="surface max-w-md mx-auto p-8 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-status-rejected mx-auto" />
              <h1 className="font-heading text-headline-sm font-bold">{error || 'Event not found'}</h1>
              <Link to="/events" className="btn btn-primary">Browse events</Link>
            </div>
          ) : (
            <article className="surface p-6 sm:p-10 space-y-8 rounded-2xl border border-edge">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-edge pb-6">
                <div className="space-y-2">
                  <span className="badge badge-brand text-xs uppercase">{event.type || 'EVENT'}</span>
                  <h1 className="font-heading text-headline-lg font-bold text-ink">{event.title}</h1>
                  <p className="text-body-sm text-ink-secondary">{event.eligibility || 'Open to all students'}</p>
                </div>

                <a href={authApi.getOAuthAuthorizeUrl()} className="btn btn-primary shrink-0 inline-flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign in to register</span>
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="surface-sunken p-4 rounded-lg flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-brand" />
                  <div>
                    <div className="text-label-xs text-ink-muted">Event date</div>
                    <div className="text-body-sm font-bold text-ink">{formatDate(event.date)}</div>
                  </div>
                </div>
                <div className="surface-sunken p-4 rounded-lg flex items-center gap-3">
                  <Clock className="w-5 h-5 text-status-review" />
                  <div>
                    <div className="text-label-xs text-ink-muted">Registration deadline</div>
                    <div className="text-body-sm font-bold text-ink">{formatDate(event.deadline)}</div>
                  </div>
                </div>
                <div className="surface-sunken p-4 rounded-lg flex items-center gap-3">
                  <Users className="w-5 h-5 text-status-changes" />
                  <div>
                    <div className="text-label-xs text-ink-muted">Format</div>
                    <div className="text-body-sm font-bold text-ink">{event.maxTeamSize && event.maxTeamSize > 1 ? 'Team Event' : 'Individual'}</div>
                  </div>
                </div>
              </div>

              {event.description && (
                <div className="space-y-3">
                  <h2 className="font-heading text-headline-sm font-bold text-ink">Description</h2>
                  <p className="text-body-md text-ink-secondary leading-relaxed whitespace-pre-wrap">{event.description}</p>
                </div>
              )}
            </article>
          )}
        </div>
      </main>

      <FooterReveal />
    </div>
  );
};

export default PublicEventDetailPage;
