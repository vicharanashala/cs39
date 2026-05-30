import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../utils/api';
import {
  AlertTriangle,
  ArrowRight,
<<<<<<< HEAD
  CheckCircle,
  GitMerge,
  MessageSquare,
  Pencil,
  Save,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  XCircle,
  Zap
=======
  GitMerge,
  Clock,
  ArrowUp,
  ArrowDown,
  Zap,
  Loader2
>>>>>>> ebd79f7b49a7a8f4c0860e4c38e20347dce9e852
} from 'lucide-react';

const FAQ_CATEGORIES = [
  'Internship', 'Selection Process', 'Certificates', 'Attendance',
  'Assignments', 'Mentorship', 'Projects', 'Deadlines',
  'Technical Issues', 'Payments', 'General Queries', 'Announcements', 'Others'
];

const glassPanel = 'rounded-lg border border-white/10 bg-white/[0.06] shadow-2xl shadow-slate-950/20 backdrop-blur-xl';
const subtlePanel = 'rounded-lg border border-white/10 bg-slate-950/35 backdrop-blur-xl';
const actionButton = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-50';

const Dashboard = () => {
  const { user, setSelectedThreadId, showAlert } = useApp();
  const [adminStats, setAdminStats] = useState(null);
  const [flaggedContent, setFlaggedContent] = useState({ threads: [], answers: [] });
  const [moderationQueue, setModerationQueue] = useState([]);
  const [editingQueueId, setEditingQueueId] = useState(null);
  const [queueDraft, setQueueDraft] = useState({ title: '', body: '', category: 'General Queries' });
  const [queueLoadingId, setQueueLoadingId] = useState(null);
  const [studentStats, setStudentStats] = useState(null);
  const [error, setError] = useState(false);
<<<<<<< HEAD
=======
  
  // Pending Queue state
  const [pendingQueue, setPendingQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueSort, setQueueSort] = useState('queueNumber');
  const [processingId, setProcessingId] = useState(null);
  
  // Merge state
>>>>>>> ebd79f7b49a7a8f4c0860e4c38e20347dce9e852
  const [mergeSource, setMergeSource] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');
  const [mergeLoading, setMergeLoading] = useState(false);
  const [mergeableThreads, setMergeableThreads] = useState([]);

  useEffect(() => {
<<<<<<< HEAD
    if (!user) return;
    if (user.role === 'admin') {
      fetchAdminData();
    } else {
      fetchStudentData();
=======
    if (user) {
      if (user.role === 'admin') {
        fetchAdminData();
        fetchPendingQueue();
      } else {
        fetchStudentData();
      }
>>>>>>> ebd79f7b49a7a8f4c0860e4c38e20347dce9e852
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchPendingQueue();
    }
  }, [queueSort]);

  const fetchAdminData = async () => {
    setError(false);
    try {
      const statsRes = await api.get('/admin/dashboard-stats');
      setAdminStats(statsRes.data);

      const flaggedRes = await api.get('/admin/flagged');
      setFlaggedContent(flaggedRes.data);

      const queueRes = await api.get('/admin/moderation-queue');
      setModerationQueue(queueRes.data);

      const threadsRes = await api.get('/threads');
      setMergeableThreads(threadsRes.data.filter((thread) => thread.status === 'active' && !thread.isMerged));
    } catch (error) {
      console.error('Fetch admin stats error:', error.message);
      setError(true);
    }
  };

  const fetchPendingQueue = async () => {
    setQueueLoading(true);
    try {
      const res = await api.get('/admin/pending-queue', { params: { sort: queueSort } });
      setPendingQueue(res.data);
    } catch (err) {
      console.error('Pending queue error:', err.message);
    } finally {
      setQueueLoading(false);
    }
  };

  const handleQueueAction = async (threadId, action) => {
    setProcessingId(threadId);
    try {
      await api.post(`/admin/process-queue/${threadId}`, { action });
      showAlert(
        action === 'approve' ? '✅ Question approved and published!' : '❌ Question rejected.',
        action === 'approve' ? 'success' : 'info'
      );
      await fetchPendingQueue();
      await fetchAdminData(); // refresh counters
    } catch (err) {
      showAlert('Failed to process queue item.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const fetchStudentData = async () => {
    setError(false);
    try {
      const res = await api.get(`/profile/${user.id}`);
      setStudentStats(res.data);
    } catch (error) {
      console.error('Fetch student profile error:', error.message);
      setError(true);
    }
  };

  const startQueueEdit = (thread) => {
    setEditingQueueId(thread._id);
    setQueueDraft({
      title: thread.title || '',
      body: thread.body || '',
      category: thread.category || 'General Queries'
    });
  };

  const saveQueueEdit = async (threadId) => {
    setQueueLoadingId(threadId);
    try {
      await api.put(`/admin/moderation-queue/${threadId}`, queueDraft);
      showAlert('Queued FAQ updated.', 'success');
      setEditingQueueId(null);
      fetchAdminData();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Could not update queued FAQ.', 'error');
    } finally {
      setQueueLoadingId(null);
    }
  };

  const reviewQueuedFAQ = async (threadId, action) => {
    setQueueLoadingId(threadId);
    try {
      await api.post(`/admin/moderation-queue/${threadId}/review`, {
        action,
        reason: action === 'reject' ? 'Rejected by admin review.' : ''
      });
      showAlert(`FAQ ${action === 'approve' ? 'published' : 'rejected'}.`, 'success');
      setEditingQueueId(null);
      fetchAdminData();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Could not review queued FAQ.', 'error');
    } finally {
      setQueueLoadingId(null);
    }
  };

  const handleModerateAction = async (itemId, itemType, action) => {
    try {
      await api.post('/admin/moderate-action', { itemId, itemType, action });
      showAlert(`Content ${action === 'approve' ? 'approved' : 'deleted'} successfully`, 'success');
      fetchAdminData();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Moderation action failed.', 'error');
    }
  };

  const handleMergeSubmit = async (event) => {
    event.preventDefault();
    if (!mergeSource || !mergeTarget) return showAlert('Select both source and target threads to merge', 'error');
    if (mergeSource === mergeTarget) return showAlert('Source and target threads must be different', 'error');

    setMergeLoading(true);
    try {
      await api.post('/admin/merge-threads', { sourceThreadId: mergeSource, targetThreadId: mergeTarget });
      showAlert('Duplicate FAQ merged successfully.', 'success');
      setMergeSource('');
      setMergeTarget('');
      fetchAdminData();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Could not merge duplicate FAQs.', 'error');
    } finally {
      setMergeLoading(false);
    }
  };

  const renderStatus = (message, retryAction) => (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06]">
        <Sparkles className="h-5 w-5 text-blue-300" />
      </div>
      <p className="text-sm font-bold text-slate-300">{message}</p>
      {retryAction && (
        <button onClick={retryAction} className={`${actionButton} mt-5 bg-blue-500 text-white hover:bg-blue-400`}>
          Retry Loading
        </button>
      )}
    </div>
  );

  const StatCard = ({ label, value, icon: Icon, tone, detail }) => (
    <div className={`${glassPanel} overflow-hidden p-4`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <h3 className="mt-2 text-3xl font-black tracking-tight text-white">{value}</h3>
        </div>
        <div className={`rounded-lg bg-gradient-to-br ${tone} p-2.5 shadow-lg`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <p className="mt-4 text-xs font-semibold text-slate-400">{detail}</p>
    </div>
  );

  const renderStudentDashboard = () => {
    if (error) return renderStatus('Failed to load student dashboard stats.', fetchStudentData);
    if (!studentStats) return renderStatus('Loading student dashboard...');

    const { stats, raisedThreads, solvedAnswers } = studentStats;

    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <section className={`${glassPanel} p-5 sm:p-6`}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200/70">Contributor Workspace</p>
          <h2 className="mt-2 text-2xl font-black text-white">Welcome, {user.username}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Track your questions, posted answers, and reputation progress inside the FAQ platform.</p>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Reputation" value={`${user.spPoints} SP`} icon={TrendingUp} tone="from-blue-500 to-cyan-400" detail={user.contributionRating || 'Active contributor'} />
          <StatCard label="Asked" value={stats.raisedCount} icon={MessageSquare} tone="from-violet-500 to-fuchsia-400" detail="Questions created by you" />
          <StatCard label="Answered" value={stats.answersCount} icon={CheckCircle} tone="from-emerald-500 to-teal-400" detail="Helpful answers posted" />
        </div>

<<<<<<< HEAD
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className={`${glassPanel} p-5 lg:col-span-2`}>
            <PanelTitle icon={MessageSquare} title="My Raised Issues" count={raisedThreads.length} />
            <div className="mt-4 divide-y divide-white/10">
=======
        {/* Counter cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-950 p-4 rounded-xl shadow-sm text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Reputation Score</span>
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-white mt-0.5">{user.spPoints} SP</h3>
          </div>
          <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-950 p-4 rounded-xl shadow-sm text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Asked Questions</span>
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-white mt-0.5">{stats.raisedCount}</h3>
          </div>
          <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-950 p-4 rounded-xl shadow-sm text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Answers Posted</span>
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-white mt-0.5">{stats.answersCount}</h3>
          </div>
        </div>

        {/* Split info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Raised issues with nested answers */}
          <div className="md:col-span-2 bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-950 p-5 rounded-2xl shadow-sm space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b pb-2 dark:border-brand-950">My Raised Issues & Answers</span>
            <div className="divide-y divide-slate-100 dark:divide-brand-950 text-xs">
>>>>>>> ebd79f7b49a7a8f4c0860e4c38e20347dce9e852
              {raisedThreads.length === 0 ? (
                <EmptyState text="You have not posted any questions yet." />
              ) : (
                raisedThreads.map((thread) => (
                  <button key={thread._id} onClick={() => setSelectedThreadId(thread._id)} className="group flex w-full items-center justify-between gap-4 py-4 text-left">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-white group-hover:text-blue-300">{thread.title}</h3>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">{thread.body}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-600 group-hover:text-blue-300" />
                  </button>
                ))
              )}
            </div>
          </section>

          <section className={`${glassPanel} p-5`}>
            <PanelTitle icon={CheckCircle} title="Solved Answers" count={solvedAnswers.length} />
            <div className="mt-4 space-y-3">
              {solvedAnswers.length === 0 ? (
                <EmptyState text="No solved answers yet." />
              ) : (
                solvedAnswers.slice(0, 5).map((answer) => (
                  <div key={answer._id} className={subtlePanel + ' p-3'}>
                    <p className="line-clamp-2 text-xs leading-5 text-slate-300">{answer.body}</p>
                    <p className="mt-2 truncate text-[10px] font-bold uppercase tracking-wider text-emerald-300">{answer.threadTitle}</p>
                  </div>
                ))
              )}
            </div>
<<<<<<< HEAD
          </section>
=======
          </div>

          {/* Solved Answers by User */}
          <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-950 p-5 rounded-2xl shadow-sm space-y-3 h-fit">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b pb-2 dark:border-brand-950">My Solved (Verified) Answers</span>
            <div className="space-y-3 text-xs">
              {!solvedAnswers || solvedAnswers.length === 0 ? (
                <p className="text-slate-400 py-6 text-center text-[10px] italic">None of your answers have been verified yet.</p>
              ) : (
                solvedAnswers.map(ans => (
                  <div 
                    key={ans._id}
                    onClick={() => setSelectedThreadId(ans.threadId)}
                    className="p-3 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/20 rounded-xl cursor-pointer transition-all space-y-1"
                  >
                    <span className="text-[9px] text-slate-400 font-bold block truncate">On FAQ: "{ans.threadTitle}"</span>
                    <p className="text-emerald-700 dark:text-emerald-450 italic line-clamp-2 text-[10px] leading-relaxed">"{ans.body}"</p>
                  </div>
                ))
              )}
            </div>
          </div>

>>>>>>> ebd79f7b49a7a8f4c0860e4c38e20347dce9e852
        </div>
      </div>
    );
  };

  const renderAdminDashboard = () => {
    if (error) return renderStatus('Failed to load admin operations dashboard.', fetchAdminData);
    if (!adminStats) return renderStatus('Loading admin operations...');

    const { counters } = adminStats;
    const flaggedTotal = flaggedContent.threads.length + flaggedContent.answers.length;

    return (
<<<<<<< HEAD
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <section className={`${glassPanel} overflow-hidden p-5 sm:p-6`}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-lg border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                FAQ Operations
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">Admin command center</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">Review submitted FAQs, clear flagged content, and merge duplicates from one responsive moderation workspace.</p>
=======
      <div className="space-y-6 font-sans">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm flex items-center space-x-2.5">
          <ShieldCheck className="w-5 h-5 text-brand-400 shrink-0" />
          <div>
            <h2 className="text-sm font-bold">Admin Controls</h2>
            <p className="text-[10px] text-slate-450 mt-0.5">Verify FAQ entries, approve flagged toxicity posts, and merge duplicate threads.</p>
          </div>
        </div>

        {/* Counter cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-950 p-4 rounded-xl shadow-sm text-center">
            <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wide">Students</span>
            <h3 className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{counters.usersCount}</h3>
          </div>

          <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-950 p-4 rounded-xl shadow-sm text-center">
            <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wide">FAQ Threads</span>
            <h3 className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{counters.threadsCount}</h3>
          </div>

          <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-950 p-4 rounded-xl shadow-sm text-center">
            <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wide">Verified Answers</span>
            <h3 className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{counters.verifiedAnswersCount}</h3>
          </div>

          <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-950 p-4 rounded-xl shadow-sm text-center">
            <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wide">Moderation Queue</span>
            <h3 className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{counters.pendingApprovalCount}</h3>
          </div>

        </div>

        {/* Pending Question Queue */}
        <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-950 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-brand-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Pending Question Queue</h3>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-brand-800 px-2 py-0.5 rounded-full">{pendingQueue.length} in queue</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400">Sort by:</span>
              <div className="flex bg-slate-100 dark:bg-brand-950 rounded-lg p-0.5">
                {[{ key: 'queueNumber', label: 'Queue #' }, { key: 'priority', label: '🔴 Priority' }, { key: 'newest', label: '🕐 Newest' }].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setQueueSort(opt.key)}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                      queueSort === opt.key
                        ? 'bg-white dark:bg-brand-800 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-450 dark:text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button onClick={fetchPendingQueue} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-brand-800 transition-colors text-slate-400" title="Refresh">
                <Loader2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {queueLoading ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">Loading queue...</p>
            </div>
          ) : pendingQueue.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="text-3xl">🎉</div>
              <p className="text-xs font-bold text-slate-500">Queue is clear — all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-brand-950 max-h-96 overflow-y-auto">
              {pendingQueue.map(thread => {
                const priorityColor = thread.priority === 'urgent' ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                  : thread.priority === 'high' ? 'bg-orange-500/10 border-orange-500/30 text-orange-500'
                  : 'bg-slate-50 dark:bg-brand-950 border-slate-200 dark:border-brand-800 text-slate-400';
                return (
                  <div key={thread._id} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50 dark:hover:bg-brand-950/50 transition-colors">
                    {/* Left: queue # + info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="flex flex-col items-center shrink-0">
                        <span className="w-8 h-8 rounded-lg bg-amber-500 text-white text-[11px] font-black flex items-center justify-center">
                          {thread.queueNumber}
                        </span>
                        {thread.priority !== 'normal' && (
                          <span className={`mt-1 px-1 py-0.5 rounded text-[8px] font-black uppercase ${priorityColor} flex items-center gap-0.5`}>
                            <Zap className="w-2.5 h-2.5" />{thread.priority}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-white leading-snug">{thread.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[9px] font-semibold text-slate-400">{thread.category}</span>
                          <span className="text-[9px] text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-[9px] font-semibold text-slate-400 capitalize">{thread.author?.username || thread.authorName || 'Unknown'}</span>
                          <span className="text-[9px] text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-[9px] text-slate-400">
                            {thread.createdAt ? new Date(thread.createdAt).toLocaleDateString() : 'Just now'}
                          </span>
                        </div>
                        {thread.tags?.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {thread.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="px-1.5 py-0.5 bg-brand-500/10 text-brand-500 text-[8px] font-bold rounded-full">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Right: actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setSelectedThreadId(thread._id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-brand-800 transition-colors"
                        title="View thread"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleQueueAction(thread._id, 'reject')}
                        disabled={processingId === thread._id}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 text-[10px] font-bold border border-transparent hover:border-rose-500/30 transition-all flex items-center gap-1 disabled:opacity-40"
                      >
                        <ArrowDown className="w-3 h-3" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleQueueAction(thread._id, 'approve')}
                        disabled={processingId === thread._id}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold shadow-sm transition-all flex items-center gap-1 disabled:opacity-40"
                      >
                        {processingId === thread._id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <ArrowUp className="w-3 h-3" />
                        )}
                        Publish
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Moderation Flags list */}
          <div className="lg:col-span-2 bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-950 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b pb-2 dark:border-brand-950">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Toxicity Flags Queue ({flaggedContent.threads.length + flaggedContent.answers.length})</span>
>>>>>>> ebd79f7b49a7a8f4c0860e4c38e20347dce9e852
            </div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
              <MiniMetric label="Queue" value={counters.pendingApprovalCount} />
              <MiniMetric label="Flags" value={flaggedTotal} />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Students" value={counters.usersCount} icon={Users} tone="from-blue-500 to-cyan-400" detail="Registered platform users" />
          <StatCard label="FAQ Threads" value={counters.threadsCount} icon={MessageSquare} tone="from-violet-500 to-fuchsia-400" detail="Total question threads" />
          <StatCard label="Verified Answers" value={counters.verifiedAnswersCount} icon={CheckCircle} tone="from-emerald-500 to-teal-400" detail="Approved and trusted answers" />
          <StatCard label="Review Queue" value={counters.pendingApprovalCount} icon={Zap} tone="from-amber-500 to-orange-400" detail="Awaiting admin action" />
        </div>

        <section className={`${glassPanel} p-5`}>
          <PanelTitle icon={MessageSquare} title="Publication Review Queue" count={moderationQueue.length} />
          <div className="mt-4 divide-y divide-white/10">
            {moderationQueue.length === 0 ? (
              <EmptyState text="No user-submitted FAQs are waiting for publication." />
            ) : (
              moderationQueue.map((thread) => <QueueRow key={thread._id} thread={thread} />)
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section className={`${glassPanel} p-5 xl:col-span-2`}>
            <PanelTitle icon={AlertTriangle} title="Toxicity Flags" count={flaggedTotal} />
            <div className="mt-4 max-h-[360px] divide-y divide-white/10 overflow-y-auto pr-1">
              {flaggedTotal === 0 ? (
                <EmptyState text="Moderation queue is clean." />
              ) : (
                <>
                  {flaggedContent.threads.map((thread) => (
                    <FlagRow key={thread._id} label="Flagged Thread" title={thread.title} onApprove={() => handleModerateAction(thread._id, 'thread', 'approve')} onDelete={() => handleModerateAction(thread._id, 'thread', 'delete')} />
                  ))}
                  {flaggedContent.answers.map((answer) => (
                    <FlagRow key={answer._id} label="Flagged Answer" title={answer.body} onApprove={() => handleModerateAction(answer._id, 'answer', 'approve')} onDelete={() => handleModerateAction(answer._id, 'answer', 'delete')} />
                  ))}
                </>
              )}
            </div>
<<<<<<< HEAD
          </section>
=======
          </div>

          {/* Merge Duplicate FAQ Form */}
          <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-950 p-5 rounded-2xl shadow-sm space-y-4 h-fit">
            <div className="flex items-center space-x-2 border-b pb-2 dark:border-brand-950">
              <GitMerge className="w-4 h-4 text-brand-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Merge Duplicate FAQs</span>
            </div>
            
            <form onSubmit={handleMergeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[9px] font-bold uppercase text-slate-450 mb-1">Duplicate Source</label>
                <select
                  value={mergeSource}
                  onChange={(e) => setMergeSource(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-brand-950 border border-slate-200 dark:border-brand-850 rounded-xl outline-none text-slate-700 dark:text-slate-200 font-semibold"
                >
                  <option value="">Select source thread...</option>
                  {mergeableThreads.map(t => (
                    <option key={t._id} value={t._id}>{t.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-slate-450 mb-1">Main Target FAQ</label>
                <select
                  value={mergeTarget}
                  onChange={(e) => setMergeTarget(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-brand-950 border border-slate-200 dark:border-brand-850 rounded-xl outline-none text-slate-700 dark:text-slate-200 font-semibold"
                >
                  <option value="">Select target thread...</option>
                  {mergeableThreads.map(t => (
                    <option key={t._id} value={t._id}>{t.title}</option>
                  ))}
                </select>
              </div>
>>>>>>> ebd79f7b49a7a8f4c0860e4c38e20347dce9e852

          <section className={`${glassPanel} h-fit p-5`}>
            <PanelTitle icon={GitMerge} title="Merge Duplicate FAQs" />
            <form onSubmit={handleMergeSubmit} className="mt-5 space-y-4">
              <SelectField label="Duplicate Source" value={mergeSource} onChange={setMergeSource} threads={mergeableThreads} placeholder="Select source thread..." />
              <SelectField label="Main Target FAQ" value={mergeTarget} onChange={setMergeTarget} threads={mergeableThreads} placeholder="Select target thread..." />
              <button
                type="submit"
                disabled={mergeLoading || !mergeSource || !mergeTarget}
                className={`${actionButton} w-full bg-gradient-to-r from-blue-500 to-violet-500 py-3 text-white shadow-lg shadow-blue-950/30 hover:from-blue-400 hover:to-violet-400`}
              >
                <GitMerge className="h-4 w-4" />
                {mergeLoading ? 'Merging...' : 'Merge Threads'}
              </button>
            </form>
          </section>
        </div>
      </div>
    );
  };

  const QueueRow = ({ thread }) => {
    const isEditing = editingQueueId === thread._id;
    const isLoading = queueLoadingId === thread._id;

    return (
      <div className="grid gap-4 py-5 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-violet-300/20 bg-violet-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-200">
              {thread.status === 'flagged' ? 'Flagged' : 'Pending Review'}
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              By {thread.author?.username || thread.authorName || 'Unknown'} on {thread.createdAt ? new Date(thread.createdAt).toLocaleDateString() : 'recently'}
            </span>
          </div>

          {isEditing ? (
            <div className="grid gap-3">
              <input
                value={queueDraft.title}
                onChange={(event) => setQueueDraft((current) => ({ ...current, title: event.target.value }))}
                className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400"
              />
              <textarea
                value={queueDraft.body}
                onChange={(event) => setQueueDraft((current) => ({ ...current, body: event.target.value }))}
                rows={3}
                className="resize-none rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs leading-6 text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-blue-400"
              />
              <select
                value={queueDraft.category}
                onChange={(event) => setQueueDraft((current) => ({ ...current, category: event.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs font-bold text-slate-200 outline-none transition focus:border-blue-400 sm:w-64"
              >
                {FAQ_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <h3 className="truncate text-base font-black text-white">{thread.title}</h3>
              <p className="line-clamp-2 max-w-4xl text-sm leading-6 text-slate-400">{thread.body}</p>
              <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <span>{thread.category}</span>
                <span>Toxicity {Math.round((thread.aiScores?.toxicityScore || 0) * 100)}%</span>
                <span>Spam {Math.round((thread.aiScores?.spamProbability || 0) * 100)}%</span>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-start gap-2 lg:justify-end">
          {isEditing ? (
            <>
              <button onClick={() => saveQueueEdit(thread._id)} disabled={isLoading} className={`${actionButton} bg-blue-500 text-white hover:bg-blue-400`}>
                <Save className="h-3.5 w-3.5" />
                Save
              </button>
              <button onClick={() => setEditingQueueId(null)} className={`${actionButton} border border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/10`}>
                <XCircle className="h-3.5 w-3.5" />
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => startQueueEdit(thread)} className={`${actionButton} border border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/10`}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          )}
          <button onClick={() => reviewQueuedFAQ(thread._id, 'approve')} disabled={isLoading} className={`${actionButton} bg-emerald-500/90 text-white hover:bg-emerald-400`}>
            <CheckCircle className="h-3.5 w-3.5" />
            Approve
          </button>
          <button onClick={() => reviewQueuedFAQ(thread._id, 'reject')} disabled={isLoading} className={`${actionButton} bg-rose-500/90 text-white hover:bg-rose-400`}>
            <XCircle className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      </div>
    );
  };

  return user.role === 'admin' ? renderAdminDashboard() : renderStudentDashboard();
};

const PanelTitle = ({ icon: Icon, title, count }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="flex min-w-0 items-center gap-3">
      <div className="rounded-lg border border-white/10 bg-white/[0.06] p-2 text-blue-300">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="truncate text-sm font-black uppercase tracking-[0.14em] text-white">{title}</h3>
    </div>
    {typeof count !== 'undefined' && (
      <span className="rounded-md bg-white/[0.06] px-2.5 py-1 text-xs font-black text-slate-300">{count}</span>
    )}
  </div>
);

const MiniMetric = ({ label, value }) => (
  <div className="rounded-lg border border-white/10 bg-slate-950/40 p-3">
    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-black text-white">{value}</p>
  </div>
);

const EmptyState = ({ text }) => (
  <div className="rounded-lg border border-dashed border-white/10 bg-slate-950/25 px-4 py-8 text-center text-sm font-semibold text-slate-500">
    {text}
  </div>
);

const FlagRow = ({ label, title, onApprove, onDelete }) => (
  <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300/80">{label}</p>
      <h4 className="mt-1 truncate text-sm font-bold text-white">{title}</h4>
    </div>
    <div className="flex shrink-0 gap-2">
      <button onClick={onApprove} className={`${actionButton} bg-emerald-500/90 text-white hover:bg-emerald-400`}>Approve</button>
      <button onClick={onDelete} className={`${actionButton} bg-rose-500/90 text-white hover:bg-rose-400`}>Delete</button>
    </div>
  </div>
);

const SelectField = ({ label, value, onChange, threads, placeholder }) => (
  <label className="block">
    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-3 text-xs font-bold text-slate-200 outline-none transition focus:border-blue-400"
    >
      <option value="">{placeholder}</option>
      {threads.map((thread) => (
        <option key={thread._id} value={thread._id}>{thread.title}</option>
      ))}
    </select>
  </label>
);

export default Dashboard;
