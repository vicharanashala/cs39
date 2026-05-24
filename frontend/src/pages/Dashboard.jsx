import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../utils/api';
import { 
  ShieldCheck, 
  Users, 
  MessageSquare, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight,
  GitMerge
} from 'lucide-react';

const Dashboard = () => {
  const { user, setSelectedThreadId, showAlert } = useApp();
  const [adminStats, setAdminStats] = useState(null);
  const [flaggedContent, setFlaggedContent] = useState({ threads: [], answers: [] });
  const [studentStats, setStudentStats] = useState(null);
  const [error, setError] = useState(false);
  
  // Merge state
  const [mergeSource, setMergeSource] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');
  const [mergeLoading, setMergeLoading] = useState(false);
  const [mergeableThreads, setMergeableThreads] = useState([]);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        fetchAdminData();
      } else {
        fetchStudentData();
      }
    }
  }, [user]);

  const fetchAdminData = async () => {
    setError(false);
    try {
      const statsRes = await api.get('/admin/dashboard-stats');
      setAdminStats(statsRes.data);
      
      const flaggedRes = await api.get('/admin/flagged');
      setFlaggedContent(flaggedRes.data);

      const threadsRes = await api.get('/threads');
      setMergeableThreads(threadsRes.data.filter(t => t.status === 'active' && !t.isMerged));
    } catch (error) {
      console.error('Fetch admin stats error:', error.message);
      setError(true);
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

  const handleModerateAction = async (itemId, itemType, action) => {
    try {
      await api.post('/admin/moderate-action', { itemId, itemType, action });
      showAlert(`Content ${action === 'approve' ? 'approved' : 'deleted'} successfully`, 'success');
      fetchAdminData();
    } catch (error) {
      console.error('Moderation error:', error.message);
    }
  };

  const handleMergeSubmit = async (e) => {
    e.preventDefault();
    if (!mergeSource || !mergeTarget) {
      return showAlert('Select both source and target threads to merge', 'error');
    }
    if (mergeSource === mergeTarget) {
      return showAlert('Source and Target threads must be different', 'error');
    }

    setMergeLoading(true);
    try {
      await api.post('/admin/merge-threads', {
        sourceThreadId: mergeSource,
        targetThreadId: mergeTarget
      });
      showAlert('Duplicate FAQ merged successfully.', 'success');
      setMergeSource('');
      setMergeTarget('');
      fetchAdminData();
    } catch (error) {
      console.error('Merge error:', error.message);
    }
    setMergeLoading(false);
  };

  // 1. RENDER STUDENT VIEW
  const renderStudentDashboard = () => {
    if (error) {
      return (
        <div className="py-20 text-center space-y-4">
          <p className="text-xs text-slate-500 font-bold">Failed to load student dashboard stats.</p>
          <button
            onClick={fetchStudentData}
            className="px-4.5 py-2.5 bg-brand-500 text-white rounded-xl text-xs font-bold transition-all shadow"
          >
            Retry Loading
          </button>
        </div>
      );
    }

    if (!studentStats) {
      return <div className="py-20 text-center text-xs text-slate-400">Loading student details...</div>;
    }

    const { stats, raisedThreads, solvedAnswers } = studentStats;

    return (
      <div className="space-y-6 font-sans">
        
        {/* Welcome */}
        <div className="bg-slate-900 p-5 rounded-2xl text-white shadow-sm">
          <h2 className="text-base font-bold capitalize">Welcome, {user.username}!</h2>
          <p className="text-xs text-slate-400 mt-0.5">Contributor status: {user.contributionRating}. Use this portal to find answers or ask internship queries.</p>
        </div>

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
          <div className="md:col-span-2 bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-955 p-5 rounded-2xl shadow-sm space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b pb-2 dark:border-brand-950">My Raised Issues & Answers</span>
            <div className="divide-y divide-slate-100 dark:divide-brand-950 text-xs">
              {raisedThreads.length === 0 ? (
                <p className="text-slate-400 py-4 text-center">You haven't posted any questions yet.</p>
              ) : (
                raisedThreads.map(thread => (
                  <div key={thread._id} className="py-3.5 space-y-2.5">
                    {/* Thread Link */}
                    <div 
                      onClick={() => setSelectedThreadId(thread._id)}
                      className="flex justify-between items-center cursor-pointer group"
                    >
                      <span className="font-extrabold text-slate-855 dark:text-slate-200 group-hover:text-brand-500 text-xs leading-normal">
                        ❓ {thread.title}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
                    </div>
                    
                    {/* Nested Answers list */}
                    <div className="pl-4 border-l-2 border-slate-100 dark:border-brand-850 space-y-2">
                      {!thread.answers || thread.answers.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic">No answers submitted yet.</p>
                      ) : (
                        thread.answers.map(ans => (
                          <div key={ans._id} className="p-2.5 bg-slate-50 dark:bg-brand-950/40 rounded-xl space-y-1">
                            <div className="flex justify-between items-center text-[9px] font-bold">
                              <span className="text-slate-600 dark:text-slate-350 flex items-center">
                                💬 {ans.authorName} {ans.isVerified && <span className="text-emerald-500 font-extrabold ml-1.5 bg-emerald-500/10 px-1 py-0.2 rounded text-[7px]">Verified Answer</span>}
                              </span>
                              <span className="text-slate-400">{new Date(ans.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal italic">"{ans.body}"</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Solved Answers by User */}
          <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-955 p-5 rounded-2xl shadow-sm space-y-3 h-fit">
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

        </div>

      </div>
    );
  };

  // 2. RENDER ADMIN VIEW
  const renderAdminDashboard = () => {
    if (error) {
      return (
        <div className="py-20 text-center space-y-4">
          <p className="text-xs text-slate-500 font-bold">Failed to load admin operations dashboard.</p>
          <button
            onClick={fetchAdminData}
            className="px-4.5 py-2.5 bg-brand-500 text-white rounded-xl text-xs font-bold transition-all shadow"
          >
            Retry Loading
          </button>
        </div>
      );
    }

    if (!adminStats) {
      return <div className="py-20 text-center text-xs text-slate-400">Loading admin operations...</div>;
    }

    const { counters } = adminStats;

    return (
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
          
          <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-955 p-4 rounded-xl shadow-sm text-center">
            <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wide">Students</span>
            <h3 className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{counters.usersCount}</h3>
          </div>

          <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-955 p-4 rounded-xl shadow-sm text-center">
            <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wide">FAQ Threads</span>
            <h3 className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{counters.threadsCount}</h3>
          </div>

          <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-955 p-4 rounded-xl shadow-sm text-center">
            <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wide">Verified Answers</span>
            <h3 className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{counters.verifiedAnswersCount}</h3>
          </div>

          <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-955 p-4 rounded-xl shadow-sm text-center">
            <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wide">Moderation Queue</span>
            <h3 className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{counters.pendingApprovalCount}</h3>
          </div>

        </div>

        {/* Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Moderation Flags list */}
          <div className="lg:col-span-2 bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-955 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b pb-2 dark:border-brand-950">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Toxicity Flags Queue ({flaggedContent.threads.length + flaggedContent.answers.length})</span>
            </div>
            
            <div className="divide-y divide-slate-100 dark:divide-brand-950 text-xs max-h-72 overflow-y-auto">
              {flaggedContent.threads.length === 0 && flaggedContent.answers.length === 0 ? (
                <p className="text-slate-400 py-6 text-center">Queue is clean.</p>
              ) : (
                <>
                  {flaggedContent.threads.map(thread => (
                    <div key={thread._id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="max-w-[70%]">
                        <span className="bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase px-1 rounded">Flagged Thread</span>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate mt-0.5">{thread.title}</h4>
                      </div>
                      <div className="flex space-x-1.5 shrink-0">
                        <button 
                          onClick={() => handleModerateAction(thread._id, 'thread', 'approve')}
                          className="px-2.5 py-1 bg-emerald-500 text-white rounded text-[10px] font-bold"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleModerateAction(thread._id, 'thread', 'delete')}
                          className="px-2.5 py-1 bg-rose-500 text-white rounded text-[10px] font-bold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {flaggedContent.answers.map(ans => (
                    <div key={ans._id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="max-w-[70%]">
                        <span className="bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase px-1 rounded">Flagged Answer</span>
                        <p className="text-slate-500 italic truncate mt-0.5">"{ans.body}"</p>
                      </div>
                      <div className="flex space-x-1.5 shrink-0">
                        <button 
                          onClick={() => handleModerateAction(ans._id, 'answer', 'approve')}
                          className="px-2.5 py-1 bg-emerald-500 text-white rounded text-[10px] font-bold"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleModerateAction(ans._id, 'answer', 'delete')}
                          className="px-2.5 py-1 bg-rose-500 text-white rounded text-[10px] font-bold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Merge Duplicate FAQ Form */}
          <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-955 p-5 rounded-2xl shadow-sm space-y-4 h-fit">
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

              <button
                type="submit"
                disabled={mergeLoading || !mergeSource || !mergeTarget}
                className="w-full py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 shadow"
              >
                <span>{mergeLoading ? 'Merging...' : 'Merge Threads'}</span>
              </button>
            </form>
          </div>

        </div>

      </div>
    );
  };

  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto">
      {user.role === 'admin' ? renderAdminDashboard() : renderStudentDashboard()}
    </div>
  );
};

export default Dashboard;
