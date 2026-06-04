import React, { useEffect, useState } from 'react';
import { ArrowRight, BellDot, Bookmark, Check, Sparkles, X } from 'lucide-react';
import api from '../utils/api';
import { useApp } from '../context/AppContext';

const UpdateTour = () => {
  const { user, setActiveTab, setSelectedThreadId, toggleBookmark } = useApp();
  const [updates, setUpdates] = useState([]);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.get('/updates/unread').then((res) => {
      if (res.data.length > 0) {
        setUpdates(res.data);
        setOpen(true);
      }
    }).catch(() => {});
  }, [user?.id]);

  if (!open || updates.length === 0) return null;
  const update = updates[index];

  const markCurrent = async () => {
    await api.post(`/updates/${update._id}/view`).catch(() => {});
    if (index < updates.length - 1) {
      setIndex((current) => current + 1);
    } else {
      setOpen(false);
    }
  };

  const explore = async () => {
    await api.post(`/updates/${update._id}/view`).catch(() => {});
    await api.post(`/updates/${update._id}/metric`, { metric: 'explores' }).catch(() => {});
    if (update.threadId?._id || update.threadId) {
      setSelectedThreadId(update.threadId._id || update.threadId);
    } else {
      setActiveTab('updates');
    }
    setOpen(false);
  };

  const bookmark = async () => {
    if (!update.threadId?._id) return;
    await toggleBookmark(update.threadId._id, update.threadId);
    api.post(`/updates/${update._id}/metric`, { metric: 'bookmarks' }).catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-[#08090f]/95 p-6 shadow-2xl backdrop-blur-3xl animate-scale-in">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(99,102,241,0.25),transparent_35%),radial-gradient(circle_at_90%_10%,rgba(6,182,212,0.16),transparent_30%)]" />
        <div className="relative z-10">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-cyan-300">
              <BellDot className="h-4 w-4" />
              Update tour
            </div>
            <button onClick={() => setOpen(false)} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-5 flex gap-1.5">
            {updates.map((item, i) => (
              <span key={item._id} className={`h-1.5 flex-1 rounded-full ${i <= index ? 'bg-cyan-300' : 'bg-white/10'}`} />
            ))}
          </div>
          <Sparkles className="mb-4 h-6 w-6 text-violet-300" />
          <h2 className="text-xl font-black text-white">{update.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{update.reason}</p>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Latest guidance</p>
            <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-slate-300">{update.newContent?.answer || update.newContent?.body || update.newContent?.title}</p>
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button onClick={bookmark} disabled={!update.threadId?._id} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 disabled:opacity-40">
              <Bookmark className="h-4 w-4" /> Bookmark
            </button>
            <button onClick={markCurrent} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10">
              <Check className="h-4 w-4" /> Mark read
            </button>
            <button onClick={explore} className="soft-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black">
              Explore <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateTour;
