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
  AlertCircle
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
      const res = await api.put(`/threads/${thread._id}`, {
        title: editTitle,
        body: editBody,
        category: editCategory
      });
      setThread(res.data);
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
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading thread details...</p>
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="py-24 text-center space-y-4">
        <p className="text-xs text-slate-505 font-bold">Failed to load discussion thread details.</p>
        <button
          onClick={() => { setSelectedThreadId(null); setActiveTab('feed'); }}
          className="px-4.5 py-2.5 bg-brand-500 text-white rounded-xl text-xs font-bold transition-all shadow"
        >
          Back to FAQ Center
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
        className="flex items-center space-x-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to FAQ Center</span>
      </button>

      {/* Live FAQ Tracking Panel */}
      {thread && !thread.isOfficial && <LiveFAQTracker threadId={thread._id} />}

      {/* Review Status Banner */}
      {thread && thread.status !== 'active' && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start space-x-3 text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-wider mb-1">Question Under Review</h4>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-350">
              This question is currently under review by the IIT Ropar Team. It will become visible to the community once it is approved and published.
            </p>
          </div>
        </div>
      )}

      {/* Main Question Container Card */}
      <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-900/60 p-6 rounded-3xl shadow-sm space-y-4">
        
        {isEditingThread ? (
          /* Editing form mode */
          <form onSubmit={handleEditThreadSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1.5 tracking-wider">Category</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-brand-950/60 border border-slate-200 dark:border-brand-850 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-200 font-semibold focus:ring-1 focus:ring-brand-500"
              >
                {ALL_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1.5 tracking-wider">Question Title</label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-brand-950/60 border border-slate-200 dark:border-brand-850 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsEditingThread(false)}
                className="px-4 py-2 border border-slate-200 dark:border-brand-850 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4.5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                Save Question
              </button>
            </div>
          </form>
        ) : (
          /* Normal viewing mode */
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="bg-brand-500/10 text-brand-500 dark:text-brand-400 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                {thread.category}
              </span>
              <div className="flex items-center space-x-2 text-[10px] font-bold">
                {thread.isOfficial && (
                  <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-450 bg-emerald-500/10 px-2 py-1 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-500/10" />
                    <span>Official FAQ</span>
                  </span>
                )}
                {thread.status === 'flagged' && (
                  <span className="flex items-center space-x-1 text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>AI Moderation Pending</span>
                  </span>
                )}
                <span className="text-slate-400 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(thread.createdAt).toLocaleDateString()}</span>
                </span>
              </div>
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-white leading-snug">
              {thread.title}
            </h2>

            {thread.body !== thread.title && (
              <div className="flex items-start gap-2">
                <p className="text-xs sm:text-sm text-slate-550 dark:text-slate-350 leading-relaxed whitespace-pre-wrap flex-1">
                  {thread.body}
                </p>
                <div className="shrink-0 mt-0.5">
                  <TTSButton text={thread.body} size="sm" />
                </div>
              </div>
            )}

            {/* Auto-Analysis Panel */}
            {thread.analysisMetadata?.analyzedAt && (
              <details className="group rounded-xl border border-slate-200 dark:border-brand-850 overflow-hidden">
                <summary className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 dark:bg-brand-950/30 cursor-pointer select-none">
                  <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>AI Analysis</span>
                    {thread.analysisMetadata.confidence >= 0.8 && (
                      <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 px-1.5 py-0.5 rounded text-[9px] font-black">High Confidence</span>
                    )}
                    {thread.analysisMetadata.confidence < 0.5 && (
                      <span className="bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded text-[9px] font-black">Low Confidence</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {thread.priority && (
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                        thread.priority === 'urgent' ? 'bg-rose-500/10 text-rose-500' :
                        thread.priority === 'high' ? 'bg-orange-500/10 text-orange-500' :
                        thread.priority === 'medium' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-slate-200 text-slate-500'
                      }`}>
                      {thread.priority} priority
                    </span>
                    )}
                    {thread.analysisMetadata?.keywords?.length > 0 && (
                      <span className="text-[9px] text-slate-400 font-bold">{thread.analysisMetadata.keywords.length} keywords</span>
                    )}
                    <ChevronDown className="w-4 h-4 text-slate-400 group-open:hidden" />
                    <ChevronUp className="w-4 h-4 text-slate-400 hidden group-open:block" />
                  </div>
                </summary>
                <div className="px-4 py-4 bg-white dark:bg-brand-950/10 space-y-4 border-t border-slate-100 dark:border-brand-850">
                  {thread.summary && (
                    <div className="flex items-start gap-2">
                      <AlignLeft className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Auto-Summary</p>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{thread.summary}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4">
                    {thread.priority && (
                      <div className="flex items-start gap-2">
                        <Zap className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Priority</p>
                          <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                            thread.priority === 'urgent' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                            thread.priority === 'high' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                            thread.priority === 'medium' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                            'bg-slate-200 text-slate-500 border border-slate-300'
                          }`}>
                            {thread.priority}
                          </span>
                          {thread.analysisMetadata.priorityScore > 0 && (
                            <span className="text-[9px] text-slate-400 ml-1">score:{thread.analysisMetadata.priorityScore}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {thread.analysisMetadata.categoryHint && thread.analysisMetadata.categoryHint !== thread.category && (
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Suggested Category</p>
                          <span className="inline-block text-[9px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-450 rounded border border-amber-500/20">
                            {thread.analysisMetadata.categoryHint}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {thread.tags?.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Tag className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2">Tags</p>
                        <div className="flex flex-wrap gap-1.5">
                          {thread.tags.map(tag => (
                            <span key={tag} className="inline-flex items-center px-2 py-0.5 bg-brand-500/8 text-brand-600 dark:text-brand-400 text-[9px] font-bold rounded-full border border-brand-500/15">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {(thread.structuredBody?.instruction || thread.structuredBody?.steps?.length > 0 || thread.structuredBody?.note) && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Structured Format</p>
                      <div className="bg-slate-50 dark:bg-brand-950/40 rounded-xl p-3 space-y-2">
                        {thread.structuredBody.instruction && (
                          <div className="flex items-start gap-2">
                            <span className="text-[9px] font-black text-brand-500 mt-0.5 shrink-0">→</span>
                            <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{thread.structuredBody.instruction}</p>
                          </div>
                        )}
                        {thread.structuredBody.steps?.length > 0 && (
                          <ol className="space-y-1.5 pl-4">
                            {thread.structuredBody.steps.map((step, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                                <span className="text-[9px] font-black text-brand-500 mt-0.5 shrink-0">{i + 1}.</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        )}
                        {thread.structuredBody.note && (
                          <div className="flex items-start gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-brand-850">
                            <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-amber-700 dark:text-amber-450 font-semibold italic">{thread.structuredBody.note}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {thread.analysisMetadata.confidence > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">Analysis Confidence</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-1.5 bg-slate-200 dark:bg-brand-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              thread.analysisMetadata.confidence >= 0.7 ? 'bg-emerald-500' :
                              thread.analysisMetadata.confidence >= 0.4 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.round(thread.analysisMetadata.confidence * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{Math.round(thread.analysisMetadata.confidence * 100)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Voting and ownership stamps footer */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-brand-900/40">
              <div className="flex items-center space-x-3">
                {/* Me Too */}
                <button
                  onClick={thread.author?.toString() === user.id?.toString() || thread.isOfficial || hasVerifiedAnswer ? null : handleMeToo}
                  disabled={thread.author?.toString() === user.id?.toString() || thread.isOfficial || hasVerifiedAnswer}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    thread.author?.toString() === user.id?.toString() || thread.isOfficial || hasVerifiedAnswer
                      ? 'bg-slate-100 dark:bg-brand-950/20 text-slate-400 border-slate-200 dark:border-brand-900/40 cursor-not-allowed opacity-60'
                      : userMeTooThread
                        ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                        : 'bg-slate-50 hover:bg-slate-100 dark:bg-brand-950/40 dark:hover:bg-brand-950 text-slate-500 border-transparent'
                  }`}
                  title={thread.author?.toString() === user.id?.toString() ? "You cannot vote on your own question" : thread.isOfficial || hasVerifiedAnswer ? "Locked" : "Mark Me Too"}
                >
                  <Users className="w-4 h-4" />
                  <span>{thread.meToo?.length || 0} Me Too</span>
                </button>

                {/* Upvote */}
                <button
                  onClick={thread.author?.toString() === user.id?.toString() || thread.isOfficial || hasVerifiedAnswer ? null : handleThreadVote}
                  disabled={thread.author?.toString() === user.id?.toString() || thread.isOfficial || hasVerifiedAnswer}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    thread.author?.toString() === user.id?.toString() || thread.isOfficial || hasVerifiedAnswer
                      ? 'bg-slate-100 dark:bg-brand-950/20 text-slate-400 border-slate-200 dark:border-brand-900/40 cursor-not-allowed opacity-60'
                      : userUpvotedThread
                        ? 'bg-brand-500/15 text-brand-500 dark:text-brand-400 border-brand-500/30'
                        : 'bg-slate-50 hover:bg-slate-100 dark:bg-brand-950/40 dark:hover:bg-brand-950 text-slate-500 border-transparent'
                  }`}
                  title={thread.author?.toString() === user.id?.toString() ? "You cannot vote on your own question" : thread.isOfficial || hasVerifiedAnswer ? "Locked" : "Upvote question"}
                >
                  <ArrowUp className="w-4 h-4" />
                  <span>{thread.upvotes?.length || 0} Votes</span>
                </button>
              </div>

              <div className="flex items-center space-x-3">
                {/* Author stamp */}
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Asked by</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{thread.authorName}</span>
                </div>
                
                {/* Owner and Admin controls */}
                <div className="flex items-center space-x-1.5 border-l border-slate-200 dark:border-brand-850 pl-3">
                  {thread.author?.toString() === user.id?.toString() && !thread.isOfficial && (
                    <>
                      <button
                        onClick={startEditThread}
                        className="text-[10px] font-bold text-slate-500 hover:text-brand-500 transition-colors uppercase cursor-pointer"
                      >
                        Edit
                      </button>
                      <span className="text-slate-300 text-[10px]">•</span>
                    </>
                  )}
                  {(thread.author?.toString() === user.id?.toString() || user.role === 'admin') && (
                    <button
                      onClick={handleDeleteThread}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-600 transition-colors uppercase cursor-pointer"
                    >
                      Delete
                    </button>
                  )}
                </div>

                {/* Admin Make Official */}
                {user.role === 'admin' && !thread.isOfficial && (
                  <button
                    onClick={handleMakeOfficial}
                    className="flex items-center space-x-1 px-3 py-2 rounded-xl text-[10px] font-bold bg-brand-500/10 hover:bg-brand-500 text-brand-500 hover:text-white border border-brand-500/20 transition-all cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Mark Official</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}

      </div>

      {/* Answers Section Label */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-brand-900/60 pb-3 mt-8">
        <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center space-x-2">
          <span>Replies ({answers.length})</span>
        </h3>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sorted by Quality & Trust</span>
      </div>

      {/* Answers Listings */}
      <div className="space-y-4">
        {answers.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 bg-white dark:bg-brand-900 rounded-3xl border border-slate-200 dark:border-brand-900/60">
            No replies yet. Be the first to answer this question!
          </div>
        ) : (
          (() => {
            // If any answer is verified, show ONLY verified answers
            const displayAnswers = hasVerifiedAnswer ? answers.filter(a => a.isVerified) : answers;
            
            return displayAnswers.map((ans) => {
              const hasUpvoted = ans.upvotes?.includes(user?.id) || false;
              const isCommentsExpanded = !!expandedComments[ans._id];
              const comments = commentsMap[ans._id] || [];
              const isAnsAuthor = ans.author?.toString() === user.id?.toString();

              return (
                <div 
                  key={ans._id}
                  className={`bg-white dark:bg-brand-900 border p-5 rounded-2xl shadow-sm space-y-4 transition-all ${
                    ans.isVerified 
                      ? 'border-emerald-500/40 dark:border-emerald-500/25 ring-1 ring-emerald-500/10' 
                      : 'border-slate-200 dark:border-brand-900/60'
                  }`}
                >
                  {/* Answer Meta Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black capitalize">
                        {ans.authorName?.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{ans.authorName}</span>
                          {ans.authorRole === 'admin' && (
                            <span className="bg-brand-500/15 text-brand-500 dark:text-brand-400 text-[8px] font-black uppercase px-1 py-0.2 rounded">Staff</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-[9px] text-slate-400 font-medium">
                          <span>Trust Score: {ans.authorTrustScore || 100}%</span>
                          <span>•</span>
                          <span>{new Date(ans.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Verification Stamp */}
                    <div className="flex items-center space-x-2">
                      {ans.isVerified && (
                        <span className="flex items-center space-x-1 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-emerald-500/25">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified by IIT Ropar Team</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Answer Body / Editing / Verification view */}
                  {editingAnswerId === ans._id ? (
                    <form onSubmit={(e) => handleEditAnswerSubmit(e, ans._id)} className="space-y-3 font-sans text-xs">
                      <textarea
                        required
                        rows="3"
                        value={editAnswerBody}
                        onChange={(e) => setEditAnswerBody(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-brand-950 border border-slate-200 dark:border-brand-850 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-1 focus:ring-brand-500 outline-none resize-none"
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setEditingAnswerId(null)}
                          className="px-3.5 py-1.5 border border-slate-200 dark:border-brand-855 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 bg-brand-500 text-white hover:bg-brand-600 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                        >
                          Save Answer
                        </button>
                      </div>
                    </form>
                  ) : verifyingAnswerId === ans._id ? (
                    <form onSubmit={(e) => handleVerifySubmit(e, ans._id)} className="space-y-4 font-sans text-xs bg-slate-50 dark:bg-brand-950/20 p-4 border border-emerald-500/35 rounded-xl">
                      <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-450 font-bold mb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Admin Answer Verification & Locking Form</span>
                      </div>

                      {/* Re-verify Category */}
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1.5 tracking-wider">Re-verify Category</label>
                        <select
                          value={verifyCategory}
                          onChange={(e) => setVerifyCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-850 rounded-lg text-xs outline-none text-slate-705 dark:text-slate-200 font-semibold focus:ring-1 focus:ring-brand-500 cursor-pointer"
                        >
                          {ALL_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Edit Answer Body */}
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1.5 tracking-wider">Edit Answer Body</label>
                        <textarea
                          required
                          rows="3"
                          value={verifyAnswerBody}
                          onChange={(e) => setVerifyAnswerBody(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-850 rounded-lg text-xs text-slate-805 dark:text-slate-100 placeholder-slate-400 focus:ring-1 focus:ring-brand-500 outline-none resize-none"
                        />
                      </div>

                      {/* SP Points awarding */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1.5 tracking-wider">Award SP to Question Author ({thread.authorName})</label>
                          <input
                            type="number"
                            min="0"
                            value={verifyQuestionSp}
                            onChange={(e) => setVerifyQuestionSp(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-850 rounded-lg text-xs text-slate-805 dark:text-slate-100 focus:ring-1 focus:ring-brand-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1.5 tracking-wider">Award SP to Solver ({ans.authorName})</label>
                          <input
                            type="number"
                            min="0"
                            value={verifyAnswerSp}
                            onChange={(e) => setVerifyAnswerSp(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-850 rounded-lg text-xs text-slate-805 dark:text-slate-100 focus:ring-1 focus:ring-brand-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-brand-850">
                        <button
                          type="button"
                          onClick={() => setVerifyingAnswerId(null)}
                          className="px-3.5 py-1.5 border border-slate-200 dark:border-brand-855 text-slate-500 hover:text-slate-850 dark:hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-all shadow cursor-pointer"
                        >
                          Verify & Lock FAQ
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-start gap-2">
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-350 leading-relaxed whitespace-pre-line flex-1">
                        {ans.body}
                      </p>
                      <div className="shrink-0 mt-0.5">
                        <TTSButton text={ans.body} size="sm" />
                      </div>
                    </div>
                  )}

                  {/* Answer Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3.5 border-t border-slate-100 dark:border-brand-900/40">
                    <div className="flex items-center space-x-4">
                      {/* Upvote answer */}
                      <button
                        onClick={ans.isVerified ? null : () => handleAnswerVote(ans._id)}
                        disabled={ans.isVerified}
                        className={`flex items-center space-x-1.5 text-[10px] font-bold border rounded-lg px-2.5 py-1.5 transition-all ${
                          ans.isVerified
                            ? 'bg-slate-50 dark:bg-brand-950/20 text-slate-400 border-transparent opacity-60 cursor-not-allowed'
                            : hasUpvoted
                              ? 'bg-brand-500/15 text-brand-500 dark:text-brand-400 border-brand-500/30'
                              : 'bg-slate-50 hover:bg-slate-100 dark:bg-brand-950/40 dark:hover:bg-brand-950 text-slate-500 border-transparent'
                        }`}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                        <span>{ans.upvotes?.length || 0} Upvotes</span>
                      </button>

                      {/* Toggle Comments accordion */}
                      {!ans.isVerified && (
                        <button
                          onClick={() => toggleComments(ans._id)}
                          className={`flex items-center space-x-1 text-[10px] font-bold hover:text-brand-500 transition-colors ${
                            isCommentsExpanded ? 'text-brand-500' : 'text-slate-400'
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
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
                            className="px-2 py-1 rounded bg-slate-100 dark:bg-brand-950/60 hover:bg-slate-200 text-slate-650 dark:text-slate-300 text-[9px] font-bold uppercase transition-all cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAnswer(ans)}
                            className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500 text-rose-550 hover:text-white border border-rose-500/20 text-[9px] font-bold uppercase transition-all cursor-pointer"
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
                              className="flex items-center space-x-1 px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500 text-emerald-650 hover:text-white border border-emerald-500/20 text-[9px] font-bold uppercase transition-all cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Verify</span>
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleDeleteAnswer(ans)}
                            className="flex items-center space-x-1 px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 text-[9px] font-bold uppercase transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Nested Comments Accordion Panel */}
                  {isCommentsExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-brand-900/40 space-y-3 pl-4 border-l-2 border-slate-100 dark:border-brand-850">
                      
                      {/* Comments log */}
                      <div className="space-y-2.5">
                        {comments.map((comment) => (
                          <div key={comment._id} className="text-xs p-2.5 bg-slate-50/60 dark:bg-brand-950/20 border border-slate-100 dark:border-brand-900/40 rounded-xl leading-normal">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-slate-700 dark:text-slate-350">{comment.authorName}</span>
                              <span className="text-[9px] text-slate-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400">{comment.body}</p>
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
                          className="flex-1 px-3 py-1.5 bg-slate-100 dark:bg-brand-950/60 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none border border-transparent dark:border-brand-850 transition-all"
                        />
                        <button
                          type="submit"
                          disabled={!newCommentText[ans._id]?.trim()}
                          className="p-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
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
        <div className="bg-slate-50 dark:bg-brand-950/20 border border-slate-200 dark:border-brand-850 p-5 rounded-3xl text-center text-xs text-slate-500 dark:text-slate-400 mt-8">
          🔒 This question is currently under review. Replies cannot be posted until it is approved by the IIT Ropar Team.
        </div>
      ) : hasVerifiedAnswer ? (
        <div className="bg-emerald-50 dark:bg-brand-950/25 border border-emerald-500/20 p-5 rounded-3xl text-center text-xs text-emerald-700 dark:text-emerald-450 mt-8 font-semibold">
          🔒 This official FAQ has been verified and locked by administrators. No further replies can be added.
        </div>
      ) : thread.author?.toString() === user.id?.toString() ? (
        <div className="bg-slate-50 dark:bg-brand-950/20 border border-slate-200 dark:border-brand-850 p-5 rounded-3xl text-center text-xs text-slate-500 dark:text-slate-400 mt-8">
          📝 You cannot post an answer to your own question. Please wait for the community or a mentor to reply.
        </div>
      ) : answers.some(ans => ans.author?.toString() === user.id?.toString()) ? (
        <div className="bg-slate-50 dark:bg-brand-950/20 border border-slate-200 dark:border-brand-850 p-5 rounded-3xl text-center text-xs text-slate-500 dark:text-slate-400 mt-8">
          📝 You have already posted an answer for this question. You can edit or delete it directly from your reply card above.
        </div>
      ) : (
        <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-900/60 p-5 rounded-3xl shadow-sm mt-8 space-y-3">
          <h4 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-wider">Your Answer</h4>
          <form onSubmit={handleAnswerSubmit} className="space-y-4">
            <textarea
              required
              rows="4"
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="Type your explanation here. Use bullet points and cite official guidelines to help others..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-brand-950/60 border border-slate-200 dark:border-brand-850 rounded-xl text-xs text-slate-855 dark:text-slate-100 placeholder-slate-400 focus:ring-1 focus:ring-brand-500 outline-none transition-all resize-none"
            />
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-400 leading-tight">Student contributions are awarded +5 SP upon publishing.</span>
              <button
                type="submit"
                disabled={submitLoading || !newAnswer.trim()}
                className="px-4.5 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                {submitLoading ? 'Posting...' : 'Post Answer'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default ThreadDetail;
