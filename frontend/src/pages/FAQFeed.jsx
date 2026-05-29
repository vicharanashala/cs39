import React, { useEffect, useMemo, useState, useRef } from 'react';
import { ChevronDown, ChevronRight, MessageCircle, Plus, Search, Sparkles, Star, Wand2, Volume2, Square, Loader2, CheckCircle2, AlertCircle, Trash2, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../utils/api';

// ── Trending FAQs Section ───────────────────────────────────────────────
const TrendingSection = ({ threads, loading, onSelect }) => {
  if (loading) {
    return (
      <div className="flex gap-3 overflow-hidden py-1">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="w-52 h-20 rounded-xl bg-slate-100 dark:bg-brand-800 animate-pulse flex-shrink-0" />
        ))}
      </div>
    );
  }
  if (!threads || threads.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-500">🔥 Trending</span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-brand-800" />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 py-1 scrollbar-thin">
        {threads.map((thread, i) => (
          <button
            key={thread._id}
            onClick={() => onSelect(thread)}
            className="flex items-start gap-2.5 w-52 flex-shrink-0 bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-800 rounded-xl px-3 py-2.5 text-left hover:border-brand-400 dark:hover:border-brand-500 transition-all shadow-sm hover:shadow-md group"
          >
            <span className={`shrink-0 mt-0.5 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
              i === 0 ? 'bg-amber-400 text-amber-900' : i === 1 ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' : i === 2 ? 'bg-orange-200 dark:bg-orange-900 text-orange-700 dark:text-orange-300' : 'bg-slate-100 dark:bg-brand-800 text-slate-400 dark:text-slate-500'
            }`}>
              {i + 1}
            </span>
            <span className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 leading-snug line-clamp-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                {thread.title}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">{thread.category}</p>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

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
  const { user, setSelectedThreadId, showAlert, bookmarks, toggleBookmark } = useApp();
  const [mode, setMode] = useState('official');
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [smartSearch, setSmartSearch] = useState(false);
  const [paraphrases, setParaphrases] = useState([]);
  const [paraphraseLoading, setParaphraseLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(FAQ_GROUPS[0].id);
  const [expandedThreadId, setExpandedThreadId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [answerLoading, setAnswerLoading] = useState(false);
  const [showAskModal, setShowAskModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newGroup, setNewGroup] = useState(FAQ_GROUPS[0].id);
  const [creationLoading, setCreationLoading] = useState(false);
  const [savedThreads, setSavedThreads] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [trending, setTrending] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  // ── TTS state ───────────────────────────────────────────────────────────
  const [ttsText, setTtsText] = useState('');
  const [ttsKey, setTtsKey] = useState(localStorage.getItem('WIT_API_KEY') || '');
  const [ttsSaving, setTtsSaving] = useState(false);
  const [ttsSaveMsg, setTtsSaveMsg] = useState('');
  const [ttsStatus, setTtsStatus] = useState('idle'); // idle | loading | playing | error
  const [ttsStatusMsg, setTtsStatusMsg] = useState('');
  const [ttsError, setTtsError] = useState('');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const audioRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      setVoices(v.filter(x => x.lang.startsWith('en')));
      setSelectedVoice(prev => prev || (v.find(x => x.lang === 'en-US' && x.name.includes('Google')) || v[0]));
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.cancel();
      if (abortRef.current) abortRef.current.abort();
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const ttsSaveKey = () => {
    setTtsSaving(true);
    setTtsSaveMsg('');
    const trimmed = ttsKey.trim();
    if (trimmed) {
      localStorage.setItem('WIT_API_KEY', trimmed);
      setTtsSaveMsg('✅ Key saved — Wit.ai will be used.');
    } else {
      localStorage.removeItem('WIT_API_KEY');
      setTtsSaveMsg('✅ Browser voice will be used.');
    }
    setTimeout(() => { setTtsSaving(false); setTtsSaveMsg(''); }, 2500);
  };

  const ttsStop = () => {
    window.speechSynthesis.cancel();
    if (audioRef.current) audioRef.current.pause();
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setTtsStatus('idle');
    setTtsStatusMsg('');
  };

  const ttsPlay = async () => {
    const text = ttsText.trim();
    if (!text) return;
    ttsStop();
    setTtsStatus('loading');
    setTtsStatusMsg('Preparing audio…');
    setTtsError('');
    const key = localStorage.getItem('WIT_API_KEY');
    try {
      if (key) {
        const resp = await fetch(
          'https://api.wit.ai/synthesize',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${key}`,
              'WitAI-Version': '20240304',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ q: text, voice: 'wit$Rebecca' })
          }
        );
        if (!resp.ok) {
          const errBody = await resp.json().catch(() => ({}));
          throw new Error(errBody.error || `Wit.ai ${resp.status}`);
        }
        const blob = await resp.blob();
        if (blob.size === 0) throw new Error('Empty audio from Wit.ai');
        const blobUrl = URL.createObjectURL(blob);
        const audio = new Audio();
        audioRef.current = audio;
        abortRef.current = new AbortController();
        audio.oncanplay = () => { setTtsStatus('playing'); setTtsStatusMsg('Playing via Wit.ai'); audio.play().catch(e => { setTtsError(e.message); setTtsStatus('idle'); }); };
        audio.onended = () => { setTtsStatus('idle'); setTtsStatusMsg(''); URL.revokeObjectURL(blobUrl); };
        audio.onerror = () => { setTtsError('Audio decode failed.'); setTtsStatus('idle'); URL.revokeObjectURL(blobUrl); };
        audio.src = blobUrl;
      } else {
        setTtsStatus('playing');
        setTtsStatusMsg('Playing via browser voice');
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        if (selectedVoice) u.voice = selectedVoice;
        u.onend = () => { setTtsStatus('idle'); setTtsStatusMsg(''); };
        u.onerror = () => { setTtsError('Browser TTS failed.'); setTtsStatus('idle'); };
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }
    } catch (err) {
      setTtsError(err.message);
      setTtsStatus('idle');
    }
  };

  // Scroll to #faq-X.Y hash when navigating from chatbot
  useEffect(() => {
    if (window.location.hash) {
      const el = document.querySelector(window.location.hash);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
      }
    }
  }, [threads]);

  useEffect(() => {
    fetchTrending();
  }, []);

  useEffect(() => {
    if (mode === 'saved') {
      fetchSavedThreads();
    } else {
      fetchThreads();
    }
  }, [mode]);

  // Fetch paraphrases when smart search is active and search text changes
  useEffect(() => {
    if (!smartSearch || !search.trim()) {
      setParaphrases([]);
      setParaphraseLoading(false);
      return;
    }
    setParaphraseLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/threads/search/paraphrase', { params: { q: search } });
        setParaphrases(res.data.paraphrases || []);
      } catch {
        setParaphrases([]);
      } finally {
        setParaphraseLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search, smartSearch]);

  const fetchThreads = async () => {
    setLoading(true);
    try {
      const response = await api.get('/threads', {
        params: {
          isOfficial: mode === 'official' ? 'true' : 'false',
          sort: 'newest',
          search: search || undefined,
          paraphrase: smartSearch ? 'true' : undefined
        }
      });
      setThreads(response.data);
      setExpandedThreadId(null);
      // Log search to analytics if query was made
      if (search.trim()) {
        api.post('/admin/analytics/log-search', {
          query: search.trim(),
          resultsCount: response.data.length,
          source: 'faq_feed'
        }).catch(() => {});
        api.post('/admin/analytics/log-activity', {
          action: 'search',
          metadata: { query: search.trim(), resultsCount: response.data.length }
        }).catch(() => {});
      }
    } catch (error) {
      console.error('Fetch threads error:', error.message);
      showAlert('Failed to load FAQs. Check the backend connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Re-run search when search text or smartSearch toggle changes
  useEffect(() => {
    if (mode !== 'saved') {
      fetchThreads();
    }
  }, [search, smartSearch, mode]);

  const fetchTrending = async () => {
    setTrendingLoading(true);
    try {
      const res = await api.get('/threads/trending');
      setTrending(res.data);
    } catch (err) {
      console.error('fetchTrending error:', err.message);
    } finally {
      setTrendingLoading(false);
    }
  };

  const fetchSavedThreads = async () => {
    setSavedLoading(true);
    try {
      const res = await api.get('/bookmarks');
      setSavedThreads(res.data);
      setExpandedThreadId(null);
    } catch (err) {
      showAlert('Could not load saved FAQs.', 'error');
    } finally {
      setSavedLoading(false);
    }
  };

  const groupedThreads = useMemo(() => FAQ_GROUPS.map(group => ({
    ...group,
    threads: threads.filter(thread => group.categories.includes(thread.category))
  })), [threads]);

  const isSavedMode = mode === 'saved';
  const activeGroup = groupedThreads.find(group => group.id === selectedGroup) || groupedThreads[0];
  const visibleThreads = isSavedMode
    ? savedThreads
    : activeGroup.threads.filter(thread => {
        const query = search.toLowerCase().trim();
        return !query || thread.title.toLowerCase().includes(query) || (thread.body || '').toLowerCase().includes(query);
      });

  const toggleAnswer = async (threadId) => {
    if (expandedThreadId === threadId) {
      setExpandedThreadId(null);
      return;
    }
    setExpandedThreadId(threadId);
    if (!answers[threadId]) {
      setAnswerLoading(true);
      try {
        const response = await api.get(`/threads/${threadId}/answers`);
        setAnswers(current => ({ ...current, [threadId]: response.data }));
        // Log view_thread activity
        api.post('/admin/analytics/log-activity', {
          action: 'view_thread',
          metadata: { threadId }
        }).catch(() => {});
        // If search query exists, also log which thread was clicked from results
        if (search.trim()) {
          api.post('/admin/analytics/log-search', {
            query: search.trim(),
            resultsCount: 0,
            clickedThreadId: threadId,
            source: 'faq_feed'
          }).catch(() => {});
        }
      } catch (error) {
        showAlert('Unable to load this answer.', 'error');
      } finally {
        setAnswerLoading(false);
      }
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

      {/* ── Text to Speech Widget ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-brand-800 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Volume2 className="w-4 h-4 text-brand-500" />
            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Text to Speech</span>
            {localStorage.getItem('WIT_API_KEY') ? (
              <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Wit.ai
              </span>
            ) : (
              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-brand-800 px-1.5 py-0.5 rounded-full">Browser</span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <input
              type="password"
              value={ttsKey}
              onChange={e => setTtsKey(e.target.value)}
              placeholder="WIT_API_KEY (leave blank for browser voice)"
              className="flex-1 border border-slate-200 dark:border-brand-800 bg-slate-50 dark:bg-brand-950 rounded-lg px-3 py-1.5 text-[11px] outline-none text-slate-700 dark:text-slate-200 w-full sm:w-52"
            />
            <div className="flex gap-1.5">
              <button onClick={ttsSaveKey} disabled={ttsSaving} className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold shrink-0 transition-colors">
                {ttsSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save Key'}
              </button>
              {!localStorage.getItem('WIT_API_KEY') && voices.length > 0 && (
                <select
                  value={selectedVoice?.name || ''}
                  onChange={e => setSelectedVoice(voices.find(v => v.name === e.target.value) || null)}
                  className="border border-slate-200 dark:border-brand-800 bg-slate-50 dark:bg-brand-950 rounded-lg px-2 py-1.5 text-[10px] outline-none text-slate-700 dark:text-slate-200"
                >
                  {voices.slice(0, 10).map(v => <option key={v.name} value={v.name}>{v.name.split(' ').slice(0, 2).join(' ')}</option>)}
                </select>
              )}
              <button onClick={ttsPlay} disabled={!ttsText.trim() || ttsStatus === 'loading' || ttsStatus === 'playing'} className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-lg text-[11px] font-bold shrink-0 transition-colors flex items-center gap-1.5">
                {ttsStatus === 'loading' ? <Loader2 className="w-3 h-3 animate-spin" /> : ttsStatus === 'playing' ? <Square className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                {ttsStatus === 'playing' ? 'Stop' : 'Speak'}
              </button>
            </div>
          </div>
        </div>
        {ttsSaveMsg && <div className="px-4 py-1.5 bg-emerald-500/10 border-b border-emerald-500/20"><p className="text-[10px] font-bold text-emerald-600">{ttsSaveMsg}</p></div>}
        {ttsError && <div className="px-4 py-1.5 bg-rose-500/10 border-b border-rose-500/20 flex items-center gap-1.5"><AlertCircle className="w-3 h-3 text-rose-500" /><p className="text-[10px] font-bold text-rose-500">{ttsError}</p></div>}
        <textarea
          value={ttsText}
          onChange={e => setTtsText(e.target.value)}
          placeholder="Paste any FAQ answer or text here to listen to it…"
          rows={3}
          className="w-full px-4 py-3 text-xs text-slate-700 dark:text-slate-200 bg-transparent outline-none resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
        />
        {ttsStatusMsg && <div className="px-4 pb-2"><p className="text-[10px] font-bold text-slate-400">{ttsStatus === 'playing' && '🔊 '}{ttsStatusMsg}</p></div>}
      </div>

      <div className="flex gap-2">
        {[
          ['official', 'Official FAQ'],
          ['community', 'Community'],
          ['saved', `Saved${bookmarks.length > 0 ? ` (${bookmarks.length})` : ''}`]
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

      {/* Section group pills — hidden in saved mode */}
      {!isSavedMode && (
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
      )}

      <TrendingSection
        threads={trending}
        loading={trendingLoading}
        onSelect={(thread) => {
          setSelectedThreadId(thread._id);
          window.location.hash = thread.faqNumber ? `#faq-${thread.faqNumber}` : `#thread-${thread._id}`;
        }}
      />

      <section className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-brand-800 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {isSavedMode ? 'Saved FAQs' : activeGroup.title}
            </h2>
            <p className="text-[11px] text-slate-400">
              {isSavedMode ? 'Your bookmarked FAQs' : mode === 'official' ? 'Verified FAQ answers' : 'Student discussions'}
            </p>
          </div>
          {!isSavedMode && (
            <div className="flex flex-col gap-2 w-full sm:w-72">
              <div className="relative">
                <Search className="absolute w-3.5 h-3.5 text-slate-400 left-3 top-2.5" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search this section"
                  className="w-full rounded-lg border border-slate-200 dark:border-brand-800 bg-slate-50 dark:bg-brand-950 pl-9 pr-16 py-2 text-xs outline-none"
                />
                <button
                  onClick={() => setSmartSearch(s => !s)}
                  title={smartSearch ? 'Disable smart search' : 'Enable smart search with paraphrasing'}
                  className={`absolute right-2 top-1.5 px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors ${
                    smartSearch
                      ? 'bg-brand-500 text-white'
                      : 'bg-slate-100 dark:bg-brand-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Wand2 className="w-3 h-3" />
                  Smart
                </button>
              </div>

              {/* Paraphrase chips */}
              {(paraphraseLoading || paraphrases.length > 0) && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  {paraphraseLoading ? (
                    <span className="text-[10px] text-slate-400">Generating variants...</span>
                  ) : (
                    <>
                      <span className="text-[9px] text-slate-400 font-bold shrink-0">Variants:</span>
                      {paraphrases.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => setSearch(p)}
                          className="px-2 py-0.5 bg-brand-50 dark:bg-brand-950 border border-brand-200 dark:border-brand-700 rounded-full text-[10px] text-brand-600 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900 transition-colors"
                        >
                          {p}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {isSavedMode ? (
          savedLoading ? (
            <p className="p-8 text-center text-xs text-slate-400">Loading saved FAQs...</p>
          ) : savedThreads.length === 0 ? (
            <p className="p-8 text-center text-xs text-slate-400">
              No saved FAQs yet. Click the <Star className="w-3 h-3 inline text-amber-400 fill-amber-400" /> icon on any FAQ to save it here.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-brand-800">
              {savedThreads.map(thread => {
                const isExpanded = expandedThreadId === thread._id;
                const answer = answers[thread._id]?.[0];
                const anchorId = thread.faqNumber ? `faq-${thread.faqNumber}` : `thread-${thread._id}`;
                return (
                  <article id={anchorId} key={thread._id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        onClick={() => toggleAnswer(thread._id)}
                        className="flex items-start gap-2 flex-wrap text-left flex-1 min-w-0"
                      >
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                          {thread.title}
                          {thread.faqNumber && (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-brand-800 text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-brand-700 shrink-0">
                              #{thread.faqNumber}
                            </span>
                          )}
                        </p>
                        <span className="inline-block px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-[9px] font-bold text-amber-500 border border-amber-200 dark:border-amber-800 shrink-0 mt-0.5">
                          SAVED
                        </span>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const saved = await toggleBookmark(thread._id);
                            if (saved !== null) {
                              showAlert(saved ? 'FAQ saved!' : 'Bookmark removed.', saved ? 'success' : 'info');
                              api.post('/admin/analytics/log-activity', {
                                action: 'bookmark',
                                metadata: { threadId: thread._id, saved }
                              }).catch(() => {});
                              if (isSavedMode) fetchSavedThreads();
                            }
                          }}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-brand-800 transition-colors"
                          title="Remove bookmark"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        </button>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-brand-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>
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
          )
        ) : loading ? (
          <p className="p-8 text-center text-xs text-slate-400">Loading questions...</p>
        ) : visibleThreads.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-400">No questions in this section yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-brand-800">
            {visibleThreads.map(thread => {
              const isExpanded = expandedThreadId === thread._id;
              const answer = answers[thread._id]?.[0];
              const anchorId = thread.faqNumber ? `faq-${thread.faqNumber}` : `thread-${thread._id}`;
              const isBookmarked = bookmarks.includes(thread._id);
              return (
                <article id={anchorId} key={thread._id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <button onClick={() => toggleAnswer(thread._id)} className="flex items-start gap-2 flex-wrap text-left flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                        {thread.title}
                        {thread.faqNumber && (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-brand-800 text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-brand-700 shrink-0 mt-0.5">
                            #{thread.faqNumber}
                          </span>
                        )}
                        {thread.priority === 'urgent' && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-500/10 text-[9px] font-black text-rose-500 border border-rose-500/20 uppercase tracking-wider shrink-0 mt-0.5">
                            <Zap className="w-2.5 h-2.5" />Urgent
                          </span>
                        )}
                        {thread.priority === 'high' && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-orange-500/10 text-[9px] font-black text-orange-500 border border-orange-500/20 uppercase tracking-wider shrink-0 mt-0.5">
                            <Zap className="w-2.5 h-2.5" />High
                          </span>
                        )}
                      </p>
                      {/* Auto-analysis tags row */}
                      {thread.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {thread.tags.slice(0, 4).map(tag => (
                            <span key={tag} className="inline-flex items-center px-1.5 py-0.5 bg-brand-500/8 text-brand-600 dark:text-brand-400 text-[9px] font-bold rounded-full border border-brand-500/15">
                              {tag}
                            </span>
                          ))}
                          {thread.analysisMetadata?.confidence > 0 && (
                            <span className="text-[9px] text-slate-400 font-medium ml-1">
                              {Math.round(thread.analysisMetadata.confidence * 100)}% conf.
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const saved = await toggleBookmark(thread._id);
                          if (saved !== null) {
                            showAlert(saved ? 'FAQ saved!' : 'Bookmark removed.', saved ? 'success' : 'info');
                            api.post('/admin/analytics/log-activity', {
                              action: 'bookmark',
                              metadata: { threadId: thread._id, saved }
                            }).catch(() => {});
                          }
                        }}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-brand-800 transition-colors"
                        title={isBookmarked ? 'Remove bookmark' : 'Save FAQ'}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                        />
                      </button>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-brand-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>
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
