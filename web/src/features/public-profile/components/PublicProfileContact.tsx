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
        <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Connect</span>
        <h2 className="mt-1 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">Get In Touch</h2>
        <p className="mt-1 text-sm text-slate-400">
          Open to career opportunities, collaborations, and discussions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Email Card */}
        {student.email && safeUrl(`mailto:${student.email}`) ? (
          <a
            href={safeUrl(`mailto:${student.email}`)}
            className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm hover:border-rose-500/40 hover:-translate-y-0.5 transition-all block space-y-2 group"
          >
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 w-fit group-hover:bg-rose-500/20 transition-colors">
              <Mail size={18} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Email</span>
              <p className="text-xs font-semibold text-white truncate mt-0.5">
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
            className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm hover:border-rose-500/40 hover:-translate-y-0.5 transition-all block space-y-2 group"
          >
            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 w-fit group-hover:bg-pink-500/20 transition-colors">
              <Linkedin size={18} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">LinkedIn</span>
              <p className="text-xs font-semibold text-white truncate mt-0.5">
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
            className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm hover:border-rose-500/40 hover:-translate-y-0.5 transition-all block space-y-2 group"
          >
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 w-fit group-hover:bg-indigo-500/20 transition-colors">
              <Github size={18} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">GitHub</span>
              <p className="text-xs font-semibold text-white truncate mt-0.5">
                Explore Repositories
              </p>
            </div>
          </a>
        ) : null}

        {/* Location Card */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-sm space-y-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit">
            <MapPin size={18} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Campus Location</span>
            <p className="text-xs font-semibold text-white mt-0.5 leading-snug">
              SASI Institute, Tadepalligudem
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
