import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, Sparkles } from 'lucide-react';
import { TypewriterText } from '@/shared/ui';
import { AsymGrid, AsymFeatured, AsymSide, AsymAccent } from '@/shared/layout/AsymLayout';
import { HomeSpotlightCard } from './HomeSpotlightCard';

interface HomeHeroProps {
  onSignIn: () => void;
  loading: boolean;
  featuredStudents: any[];
  error?: string | null;
  onRetry?: () => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  onSignIn,
  loading,
  featuredStudents,
  error,
  onRetry,
}) => {
  return (
    <section className="border-b border-edge bg-surface" data-reveal>
      <div className="mx-auto max-w-canvas px-6 pb-16 pt-14 sm:px-10 sm:pb-20 sm:pt-20">
        <AsymGrid className="items-center gap-10 lg:gap-14">
          <AsymFeatured cols="7">
            <span className="badge badge-brand mb-3 inline-flex items-center gap-1.5 uppercase tracking-widest text-[11px] font-bold">
              <Sparkles size={13} aria-hidden="true" />
              Department of Information Technology
            </span>
            <h1 className="mt-2 font-heading text-headline-xl-mobile font-extrabold tracking-tight text-ink sm:text-headline-xl">
              <TypewriterText
                text="Meet the department, one student at a time."
                storageKey="elite-home-title-played"
              />
            </h1>
            <p className="mt-5 max-w-[54ch] text-body-lg text-ink-secondary leading-relaxed">
              Browse verified profiles, explore student portfolios, and register for department
              events. Sign in with your institutional credentials to publish your own.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onSignIn}
                className="btn btn-primary min-h-[44px] px-6 py-2.5 inline-flex items-center justify-center gap-2 shadow-sm card-lift"
              >
                <span>Student Sign In</span>
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
              </button>
              <Link
                to="/students"
                className="btn btn-secondary min-h-[44px] px-5 py-2.5 inline-flex items-center justify-center gap-2"
              >
                <Users size={16} strokeWidth={1.75} aria-hidden="true" />
                <span>Browse directory</span>
              </Link>
            </div>
            <p className="mt-4 text-label-md text-ink-muted">
              Sign in with your verified college Google account (@sasi.ac.in)
            </p>
          </AsymFeatured>

          <AsymSide cols="5">
            <AsymAccent className="p-1.5 sm:p-2 card-lift">
              <HomeSpotlightCard
                loading={loading}
                featuredStudents={featuredStudents}
                error={error}
                onRetry={onRetry}
              />
            </AsymAccent>
          </AsymSide>
        </AsymGrid>
      </div>
    </section>
  );
};
