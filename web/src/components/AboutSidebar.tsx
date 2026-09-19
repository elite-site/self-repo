import React from 'react';
import { Mic, Sparkles, Smile } from 'lucide-react';

export const AboutSidebar: React.FC = () => {
  return (
    <aside id="about" className="space-y-6 text-left">
      {/* CARD 1: ABOUT IT-ASSOCIATIONS SELF INTRODUCTION */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 text-elite-red flex items-center justify-center font-bold">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-elite-black font-display tracking-tight">
              About IT-Associations Self Introduction
            </h3>
            <p className="text-[11px] text-neutral-500 font-semibold uppercase">
              Department of Information Technology
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
          IT-Associations Self Introduction is an initiative of the Department of Information
          Technology — a simple, personal exercise in communication. Introduce
          yourself, your interests, and your personality, clearly and naturally.
        </p>

        <div className="space-y-2 pt-2 border-t border-neutral-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-elite-black">
            <Sparkles className="w-4 h-4 text-elite-red" />
            <span>Natural, Unrehearsed Speech</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-elite-black">
            <Smile className="w-4 h-4 text-elite-red" />
            <span>Confidence Without a Script</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-elite-black">
            <Mic className="w-4 h-4 text-elite-red" />
            <span>Speak in Your Own Words</span>
          </div>
        </div>
      </div>

      {/* CARD 2: WHAT MAKES YOUR INTRODUCTION STAND OUT */}
      <div className="bg-neutral-900 text-white rounded-3xl p-6 sm:p-8 space-y-4 shadow-lg border border-neutral-800">
        <h3 className="text-base font-extrabold font-display tracking-tight text-white uppercase border-b border-neutral-800 pb-3">
          What Makes Your Introduction Stand Out
        </h3>
        <ul className="space-y-3 text-xs text-neutral-300">
          <li className="flex items-start gap-2">
            <span className="text-elite-red font-bold">•</span>
            <span>Clarity of speech, in your natural voice</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-elite-red font-bold">•</span>
            <span>An honest, unrehearsed personality</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-elite-red font-bold">•</span>
            <span>Comfortable, genuine confidence</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-elite-red font-bold">•</span>
            <span>An introduction that sounds like you</span>
          </li>
        </ul>
      </div>
    </aside>
  );
};