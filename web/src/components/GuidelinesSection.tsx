import React from 'react';
import { Video, ShieldCheck, Clock, FileCheck, MessageCircle } from 'lucide-react';

export const GuidelinesSection: React.FC = () => {
  return (
    <section id="guidelines" aria-labelledby="guidelines-title" className="max-w-7xl mx-auto px-6 sm:px-10 py-12 border-t border-neutral-100 text-left">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-elite-red flex items-center justify-center font-bold">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 id="guidelines-title" className="text-2xl font-extrabold text-elite-black font-display tracking-tight">
              Self-Introduction Guidelines
            </h2>
            <p className="text-xs text-neutral-500">
              Please review these guidelines prior to uploading your introduction clip.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-elite-black">
              <Clock className="w-4 h-4 text-elite-red" />
              <span>Clip Duration</span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Introduction clip should be between 1 to 3 minutes in length. A solo introduction with clear speech is preferred.
            </p>
          </div>

          <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-elite-black">
              <Video className="w-4 h-4 text-elite-red" />
              <span>Format & Quality</span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Video: MP4, MOV, WEBM (Max 25MB). Ensure clear audio and good lighting.
            </p>
          </div>

          <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-elite-black">
              <ShieldCheck className="w-4 h-4 text-elite-red" />
              <span>One Entry Per Student</span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Only one introduction video per roll number is accepted. Please double-check your details before submitting.
            </p>
          </div>

          <div className="bg-elite-black text-white border border-neutral-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
              <MessageCircle className="w-4 h-4 text-elite-red" />
              <span>A Natural Approach</span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Introduce yourself, share your interests and personality, and speak at your own pace. There is no fixed script — no rehearsed or AI-generated introduction.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
