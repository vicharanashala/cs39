import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../utils/api';
import { MessageSquare, X, Send, Sparkles } from 'lucide-react';

const FloatingChatbot = () => {
  const { user, setActiveTab, setSelectedThreadId } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hello! I am your IIT Ropar AI Assistant. Ask me anything about internships, Bonafide certificates, attendance rules, assignments, or campus queries!",
      confidence: 100
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

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: input
    };

    setMessages((prev) => [...prev, userMessage]);
    const queryText = input;
    setInput('');
    setIsTyping(true);

    try {
      const res = await api.post('/chatbot/query', { query: queryText });
      const { answer, confidence, suggestThread } = res.data;

      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: 'ai',
            text: answer,
            confidence: confidence,
            suggestThread: suggestThread,
            threadCreated: res.data.threadCreated,
            threadId: res.data.threadId
          }
        ]);
      }, 600);
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
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 font-sans flex flex-col items-end">
      {isOpen && (
        <div className="w-80 h-96 bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-850 rounded-2xl shadow-xl flex flex-col mb-3 overflow-hidden animate-slide-in">
          
          {/* Header */}
          <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
            <span className="text-xs font-bold flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>AI FAQ Assistant</span>
            </span>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
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
                  
                  {msg.suggestThread && !msg.threadCreated && (
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

                  {msg.threadCreated && msg.threadId && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        setSelectedThreadId(msg.threadId);
                      }}
                      className="mt-2 w-full py-1 text-center bg-emerald-500 hover:bg-emerald-600 text-white rounded font-bold text-[9px]"
                    >
                      View Instantly Created Question
                    </button>
                  )}
                </div>
                {msg.sender === 'ai' && msg.confidence !== undefined && (
                  <span className="text-[8px] text-slate-400 font-bold mt-1 px-1">
                    Confidence: {msg.confidence}%
                  </span>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="text-[10px] text-slate-400 italic animate-pulse">Assistant is typing...</div>
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
              className="flex-1 px-3 py-1.5 bg-slate-100 dark:bg-brand-950 rounded-lg text-xs outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      )}

      {/* Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-slate-900 hover:bg-slate-850 text-white shadow-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
      </button>
    </div>
  );
};

export default FloatingChatbot;
