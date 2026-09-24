import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { StudentProfile, Notification, Event } from '../types';
import { Video, FileText, Calendar, Bell, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage = () => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.getProfile()
      .then(data => setProfile(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="h-32 bg-slate-200 rounded"></div>
            <div className="grid grid-cols-2 gap-6">
              <div className="h-40 bg-slate-200 rounded"></div>
              <div className="h-40 bg-slate-200 rounded"></div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-10 bg-white rounded-lg shadow border border-[#E2E8F0]">
        <AlertCircle className="w-10 h-10 text-elite-red mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#0B192C]">Failed to load dashboard</h2>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-elite-red text-white rounded-md text-sm">Retry</button>
      </div>
    );
  }

  const completionPoints = [
    !!profile.photoUrl,
    !!profile.bio,
    (profile.skills && profile.skills.length > 0),
    !!profile.githubUrl || !!profile.linkedinUrl,
    false, // placeholder for video status
    false, // placeholder for resume status
  ];
  const completion = Math.round((completionPoints.filter(Boolean).length / completionPoints.length) * 100);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#0B192C]">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-[#E2E8F0]">
            <h2 className="text-lg font-semibold text-[#0B192C] mb-4">Profile Completion</h2>
            <div className="flex justify-between text-sm mb-1 text-slate-600">
              <span>{completion}% Complete</span>
              <span>{completion === 100 ? 'All done!' : 'Keep going!'}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5">
              <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${completion}%` }}></div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-[#E2E8F0] flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                <Video className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="font-medium text-[#0B192C] mb-1">Intro Video</h3>
              <p className="text-sm text-slate-500 mb-4">
                <span className="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded text-xs font-medium text-slate-600">
                  <Clock className="w-3.5 h-3.5"/> Missing
                </span>
              </p>
              <Link to="/video" className="mt-auto w-full py-2 bg-slate-50 hover:bg-slate-100 text-sm font-medium rounded-md text-[#0B192C] transition-colors border border-[#E2E8F0]">Upload Video</Link>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-[#E2E8F0] flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                <FileText className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="font-medium text-[#0B192C] mb-1">Resume</h3>
              <p className="text-sm text-slate-500 mb-4">
                <span className="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded text-xs font-medium text-slate-600">
                  <Clock className="w-3.5 h-3.5"/> Missing
                </span>
              </p>
              <Link to="/resume" className="mt-auto w-full py-2 bg-slate-50 hover:bg-slate-100 text-sm font-medium rounded-md text-[#0B192C] transition-colors border border-[#E2E8F0]">Upload Resume</Link>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-[#E2E8F0] flex flex-col">
            <div className="p-4 border-b border-[#E2E8F0] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-elite-red" />
              <h2 className="font-semibold text-[#0B192C]">Upcoming Events</h2>
            </div>
            <div className="p-4 flex-1">
              <div className="text-sm text-slate-500 text-center py-6 flex flex-col items-center gap-2">
                <Calendar className="w-8 h-8 text-slate-300" />
                No upcoming events found.
              </div>
            </div>
            <Link to="/events" className="p-3 text-center border-t border-[#E2E8F0] text-sm text-elite-red hover:bg-red-50 font-medium transition-colors">View All Events</Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-[#E2E8F0] flex flex-col">
            <div className="p-4 border-b border-[#E2E8F0] flex items-center gap-2">
              <Bell className="w-5 h-5 text-elite-red" />
              <h2 className="font-semibold text-[#0B192C]">Recent Notifications</h2>
            </div>
            <div className="p-4 flex-1">
              <div className="text-sm text-slate-500 text-center py-6 flex flex-col items-center gap-2">
                <Bell className="w-8 h-8 text-slate-300" />
                No new notifications.
              </div>
            </div>
            <Link to="/notifications" className="p-3 text-center border-t border-[#E2E8F0] text-sm text-elite-red hover:bg-red-50 font-medium transition-colors">View All</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
