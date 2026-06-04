import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../utils/api';
import {
  BarChart3, TrendingUp, Users, MessageSquare, Star, Activity,
  AlertCircle, CheckCircle2, Clock, Zap, ThumbsUp,
  ArrowUp, ArrowDown, Minus, RefreshCw, BarChart2, Search, Filter, Eye
} from 'lucide-react';

const Analytics = () => {
  const { user } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [userActivity, setUserActivity] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [trending, setTrending] = useState(null);
  const [mostSearched, setMostSearched] = useState(null);
  const [systemPerf, setSystemPerf] = useState(null);
  const [searchFilters, setSearchFilters] = useState({ days: '30', source: 'all', q: '', minResults: '' });

  useEffect(() => {
    if (user?.role === 'admin') loadAllAnalytics();
  }, [user]);

  useEffect(() => {
    if (user?.role === 'admin' && activeTab === 'searches') {
      const timer = setTimeout(loadMostSearched, 250);
      return () => clearTimeout(timer);
    }
  }, [activeTab, searchFilters, user?.role]);

  const loadAllAnalytics = async () => {
    setLoading(true);
    setError(false);
    try {
      const [activity, fb, trend, searched, perf] = await Promise.all([
        api.get('/admin/analytics/user-activity?days=30'),
        api.get('/admin/analytics/feedback'),
        api.get('/admin/analytics/trending?days=7'),
        api.get('/admin/analytics/most-searched?days=30'),
        api.get('/admin/analytics/system-performance')
      ]);
      setUserActivity(activity.data);
      setFeedback(fb.data);
      setTrending(trend.data);
      setMostSearched(searched.data);
      setSystemPerf(perf.data);
    } catch (err) {
      console.error('Analytics load error:', err);
      setError(true);
    }
    setLoading(false);
  };

  const loadMostSearched = async () => {
    try {
      const params = {
        days: searchFilters.days,
        source: searchFilters.source,
        q: searchFilters.q || undefined,
        minResults: searchFilters.minResults || undefined
      };
      const res = await api.get('/admin/analytics/most-searched', { params });
      setMostSearched(res.data);
    } catch (err) {
      console.error('Most searched analytics load error:', err);
      setError(true);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="p-6 text-center">
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Access denied. Admins operations only.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 space-y-5 max-w-6xl mx-auto font-sans">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 dark:bg-brand-900 rounded-3xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 dark:bg-brand-900 rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center space-y-4 max-w-md mx-auto py-24 font-sans">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto animate-bounce" />
        <p className="text-xs text-slate-550 font-black uppercase tracking-wider">Failed to resolve portal analytics.</p>
        <button onClick={loadAllAnalytics} className="soft-primary px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider">
          Retry Sync
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview Dashboard', icon: BarChart3 },
    { id: 'activity', label: 'User Operations', icon: Users },
    { id: 'feedback', label: 'Feedback Sentiment', icon: Star },
    { id: 'searches', label: 'Most Searched Questions', icon: Search },
    { id: 'trending', label: 'Trending Threads', icon: TrendingUp },
    { id: 'system', label: 'System Perf', icon: Activity }
  ];

  return (
    <div className="flex-1 p-6 space-y-6 max-w-6xl mx-auto font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/5 pb-4">
        <div>
          <h1 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#E07A15]" />
            Operations Intelligence & SLA
          </h1>
          <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase mt-0.5 tracking-wider">Telemetry analysis reports for board operations</p>
        </div>
        <button
          onClick={loadAllAnalytics}
          className="soft-primary flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Stats
        </button>
      </div>

      {/* Tab select bar */}
      <div className="flex gap-2 overflow-x-auto pb-1 p-1 bg-slate-100 dark:bg-[#07080b]/85 rounded-2xl w-fit border border-slate-200/50 dark:border-white/5 shrink-0 scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'soft-primary shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* â”€â”€ OVERVIEW TAB â”€â”€ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top-level KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Search Logs Indexed"
              value={systemPerf?.dbStats?.totalSearchLogs || 0}
              icon={<Activity className="w-4 h-4" />}
              color="text-blue-500 bg-blue-500/10 border-blue-500/15"
            />
            <KPICard
              label="Active Interns Peak"
              value={userActivity?.dailyActive?.reduce((m, d) => Math.max(m, d.userCount), 0) || 0}
              icon={<Users className="w-4 h-4" />}
              color="text-emerald-500 bg-emerald-500/10 border-emerald-500/15"
              subtitle="active 30d"
            />
            <KPICard
              label="Platform Rating"
              value={feedback?.avgRating ? feedback.avgRating.toFixed(1) : 'N/A'}
              icon={<Star className="w-4 h-4" />}
              color="text-amber-500 bg-amber-500/10 border-amber-500/15"
              suffix="/5"
            />
            <KPICard
              label="FAQ Thread Count"
              value={systemPerf?.dbStats?.totalThreads || 0}
              icon={<MessageSquare className="w-4 h-4" />}
              color="text-indigo-500 bg-indigo-500/10 border-indigo-500/15"
            />
          </div>

          {/* Quick glance dashboard widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Trending right now */}
            <SectionCard title="Weekly Trending Highlights" icon={<TrendingUp className="w-4 h-4" />}>
              <div className="space-y-2.5 pt-1">
                {(trending?.trendingByViews || []).slice(0, 5).map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5 last:border-0 font-semibold text-xs">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <TrendingUp className="w-3.5 h-3.5 text-rose-455 shrink-0" />
                      <span className="text-slate-800 dark:text-slate-200 truncate">{t.title}</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 ml-2 shrink-0">{t.viewCount} views</span>
                  </div>
                ))}
                {(!trending?.trendingByViews?.length) && <p className="text-xs text-slate-400 text-center py-4">No trending HIGHLIGHTS.</p>}
              </div>
            </SectionCard>

            {/* Sentiment summary */}
            <SectionCard title="Contributor Sentiment Breakdown" icon={<Star className="w-4 h-4" />}>
              <div className="flex items-center gap-4.5 pt-1">
                {(feedback?.sentimentBreakdown || []).map(s => (
                  <div key={s._id} className={`flex-1 text-center p-4 rounded-2xl border ${
                    s._id === 'positive' ? 'bg-emerald-500/[0.02] border-emerald-500/20 text-emerald-500' :
                    s._id === 'negative' ? 'bg-rose-500/[0.02] border-rose-500/20 text-rose-500' :
                    'bg-slate-50 dark:bg-white/[0.01] border-slate-200/50 dark:border-white/5 text-slate-500'
                  }`}>
                    <p className="text-2xl font-black">{s.count}</p>
                    <p className="text-[8px] font-black uppercase tracking-widest mt-1 opacity-70">{s._id}</p>
                  </div>
                ))}
                {(!feedback?.sentimentBreakdown?.length) && <p className="text-xs text-slate-400 text-center py-4 w-full">Sentiment indicators unavailable.</p>}
              </div>
            </SectionCard>

            {/* System health snapshot */}
            <SectionCard title="SLA System Performance" icon={<Activity className="w-4 h-4" />}>
              <div className="space-y-3 pt-1">
                <MetricRow label="SLA Core Uptime" value={systemPerf?.latestMetrics?.uptimePercent ? `${systemPerf.latestMetrics.uptimePercent.toFixed(2)}%` : 'N/A'} good={systemPerf?.latestMetrics?.uptimePercent >= 99} />
                <MetricRow label="Telemetry Error Rate" value={systemPerf?.latestMetrics?.errorRate ? `${systemPerf.latestMetrics.errorRate.toFixed(2)}%` : 'N/A'} good={systemPerf?.latestMetrics?.errorRate < 1} />
                <MetricRow label="Average API Response Time" value={systemPerf?.latestMetrics?.avgResponseTimeMs ? `${systemPerf.latestMetrics.avgResponseTimeMs}ms` : 'N/A'} good={systemPerf?.latestMetrics?.avgResponseTimeMs < 500} />
                <MetricRow label="Real-time Active Connects" value={systemPerf?.latestMetrics?.activeUsers || 0} />
              </div>
            </SectionCard>
          </div>
        </div>
      )}


      {/* â”€â”€ USER OPERATIONS â”€â”€ */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(userActivity?.actionBreakdown || []).map(a => (
              <div key={a._id} className="soft-panel bg-white/70 dark:bg-[#0b0c10]/40 border border-slate-200/50 dark:border-white/5 p-4 rounded-2xl shadow text-center">
                <p className="text-xl font-black text-indigo-500">{a.count}</p>
                <p className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mt-1.5">{a._id?.replace('_', ' ')}</p>
              </div>
            ))}
          </div>

          <SectionCard title="Active User Activity (Daily Stats)" icon={<Users className="w-4 h-4" />}>
            <div className="flex items-end gap-1.5 h-36 pt-4 border-b border-slate-100 dark:border-white/5">
              {(userActivity?.dailyActive || []).slice(-14).map((d, i) => {
                const maxUsers = Math.max(...(userActivity?.dailyActive || []).map(d => d.userCount), 1);
                const barHeight = Math.max(4, Math.round((d.userCount / maxUsers) * 100));
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                    {/* Tooltip */}
                    <span className="absolute -top-6 bg-slate-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {d.userCount} Active
                    </span>
                    <div className="w-full bg-gradient-to-t from-indigo-500/20 to-indigo-500 rounded-t-lg transition-all duration-300 group-hover:scale-y-105" style={{ height: `${barHeight}%` }} />
                    <span className="text-[8px] text-slate-400 font-extrabold uppercase mt-1 tracking-wider">{d.date?.slice(5)}</span>
                  </div>
                );
              })}
            </div>
            {(!userActivity?.dailyActive?.length) && <p className="text-xs text-slate-400 text-center py-8">Daily activity log is blank.</p>}
          </SectionCard>

          <SectionCard title="Top Active Intern Contributors" icon={<Zap className="w-4 h-4" />}>
            <div className="space-y-2">
              {(userActivity?.topActiveUsers || []).map((u, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50/50 dark:bg-[#07080b]/60 border border-slate-200/30 dark:border-white/5 rounded-2xl shadow-sm">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0 ${
                    i === 0 ? 'bg-amber-400 text-amber-955' : i === 1 ? 'bg-slate-300 text-slate-800' : i === 2 ? 'bg-orange-300 text-orange-900' : 'bg-slate-100 dark:bg-white/5 text-slate-500'
                  }`}>{i + 1}</span>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100 flex-1 capitalize">{u.username}</span>
                  <span className="text-[10px] font-black text-indigo-500 bg-indigo-505/10 border border-indigo-505/20 px-2 py-0.5 rounded-lg">{u.actionCount} Operations</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* â”€â”€ FEEDBACK TABS â”€â”€ */}
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="soft-panel bg-white/70 dark:bg-[#0b0c10]/40 border border-slate-200/50 dark:border-white/5 p-5 rounded-2xl shadow text-center">
              <p className="text-3xl font-black text-amber-500">{feedback?.avgRating?.toFixed(1) || '-'}</p>
              <p className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mt-1">Average SLA Rating</p>
            </div>
            {(feedback?.ratingDistribution || []).map(r => (
              <div key={r._id} className="soft-panel bg-white/70 dark:bg-[#0b0c10]/40 border border-slate-200/50 dark:border-white/5 p-5 rounded-2xl shadow text-center space-y-2">
                <div className="flex items-center justify-center gap-0.5">
                  {[...Array(r._id)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-xl font-black text-slate-700 dark:text-white">{r.count} Votes</p>
              </div>
            ))}
          </div>

          <SectionCard title="Recent Rating Log Comments" icon={<MessageSquare className="w-4 h-4" />}>
            <div className="space-y-3">
              {(feedback?.recentFeedback || []).length === 0 && <p className="text-xs text-slate-400 text-center py-6">Feedback sheet is empty.</p>}
              {(feedback?.recentFeedback || []).map((f, i) => (
                <div key={i} className="p-4 bg-slate-50/50 dark:bg-[#07080b]/60 border border-slate-200/30 dark:border-white/5 rounded-2xl shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[...Array(f.rating)].map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                      </div>
                      <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
                        f.sentiment === 'positive' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                        f.sentiment === 'negative' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-slate-100 border-transparent text-slate-500'
                      }`}>{f.sentiment}</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400">{new Date(f.createdAt).toLocaleDateString()}</span>
                  </div>
                  {f.comment && <p className="text-xs text-slate-750 dark:text-slate-350 italic font-semibold leading-relaxed">"{f.comment}"</p>}
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">FAQ Thread: {f.threadId?.title || 'System Guide'}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* MOST SEARCHED QUESTIONS */}
      {activeTab === 'searches' && (
        <div className="space-y-6">
          <SectionCard title="Most Searched Questions" icon={<Search className="w-4 h-4" />} subtitle="User query demand with counts, trend, and discovery quality">
            <div className="grid gap-3 md:grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr_auto]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchFilters.q}
                  onChange={(event) => setSearchFilters(current => ({ ...current, q: event.target.value }))}
                  placeholder="Search user queries or questions"
                  className="w-full rounded-xl border border-slate-200/50 bg-slate-50/80 py-3 pl-9 pr-3 text-xs font-semibold outline-none dark:border-white/5 dark:bg-[#07080b]/70"
                />
              </div>
              <select
                value={searchFilters.days}
                onChange={(event) => setSearchFilters(current => ({ ...current, days: event.target.value }))}
                className="rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-3 text-[10px] font-black uppercase tracking-wider outline-none dark:border-white/5 dark:bg-[#07080b]/70"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
              <select
                value={searchFilters.source}
                onChange={(event) => setSearchFilters(current => ({ ...current, source: event.target.value }))}
                className="rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-3 text-[10px] font-black uppercase tracking-wider outline-none dark:border-white/5 dark:bg-[#07080b]/70"
              >
                <option value="all">All Sources</option>
                <option value="faq_feed">FAQ Feed</option>
                <option value="search_bar">Search Bar</option>
                <option value="chatbot">Chatbot</option>
                <option value="ai_assist">AI Assist</option>
              </select>
              <input
                type="number"
                min="0"
                value={searchFilters.minResults}
                onChange={(event) => setSearchFilters(current => ({ ...current, minResults: event.target.value }))}
                placeholder="Min results"
                className="rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-3 text-xs outline-none dark:border-white/5 dark:bg-[#07080b]/70"
              />
              <button
                type="button"
                onClick={loadMostSearched}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-wider text-indigo-500"
              >
                <Filter className="h-4 w-4" />
                Apply
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {(mostSearched?.questions || []).map((item, index) => (
                <div key={item.normalizedQuery || item.query} className="rounded-2xl border border-slate-200/50 bg-slate-50/70 p-4 dark:border-white/5 dark:bg-[#07080b]/60">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-[10px] font-black text-white dark:bg-white dark:text-slate-900">{index + 1}</span>
                        <h4 className="truncate text-sm font-black text-slate-900 dark:text-white">{item.query}</h4>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider">
                        {(item.sources || []).map(source => (
                          <span key={source} className="rounded-lg border border-slate-200/60 bg-white/70 px-2.5 py-1 text-slate-500 dark:border-white/5 dark:bg-white/[0.03]">{source?.replace('_', ' ')}</span>
                        ))}
                        <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-500">{item.uniqueUserCount} users</span>
                        <span className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-cyan-500">{item.avgResults ?? 0} avg results</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:min-w-[260px]">
                      <MiniStat label="Searches" value={item.count} />
                      <MiniStat label="Clicks" value={item.clickCount} />
                      <TrendBadge trend={item.trend} delta={item.trendDelta} />
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#E07A15] to-indigo-500"
                      style={{ width: `${Math.max(8, Math.min(100, (item.count / Math.max(1, mostSearched?.questions?.[0]?.count || 1)) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
              {(!mostSearched?.questions?.length) && (
                <div className="rounded-2xl border border-dashed border-slate-200/60 p-8 text-center text-xs font-semibold text-slate-400 dark:border-white/10">
                  No searched questions match these filters yet.
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      )}

      {/* â”€â”€ TRENDING TAB â”€â”€ */}
      {activeTab === 'trending' && (
        <div className="space-y-6">
          <SectionCard title="Weekly Highest Vetted Views" icon={<TrendingUp className="w-4 h-4" />}>
            <div className="space-y-2.5">
              {(trending?.trendingByViews || []).map((t, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50/50 dark:bg-[#07080b]/60 border border-slate-200/30 dark:border-white/5 rounded-2xl shadow-sm">
                  <span className="w-6.5 h-6.5 bg-gradient-to-tr from-rose-500 to-red-500 text-white rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-extrabold text-slate-805 dark:text-white truncate">{t.title}</p>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/30 dark:border-white/5 mt-1 inline-block text-slate-500">{t.category}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-indigo-500">{t.viewCount}</p>
                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Views</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Rising Telemetry Search Topics" icon={<Zap className="w-4 h-4" />} subtitle="Trending query threads raised recently">
            <div className="flex flex-wrap gap-2 pt-1">
              {(trending?.risingQueries || []).map((q, i) => (
                <span key={i} className="px-3.5 py-2 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-xl text-[11px] font-black uppercase tracking-wider shadow-sm">
                  "{q._id}" <span className="text-[#E07A15] dark:text-[#FFAE59] ml-1">{q.count}</span>
                </span>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* â”€â”€ SYSTEM SLA TELEMETRY TAB â”€â”€ */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Core SLA Uptime" value={systemPerf?.latestMetrics?.uptimePercent ? `${systemPerf.latestMetrics.uptimePercent.toFixed(2)}%` : 'N/A'} icon={<CheckCircle2 className="w-4.5 h-4.5" />} good={systemPerf?.latestMetrics?.uptimePercent >= 99} />
            <MetricCard label="Error Trigger Rate" value={systemPerf?.latestMetrics?.errorRate ? `${systemPerf.latestMetrics.errorRate.toFixed(2)}%` : 'N/A'} icon={<AlertCircle className="w-4.5 h-4.5" />} good={systemPerf?.latestMetrics?.errorRate < 1} invertColor />
            <MetricCard label="SLA API Speed" value={systemPerf?.latestMetrics?.avgResponseTimeMs ? `${systemPerf.latestMetrics.avgResponseTimeMs}ms` : 'N/A'} icon={<Clock className="w-4.5 h-4.5" />} good={(systemPerf?.latestMetrics?.avgResponseTimeMs || 0) < 500} />
            <MetricCard label="Active Client Pipes" value={systemPerf?.latestMetrics?.activeUsers || 0} icon={<Users className="w-4.5 h-4.5" />} />
          </div>

          <SectionCard title="Database Counts Inventory" icon={<Activity className="w-4 h-4" />}>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
              {[
                { label: 'Registered Users', value: systemPerf?.dbStats?.totalUsers },
                { label: 'FAQ Threads', value: systemPerf?.dbStats?.totalThreads },
                { label: 'Vetted Answers', value: systemPerf?.dbStats?.totalAnswers },
                { label: 'Starred Saves', value: systemPerf?.dbStats?.totalBookmarks },
                { label: 'Search Logs', value: systemPerf?.dbStats?.totalSearchLogs }
              ].map((stat, i) => (
                <div key={i} className="bg-slate-50/50 dark:bg-[#07080b]/60 border border-slate-200/30 dark:border-white/5 p-3.5 rounded-2xl text-center shadow-sm">
                  <p className="text-lg font-black text-indigo-500">{stat.value ?? 0}</p>
                  <p className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mt-1 leading-snug">{stat.label}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Error Telemetry Trends (24h)" icon={<ArrowDown className="w-4 h-4" />}>
            <div className="flex items-end gap-1.5 h-32 pt-4 border-b border-slate-100 dark:border-white/5">
              {(systemPerf?.errorTrend || []).slice(-12).map((e, i) => {
                const maxErr = Math.max(...(systemPerf?.errorTrend || []).map(e => e.errorRate || 0.01), 0.01);
                const barHeight = Math.max(4, Math.round((e.errorRate / maxErr) * 100));
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`w-full rounded-t-lg transition-all duration-300 ${e.errorRate > 1 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ height: `${barHeight}%` }} />
                    <span className="text-[8px] text-slate-400 font-extrabold uppercase mt-1 tracking-wider">{e.timestamp ? new Date(e.timestamp).getHours() + 'h' : ''}</span>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
};

// â”€â”€ Sub-components â”€â”€

const KPICard = ({ label, value, icon, color, suffix = '', subtitle }) => (
  <div className="soft-panel bg-white/70 dark:bg-[#0b0c10]/40 border border-slate-200/50 dark:border-white/5 p-4 sm:p-5 rounded-2xl shadow backdrop-blur-3xl card-hover flex flex-col justify-between h-full">
    <div className="flex items-center gap-2 mb-2">
      <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center border ${color}`}>{icon}</div>
    </div>
    <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-none mt-2">{value}{suffix}</p>
    <p className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mt-1.5 leading-snug">
      {label}{subtitle ? ` (${subtitle})` : ''}
    </p>
  </div>
);

const MetricCard = ({ label, value, icon, good, invertColor }) => (
  <div className="soft-panel bg-white/70 dark:bg-[#0b0c10]/40 border border-slate-200/50 dark:border-white/5 p-4 sm:p-5 rounded-2xl shadow text-center card-hover">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 border ${
      good 
        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
        : invertColor 
          ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' 
          : 'bg-slate-50 dark:bg-white/5 text-slate-400 border-slate-200/40 dark:border-white/5'
    }`}>
      {icon}
    </div>
    <p className={`text-xl font-black ${good ? 'text-emerald-500' : invertColor ? 'text-rose-500' : 'text-slate-800 dark:text-white'}`}>{value}</p>
    <p className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mt-2 leading-snug">{label}</p>
  </div>
);

const SectionCard = ({ title, icon, subtitle, children }) => (
  <div className="soft-panel bg-white/70 dark:bg-[#0b0c10]/40 border border-slate-200/50 dark:border-white/5 p-5 rounded-3xl shadow-xl backdrop-blur-3xl">
    <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-white/5 pb-3">
      <span className="text-[#E07A15]">{icon}</span>
      <div>
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">{title}</h3>
        {subtitle && <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

const MetricRow = ({ label, value, good }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5 last:border-0 font-semibold text-xs text-slate-600 dark:text-slate-350">
    <span>{label}</span>
    <div className="flex items-center gap-1.5">
      {good !== undefined && (
        good 
          ? <ArrowUp className="w-3.5 h-3.5 text-emerald-500 animate-pulse" /> 
          : <ArrowDown className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
      )}
      <span className={`font-black ${good ? 'text-emerald-500' : good === false ? 'text-rose-500' : 'text-slate-800 dark:text-slate-150'}`}>{value}</span>
    </div>
  </div>
);

const MiniStat = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200/50 bg-white/70 p-2.5 text-center dark:border-white/5 dark:bg-white/[0.03]">
    <p className="text-sm font-black text-slate-900 dark:text-white">{value ?? 0}</p>
    <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-400">{label}</p>
  </div>
);

const TrendBadge = ({ trend, delta }) => {
  const tone = trend === 'up'
    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
    : trend === 'down'
      ? 'border-rose-500/20 bg-rose-500/10 text-rose-500'
      : 'border-slate-200/50 bg-white/70 text-slate-500 dark:border-white/5 dark:bg-white/[0.03]';
  const Icon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;
  return (
    <div className={`rounded-xl border p-2.5 text-center ${tone}`}>
      <div className="flex items-center justify-center gap-1">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-sm font-black">{Math.abs(delta || 0)}</p>
      </div>
      <p className="mt-1 text-[8px] font-black uppercase tracking-widest">Trend</p>
    </div>
  );
};

export default Analytics;

