import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../utils/api';
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';

const QUICK_PROMPTS = [
  'How do I join?',
  'How do I submit my NOC?',
  'What work will I do?',
  'I need platform help'
];

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

  const openThread = (threadId) => {
    setIsOpen(false);
    setActiveTab('feed');
    setSelectedThreadId(threadId);
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 font-sans flex flex-col items-end">
      {isOpen && (
        <div className="w-[calc(100vw-2rem)] max-w-80 h-[26rem] bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-850 rounded-2xl shadow-xl flex flex-col mb-3 overflow-hidden animate-slide-in">
          
          {/* Header */}
          <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
            <span className="text-xs font-bold flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Quick FAQ Assistant</span>
            </span>
            <button aria-label="Close assistant" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
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
                      <button
                        onClick={() => openThread(msg.threadId)}
                        className="w-full py-1.5 px-2 text-left bg-brand-500/10 text-brand-600 dark:text-brand-300 rounded font-bold text-[10px]"
                      >
                        View source: {msg.sourceTitle}
                      </button>
                    </div>
                  )}

                  {msg.suggestions?.length > 0 && !msg.sourceTitle && (
                    <div className="mt-2 space-y-1">
                      {msg.suggestions.map((suggestion) => (
                        <button
                          key={suggestion.threadId}
                          onClick={() => openThread(suggestion.threadId)}
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

          {/* Form */}
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
