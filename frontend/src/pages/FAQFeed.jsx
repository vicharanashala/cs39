import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, MessageCircle, Plus, Search, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../utils/api';

const FAQ_GROUPS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Eligibility, selection and joining',
    categories: ['Internship', 'Selection Process', 'Announcements'],
    postCategory: 'Internship'
  },
  {
    id: 'documents-dates',
    title: 'Documents & Dates',
    description: 'NOC, certificates and deadlines',
    categories: ['Certificates', 'Deadlines', 'Payments'],
    postCategory: 'Certificates'
  },
  {
    id: 'learning-work',
    title: 'Learning & Work',
    description: 'Attendance, teams and projects',
    categories: ['Attendance', 'Assignments', 'Mentorship', 'Projects'],
    postCategory: 'Projects'
  },
  {
    id: 'platform-help',
    title: 'Platform & Help',
    description: 'Login, technical issues and support',
    categories: ['Technical Issues', 'General Queries', 'Others'],
    postCategory: 'Technical Issues'
  }
];

const FAQFeed = () => {
  const { user, setSelectedThreadId, showAlert } = useApp();
  const [mode, setMode] = useState('official');
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(FAQ_GROUPS[0].id);
  const [expandedThreadId, setExpandedThreadId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [answerLoading, setAnswerLoading] = useState(false);
  const [showAskModal, setShowAskModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newGroup, setNewGroup] = useState(FAQ_GROUPS[0].id);
  const [creationLoading, setCreationLoading] = useState(false);

  useEffect(() => {
    fetchThreads();
  }, [mode]);

  const fetchThreads = async () => {
    setLoading(true);
    try {
      const response = await api.get('/threads', {
        params: { isOfficial: mode === 'official' ? 'true' : 'false', sort: 'newest' }
      });
      setThreads(response.data);
      setExpandedThreadId(null);
    } catch (error) {
      console.error('Fetch threads error:', error.message);
      showAlert('Failed to load FAQs. Check the backend connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const groupedThreads = useMemo(() => FAQ_GROUPS.map(group => ({
    ...group,
    threads: threads.filter(thread => group.categories.includes(thread.category))
  })), [threads]);

  const activeGroup = groupedThreads.find(group => group.id === selectedGroup) || groupedThreads[0];
  const visibleThreads = activeGroup.threads.filter(thread => {
    const query = search.toLowerCase().trim();
    return !query || thread.title.toLowerCase().includes(query) || (thread.body || '').toLowerCase().includes(query);
  });

  const toggleAnswer = async (threadId) => {
    if (expandedThreadId === threadId) {
      setExpandedThreadId(null);
      return;
    }
    setExpandedThreadId(threadId);
    if (answers[threadId]) return;
    setAnswerLoading(true);
    try {
      const response = await api.get(`/threads/${threadId}/answers`);
      setAnswers(current => ({ ...current, [threadId]: response.data }));
    } catch (error) {
      showAlert('Unable to load this answer.', 'error');
    } finally {
      setAnswerLoading(false);
    }
  };

  const createQuestion = async (event) => {
    event.preventDefault();
    if (!newTitle.trim()) return;
    setCreationLoading(true);
    const group = FAQ_GROUPS.find(item => item.id === newGroup) || FAQ_GROUPS[0];
    try {
      const response = await api.post('/threads/create', {
        title: newTitle.trim(),
        body: newTitle.trim(),
        category: group.postCategory
      });
      setShowAskModal(false);
      setNewTitle('');
      setMode('community');
      setSelectedGroup(group.id);
      await fetchThreads();
      if (response.data.status === 'active') setSelectedThreadId(response.data._id);
    } catch (error) {
      showAlert(error.response?.data?.message || 'Failed to create question.', 'error');
    } finally {
      setCreationLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-5 py-7 space-y-6 font-sans">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-brand-500 font-bold">Support Center</p>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">Find an answer</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Four simple sections. Short answers first.</p>
        </div>
        <button
          onClick={() => setShowAskModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-bold"
        >
          <Plus className="w-4 h-4" />
          Ask a question
        </button>
      </header>

      <div className="flex gap-2">
        {[
          ['official', 'Official FAQ'],
          ['community', 'Community']
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${
              mode === id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-white dark:bg-brand-900 text-slate-500 border border-slate-200 dark:border-brand-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {groupedThreads.map(group => (
          <button
            key={group.id}
            onClick={() => setSelectedGroup(group.id)}
            className={`p-4 rounded-2xl border text-left transition-colors ${
              selectedGroup === group.id
                ? 'border-brand-500 bg-brand-500 text-white'
                : 'bg-white dark:bg-brand-900 border-slate-200 dark:border-brand-800 text-slate-800 dark:text-white'
            }`}
          >
            <p className="text-sm font-bold">{group.title}</p>
            <p className={`text-[11px] mt-1 ${selectedGroup === group.id ? 'text-white/75' : 'text-slate-400'}`}>
              {group.description}
            </p>
            <p className={`text-xs font-bold mt-4 ${selectedGroup === group.id ? 'text-white' : 'text-brand-500'}`}>
              {group.threads.length} questions
            </p>
          </button>
        ))}
      </section>

      <section className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-brand-800 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">{activeGroup.title}</h2>
            <p className="text-[11px] text-slate-400">{mode === 'official' ? 'Verified FAQ answers' : 'Student discussions'}</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute w-3.5 h-3.5 text-slate-400 left-3 top-2.5" />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search this section"
              className="w-full rounded-lg border border-slate-200 dark:border-brand-800 bg-slate-50 dark:bg-brand-950 pl-9 pr-3 py-2 text-xs outline-none"
            />
          </div>
        </div>

        {loading ? (
          <p className="p-8 text-center text-xs text-slate-400">Loading questions...</p>
        ) : visibleThreads.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-400">No questions in this section yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-brand-800">
            {visibleThreads.map(thread => {
              const isExpanded = expandedThreadId === thread._id;
              const answer = answers[thread._id]?.[0];
              return (
                <article key={thread._id} className="p-4">
                  <button onClick={() => toggleAnswer(thread._id)} className="w-full flex items-start justify-between text-left gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{thread.title}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{thread.category}</p>
                    </div>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-brand-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                  </button>
                  {isExpanded && (
                    <div className="mt-3 pl-3 border-l-2 border-brand-500/20">
                      {answerLoading && !answer ? (
                        <p className="text-xs text-slate-400">Loading answer...</p>
                      ) : answer ? (
                        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line">{answer.body}</p>
                      ) : (
                        <p className="text-xs text-slate-400">No answer available yet.</p>
                      )}
                      <button
                        onClick={() => setSelectedThreadId(thread._id)}
                        className="mt-3 text-[11px] text-brand-500 font-bold"
                      >
                        Open discussion
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Sparkles className="w-3.5 h-3.5" />
        The assistant uses these FAQs directly and returns compact answers to keep usage efficient.
      </div>

      {showAskModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={createQuestion} className="w-full max-w-md rounded-2xl bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-800 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-brand-500" />
              <h2 className="text-sm font-bold dark:text-white">Ask the community</h2>
            </div>
            <input
              autoFocus
              required
              maxLength={180}
              value={newTitle}
              onChange={event => setNewTitle(event.target.value)}
              placeholder="What do you need help with?"
              className="w-full border border-slate-200 dark:border-brand-800 bg-slate-50 dark:bg-brand-950 rounded-xl px-3 py-3 text-sm outline-none"
            />
            <select
              value={newGroup}
              onChange={event => setNewGroup(event.target.value)}
              className="w-full border border-slate-200 dark:border-brand-800 bg-slate-50 dark:bg-brand-950 rounded-xl px-3 py-3 text-sm outline-none"
            >
              {FAQ_GROUPS.map(group => <option key={group.id} value={group.id}>{group.title}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAskModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
              <button disabled={creationLoading} type="submit" className="px-4 py-2 rounded-lg bg-brand-500 text-white text-xs font-bold disabled:opacity-50">
                {creationLoading ? 'Posting...' : 'Post question'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default FAQFeed;
