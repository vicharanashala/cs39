import React, { useState } from 'react';
import { ChevronRight, CheckCircle2, ArrowLeft, Lightbulb, HelpCircle, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';

/* ─────────────────────────────────────────────────────────
   DECISION TREE DATA
   Each node: { id, question, answer?, options?, resolution? }
   options: [{ label, next }]  → next = node id or 'RESOLVED'
───────────────────────────────────────────────────────── */
const DECISION_TREES = {
  internship: {
    title: 'Internship Query',
    icon: '🎓',
    color: 'brand',
    start: 'q1',
    nodes: {
      q1: {
        question: 'What is your internship query about?',
        options: [
          { label: 'Eligibility & Selection', next: 'q_elig' },
          { label: 'Documents & NOC', next: 'q_docs' },
          { label: 'Joining & Onboarding', next: 'q_join' },
          { label: 'Stipend & Payments', next: 'q_pay' },
        ]
      },
      q_elig: {
        question: 'What is your eligibility concern?',
        options: [
          { label: 'Minimum CGPA requirement', next: 'r_cgpa' },
          { label: 'Year of study eligibility', next: 'r_year' },
          { label: 'Branch/department restrictions', next: 'r_branch' },
        ]
      },
      r_cgpa: {
        resolution: true,
        answer: 'The minimum CGPA requirement for the internship program is typically 6.5/10. However, specific project requirements may vary. Please check the official portal for project-specific cutoffs. Contact your faculty coordinator if you have a special case.',
        tip: 'Check the FAQ Feed under "Getting Started" for the latest CGPA policy.'
      },
      r_year: {
        resolution: true,
        answer: 'The internship program is open to students who have completed at least their 2nd year (4th semester). Final year students may have different eligibility criteria — please verify with the coordinator.',
        tip: 'Check the Selection Process category in the FAQ Feed.'
      },
      r_branch: {
        resolution: true,
        answer: 'Most internship projects are open to all branches. Some specialized projects may require specific technical skills. The eligibility criteria are mentioned in each project listing on the portal.',
        tip: 'Browse the Internship category in the Official FAQ Feed for more details.'
      },
      q_docs: {
        question: 'Which document do you need help with?',
        options: [
          { label: 'NOC (No Objection Certificate)', next: 'r_noc' },
          { label: 'Offer Letter / Acceptance', next: 'r_offer' },
          { label: 'Completion Certificate', next: 'r_cert' },
        ]
      },
      r_noc: {
        resolution: true,
        answer: 'The NOC template is available on the student portal under Downloads → Internship Documents. Fill in your details, get it signed by your HOD, then submit it to the internship coordinator\'s office within 7 days of internship start.',
        tip: 'Search "NOC format" in the FAQ Feed for step-by-step instructions.'
      },
      r_offer: {
        resolution: true,
        answer: 'Your offer letter will be sent to your registered email address within 3-5 working days of selection confirmation. If you haven\'t received it after 7 days, contact the coordinator with your application ID.',
        tip: 'Check spam/junk folders. Contact coordinator@iitropar.ac.in if issue persists.'
      },
      r_cert: {
        resolution: true,
        answer: 'Completion certificates are issued within 2 weeks after successful internship completion and mentor evaluation submission. You must have submitted all deliverables and received a passing evaluation to be eligible.',
        tip: 'Submit your final report and get mentor evaluation before the deadline.'
      },
      q_join: {
        question: 'What is your joining concern?',
        options: [
          { label: 'I cannot access the portal', next: 'r_portal' },
          { label: 'Team assignment & mentors', next: 'r_team' },
          { label: 'Attendance marking process', next: 'r_attend' },
        ]
      },
      r_portal: {
        resolution: true,
        answer: 'To access the internship portal: (1) Go to portal.iitropar.ac.in, (2) Login with your institute email, (3) Use your student ID as the default password. If login fails, reset via the "Forgot Password" link. IT helpdesk: helpdesk@iitropar.ac.in',
        tip: 'Clear browser cache and try in incognito mode if issues persist.'
      },
      r_team: {
        resolution: true,
        answer: 'Team assignments are made by the internship coordinators and communicated via email and the portal within 2 days of joining. Your mentor will reach out to schedule the first meeting. If you haven\'t heard after 3 days, email coordinator@iitropar.ac.in.',
        tip: 'Check the Mentorship category in the FAQ Feed.'
      },
      r_attend: {
        resolution: true,
        answer: 'Attendance is marked daily on the portal under My Internship → Mark Attendance. You must mark attendance between 9 AM and 11 AM. Missing 3 consecutive days without prior approval may result in internship cancellation.',
        tip: 'Enable portal notifications to get daily attendance reminders.'
      },
      q_pay: {
        question: 'What is your payment concern?',
        options: [
          { label: 'When will I receive stipend?', next: 'r_stipend' },
          { label: 'Incorrect payment amount', next: 'r_amount' },
          { label: 'Bank details submission', next: 'r_bank' },
        ]
      },
      r_stipend: {
        resolution: true,
        answer: 'Stipends are processed on the last working day of each month for students who have maintained required attendance (minimum 75%). First month stipend may be delayed by up to 10 working days due to onboarding processing.',
        tip: 'Ensure your bank details are updated in the portal by the 20th of each month.'
      },
      r_amount: {
        resolution: true,
        answer: 'If you received an incorrect stipend amount, raise a ticket via the portal under Support → Payment Issue. Include your student ID, expected amount, and received amount. The finance team resolves payment disputes within 5 working days.',
        tip: 'Keep screenshots of your stipend confirmation email as proof.'
      },
      r_bank: {
        resolution: true,
        answer: 'Submit your bank details on the portal under Profile → Bank Details. You need: Account number, IFSC code, and bank name. Details must be submitted before the 15th of the month to receive stipend for that month.',
        tip: 'Only Indian bank accounts are accepted. UPI IDs are not valid.'
      }
    }
  },
  attendance: {
    title: 'Attendance Issue',
    icon: '📋',
    color: 'cyan',
    start: 'q1',
    nodes: {
      q1: {
        question: 'What is your attendance issue?',
        options: [
          { label: 'I missed marking attendance', next: 'q_missed' },
          { label: 'Attendance not reflecting', next: 'r_reflect' },
          { label: 'Medical/emergency leave', next: 'r_medical' },
          { label: 'Attendance percentage concern', next: 'q_percent' },
        ]
      },
      q_missed: {
        question: 'Why did you miss attendance?',
        options: [
          { label: 'Portal was down', next: 'r_portaldown' },
          { label: 'I forgot to mark', next: 'r_forgot' },
          { label: 'Was on approved leave', next: 'r_leave' },
        ]
      },
      r_portaldown: {
        resolution: true,
        answer: 'If the portal was down and you couldn\'t mark attendance, email coordinator@iitropar.ac.in within 24 hours with subject "Portal Down - Attendance [Date]". Attach any screenshot or error message as proof. They will manually update your attendance.',
        tip: 'Also report portal downtime to helpdesk@iitropar.ac.in to help them fix it faster.'
      },
      r_forgot: {
        resolution: true,
        answer: 'If you forgot to mark attendance and it was within the same day, contact your mentor immediately and request them to vouch for your presence. The mentor can submit a manual attendance correction form to the coordinator.',
        tip: 'Set a daily alarm for 9:30 AM to remind yourself to mark attendance.'
      },
      r_leave: {
        resolution: true,
        answer: 'If you were on approved leave, your attendance should be marked as "Leave" automatically. If it shows absent instead, contact the coordinator with your leave approval email as proof. Correction requests must be submitted within 48 hours.',
        tip: 'Always apply for leave at least 24 hours in advance on the portal.'
      },
      r_reflect: {
        resolution: true,
        answer: 'Attendance updates may take up to 4 hours to reflect on the portal. If it still doesn\'t show after 4 hours, clear your browser cache and try again. If the issue persists after 24 hours, raise a support ticket on the portal.',
        tip: 'Hard refresh (Ctrl+Shift+R) often fixes display issues.'
      },
      r_medical: {
        resolution: true,
        answer: 'For medical or emergency leave: (1) Notify your mentor via email as soon as possible, (2) Apply for leave on the portal within 24 hours of the incident, (3) Submit a medical certificate within 3 days of returning, (4) Maximum 10 days of medical leave is allowed per internship.',
        tip: 'Keep all medical documents handy. Scanned copies are accepted.'
      },
      q_percent: {
        question: 'What is your attendance percentage?',
        options: [
          { label: 'Above 75% (no concern)', next: 'r_above75' },
          { label: 'Between 60-75% (warning zone)', next: 'r_warning' },
          { label: 'Below 60% (critical)', next: 'r_critical' },
        ]
      },
      r_above75: {
        resolution: true,
        answer: 'Great news! You are above the minimum 75% attendance requirement. Continue maintaining this. Your attendance is in good standing and you are eligible for the full stipend and completion certificate.',
        tip: 'Aim for 85%+ attendance to maximize your evaluation score.'
      },
      r_warning: {
        resolution: true,
        answer: 'You are in the warning zone (60-75%). You need to improve attendance urgently. Contact your mentor to discuss a plan. Note that falling below 75% may affect your stipend amount and completion certificate eligibility.',
        tip: 'You can submit a remediation plan to the coordinator if you have valid reasons for absences.'
      },
      r_critical: {
        resolution: true,
        answer: 'Your attendance is critically low (<60%). This puts your internship at risk. Immediately: (1) Contact your mentor, (2) Email the coordinator explaining your situation, (3) Submit all pending documentation. A committee review will determine if you can continue.',
        tip: 'Be proactive — contact the coordinator before they contact you.'
      }
    }
  },
  technical: {
    title: 'Technical Issue',
    icon: '⚙️',
    color: 'violet',
    start: 'q1',
    nodes: {
      q1: {
        question: 'What technical issue are you facing?',
        options: [
          { label: 'Portal login problem', next: 'r_login' },
          { label: 'Cannot submit assignment', next: 'r_submit' },
          { label: 'Profile data incorrect', next: 'r_profile' },
          { label: 'Other platform bug', next: 'r_bug' },
        ]
      },
      r_login: {
        resolution: true,
        answer: 'Portal Login Troubleshooting: (1) Use your institute email (username@iitrpr.ac.in), (2) Default password is your Student ID, (3) Use "Forgot Password" if needed — OTP will be sent to your institute email, (4) Try a different browser if still failing, (5) Contact IT: helpdesk@iitropar.ac.in',
        tip: 'Chrome or Firefox work best. Avoid using Internet Explorer.'
      },
      r_submit: {
        resolution: true,
        answer: 'Assignment Submission Fix: (1) Check the file size limit (max 25MB per file), (2) Accepted formats: PDF, DOCX, ZIP, (3) Ensure the submission deadline hasn\'t passed, (4) Try uploading one file at a time, (5) If still failing, email your assignment to your mentor directly and CC the coordinator.',
        tip: 'Compress large files using 7-zip or WinRAR before uploading.'
      },
      r_profile: {
        resolution: true,
        answer: 'If your profile data (name, branch, year) is incorrect: (1) Go to Profile → Edit Profile, (2) Make corrections and save, (3) If fields are locked, raise a support ticket under Help → Profile Correction with your institute ID card as proof.',
        tip: 'Profile corrections may take 2-3 working days to process.'
      },
      r_bug: {
        resolution: true,
        answer: 'To report a platform bug: (1) Take a clear screenshot of the error, (2) Note the exact steps to reproduce, (3) Raise a support ticket on the portal under Help → Report Bug, (4) Alternatively email bugs@iitropar.ac.in with subject "Bug Report: [Brief description]".',
        tip: 'The more detail you provide, the faster the bug gets fixed!'
      }
    }
  }
};

/* ─────────────────────────────────────────────────────────
   TOPIC CARD (selection screen)
───────────────────────────────────────────────────────── */
const colorMap = {
  brand: {
    bg: 'bg-brand-500/10 dark:bg-brand-500/15',
    border: 'border-brand-500/20',
    text: 'text-brand-600 dark:text-brand-400',
    button: 'bg-brand-500 hover:bg-brand-600',
  },
  cyan: {
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
    border: 'border-cyan-500/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    button: 'bg-cyan-500 hover:bg-cyan-600',
  },
  violet: {
    bg: 'bg-violet-500/10 dark:bg-violet-500/15',
    border: 'border-violet-500/20',
    text: 'text-violet-600 dark:text-violet-400',
    button: 'bg-violet-500 hover:bg-violet-600',
  }
};

/* ─────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────── */
const DecisionTree = () => {
  const { theme, setSelectedThreadId, setActiveTab } = useApp();
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [currentNodeId, setCurrentNodeId] = useState(null);
  const [history, setHistory] = useState([]);

  const tree = selectedTopic ? DECISION_TREES[selectedTopic] : null;
  const currentNode = tree ? tree.nodes[currentNodeId] : null;
  const colors = tree ? colorMap[tree.color] : null;

  const selectTopic = (topicId) => {
    setSelectedTopic(topicId);
    setCurrentNodeId(DECISION_TREES[topicId].start);
    setHistory([]);
  };

  const goToNode = (nextId) => {
    setHistory(h => [...h, currentNodeId]);
    setCurrentNodeId(nextId);
  };

  const goBack = () => {
    if (history.length === 0) {
      setSelectedTopic(null);
      setCurrentNodeId(null);
      setHistory([]);
    } else {
      const prev = history[history.length - 1];
      setHistory(h => h.slice(0, -1));
      setCurrentNodeId(prev);
    }
  };

  const restart = () => {
    setSelectedTopic(null);
    setCurrentNodeId(null);
    setHistory([]);
  };

  // Breadcrumb: [root, ...history, current]
  const breadcrumbDepth = history.length + 1;

  /* ── TOPIC SELECTION ── */
  if (!selectedTopic) {
    return (
      <div className={`rounded-2xl border p-5 space-y-4 ${
        theme === 'dark'
          ? 'bg-[#0d0e16]/80 border-white/[0.07]'
          : 'bg-white/80 border-slate-200/70'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-500/10 flex items-center justify-center">
            <HelpCircle className="w-4 h-4 text-brand-500" />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Interactive Decision Guide
            </h3>
            <p className={`text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
              Select a category to get guided help
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(DECISION_TREES).map(([key, tree]) => {
            const c = colorMap[tree.color];
            return (
              <button
                key={key}
                onClick={() => selectTopic(key)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer card-hover ${c.bg} ${c.border}`}
              >
                <span className="text-2xl mb-2 block">{tree.icon}</span>
                <span className={`block text-xs font-bold ${c.text}`}>{tree.title}</span>
                <span className={`block text-[10px] mt-0.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  Guided resolution
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── RESOLUTION SCREEN ── */
  if (currentNode?.resolution) {
    return (
      <div className={`rounded-2xl border overflow-hidden animate-fade-in-up ${
        theme === 'dark'
          ? 'bg-[#0d0e16]/80 border-white/[0.07]'
          : 'bg-white/80 border-slate-200/70'
      }`}>
        {/* Header */}
        <div className={`flex items-center gap-2.5 p-4 border-b ${
          theme === 'dark' ? 'border-white/[0.06] bg-emerald-500/5' : 'border-slate-100 bg-emerald-50/60'
        }`}>
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Resolution Found</span>
          <span className={`ml-auto text-[10px] font-mono ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`}>
            {breadcrumbDepth} step{breadcrumbDepth !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Answer */}
        <div className="p-5 space-y-4">
          <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
            {currentNode.answer}
          </p>

          {currentNode.tip && (
            <div className={`flex gap-2.5 p-3.5 rounded-xl ${
              theme === 'dark'
                ? 'bg-amber-500/8 border border-amber-500/15'
                : 'bg-amber-50 border border-amber-200/60'
            }`}>
              <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className={`text-[11px] font-medium leading-snug ${
                theme === 'dark' ? 'text-amber-300/90' : 'text-amber-700'
              }`}>{currentNode.tip}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={goBack}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/8'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Go Back
            </button>
            <button
              onClick={restart}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/8'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              New Query
            </button>
            <button
              onClick={() => { setSelectedThreadId(null); setActiveTab('feed'); }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 transition-colors cursor-pointer"
            >
              Search FAQ Feed
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── QUESTION SCREEN ── */
  return (
    <div className={`rounded-2xl border overflow-hidden animate-fade-in-up ${
      theme === 'dark'
        ? 'bg-[#0d0e16]/80 border-white/[0.07]'
        : 'bg-white/80 border-slate-200/70'
    }`}>
      {/* Header */}
      <div className={`flex items-center gap-2.5 p-4 border-b ${
        theme === 'dark'
          ? 'border-white/[0.06] bg-white/[0.01]'
          : 'border-slate-100 bg-slate-50/40'
      }`}>
        <button
          onClick={goBack}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-white/8' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-lg">{tree.icon}</span>
        <span className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
          {tree.title}
        </span>
        {/* Step dots */}
        <div className="ml-auto flex items-center gap-1">
          {Array.from({ length: breadcrumbDepth + 1 }).map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i < breadcrumbDepth
                  ? 'bg-brand-500'
                  : 'bg-slate-300 dark:bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question */}
      <div className="p-5 space-y-3">
        <p className={`text-sm font-semibold leading-relaxed ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
          {currentNode?.question}
        </p>

        <div className="space-y-2">
          {currentNode?.options?.map((opt, i) => (
            <button
              key={i}
              onClick={() => goToNode(opt.next)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-medium transition-all cursor-pointer group ${
                theme === 'dark'
                  ? 'bg-white/[0.03] hover:bg-brand-500/10 border border-white/[0.06] hover:border-brand-500/25 text-slate-300 hover:text-white'
                  : 'bg-slate-50 hover:bg-brand-50 border border-slate-200/70 hover:border-brand-300/50 text-slate-700 hover:text-brand-700'
              }`}
            >
              <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold shrink-0 transition-colors ${
                theme === 'dark'
                  ? 'border-white/15 text-slate-500 group-hover:border-brand-500/50 group-hover:text-brand-400'
                  : 'border-slate-300 text-slate-400 group-hover:border-brand-400 group-hover:text-brand-500'
              }`}>
                {String.fromCharCode(65 + i)}
              </span>
              {opt.label}
              <ChevronRight className={`w-3.5 h-3.5 ml-auto shrink-0 transition-transform group-hover:translate-x-0.5 ${
                theme === 'dark' ? 'text-slate-600 group-hover:text-brand-400' : 'text-slate-300 group-hover:text-brand-400'
              }`} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DecisionTree;
