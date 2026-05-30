import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../utils/api';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  GitMerge,
  MessageSquare,
  Pencil,
  Save,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  X,
  XCircle,
  Zap
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

  const StatCard = ({ label, value, icon: Icon, tone, detail, onClick }) => (
    <div 
      onClick={onClick} 
      className={`${glassPanel} overflow-hidden p-4 ${onClick ? 'cursor-pointer hover:bg-white/[0.04] transition-colors border-white/25' : ''}`}
    >
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className={`${glassPanel} p-5 lg:col-span-2`}>
            <PanelTitle icon={MessageSquare} title="My Raised Issues" count={raisedThreads.length} />
            <div className="mt-4 divide-y divide-white/10">
              {raisedThreads.length === 0 ? (
                <EmptyState text="You have not posted any questions yet." />
              ) : (
                raisedThreads.map((thread) => (
                  <button key={thread._id} onClick={() => setSelectedThreadId(thread._id)} className="group flex w-full items-center justify-between gap-4 py-4 text-left">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-black text-white group-hover:text-blue-300">{thread.title}</h3>
                        {thread.queuePosition && (
                          <span className="shrink-0 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-indigo-300">
                            Queue #{thread.queuePosition}
                          </span>
                        )}
                      </div>
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
          <StatCard 
            label="Rejected Questions" 
            value={counters.rejectedCount || 0} 
            icon={XCircle} 
            tone="from-rose-500 to-red-400" 
            detail="Total rejected questions" 
            onClick={() => setIsRejectedModalOpen(true)}
          />
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
          </section>

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

        {/* Rejected Questions Modal */}
        {isRejectedModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <div className="relative w-full max-w-5xl rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl space-y-6 max-h-[85vh] flex flex-col">
              <button 
                onClick={() => setIsRejectedModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 pb-2 border-b border-white/10">
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-400">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">Rejected Questions Log</h3>
                  <p className="text-xs text-slate-400">View reasons and deductions for rejected submissions</p>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto pr-1">
                {rejectedQuestions.length === 0 ? (
                  <EmptyState text="No rejected questions found." />
                ) : (
                  <div className="w-full overflow-x-auto animate-fade-in">
                    <table className="w-full border-collapse text-left text-xs text-slate-300">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px] font-extrabold">
                          <th className="py-3 px-4">Question Title</th>
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Reason</th>
                          <th className="py-3 px-4 text-right">SP Deducted</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {rejectedQuestions.map((thread) => (
                          <tr key={thread._id} className="hover:bg-white/[0.02] transition">
                            <td className="py-3.5 px-4 font-bold text-white max-w-xs truncate" title={thread.title}>
                              {thread.title}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-400">
                              {thread.author?.username || thread.authorName || 'Unknown'}
                            </td>
                            <td className="py-3.5 px-4 text-rose-350 font-semibold">
                              {thread.rejectionReason || 'No reason specified'}
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-rose-450">
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
      <div className="grid gap-4 py-5 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-violet-300/20 bg-violet-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-200">
              {thread.status === 'flagged' ? 'Flagged' : 'Pending Review'}
            </span>
            {thread.queuePosition && (
              <span className="shrink-0 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-indigo-300">
                Queue #{thread.queuePosition}
              </span>
            )}
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

          {isRejecting && (
            <div className="mt-4 p-4 rounded-2xl bg-rose-950/20 border border-rose-500/20 space-y-4 font-sans text-white">
              <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs">
                <XCircle className="w-4 h-4 text-rose-500" />
                <span>Rejection & SP Deduction Form</span>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1.5 tracking-wider">Rejection Reason</label>
                  <select
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs font-bold text-slate-200 outline-none transition focus:border-rose-500 cursor-pointer"
                  >
                    <option value="Duplicate Question">Duplicate Question</option>
                    <option value="Spam/Off-topic">Spam/Off-topic</option>
                    <option value="Toxic/Abusive Content">Toxic/Abusive Content</option>
                    <option value="Incorrect Category">Incorrect Category</option>
                    <option value="Other / Violating community guidelines">Other / Violating community guidelines</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1.5 tracking-wider">SP Penalty (Deduct SP)</label>
                  <input
                    type="number"
                    min="0"
                    value={rejectionPenalty}
                    onChange={(e) => setRejectionPenalty(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs font-bold text-slate-200 outline-none transition focus:border-rose-500"
                    placeholder="e.g. 5"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setRejectingId(null)}
                  className="px-3.5 py-1.5 border border-white/10 bg-white/[0.06] text-slate-200 hover:bg-white/10 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => submitInlineRejection(thread._id)}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition-all shadow cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
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
