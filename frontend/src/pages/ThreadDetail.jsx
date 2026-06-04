import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../utils/api';
import {
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  MessageSquare,
  Send,
  ShieldCheck,
  Trash2,
  Calendar,
  AlertTriangle,
  Users,
  X,
  Sparkles,
  Tag,
  AlignLeft,
  ChevronDown,
  ChevronUp,
  Zap,
  AlertCircle,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { TTSButton } from '../components/TTSButton';
import { LiveFAQTracker } from '../components/LiveFAQTracker';

const ALL_CATEGORIES = [
  'Internship', 'Selection Process', 'Certificates', 'Attendance', 
  'Assignments', 'Mentorship', 'Projects', 'Deadlines', 
  'Technical Issues', 'Payments', 'General Queries', 'Announcements', 'Others'
];

const ThreadDetail = () => {
  const { user, selectedThreadId, setSelectedThreadId, setActiveTab, addToast } = useApp();
  const [thread, setThread] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  
  // Creation States
  const [newAnswer, setNewAnswer] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  
  // Comment Accordion states
  const [expandedComments, setExpandedComments] = useState({}); // { ansId: boolean }
  const [commentsMap, setCommentsMap] = useState({}); // { ansId: [comments] }
  const [newCommentText, setNewCommentText] = useState({}); // { ansId: string }

  // Editing states
  const [isEditingThread, setIsEditingThread] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editingAnswerId, setEditingAnswerId] = useState(null);
  const [editAnswerBody, setEditAnswerBody] = useState('');

  // Admin Verification states
  const [verifyingAnswerId, setVerifyingAnswerId] = useState(null);
  const [verifyCategory, setVerifyCategory] = useState('');
  const [verifyAnswerBody, setVerifyAnswerBody] = useState('');
  const [verifyQuestionSp, setVerifyQuestionSp] = useState('10');
  const [verifyAnswerSp, setVerifyAnswerSp] = useState('5');

  useEffect(() => {
    if (selectedThreadId) {
      fetchThreadDetails();
    }
  }, [selectedThreadId]);

  const fetchThreadDetails = async () => {
    setLoading(true);
    setError(false);
    try {
      const threadRes = await api.get(`/threads/${selectedThreadId}`);
      setThread(threadRes.data);

      const answersRes = await api.get(`/threads/${selectedThreadId}/answers`);
      setAnswers(answersRes.data);
    } catch (err) {
      console.error('Fetch thread details error:', err.message);
      setError(true);
      addToast('Error', 'Failed to retrieve thread details', 'verification');
    }
    setLoading(false);
  };

  const handleThreadVote = async () => {
    try {
      const res = await api.post(`/threads/${thread._id}/upvote`);
      setThread(prev => ({ ...prev, upvotes: res.data.upvotes }));
    } catch (error) {
      console.error('Vote thread error:', error.message);
      addToast('Error', 'Failed to submit vote', 'verification');
    }
  };

  const handleMeToo = async () => {
    try {
      const res = await api.post(`/threads/${thread._id}/metoo`);
      setThread(prev => ({ ...prev, meToo: res.data.meToo }));
    } catch (error) {
      console.error('MeToo error:', error.message);
      addToast('Error', 'Failed to register Me Too status', 'verification');
    }
  };

  const handleAnswerSubmit = async (e) => {
    e.preventDefault();
    if (!newAnswer.trim()) return;

    setSubmitLoading(true);
    try {
      await api.post(`/threads/${thread._id}/answers/create`, { body: newAnswer });
      api.post('/admin/analytics/log-activity', {
        action: 'post_answer',
        metadata: { threadId: thread._id }
      }).catch(() => {});
      setNewAnswer('');
      // Reload answers list
      const answersRes = await api.get(`/threads/${thread._id}/answers`);
      setAnswers(answersRes.data);
      addToast('Success', 'Answer posted successfully', 'sp_change');
    } catch (error) {
      console.error('Submit answer error:', error.message);
      addToast('Error', error.response?.data?.message || 'Failed to submit answer', 'verification');
    }
    setSubmitLoading(false);
  };

  const handleAnswerVote = async (ansId) => {
    try {
      const res = await api.post(`/threads/answers/${ansId}/upvote`);
      setAnswers(prev => 
        prev.map(a => a._id === ansId ? { ...a, upvotes: res.data.upvotes } : a)
      );
      api.post('/admin/analytics/log-activity', {
        action: 'upvote',
        metadata: { threadId: thread._id, answerId: ansId }
      }).catch(() => {});
    } catch (error) {
      console.error('Vote answer error:', error.message);
      addToast('Error', 'Failed to upvote answer', 'verification');
    }
  };

  const handleAnswerFeedback = async (ansId, helpful) => {
    try {
      if (helpful) {
        await handleAnswerVote(ansId);
        return;
      }
      const res = await api.post(`/threads/answers/${ansId}/feedback`, { helpful: false });
      setAnswers(prev =>
        prev.map(a => a._id === ansId ? { ...a, upvotes: res.data.answer?.upvotes || a.upvotes, userFeedback: res.data.feedback } : a)
      );
      addToast('Feedback saved', 'Thanks for rating this answer.', 'verification');
    } catch (error) {
      console.error('Answer feedback error:', error.message);
      addToast('Error', 'Failed to save answer feedback', 'verification');
    }
  };

  // Comments toggling
  const toggleComments = async (ansId) => {
    const isExpanded = !!expandedComments[ansId];
    setExpandedComments(prev => ({ ...prev, [ansId]: !isExpanded }));

    if (!isExpanded && !commentsMap[ansId]) {
      fetchComments(ansId);
    }
  };

  const fetchComments = async (ansId) => {
    try {
      const res = await api.get(`/threads/answers/${ansId}/comments`);
      setCommentsMap(prev => ({ ...prev, [ansId]: res.data }));
    } catch (error) {
      console.error('Fetch comments error:', error.message);
      addToast('Error', 'Failed to retrieve comments', 'verification');
    }
  };

  const handleCommentSubmit = async (e, ansId) => {
    e.preventDefault();
    const commentBody = newCommentText[ansId];
    if (!commentBody || !commentBody.trim()) return;

    try {
      await api.post(`/threads/answers/${ansId}/comments`, { body: commentBody });
      setNewCommentText(prev => ({ ...prev, [ansId]: '' }));
      fetchComments(ansId); // Refresh comments list
    } catch (error) {
      console.error('Submit comment error:', error.message);
      addToast('Error', 'Failed to submit comment', 'verification');
    }
  };

  const handleCommentTextChange = (ansId, text) => {
    setNewCommentText(prev => ({ ...prev, [ansId]: text }));
  };

  // ADMIN OPERATIONS
  const startVerifyAnswer = (ans) => {
    setVerifyingAnswerId(ans._id);
    setVerifyCategory(thread.category);
    setVerifyAnswerBody(ans.body);
    setVerifyQuestionSp('10');
    setVerifyAnswerSp('5');
  };

  const handleVerifySubmit = async (e, ansId) => {
    e.preventDefault();
    try {
      await api.post(`/admin/verify-answer/${ansId}`, {
        category: verifyCategory,
        answerBody: verifyAnswerBody,
        questionAuthorSp: parseInt(verifyQuestionSp, 10),
        answerAuthorSp: parseInt(verifyAnswerSp, 10)
      });
      setVerifyingAnswerId(null);
      fetchThreadDetails(); // Refresh all
      addToast('Verified', 'Answer verified successfully. FAQ is now locked, category updated, and SP awarded.', 'verification');
    } catch (error) {
      console.error('Verify answer error:', error.message);
      addToast('Error', error.response?.data?.message || 'Failed to verify answer', 'verification');
    }
  };

  const startEditThread = () => {
    setEditTitle(thread.title);
    setEditBody(thread.body);
    setEditCategory(thread.category);
    setIsEditingThread(true);
  };

  const handleEditThreadSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = thread.isOfficial && user.role === 'admin'
        ? `/admin/official-faq/${thread._id}`
        : `/threads/${thread._id}`;
      const res = await api.put(endpoint, {
        title: editTitle,
        body: editBody,
        category: editCategory,
        reason: 'Official FAQ question details were refreshed from the admin editor.'
      });
      setThread(res.data.thread || res.data);
      setIsEditingThread(false);
      addToast('Success', 'Question updated successfully', 'sp_change');
    } catch (error) {
      console.error('Update thread error:', error.message);
      addToast('Error', error.response?.data?.message || 'Failed to update question', 'verification');
    }
  };

  const handleDeleteThread = async () => {
    if (!confirm('Are you sure you want to delete your question? This cannot be undone.')) return;
    try {
      await api.delete(`/threads/${thread._id}`);
      addToast('Success', 'Question deleted successfully', 'sp_change');
      setSelectedThreadId(null);
      setActiveTab('feed');
    } catch (error) {
      console.error('Delete thread error:', error.message);
      addToast('Error', 'Failed to delete question', 'verification');
    }
  };

  const startEditAnswer = (ans) => {
    setEditingAnswerId(ans._id);
    setEditAnswerBody(ans.body);
  };

  const handleEditAnswerSubmit = async (e, ansId) => {
    e.preventDefault();
    try {
      await api.put(`/threads/answers/${ansId}`, { body: editAnswerBody });
      setEditingAnswerId(null);
      const answersRes = await api.get(`/threads/${thread._id}/answers`);
      setAnswers(answersRes.data);
      addToast('Success', 'Answer updated successfully', 'sp_change');
    } catch (error) {
      console.error('Update answer error:', error.message);
      addToast('Error', 'Failed to update answer', 'verification');
    }
  };

  const handleDeleteAnswer = async (ans) => {
    const isAnsAuthor = ans.author?.toString() === user.id?.toString();
    
    if (isAnsAuthor) {
      if (!confirm('Are you sure you want to delete your answer?')) return;
      try {
        await api.delete(`/threads/answers/${ans._id}`);
        fetchThreadDetails();
        addToast('Deleted', 'Answer deleted successfully.', 'reply');
      } catch (error) {
        console.error('Delete answer error:', error.message);
        addToast('Error', 'Failed to delete answer', 'verification');
      }
    } else if (user.role === 'admin') {
      if (!confirm("Are you sure you want to delete this answer?")) return;
      const pointsInput = window.prompt("Enter SP points to deduct from the author (or 0 for no penalty):", "5");
      if (pointsInput === null) return; // user cancelled
      const penaltyPoints = parseInt(pointsInput, 10);
      if (isNaN(penaltyPoints) || penaltyPoints < 0) {
        addToast('Error', 'Invalid SP points entered', 'verification');
        return;
      }
      try {
        await api.delete(`/threads/answers/${ans._id}`, { params: { penaltyPoints } });
        fetchThreadDetails();
        addToast('Moderated', 'Answer removed successfully.', 'reply');
      } catch (error) {
        console.error('Delete answer error:', error.message);
        addToast('Error', 'Failed to delete answer', 'verification');
      }
    }
  };

  const handleMakeOfficial = async () => {
    try {
      await api.post(`/admin/make-official/${thread._id}`);
      fetchThreadDetails();
      addToast('Official FAQ', 'Thread marked as official FAQ. Author rewarded SP.', 'verification');
    } catch (error) {
      console.error('Make official error:', error.message);
      addToast('Error', 'Failed to mark official FAQ', 'verification');
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-2 border-[#E07A15] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Parsing discussion nodes...</p>
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="py-24 text-center space-y-4">
        <p className="text-xs text-slate-500 font-black uppercase tracking-wider">Failed to resolve discussion question.</p>
        <button
          onClick={() => { setSelectedThreadId(null); setActiveTab('feed'); }}
          className="soft-primary px-5 py-3 rounded-2xl text-xs font-black transition-all shadow"
        >
          Return to FAQ Feed
        </button>
      </div>
    );
  }

  const userUpvotedThread = thread.upvotes?.includes(user?.id) || false;
  const userMeTooThread = thread.meToo?.includes(user?.id) || false;
  const hasVerifiedAnswer = answers.some(a => a.isVerified);

  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto space-y-6 font-sans">
      
      {/* Back button link */}
      <button 
        onClick={() => setSelectedThreadId(null)}
        className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-[#E07A15] dark:hover:text-[#FFAE59] transition-colors cursor-pointer bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 px-4.5 py-2.5 rounded-2xl shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to FAQ Feed</span>
      </button>

      {/* Live FAQ Tracking Panel */}
      {thread && !thread.isOfficial && <LiveFAQTracker threadId={thread._id} />}

      {/* Review Status Banner */}
      {thread && thread.status !== 'active' && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4.5 flex items-start space-x-3 text-amber-600 dark:text-[#FFAE59]">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#E07A15' }} />
          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-wider mb-1">Question Under Moderation</h4>
            <p className="text-xs leading-relaxed text-slate-650 dark:text-slate-350">
              This discussion question is currently under evaluation by the IIT Ropar Moderation Team. It will become indexed across the feed once review operations complete.
            </p>
          </div>
        </div>
      )}

      {/* Main Question Container Card */}
      <div className="soft-panel bg-white/70 dark:bg-[#0b0c10]/40 border border-slate-200/50 dark:border-white/5 p-6 rounded-3xl shadow-xl backdrop-blur-3xl space-y-5">
        
        {isEditingThread ? (
          /* Editing form mode */
          <form onSubmit={handleEditThreadSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1.5 tracking-wider">Select Folder Category</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none cursor-pointer font-bold"
              >
                {ALL_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1.5 tracking-wider">Question Title Description</label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingThread(false)}
                className="px-4.5 py-2.5 border border-slate-200 dark:border-white/5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="soft-primary px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow cursor-pointer"
              >
                Save Edits
              </button>
            </div>
          </form>
        ) : (
          /* Normal viewing mode */
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
              <span className="bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border border-indigo-500/20">
                {thread.category}
              </span>
              
              <div className="flex items-center space-x-2.5 text-[9px] font-black uppercase tracking-wider">
                {thread.isOfficial && (
                  <span className="flex items-center space-x-1.5 text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 shadow-sm animate-pulse">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Official FAQ Guide</span>
                  </span>
                )}
                {thread.status === 'flagged' && (
                  <span className="flex items-center space-x-1.5 text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 shadow-sm">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#E07A15]" />
                    <span>Flagged by Safety</span>
                  </span>
                )}
                <span className="text-slate-400 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(thread.createdAt).toLocaleDateString()}</span>
                </span>
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-snug tracking-tight">
              {thread.title}
            </h2>

            {thread.body !== thread.title && (
              <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-brand-950/20 rounded-2xl border border-slate-200/50 dark:border-white/5">
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap flex-1">
                  {thread.body}
                </p>
                <div className="shrink-0 mt-0.5">
                  <TTSButton text={thread.body} size="sm" />
                </div>
              </div>
            )}

            {/* Auto-Analysis HUD Console */}
            {thread.analysisMetadata?.analyzedAt && (
              <details className="group rounded-2xl border border-slate-200/50 dark:border-white/5 overflow-hidden shadow-inner">
                <summary className="flex items-center justify-between gap-3 px-4.5 py-3.5 bg-slate-50/50 dark:bg-white/[0.01] cursor-pointer select-none">
                  <div className="flex items-center space-x-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    <span>AI Heuristics Analysis</span>
                    {thread.analysisMetadata.confidence >= 0.8 && (
                      <span className="bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border border-emerald-500/20">High Match</span>
                    )}
                    {thread.analysisMetadata.confidence < 0.5 && (
                      <span className="bg-amber-500/15 text-amber-500 dark:text-[#FFAE59] px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border border-amber-500/20">Low Confidence</span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2.5">
                    {thread.priority && (
                      <span className={`text-[8px] font-black px-2.5 py-0.5 rounded-lg border uppercase tracking-wider ${
                        thread.priority === 'urgent' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                        thread.priority === 'high' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                        thread.priority === 'medium' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        'bg-slate-200 text-slate-500 border-slate-350'
                      }`}>
                      {thread.priority} Priority
                    </span>
                    )}
                    <ChevronDown className="w-4 h-4 text-slate-400 group-open:hidden" />
                    <ChevronUp className="w-4 h-4 text-slate-400 hidden group-open:block" />
                  </div>
                </summary>
                
                <div className="px-5 py-5 bg-white/40 dark:bg-brand-950/[0.02] space-y-4 border-t border-slate-100 dark:border-white/5 animate-slide-in">
                  {thread.summary && (
                    <div className="flex items-start gap-3 p-3.5 bg-slate-50 dark:bg-[#07080b]/60 rounded-2xl border border-slate-200/40 dark:border-white/5">
                      <AlignLeft className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase text-slate-450 tracking-widest mb-1.5">Abstract Auto-Summary</p>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{thread.summary}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {thread.priority && (
                      <div className="flex items-start gap-3 p-3 bg-slate-50/50 dark:bg-white/[0.01] rounded-2xl border border-slate-200/40 dark:border-white/5">
                        <Zap className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[9px] font-black uppercase text-slate-450 tracking-widest mb-1">Risk Weight</p>
                          <span className={`inline-block text-[8px] font-black px-2.5 py-0.5 rounded-lg border uppercase tracking-wider ${
                            thread.priority === 'urgent' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                            thread.priority === 'high' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                            thread.priority === 'medium' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                            'bg-slate-200 text-slate-500 border-slate-300'
                          }`}>
                            {thread.priority} Status
                          </span>
                          {thread.analysisMetadata.priorityScore > 0 && (
                            <span className="text-[10px] text-slate-400 font-bold ml-2">Weight Factor: {thread.analysisMetadata.priorityScore}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {thread.analysisMetadata.categoryHint && thread.analysisMetadata.categoryHint !== thread.category && (
                      <div className="flex items-start gap-3 p-3 bg-slate-50/50 dark:bg-white/[0.01] rounded-2xl border border-slate-200/40 dark:border-white/5">
                        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[9px] font-black uppercase text-slate-455 tracking-widest mb-1">Suggested Folder</p>
                          <span className="inline-block text-[8px] font-black px-2.5 py-0.5 bg-amber-500/10 text-[#E07A15] dark:text-[#FFAE59] rounded-lg border border-amber-500/20">
                            {thread.analysisMetadata.categoryHint}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {thread.tags?.length > 0 && (
                    <div className="flex items-start gap-3 p-3 bg-slate-50/50 dark:bg-white/[0.01] rounded-2xl border border-slate-200/40 dark:border-white/5">
                      <Tag className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase text-slate-455 tracking-widest mb-2">Heuristic Keywords</p>
                        <div className="flex flex-wrap gap-1.5">
                          {thread.tags.map(tag => (
                            <span key={tag} className="inline-flex items-center px-2.5 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[8px] font-black uppercase tracking-wider rounded-md border border-indigo-500/20">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {(thread.structuredBody?.instruction || thread.structuredBody?.steps?.length > 0 || thread.structuredBody?.note) && (
                    <div className="space-y-2.5">
                      <p className="text-[9px] font-black uppercase text-slate-450 tracking-widest">Semantic Breakdown</p>
                      <div className="bg-slate-50 dark:bg-[#07080b]/60 rounded-2xl p-4 space-y-3.5 border border-slate-200/40 dark:border-white/5 shadow-inner">
                        {thread.structuredBody.instruction && (
                          <div className="flex items-start gap-2 border-b border-slate-200/50 dark:border-white/5 pb-2.5">
                            <span className="text-[10px] font-black text-brand-500 mt-0.5 shrink-0">→</span>
                            <p className="text-xs text-slate-800 dark:text-slate-200 font-extrabold">{thread.structuredBody.instruction}</p>
                          </div>
                        )}
                        {thread.structuredBody.steps?.length > 0 && (
                          <ol className="space-y-2 pl-4">
                            {thread.structuredBody.steps.map((step, i) => (
                              <li key={i} className="flex items-start gap-2.5 text-xs text-slate-650 dark:text-slate-400 font-medium">
                                <span className="text-[9px] font-black text-brand-500 mt-0.5 shrink-0">{i + 1}.</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        )}
                        {thread.structuredBody.note && (
                          <div className="flex items-start gap-2 mt-3 pt-2.5 border-t border-slate-200/50 dark:border-white/5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0 animate-pulse" />
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 font-extrabold italic leading-snug">{thread.structuredBody.note}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {thread.analysisMetadata.confidence > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Analysis Engine Confidence</span>
                      <div className="flex items-center space-x-3">
                        <div className="w-24 h-2 bg-slate-200 dark:bg-[#07080b]/80 border border-slate-200/30 dark:border-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              thread.analysisMetadata.confidence >= 0.7 ? 'bg-emerald-500' :
                              thread.analysisMetadata.confidence >= 0.4 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.round(thread.analysisMetadata.confidence * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-200">{Math.round(thread.analysisMetadata.confidence * 100)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Voting and ownership stamps footer */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-white/5">
              {!thread.isOfficial && (
                <div className="flex items-center space-x-3">
                  {/* Me Too */}
                  <button
                    onClick={thread.author?.toString() === user.id?.toString() || hasVerifiedAnswer ? null : handleMeToo}
                    disabled={thread.author?.toString() === user.id?.toString() || hasVerifiedAnswer}
                    className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl text-xs font-black border transition-all cursor-pointer ${
                      thread.author?.toString() === user.id?.toString() || hasVerifiedAnswer
                        ? 'bg-slate-100 dark:bg-brand-950/20 text-slate-400 border-slate-200 dark:border-brand-900/40 cursor-not-allowed opacity-60'
                        : userMeTooThread
                          ? 'bg-amber-500/15 text-[#E07A15] border-amber-500/30'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#07080b] dark:hover:bg-white/5 text-slate-650 dark:text-slate-350 border-transparent shadow-sm'
                    }`}
                    title={thread.author?.toString() === user.id?.toString() ? "Cannot vote on own issue" : hasVerifiedAnswer ? "Locked" : "Mark Me Too"}
                  >
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>{thread.meToo?.length || 0} Me Too</span>
                  </button>

                  {/* Upvote */}
                  <button
                    onClick={thread.author?.toString() === user.id?.toString() || hasVerifiedAnswer ? null : handleThreadVote}
                    disabled={thread.author?.toString() === user.id?.toString() || hasVerifiedAnswer}
                    className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl text-xs font-black border transition-all cursor-pointer ${
                      thread.author?.toString() === user.id?.toString() || hasVerifiedAnswer
                        ? 'bg-slate-100 dark:bg-brand-950/20 text-slate-400 border-slate-200 dark:border-brand-900/40 cursor-not-allowed opacity-60'
                        : userUpvotedThread
                          ? 'bg-[#FFAE59]/10 dark:bg-[#FFAE59]/20 text-[#E07A15] dark:text-[#FFAE59] border-[#FFAE59]/30'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#07080b] dark:hover:bg-white/5 text-slate-655 dark:text-slate-350 border-transparent shadow-sm'
                    }`}
                    title={thread.author?.toString() === user.id?.toString() ? "Cannot upvote own issue" : hasVerifiedAnswer ? "Locked" : "Upvote question"}
                  >
                    <ArrowUp className="w-4 h-4 text-amber-500" />
                    <span>{thread.upvotes?.length || 0} Votes</span>
                  </button>
                </div>
              )}

              <div className="flex items-center space-x-3.5">
                {/* Author badge */}
                <div className="text-right">
                  <span className="text-[9px] text-slate-405 dark:text-slate-500 font-extrabold uppercase tracking-wider block">Raised by</span>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200 capitalize">{thread.authorName}</span>
                </div>
                
                {/* Actions logs controls */}
                <div className="flex items-center space-x-2 border-l border-slate-200 dark:border-white/5 pl-3">
                  {((thread.author?.toString() === user.id?.toString() && !thread.isOfficial) || user.role === 'admin') && (
                    <>
                      <button
                        onClick={startEditThread}
                        className="text-[9px] font-black text-slate-450 hover:text-[#E07A15] dark:hover:text-[#FFAE59] transition-colors uppercase tracking-wider cursor-pointer"
                      >
                        Edit
                      </button>
                      <span className="text-slate-300 text-[10px]">•</span>
                    </>
                  )}
                  {(thread.author?.toString() === user.id?.toString() || user.role === 'admin') && (
                    <button
                      onClick={handleDeleteThread}
                      className="text-[9px] font-black text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-wider cursor-pointer"
                    >
                      Delete
                    </button>
                  )}
                </div>

                {/* Admin Make Official FAQ */}
                {user.role === 'admin' && !thread.isOfficial && (
                  <button
                    onClick={handleMakeOfficial}
                    className="flex items-center space-x-1.5 px-3 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 hover:bg-indigo-500 border border-indigo-500/20 text-indigo-500 hover:text-white transition-all cursor-pointer shadow-sm"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Make Official</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}

      </div>

      {/* Answers Section Label Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-3.5 mt-8">
        <h3 className="font-black text-sm text-slate-800 dark:text-white flex items-center space-x-2">
          <span>Replies ({answers.length})</span>
        </h3>
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Priority Sorted Flow</span>
      </div>

      {/* Answers Listings block */}
      <div className="space-y-4">
        {answers.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-450 dark:text-slate-400 bg-white/60 dark:bg-[#0b0c10]/40 rounded-3xl border border-slate-200/50 dark:border-white/5">
            No reply records indexed yet. Be the first to answer this question!
          </div>
        ) : (
          (() => {
            const displayAnswers = hasVerifiedAnswer ? answers.filter(a => a.isVerified) : answers;
            
            return displayAnswers.map((ans) => {
              const hasUpvoted = ans.upvotes?.includes(user?.id) || false;
              const isCommentsExpanded = !!expandedComments[ans._id];
              const comments = commentsMap[ans._id] || [];
              const isAnsAuthor = ans.author?.toString() === user.id?.toString();

              return (
                <div 
                  key={ans._id}
                  className={`bg-white/70 dark:bg-[#0b0c10]/40 border p-5 rounded-3xl shadow-md space-y-4 transition-all ${
                    ans.isVerified 
                      ? 'border-emerald-500/40 dark:border-emerald-500/20 ring-1 ring-emerald-500/5 shadow-emerald-500/5' 
                      : 'border-slate-200/50 dark:border-white/5'
                  }`}
                >
                  {/* Answer profile banner */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-500 flex items-center justify-center text-white text-xs font-black capitalize shadow-sm">
                        {ans.authorName?.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-black text-slate-800 dark:text-slate-100">{ans.authorName}</span>
                          {ans.authorRole === 'admin' && (
                            <span className="bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-lg border border-indigo-500/20">Staff</span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2.5 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                          <span>Trust Score: {ans.authorTrustScore || 100}%</span>
                          <span>•</span>
                          <span>{new Date(ans.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Vetted badge */}
                    <div className="flex items-center space-x-2">
                      {ans.isVerified && (
                        <span className="flex items-center space-x-1 text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border border-emerald-500/20 shadow-sm animate-pulse">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verified FAQ Solution</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body / Forms verification */}
                  {editingAnswerId === ans._id ? (
                    <form onSubmit={(e) => handleEditAnswerSubmit(e, ans._id)} className="space-y-3 font-sans text-xs">
                      <textarea
                        required
                        rows="3"
                        value={editAnswerBody}
                        onChange={(e) => setEditAnswerBody(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl text-xs outline-none"
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setEditingAnswerId(null)}
                          className="px-4 py-2 border border-slate-200 dark:border-white/5 text-slate-500 hover:text-slate-850 dark:hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="soft-primary px-4.5 py-2 rounded-xl text-xs font-black transition-all shadow cursor-pointer"
                        >
                          Save Reply
                        </button>
                      </div>
                    </form>
                  ) : verifyingAnswerId === ans._id ? (
                    <form onSubmit={(e) => handleVerifySubmit(e, ans._id)} className="space-y-4 font-sans text-xs bg-slate-50 dark:bg-[#07080b]/60 p-5 border border-emerald-500/30 rounded-3xl shadow-inner animate-slide-in">
                      <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-black mb-1 text-[11px] uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Admin Lock & Stamp Verification FAQ Form</span>
                      </div>

                      {/* Verify Folder */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-extrabold uppercase text-slate-450 tracking-wider">Adjust Folder Category</label>
                        <select
                          value={verifyCategory}
                          onChange={(e) => setVerifyCategory(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none cursor-pointer font-bold"
                        >
                          {ALL_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Edit Answer Body */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-extrabold uppercase text-slate-455 tracking-wider">Vetted Answer Explanation Content</label>
                        <textarea
                          required
                          rows="3"
                          value={verifyAnswerBody}
                          onChange={(e) => setVerifyAnswerBody(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-2xl text-xs outline-none"
                        />
                      </div>

                      {/* SP Points awarding */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-extrabold uppercase text-slate-450 tracking-wider">Question Author SP Award ({thread.authorName})</label>
                          <input
                            type="number"
                            min="0"
                            value={verifyQuestionSp}
                            onChange={(e) => setVerifyQuestionSp(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <label className="block text-[9px] font-extrabold uppercase text-slate-450 tracking-wider">Solver Student SP Award ({ans.authorName})</label>
                          <input
                            type="number"
                            min="0"
                            value={verifyAnswerSp}
                            onChange={(e) => setVerifyAnswerSp(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-white/5">
                        <button
                          type="button"
                          onClick={() => setVerifyingAnswerId(null)}
                          className="px-4 py-2 border border-slate-200 dark:border-white/5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow cursor-pointer uppercase tracking-wider"
                        >
                          Verify & Lock FAQ
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-start gap-3 p-4 bg-slate-50/60 dark:bg-brand-950/20 border border-slate-200/50 dark:border-white/5 rounded-2xl">
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line flex-1">
                        {ans.body}
                      </p>
                      <div className="shrink-0 mt-0.5">
                        <TTSButton text={ans.body} size="sm" />
                      </div>
                    </div>
                  )}

                  {/* Answer Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3.5 border-t border-slate-100 dark:border-white/5">
                    <div className="flex items-center space-x-3">
                      {/* Helpful / Not helpful answer feedback */}
                      <button
                        onClick={() => handleAnswerFeedback(ans._id, true)}
                        className={`flex items-center space-x-1.5 text-[9px] font-black uppercase tracking-wider border rounded-xl px-3 py-2 transition-all cursor-pointer ${
                          hasUpvoted
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/25'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#07080b] dark:hover:bg-white/5 text-slate-500 border-transparent shadow-sm'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{ans.upvotes?.length || 0} Helpful</span>
                      </button>
                      <button
                        onClick={() => handleAnswerFeedback(ans._id, false)}
                        className={`flex items-center space-x-1.5 text-[9px] font-black uppercase tracking-wider border rounded-xl px-3 py-2 transition-all cursor-pointer ${
                          ans.userFeedback?.helpful === false
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/25'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#07080b] dark:hover:bg-white/5 text-slate-500 border-transparent shadow-sm'
                        }`}
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                        <span>Not Helpful</span>
                      </button>

                      {/* Toggle Comments accordion */}
                      {!ans.isVerified && (
                        <button
                          onClick={() => toggleComments(ans._id)}
                          className={`flex items-center space-x-1 text-[9px] font-black uppercase tracking-wider hover:text-[#E07A15] dark:hover:text-[#FFAE59] transition-colors cursor-pointer ${
                            isCommentsExpanded ? 'text-[#E07A15] dark:text-[#FFAE59]' : 'text-slate-450'
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Comments {comments.length > 0 ? `(${comments.length})` : ''}</span>
                        </button>
                      )}
                    </div>

                    {/* Owner & Admin Controls */}
                    <div className="flex items-center space-x-2">
                      {/* Owner controls */}
                      {isAnsAuthor && !ans.isVerified && (
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => startEditAnswer(ans)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-650 dark:text-slate-350 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border border-slate-200/50 dark:border-white/5"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAnswer(ans)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      )}

                      {/* Admin Actions */}
                      {user.role === 'admin' && verifyingAnswerId !== ans._id && (
                        <div className="flex items-center space-x-2">
                          {!ans.isVerified && (
                            <button
                              onClick={() => startVerifyAnswer(ans)}
                              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Verify</span>
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleDeleteAnswer(ans)}
                            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Comments accordion */}
                  {isCommentsExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 space-y-3.5 pl-4 border-l-2 border-slate-200 dark:border-white/5 animate-slide-in">
                      
                      {/* Comments list */}
                      <div className="space-y-2.5">
                        {comments.map((comment) => (
                          <div key={comment._id} className="text-xs p-3.5 bg-slate-50/50 dark:bg-white/[0.01] border border-slate-150 dark:border-white/5 rounded-2xl leading-normal">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-extrabold text-slate-800 dark:text-slate-200">{comment.authorName}</span>
                              <span className="text-[9px] text-slate-400 font-bold">{new Date(comment.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-350 font-medium">{comment.body}</p>
                          </div>
                        ))}
                      </div>

                      {/* Write comment form */}
                      <form 
                        onSubmit={(e) => handleCommentSubmit(e, ans._id)}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="text"
                          required
                          value={newCommentText[ans._id] || ''}
                          onChange={(e) => handleCommentTextChange(ans._id, e.target.value)}
                          placeholder="Add a comment on this answer..."
                          className="flex-1 px-3.5 py-2 bg-slate-100 dark:bg-brand-950 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none"
                        />
                        <button
                          type="submit"
                          disabled={!newCommentText[ans._id]?.trim()}
                          className="p-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-50 transition-all shadow-sm flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </form>

                    </div>
                  )}

                </div>
              );
            });
          })()
        )}
      </div>

      {/* Answer Submission Box Form */}
      {thread && thread.status !== 'active' ? (
        <div className="bg-slate-150/40 dark:bg-[#07080b]/60 border border-slate-200/50 dark:border-white/5 p-5 rounded-3xl text-center text-xs text-slate-450 dark:text-slate-450 mt-8 font-bold">
          🔒 Thread locked. replies cannot be published while evaluating in moderation queue.
        </div>
      ) : hasVerifiedAnswer ? (
        <div className="bg-emerald-500/[0.03] border border-emerald-500/20 p-5 rounded-3xl text-center text-xs text-emerald-600 dark:text-emerald-400 mt-8 font-black uppercase tracking-wider shadow-sm animate-pulse">
          🔒 Official FAQ Locked. Vetted answers successfully validated.
        </div>
      ) : thread.author?.toString() === user.id?.toString() ? (
        <div className="bg-slate-150/40 dark:bg-[#07080b]/60 border border-slate-200/50 dark:border-white/5 p-5 rounded-3xl text-center text-xs text-slate-450 dark:text-slate-450 mt-8 font-bold">
          📝 You cannot post replies to your own question. Vetting operations await community solving.
        </div>
      ) : answers.some(ans => ans.author?.toString() === user.id?.toString()) ? (
        <div className="bg-slate-150/40 dark:bg-[#07080b]/60 border border-slate-200/50 dark:border-white/5 p-5 rounded-3xl text-center text-xs text-slate-450 dark:text-slate-450 mt-8 font-bold">
          📝 You have registered a reply for this question. Edit or delete it in the cards list above to submit adjustments.
        </div>
      ) : (
        <div className="bg-white/70 dark:bg-[#0b0c10]/40 border border-slate-200/50 dark:border-white/5 p-5 sm:p-6 rounded-3xl shadow-xl backdrop-blur-3xl mt-8 space-y-4">
          <h4 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-widest">Share Your Explanation</h4>
          <form onSubmit={handleAnswerSubmit} className="space-y-4">
            <textarea
              required
              rows="4"
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="Provide clean instructions, citation guides, or eligibility templates to help your peers..."
              className="w-full px-3.5 py-3 rounded-2xl text-xs outline-none resize-none"
            />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              <span className="text-[10px] text-slate-405 dark:text-slate-500 font-bold uppercase tracking-wider leading-relaxed">Student publishing is rewarded +5 SP reputation points.</span>
              <button
                type="submit"
                disabled={submitLoading || !newAnswer.trim()}
                className="soft-primary px-5 py-3 rounded-2xl text-xs font-black shadow-lg disabled:opacity-50 cursor-pointer text-center"
              >
                {submitLoading ? 'Submitting...' : 'Submit Explanation'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default ThreadDetail;
