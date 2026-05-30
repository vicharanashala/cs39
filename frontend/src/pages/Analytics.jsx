import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../utils/api';
import {
  BarChart3, TrendingUp, Users, MessageSquare, Star, Activity,
  AlertCircle, CheckCircle2, Clock, Zap, Search, ThumbsUp,
  ChevronRight, ArrowUp, ArrowDown, Minus
} from 'lucide-react';

const Analytics = () => {
  const { user } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [mostSearched, setMostSearched] = useState(null);
  const [userActivity, setUserActivity] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [trending, setTrending] = useState(null);
  const [systemPerf, setSystemPerf] = useState(null);

  useEffect(() => {
    if (user?.role === 'admin') loadAllAnalytics();
  }, [user]);

  const loadAllAnalytics = async () => {
    setLoading(true);
    setError(false);
    try {
      const [search, activity, fb, trend, perf] = await Promise.all([
        api.get('/admin/analytics/most-searched'),
        api.get('/admin/analytics/user-activity?days=30'),
        api.get('/admin/analytics/feedback'),
        api.get('/admin/analytics/trending?days=7'),
        api.get('/admin/analytics/system-performance')
      ]);
      setMostSearched(search.data);
      setUserActivity(activity.data);
      setFeedback(fb.data);
      setTrending(trend.data);
      setSystemPerf(perf.data);
    } catch (err) {
      console.error('Analytics load error:', err);
      setError(true);
    }
    setLoading(false);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="p-6 text-center">
        <p className="text-xs text-slate-500 font-bold">Access denied. Admins only.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-brand-800 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 dark:bg-brand-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <p className="text-xs text-slate-500 font-bold">Failed to load analytics.</p>
        <button onClick={loadAllAnalytics} className="px-4 py-2 bg-brand-500 text-white rounded-lg text-xs font-bold">
          Retry
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'searches', label: 'Most Searched', icon: Search },
    { id: 'activity', label: 'User Activity', icon: Users },
    { id: 'feedback', label: 'Feedback', icon: Star },
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    { id: 'system', label: 'System', icon: Activity }
  ];

  return (
    <div className="flex-1 p-6 space-y-5 max-w-6xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-500" />
            Analytics & Insights
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">Data-driven decision making for better FAQ management</p>
        </div>
        <button
          onClick={loadAllAnalytics}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-[11px] font-bold transition-colors"
        >
          <Activity className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold shrink-0 transition-colors ${
              activeTab === tab.id
                ? 'bg-brand-500 text-white'
                : 'bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-800 text-slate-500 hover:border-brand-400'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Top-level KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Total Searches"
              value={mostSearched?.topSearches?.reduce((s, t) => s + t.count, 0) || 0}
              icon={<Search className="w-4 h-4" />}
              color="text-blue-500 bg-blue-500/10"
            />
            <KPICard
              label="Active Users (30d)"
              value={userActivity?.dailyActive?.reduce((m, d) => Math.max(m, d.userCount), 0) || 0}
              icon={<Users className="w-4 h-4" />}
              color="text-emerald-500 bg-emerald-500/10"
              subtitle="peak daily"
            />
            <KPICard
              label="Avg Rating"
              value={feedback?.avgRating ? feedback.avgRating.toFixed(1) : 'N/A'}
              icon={<Star className="w-4 h-4" />}
              color="text-amber-500 bg-amber-500/10"
              suffix="/5"
            />
            <KPICard
              label="Total FAQs"
              value={systemPerf?.dbStats?.totalThreads || 0}
              icon={<MessageSquare className="w-4 h-4" />}
              color="text-brand-500 bg-brand-500/10"
            />
          </div>

          {/* Quick glance panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top searched */}
            <SectionCard title="🔥 Top 5 Searched Queries" icon={<Search className="w-4 h-4" />}>
              <div className="space-y-2">
                {(mostSearched?.topSearches || []).slice(0, 5).map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-brand-800 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-slate-300 dark:text-slate-600 w-4">{i + 1}</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[160px]">{s.query}</span>
                    </div>
                    <span className="text-[10px] font-bold text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded-full">{s.count}</span>
                  </div>
                ))}
                {(!mostSearched?.topSearches?.length) && <p className="text-xs text-slate-400 text-center py-4">No search data yet.</p>}
              </div>
            </SectionCard>

            {/* Trending right now */}
            <SectionCard title="📈 Trending This Week" icon={<TrendingUp className="w-4 h-4" />}>
              <div className="space-y-2">
                {(trending?.trendingByViews || []).slice(0, 5).map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-brand-800 last:border-0">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <TrendingUp className="w-3 h-3 text-rose-400 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{t.title}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 ml-2 shrink-0">{t.viewCount} views</span>
                  </div>
                ))}
                {(!trending?.trendingByViews?.length) && <p className="text-xs text-slate-400 text-center py-4">No trending data yet.</p>}
              </div>
            </SectionCard>

            {/* Sentiment summary */}
            <SectionCard title="💬 Feedback Sentiment" icon={<Star className="w-4 h-4" />}>
              <div className="flex items-center gap-3">
                {(feedback?.sentimentBreakdown || []).map(s => (
                  <div key={s._id} className={`flex-1 text-center p-3 rounded-xl ${
                    s._id === 'positive' ? 'bg-emerald-500/10' : s._id === 'negative' ? 'bg-rose-500/10' : 'bg-slate-100 dark:bg-brand-800'
                  }`}>
                    <p className={`text-lg font-black ${
                      s._id === 'positive' ? 'text-emerald-600' : s._id === 'negative' ? 'text-rose-600' : 'text-slate-500'
                    }`}>{s.count}</p>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{s._id}</p>
                  </div>
                ))}
                {(!feedback?.sentimentBreakdown?.length) && <p className="text-xs text-slate-400 text-center py-4 w-full">No feedback yet.</p>}
              </div>
            </SectionCard>

            {/* System health snapshot */}
            <SectionCard title="⚙️ System Health" icon={<Activity className="w-4 h-4" />}>
              <div className="space-y-2">
                <MetricRow label="Uptime" value={systemPerf?.latestMetrics?.uptimePercent ? `${systemPerf.latestMetrics.uptimePercent.toFixed(1)}%` : 'N/A'} good={systemPerf?.latestMetrics?.uptimePercent >= 99} />
                <MetricRow label="Error Rate" value={systemPerf?.latestMetrics?.errorRate ? `${systemPerf.latestMetrics.errorRate.toFixed(2)}%` : 'N/A'} good={systemPerf?.latestMetrics?.errorRate < 1} />
                <MetricRow label="Avg Response" value={systemPerf?.latestMetrics?.avgResponseTimeMs ? `${systemPerf.latestMetrics.avgResponseTimeMs}ms` : 'N/A'} good={systemPerf?.latestMetrics?.avgResponseTimeMs < 500} />
                <MetricRow label="Active Users" value={systemPerf?.latestMetrics?.activeUsers || 0} />
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── MOST SEARCHED ── */}
      {activeTab === 'searches' && (
        <div className="space-y-5">
          <SectionCard title="🔍 Top Search Queries" icon={<Search className="w-4 h-4" />} subtitle="What students are actively looking for">
            <div className="space-y-2">
              {(mostSearched?.topSearches || []).map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-brand-950 rounded-xl">
                  <span className="w-6 h-6 bg-brand-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">"{s.query}"</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{s.count} searches</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="📌 Most Clicked FAQs from Search" icon={<Zap className="w-4 h-4" />} subtitle="FAQs that satisfy search intent">
            <div className="space-y-2">
              {(mostSearched?.topClicked || []).map((t, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-brand-950 rounded-xl">
                  <span className="w-6 h-6 bg-amber-400 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{t.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{t.clickCount} clicks from search</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── USER ACTIVITY ── */}
      {activeTab === 'activity' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(userActivity?.actionBreakdown || []).map(a => (
              <div key={a._id} className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-800 p-4 rounded-xl text-center">
                <p className="text-lg font-black text-brand-500">{a.count}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{a._id?.replace('_', ' ')}</p>
              </div>
            ))}
          </div>

          <SectionCard title="📅 Daily Active Users (Last 30 Days)" icon={<Users className="w-4 h-4" />}>
            <div className="flex items-end gap-1 h-32">
              {(userActivity?.dailyActive || []).slice(-14).map((d, i) => {
                const maxUsers = Math.max(...(userActivity?.dailyActive || []).map(d => d.userCount), 1);
                const barHeight = Math.max(4, Math.round((d.userCount / maxUsers) * 100));
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-brand-500/20 rounded-t transition-all" style={{ height: `${barHeight}%` }} />
                    <span className="text-[8px] text-slate-400 font-bold">{d.date?.slice(5)}</span>
                  </div>
                );
              })}
            </div>
            {(!userActivity?.dailyActive?.length) && <p className="text-xs text-slate-400 text-center py-8">No activity data yet.</p>}
          </SectionCard>

          <SectionCard title="🏆 Top Active Contributors" icon={<Zap className="w-4 h-4" />}>
            <div className="space-y-2">
              {(userActivity?.topActiveUsers || []).map((u, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-brand-950 rounded-xl">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                    i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-300 text-white' : i === 2 ? 'bg-orange-300 text-white' : 'bg-slate-200 dark:bg-brand-700 text-slate-500'
                  }`}>{i + 1}</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex-1">{u.username}</span>
                  <span className="text-[10px] font-bold text-brand-500">{u.actionCount} actions</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── FEEDBACK ── */}
      {activeTab === 'feedback' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-800 p-4 rounded-xl text-center">
              <p className="text-2xl font-black text-amber-500">{feedback?.avgRating?.toFixed(1) || '—'}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Avg Rating</p>
            </div>
            {(feedback?.ratingDistribution || []).map(r => (
              <div key={r._id} className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-800 p-4 rounded-xl text-center">
                <div className="flex items-center justify-center gap-0.5">
                  {[...Array(r._id)].map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-lg font-black text-slate-600 dark:text-slate-200 mt-1">{r.count}</p>
              </div>
            ))}
          </div>

          <SectionCard title="💬 Recent Feedback" icon={<MessageSquare className="w-4 h-4" />}>
            <div className="space-y-3">
              {(feedback?.recentFeedback || []).length === 0 && <p className="text-xs text-slate-400 text-center py-6">No feedback yet.</p>}
              {(feedback?.recentFeedback || []).map((f, i) => (
                <div key={i} className="p-3 bg-slate-50 dark:bg-brand-950 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[...Array(f.rating)].map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1 ${
                        f.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-600' :
                        f.sentiment === 'negative' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'
                      }`}>{f.sentiment}</span>
                    </div>
                    <span className="text-[9px] text-slate-400">{new Date(f.createdAt).toLocaleDateString()}</span>
                  </div>
                  {f.comment && <p className="text-[11px] text-slate-600 dark:text-slate-300 italic">"{f.comment}"</p>}
                  <p className="text-[9px] text-slate-400">On: {f.threadId?.title || 'Unknown thread'}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {feedback?.lowRatedFeedback?.length > 0 && (
            <SectionCard title="⚠️ Answers Needing Attention (Low Rating)" icon={<AlertCircle className="w-4 h-4" />}>

              <div className="space-y-3">
                {feedback.lowRatedFeedback.map((f, i) => (
                  <div key={i} className="p-3 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/20 rounded-xl">
                    <div className="flex items-center gap-1 mb-1">
                      {[...Array(f.rating)].map((_, i) => <Star key={i} className="w-3 h-3 fill-rose-400 text-rose-400" />)}
                      <span className="text-[9px] font-bold text-rose-500 ml-1">Poor quality</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 italic">"{f.answerId?.body}"</p>
                    <p className="text-[9px] text-slate-400 mt-1">FAQ: {f.threadId?.title}</p>
                    <p className="text-[9px] text-slate-400">"{f.comment}"</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* ── TRENDING ── */}
      {activeTab === 'trending' && (
        <div className="space-y-5">
          <SectionCard title="🔥 Trending by Views (This Week)" icon={<TrendingUp className="w-4 h-4" />}>
            <div className="space-y-2">
              {(trending?.trendingByViews || []).map((t, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-brand-950 rounded-xl">
                  <span className="w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{t.title}</p>
                    <span className="text-[9px] text-slate-400 bg-slate-100 dark:bg-brand-800 px-1.5 py-0.5 rounded mt-0.5 inline-block">{t.category}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-brand-500">{t.viewCount}</p>
                    <p className="text-[9px] text-slate-400">views</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="📌 Trending by Search Clicks" icon={<Search className="w-4 h-4" />}>
            <div className="space-y-2">
              {(trending?.trendingBySearch || []).map((t, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-brand-950 rounded-xl">
                  <span className="w-6 h-6 bg-amber-400 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{t.title}</p>
                    <span className="text-[9px] text-slate-400">{t.category}</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-500">{t.clickCount} clicks</span>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="💡 Rising Search Queries" icon={<Zap className="w-4 h-4" />} subtitle="Most frequent searches this week">
            <div className="flex flex-wrap gap-2">
              {(trending?.risingQueries || []).map((q, i) => (
                <span key={i} className="px-3 py-1.5 bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 rounded-full text-[11px] font-bold">
                  "{q._id}" <span className="text-brand-400 ml-1">{q.count}</span>
                </span>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── SYSTEM PERFORMANCE ── */}
      {activeTab === 'system' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Uptime" value={systemPerf?.latestMetrics?.uptimePercent ? `${systemPerf.latestMetrics.uptimePercent.toFixed(2)}%` : 'N/A'} icon={<CheckCircle2 className="w-4 h-4" />} good={systemPerf?.latestMetrics?.uptimePercent >= 99} />
            <MetricCard label="Error Rate" value={systemPerf?.latestMetrics?.errorRate ? `${systemPerf.latestMetrics.errorRate.toFixed(2)}%` : 'N/A'} icon={<AlertCircle className="w-4 h-4" />} good={systemPerf?.latestMetrics?.errorRate < 1} invertColor />
            <MetricCard label="Avg Response" value={systemPerf?.latestMetrics?.avgResponseTimeMs ? `${systemPerf.latestMetrics.avgResponseTimeMs}ms` : 'N/A'} icon={<Clock className="w-4 h-4" />} good={(systemPerf?.latestMetrics?.avgResponseTimeMs || 0) < 500} />
            <MetricCard label="Active Users" value={systemPerf?.latestMetrics?.activeUsers || 0} icon={<Users className="w-4 h-4" />} />
          </div>

          <SectionCard title="📊 Database Statistics" icon={<Activity className="w-4 h-4" />}>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: 'Users', value: systemPerf?.dbStats?.totalUsers },
                { label: 'FAQ Threads', value: systemPerf?.dbStats?.totalThreads },
                { label: 'Answers', value: systemPerf?.dbStats?.totalAnswers },
                { label: 'Bookmarks', value: systemPerf?.dbStats?.totalBookmarks },
                { label: 'Search Logs', value: systemPerf?.dbStats?.totalSearchLogs }
              ].map((stat, i) => (
                <div key={i} className="bg-slate-50 dark:bg-brand-950 p-3 rounded-xl text-center">
                  <p className="text-lg font-black text-brand-500">{stat.value ?? 0}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="📈 Error Rate Trend (24h)" icon={<ArrowDown className="w-4 h-4" />}>
            <div className="flex items-end gap-1 h-28">
              {(systemPerf?.errorTrend || []).slice(-12).map((e, i) => {
                const maxErr = Math.max(...(systemPerf?.errorTrend || []).map(e => e.errorRate || 0.01), 0.01);
                const barHeight = Math.max(4, Math.round((e.errorRate / maxErr) * 100));
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`w-full rounded-t transition-all ${e.errorRate > 1 ? 'bg-rose-400' : 'bg-emerald-400'}`} style={{ height: `${barHeight}%` }} />
                    <span className="text-[8px] text-slate-400 font-bold">{e.timestamp ? new Date(e.timestamp).getHours() + 'h' : ''}</span>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="⚡ Response Time Trend (24h)" icon={<Zap className="w-4 h-4" />}>
            <div className="flex items-end gap-1 h-28">
              {(systemPerf?.responseTrend || []).slice(-12).map((r, i) => {
                const maxMs = Math.max(...(systemPerf?.responseTrend || []).map(r => r.avgResponseTimeMs || 1), 1);
                const barHeight = Math.max(4, Math.round((r.avgResponseTimeMs / maxMs) * 100));
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-brand-500/30 rounded-t transition-all" style={{ height: `${barHeight}%` }} />
                    <span className="text-[8px] text-slate-400 font-bold">{r.timestamp ? new Date(r.timestamp).getHours() + 'h' : ''}</span>
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

// ── Sub-components ─────────────────────────────────────────────────────

const KPICard = ({ label, value, icon, color, suffix = '', subtitle }) => (
  <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-800 p-4 rounded-xl">
    <div className="flex items-center gap-2 mb-2">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
    </div>
    <p className="text-xl font-black text-slate-800 dark:text-white">{value}{suffix}</p>
    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{label}{subtitle ? ` (${subtitle})` : ''}</p>
  </div>
);

const MetricCard = ({ label, value, icon, good, invertColor }) => (
  <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-800 p-4 rounded-xl text-center">
    <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${good ? 'bg-emerald-500/10 text-emerald-500' : invertColor ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-100 dark:bg-brand-800 text-slate-400'}`}>
      {icon}
    </div>
    <p className={`text-xl font-black ${good ? 'text-emerald-500' : invertColor ? 'text-rose-500' : 'text-slate-800 dark:text-white'}`}>{value}</p>
    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{label}</p>
  </div>
);

const SectionCard = ({ title, icon, subtitle, children }) => (
  <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-800 p-5 rounded-2xl shadow-sm">
    <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-brand-800 pb-2.5">
      <span className="text-brand-500">{icon}</span>
      <div>
        <h3 className="text-xs font-bold text-slate-700 dark:text-white">{title}</h3>
        {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

const MetricRow = ({ label, value, good }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
    <div className="flex items-center gap-1.5">
      {good !== undefined && (
        good ? <ArrowUp className="w-3 h-3 text-emerald-500" /> : <ArrowDown className="w-3 h-3 text-rose-500" />
      )}
      <span className={`text-xs font-bold ${good ? 'text-emerald-500' : good === false ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}`}>{value}</span>
    </div>
  </div>
);

export default Analytics;