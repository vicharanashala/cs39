// components/LiveFAQTracker.jsx
// Modular live FAQ tracking component — shows real-time status stepper
import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';

// Step definitions — mirrors backend STATUS_STEPS
export const TRACKER_STEPS = [
  { status: 'received',      label: 'Received',  icon: '📥', color: '#FF9933', bgColor: 'bg-amber-500' },
  { status: 'ai_analyzing',   label: 'AI Analyzing',       icon: '🤖', color: '#8b5cf6', bgColor: 'bg-violet-500' },
  { status: 'expert_review', label: 'Reviewing',   icon: '👨‍💼', color: '#5E72E4', bgColor: 'bg-[#5E72E4]' },
  { status: 'verified',      label: 'Verified',    icon: '✅', color: '#10b981', bgColor: 'bg-emerald-500' },
  { status: 'completed',     label: 'Completed',  icon: '🎉', color: '#14b8a6', bgColor: 'bg-teal-500' }
];

export const LiveFAQTracker = ({ threadId, compact = false }) => {
  const [tracker, setTracker] = useState(null);
  const [queuePosition, setQueuePosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const socketRef = useRef(null);

  // Fetch initial tracker status
  const fetchTracker = async () => {
    try {
      const res = await api.get(`/track/${threadId}`);
      setTracker(res.data.tracker);
      setQueuePosition(res.data.queuePosition);
      updateProgress(res.data.tracker.status);
    } catch (err) {
      console.error('Tracker fetch error:', err);
      setError('Could not load tracking status.');
    } finally {
      setLoading(false);
    }
  };

  // Compute progress percentage based on current status
  const updateProgress = (status) => {
    const idx = TRACKER_STEPS.findIndex(s => s.status === status);
    setProgress(idx >= 0 ? ((idx + 1) / TRACKER_STEPS.length) * 100 : 0);
  };

  // Socket.IO real-time updates
  useEffect(() => {
    if (!threadId) return;

    fetchTracker();

    // Connect to socket for live updates
    const io = window.io;
    if (io) {
      socketRef.current = io;

      // Listen for faq_status_update events
      const handleStatusUpdate = (data) => {
        if (data.threadId === threadId || data.threadId === threadId?.toString()) {
          setTracker(prev => {
            const updated = prev ? { ...prev, status: data.status, steps: data.steps || prev.steps } : null;
            if (data.status) updateProgress(data.status);
            return updated;
          });
          fetchTracker();
        }
      };

      const handleQueueUpdate = () => {
        fetchTracker();
      };

      io.on('faq_status_update', handleStatusUpdate);
      io.on('queue_position_update', handleQueueUpdate);

      return () => {
        io.off('faq_status_update', handleStatusUpdate);
        io.off('queue_position_update', handleQueueUpdate);
      };
    }
  }, [threadId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Synchronizing stepper...</span>
      </div>
    );
  }

  if (error || !tracker) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">
        <span>⚪</span>
        <span>Tracking offline</span>
      </div>
    );
  }

  const currentIdx = TRACKER_STEPS.findIndex(s => s.status === tracker.status);

  if (compact) {
    // Compact inline display — just the current step + progress bar
    const step = TRACKER_STEPS[currentIdx] || TRACKER_STEPS[0];
    return (
      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-brand-950/20 border border-slate-200/50 dark:border-white/5 rounded-2xl">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/30 dark:border-white/5">
          <span>{step.icon}</span>
          <span className="text-[9px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">{step.label}</span>
        </div>
        {queuePosition && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400">
            <span className="text-[9px] font-black uppercase">Q#{queuePosition}</span>
          </div>
        )}
        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: step.color }}
          />
        </div>
        <span className="text-[9px] font-black text-slate-400">{Math.round(progress)}%</span>
      </div>
    );
  }

  // Full horizontal stepper display
  return (
    <div className="bg-white/60 dark:bg-[#0b0c10]/40 border border-slate-200/50 dark:border-white/5 rounded-3xl p-5 space-y-4 shadow-sm relative">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: TRACKER_STEPS[currentIdx]?.color }} />
          <span className="text-[9px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest">
            Live Ticket Stepper
          </span>
        </div>
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
          Step {currentIdx + 1} of {TRACKER_STEPS.length}
        </span>
      </div>

      {/* Queue Position Status Panel */}
      {queuePosition && (
        <div className="bg-gradient-to-r from-blue-500/[0.03] to-indigo-500/[0.03] border border-blue-500/20 dark:border-blue-500/10 rounded-2xl p-4 flex items-center justify-between gap-4 animate-slide-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 dark:text-blue-450 font-black text-sm border border-blue-500/20">
              #{queuePosition}
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-blue-500 dark:text-blue-400 tracking-wider">Resolution Queue</p>
              <p className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold mt-0.5">
                {queuePosition === 1 ? 'Your question is next in line!' : `Position #${queuePosition} in the active resolution queue.`}
              </p>
            </div>
          </div>
          <div className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-white/5 px-2.5 py-1.5 rounded-xl border border-slate-200/40 dark:border-white/5">
            {queuePosition - 1} ahead
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="h-2 bg-slate-100 dark:bg-[#07080b]/80 border border-slate-200/30 dark:border-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out shadow-sm"
          style={{
            width: `${progress}%`,
            backgroundColor: TRACKER_STEPS[currentIdx]?.color || '#FF9933'
          }}
        />
      </div>

      {/* Stepper Grid */}
      <div className="flex items-center justify-between pt-2">
        {TRACKER_STEPS.map((step, idx) => {
          const isDone = idx < currentIdx;
          const isActive = idx === currentIdx;
          const isPending = idx > currentIdx;

          return (
            <div key={step.status} className="flex flex-col items-center gap-1.5 flex-1 relative">
              {/* Circle */}
              <div
                className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center text-xs transition-all shadow-sm ${
                  isDone
                    ? `${step.bgColor} text-white`
                    : isActive
                    ? `${step.bgColor} text-white ring-4 ring-amber-500/20 dark:ring-amber-500/10 border border-white/10`
                    : 'bg-slate-50 dark:bg-white/[0.01] border border-slate-200/50 dark:border-white/5 text-slate-350 dark:text-slate-650'
                }`}
              >
                {isDone ? '✓' : step.icon}
              </div>
              {/* Label */}
              <span
                className={`text-[8px] font-black uppercase tracking-wider text-center leading-tight ${
                  isActive
                    ? 'text-slate-800 dark:text-white'
                    : isDone
                    ? 'text-slate-500 dark:text-slate-400'
                    : 'text-slate-400 dark:text-slate-600'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current step detail */}
      {tracker.steps?.length > 0 && (
        <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">{TRACKER_STEPS.find(s => s.status === tracker.status)?.icon}</span>
            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {TRACKER_STEPS.find(s => s.status === tracker.status)?.label} Step Update
            </span>
          </div>
          <span className="text-[9px] text-slate-400 font-semibold uppercase">
            {new Date(tracker.steps[tracker.steps.length - 1]?.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}

      {/* AI Heuristics block */}
      {tracker.aiAnalysis && tracker.aiAnalysis.summary && (
        <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-2.5 animate-slide-in">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black text-[#E07A15] dark:text-[#FFAE59] uppercase tracking-widest">AI Status Assessment</span>
            <span className="text-[9px] font-bold text-slate-405 dark:text-slate-400 ml-auto">
              {Math.round((tracker.aiAnalysis.confidence || 0) * 100)}% Confidence
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-350 leading-relaxed font-semibold italic bg-slate-50 dark:bg-white/[0.01] p-3 rounded-2xl border border-slate-150 dark:border-white/5">
            "{tracker.aiAnalysis.summary}"
          </p>
          {tracker.aiAnalysis.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {tracker.aiAnalysis.tags.slice(0, 4).map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 text-[8px] font-black uppercase tracking-wider rounded-md border border-indigo-500/20">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveFAQTracker;