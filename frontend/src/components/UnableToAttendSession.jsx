import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Clock3,
  ExternalLink,
  FileText,
  Laptop,
  Loader2,
  Link2,
  MessageSquare,
  Mic,
  Paperclip,
  Power,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Wifi,
  X,
  Plus,
  Trash2,
  Settings,
  ListTodo
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../utils/api';

const ISSUE_OPTIONS = [
  {
    key: 'internet',
    label: 'Internet Problem',
    icon: Wifi,
    accent: 'from-cyan-500 to-blue-500',
    note: 'Connection drops, bad bandwidth, or hotspot failure.'
  },
  {
    key: 'camera',
    label: 'Camera Issue',
    icon: Camera,
    accent: 'from-violet-500 to-fuchsia-500',
    note: 'Camera permission or device capture problems.'
  },
  {
    key: 'microphone',
    label: 'Microphone Issue',
    icon: Mic,
    accent: 'from-indigo-500 to-blue-500',
    note: 'Mic permission, hardware, or audio capture issues.'
  },
  {
    key: 'device',
    label: 'Device Failure',
    icon: Laptop,
    accent: 'from-slate-700 to-slate-900',
    note: 'Laptop crash, boot failure, or device damage.'
  },
  {
    key: 'power',
    label: 'Power Outage',
    icon: Power,
    accent: 'from-amber-500 to-orange-500',
    note: 'Local electricity failure or forced disconnect.'
  },
  {
    key: 'other',
    label: 'Other Reason',
    icon: CircleAlert,
    accent: 'from-emerald-500 to-teal-500',
    note: 'Anything else that prevented class attendance.'
  }
];

const STATUS_STYLES = {
  Pending: 'border-amber-500/20 bg-amber-500/10 text-amber-500',
  'In Review': 'border-cyan-500/20 bg-cyan-500/10 text-cyan-500',
  Resolved: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
  Rejected: 'border-rose-500/20 bg-rose-500/10 text-rose-500'
};

const initialDraft = (issueType) => ({
  issueType,
  title: `${ISSUE_OPTIONS.find(option => option.key === issueType)?.label || 'Support'} - Unable to Attend Session`,
  details: '',
  attemptedSteps: []
});

const SupportCard = ({ label, value, hint, icon: Icon, tone = 'from-slate-700 to-slate-900' }) => (
  <div className="rounded-2xl border border-slate-200/50 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/5 dark:bg-[#0b0c10]/45">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-455 dark:text-slate-500">{label}</p>
        <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">{value}</p>
      </div>
      <div className={`rounded-xl bg-gradient-to-br ${tone} p-3 text-white shadow-lg`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
    </div>
    {hint && <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-450 dark:text-slate-500">{hint}</p>}
  </div>
);

export const UnableToAttendSession = () => {
  const { user, showAlert } = useApp();
  const isAdmin = user?.role === 'admin';
  
  // Tab view state
  const [activeViewTab, setActiveViewTab] = useState(isAdmin ? 'queue' : 'report');

  // Student states
  const [issueType, setIssueType] = useState('internet');
  const [draft, setDraft] = useState(initialDraft('internet'));
  const [activeSteps, setActiveSteps] = useState([]);
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  // Common request states
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [supportFilters, setSupportFilters] = useState({ q: '', userName: '', email: '', issueType: 'all', from: '', to: '' });
  const [expandedRequestId, setExpandedRequestId] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  
  // Drafts for edits & replies
  const [statusDrafts, setStatusDrafts] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});

  // Admin Guidance Editing states
  const [adminGuidanceList, setAdminGuidanceList] = useState([]);
  const [adminSelectIssue, setAdminSelectIssue] = useState('internet');
  const [adminSteps, setAdminSteps] = useState([]);
  const [adminNewStep, setAdminNewStep] = useState('');
  const [savingGuidance, setSavingGuidance] = useState(false);
  const [loadingGuidance, setLoadingGuidance] = useState(false);

  // Fetch dynamic troubleshoot steps for selected issue
  useEffect(() => {
    const fetchGuidanceSteps = async () => {
      if (!user || isAdmin) return;
      setGuidanceLoading(true);
      try {
        const res = await api.get(`/session-support/troubleshoot/${issueType}`);
        setActiveSteps(res.data.steps || []);
      } catch (err) {
        console.error('Failed to load troubleshooting guidance:', err);
      } finally {
        setGuidanceLoading(false);
      }
    };
    fetchGuidanceSteps();
  }, [issueType, user, isAdmin]);

  // Reset acknowledgment when issue type changes
  useEffect(() => {
    setDraft(initialDraft(issueType));
    setAcknowledged(false);
  }, [issueType]);

  const loadRequests = async (page = 1) => {
    if (!user) return;
    setLoading(true);
    try {
      const params = { page };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (isAdmin) {
        if (supportFilters.q) params.q = supportFilters.q;
        if (supportFilters.userName) params.userName = supportFilters.userName;
        if (supportFilters.email) params.email = supportFilters.email;
        if (supportFilters.issueType !== 'all') params.issueType = supportFilters.issueType;
        if (supportFilters.from) params.from = supportFilters.from;
        if (supportFilters.to) params.to = supportFilters.to;
      }
      const [requestRes, statsRes] = await Promise.all([
        api.get('/session-support', { params }),
        isAdmin ? api.get('/session-support/stats/summary') : Promise.resolve(null)
      ]);

      setRequests(requestRes.data.requests || []);
      setSummary(requestRes.data.summary || null);
      if (requestRes.data.pagination) {
        setPagination(requestRes.data.pagination);
      }

      if (isAdmin && statsRes?.data) {
        setAnalytics(statsRes.data);
      } else {
        setAnalytics(null);
      }

      const nextDrafts = {};
      (requestRes.data.requests || []).forEach((request) => {
        nextDrafts[request._id] = {
          status: request.status || 'Pending',
          title: request.title || '',
          details: request.details || '',
          issueType: request.issueType || 'other',
          adminNote: request.adminNote || '',
          resolutionSummary: request.resolutionSummary || '',
          sessionAccessUrl: request.sessionAccessUrl || '',
          internalNote: '',
          followUpMessage: '',
          requestProof: false
        };
      });
      setStatusDrafts(nextDrafts);
      setReplyDrafts((requestRes.data.requests || []).reduce((acc, request) => ({
        ...acc,
        [request._id]: { message: '', documentName: '', documentUrl: '', documentType: '' }
      }), {}));
    } catch (error) {
      console.error('Unable to load session support requests:', error.message);
      showAlert('Unable to load attendance support requests.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [user?.id, user?.role, statusFilter, supportFilters]);

  // Admin Guidance Loader
  const fetchAllGuidance = async () => {
    setLoadingGuidance(true);
    try {
      const res = await api.get('/session-support/guidance');
      setAdminGuidanceList(res.data || []);
      const current = res.data.find(item => item.issueType === adminSelectIssue);
      setAdminSteps(current ? current.steps : []);
    } catch (err) {
      console.error('Failed to load guidance settings:', err);
    } finally {
      setLoadingGuidance(false);
    }
  };

  useEffect(() => {
    if (isAdmin && activeViewTab === 'guidance') {
      fetchAllGuidance();
    }
  }, [isAdmin, activeViewTab]);

  useEffect(() => {
    const current = adminGuidanceList.find(item => item.issueType === adminSelectIssue);
    setAdminSteps(current ? current.steps : []);
  }, [adminSelectIssue, adminGuidanceList]);

  const handleSaveGuidance = async () => {
    setSavingGuidance(true);
    try {
      await api.put(`/session-support/guidance/${adminSelectIssue}`, { steps: adminSteps });
      showAlert('Checklist options updated successfully.', 'success');
      await fetchAllGuidance();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Failed to save checklists.', 'error');
    } finally {
      setSavingGuidance(false);
    }
  };

  const handleAddAdminStep = () => {
    if (!adminNewStep.trim()) return;
    setAdminSteps(prev => [...prev, adminNewStep.trim()]);
    setAdminNewStep('');
  };

  const handleRemoveAdminStep = (index) => {
    setAdminSteps(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleEditAdminStep = (index, value) => {
    setAdminSteps(prev => prev.map((s, idx) => idx === index ? value : s));
  };

  const toggleStep = (step) => {
    setDraft((current) => {
      const nextSteps = current.attemptedSteps.includes(step)
        ? current.attemptedSteps.filter(item => item !== step)
        : [...current.attemptedSteps, step];
      return { ...current, attemptedSteps: nextSteps };
    });
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    if (!draft.details.trim()) {
      showAlert('Please describe the issue before submitting.', 'error');
      return;
    }
    if (!acknowledged) {
      showAlert('Please confirm that you tried the troubleshooting steps first.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/session-support', {
        issueType: draft.issueType,
        title: draft.title,
        details: draft.details,
        attemptedSteps: draft.attemptedSteps
      });
      showAlert('Support request submitted successfully.', 'success');
      setDraft(initialDraft(issueType));
      setAcknowledged(false);
      setActiveViewTab('tickets'); // Switch to historical tickets tab
      await loadRequests();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Could not submit support request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (requestId) => {
    const draftValue = statusDrafts[requestId] || {};
    setUpdatingId(requestId);
    try {
      await api.patch(`/session-support/${requestId}/status`, {
        status: draftValue.status,
        title: draftValue.title,
        details: draftValue.details,
        issueType: draftValue.issueType,
        adminNote: draftValue.adminNote,
        resolutionSummary: draftValue.resolutionSummary,
        sessionAccessUrl: draftValue.sessionAccessUrl,
        internalNote: draftValue.internalNote,
        followUpMessage: draftValue.followUpMessage,
        requestProof: draftValue.requestProof
      });
      showAlert('Support request updated.', 'success');
      await loadRequests();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Could not update support request.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const saveRequestDetails = async (requestId) => {
    const draftValue = statusDrafts[requestId] || {};
    setUpdatingId(requestId);
    try {
      await api.put(`/session-support/${requestId}`, {
        title: draftValue.title,
        details: draftValue.details,
        issueType: draftValue.issueType,
        adminNote: draftValue.adminNote,
        resolutionSummary: draftValue.resolutionSummary,
        sessionAccessUrl: draftValue.sessionAccessUrl,
        internalNote: draftValue.internalNote
      });
      showAlert('Request details saved.', 'success');
      await loadRequests();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Could not save request details.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const sendFollowUp = async (requestId, isAdminMessage = isAdmin) => {
    const adminDraft = statusDrafts[requestId] || {};
    const userDraft = replyDrafts[requestId] || {};
    const message = isAdminMessage ? adminDraft.followUpMessage : userDraft.message;
    if (!message?.trim()) {
      showAlert('Please write a message before sending.', 'error');
      return;
    }

    const documents = !isAdminMessage && (userDraft.documentName || userDraft.documentUrl)
      ? [{
        name: userDraft.documentName,
        url: userDraft.documentUrl,
        type: userDraft.documentType
      }]
      : [];

    setUpdatingId(requestId);
    try {
      await api.post(`/session-support/${requestId}/follow-up`, {
        message,
        requestProof: Boolean(adminDraft.requestProof),
        documents
      });
      showAlert(isAdminMessage ? 'Follow-up sent to user.' : 'Reply sent to admin team.', 'success');
      await loadRequests();
    } catch (error) {
      showAlert(error.response?.data?.message || 'Could not send follow-up.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const resolvedRequests = summary?.byStatus?.Resolved || requests.filter(request => request.status === 'Resolved').length;
  const pendingRequests = summary?.byStatus?.Pending || requests.filter(request => request.status === 'Pending').length;
  const inReviewRequests = summary?.byStatus?.['In Review'] || requests.filter(request => request.status === 'In Review').length;

  const analyticsRows = (analytics?.recentByIssueType || Object.entries(summary?.byIssueType || {})
    .map(([issueTypeKey, count]) => ({
      issueType: issueTypeKey,
      label: ISSUE_OPTIONS.find(option => option.key === issueTypeKey)?.label || issueTypeKey,
      count
    }))
    .sort((a, b) => b.count - a.count));

  const visibleRequests = useMemo(() => {
    if (statusFilter === 'all') return requests;
    return requests.filter(request => request.status === statusFilter);
  }, [requests, statusFilter]);

  const exportToCSV = () => {
    if (!visibleRequests.length) {
      showAlert('No records to export', 'error');
      return;
    }
    const headers = ['ID', 'Student Name', 'Student Email', 'Issue Category', 'Title', 'Details', 'Status', 'Created At'];
    const rows = visibleRequests.map(req => [
      req._id,
      req.studentName,
      req.studentEmail,
      req.issueLabel || req.issueType,
      (req.title || '').replace(/"/g, '""'),
      (req.details || '').replace(/"/g, '""'),
      req.status,
      new Date(req.createdAt).toLocaleString()
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_requests_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    if (!visibleRequests.length) {
      showAlert('No records to export', 'error');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showAlert('Please allow popups to export PDF', 'error');
      return;
    }
    const htmlContent = `
      <html>
        <head>
          <title>Attendance Support Requests Report</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              color: #1e293b;
              padding: 24px;
            }
            h1 {
              font-size: 20px;
              font-weight: 800;
              margin-bottom: 8px;
              color: #0f172a;
            }
            p.meta {
              font-size: 12px;
              color: #64748b;
              margin-bottom: 24px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 16px;
            }
            th, td {
              text-align: left;
              padding: 10px 12px;
              font-size: 11px;
              border-bottom: 1px solid #e2e8f0;
            }
            th {
              background-color: #f8fafc;
              font-weight: 700;
              color: #475569;
              text-transform: uppercase;
              font-size: 10px;
            }
            tr:nth-child(even) td {
              background-color: #fafafa;
            }
            .badge {
              display: inline-block;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 9px;
              font-weight: 700;
              text-transform: uppercase;
            }
            .Pending { background-color: #fef3c7; color: #d97706; }
            .In-Review { background-color: #ecfeff; color: #0891b2; }
            .Resolved { background-color: #d1fae5; color: #059669; }
            .Rejected { background-color: #fee2e2; color: #dc2626; }
          </style>
        </head>
        <body>
          <h1>Attendance Support Requests Report</h1>
          <p class="meta">Generated on ${new Date().toLocaleString()} | Total Cases: ${visibleRequests.length}</p>
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Email</th>
                <th>Issue Category</th>
                <th>Title</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${visibleRequests.map(req => `
                <tr>
                  <td><strong>${req.studentName}</strong></td>
                  <td>${req.studentEmail}</td>
                  <td>${req.issueLabel || req.issueType}</td>
                  <td>${req.title}</td>
                  <td><span class="badge ${req.status.replace(' ', '-')}">${req.status}</span></td>
                  <td>${new Date(req.createdAt).toLocaleDateString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (!user) return null;

  return (
    <section className="soft-panel space-y-6 border border-slate-200/50 bg-white/75 p-6 shadow-xl backdrop-blur-3xl dark:border-white/5 dark:bg-[#0b0c10]/45 rounded-3xl">
      
      {/* 1. Header widget bar */}
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 dark:border-white/5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-500">
            <ShieldCheck className="h-4 w-4" />
            Unable to Attend Session
          </div>
          <h3 className="mt-4 text-xl font-black text-slate-900 dark:text-white">Attendance support and recorded session requests</h3>
          <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-455 dark:text-slate-400">
            Use this flow when internet, device, power, microphone, or camera issues keep you out of class. Start with troubleshooting, then submit a request if you still need help.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
          <SupportCard label="Pending" value={pendingRequests} icon={Clock3} tone="from-amber-500 to-orange-500" />
          <SupportCard label="Resolved" value={resolvedRequests} icon={CheckCircle2} tone="from-emerald-500 to-teal-500" />
        </div>
      </div>

      {/* 2. Workspace Navigation Tabs Selector */}
      <div className="flex border-b border-slate-100 dark:border-white/5 pb-0.5 gap-2 overflow-x-auto">
        {!isAdmin ? (
          <>
            <button
              onClick={() => setActiveViewTab('report')}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                activeViewTab === 'report'
                  ? 'border-[#E07A15] text-[#E07A15]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-4 h-4" />
              Report New Issue
            </button>
            <button
              onClick={() => setActiveViewTab('tickets')}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                activeViewTab === 'tickets'
                  ? 'border-[#E07A15] text-[#E07A15]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              My Tickets ({requests.length})
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveViewTab('queue')}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                activeViewTab === 'queue'
                  ? 'border-[#E07A15] text-[#E07A15]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListTodo className="w-4 h-4" />
              Ticket Inbox ({requests.length})
            </button>
            <button
              onClick={() => setActiveViewTab('analytics')}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                activeViewTab === 'analytics'
                  ? 'border-[#E07A15] text-[#E07A15]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Support Analytics
            </button>
            <button
              onClick={() => setActiveViewTab('guidance')}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                activeViewTab === 'guidance'
                  ? 'border-[#E07A15] text-[#E07A15]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings className="w-4 h-4" />
              Manage Checklists
            </button>
          </>
        )}
      </div>

      {/* 3. Tab Contents Layout switcher */}
      <div className="space-y-6">
        
        {/* TAB: Report New Issue (Student Wizard) */}
        {!isAdmin && activeViewTab === 'report' && (
          <div className="space-y-6 animate-fade-in-up">
            
            {/* Step A: Issue Type Selector */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-450 flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 text-[10px]">1</span>
                Select what went wrong:
              </h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {ISSUE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = issueType === option.key;
                  return (
                    <button
                      key={option.key}
                      onClick={() => setIssueType(option.key)}
                      className={`relative rounded-2xl border p-4 text-left transition cursor-pointer card-hover ${
                        active
                          ? 'border-[#E07A15] bg-[#FFAE59]/10 shadow-lg ring-2 ring-[#FFAE59]/30'
                          : 'border-slate-200/60 bg-white/60 hover:border-slate-350 dark:border-white/5 dark:bg-white/[0.03]'
                      }`}
                    >
                      {active && (
                        <div className="absolute top-3 right-3 flex h-4 w-4 items-center justify-center rounded-full bg-[#E07A15] text-white">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                        </div>
                      )}
                      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${option.accent} text-white shadow-lg`}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <p className={`mt-3 text-xs font-black uppercase tracking-wider transition-colors ${active ? 'text-[#E07A15] dark:text-[#FFAE59]' : 'text-slate-900 dark:text-white'}`}>{option.label}</p>
                      <p className={`mt-1 text-[11px] font-semibold leading-relaxed transition-colors ${active ? 'text-slate-700 dark:text-slate-200' : 'text-slate-450 dark:text-slate-500'}`}>{option.note}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step B: Troubleshooting Steps and Confirmation Checklist */}
            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] items-start">
              
              <div className="rounded-2xl border border-slate-200/50 bg-white/70 p-5 shadow-sm dark:border-white/5 dark:bg-[#0b0c10]/40 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">Troubleshooting Steps</h4>
                </div>

                {guidanceLoading ? (
                  <div className="flex items-center gap-2 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                    Fetching guidance steps...
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-455">Admins have configured the following steps to recover from this issue. Please check all that apply:</p>
                    <div className="space-y-2">
                      {activeSteps.map((step) => (
                        <label
                          key={step}
                          className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200/50 bg-slate-50/70 p-3 text-left dark:border-white/5 dark:bg-white/[0.03] transition hover:bg-slate-100 dark:hover:bg-white/5"
                        >
                          <input
                            type="checkbox"
                            checked={draft.attemptedSteps.includes(step)}
                            onChange={() => toggleStep(step)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-350 text-indigo-650 focus:ring-indigo-650"
                          />
                          <span className="text-xs leading-relaxed text-slate-650 dark:text-slate-300">{step}</span>
                        </label>
                      ))}
                      {activeSteps.length === 0 && (
                        <p className="text-xs text-slate-455 italic">No troubleshooting steps are currently configured for this category.</p>
                      )}
                    </div>
                    
                    <label className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-left dark:border-emerald-500/10 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acknowledged}
                        onChange={(event) => setAcknowledged(event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-600"
                      />
                      <span className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-300 font-extrabold">
                        I attempted troubleshooting steps but still cannot attend the session.
                      </span>
                    </label>
                  </>
                )}
              </div>

              {/* Step C: Submit Request Form (Disclosed progressively only when steps are confirmed) */}
              {acknowledged ? (
                <form onSubmit={submitRequest} className="rounded-2xl border border-slate-200/50 bg-white/70 p-5 shadow-sm dark:border-white/5 dark:bg-[#0b0c10]/40 space-y-4 animate-fade-in-up">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-500" />
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">Submit Support Request</h4>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-slate-450">Request Title</label>
                      <input
                        value={draft.title}
                        onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                        className="w-full rounded-xl border border-slate-200/50 bg-slate-50/80 px-3.5 py-3 text-xs font-bold outline-none dark:border-white/5 dark:bg-[#07080b]/70 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-slate-450">Details / Explanation</label>
                      <textarea
                        rows={4}
                        value={draft.details}
                        onChange={(event) => setDraft((current) => ({ ...current, details: event.target.value }))}
                        placeholder="Tell us what prevented you from joining class, when it started, and what you already tried."
                        className="w-full resize-none rounded-xl border border-slate-200/50 bg-slate-50/80 px-3.5 py-3 text-xs outline-none dark:border-white/5 dark:bg-[#07080b]/70 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-white/5 flex-wrap">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-450 dark:text-slate-500 max-w-[240px]">
                      Ticket details will be processed immediately.
                    </span>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-650 hover:bg-indigo-700 px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg disabled:opacity-50 cursor-pointer transition"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Submit Request
                    </button>
                  </div>
                </form>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200/60 p-8 text-center text-xs font-semibold text-slate-450 dark:border-white/10 dark:bg-white/[0.01]">
                  Please complete the troubleshooting checklist on the left and check "I attempted troubleshooting..." to unlock the support request form.
                </div>
              )}

            </div>
          </div>
        )}

        {/* TAB: My Tickets (Student List View) */}
        {!isAdmin && activeViewTab === 'tickets' && (
          <div className="space-y-4 animate-fade-in-up max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-805 dark:text-slate-100">My Attendance Requests</h4>
              <button
                type="button"
                onClick={loadRequests}
                className="rounded-xl border border-slate-200/50 bg-white/70 p-2 text-slate-500 hover:text-slate-800 dark:border-white/5 dark:bg-white/[0.03] dark:hover:text-white cursor-pointer"
                title="Refresh requests"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                Loading your requests...
              </div>
            ) : requests.length === 0 ? (
              <div className="py-12 text-center text-xs font-semibold text-slate-450 dark:text-slate-500 bg-white/50 border border-slate-200/40 rounded-2xl dark:border-white/5">
                You have not submitted any support tickets yet. Click "Report New Issue" to start.
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => {
                  const Icon = ISSUE_OPTIONS.find(option => option.key === request.issueType)?.icon || CircleAlert;
                  const replyValue = replyDrafts[request._id] || { message: '', documentName: '', documentUrl: '', documentType: '' };
                  const isExpanded = expandedRequestId === request._id;

                  return (
                    <article key={request._id} className="rounded-2xl border border-slate-200/50 bg-white/70 p-4 dark:border-white/5 dark:bg-white/[0.02] shadow-sm">
                      <button
                        type="button"
                        onClick={() => setExpandedRequestId(current => current === request._id ? null : request._id)}
                        className="flex w-full items-start justify-between gap-3 text-left cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-lg border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${STATUS_STYLES[request.status] || STATUS_STYLES.Pending}`}>
                              {request.status}
                            </span>
                            <span className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-indigo-500">
                              {request.issueLabel}
                            </span>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                              <Icon className="h-4.5 w-4.5" />
                            </span>
                            <div className="min-w-0">
                              <h5 className="truncate text-sm font-black text-slate-900 dark:text-white">{request.title}</h5>
                              <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                                Submitted on {new Date(request.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 mt-2">
                          {isExpanded ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="mt-4 space-y-4 border-t border-slate-200/60 pt-4 dark:border-white/5">
                          <p className="whitespace-pre-line text-xs leading-relaxed text-slate-650 dark:text-slate-350">{request.details}</p>

                          {request.attemptedSteps?.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-450">Attempted Troubleshooting Steps</p>
                              <div className="flex flex-wrap gap-2">
                                {request.attemptedSteps.map(step => (
                                  <span key={step} className="rounded-lg border border-slate-200/50 bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-slate-505 dark:border-white/5 dark:bg-[#07080b]/60">
                                    {step}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {request.adminNote && (
                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                              <p className="mb-1 text-[9px] font-black uppercase tracking-wider">Admin note</p>
                              <p className="whitespace-pre-line leading-relaxed">{request.adminNote}</p>
                            </div>
                          )}

                          {request.resolutionSummary && (
                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-350">
                              <p className="mb-1 text-[9px] font-black uppercase tracking-wider">Resolution</p>
                              <p className="whitespace-pre-line leading-relaxed">{request.resolutionSummary}</p>
                            </div>
                          )}

                          {request.sessionAccessUrl && request.status === 'Resolved' && (
                            <a
                              href={request.sessionAccessUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-indigo-500 hover:bg-indigo-500 hover:text-white transition"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Recorded Session
                            </a>
                          )}

                          {/* Conversation feeds */}
                          {(request.followUps?.length > 0 || request.statusHistory?.length > 0) && (
                            <div className="grid gap-3 lg:grid-cols-2">
                              <div className="rounded-2xl border border-slate-200/50 bg-white/70 p-4 dark:border-white/5 dark:bg-[#07080b]/60">
                                <div className="mb-3 flex items-center gap-2">
                                  <MessageSquare className="h-4 w-4 text-indigo-500" />
                                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-450">Conversation</p>
                                </div>
                                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                  {request.followUps.map((item, index) => (
                                    <div key={`${item.createdAt}-${index}`} className={`rounded-xl border p-3 text-xs ${
                                      item.senderRole === 'admin'
                                        ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200'
                                        : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
                                    }`}>
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="text-[9px] font-black uppercase tracking-wider">{item.senderName || item.senderRole}</p>
                                        <span className="text-[9px] opacity-70">{new Date(item.createdAt).toLocaleString()}</span>
                                      </div>
                                      <p className="mt-2 whitespace-pre-line leading-relaxed">{item.message}</p>
                                      {item.requestProof && <p className="mt-2 text-[9px] font-black uppercase tracking-wider text-rose-500 dark:text-rose-455 animate-pulse">Additional proof requested</p>}
                                      {item.documents?.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          {item.documents.map((doc, docIndex) => (
                                            <a
                                              key={`${doc.url}-${docIndex}`}
                                              href={doc.url || '#'}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center gap-1 rounded-lg border border-current/25 px-2 py-1 text-[10px] font-black uppercase tracking-wider"
                                            >
                                              <Paperclip className="h-3 w-3" />
                                              {doc.name || 'Document'}
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="rounded-2xl border border-slate-200/50 bg-white/70 p-4 dark:border-white/5 dark:bg-[#07080b]/60">
                                <div className="mb-3 flex items-center gap-2">
                                  <Clock3 className="h-4 w-4 text-amber-500" />
                                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-450">Progress History</p>
                                </div>
                                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                  {request.statusHistory.map((item, index) => (
                                    <div key={`${item.timestamp}-${index}`} className="rounded-xl border border-slate-200/50 bg-slate-50/70 p-3 text-xs dark:border-white/5 dark:bg-white/[0.03]">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className={`rounded-lg border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${STATUS_STYLES[item.status] || STATUS_STYLES.Pending}`}>
                                          {item.status}
                                        </span>
                                        <span className="text-[9px] text-slate-400">{new Date(item.timestamp).toLocaleString()}</span>
                                      </div>
                                      {item.note && <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-600 dark:text-slate-350">{item.note}</p>}
                                      {item.updatedByName && <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-slate-405">{item.updatedByName}</p>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Reply to admin */}
                          {request.status !== 'Resolved' && request.status !== 'Rejected' && (
                            <div className="space-y-3 rounded-2xl border border-slate-200/50 bg-white/80 p-4 dark:border-white/5 dark:bg-[#07080b]/60">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-450">Reply to admin team</p>
                              <textarea
                                value={replyValue.message}
                                onChange={(event) => setReplyDrafts((current) => ({
                                  ...current,
                                  [request._id]: { ...replyValue, message: event.target.value }
                                }))}
                                rows={2}
                                placeholder="Add clarification, answer an admin question, or explain uploaded proof."
                                className="w-full resize-none rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-white/5 dark:bg-[#0a0b0f] focus:ring-1 focus:ring-indigo-500"
                              />
                              <div className="grid gap-2 md:grid-cols-3">
                                <input
                                  value={replyValue.documentName}
                                  onChange={(event) => setReplyDrafts((current) => ({
                                    ...current,
                                    [request._id]: { ...replyValue, documentName: event.target.value }
                                  }))}
                                  placeholder="Document name (e.g. medical certificate)"
                                  className="rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-white/5 dark:bg-[#0a0b0f]"
                                />
                                <input
                                  value={replyValue.documentUrl}
                                  onChange={(event) => setReplyDrafts((current) => ({
                                    ...current,
                                    [request._id]: { ...replyValue, documentUrl: event.target.value }
                                  }))}
                                  placeholder="Document URL (e.g. drive link)"
                                  className="rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-white/5 dark:bg-[#0a0b0f]"
                                />
                                <input
                                  value={replyValue.documentType}
                                  onChange={(event) => setReplyDrafts((current) => ({
                                    ...current,
                                    [request._id]: { ...replyValue, documentType: event.target.value }
                                  }))}
                                  placeholder="Type (e.g. pdf, png)"
                                  className="rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-white/5 dark:bg-[#0a0b0f]"
                                />
                              </div>
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => sendFollowUp(request._id, false)}
                                  disabled={updatingId === request._id}
                                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-650 hover:bg-indigo-700 px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-white shadow disabled:opacity-50 cursor-pointer transition"
                                >
                                  {updatingId === request._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                  Send Reply
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: Ticket Inbox (Admin Queue) */}
        {isAdmin && activeViewTab === 'queue' && (
          <div className="space-y-4 animate-fade-in-up">
            
            {/* Filter Panel */}
            <div className="rounded-2xl border border-slate-200/50 bg-white/70 p-4 shadow-sm dark:border-white/5 dark:bg-[#0b0c10]/40 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#E07A15]" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-105">Filter Inbox Cases</h4>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 outline-none dark:border-white/5 dark:bg-[#07080b]/70 dark:text-slate-300"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="In Review">In Review</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => loadRequests(1)}
                    className="rounded-xl border border-slate-200/50 bg-white/70 p-2.5 text-slate-500 hover:text-slate-800 dark:border-white/5 dark:bg-white/[0.03] dark:hover:text-white cursor-pointer"
                    title="Refresh requests"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={exportToCSV}
                    className="px-3 py-2.5 rounded-xl border border-slate-200/50 bg-white/70 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:text-slate-800 dark:border-white/5 dark:bg-white/[0.03] dark:text-slate-300 cursor-pointer transition hover:bg-slate-50 dark:hover:bg-white/10"
                    title="Export filtered requests as CSV"
                  >
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={exportToPDF}
                    className="px-3 py-2.5 rounded-xl border border-slate-200/50 bg-white/70 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:text-slate-800 dark:border-white/5 dark:bg-white/[0.03] dark:text-slate-300 cursor-pointer transition hover:bg-slate-50 dark:hover:bg-white/10"
                    title="Export filtered requests as PDF"
                  >
                    Export PDF
                  </button>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
                <input
                  value={supportFilters.q}
                  onChange={(event) => setSupportFilters(current => ({ ...current, q: event.target.value }))}
                  placeholder="Keyword search..."
                  className="rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-white/5 dark:bg-[#07080b]/70 focus:ring-1 focus:ring-indigo-500"
                />
                <input
                  value={supportFilters.userName}
                  onChange={(event) => setSupportFilters(current => ({ ...current, userName: event.target.value }))}
                  placeholder="Student name..."
                  className="rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-white/5 dark:bg-[#07080b]/70 focus:ring-1 focus:ring-indigo-500"
                />
                <input
                  value={supportFilters.email}
                  onChange={(event) => setSupportFilters(current => ({ ...current, email: event.target.value }))}
                  placeholder="Email address..."
                  className="rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-white/5 dark:bg-[#07080b]/70 focus:ring-1 focus:ring-indigo-500"
                />
                <select
                  value={supportFilters.issueType}
                  onChange={(event) => setSupportFilters(current => ({ ...current, issueType: event.target.value }))}
                  className="rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider outline-none dark:border-white/5 dark:bg-[#07080b]/70"
                >
                  <option value="all">All Issues</option>
                  {ISSUE_OPTIONS.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
                </select>
                <input
                  type="date"
                  value={supportFilters.from}
                  onChange={(event) => setSupportFilters(current => ({ ...current, from: event.target.value }))}
                  onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                  onFocus={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                  className="rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-white/5 dark:bg-[#07080b]/70 cursor-pointer"
                />
                <input
                  type="date"
                  value={supportFilters.to}
                  onChange={(event) => setSupportFilters(current => ({ ...current, to: event.target.value }))}
                  onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                  onFocus={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                  className="rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-white/5 dark:bg-[#07080b]/70 cursor-pointer"
                />
              </div>
            </div>

            {/* Admin list queue */}
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                Loading inbox...
              </div>
            ) : visibleRequests.length === 0 ? (
              <div className="py-12 text-center text-xs font-semibold text-slate-450 dark:text-slate-500 bg-white/50 border border-slate-200/40 rounded-2xl">
                No tickets found matching current parameters.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleRequests.map((request) => {
                  const Icon = ISSUE_OPTIONS.find(option => option.key === request.issueType)?.icon || CircleAlert;
                  const draftValue = statusDrafts[request._id] || {};
                  const isExpanded = expandedRequestId === request._id;

                  return (
                    <article key={request._id} className="rounded-2xl border border-slate-200/50 bg-white/70 p-4 dark:border-white/5 dark:bg-white/[0.02] shadow-sm">
                      <button
                        type="button"
                        onClick={() => setExpandedRequestId(current => current === request._id ? null : request._id)}
                        className="flex w-full items-start justify-between gap-3 text-left cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-lg border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${STATUS_STYLES[request.status] || STATUS_STYLES.Pending}`}>
                              {request.status}
                            </span>
                            <span className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-indigo-500">
                              {request.issueLabel}
                            </span>
                          </div>
                          <div className="mt-3 flex items-center gap-2.5">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                              <Icon className="h-4.5 w-4.5" />
                            </span>
                            <div className="min-w-0">
                              <h5 className="truncate text-sm font-black text-slate-900 dark:text-white">{request.title}</h5>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                {request.studentName} ({request.studentEmail}) • {new Date(request.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 mt-2">
                          {isExpanded ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="mt-4 space-y-4 border-t border-slate-200/60 pt-4 dark:border-white/5">
                          <p className="whitespace-pre-line text-xs leading-relaxed text-slate-655 dark:text-slate-350">{request.details}</p>

                          {request.attemptedSteps?.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-450">Attempted Troubleshooting Checklist</p>
                              <div className="flex flex-wrap gap-2">
                                {request.attemptedSteps.map(step => (
                                  <span key={step} className="rounded-lg border border-slate-200/50 bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-slate-505 dark:border-white/5 dark:bg-[#07080b]/60">
                                    {step}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Conversation feeds */}
                          {(request.followUps?.length > 0 || request.statusHistory?.length > 0) && (
                            <div className="grid gap-3 lg:grid-cols-2">
                              <div className="rounded-2xl border border-slate-200/50 bg-white/70 p-4 dark:border-white/5 dark:bg-[#07080b]/60">
                                <div className="mb-3 flex items-center gap-2">
                                  <MessageSquare className="h-4 w-4 text-indigo-500" />
                                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-455">Conversation History</p>
                                </div>
                                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                  {request.followUps.map((item, index) => (
                                    <div key={`${item.createdAt}-${index}`} className={`rounded-xl border p-3 text-xs ${
                                      item.senderRole === 'admin'
                                        ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200'
                                        : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
                                    }`}>
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="text-[9px] font-black uppercase tracking-wider">{item.senderName || item.senderRole}</p>
                                        <span className="text-[9px] opacity-70">{new Date(item.createdAt).toLocaleString()}</span>
                                      </div>
                                      <p className="mt-2 whitespace-pre-line leading-relaxed">{item.message}</p>
                                      {item.requestProof && <p className="mt-2 text-[9px] font-black uppercase tracking-wider text-rose-500">Additional proof requested</p>}
                                      {item.documents?.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          {item.documents.map((doc, docIndex) => (
                                            <a
                                              key={`${doc.url}-${docIndex}`}
                                              href={doc.url || '#'}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center gap-1 rounded-lg border border-current/25 px-2 py-1 text-[10px] font-black uppercase tracking-wider"
                                            >
                                              <Paperclip className="h-3 w-3" />
                                              {doc.name || 'Document'}
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="rounded-2xl border border-slate-200/50 bg-white/70 p-4 dark:border-white/5 dark:bg-[#07080b]/60">
                                <div className="mb-3 flex items-center gap-2">
                                  <Clock3 className="h-4 w-4 text-amber-500" />
                                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-455">Progress Audits</p>
                                </div>
                                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                  {request.statusHistory.map((item, index) => (
                                    <div key={`${item.timestamp}-${index}`} className="rounded-xl border border-slate-200/50 bg-slate-50/70 p-3 text-xs dark:border-white/5 dark:bg-white/[0.03]">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className={`rounded-lg border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${STATUS_STYLES[item.status] || STATUS_STYLES.Pending}`}>
                                          {item.status}
                                        </span>
                                        <span className="text-[9px] text-slate-400">{new Date(item.timestamp).toLocaleString()}</span>
                                      </div>
                                      {item.note && <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-600 dark:text-slate-350">{item.note}</p>}
                                      {item.updatedByName && <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-slate-405">{item.updatedByName}</p>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {request.internalNotes?.length > 0 && (
                            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                              <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-300">Internal Notes (Admins Only)</p>
                              <div className="space-y-2">
                                {request.internalNotes.map((note, index) => (
                                  <div key={`${note.createdAt}-${index}`} className="rounded-xl border border-amber-500/20 bg-white/50 p-3 text-xs text-amber-805 dark:bg-[#07080b]/40 dark:text-amber-200">
                                    <p className="whitespace-pre-line leading-relaxed">{note.note}</p>
                                    <p className="mt-2 text-[9px] font-black uppercase tracking-wider opacity-75">{note.addedByName} - {new Date(note.createdAt).toLocaleString()}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Admin management forms */}
                          <div className="space-y-4 rounded-2xl border border-slate-200/50 bg-white/80 p-4 dark:border-white/5 dark:bg-[#07080b]/60">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-455">Admin request workspace</p>
                            <div className="grid gap-3 md:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-400">Title</label>
                                <input
                                  value={draftValue.title}
                                  onChange={(event) => setStatusDrafts((current) => ({
                                    ...current,
                                    [request._id]: { ...draftValue, title: event.target.value }
                                  }))}
                                  placeholder="Request title"
                                  className="w-full rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-2 text-xs font-bold outline-none dark:border-white/5 dark:bg-[#0a0b0f]"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-400">Issue Category</label>
                                <select
                                  value={draftValue.issueType}
                                  onChange={(event) => setStatusDrafts((current) => ({
                                    ...current,
                                    [request._id]: { ...draftValue, issueType: event.target.value }
                                  }))}
                                  className="w-full rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-2 text-xs font-bold outline-none dark:border-white/5 dark:bg-[#0a0b0f]"
                                >
                                  {ISSUE_OPTIONS.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-400">Audit Status</label>
                                <select
                                  value={draftValue.status}
                                  onChange={(event) => setStatusDrafts((current) => ({
                                    ...current,
                                    [request._id]: { ...draftValue, status: event.target.value }
                                  }))}
                                  className="w-full rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-2 text-xs font-bold outline-none dark:border-white/5 dark:bg-[#0a0b0f]"
                                >
                                  <option>Pending</option>
                                  <option>In Review</option>
                                  <option>Resolved</option>
                                  <option>Rejected</option>
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-400">Access Link URL</label>
                                <input
                                  value={draftValue.sessionAccessUrl}
                                  onChange={(event) => setStatusDrafts((current) => ({
                                    ...current,
                                    [request._id]: { ...draftValue, sessionAccessUrl: event.target.value }
                                  }))}
                                  placeholder="Recorded session URL"
                                  className="w-full rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-white/5 dark:bg-[#0a0b0f]"
                                />
                              </div>
                            </div>
                            
                            <div className="grid gap-3 md:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-400">Request Explanation (Editable)</label>
                                <textarea
                                  value={draftValue.details}
                                  onChange={(event) => setStatusDrafts((current) => ({
                                    ...current,
                                    [request._id]: { ...draftValue, details: event.target.value }
                                  }))}
                                  rows={2}
                                  className="w-full resize-none rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-white/5 dark:bg-[#0a0b0f]"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-400">Admin Response Note (Student Dashboard)</label>
                                <textarea
                                  value={draftValue.adminNote}
                                  onChange={(event) => setStatusDrafts((current) => ({
                                    ...current,
                                    [request._id]: { ...draftValue, adminNote: event.target.value }
                                  }))}
                                  rows={2}
                                  placeholder="Visible note on student tickets card"
                                  className="w-full resize-none rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-white/5 dark:bg-[#0a0b0f]"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-400">Resolution summary</label>
                                <textarea
                                  value={draftValue.resolutionSummary}
                                  onChange={(event) => setStatusDrafts((current) => ({
                                    ...current,
                                    [request._id]: { ...draftValue, resolutionSummary: event.target.value }
                                  }))}
                                  rows={2}
                                  placeholder="Resolution findings description"
                                  className="w-full resize-none rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-white/5 dark:bg-[#0a0b0f]"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-400">Internal admin-only notes</label>
                                <textarea
                                  value={draftValue.internalNote}
                                  onChange={(event) => setStatusDrafts((current) => ({
                                    ...current,
                                    [request._id]: { ...draftValue, internalNote: event.target.value }
                                  }))}
                                  rows={2}
                                  placeholder="Notes visible only to admins"
                                  className="w-full resize-none rounded-xl border border-slate-200/50 bg-slate-50 px-3 py-2 text-xs outline-none dark:border-white/5 dark:bg-[#0a0b0f]"
                                />
                              </div>
                            </div>

                            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Ask student / Request Proof</p>
                                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-550 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(draftValue.requestProof)}
                                    onChange={(event) => setStatusDrafts((current) => ({
                                      ...current,
                                      [request._id]: { ...draftValue, requestProof: event.target.checked }
                                    }))}
                                  />
                                  Proof needed
                                </label>
                              </div>
                              <textarea
                                value={draftValue.followUpMessage}
                                onChange={(event) => setStatusDrafts((current) => ({
                                  ...current,
                                  [request._id]: { ...draftValue, followUpMessage: event.target.value }
                                }))}
                                rows={2}
                                placeholder="Message to prompt the student..."
                                className="mt-3 w-full resize-none rounded-xl border border-slate-200/50 bg-white px-3 py-2 text-xs outline-none dark:border-white/5 dark:bg-[#0a0b0f]"
                              />
                            </div>

                            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3 dark:border-white/5">
                              <button
                                type="button"
                                onClick={() => setStatusDrafts((current) => ({
                                  ...current,
                                  [request._id]: { ...draftValue, status: 'Resolved' }
                                }))}
                                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5 text-[10px] font-black uppercase tracking-wider text-emerald-500 cursor-pointer hover:bg-emerald-500 hover:text-white transition"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => setStatusDrafts((current) => ({
                                  ...current,
                                  [request._id]: { ...draftValue, status: 'Rejected' }
                                }))}
                                className="inline-flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2.5 text-[10px] font-black uppercase tracking-wider text-rose-500 cursor-pointer hover:bg-rose-500 hover:text-white transition"
                              >
                                <X className="h-4 w-4" />
                                Reject
                              </button>
                              <button
                                type="button"
                                onClick={() => saveRequestDetails(request._id)}
                                disabled={updatingId === request._id}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-600 shadow disabled:opacity-50 dark:border-white/5 dark:bg-white/[0.03] dark:text-slate-350 cursor-pointer hover:bg-slate-50 transition"
                              >
                                <Save className="h-4 w-4" />
                                Save Details
                              </button>
                              <button
                                type="button"
                                onClick={() => sendFollowUp(request._id, true)}
                                disabled={updatingId === request._id}
                                className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-indigo-500 disabled:opacity-50 cursor-pointer hover:bg-indigo-500 hover:text-white transition"
                              >
                                <MessageSquare className="h-4 w-4" />
                                Send Follow-up
                              </button>
                              <button
                                type="button"
                                onClick={() => updateStatus(request._id)}
                                disabled={updatingId === request._id}
                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-white shadow disabled:opacity-50 cursor-pointer transition"
                              >
                                {updatingId === request._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                                Save Status
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-450 pt-2">
              <span>{pagination.total || 0} Reported cases</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadRequests(Math.max(1, pagination.page - 1))}
                  disabled={pagination.page <= 1}
                  className="rounded-xl border border-slate-200/60 p-2 disabled:opacity-40 dark:border-white/5 cursor-pointer"
                >
                  <ChevronDown className="h-4 w-4 rotate-90" />
                </button>
                <span>Page {pagination.page || 1} of {pagination.pages || 1}</span>
                <button
                  type="button"
                  onClick={() => loadRequests(Math.min(pagination.pages || 1, pagination.page + 1))}
                  disabled={pagination.page >= pagination.pages}
                  className="rounded-xl border border-slate-200/60 p-2 disabled:opacity-40 dark:border-white/5 cursor-pointer"
                >
                  <ChevronDown className="h-4 w-4 -rotate-90" />
                </button>
              </div>
            </div>

          </div>
        )}

        {/* TAB: Support Analytics (Admin Dashboard) */}
        {isAdmin && activeViewTab === 'analytics' && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="rounded-2xl border border-slate-200/50 bg-white/70 p-5 shadow-sm dark:border-white/5 dark:bg-[#0b0c10]/40">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-500" />
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">Case Volume Overview</h4>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <SupportCard label="In Review" value={inReviewRequests} icon={Clock3} tone="from-cyan-500 to-blue-500" />
                <SupportCard label="Rejected" value={summary?.byStatus?.Rejected || 0} icon={AlertTriangle} tone="from-rose-500 to-red-500" />
                <SupportCard label="Total Requests" value={summary?.total || requests.length || 0} icon={FileText} tone="from-violet-500 to-fuchsia-500" />
              </div>
              
              <div className="mt-6">
                <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-450 mb-3">Telemetry by Issue Category</h5>
                <div className="grid gap-3 lg:grid-cols-2">
                  {analyticsRows?.length > 0 ? (
                    analyticsRows.map((row) => (
                      <div key={row.issueType} className="rounded-xl border border-slate-200/50 bg-slate-50/70 p-3.5 dark:border-white/5 dark:bg-white/[0.03]">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">{row.label}</span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500">{row.count} cases</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                            style={{
                              width: `${Math.max(8, Math.min(100, (row.count / Math.max(1, analyticsRows[0]?.count || 1)) * 100))}%`
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 rounded-xl border border-dashed border-slate-200/50 bg-slate-50/60 p-5 text-center text-xs font-semibold text-slate-450 dark:border-white/10 dark:bg-white/[0.02]">
                      No support analytics logs recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Manage Checklists (Admin Guidance Editor) */}
        {isAdmin && activeViewTab === 'guidance' && (
          <div className="space-y-4 animate-fade-in-up max-w-4xl mx-auto">
            <div className="rounded-2xl border border-slate-200/50 bg-white/70 p-5 shadow-sm dark:border-white/5 dark:bg-[#0b0c10]/40 space-y-4">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-indigo-500" />
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-805 dark:text-slate-100">Configure Troubleshooting Checklists</h4>
              </div>
              <p className="text-xs text-slate-455 leading-relaxed">
                Add, remove, or edit the troubleshooting steps presented to students when reporting an issue. Students must check these steps before submitting their requests.
              </p>

              {/* Selector for issue category */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                {ISSUE_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setAdminSelectIssue(opt.key)}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                      adminSelectIssue === opt.key
                        ? 'bg-[#FFAE59]/15 border border-[#FFAE59]/30 text-[#E07A15]'
                        : 'border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {loadingGuidance ? (
                <div className="flex items-center justify-center py-12 text-xs text-slate-400 font-bold uppercase tracking-wider">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500 mr-2" />
                  Loading Steps...
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2.5">
                    {adminSteps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 text-xs font-black shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={step}
                          onChange={(e) => handleEditAdminStep(idx, e.target.value)}
                          className="flex-1 rounded-xl border border-slate-200/50 bg-slate-50/80 px-3.5 py-2.5 text-xs font-bold outline-none dark:border-white/5 dark:bg-[#07080b]/70 focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveAdminStep(idx)}
                          className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition cursor-pointer shrink-0"
                          title="Remove step"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {adminSteps.length === 0 && (
                      <p className="text-xs text-slate-455 italic py-4 text-center">No troubleshooting options are defined yet. Add the first checkbox option below.</p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
                    <input
                      type="text"
                      placeholder="Add a new checklist step description..."
                      value={adminNewStep}
                      onChange={(e) => setAdminNewStep(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAdminStep(); } }}
                      className="flex-1 rounded-xl border border-slate-200/50 bg-slate-50/80 px-3.5 py-3 text-xs outline-none dark:border-white/5 dark:bg-[#07080b]/70 focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddAdminStep}
                      className="px-5 py-3 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer transition shadow-md"
                    >
                      + Add
                    </button>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={savingGuidance}
                      onClick={handleSaveGuidance}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow disabled:opacity-50 cursor-pointer transition"
                    >
                      {savingGuidance ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Checklist
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

    </section>
  );
};

export default UnableToAttendSession;
