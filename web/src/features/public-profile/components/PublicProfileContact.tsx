import React from 'react';
import { Mail, Linkedin, Github, MapPin } from 'lucide-react';
import { safeUrl } from '@/shared/utils/safeUrl';
import { PublicStudent, PublicProfileFields } from '../types';

interface PublicProfileContactProps {
  student: PublicStudent;
  profile: PublicProfileFields;
}

export const PublicProfileContact: React.FC<PublicProfileContactProps> = ({
  student,
  profile,
}) => {
  return (
    <section id="contact" className="scroll-mt-24 pt-6">
      <div className="mb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">Connect</span>
        <h2 className="mt-1 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-ink">Get In Touch</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Open to career opportunities, collaborations, and discussions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Email Card */}
        {student.email && safeUrl(`mailto:${student.email}`) ? (
          <a
            href={safeUrl(`mailto:${student.email}`)}
            className="rounded-2xl border border-edge/80 bg-surface/60 p-5 backdrop-blur-sm hover:border-edge/40 hover:-translate-y-0.5 transition-all block space-y-2 group"
          >
            <div className="p-2 rounded-xl bg-surface-inset/10 text-ink-muted w-fit group-hover:bg-surface-inset/20 transition-colors">
              <Mail size={18} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">Email</span>
              <p className="text-xs font-semibold text-ink truncate mt-0.5">
                {student.email}
              </p>
            </div>
          </a>
        ) : null}

        {/* LinkedIn Card */}
        {safeUrl(profile.linkedinUrl) ? (
          <a
            href={safeUrl(profile.linkedinUrl)}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-edge/80 bg-surface/60 p-5 backdrop-blur-sm hover:border-edge/40 hover:-translate-y-0.5 transition-all block space-y-2 group"
          >
            <div className="p-2 rounded-xl bg-surface-inset/10 text-ink-muted w-fit group-hover:bg-surface-inset/20 transition-colors">
              <Linkedin size={18} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">LinkedIn</span>
              <p className="text-xs font-semibold text-ink truncate mt-0.5">
                Connect on LinkedIn
              </p>
            </div>
          </a>
        ) : null}

        {/* GitHub Card */}
        {safeUrl(profile.githubUrl) ? (
          <a
            href={safeUrl(profile.githubUrl)}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-edge/80 bg-surface/60 p-5 backdrop-blur-sm hover:border-edge/40 hover:-translate-y-0.5 transition-all block space-y-2 group"
          >
            <div className="p-2 rounded-xl bg-surface-inset/10 text-ink-muted w-fit group-hover:bg-surface-inset/20 transition-colors">
              <Github size={18} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">GitHub</span>
              <p className="text-xs font-semibold text-ink truncate mt-0.5">
                Explore Repositories
              </p>
            </div>
          </a>
        ) : null}

        {/* Location Card */}
        <div className="rounded-2xl border border-edge/80 bg-surface/60 p-5 backdrop-blur-sm space-y-2">
          <div className="p-2 rounded-xl bg-surface-inset/10 text-ink-muted w-fit">
            <MapPin size={18} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">Campus Location</span>
            <p className="text-xs font-semibold text-ink mt-0.5 leading-snug">
              SASI Institute, Tadepalligudem
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
