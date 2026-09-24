import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Notification } from '../types';
import { Bell, Loader2, Check } from 'lucide-react';

export const NotificationsPage = () => {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getNotifications().then(data => setNotifs(data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-slate-400"/></div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#0B192C]">Notifications</h1>
        <button className="text-sm font-medium text-slate-500 hover:text-elite-red flex items-center gap-1"><Check className="w-4 h-4"/> Mark all read</button>
      </div>
      
      {notifs.length === 0 ? (
        <div className="text-center py-16 bg-white border border-[#E2E8F0] rounded-xl">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-[#0B192C]">All caught up!</h3>
          <p className="text-slate-500 text-sm">You have no new notifications.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          {notifs.map(n => (
            <div key={n.id} className={`p-4 border-b border-[#E2E8F0] last:border-0 hover:bg-slate-50 cursor-pointer transition-colors ${!n.isRead ? 'bg-slate-50/50' : ''}`}>
              <div className="flex gap-4">
                <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${n.isRead ? 'bg-transparent' : 'bg-elite-red'}`}></div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-400 uppercase">{n.type}</span>
                    <span className="text-xs text-slate-400">• {new Date(n.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h4 className={`text-sm ${n.isRead ? 'text-slate-700 font-medium' : 'text-[#0B192C] font-bold'}`}>{n.title}</h4>
                  <p className="text-sm text-slate-500 mt-1">{n.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
