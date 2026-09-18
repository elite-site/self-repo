import React, { useState } from 'react';
import { UserRound, Folder, CheckCircle2, Users } from 'lucide-react';
import { AdminStats } from '../types';

interface EventHomeViewProps {
  stats: AdminStats | null;
}

const EVENT = {
  name: 'Self Introduction Auditions',
  slug: 'self-introduction',
  year: 2026,
  status: 'OPEN' as const,
};

const mediaInfo = {
  icon: UserRound,
  maxFiles: '1 Video File',
  maxSize: 'Video: 80 MB',
  formats: 'MP4, MOV, WEBM',
  driveFolder: `Self Introduction/${EVENT.year}`,
  categoryTitle: 'Self Introduction Auditions',
  description: 'Personal introduction clips evaluated on clarity, confidence, and communication.',
};

export const EventHomeView: React.FC<EventHomeViewProps> = ({ stats }) => {
  const [activeTab, setActiveTab] = useState<'about' | 'guidelines' | 'dates' | 'contact'>('about');

  const IconComponent = mediaInfo.icon;

  return (
    <div className="space-y-8 text-left max-w-6xl mx-auto">
      {/* 1. HEADER */}
      <div className="border-b border-neutral-200 pb-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-mono font-bold tracking-widest text-elite-red uppercase">
            Event Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-elite-black font-display tracking-tight mt-0.5">
            Event Home
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Manage event details, media guidelines, and drive storage settings.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Status: OPEN</span>
        </span>
      </div>

      {/* 2. HERO BANNER CARD */}
      <div className="relative bg-gradient-to-r from-neutral-900 via-neutral-800 to-elite-black rounded-2xl p-6 sm:p-8 text-white overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white/90 text-xs font-semibold">
            <IconComponent className="w-4 h-4 text-red-400" />
            <span>{EVENT.year} Official Competition</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-display text-white">
            {EVENT.name} {EVENT.year}
          </h2>

          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-normal">
            {mediaInfo.description}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-neutral-300">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-red-400" />
              <span>{stats?.totalSubmissions || 0} Total Submissions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Folder className="w-4 h-4 text-red-400" />
              <span>Drive: {mediaInfo.driveFolder}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. EVENT PARAMETER GRID CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Event Name */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Event Name
          </div>
          <div className="text-sm font-bold text-elite-black truncate">
            {EVENT.name} {EVENT.year}
          </div>
        </div>

        {/* Event Type */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Event Type
          </div>
          <div className="text-sm font-bold text-elite-black">
            Department of IT
          </div>
        </div>

        {/* Year */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Academic Year
          </div>
          <div className="text-sm font-bold text-elite-black font-mono">
            {EVENT.year}
          </div>
        </div>

        {/* Status */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Status
          </div>
          <div className="text-sm font-bold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Open</span>
          </div>
        </div>

        {/* Total Submissions */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Total Submissions
          </div>
          <div className="text-2xl font-extrabold text-elite-black font-display">
            {stats?.totalSubmissions || 0}
          </div>
        </div>

        {/* Max Files */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Media Limits
          </div>
          <div className="text-xs font-bold text-elite-black">
            {mediaInfo.maxFiles}
          </div>
        </div>

        {/* Max Size */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Max File Size
          </div>
          <div className="text-xs font-bold text-elite-black font-mono">
            {mediaInfo.maxSize}
          </div>
        </div>

        {/* Allowed Formats */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm space-y-1">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Allowed Formats
          </div>
          <div className="text-xs font-bold text-neutral-700 font-mono truncate">
            {mediaInfo.formats}
          </div>
        </div>
      </div>

      {/* 4. EVENT DETAILS SUB-TABS */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
        <div className="flex border-b border-neutral-200 bg-[#fafafa]">
          <button
            onClick={() => setActiveTab('about')}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
              activeTab === 'about'
                ? 'bg-white text-elite-red border-b-2 border-elite-red'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            About Event
          </button>
          <button
            onClick={() => setActiveTab('guidelines')}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
              activeTab === 'guidelines'
                ? 'bg-white text-elite-red border-b-2 border-elite-red'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Guidelines
          </button>
          <button
            onClick={() => setActiveTab('dates')}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
              activeTab === 'dates'
                ? 'bg-white text-elite-red border-b-2 border-elite-red'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Important Dates
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
              activeTab === 'contact'
                ? 'bg-white text-elite-red border-b-2 border-elite-red'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Contact
          </button>
        </div>

        <div className="p-6 text-xs text-neutral-700 space-y-4">
          {activeTab === 'about' && (
            <div className="space-y-3 leading-relaxed">
              <p className="font-medium text-neutral-900">
                {EVENT.name} is the official platform for students of the Department of Information Technology (IT) to showcase confident, clear, and memorable personal introductions.
              </p>
              <ul className="space-y-2 text-neutral-600 list-disc pl-5">
                <li>Record a single self-introduction video clip with clear speech.</li>
                <li>Demonstrate confidence, personality, and impressive stage presence.</li>
                <li>Open exclusively to Information Technology students across 2nd, 3rd, and 4th years.</li>
                <li>Best entries will be shortlisted for the official ELITE core team.</li>
              </ul>
            </div>
          )}

          {activeTab === 'guidelines' && (
            <div className="space-y-3 leading-relaxed">
              <p className="font-semibold text-neutral-900">Submission Requirements:</p>
              <div className="bg-[#fafafa] border border-neutral-200 rounded-lg p-4 font-mono text-[11px] space-y-1">
                <div>• Maximum file size per upload: {mediaInfo.maxSize}</div>
                <div>• Accepted Formats: {mediaInfo.formats}</div>
                <div>• Recommended duration: 1 to 3 minutes</div>
                <div>• Storage Path: Google Drive / {mediaInfo.driveFolder}</div>
                <div>• Scoped duplicate check by roll number and email.</div>
              </div>
            </div>
          )}

          {activeTab === 'dates' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-[#fafafa] rounded-lg border border-neutral-200">
                <span className="font-semibold">Submissions Open</span>
                <span className="font-mono text-neutral-600">Active Now</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#fafafa] rounded-lg border border-neutral-200">
                <span className="font-semibold">Evaluation Phase</span>
                <span className="font-mono text-neutral-600">Ongoing</span>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-1">
              <div className="font-bold text-neutral-900">ELITE Coordination Team</div>
              <div className="text-neutral-500 font-mono">Department of Information Technology</div>
              <div className="text-neutral-500 font-mono">SASI Institute of Technology & Engineering</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};