// components/LiveFAQTracker.jsx
// Modular live FAQ tracking component — shows real-time status stepper
import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';

// Step definitions — mirrors backend STATUS_STEPS
export const TRACKER_STEPS = [
  { status: 'received',      label: 'Question Received',  icon: '📥', color: '#6366f1', bgColor: 'bg-indigo-500' },
  { status: 'ai_analyzing',   label: 'AI Analyzing',       icon: '🤖', color: '#8b5cf6', bgColor: 'bg-violet-500' },
  { status: 'expert_review', label: 'Expert Reviewing',   icon: '👨‍💼', color: '#f59e0b', bgColor: 'bg-amber-500' },
  { status: 'verified',      label: 'Answer Verified',    icon: '✅', color: '#10b981', bgColor: 'bg-emerald-500' },
  { status: 'completed',     label: 'Solution Completed',  icon: '🎉', color: '#14b8a6', bgColor: 'bg-teal-500' }
];

export const LiveFAQTracker = ({ threadId, compact = false }) => {
  const [tracker, setTracker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const socketRef = useRef(null);

  // Fetch initial tracker status
  const fetchTracker = async () => {
    try {
      const res = await api.get(`/track/${threadId}`);
      setTracker(res.data.tracker);
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
        }
      };

      io.on('faq_status_update', handleStatusUpdate);

      return () => {
        io.off('faq_status_update', handleStatusUpdate);
      };
    }
  }, [threadId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] text-slate-400 font-semibold">Loading tracker...</span>
      </div>
    );
  }

  if (error || !tracker) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
        <span>⚪</span>
        <span>Tracking unavailable</span>
      </div>
    );
  }

  const currentIdx = TRACKER_STEPS.findIndex(s => s.status === tracker.status);

  if (compact) {
    // Compact inline display — just the current step + progress bar
    const step = TRACKER_STEPS[currentIdx] || TRACKER_STEPS[0];
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 dark:bg-brand-800">
          <span>{step.icon}</span>
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{step.label}</span>
        </div>
        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-brand-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: step.color }}
          />
        </div>
        <span className="text-[9px] font-bold text-slate-400">{Math.round(progress)}%</span>
      </div>
    );
  }

  // Full horizontal stepper display
  return (
    <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-800 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: TRACKER_STEPS[currentIdx]?.color }} />
          <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Live FAQ Tracking
          </span>
        </div>
        <span className="text-[9px] font-bold text-slate-400">
          {currentIdx + 1} of {TRACKER_STEPS.length} steps
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-100 dark:bg-brand-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            backgroundColor: TRACKER_STEPS[currentIdx]?.color || '#6366f1'
          }}
        />
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between">
        {TRACKER_STEPS.map((step, idx) => {
          const isDone = idx < currentIdx;
          const isActive = idx === currentIdx;
          const isPending = idx > currentIdx;

          return (
            <div key={step.status} className="flex flex-col items-center gap-1 flex-1">
              {/* Circle */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all ${
                  isDone
                    ? `${step.bgColor} text-white`
                    : isActive
                    ? `${step.bgColor} text-white ring-4 ring-opacity-30 ring-slate-200 dark:ring-brand-700`
                    : 'bg-slate-100 dark:bg-brand-800 text-slate-300 dark:text-slate-600'
                }`}
              >
                {isDone ? '✓' : step.icon}
              </div>
              {/* Label */}
              <span
                className={`text-[8px] font-bold text-center leading-tight ${
                  isActive
                    ? 'text-slate-800 dark:text-white'
                    : isDone
                    ? 'text-slate-500 dark:text-slate-400'
                    : 'text-slate-300 dark:text-slate-600'
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
        <div className="pt-2 border-t border-slate-100 dark:border-brand-800">
          {(() => {
            const currentStep = tracker.steps[tracker.steps.length - 1];
            return (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{TRACKER_STEPS.find(s => s.status === tracker.status)?.icon}</span>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                    {TRACKER_STEPS.find(s => s.status === tracker.status)?.label}
                  </span>
                </div>
                <span className="text-[9px] text-slate-400">
                  {currentStep?.timestamp ? new Date(currentStep.timestamp).toLocaleString() : ''}
                </span>
              </div>
            );
          })()}
        </div>
      )}

      {/* AI Analysis summary (if available) */}
      {tracker.aiAnalysis && tracker.aiAnalysis.summary && (
        <div className="pt-2 border-t border-slate-100 dark:border-brand-800 space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-extrabold text-violet-500 uppercase">AI Analysis</span>
            <span className="text-[9px] font-bold text-slate-400 ml-auto">
              {Math.round((tracker.aiAnalysis.confidence || 0) * 100)}% confidence
            </span>
          </div>
          <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed italic">
            "{tracker.aiAnalysis.summary}"
          </p>
          {tracker.aiAnalysis.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {tracker.aiAnalysis.tags.slice(0, 4).map(tag => (
                <span key={tag} className="px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-[9px] font-bold rounded-full border border-violet-200 dark:border-violet-800">
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