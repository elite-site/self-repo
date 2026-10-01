import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, CheckCircle2, AlertCircle, ArrowRight, Search } from 'lucide-react';
import { api } from '../../services/api';
import { Event } from '../../types';
import { StudentSession } from '../../types';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { BrandedLoading } from '../../components/BrandedLoading';

interface PublicEventsPageProps {
  session?: StudentSession | null;
  onLogout?: () => void;
}

const OPEN_STATUSES = new Set(['OPEN']);

/**
 * Read-only view of department events for visitors who are not signed in.
 *
 * A signed-in student gets the full `EventsPage` instead, which adds
 * registration and team management. Both are served from the same `/events`
 * route — see the session-aware wrapper in `App.tsx` — so a public event link
 * resolves for everyone instead of bouncing a visitor into Google SSO.
 */
export const PublicEventsPage: React.FC<PublicEventsPageProps> = ({ session, onLogout }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;

    api
      .getPublicEvents()
      .then((data) => {
        if (mounted && Array.isArray(data)) setEvents(data);
      })
      .catch((err) => {
        console.error('Failed to load public events:', err);
        if (mounted) setError('Could not load department events. Please retry.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const visibleEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return events;
    return events.filter(
      (evt) =>
        evt.title?.toLowerCase().includes(term) ||
        evt.description?.toLowerCase().includes(term) ||
        evt.eligibility?.toLowerCase().includes(term),
    );
  }, [events, search]);

  const formatDate = (value?: string | null) => {
    if (!value) return 'To be announced';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'To be announced';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleSignIn = () => {
    window.location.href = api.getOAuthAuthorizeUrl();
  };

  return (
    <div className="min-h-[100dvh] bg-surface-canvas text-ink flex flex-col justify-between">
      <Navbar session={session} onLogout={onLogout} />

      <main className="flex-1 px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-soft border border-brand-soft text-brand-soft-text text-xs font-bold uppercase tracking-wider" aria-label="Department events badge">
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Department Events</span>
            </div>
            <h1 className="text-headline-xl font-extrabold text-ink font-heading tracking-tight">
              Upcoming Activities
            </h1>
            <p className="text-body-sm text-ink-secondary leading-relaxed">
              Technical competitions, hackathons and workshops run by the Department of Information
              Technology. Sign in with your college account to register.
            </p>
          </div>

          <div className="relative max-w-sm">
            <label htmlFor="event-search" className="sr-only">Search events</label>
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" aria-hidden="true" />
            <input
              id="event-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events"
              className="input pl-10"
            />
          </div>

          {loading ? (
            <BrandedLoading fullScreen={false} message="Loading events..." />
          ) : error ? (
            <div className="p-6 surface border border-status-rejected/20 rounded-lg text-status-rejected text-body-sm" role="alert">
              {error}
            </div>
          ) : visibleEvents.length === 0 ? (
            <div className="surface p-10 sm:p-14 text-center max-w-xl mx-auto space-y-3">
              <AlertCircle className="w-10 h-10 text-ink-muted mx-auto" aria-hidden="true" />
              <h2 className="text-body-md font-bold text-ink font-heading">
                {search ? 'No events match your search.' : 'No upcoming events.'}
              </h2>
              <p className="text-label-sm text-ink-secondary leading-relaxed">
                Check back soon for new department activities, technical competitions, and workshops.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleEvents.map((evt) => {
                const isOpen = OPEN_STATUSES.has(evt.status ?? 'OPEN');
                return (
                  <div
                    key={evt.id}
                    className="surface p-6 flex flex-col justify-between hover:border-brand hover:shadow-card-hover transition-colors"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            isOpen
                              ? 'bg-status-bg-approved text-status-approved border border-status-bg-approved'
                              : 'bg-surface-sunken text-ink-muted border border-edge'
                          }`}
                        >
                          {isOpen ? (
                            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                          ) : (
                            <Clock className="w-3 h-3" aria-hidden="true" />
                          )}
                          <span>{isOpen ? 'Open' : (evt.status ?? 'Closed')}</span>
                        </span>
                        {evt.type && (
                          <span className="text-[10px] font-bold text-ink-secondary bg-surface-sunken border border-edge px-2 py-0.5 rounded-md uppercase tracking-wider">
                            {evt.type}
                          </span>
                        )}
                      </div>

                      <h2 className="text-body-md font-bold text-ink font-heading leading-snug">
                        {evt.title}
                      </h2>

                      {evt.description && (
                        <p className="text-label-sm text-ink-secondary leading-relaxed line-clamp-3">
                          {evt.description}
                        </p>
                      )}

                      <div className="p-3 bg-surface-sunken border border-edge rounded-lg space-y-1.5 text-label-sm text-ink-secondary">
                        <div className="flex justify-between items-center">
                          <span className="text-ink-muted">Announced</span>
                          <span className="font-semibold text-ink">{formatDate(evt.date)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-ink-muted">Eligibility</span>
                          <span className="font-semibold text-ink">
                            {evt.eligibility || 'All students'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-5 mt-4 border-t border-edge space-y-2">
                      <Link
                        to={`/events/${evt.id}`}
                        className="w-full btn btn-primary"
                      >
                        <span>View Event Details</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </Link>
                      <button
                        type="button"
                        onClick={handleSignIn}
                        className="w-full text-label-sm font-semibold text-ink-secondary hover:text-brand transition-colors cursor-pointer"
                      >
                        Sign in to register
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PublicEventsPage;
