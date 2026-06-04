import React, { useEffect, useMemo, useState, useRef } from 'react';
import { ChevronDown, ChevronRight, Flame, MessageCircle, Plus, Search, Sparkles, Star, Wand2, Volume2, Square, Loader2, CheckCircle2, AlertCircle, Trash2, Zap, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../utils/api';
import Config from '../config';

const TrendingSection = ({ threads, loading, onSelect }) => (
  <section className="overflow-hidden border border-white/50 bg-white/40 dark:border-white/5 dark:bg-[#0b0c10]/45 shadow-[0_8px_30px_rgb(0,0,0,0.03)] backdrop-blur-md rounded-3xl">
    <div className="flex items-center justify-between gap-3 border-b border-slate-200/30 dark:border-white/5 px-5 py-4">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/60 bg-white/50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <Flame className="h-4 w-4 text-orange-500" />
        </span>
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.16em] text-slate-805 dark:text-slate-100">Trending FAQs</h2>
          <p className="text-[10px] font-bold text-slate-400">Ranked by views, helpful answers, searches, and freshness</p>
        </div>
      </div>
      <span className="hidden rounded-lg border border-white/60 bg-white/50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 sm:inline-flex shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
        Live
      </span>
    </div>
    <div className="flex gap-3 overflow-x-auto px-5 py-4">
      {loading ? (
        [...Array(4)].map((_, index) => (
          <div key={index} className="h-24 w-64 flex-shrink-0 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.04]" />
        ))
      ) : threads.length === 0 ? (
        <div className="w-full rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-xs font-bold text-slate-400 dark:border-white/10">
          Trending FAQs will appear after questions receive activity.
        </div>
      ) : (
        threads.map((thread, index) => {
          const trendStyle = {
            Hot: 'border-orange-500/20 bg-orange-500/5 text-orange-600 dark:border-orange-500/25 dark:bg-orange-500/10 dark:text-[#FFAE59]',
            Rising: 'border-cyan-500/20 bg-cyan-500/5 text-cyan-600 dark:border-cyan-500/25 dark:bg-cyan-500/10 dark:text-cyan-300',
            Popular: 'border-indigo-500/20 bg-indigo-500/5 text-indigo-600 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-300',
            New: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300'
          }[thread.trend] || 'border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300';
          return (
          <button
            key={thread._id}
            onClick={() => onSelect(thread)}
            className="group relative w-72 flex-shrink-0 overflow-hidden rounded-2xl border border-white/50 bg-white/30 p-4 text-left shadow-[0_4px_20px_rgba(0,0,0,0.02)] backdrop-blur-sm transition-all duration-300 hover:border-indigo-500/25 hover:bg-white/60 hover:shadow-[0_12px_24px_rgba(99,102,241,0.04)] dark:border-white/5 dark:bg-white/[0.035] dark:hover:border-indigo-500/20 dark:hover:bg-white/[0.06] card-hover cursor-pointer"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-black ${
                index === 0 ? 'bg-indigo-500/10 text-indigo-650 border border-indigo-500/20 dark:bg-slate-200 dark:text-slate-900' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300'
              }`}>
                {index + 1}
              </span>
              <span className="rounded-lg border border-white/60 bg-white/45 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-slate-505 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                {thread.category}
              </span>
            </div>
            <p className="line-clamp-2 text-xs font-black leading-snug text-slate-700 transition group-hover:text-slate-950 dark:text-slate-100 dark:group-hover:text-white">
              {thread.title}
            </p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className={`rounded-lg border px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${trendStyle}`}>
                {thread.trend || 'Rising'}
              </span>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{Math.round(thread.score || 0)} score</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100/60 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-indigo-500/70 transition-all duration-700 dark:bg-slate-200"
                style={{ width: `${Math.min(100, Math.max(8, thread.score || 0))}%` }}
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[8px] font-black uppercase tracking-wider text-slate-400">
              <span title="Recent views">{thread.metrics?.recentViews || 0} views</span>
              <span title="Helpful answer marks">{thread.metrics?.helpfulVotes || 0} helpful</span>
              <span title="Search clicks">{thread.metrics?.searchFrequency || 0} search</span>
            </div>
          </button>
          );
        })
      )}
    </div>
  </section>
);

const FAQ_GROUPS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Eligibility, selection and joining guidelines',
    categories: ['Internship', 'Selection Process', 'Announcements'],
    postCategory: 'Internship'
  },
  {
    id: 'documents-dates',
    title: 'Documents & Dates',
    description: 'NOC templates, certificates and deadlines',
    categories: ['Certificates', 'Deadlines', 'Payments'],
    postCategory: 'Certificates'
  },
  {
    id: 'learning-work',
    title: 'Learning & Work',
    description: 'Attendance flow, teams and project submissions',
    categories: ['Attendance', 'Assignments', 'Mentorship', 'Projects'],
    postCategory: 'Projects'
  },
  {
    id: 'platform-help',
    title: 'Platform & Help',
    description: 'Vite portal login and technical issues',
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
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const [duplicateLoading, setDuplicateLoading] = useState(false);

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
    if (!showAskModal || newTitle.trim().length < 5) {
      setDuplicateMatches([]);
      setDuplicateLoading(false);
      return;
    }

    setDuplicateLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.post('/threads/check-duplicate', {
          title: newTitle.trim(),
          category: undefined
        });
        setDuplicateMatches((res.data || []).filter(item => item.score >= Config.DUPLICATE_SIMILARITY_THRESHOLD));
      } catch (err) {
        setDuplicateMatches([]);
      } finally {
        setDuplicateLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [showAskModal, newTitle, newGroup]);

  useEffect(() => {
    if (mode === 'saved') {
      fetchSavedThreads();
    } else {
      fetchThreads();
    }
  }, [mode, bookmarks, user]);

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
    let cachedOfficialThreads = null;
    if (mode === 'official' && !search.trim()) {
      const cached = localStorage.getItem('cached_official_faqs');
      if (cached) {
        try {
          cachedOfficialThreads = JSON.parse(cached);
        } catch (e) {
          console.error('Failed to parse cached official FAQs:', e);
        }
      }
    }
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

      if (mode === 'official' && !search.trim()) {
        try {
          const tsRes = await api.get('/threads/last-updated');
          localStorage.setItem('cached_official_faqs', JSON.stringify(response.data));
          localStorage.setItem('faq_last_updated', String(tsRes.data.timestamp || Date.now()));
        } catch (e) {
          console.error('Failed to write FAQ cache:', e);
        }
      }
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
      if (cachedOfficialThreads && mode === 'official' && !search.trim()) {
        setThreads(cachedOfficialThreads);
        setExpandedThreadId(null);
      } else {
        showAlert('Failed to load FAQs. Check the backend connection.', 'error');
      }
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
      setTrending(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('fetchTrending error:', err.message);
      setTrending([]);
    } finally {
      setTrendingLoading(false);
    }
  };

  const fetchSavedThreads = () => {
    setSavedLoading(true);
    try {
      if (!user) {
        setSavedThreads([]);
        return;
      }
      const storageKey = `saved_faqs_${user.id}`;
      const saved = JSON.parse(localStorage.getItem(storageKey)) || [];
      setSavedThreads(saved);
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
    ? savedThreads.filter(thread => {
        const query = search.toLowerCase().trim();
        return (
          !query ||
          thread.title.toLowerCase().includes(query) ||
          (thread.body || '').toLowerCase().includes(query) ||
          (thread.answerText || '').toLowerCase().includes(query)
        );
      })
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
      if (response.data.status === 'active') {
        showAlert('Question published.', 'success');
        setSelectedThreadId(response.data._id);
      } else {
        showAlert('Question submitted for admin review before publication.', 'success');
      }
    } catch (error) {
      showAlert(error.response?.data?.message || 'Failed to create question.', 'error');
    } finally {
      setCreationLoading(false);
    }
  };

  return (
    <div className="soft-page max-w-5xl mx-auto px-5 py-7 space-y-6 font-sans">
      
      {/* ── HEADER OVERHAUL ── */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-slate-200/50 dark:border-white/5 pb-5">
        <div>
          <p className="soft-accent text-[9px] uppercase tracking-[0.25em] font-extrabold">Student Support Hub</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
            How can we help you?
          </h1>
          <p className="text-xs text-slate-450 dark:text-slate-400 mt-1">Four primary folders. Verified guidance, automated by IIT Ropar team.</p>
        </div>
        <button
          onClick={() => setShowAskModal(true)}
          className="soft-primary inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-black shadow-lg shadow-amber-500/10 cursor-pointer card-hover shrink-0"
        >
          <Plus className="w-4 h-4" />
          Ask a question
        </button>
      </header>

      {/* ── MODE TABS ── */}
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-[#07080b]/80 border border-slate-200/50 dark:border-white/5 rounded-2xl w-fit">
        {[
          ['official', 'Official FAQ'],
          ['community', 'Student Discussions'],
          ['saved', `Bookmarked (${bookmarks.length})`]
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`px-4.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === id
                ? 'soft-primary shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode !== 'saved' && (
        <TrendingSection
          threads={trending}
          loading={trendingLoading}
          onSelect={(thread) => {
            if (thread.faqNumber) {
              const group = FAQ_GROUPS.find(item => item.categories.includes(thread.category));
              if (group) setSelectedGroup(group.id);
              setMode('official');
              setSelectedThreadId(null);
              window.location.hash = `faq-${thread.faqNumber}`;
              setTimeout(() => {
                document.getElementById(`faq-${thread.faqNumber}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 100);
              return;
            }
            setSelectedThreadId(thread._id);
          }}
        />
      )}

      {/* ── CATEGORY SECTION CARDS GRID ── */}
      {!isSavedMode && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {groupedThreads.map(group => {
            const isSelected = selectedGroup === group.id;
            return (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group.id)}
                className={`p-5 rounded-2xl border text-left transition-all relative cursor-pointer card-hover ${
                  isSelected
                    ? 'soft-primary border-transparent'
                    : 'bg-white/70 dark:bg-[#0b0c10]/40 border-slate-200/50 dark:border-white/5 text-slate-800 dark:text-white'
                }`}
              >
                {/* Visual state active bar */}
                {isSelected && (
                  <span className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white animate-pulse"></span>
                  </span>
                )}
                
                <h3 className="text-sm font-extrabold tracking-tight">{group.title}</h3>
                <p className={`text-[11px] leading-relaxed mt-1.5 ${isSelected ? 'text-white/80' : 'text-slate-450 dark:text-slate-400'}`}>
                  {group.description}
                </p>
                <p className={`text-[10px] font-black uppercase tracking-wider mt-5 ${isSelected ? 'text-white' : 'soft-accent'}`}>
                  {group.threads.length} Questions
                </p>
              </button>
            );
          })}
        </section>
      )}

      {/* ── MAIN CONTENT WORKSPACE ── */}
      <section className="soft-panel overflow-hidden border border-slate-200/50 dark:border-white/5 bg-white/75 dark:bg-[#0b0c10]/30 shadow-xl backdrop-blur-3xl">
        
        {/* Workspace Toolbar */}
        <div className="p-5 border-b border-slate-150 dark:border-white/5 flex flex-col md:flex-row gap-4 md:items-center md:justify-between bg-slate-50/20 dark:bg-white/[0.01]">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {isSavedMode ? 'Bookmarked Answers' : activeGroup.title}
            </h2>
            <p className="text-[11px] font-bold text-slate-400">
              {isSavedMode ? 'Your curated locally pinned FAQs' : mode === 'official' ? 'Staff vetted expert guidance solutions' : 'Intern peer discussions & questions'}
            </p>
          </div>
          
          <div className="flex flex-col gap-2 w-full md:w-80 shrink-0">
            <div className="relative">
              <Search className="absolute w-3.5 h-3.5 text-slate-400 left-3.5 top-3" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder={isSavedMode ? "Filter bookmarked cards..." : "Search this academic directory..."}
                className="w-full rounded-xl bg-slate-50 dark:bg-[#07080b]/60 pl-10 pr-20 py-2.5 text-xs outline-none text-slate-800 dark:text-slate-100"
              />
              {!isSavedMode && (
                <button
                  onClick={() => setSmartSearch(s => !s)}
                  title={smartSearch ? 'Disable semantic checker' : 'Enable local similarity duplicate check'}
                  className={`absolute right-2 top-2 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                    smartSearch
                      ? 'soft-primary shadow-sm'
                      : 'bg-slate-200/60 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  <Wand2 className="w-3 h-3" />
                  Smart
                </button>
              )}
            </div>

            {/* Smart Search Variant suggestions chips */}
            {!isSavedMode && (paraphraseLoading || paraphrases.length > 0) && (
              <div className="flex flex-wrap gap-1.5 items-center mt-1 animate-slide-in">
                {paraphraseLoading ? (
                  <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-[#E07A15]" /> Checking variants...
                  </span>
                ) : (
                  <>
                    <span className="text-[9px] text-[#E07A15] dark:text-[#FFAE59] font-black uppercase shrink-0">Semantic Variants:</span>
                    {paraphrases.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => setSearch(p)}
                        className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200/40 dark:border-white/5 rounded-full text-[10px] text-slate-650 dark:text-slate-300 hover:border-amber-500/20 hover:text-amber-500 dark:hover:text-[#FFAE59] transition-colors cursor-pointer"
                      >
                        {p}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* List listings container */}
        {isSavedMode ? (
          savedLoading ? (
            <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#E07A15]" />
              <span>Fetching bookmarks...</span>
            </div>
          ) : visibleThreads.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-450 dark:text-slate-400">
              {search.trim() ? "No matching bookmarked solutions found." : "Your bookmark chest is empty. Star items in the feed directory to view them offline."}
            </div>
          ) : (
            <div className="divide-y divide-slate-150 dark:divide-white/5">
              {visibleThreads.map(thread => {
                const anchorId = thread.faqNumber ? `faq-${thread.faqNumber}` : `thread-${thread._id}`;
                const showBody = thread.body && thread.body.trim().toLowerCase() !== thread.title.trim().toLowerCase();
                return (
                  <article id={anchorId} key={thread._id} className="p-6 flex flex-col gap-4 hover:bg-slate-50/[0.15] dark:hover:bg-white/[0.005] transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {thread.faqNumber && (
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-[#07080b] text-[9px] font-mono font-black text-[#E07A15] dark:text-[#FFAE59] border border-slate-200 dark:border-white/5 shadow-sm">
                            #{thread.faqNumber}
                          </span>
                        )}
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                          {thread.category}
                        </span>
                        <span className="inline-block px-2 py-0.5 rounded bg-amber-500/10 text-[9px] font-black text-amber-500 border border-amber-500/20 uppercase tracking-widest">
                          Saved
                        </span>
                      </div>
                      
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const saved = await toggleBookmark(thread._id, thread);
                          if (saved !== null) {
                            api.post('/admin/analytics/log-activity', {
                              action: 'bookmark',
                              metadata: { threadId: thread._id, saved }
                            }).catch(() => {});
                          }
                        }}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 text-amber-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-all cursor-pointer shadow-sm"
                        title="Remove bookmark"
                      >
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-850 dark:text-white leading-snug">
                        {thread.title}
                      </h3>
                      {showBody && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-line leading-relaxed">
                          {thread.body}
                        </p>
                      )}
                    </div>

                    {/* Inline Vetted Answer display */}
                    <div className="p-4.5 rounded-2xl bg-emerald-500/[0.02] dark:bg-emerald-500/[0.01] border border-emerald-500/20 dark:border-emerald-500/10 space-y-2 relative overflow-hidden">
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Vetted Answer</span>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line font-medium">
                        {thread.answerText || 'Expert response validation pending review.'}
                      </p>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => setSelectedThreadId(thread._id)}
                        className="text-[11px] text-[#E07A15] dark:text-[#FFAE59] hover:underline font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                      >
                        Open Peer Board &rarr;
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )
        ) : loading ? (
          <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#E07A15]" />
              <span>Parsing repository questions...</span>
          </div>
        ) : visibleThreads.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-450 dark:text-slate-400">
            No questions posted under this block. Click Ask Question to create one.
          </div>
        ) : (
          <div className="divide-y divide-slate-150 dark:divide-white/5">
            {visibleThreads.map(thread => {
              const isExpanded = expandedThreadId === thread._id;
              const answer = answers[thread._id]?.[0];
              const anchorId = thread.faqNumber ? `faq-${thread.faqNumber}` : `thread-${thread._id}`;
              const isBookmarked = bookmarks.includes(thread._id);
              return (
                <article id={anchorId} key={thread._id} className="p-4.5 hover:bg-slate-50/[0.1] dark:hover:bg-white/[0.003] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <button onClick={() => toggleAnswer(thread._id)} className="flex items-start gap-2.5 flex-wrap text-left flex-1 min-w-0 cursor-pointer">
                      <p className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-150 flex items-center gap-2 flex-wrap">
                        {thread.title}
                        {thread.faqNumber && (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#07080b] text-[9px] font-mono font-black text-[#E07A15] dark:text-[#FFAE59] border border-slate-200 dark:border-white/5 shadow-sm shrink-0 mt-0.5">
                            #{thread.faqNumber}
                          </span>
                        )}
                        {thread.priority === 'urgent' && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-rose-500/10 text-[9px] font-black text-rose-500 border border-rose-500/20 uppercase tracking-widest shrink-0 mt-0.5 animate-pulse">
                            <Zap className="w-2.5 h-2.5" />Urgent
                          </span>
                        )}
                        {thread.priority === 'high' && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-orange-500/10 text-[9px] font-black text-orange-500 border border-orange-500/20 uppercase tracking-widest shrink-0 mt-0.5">
                            <Zap className="w-2.5 h-2.5" />High
                          </span>
                        )}
                      </p>
                      
                      {/* Dynamic Heuristic tags row */}
                      {thread.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 w-full mt-1.5">
                          {thread.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="inline-flex items-center px-2 py-0.5 bg-indigo-500/[0.05] dark:bg-indigo-500/[0.03] text-indigo-500 dark:text-indigo-400 text-[8px] font-black uppercase tracking-wider rounded-md border border-indigo-500/10">
                              {tag}
                            </span>
                          ))}
                          {thread.analysisMetadata?.confidence > 0 && (
                            <span className="text-[9px] text-slate-400 font-bold ml-1.5 mt-0.5">
                              {Math.round(thread.analysisMetadata.confidence * 100)}% Match
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const saved = await toggleBookmark(thread._id, thread);
                          if (saved !== null) {
                            api.post('/admin/analytics/log-activity', {
                              action: 'bookmark',
                              metadata: { threadId: thread._id, saved }
                            }).catch(() => {});
                          }
                        }}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all cursor-pointer shadow-sm"
                        title={isBookmarked ? 'Remove bookmark' : 'Bookmark question'}
                      >
                        <Star
                          className={`w-3.5 h-3.5 transition-transform hover:scale-110 ${isBookmarked ? 'fill-amber-400 text-amber-400' : 'text-slate-350 dark:text-slate-550'}`}
                        />
                      </button>
                      <button 
                        onClick={() => toggleAnswer(thread._id)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all cursor-pointer shadow-sm text-slate-405"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-[#E07A15]" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded block styling */}
                  {isExpanded && (
                    <div className="mt-4 pl-4 border-l-2 border-[#E07A15] dark:border-[#FFAE59] animate-slide-in space-y-3">
                      {answerLoading && !answer ? (
                        <div className="py-2 text-xs text-slate-400 flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E07A15]" />
                          <span>Extracting vetted guidance...</span>
                        </div>
                      ) : answer ? (
                        <div className="text-xs leading-relaxed text-slate-650 dark:text-slate-300 font-medium whitespace-pre-line bg-slate-100/40 dark:bg-[#07080b]/40 p-4 border border-slate-200/40 dark:border-white/5 rounded-2xl relative">
                          <p>{answer.body}</p>
                          <div className="flex justify-end mt-3 gap-2">
                            <button
                              onClick={() => {
                                setTtsText(answer.body);
                                setTimeout(() => ttsPlay(), 50);
                              }}
                              className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase bg-slate-200/60 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition flex items-center gap-1 cursor-pointer"
                              title="Listen to answer"
                            >
                              <Volume2 className="w-3 h-3" /> Audio Guidance
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-450 dark:text-slate-500 font-bold italic">Verification review in progress. No official reply available yet.</p>
                      )}
                      
                      <button
                        onClick={() => setSelectedThreadId(thread._id)}
                        className="text-[11px] text-[#E07A15] dark:text-[#FFAE59] font-black uppercase tracking-wider hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Open Discussion Board &rarr;
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Info card footer */}
      <div className="flex items-center gap-2.5 text-xs text-slate-400 dark:text-slate-500 font-medium bg-slate-50 dark:bg-white/[0.01] p-4 rounded-2xl border border-slate-150 dark:border-white/5 max-w-fit">
        <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
        <span>RAG Copilot uses this validated directory directly to synthesize custom AI answers for search flows.</span>
      </div>

      {/* ── ASK A QUESTION DIALOG MODAL ── */}
      {showAskModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={createQuestion} className="nexus-glass w-full max-w-md rounded-3xl p-6 space-y-4 border border-slate-200/50 dark:border-white/5 shadow-2xl animate-slide-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <MessageCircle className="soft-accent w-5 h-5" />
                <h2 className="text-sm font-extrabold dark:text-white">Ask the Student Community</h2>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAskModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-1">
              <label className="block text-[9px] font-extrabold uppercase text-slate-450 tracking-wider">Your Query Title</label>
              <input
                autoFocus
                required
                maxLength={180}
                value={newTitle}
                onChange={event => setNewTitle(event.target.value)}
                placeholder="e.g. NOC format required for internship portal?"
                className="w-full px-3.5 py-3 rounded-xl text-xs outline-none"
              />
            </div>

            {(duplicateLoading || duplicateMatches.length > 0) && (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-50 p-4 shadow-lg dark:border-amber-400/20 dark:bg-amber-400/10">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-200">
                      Similar question found
                    </p>
                    {duplicateLoading ? (
                      <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Checking existing FAQs...</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {duplicateMatches.slice(0, 3).map(match => (
                          <button
                            type="button"
                            key={match.thread._id}
                            onClick={() => {
                              setShowAskModal(false);
                              if (match.thread.faqNumber) {
                                const group = FAQ_GROUPS.find(item => item.categories.includes(match.thread.category));
                                if (group) setSelectedGroup(group.id);
                                setMode('official');
                                window.location.hash = `faq-${match.thread.faqNumber}`;
                                setTimeout(() => {
                                  document.getElementById(`faq-${match.thread.faqNumber}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }, 100);
                              } else {
                                setSelectedThreadId(match.thread._id);
                              }
                            }}
                            className="block w-full rounded-xl border border-amber-500/20 bg-white/85 px-3 py-2 text-left text-xs font-bold text-slate-700 shadow-sm transition hover:bg-white dark:bg-[#0b0c10]/70 dark:text-slate-200"
                          >
                            <span className="block text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-300">
                              Question {match.thread.faqNumber ? `#${match.thread.faqNumber}` : `#${String(match.thread._id).slice(-6)}`} · {Math.round(match.score * 100)}% match
                            </span>
                            <span className="mt-0.5 block line-clamp-2">{match.thread.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-1">
              <label className="block text-[9px] font-extrabold uppercase text-slate-450 tracking-wider">Select Topic Folder</label>
              <select
                value={newGroup}
                onChange={event => setNewGroup(event.target.value)}
                className="w-full px-3.5 py-3 rounded-xl text-xs outline-none cursor-pointer"
              >
                {FAQ_GROUPS.map(group => <option key={group.id} value={group.id}>{group.title}</option>)}
              </select>
            </div>
            
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
              <button 
                type="button" 
                onClick={() => setShowAskModal(false)} 
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                disabled={creationLoading} 
                type="submit" 
                className="soft-primary px-5 py-2.5 rounded-xl text-xs font-black shadow disabled:opacity-50 cursor-pointer"
              >
                {creationLoading ? 'Publishing...' : 'Submit Question'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default FAQFeed;
