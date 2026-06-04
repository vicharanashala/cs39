import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../utils/api';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  GitMerge,
  BellDot,
  MessageSquare,
  Megaphone,
  Pencil,
  Save,
  ShieldCheck,
  TrendingUp,
  Users,
  X,
  XCircle,
  Zap,
  FolderOpen
} from 'lucide-react';

const FAQ_CATEGORIES = [
  'Internship', 'Selection Process', 'Certificates', 'Attendance',
  'Assignments', 'Mentorship', 'Projects', 'Deadlines',
  'Technical Issues', 'Payments', 'General Queries', 'Announcements', 'Others'
];

const actionButton = 'inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-[10px] font-black uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-sm';

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
  // Pending Queue state
  const [pendingQueue, setPendingQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueSort, setQueueSort] = useState('queueNumber');
  const [processingId, setProcessingId] = useState(null);
  
  // Rejected Questions Log & Rejection Form State
  const [rejectedQuestions, setRejectedQuestions] = useState([]);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('Duplicate Question');
  const [rejectionPenalty, setRejectionPenalty] = useState('5');
  const [isRejectedModalOpen, setIsRejectedModalOpen] = useState(false);
  
  // Merge state
  const [mergeSource, setMergeSource] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');
  const [mergeLoading, setMergeLoading] = useState(false);
  const [mergeableThreads, setMergeableThreads] = useState([]);
  const [changelog, setChangelog] = useState({ updates: [], metrics: { total: 0, views: 0, explores: 0, bookmarks: 0, pinned: 0 } });
  const [announcementDraft, setAnnouncementDraft] = useState({ title: '', body: '', reason: '', isPinned: false, changeType: 'announcement' });
  const [announcementLoading, setAnnouncementLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'admin') {
      fetchAdminData();
      fetchRejectedQuestions();
    } else {
      fetchStudentData();
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchPendingQueue();
    }
  }, [queueSort]);

  useEffect(() => {
    const io = window.io;
    if (io) {
      const handleQueueUpdate = () => {
        if (user && user.role !== 'admin') {
          fetchStudentData();
        } else if (user && user.role === 'admin') {
          fetchPendingQueue();
          fetchAdminData();
          fetchRejectedQuestions();
        }
      };
      io.on('queue_position_update', handleQueueUpdate);
      return () => {
        io.off('queue_position_update', handleQueueUpdate);
      };
    }
  }, [user]);

  const fetchRejectedQuestions = async () => {
    try {
      const res = await api.get('/admin/rejected-list');
      setRejectedQuestions(res.data);
    } catch (err) {
      console.error('Fetch rejected questions error:', err.message);
    }
  };

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

      const changelogRes = await api.get('/admin/changelog');
      setChangelog(changelogRes.data);

      fetchRejectedQuestions();
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
    let penaltyPoints = 0;
    if (action === 'reject') {
      const pointsInput = window.prompt("Enter SP points to deduct from the author (or 0 for no penalty):", "5");
      if (pointsInput === null) return; // user cancelled
      penaltyPoints = parseInt(pointsInput, 10);
      if (isNaN(penaltyPoints) || penaltyPoints < 0) {
        showAlert('Invalid SP points entered.', 'error');
        return;
      }
    }
    setProcessingId(threadId);
    try {
      await api.post(`/admin/process-queue/${threadId}`, { action, penaltyPoints });
      showAlert(
        action === 'approve' ? '✅ Question approved and published!' : '❌ Question rejected and deleted.',
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
    if (action === 'reject') {
      setRejectingId(threadId);
      setRejectionReason('Duplicate Question');
      setRejectionPenalty('5');
      return;
    }
    setQueueLoadingId(threadId);
    try {
      await api.post(`/admin/moderation-queue/${threadId}/review`, {
        action,
        reason: '',
        penaltyPoints: 0
      });
      showAlert(`FAQ published.`, 'success');
      setEditingQueueId(null);
      fetchAdminData();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Could not review queued FAQ.', 'error');
    } finally {
      setQueueLoadingId(null);
    }
  };

  const submitInlineRejection = async (threadId) => {
    const penaltyPoints = parseInt(rejectionPenalty, 10) || 0;
    if (isNaN(penaltyPoints) || penaltyPoints < 0) {
      showAlert('Invalid SP points entered.', 'error');
      return;
    }

    setQueueLoadingId(threadId);
    try {
      await api.post(`/admin/moderation-queue/${threadId}/review`, {
        action: 'reject',
        reason: rejectionReason,
        penaltyPoints
      });
      showAlert('FAQ rejected and penalty applied.', 'success');
      setRejectingId(null);
      fetchAdminData();
      fetchRejectedQuestions();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Could not reject FAQ.', 'error');
    } finally {
      setQueueLoadingId(null);
    }
  };

  const handleModerateAction = async (itemId, itemType, action) => {
    let penaltyPoints = 0;
    if (action === 'reject' || action === 'delete') {
      const pointsInput = window.prompt(`Enter SP points to deduct for this ${itemType} deletion (or 0 for no penalty):`, "5");
      if (pointsInput === null) return; // user cancelled
      penaltyPoints = parseInt(pointsInput, 10);
      if (isNaN(penaltyPoints) || penaltyPoints < 0) {
        showAlert('Invalid SP points entered.', 'error');
        return;
      }
    }
    try {
      await api.post('/admin/moderate-action', { itemId, itemType, action, penaltyPoints });
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

  const publishAnnouncement = async (event) => {
    event.preventDefault();
    setAnnouncementLoading(true);
    try {
      await api.post('/admin/changelog/announcement', announcementDraft);
      showAlert('Update announcement published.', 'success');
      setAnnouncementDraft({ title: '', body: '', reason: '', isPinned: false, changeType: 'announcement' });
      const res = await api.get('/admin/changelog');
      setChangelog(res.data);
    } catch (error) {
      showAlert(error.response?.data?.message || 'Could not publish update.', 'error');
    } finally {
      setAnnouncementLoading(false);
    }
  };

  const toggleChangelogPin = async (update) => {
    try {
      await api.patch(`/admin/changelog/${update._id}`, { isPinned: !update.isPinned });
      const res = await api.get('/admin/changelog');
      setChangelog(res.data);
    } catch (error) {
      showAlert('Could not update changelog pin.', 'error');
    }
  };

  const renderStatus = (message, retryAction) => (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/5">
        <Zap className="h-5 w-5 text-amber-500 animate-pulse" />
      </div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{message}</p>
      {retryAction && (
        <button onClick={retryAction} className="soft-primary mt-5 px-5 py-2.5 rounded-xl text-xs font-black">
          Retry Loading
        </button>
      )}
    </div>
  );

  const StatCard = ({ label, value, icon: Icon, tone, detail, onClick }) => (
    <div 
      onClick={onClick} 
      className={`soft-panel overflow-hidden p-5 border border-slate-200/50 dark:border-white/5 bg-white/70 dark:bg-[#0b0c10]/40 shadow-md backdrop-blur-3xl card-hover ${
        onClick ? 'cursor-pointer hover:bg-slate-50/40 dark:hover:bg-white/[0.02] border-amber-500/20' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-500">{label}</p>
          <h3 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight">{value}</h3>
        </div>
        <div className={`rounded-xl bg-gradient-to-br ${tone} p-3 text-white shadow-lg`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-xs font-semibold text-slate-400 dark:text-slate-550 leading-relaxed">{detail}</p>
    </div>
  );

  const renderStudentDashboard = () => {
    if (error) return renderStatus('Failed to load student dashboard stats.', fetchStudentData);
    if (!studentStats) return renderStatus('Loading student dashboard...');

    const { stats, raisedThreads, solvedAnswers } = studentStats;

    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 font-sans">
        
        {/* Welcome Section Header */}
        <section className="soft-panel p-6 border border-slate-200/50 dark:border-white/5 bg-white/70 dark:bg-[#0b0c10]/40 shadow-xl backdrop-blur-3xl">
          <p className="soft-accent text-[9px] font-black uppercase tracking-[0.25em]">Contributor Workspace</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Welcome back, {user.username}</h2>
          <p className="mt-2 max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-450 dark:text-slate-400">
            Track your open issue tickets, review peer replies, and monitor your SP reputation progressions in IIT Ropar Academics support.
          </p>
        </section>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Reputation Score" value={`${user.spPoints} SP`} icon={TrendingUp} tone="from-amber-500 to-[#E07A15]" detail={user.contributionRating || 'Active Portal Intern'} />
          <StatCard label="My Tickets Raised" value={stats.raisedCount} icon={MessageSquare} tone="from-indigo-500 to-violet-500" detail="Questions created on the board" />
          <StatCard label="Vetted Explanations" value={stats.answersCount} icon={CheckCircle} tone="from-emerald-500 to-teal-500" detail="Vetted peer replies submitted" />
        </div>

        {/* Student listings section */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Raised issues list */}
          <section className="soft-panel p-5 border border-slate-200/50 dark:border-white/5 bg-white/75 dark:bg-[#0b0c10]/40 shadow-xl backdrop-blur-3xl lg:col-span-2 space-y-4">
            <PanelTitle icon={MessageSquare} title="My Raised Issues" count={raisedThreads.length} />
            
            <div className="divide-y divide-slate-150 dark:divide-white/5 pt-1">
              {raisedThreads.length === 0 ? (
                <EmptyState text="You have not published any question threads yet." />
              ) : (
                raisedThreads.map((thread) => (
                  <button 
                    key={thread._id} 
                    onClick={() => setSelectedThreadId(thread._id)} 
                    className="group flex w-full items-center justify-between gap-4 py-4 text-left hover:bg-slate-50/[0.1] dark:hover:bg-white/[0.003] px-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="truncate text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 group-hover:text-[#E07A15] dark:group-hover:text-[#FFAE59] transition-colors">{thread.title}</h3>
                        {thread.queuePosition && (
                          <span className="shrink-0 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-indigo-500">
                            Queue #{thread.queuePosition}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-400 dark:text-slate-500 font-medium">{thread.body}</p>
                    </div>
                    <ArrowRight className="h-4.5 w-4.5 shrink-0 text-slate-400 group-hover:translate-x-0.5 group-hover:text-[#E07A15] dark:group-hover:text-[#FFAE59] transition-all" />
                  </button>
                ))
              )}
            </div>
          </section>

          {/* Solved Answers summary */}
          <section className="soft-panel p-5 border border-slate-200/50 dark:border-white/5 bg-white/75 dark:bg-[#0b0c10]/40 shadow-xl backdrop-blur-3xl space-y-4">
            <PanelTitle icon={CheckCircle} title="Vetted Solutions" count={solvedAnswers.length} />
            
            <div className="space-y-3 pt-1">
              {solvedAnswers.length === 0 ? (
                <EmptyState text="Vetting evaluation pending approval." />
              ) : (
                solvedAnswers.slice(0, 4).map((answer) => (
                  <div key={answer._id} className="p-3.5 bg-slate-50 dark:bg-brand-950/20 border border-slate-200/40 dark:border-white/5 rounded-2xl space-y-1.5 shadow-sm">
                    <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-350 italic font-semibold">"{answer.body}"</p>
                    <p className="truncate text-[8px] font-black uppercase tracking-wider text-[#E07A15] dark:text-[#FFAE59]">{answer.threadTitle}</p>
                  </div>
                ))
              )}
            </div>
          </section>
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
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 font-sans">
        
        {/* Operations Header */}
        <section className="soft-panel p-6 border border-slate-200/50 dark:border-white/5 bg-white/70 dark:bg-[#0b0c10]/40 shadow-xl backdrop-blur-3xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
                <ShieldCheck className="h-4 w-4" />
                FAQ Admin Center
              </div>
              <h2 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Moderation & Verification Operations</h2>
              <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-450 dark:text-slate-450">
                Review publication review queues, verify student explanations, clear toxicity moderation flags, or merge duplicate FAQs.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
              <MiniMetric label="Review Queue" value={counters.pendingApprovalCount} />
              <MiniMetric label="Active Flags" value={flaggedTotal} />
            </div>
          </div>
        </section>

        {/* Grid of 4 KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Registered Interns" value={counters.usersCount} icon={Users} tone="from-indigo-500 to-blue-500" detail="Active platform users" />
          <StatCard label="Discussion Threads" value={counters.threadsCount} icon={MessageSquare} tone="from-violet-500 to-fuchsia-500" detail="Total posted threads" />
          <StatCard label="Verified FAQ Guides" value={counters.verifiedAnswersCount} icon={CheckCircle} tone="from-emerald-500 to-teal-500" detail="Locked vetted answers" />
          <StatCard 
            label="Rejected Submissions" 
            value={counters.rejectedCount || 0} 
            icon={XCircle} 
            tone="from-rose-500 to-red-500" 
            detail="Click to view rejection logs" 
            onClick={() => setIsRejectedModalOpen(true)}
          />
        </div>

        {/* Publication queue block */}
        <section className="soft-panel p-5 border border-slate-200/50 dark:border-white/5 bg-white/75 dark:bg-[#0b0c10]/40 shadow-xl backdrop-blur-3xl space-y-4">
          <PanelTitle icon={MessageSquare} title="Publication Review Queue" count={moderationQueue.length} />
          
          <div className="divide-y divide-slate-150 dark:divide-white/5 pt-1">
            {moderationQueue.length === 0 ? (
              <EmptyState text="No pending user submissions indexed in publication queue." />
            ) : (
              moderationQueue.map((thread) => <QueueRow key={thread._id} thread={thread} />)
            )}
          </div>
        </section>

        {/* Toxicity queues + merges split */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Flags queue */}
          <section className="soft-panel p-5 border border-slate-200/50 dark:border-white/5 bg-white/75 dark:bg-[#0b0c10]/40 shadow-xl backdrop-blur-3xl xl:col-span-2 space-y-4">
            <PanelTitle icon={AlertTriangle} title="Toxicity Flag Moderation Queue" count={flaggedTotal} />
            
            <div className="max-h-[360px] divide-y divide-slate-150 dark:divide-white/5 overflow-y-auto pr-1">
              {flaggedTotal === 0 ? (
                <EmptyState text="All clean. Moderation queues are empty." />
              ) : (
                <>
                  {flaggedContent.threads.map((thread) => (
                    <FlagRow key={thread._id} label="Flagged Question" title={thread.title} onApprove={() => handleModerateAction(thread._id, 'thread', 'approve')} onDelete={() => handleModerateAction(thread._id, 'thread', 'delete')} />
                  ))}
                  {flaggedContent.answers.map((answer) => (
                    <FlagRow key={answer._id} label="Flagged Answer Reply" title={answer.body} onApprove={() => handleModerateAction(answer._id, 'answer', 'approve')} onDelete={() => handleModerateAction(answer._id, 'answer', 'delete')} />
                  ))}
                </>
              )}
            </div>
          </section>

          {/* Merge board */}
          <section className="soft-panel p-5 border border-slate-200/50 dark:border-white/5 bg-white/75 dark:bg-[#0b0c10]/40 shadow-xl backdrop-blur-3xl space-y-4 h-fit">
            <PanelTitle icon={GitMerge} title="Merge Duplicate FAQs" />
            
            <form onSubmit={handleMergeSubmit} className="space-y-4 pt-1">
              <SelectField label="Duplicate Source" value={mergeSource} onChange={setMergeSource} threads={mergeableThreads} placeholder="Select source duplicate thread..." />
              <SelectField label="Main Target FAQ" value={mergeTarget} onChange={setMergeTarget} threads={mergeableThreads} placeholder="Select target main thread..." />
              
              <button
                type="submit"
                disabled={mergeLoading || !mergeSource || !mergeTarget}
                className="soft-primary w-full py-3 font-black rounded-xl text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 mt-2"
              >
                <GitMerge className="h-4 w-4" />
                {mergeLoading ? 'Merging Duplicate...' : 'Merge FAQ Threads'}
              </button>
            </form>
          </section>
        </div>

        <section className="soft-panel p-5 border border-slate-200/50 dark:border-white/5 bg-white/75 dark:bg-[#0b0c10]/40 shadow-xl backdrop-blur-3xl space-y-5">
          <PanelTitle icon={BellDot} title="Live Changelog Control" count={changelog.metrics.total} />
          <div className="grid gap-3 sm:grid-cols-5">
            <MiniMetric label="Published" value={changelog.metrics.total} />
            <MiniMetric label="Views" value={changelog.metrics.views} />
            <MiniMetric label="Explores" value={changelog.metrics.explores} />
            <MiniMetric label="Bookmarks" value={changelog.metrics.bookmarks} />
            <MiniMetric label="Pinned" value={changelog.metrics.pinned} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
            <form onSubmit={publishAnnouncement} className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white">
                <Megaphone className="h-4 w-4 text-cyan-300" />
                Publish Update
              </div>
              <input
                value={announcementDraft.title}
                onChange={(event) => setAnnouncementDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="Update title"
                className="w-full rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none"
              />
              <textarea
                value={announcementDraft.body}
                onChange={(event) => setAnnouncementDraft((current) => ({ ...current, body: event.target.value }))}
                placeholder="What changed?"
                rows={3}
                className="w-full resize-none rounded-xl px-3.5 py-2.5 text-xs outline-none"
              />
              <input
                value={announcementDraft.reason}
                onChange={(event) => setAnnouncementDraft((current) => ({ ...current, reason: event.target.value }))}
                placeholder="Reason shown to users"
                className="w-full rounded-xl px-3.5 py-2.5 text-xs outline-none"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <input
                    type="checkbox"
                    checked={announcementDraft.isPinned}
                    onChange={(event) => setAnnouncementDraft((current) => ({ ...current, isPinned: event.target.checked, changeType: event.target.checked ? 'important' : 'announcement' }))}
                    className="h-4 w-4 rounded"
                  />
                  Pin as important
                </label>
                <button disabled={announcementLoading} className="soft-primary rounded-xl px-4 py-2 text-xs font-black disabled:opacity-50">
                  Publish
                </button>
              </div>
            </form>

            <div className="max-h-[360px] overflow-y-auto pr-1">
              {changelog.updates.length === 0 ? (
                <EmptyState text="No changelog entries published yet." />
              ) : (
                <div className="space-y-3">
                  {changelog.updates.slice(0, 12).map((update) => (
                    <div key={update._id} className="rounded-2xl border border-slate-200/50 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.025] p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-cyan-500">{update.changeType}</span>
                            {update.isPinned && <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-500">Pinned</span>}
                            <span className="text-[9px] font-bold text-slate-450">{new Date(update.createdAt).toLocaleString()}</span>
                          </div>
                          <h4 className="mt-2 line-clamp-1 text-sm font-black text-slate-900 dark:text-white">{update.title}</h4>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{update.reason}</p>
                        </div>
                        <button onClick={() => toggleChangelogPin(update)} className="rounded-xl border border-slate-200 dark:border-white/5 bg-white/60 dark:bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                          {update.isPinned ? 'Unpin' : 'Pin'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>


        {/* Rejected Questions Modal */}
        {isRejectedModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="nexus-glass relative w-full max-w-5xl rounded-3xl border border-slate-200/50 dark:border-white/5 bg-white dark:bg-[#0b0c10] p-6 shadow-2xl space-y-6 max-h-[85vh] flex flex-col animate-slide-in">
              <button 
                onClick={() => setIsRejectedModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-450 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 pb-3 border-b border-slate-150 dark:border-white/5">
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2 text-rose-500">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-white uppercase tracking-wider">Rejected Submissions Log</h3>
                  <p className="text-[10px] text-slate-450 font-bold uppercase mt-0.5">Audit reports for penalty deductions</p>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto pr-1">
                {rejectedQuestions.length === 0 ? (
                  <EmptyState text="No rejected submissions recorded." />
                ) : (
                  <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-150 dark:border-white/5 text-slate-450 uppercase tracking-widest text-[9px] font-black">
                          <th className="py-3 px-4">Question Title</th>
                          <th className="py-3 px-4">Author</th>
                          <th className="py-3 px-4">Reason</th>
                          <th className="py-3 px-4 text-right">Deducted</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-semibold text-slate-650 dark:text-slate-350">
                        {rejectedQuestions.map((thread) => (
                          <tr key={thread._id} className="hover:bg-slate-50/40 dark:hover:bg-white/[0.01] transition-all">
                            <td className="py-3.5 px-4 text-slate-900 dark:text-white max-w-xs truncate font-bold" title={thread.title}>
                              {thread.title}
                            </td>
                            <td className="py-3.5 px-4 capitalize">
                              {thread.author?.username || thread.authorName || 'Unknown'}
                            </td>
                            <td className="py-3.5 px-4 text-rose-500">
                              {thread.rejectionReason || 'Duplicate content'}
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-rose-500">
                              -{thread.rejectionPenaltyPoints || 0} SP
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const QueueRow = ({ thread }) => {
    const isEditing = editingQueueId === thread._id;
    const isLoading = queueLoadingId === thread._id;
    const isRejecting = rejectingId === thread._id;

    return (
      <div className="grid gap-4 py-5 lg:grid-cols-[1fr_auto] hover:bg-slate-50/[0.15] dark:hover:bg-white/[0.003] px-2 rounded-xl transition-colors">
        <div className="min-w-0 space-y-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-[#E07A15]/20 bg-[#E07A15]/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] text-[#E07A15] dark:text-[#FFAE59]">
              {thread.status === 'flagged' ? 'Flagged' : 'Review Queue'}
            </span>
            {thread.queuePosition && (
              <span className="shrink-0 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-indigo-500">
                Q#{thread.queuePosition}
              </span>
            )}
            <span className="text-[10px] font-bold text-slate-450">
              Submitted by {thread.author?.username || thread.authorName || 'Intern'} on {new Date(thread.createdAt).toLocaleDateString()}
            </span>
          </div>

          {isEditing ? (
            <div className="grid gap-3 max-w-xl">
              <input
                value={queueDraft.title}
                onChange={(event) => setQueueDraft((current) => ({ ...current, title: event.target.value }))}
                className="rounded-xl text-xs font-bold px-3.5 py-2 outline-none"
              />
              <textarea
                value={queueDraft.body}
                onChange={(event) => setQueueDraft((current) => ({ ...current, body: event.target.value }))}
                rows={3}
                className="resize-none rounded-xl text-xs px-3.5 py-2 outline-none"
              />
              <select
                value={queueDraft.category}
                onChange={(event) => setQueueDraft((current) => ({ ...current, category: event.target.value }))}
                className="w-full rounded-xl text-xs font-bold px-3.5 py-2 outline-none cursor-pointer sm:w-64"
              >
                {FAQ_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <h3 className="truncate text-sm sm:text-base font-extrabold text-slate-905 dark:text-white leading-snug">{thread.title}</h3>
              <p className="line-clamp-2 max-w-4xl text-xs sm:text-sm leading-relaxed text-slate-450 dark:text-slate-400 font-medium">{thread.body}</p>
              <div className="flex flex-wrap gap-3 text-[9px] font-black uppercase tracking-widest text-slate-400">
                <span className="flex items-center gap-1"><FolderOpen className="w-3.5 h-3.5 text-indigo-400" /> {thread.category}</span>
                <span>Toxicity {Math.round((thread.aiScores?.toxicityScore || 0) * 100)}%</span>
                <span>Spam Prob {Math.round((thread.aiScores?.spamProbability || 0) * 100)}%</span>
              </div>
            </>
          )}

          {isRejecting && (
            <div className="mt-4 p-4 rounded-2xl bg-rose-500/[0.02] border border-rose-500/20 space-y-4 animate-slide-in">
              <div className="flex items-center space-x-2 text-rose-500 font-black text-xs uppercase tracking-wider">
                <XCircle className="w-4 h-4" />
                <span>SP Penalty Deduction Report Form</span>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-[9px] font-extrabold uppercase text-slate-400 mb-1 tracking-wider">Select Rejection Reason</label>
                  <select
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full rounded-xl text-xs font-bold px-3.5 py-2.5 outline-none cursor-pointer"
                  >
                    <option value="Duplicate Question">Duplicate Question</option>
                    <option value="Spam/Off-topic">Spam/Off-topic</option>
                    <option value="Toxic/Abusive Content">Toxic/Abusive Content</option>
                    <option value="Incorrect Category">Incorrect Category</option>
                    <option value="Other / Violating guidelines">Other / Violating guidelines</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-extrabold uppercase text-slate-400 mb-1 tracking-wider">SP Penalty Deductions</label>
                  <input
                    type="number"
                    min="0"
                    value={rejectionPenalty}
                    onChange={(e) => setRejectionPenalty(e.target.value)}
                    className="w-full rounded-xl text-xs font-bold px-3.5 py-2.5 outline-none"
                    placeholder="e.g. 5"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setRejectingId(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-white/5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => submitInlineRejection(thread._id)}
                  className="px-4.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow cursor-pointer uppercase tracking-wider"
                >
                  Deduct & Reject
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-start gap-2.5 lg:justify-end shrink-0">
          {isEditing ? (
            <>
              <button onClick={() => saveQueueEdit(thread._id)} disabled={isLoading} className={`${actionButton} bg-blue-500 hover:bg-blue-600 text-white`}>
                <Save className="h-3.5 w-3.5" />
                Save
              </button>
              <button onClick={() => setEditingQueueId(null)} className={`${actionButton} border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/5 text-slate-650 hover:bg-slate-200 dark:hover:bg-white/10 dark:text-slate-200`}>
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => startQueueEdit(thread)} className={`${actionButton} border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/5 text-slate-650 hover:bg-slate-200 dark:hover:bg-white/10 dark:text-slate-200`}>
              <Pencil className="h-3.5 w-3.5 text-indigo-400" />
              Edit
            </button>
          )}
          <button onClick={() => reviewQueuedFAQ(thread._id, 'approve')} disabled={isLoading} className={`${actionButton} bg-emerald-500 hover:bg-emerald-600 text-white`}>
            Approve
          </button>
          <button onClick={() => reviewQueuedFAQ(thread._id, 'reject')} disabled={isLoading} className={`${actionButton} bg-rose-500 hover:bg-rose-600 text-white`}>
            Reject
          </button>
        </div>
      </div>
    );
  };

  return user.role === 'admin' ? renderAdminDashboard() : renderStudentDashboard();
};

const PanelTitle = ({ icon: Icon, title, count }) => (
  <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-2.5">
    <div className="flex min-w-0 items-center gap-2">
      <div className="rounded-lg border border-slate-200/50 dark:border-white/5 bg-slate-50 dark:bg-[#07080b] p-2 text-indigo-500">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <h3 className="truncate text-xs font-black uppercase tracking-[0.15em] text-slate-800 dark:text-slate-200">{title}</h3>
    </div>
    {typeof count !== 'undefined' && (
      <span className="rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 px-2.5 py-0.5 text-[10px] font-black text-slate-500 dark:text-slate-400">{count}</span>
    )}
  </div>
);

const MiniMetric = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200/40 dark:border-white/5 bg-slate-50 dark:bg-brand-950/40 p-4 shadow-sm">
    <p className="text-[9px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-black">{value}</p>
  </div>
);

const EmptyState = ({ text }) => (
  <div className="rounded-2xl border border-dashed border-slate-250 dark:border-white/10 bg-slate-50/50 dark:bg-brand-950/20 px-4 py-8 text-center text-xs font-extrabold uppercase tracking-wider text-slate-400">
    {text}
  </div>
);

const FlagRow = ({ label, title, onApprove, onDelete }) => (
  <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/[0.1] px-2 rounded-xl transition-colors">
    <div className="min-w-0">
      <p className="text-[9px] font-black uppercase tracking-widest text-rose-500 animate-pulse">{label}</p>
      <h4 className="mt-1 truncate text-xs sm:text-sm font-extrabold text-slate-800 dark:text-white leading-snug">{title}</h4>
    </div>
    <div className="flex shrink-0 gap-2">
      <button onClick={onApprove} className={`${actionButton} bg-emerald-500 hover:bg-emerald-600 text-white`}>Release Flag</button>
      <button onClick={onDelete} className={`${actionButton} bg-rose-500 hover:bg-rose-600 text-white`}>Deduct & Delete</button>
    </div>
  </div>
);

const SelectField = ({ label, value, onChange, threads, placeholder }) => (
  <label className="block">
    <span className="mb-2 block text-[9px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-500">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl text-xs font-bold px-3.5 py-3 outline-none cursor-pointer shadow-sm"
    >
      <option value="">{placeholder}</option>
      {threads.map((thread) => (
        <option key={thread._id} value={thread._id}>{thread.title}</option>
      ))}
    </select>
  </label>
);

export default Dashboard;
