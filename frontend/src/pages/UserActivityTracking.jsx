import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  Zap
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../utils/api';

const ACTIVITY_OPTIONS = [
  ['all', 'All Activity'],
  ['view_thread', 'FAQ Views'],
  ['ask_question', 'Question Submissions'],
  ['attendance_request', 'Attendance Requests'],
  ['recorded_session_request', 'Recorded Sessions'],
  ['support_status_change', 'Status Changes'],
  ['support_follow_up', 'Admin Follow-ups'],
  ['proof_requested', 'Proof Requests'],
  ['support_reply', 'User Replies'],
  ['request_updated', 'Request Updates']
];

const STATUS_OPTIONS = ['all', 'Pending', 'In Review', 'Resolved', 'Rejected'];

const formatAction = (value) => (value || '').replace(/_/g, ' ');

const UserActivityTracking = () => {
  const { user, showAlert } = useApp();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [actionCounts, setActionCounts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 30 });
  const [filters, setFilters] = useState({
    q: '',
    userName: '',
    email: '',
    activityType: 'all',
    status: 'all',
    from: '',
    to: ''
  });

  const loadActivities = async (page = pagination.page || 1) => {
    if (user?.role !== 'admin') return;
    setLoading(true);
    try {
      const res = await api.get('/admin/user-activity', {
        params: {
          ...filters,
          page,
          limit: pagination.limit
        }
      });
      setActivities(res.data.activities || []);
      setActionCounts(res.data.actionCounts || []);
      setPagination(res.data.pagination || { page, pages: 1, total: 0, limit: 30 });
    } catch (error) {
      console.error('Activity tracking load error:', error.message);
      showAlert('Unable to load user activity tracking.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadActivities(1), 250);
    return () => clearTimeout(timer);
  }, [filters, user?.role]);

  const topCounts = useMemo(() => {
    return [...actionCounts].sort((a, b) => b.count - a.count).slice(0, 4);
  }, [actionCounts]);

  if (user?.role !== 'admin') {
    return (
      <div className="p-6 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Access denied. Admin operations only.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 font-sans">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-slate-200/50 bg-white/75 p-5 shadow-xl backdrop-blur-3xl dark:border-white/5 dark:bg-[#0b0c10]/45">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-500">
                <ShieldCheck className="h-4 w-4" />
                User Activity Tracking
              </div>
              <h1 className="mt-4 text-xl font-black text-slate-900 dark:text-white">Admin activity monitor</h1>
              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Track FAQ views, question submissions, attendance requests, recorded-session workflows, follow-ups, and status changes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadActivities(pagination.page)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/60 bg-white/70 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-600 shadow-sm dark:border-white/5 dark:bg-white/[0.03] dark:text-slate-300"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {topCounts.length ? topCounts.map(row => (
              <div key={row._id} className="rounded-2xl border border-slate-200/50 bg-slate-50/70 p-4 dark:border-white/5 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-500">{formatAction(row._id)}</p>
                  <Zap className="h-4 w-4 text-amber-500" />
                </div>
                <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">{row.count}</p>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-200/60 p-5 text-xs font-semibold text-slate-400 dark:border-white/10">
                No activity summary yet.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/50 bg-white/75 p-5 shadow-xl backdrop-blur-3xl dark:border-white/5 dark:bg-[#0b0c10]/45">
          <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr] xl:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={filters.q}
                onChange={(event) => setFilters(current => ({ ...current, q: event.target.value }))}
                placeholder="Search names, emails, actions, request titles, or query text"
                className="w-full rounded-xl border border-slate-200/50 bg-slate-50/80 py-3 pl-9 pr-3 text-xs font-semibold outline-none dark:border-white/5 dark:bg-[#07080b]/70"
              />
            </div>
            <input
              value={filters.userName}
              onChange={(event) => setFilters(current => ({ ...current, userName: event.target.value }))}
              placeholder="User name"
              className="rounded-xl border border-slate-200/50 bg-slate-50/80 px-3 py-3 text-xs outline-none dark:border-white/5 dark:bg-[#07080b]/70"
            />
            <input
              value={filters.email}
              onChange={(event) => setFilters(current => ({ ...current, email: event.target.value }))}
              placeholder="Email"
              className="rounded-xl border border-slate-200/50 bg-slate-50/80 px-3 py-3 text-xs outline-none dark:border-white/5 dark:bg-[#07080b]/70"
            />
            <select
              value={filters.activityType}
              onChange={(event) => setFilters(current => ({ ...current, activityType: event.target.value }))}
              className="rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-3 text-[10px] font-black uppercase tracking-wider outline-none dark:border-white/5 dark:bg-[#07080b]/70"
            >
              {ACTIVITY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select
              value={filters.status}
              onChange={(event) => setFilters(current => ({ ...current, status: event.target.value }))}
              className="rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-3 text-[10px] font-black uppercase tracking-wider outline-none dark:border-white/5 dark:bg-[#07080b]/70"
            >
              {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status === 'all' ? 'All Statuses' : status}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={filters.from}
                onChange={(event) => setFilters(current => ({ ...current, from: event.target.value }))}
                className="rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-3 text-xs outline-none dark:border-white/5 dark:bg-[#07080b]/70"
              />
              <input
                type="date"
                value={filters.to}
                onChange={(event) => setFilters(current => ({ ...current, to: event.target.value }))}
                className="rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-3 text-xs outline-none dark:border-white/5 dark:bg-[#07080b]/70"
              />
            </div>
            <button
              type="button"
              onClick={() => loadActivities(1)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-indigo-500"
            >
              <Filter className="h-4 w-4" />
              Apply
            </button>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200/50 dark:border-white/5">
            <div className="grid grid-cols-[1.1fr_1fr_1fr_0.8fr] gap-3 bg-slate-100/70 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:bg-white/[0.03]">
              <span>User</span>
              <span>Activity</span>
              <span>Context</span>
              <span>Time</span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                Loading activity
              </div>
            ) : activities.length ? (
              activities.map(activity => (
                <div key={activity._id} className="grid grid-cols-1 gap-3 border-t border-slate-200/50 px-4 py-4 text-xs dark:border-white/5 md:grid-cols-[1.1fr_1fr_1fr_0.8fr]">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-black text-slate-900 dark:text-white">
                      <User className="h-4 w-4 shrink-0 text-indigo-500" />
                      {activity.user?.username || 'Unknown user'}
                    </p>
                    <p className="mt-1 flex items-center gap-2 truncate text-[10px] font-semibold text-slate-450">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      {activity.user?.email || 'No email'}
                    </p>
                  </div>
                  <div>
                    <span className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-indigo-500">
                      {formatAction(activity.action)}
                    </span>
                    {activity.metadata?.status && (
                      <span className="ml-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-500">
                        {activity.metadata.status}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 text-[11px] font-semibold leading-relaxed text-slate-550 dark:text-slate-400">
                    <p className="truncate">{activity.metadata?.title || activity.metadata?.query || activity.metadata?.searchQuery || activity.metadata?.threadTitle || 'General platform action'}</p>
                    {(activity.metadata?.studentEmail || activity.metadata?.issueType) && (
                      <p className="mt-1 truncate text-slate-400">{activity.metadata.studentEmail || activity.metadata.issueType}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-450">
                    <CalendarDays className="h-4 w-4" />
                    {new Date(activity.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-xs font-semibold text-slate-450 dark:text-slate-500">
                No activity matches the current filters.
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-450">
            <span>{pagination.total || 0} events</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadActivities(Math.max(1, pagination.page - 1))}
                disabled={pagination.page <= 1}
                className="rounded-xl border border-slate-200/60 p-2 disabled:opacity-40 dark:border-white/5"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span>Page {pagination.page || 1} of {pagination.pages || 1}</span>
              <button
                type="button"
                onClick={() => loadActivities(Math.min(pagination.pages || 1, pagination.page + 1))}
                disabled={pagination.page >= pagination.pages}
                className="rounded-xl border border-slate-200/60 p-2 disabled:opacity-40 dark:border-white/5"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default UserActivityTracking;
