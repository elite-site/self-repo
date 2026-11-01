import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Calendar, Clock, Users, ArrowLeft, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { eventsApi } from '../api';
import { PublicEventDetail } from '../types';
import { StudentSession } from '@/shared/types';
import { Navbar } from '@/shared/layout/Navbar';
import { FooterReveal } from '@/shared/layout/FooterReveal';
import { SkeletonPage } from '@/shared/ui/Skeleton';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymLayout';
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
        <div className="mx-auto max-w-canvas px-6 sm:px-10">
          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 text-body-sm text-ink-secondary hover:text-ink font-semibold mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to all events
          </Link>

          {loading ? (
            <SkeletonPage label="Loading event details" cards={1} rows={4} />
          ) : error || !event ? (
            <div className="surface max-w-md mx-auto p-8 text-center space-y-4 rounded-2xl border border-edge">
              <AlertCircle className="w-12 h-12 text-status-rejected mx-auto" />
              <h1 className="font-heading text-headline-sm font-bold">{error || 'Event not found'}</h1>
              <Link to="/events" className="btn btn-primary min-h-[44px]">Browse events</Link>
            </div>
          ) : (
            <article className="space-y-8" data-reveal>
              <AsymGrid>
                <AsymFeatured cols="8" className="surface p-6 sm:p-8 rounded-2xl border border-edge space-y-6">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge badge-brand text-xs uppercase">{event.type || 'EVENT'}</span>
                      {event.eligibility && (
                        <span className="badge badge-outline text-xs">{event.eligibility}</span>
                      )}
                    </div>
                    <h1 className="font-heading text-headline-lg font-bold text-ink sm:text-headline-xl">
                      {event.title}
                    </h1>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="surface-sunken p-4 rounded-xl flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-brand shrink-0" />
                      <div>
                        <div className="text-label-xs text-ink-muted">Event date</div>
                        <div className="text-body-sm font-bold text-ink">{formatDate(event.date)}</div>
                      </div>
                    </div>
                    <div className="surface-sunken p-4 rounded-xl flex items-center gap-3">
                      <Clock className="w-5 h-5 text-status-review shrink-0" />
                      <div>
                        <div className="text-label-xs text-ink-muted">Registration deadline</div>
                        <div className="text-body-sm font-bold text-ink">{formatDate(event.deadline)}</div>
                      </div>
                    </div>
                    <div className="surface-sunken p-4 rounded-xl flex items-center gap-3">
                      <Users className="w-5 h-5 text-status-changes shrink-0" />
                      <div>
                        <div className="text-label-xs text-ink-muted">Format</div>
                        <div className="text-body-sm font-bold text-ink">
                          {event.maxTeamSize && event.maxTeamSize > 1 ? `Team (max ${event.maxTeamSize})` : 'Individual'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {event.description && (
                    <div className="space-y-3 pt-4 border-t border-edge">
                      <h2 className="font-heading text-headline-sm font-bold text-ink">Event Overview</h2>
                      <p className="text-body-md text-ink-secondary leading-relaxed whitespace-pre-wrap">
                        {event.description}
                      </p>
                    </div>
                  )}
                </AsymFeatured>

                <AsymSide cols="4">
                  <AsymAccent className="flex flex-col justify-between h-full p-6 card-lift">
                    <div className="space-y-4">
                      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand">
                        <Sparkles size={16} aria-hidden="true" />
                        Join This Event
                      </span>
                      <p className="text-body-xs text-ink-secondary leading-relaxed">
                        Registration is open exclusively to SASI students. Sign in to submit your entry or invite teammates to join your squad.
                      </p>
                      <div className="space-y-2 pt-2 text-label-xs font-mono text-ink-secondary">
                        <div className="flex justify-between">
                          <span>Eligibility:</span>
                          <span className="text-ink font-sans">{event.eligibility || 'Open to All'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Team Max:</span>
                          <span className="text-ink font-sans">{event.maxTeamSize || 1} members</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-brand/20">
                      <a
                        href={authApi.getOAuthAuthorizeUrl()}
                        className="btn btn-primary w-full min-h-[44px] inline-flex items-center justify-center gap-2 shadow-sm"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Sign in to register</span>
                      </a>
                    </div>
                  </AsymAccent>
                </AsymSide>
              </AsymGrid>
            </article>
          )}
        </div>
      </main>

      <FooterReveal />
    </div>
  );
};

export default PublicEventDetailPage;
