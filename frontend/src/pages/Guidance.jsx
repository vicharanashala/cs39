import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bot, CheckCircle2, ExternalLink, HelpCircle, RefreshCw, Route, Search, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../utils/api';

const TREES = {
  internship: {
    title: 'Internship Navigator',
    category: 'Internship',
    start: 'scope',
    nodes: {
      scope: {
        question: 'What do you need help deciding?',
        options: [
          { label: 'Eligibility or selection', next: 'eligibility' },
          { label: 'Documents or certificate', next: 'documents' },
          { label: 'Portal or technical issue', next: 'portal' }
        ]
      },
      eligibility: {
        question: 'Do you already have a project or offer selected?',
        options: [
          { label: 'Yes', next: 'rec_selection' },
          { label: 'No', next: 'rec_shortlist' }
        ]
      },
      documents: {
        question: 'Which document is blocking you?',
        options: [
          { label: 'NOC', next: 'rec_noc' },
          { label: 'Bonafide certificate', next: 'rec_bonafide' },
          { label: 'Completion proof', next: 'rec_completion' }
        ]
      },
      portal: {
        question: 'Is the issue preventing submission today?',
        options: [
          { label: 'Yes, deadline risk', next: 'rec_escalate' },
          { label: 'No, general access issue', next: 'rec_portal' }
        ]
      },
      rec_selection: { result: true, title: 'Confirm eligibility before final submission', body: 'Check the project-specific cutoff, verify department restrictions, and keep your application ID ready before contacting the coordinator.', query: 'selection eligibility internship' },
      rec_shortlist: { result: true, title: 'Start with official project filters', body: 'Shortlist by department, required skills, and deadline first. Then use the FAQ feed to validate CGPA, year, and document requirements.', query: 'internship eligibility CGPA' },
      rec_noc: { result: true, title: 'Prepare the NOC route', body: 'Download the latest NOC template, fill student and internship details, get department approval, then upload it before joining confirmation.', query: 'NOC format internship' },
      rec_bonafide: { result: true, title: 'Use the academics certificate path', body: 'Use the official bonafide template and confirm the signing authority before submission. Keep your institute ID and offer context handy.', query: 'bonafide certificate template' },
      rec_completion: { result: true, title: 'Close completion requirements', body: 'Confirm mentor evaluation, final report upload, and certificate issue timeline. Missing deliverables usually delay completion letters.', query: 'completion certificate internship' },
      rec_escalate: { result: true, title: 'Escalate with proof now', body: 'Capture screenshots, note timestamp and browser, submit a support ticket, and email the coordinator before the deadline passes.', query: 'portal submission issue deadline' },
      rec_portal: { result: true, title: 'Run the portal recovery checklist', body: 'Try password reset, a clean browser session, and institute email login. If it persists, raise a technical ticket with device details.', query: 'portal login technical issue' }
    }
  },
  academics: {
    title: 'Academic Support Flow',
    category: 'Attendance',
    start: 'kind',
    nodes: {
      kind: {
        question: 'Which academic support path fits your case?',
        options: [
          { label: 'Attendance shortage', next: 'attendance' },
          { label: 'Assignment submission', next: 'assignment' },
          { label: 'Mentor or project guidance', next: 'mentor' }
        ]
      },
      attendance: {
        question: 'Is your attendance below the required threshold?',
        options: [
          { label: 'Yes', next: 'rec_attendance_risk' },
          { label: 'No, it is a correction issue', next: 'rec_attendance_fix' }
        ]
      },
      assignment: {
        question: 'Is the deadline already closed?',
        options: [
          { label: 'Yes', next: 'rec_late_submission' },
          { label: 'No', next: 'rec_submit' }
        ]
      },
      mentor: {
        question: 'Have you contacted your mentor already?',
        options: [
          { label: 'Yes', next: 'rec_coordinator' },
          { label: 'No', next: 'rec_mentor' }
        ]
      },
      rec_attendance_risk: { result: true, title: 'Build a recovery plan quickly', body: 'Collect valid leave proofs, contact mentor and coordinator, and ask for the exact remediation path before the review window closes.', query: 'attendance shortage medical leave' },
      rec_attendance_fix: { result: true, title: 'Request attendance correction', body: 'Share the date, course/lab, proof of presence, and mentor confirmation. Corrections are easier when reported within 24-48 hours.', query: 'attendance correction' },
      rec_late_submission: { result: true, title: 'Ask for late submission approval', body: 'Send reason, proof, and the completed file immediately. Do not wait for portal reopening if coordinator email is allowed.', query: 'assignment late submission' },
      rec_submit: { result: true, title: 'Use the clean submission checklist', body: 'Confirm accepted file type, size limit, naming format, and upload receipt. Keep a local timestamped copy.', query: 'assignment submission' },
      rec_coordinator: { result: true, title: 'Escalate with mentor context', body: 'Summarize mentor response, blocker, desired decision, and timeline. Ask coordinator for the next official step.', query: 'mentor coordinator project' },
      rec_mentor: { result: true, title: 'Start with mentor alignment', body: 'Send a concise note with project title, blocker, what you tried, and two possible next steps.', query: 'mentor guidance project' }
    }
  }
};

const Guidance = () => {
  const { setActiveTab, setSelectedThreadId } = useApp();
  const [treeId, setTreeId] = useState('internship');
  const [nodeId, setNodeId] = useState(TREES.internship.start);
  const [history, setHistory] = useState([]);
  const [related, setRelated] = useState([]);
  const tree = TREES[treeId];
  const node = tree.nodes[nodeId];
  const progress = Math.min(100, ((history.length + (node?.result ? 2 : 1)) / 5) * 100);

  const path = useMemo(() => [...history, nodeId].filter(Boolean), [history, nodeId]);

  useEffect(() => {
    if (!node?.result) return;
    api.get('/threads', {
      params: { isOfficial: 'true', search: node.query || node.title, paraphrase: 'true' }
    }).then((res) => setRelated(res.data.slice(0, 3))).catch(() => setRelated([]));
  }, [node]);

  const chooseTree = (id) => {
    setTreeId(id);
    setNodeId(TREES[id].start);
    setHistory([]);
    setRelated([]);
  };

  const chooseOption = (next) => {
    setHistory((current) => [...current, nodeId]);
    setNodeId(next);
  };

  const goBack = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((current) => current.slice(0, -1));
    setNodeId(previous);
  };

  const restart = () => {
    setNodeId(tree.start);
    setHistory([]);
    setRelated([]);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 font-sans">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl backdrop-blur-3xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(99,102,241,0.22),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(6,182,212,0.16),transparent_28%)]" />
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-cyan-300">
              <Bot className="h-4 w-4" />
              AI Guidance Assistant
            </div>
            <h1 className="mt-4 text-2xl sm:text-3xl font-black text-white">Interactive Decision Tree</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Answer a few focused prompts and get a recommended FAQ path with relevant official guidance.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:min-w-[360px]">
            {Object.entries(TREES).map(([id, item]) => (
              <button
                key={id}
                onClick={() => chooseTree(id)}
                className={`rounded-2xl border px-4 py-3 text-left transition card-hover ${treeId === id ? 'border-brand-400/40 bg-brand-500/20 text-white shadow-indigo' : 'border-white/10 bg-white/[0.04] text-slate-400 hover:text-white'}`}
              >
                <span className="block text-xs font-black">{item.title}</span>
                <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.category}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0b0c14]/80 p-5 shadow-2xl backdrop-blur-3xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-400/30 bg-brand-500/15 text-brand-300">
              <Route className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Guided route</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-500 via-violet-500 to-cyan-400 transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <span className="text-[10px] font-black text-cyan-300">{Math.round(progress)}%</span>
          </div>

          <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1">
            {path.map((step, index) => (
              <div key={`${step}-${index}`} className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full border transition ${index === path.length - 1 ? 'border-cyan-300 bg-cyan-300 shadow-cyan' : 'border-brand-300 bg-brand-400/60'}`} />
                {index < path.length - 1 && <span className="h-px w-12 bg-gradient-to-r from-brand-400/70 to-cyan-300/70 animate-pulse" />}
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-glass animate-fade-in-up">
            {node.result ? (
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Final recommendation
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">{node.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">{node.body}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={goBack} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <button onClick={restart} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10">
                    <RefreshCw className="h-4 w-4" /> Restart
                  </button>
                  <button onClick={() => { setSelectedThreadId(null); setActiveTab('feed'); }} className="soft-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black">
                    <Search className="h-4 w-4" /> Search Feed
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-xl border border-brand-400/20 bg-brand-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-brand-300">
                  <Sparkles className="h-4 w-4" />
                  Step {history.length + 1}
                </div>
                <h2 className="text-xl font-black text-white">{node.question}</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {node.options.map((option) => (
                    <button key={option.label} onClick={() => chooseOption(option.next)} className="group rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-left text-sm font-bold text-slate-300 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-white">
                      {option.label}
                      <ExternalLink className="mt-3 h-4 w-4 text-slate-600 transition group-hover:text-cyan-300" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-3xl border border-white/10 bg-[#0b0c14]/75 p-5 shadow-2xl backdrop-blur-3xl">
          <div className="mb-4 flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-cyan-300" />
            <h3 className="text-xs font-black uppercase tracking-widest text-white">Related FAQs</h3>
          </div>
          <div className="space-y-3">
            {node.result && related.length === 0 && <p className="text-xs font-semibold leading-relaxed text-slate-500">No matching official FAQ loaded yet. Try searching the feed with the recommendation terms.</p>}
            {!node.result && <p className="text-xs font-semibold leading-relaxed text-slate-500">Recommendations appear here once the route reaches an answer.</p>}
            {related.map((faq) => (
              <button key={faq._id} onClick={() => setSelectedThreadId(faq._id)} className="w-full rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-brand-400/30 hover:bg-brand-400/10">
                <span className="line-clamp-2 text-xs font-black text-slate-200">{faq.title}</span>
                <span className="mt-2 block text-[9px] font-black uppercase tracking-widest text-cyan-300">{faq.category}</span>
              </button>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
};

export default Guidance;
