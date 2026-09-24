import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Event } from '../types';
import { Calendar, Clock, MapPin, Users, Loader2, ArrowLeft } from 'lucide-react';

export const EventDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) api.getEvent(id).then(data => setEvent(data)).catch(() => setEvent(null)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-slate-400"/></div>;
  if (!event) return <div className="p-8 text-center text-red-500 font-bold">Event not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#0B192C]">
        <ArrowLeft className="w-4 h-4"/> Back to events
      </button>

      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
        <div className="h-48 bg-slate-800 p-8 flex flex-col justify-end relative">
          <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded text-sm font-bold shadow">REGISTRATION OPEN</div>
          <span className="text-elite-red font-bold text-sm tracking-wider uppercase mb-2">{event.type}</span>
          <h1 className="text-3xl font-extrabold text-white">{event.title}</h1>
        </div>
        
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#0B192C] mb-3">About this Event</h2>
              <p className="text-slate-600 leading-relaxed">{event.description}</p>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0B192C] mb-3">Eligibility</h2>
              <p className="text-slate-600 bg-slate-50 p-4 rounded-lg border border-slate-100">{event.eligibility}</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-elite-red mt-0.5"/>
                <div>
                  <p className="text-sm font-bold text-[#0B192C]">Date</p>
                  <p className="text-sm text-slate-600">{new Date(event.date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-elite-red mt-0.5"/>
                <div>
                  <p className="text-sm font-bold text-[#0B192C]">Deadline</p>
                  <p className="text-sm text-slate-600">{new Date(event.deadline).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <button className="w-full py-3 bg-elite-red hover:bg-red-700 text-white font-bold rounded-lg shadow-sm transition-colors">Register Now</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
