import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../utils/api';
import { ArrowLeft, CheckCircle2, MessageSquare, RefreshCw, Route, X, Send, Sparkles } from 'lucide-react';

const QUICK_PROMPTS = [
  'How do I join?',
  'How do I submit my NOC?',
  'What work will I do?',
  'I need platform help'
];

const MINI_GUIDE = {
  start: 'start',
  nodes: {
    start: {
      question: 'What do you need help with?',
      options: [
        { label: 'Internship process', next: 'internship' },
        { label: 'Documents / NOC', next: 'documents' },
        { label: 'Portal issue', next: 'portal' },
        { label: 'Attendance / academics', next: 'academics' }
      ]
    },
    internship: {
      question: 'Are you already selected for an internship?',
      options: [
        { label: 'Yes', next: 'selected' },
        { label: 'No', next: 'eligibility' }
      ]
    },
    documents: {
      question: 'Which document is blocking you?',
      options: [
        { label: 'NOC', next: 'noc' },
        { label: 'Certificate', next: 'certificate' }
      ]
    },
    portal: {
      question: 'Is there an active deadline risk?',
      options: [
        { label: 'Yes', next: 'urgentPortal' },
        { label: 'No', next: 'normalPortal' }
      ]
    },
    academics: {
      question: 'Is this about a missed requirement?',
      options: [
        { label: 'Yes', next: 'missedAcademic' },
        { label: 'No', next: 'academicInfo' }
      ]
    },
    selected: { result: true, title: 'Verify joining checklist', query: 'joining onboarding internship', text: 'Confirm documents, joining date, mentor/team assignment, and attendance process before the first day.' },
    eligibility: { result: true, title: 'Check eligibility first', query: 'internship eligibility selection', text: 'Start with CGPA/year/project rules, then shortlist official project-specific requirements.' },
    noc: { result: true, title: 'Use the NOC path', query: 'NOC format internship', text: 'Download the current template, fill internship details, get department approval, and upload before the deadline.' },
    certificate: { result: true, title: 'Confirm certificate authority', query: 'certificate template signing authority', text: 'Use the official template and confirm who signs it before submitting to the destination portal.' },
    urgentPortal: { result: true, title: 'Escalate with proof now', query: 'portal submission deadline issue', text: 'Take screenshots, note time/browser, submit a ticket, and email the coordinator before the deadline passes.' },
    normalPortal: { result: true, title: 'Run portal recovery', query: 'portal login technical issue', text: 'Try password reset, clean browser session, and institute email login before raising a ticket.' },
    missedAcademic: { result: true, title: 'Create a correction request', query: 'attendance correction assignment late submission', text: 'Collect proof, mentor confirmation, and exact date/course details. Report it as soon as possible.' },
    academicInfo: { result: true, title: 'Search academic policy', query: 'attendance assignment mentorship', text: 'Use official FAQs for threshold, submission, and mentor escalation rules before asking a new question.' }
  }
};

const FloatingChatbot = () => {
  const { user, setActiveTab, setSelectedThreadId } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Ask a question. I will return a short FAQ answer and its source.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [panelMode, setPanelMode] = useState('chat');
  const [guideNodeId, setGuideNodeId] = useState(MINI_GUIDE.start);
  const [guideHistory, setGuideHistory] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  if (!user) return null;

  const submitQuery = async (queryText) => {
    if (!queryText.trim() || isTyping) return;
    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: queryText
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await api.post('/chatbot/query', { query: queryText });
      const { answer, confidence, suggestThread, threadId, sourceTitle, category, suggestions } = res.data;
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-ai`,
          sender: 'ai',
          text: answer,
          confidence,
          suggestThread,
          threadId,
          sourceTitle,
          category,
          suggestions
        }
      ]);
    } catch (error) {
      console.error('Chatbot error:', error.message);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'ai',
          text: "Offline: Failed to connect to AI server. Check backend connections.",
          confidence: 0
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    submitQuery(input);
  };

  const openThread = (threadId, faqNumber) => {
    setIsOpen(false);
    setSelectedThreadId(null);
    setActiveTab('feed');
    if (faqNumber) {
      // Official FAQ — scroll to the numbered anchor in FAQFeed
      window.location.hash = `faq-${faqNumber}`;
    } else {
      // Community thread — open full ThreadDetail view
      setSelectedThreadId(threadId);
    }
  };

  const guideNode = MINI_GUIDE.nodes[guideNodeId];
  const guideProgress = Math.min(100, ((guideHistory.length + (guideNode?.result ? 2 : 1)) / 4) * 100);
  const chooseGuideOption = (next) => {
    setGuideHistory((current) => [...current, guideNodeId]);
    setGuideNodeId(next);
  };
  const guideBack = () => {
    if (guideHistory.length === 0) return;
    const previous = guideHistory[guideHistory.length - 1];
    setGuideHistory((current) => current.slice(0, -1));
    setGuideNodeId(previous);
  };
  const guideRestart = () => {
    setGuideNodeId(MINI_GUIDE.start);
    setGuideHistory([]);
  };
  const searchGuideResult = () => {
    if (!guideNode?.query) return;
    setPanelMode('chat');
    submitQuery(guideNode.query);
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 font-sans flex flex-col items-end">
      {isOpen && (
        <div className="w-[calc(100vw-2rem)] max-w-96 h-[31rem] bg-white dark:bg-[#08090f]/95 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col mb-3 overflow-hidden animate-slide-in backdrop-blur-3xl">
          
          {/* Header */}
          <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
            <span className="text-xs font-bold flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Yaksha Mini</span>
            </span>
            <button aria-label="Close assistant" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-1.5">
            <button
              onClick={() => setPanelMode('chat')}
              className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${panelMode === 'chat' ? 'soft-primary' : 'text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/5'}`}
            >
              Chat
            </button>
            <button
              onClick={() => setPanelMode('guide')}
              className={`rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition ${panelMode === 'guide' ? 'soft-primary' : 'text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/5'}`}
            >
              Guide
            </button>
          </div>

          {/* Messages */}
          {panelMode === 'chat' ? (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50 dark:bg-brand-950/20 text-xs">
              {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-2.5 rounded-xl ${
                  msg.sender === 'user'
                    ? 'bg-brand-500 text-white rounded-br-none'
                    : 'bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-800 text-slate-800 dark:text-slate-200 rounded-bl-none'
                }`}>
                  <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                  {msg.sourceTitle && msg.threadId && (
                    <div className="mt-2 space-y-1.5">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 dark:bg-brand-950 text-[9px] font-bold text-slate-500">
                        {msg.category}
                      </span>
                      {msg.faqNumber && (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-brand-500/10 text-[9px] font-mono font-bold text-brand-600 dark:text-brand-300 border border-brand-500/30">
                          #{msg.faqNumber}
                        </span>
                      )}
                      <button
                        onClick={() => openThread(msg.threadId, msg.faqNumber)}
                        className="w-full py-1.5 px-2 text-left bg-brand-500/10 text-brand-600 dark:text-brand-300 rounded font-bold text-[10px]"
                      >
                        {msg.faqNumber ? `Jump to #${msg.faqNumber}: ` : 'View source: '}{msg.sourceTitle}
                      </button>
                    </div>
                  )}

                  {msg.suggestions?.length > 0 && !msg.sourceTitle && (
                    <div className="mt-2 space-y-1">
                      {msg.suggestions.map((suggestion) => (
                        <button
                          key={suggestion.threadId}
                          onClick={() => openThread(suggestion.threadId, null)}
                          className="w-full py-1.5 px-2 text-left border border-slate-200 dark:border-brand-800 rounded text-[10px] hover:border-brand-500"
                        >
                          {suggestion.title} ({suggestion.confidence}%)
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.suggestThread && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        setActiveTab('feed');
                      }}
                      className="mt-2 w-full py-1 text-center bg-brand-500 text-white rounded font-bold text-[9px]"
                    >
                      Ask the Community
                    </button>
                  )}
                </div>
                {msg.sender === 'ai' && msg.confidence !== undefined && msg.id !== 'welcome' && (
                  <span className="text-[8px] text-slate-400 font-bold mt-1 px-1">
                    Match {msg.confidence}%
                  </span>
                )}
              </div>
              ))}
              {isTyping && (
                <div className="text-[10px] text-slate-400 italic animate-pulse">Assistant is typing...</div>
              )}
              {messages.length === 1 && !isTyping && (
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => submitQuery(prompt)}
                      className="py-1 px-2 border border-brand-500/30 text-brand-600 dark:text-brand-300 rounded-full text-[10px]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-brand-950/20 p-3.5 text-xs">
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] p-3.5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-400">
                    <Route className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Decision guide</p>
                    <div className="mt-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400 transition-all duration-500" style={{ width: `${guideProgress}%` }} />
                    </div>
                  </div>
                </div>

                {guideNode.result ? (
                  <div className="space-y-3 animate-fade-in-up">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-500">
                      <CheckCircle2 className="h-3 w-3" />
                      Recommendation
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">{guideNode.title}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{guideNode.text}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={guideBack} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-3 py-2 text-[10px] font-black text-slate-600 dark:text-slate-300">
                        <ArrowLeft className="h-3.5 w-3.5" /> Back
                      </button>
                      <button onClick={guideRestart} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-3 py-2 text-[10px] font-black text-slate-600 dark:text-slate-300">
                        <RefreshCw className="h-3.5 w-3.5" /> Restart
                      </button>
                      <button onClick={searchGuideResult} className="soft-primary rounded-xl px-3 py-2 text-[10px] font-black">
                        Find FAQs
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 animate-fade-in-up">
                    <h3 className="text-sm font-black leading-snug text-slate-900 dark:text-white">{guideNode.question}</h3>
                    <div className="space-y-2">
                      {guideNode.options.map((option) => (
                        <button
                          key={option.label}
                          onClick={() => chooseGuideOption(option.next)}
                          className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.035] px-3 py-2.5 text-left text-xs font-bold text-slate-650 dark:text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-500"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    {guideHistory.length > 0 && (
                      <button onClick={guideBack} className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-cyan-400">
                        <ArrowLeft className="h-3.5 w-3.5" /> Previous step
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          {panelMode === 'chat' && (
          <form onSubmit={handleSend} className="p-2 border-t border-slate-200 dark:border-brand-800 bg-white dark:bg-brand-900 flex items-center space-x-1.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              maxLength={500}
              disabled={isTyping}
              className="flex-1 px-3 py-1.5 bg-slate-100 dark:bg-brand-950 rounded-lg text-xs outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="p-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          )}

        </div>
      )}

      {/* Button */}
      <button
        aria-label={isOpen ? 'Close assistant' : 'Open assistant'}
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-slate-900 hover:bg-slate-850 text-white shadow-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
      </button>
    </div>
  );
};

export default FloatingChatbot;
