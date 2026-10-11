import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';

export const HomeEventsBand: React.FC = () => {
  return (
    <section aria-labelledby="events-band-title" className="border-t border-brand-soft bg-brand-soft">
      <div className="mx-auto max-w-prose px-6 py-14 text-center sm:px-10 sm:py-16">
        <h2
          id="events-band-title"
          className="font-heading text-headline-lg-mobile font-extrabold tracking-tight text-ink sm:text-headline-lg"
        >
          Department events are open to everyone
        </h2>
        <p className="mt-3 text-body-md text-ink-secondary">
          Browse the schedule, eligibility, and venue details before you sign in. Registration
          opens to students only.
        </p>
        <Link to="/events" className="btn btn-primary min-h-[44px] mt-7 px-5 py-2.5">
          <Calendar size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>Browse department events</span>
        </Link>
      </div>
    </section>
  );
};
