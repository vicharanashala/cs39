import React, { useEffect, useMemo, useState } from 'react';
import { BellDot, Bookmark, CalendarDays, Eye, FileDiff, Megaphone, Pin, Sparkles, X } from 'lucide-react';
import api from '../utils/api';
import { useApp } from '../context/AppContext';

const badgeStyles = {
  new: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300',
  updated: 'border-cyan-500/20 bg-cyan-500/5 text-cyan-600 dark:border-cyan-400/30 dark:bg-cyan-400/10 dark:text-cyan-300',
  important: 'border-amber-500/20 bg-amber-500/5 text-amber-600 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300',
  announcement: 'border-violet-500/20 bg-violet-500/5 text-violet-600 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-300'
};

const formatDate = (value) => new Date(value).toLocaleString('en-US', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

const DiffBlock = ({ label, oldText, newText }) => (
  <div className="grid gap-3 md:grid-cols-2">
    <div className="rounded-2xl border border-rose-500/10 bg-rose-500/[0.02] dark:border-rose-400/15 dark:bg-rose-400/[0.04] p-4">
      <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-300">Previous {label}</p>
      <p className="whitespace-pre-line text-xs leading-relaxed text-slate-500 dark:text-slate-400">{oldText || 'No previous content recorded.'}</p>
    </div>
    <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.02] dark:border-emerald-400/15 dark:bg-emerald-400/[0.05] p-4">
      <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-300">Current {label}</p>
      <p className="whitespace-pre-line text-xs leading-relaxed text-slate-700 dark:text-slate-200">{newText || 'No new content recorded.'}</p>
    </div>
  </div>
);

const WhatsNew = () => {
  const { setSelectedThreadId, toggleBookmark, showAlert } = useApp();
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchUpdates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/updates');
      setUpdates(res.data);
    } catch (error) {
      showAlert('Could not load FAQ updates.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  const visibleUpdates = useMemo(() => (
    filter === 'all' ? updates : updates.filter((update) => update.changeType === filter)
  ), [filter, updates]);

  const openUpdate = async (update) => {
    setSelected(update);
    setUpdates((current) => current.map((item) => item._id === update._id ? { ...item, hasViewed: true } : item));
    api.post(`/updates/${update._id}/view`).catch(() => { });
  };

  const exploreFAQ = (update) => {
    if (update.threadId?._id || update.threadId) {
      api.post(`/updates/${update._id}/metric`, { metric: 'explores' }).catch(() => { });
      setSelectedThreadId(update.threadId._id || update.threadId);
    }
  };

  const bookmarkFAQ = async (update) => {
    if (!update.threadId?._id) return;
    await toggleBookmark(update.threadId._id, update.threadId);
    api.post(`/updates/${update._id}/metric`, { metric: 'bookmarks' }).catch(() => { });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 font-sans">
      <section className="relative overflow-hidden rounded-2xl border border-amber-100/80 bg-white dark:border-white/10 dark:bg-slate-950/80 p-6 shadow-[0_2px_12px_rgba(224,122,21,0.06)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(224,122,21,0.03),transparent_50%)]" />
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50/80 text-amber-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-305 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest">
              <BellDot className="h-4 w-4" />
              Live FAQ Updates
            </div>
            <h1 className="mt-4 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">What's New</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Track official FAQ changes, admin announcements, and important updates.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['all', 'new', 'updated', 'important', 'announcement'].map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${filter === item
                    ? 'soft-primary'
                    : 'border border-slate-200/80 bg-white dark:border-white/10 dark:bg-white/5 text-slate-550 dark:text-slate-400 hover:border-amber-200 hover:text-amber-700 dark:hover:text-white'
                  }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-2xl border border-amber-100/60 bg-white dark:border-white/10 dark:bg-[#0b0c14]/70 p-12 text-center text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Loading update stream...
        </div>
      ) : visibleUpdates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-amber-100/80 bg-white dark:border-white/10 dark:bg-[#0b0c14]/70 p-12 text-center text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          No updates in this filter yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleUpdates.map((update) => (
            <button
              key={update._id}
              onClick={() => openUpdate(update)}
              className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 text-left shadow-[0_1px_4px_rgba(224,122,21,0.04)] transition-all duration-300 hover:border-amber-200 hover:shadow-[0_6px_20px_rgba(224,122,21,0.08)] dark:border-white/10 dark:bg-[#0b0c14]/75 dark:hover:border-cyan-400/30 dark:hover:bg-cyan-400/[0.04] card-hover cursor-pointer"
            >
              {!update.hasViewed && (
                <span className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-[#E07A15] dark:bg-cyan-300 shadow-[0_0_8px_rgba(224,122,21,0.5)]" />
              )}
              <div className="flex items-center gap-2">
                <span className={`rounded-xl border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${badgeStyles[update.changeType] || badgeStyles.updated}`}>
                  {update.changeType}
                </span>
                {update.isPinned && <Pin className="h-3.5 w-3.5 text-amber-500 dark:text-amber-300" />}
              </div>
              <h3 className="mt-4 line-clamp-2 text-sm font-black leading-snug text-slate-800 dark:text-white group-hover:text-[#E07A15] dark:group-hover:text-cyan-200 transition-colors">
                {update.title}
              </h3>
              <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {update.reason}
              </p>
              <div className="mt-5 flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {formatDate(update.createdAt)}</span>
                <span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> {update.metrics?.views || 0}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-amber-100/80 bg-white dark:border-white/10 dark:bg-[#08090f]/95 shadow-[0_20px_50px_rgba(224,122,21,0.08)] animate-slide-in">
            <div className="flex items-start justify-between gap-4 border-b border-amber-100/60 dark:border-white/10 p-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-xl border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${badgeStyles[selected.changeType] || badgeStyles.updated}`}>
                    {selected.changeType}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">By {selected.adminName}</span>
                </div>
                <h2 className="mt-3 text-xl font-black text-slate-900 dark:text-white">{selected.title}</h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-555 dark:text-slate-400">{selected.reason}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:text-white p-2 cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[60vh] space-y-4 overflow-y-auto p-5">
              <DiffBlock label="question" oldText={selected.oldContent?.title || selected.oldContent?.body} newText={selected.newContent?.title || selected.newContent?.body} />
              <DiffBlock label="answer" oldText={selected.oldContent?.answer} newText={selected.newContent?.answer} />
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-amber-100/60 dark:border-white/10 p-5">
              <button
                onClick={() => bookmarkFAQ(selected)}
                disabled={!selected.threadId?._id}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 px-4 py-2 text-xs font-bold disabled:opacity-40 cursor-pointer transition-colors"
              >
                <Bookmark className="h-4 w-4" /> Bookmark
              </button>
              <button
                onClick={() => exploreFAQ(selected)}
                disabled={!selected.threadId}
                className="soft-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black disabled:opacity-40 cursor-pointer"
              >
                <FileDiff className="h-4 w-4" /> Explore FAQ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsNew;
