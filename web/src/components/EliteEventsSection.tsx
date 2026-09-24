import React, { useEffect, useState } from 'react';
import { Calendar, Tag, ArrowRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface EventItem {
  id: string;
  name: string;
  slug: string;
  year: number;
  status: string;
  createdAt: string;
}

export const EliteEventsSection: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    api
      .getPublicEvents()
      .then((data) => {
        if (mounted) {
          setEvents(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        console.error('Failed to load public events:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const scrollToLogin = () => {
    const el = document.getElementById('login-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="events-section" aria-labelledby="events-title" className="py-16 sm:py-20 bg-white border-t border-neutral-200/80 text-left">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        {/* Section Header */}
        <div className="max-w-2xl space-y-2 mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-elite-red uppercase">
            <Calendar className="w-3.5 h-3.5" />
            <span>ELITE EVENTS</span>
          </div>
          <h2 id="events-title" className="text-3xl sm:text-4xl font-extrabold text-elite-black font-display tracking-tight">
            Department Activities
          </h2>
          <p className="text-sm text-neutral-600 leading-relaxed">
            Discover upcoming department events and opportunities to participate.
          </p>
        </div>

        {/* Content Display */}
        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <div className="w-8 h-8 border-2 border-elite-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {events.map((evt) => {
              const isOpen = evt.status === 'OPEN';
              const createdDate = new Date(evt.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              return (
                <div
                  key={evt.id}
                  className="bg-neutral-50 border border-neutral-200/90 rounded-2xl p-6 sm:p-7 flex flex-col justify-between hover:bg-white hover:border-neutral-300 hover:shadow-md transition-all group"
                >
                  <div className="space-y-4">
                    {/* Status Badge & Year */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                          isOpen
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                            : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                        }`}
                      >
                        {isOpen ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Clock className="w-3 h-3 text-neutral-500" />
                        )}
                        <span>{evt.status}</span>
                      </span>

                      <span className="text-xs font-mono font-bold text-neutral-500 bg-neutral-200/70 px-2.5 py-0.5 rounded-md">
                        {evt.year} Edition
                      </span>
                    </div>

                    {/* Event Name */}
                    <div>
                      <h3 className="text-lg font-bold text-elite-black font-display tracking-tight group-hover:text-elite-red transition-colors">
                        {evt.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-2 font-mono">
                        <Tag className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Slug: {evt.slug}</span>
                      </div>
                    </div>

                    {/* Date Details */}
                    <div className="p-3 bg-white border border-neutral-200/70 rounded-xl space-y-1 text-xs text-neutral-600">
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-400">Announced</span>
                        <span className="font-semibold text-neutral-700">{createdDate}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-400">Eligibility</span>
                        <span className="font-semibold text-neutral-700">IT Students</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action */}
                  <div className="pt-5 mt-4 border-t border-neutral-200/70">
                    <button
                      type="button"
                      onClick={scrollToLogin}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-elite-red text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      <span>Sign In to Participate</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty state */
          <div className="bg-neutral-50 border border-neutral-200/90 rounded-2xl p-10 sm:p-14 text-center max-w-xl mx-auto space-y-3">
            <AlertCircle className="w-10 h-10 text-neutral-400 mx-auto" />
            <h3 className="text-base font-bold text-elite-black font-display">
              No upcoming events.
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Check back soon for new department activities, technical competitions, and workshops organized by ELITE.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
