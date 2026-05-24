import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../utils/api';
import { 
  Search, 
  MessageCircle, 
  Plus, 
  ArrowUp, 
  Users, 
  CheckCircle2, 
  Calendar,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Info,
  X,
  ChevronDown
} from 'lucide-react';

const TECH_CATEGORIES = ['Internship', 'Mentorship', 'Projects', 'Technical Issues', 'Assignments'];
const NON_TECH_CATEGORIES = ['Selection Process', 'Certificates', 'Attendance', 'Deadlines', 'Payments', 'General Queries', 'Announcements', 'Others'];

const SECTIONS = [
  {
    "id": 1,
    "title": "About the internship",
    "questions": [
      "What is the Vicharanashala internship?",
      "What is VINS?",
      "What are the phases of VINS, and what do the badges mean?",
      "Who is the internship for? Are alumni eligible?",
      "Is this the same as IIT Ropar's official Summer Research Internship?",
      "I have to attend my class tomorrow/today/some day — can I take leave?"
    ]
  },
  {
    "id": 2,
    "title": "Timing and dates",
    "questions": [
      "When can I start?",
      "How long is the internship?",
      "Can I start in July, August or later if I have exams now?",
      "Can I start with the cohort and take a relaxation during my exam window?",
      "Can I take leave or get an exemption during the internship for an exam scheduled in June?",
      "Are orientation session recordings shared with interns, and can project or group assignments be changed after watching them?"
    ]
  },
  {
    "id": 3,
    "title": "NOC (No Objection Certificate)",
    "questions": [
      "What dates do I put on the NOC?",
      "Who can sign the NOC?",
      "When do I submit the NOC? Is the deadline hard?",
      "What format should I use for the NOC? Do I need to design it myself?",
      "What if my college / Program Chair gives me an NOC in their own format?",
      "Does the NOC need to be signed by hand?",
      "Can my HOD email the NOC instead of signing a printout?",
      "How do I download and upload the NOC?",
      "What if my NOC is not formally verified?",
      "My online course (Masai, NPTEL, Coursera, etc.) won't issue an NOC. What do I do?",
      "My HOD/college official wants written confirmation before signing my NOC. What do I show them?",
      "Can Prof. Sudarshan Iyengar or a faculty member from IIT Ropar sign my NOC for the internship?"
    ]
  },
  {
    "id": 4,
    "title": "Selection, offer letter, and certificate",
    "questions": [
      "How do I know I am selected?",
      "How do I opt into VINS?",
      "When do I get the offer letter?",
      "Will I get a certificate?",
      "How do I confirm my internship dates?",
      "I am a minor/major in AI student — can I join the programme? I don't need a NOC as I am from IIT Ropar.",
      "How do I accept the offer letter?",
      "What if I reply without using the exact acceptance format printed in the letter?",
      "I received a withdrawal email because I didn't accept the offer letter correctly. Can it be reversed?",
      "What happens after I send my acceptance? My dashboard doesn't update.",
      "How do I change my internship dates before the offer letter is issued?",
      "When and how do I get the Zoom link for the kickoff meeting?",
      "How to proceed if NOC is not available and my chosen internship start date is approaching? I did not receive a selection confirmation letter too.",
      "When does my internship actually begin? Will I receive a notification on the day?",
      "Can I switch from VINS (online) to VISE (offline) after being selected?",
      "Can I change my internship dates after the offer letter has been issued?",
      "How do I get the link for the daily Zoom standups? Are they mandatory?"
    ]
  },
  {
    "id": 5,
    "title": "Work, mentorship, and projects",
    "questions": [
      "What will I work on?",
      "How many hours per day?",
      "Who is my mentor?",
      "Is there a stipend?",
      "Do I need my own laptop? Should I preload any software?",
      "I am using a different email on GitHub / Zoom / the learning platform. Is that okay?",
      "Why has my mentor not been assigned yet, or contacted me on day 1?"
    ]
  },
  {
    "id": 6,
    "title": "Code of conduct — communication channels",
    "questions": [
      "Are unofficial WhatsApp groups, Telegram channels, or peer-run groups allowed?"
    ]
  },
  {
    "id": 7,
    "title": "Interviews Related",
    "questions": [
      "My interview is not marked as complete on the dashboard — what do I do?"
    ]
  },
  {
    "id": 8,
    "title": "Certificate",
    "questions": [
      "Does Vicharanashala send a grade report or evaluation to my university for internship credit?",
      "Does the Vicharanashala internship certificate specify whether it was completed online or offline?",
      "Will the completion certificate be a physical hardcopy or an e-certificate?",
      "Is there a WhatsApp group for candidates during the internship?"
    ]
  },
  {
    "id": 9,
    "title": "Rosetta — your internship journal",
    "questions": [
      "What is Rosetta?",
      "Why does Rosetta exist? Is it just busywork?",
      "What is a \"thinking routine\" in Rosetta?",
      "How do I get my Rosetta journal?",
      "How do I use Rosetta day to day?",
      "How long should each Rosetta entry be?",
      "What is the one rule for Rosetta?",
      "Can I use ChatGPT or any AI tool to write my Rosetta entries?",
      "What if I miss a day in my Rosetta journal?",
      "Will anyone read my Rosetta journal during the internship?",
      "Can the Rosetta prompts change mid-internship?",
      "How do I submit Rosetta at the end?",
      "I have a question about Rosetta that is not answered here. What do I do?",
      "My college requires a written confirmation that the internship is self-paced and will not clash with college classes — what document can I share with them?"
    ]
  },
  {
    "id": 10,
    "title": "Phase 1 — coursework, Vibe LMS, and live sessions",
    "questions": [
      "I've previously interned with VLED — am I exempt from any coursework?",
      "How do I register for the AI Fundamentals course on Vibe?",
      "I registered on Vibe with a different email than my Samagama email — is that OK?",
      "Are live sessions mandatory if I'm on the viva route?",
      "Where do I find the daily live-session schedule?"
    ]
  },
  {
    "id": 11,
    "title": "Yaksha Chat Related",
    "questions": [
      "I'm unable to type in the chat after clicking 'Interact with Yaksha' — what should I do?"
    ]
  },
  {
    "id": 12,
    "title": "ViBe Platform",
    "questions": [
      "How do I log in to ViBe?",
      "Invite accepted but shows \"No course enrolled\"?",
      "Why are videos stuck or repeating?",
      "Can I use a mobile or tablet?",
      "I'm experiencing video issues (stuck, looping, skipping) on ViBe. How do I troubleshoot?",
      "I have completed all videos and quizzes in the ViBe course, but my progress is still showing less than 100%. What should I do?",
      "I feel the ViBe content or platform is not good or I am unhappy with the way progress is evaluated. Can I request an exception or bypass the system?",
      "Is the ViBe consent form compulsory? What if I don't want to grant camera access?",
      "What are penalty scores on the ViBe platform, and how do they affect our performance or HP?",
      "When should I use the Flag option on ViBe, and when should I contact support?",
      "What is Linear Progression on ViBe?",
      "Can I use the left navigation panel to jump ahead to a later video or quiz?",
      "I am seeing a red \"Access Restricted\" banner. Is this a bug?",
      "How do I resolve the \"Access Restricted\" error?",
      "Why does ViBe sometimes make me re-watch a clip after a quiz?",
      "What kinds of quiz questions will I see on ViBe?",
      "Are the same proctoring rules applied to every course on ViBe?",
      "What does the \"quiet helper\" on ViBe actually do?",
      "Does ViBe record long videos of me while I'm learning?",
      "What is the single most common avoidable mistake learners make?",
      "Why does the lesson keep pausing or restarting even when I'm paying attention?",
      "Can I read the quiz questions aloud or mutter to myself while watching?",
      "Can I study with a friend on camera since we're learning together?",
      "Will I lose my progress if I clear my browser or reinstall it?",
      "Is there a recommended daily learning rhythm on ViBe?",
      "What should my \"study corner\" look like before I start a ViBe session?"
    ]
  },
  {
    "id": 13,
    "title": "Team Formation",
    "questions": [
      "Is team formation compulsory?",
      "What is the size of a team?",
      "How are teams formed?",
      "I started on May 15/16 but couldn't form a team during the activity. What happens now?",
      "There was a typo in our email addresses during team formation. Can we fix it?",
      "I formed a team with only two members. Will it be considered?",
      "What if a team member leaves or becomes ineligible during Phase 1?",
      "Can I form a team with someone from my own college?",
      "Can I form a team with students from my IIT MBS cohort?",
      "Can we change our team name after submission?",
      "What if multiple teams choose the same name?",
      "What should I do if I face issues within my team?",
      "How will I know who my mentor is?",
      "When will I know my team details?",
      "I received a team list email but my name is not included. What should I do?",
      "We selected Project X as our top priority but were assigned Project Y. Can we change it?",
      "I just started the internship. Can I form my own team now?",
      "When do team activities begin?",
      "Can I request a specific teammate after teams are assigned?",
      "What happens if a team member is inactive or not contributing?",
      "Can I switch teams if there are conflicts?",
      "Will team performance affect individual evaluation?",
      "How will communication happen within teams?",
      "What if I miss the team allocation email?",
      "Can a team be dissolved and reformed?",
      "What happens if I drop out of the internship?",
      "Will we get time to get to know our teammates before Phase 2?"
    ]
  }
];


// Flat list of all static questions across the 11 sections
const ALL_STATIC_QUESTIONS = SECTIONS.reduce((acc, sec) => [...acc, ...sec.questions], []);

const FAQFeed = () => {
  const { user, setSelectedThreadId, showAlert, setActiveTab } = useApp();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filtering States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'upvotes' | 'meToo' | 'replies'
  const [filterOfficial, setFilterOfficial] = useState(true); // Official FAQs loads first
  const [activeDropdown, setActiveDropdown] = useState(null); // 'technical' | 'non-technical' | null

  // Accordion & Answers states for Official FAQs
  const [expandedThreads, setExpandedThreads] = useState({}); // { threadId: boolean }
  const [threadAnswers, setThreadAnswers] = useState({}); // { threadId: [answers] }
  const [answersLoading, setAnswersLoading] = useState({}); // { threadId: boolean }

  // Ask Question Modal States
  const [showAskModal, setShowAskModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('General Queries');
  const [duplicateSuggestions, setDuplicateSuggestions] = useState([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [creationLoading, setCreationLoading] = useState(false);
  const [checkedTitle, setCheckedTitle] = useState('');

  // Profile data for the side card
  const [profileData, setProfileData] = useState(null);

  // Fetch threads on mount and when filters change
  useEffect(() => {
    fetchThreads();
  }, [selectedCategory, sortBy, filterOfficial]);

  // Fetch profile stats
  useEffect(() => {
    if (user) {
      api.get(`/profile/${user.id}`)
        .then(res => setProfileData(res.data))
        .catch(err => console.error("Profile fetch error:", err));
    }
  }, [user]);

  const fetchThreads = async () => {
    setLoading(true);
    try {
      const res = await api.get('/threads', {
        params: {
          category: filterOfficial ? 'All' : selectedCategory,
          sort: sortBy,
          isOfficial: filterOfficial ? 'true' : 'false'
        }
      });
      setThreads(res.data);
    } catch (error) {
      console.error('Fetch threads error:', error.message);
      showAlert('Failed to fetch threads. Check backend connection.', 'error');
    }
    setLoading(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchThreads();
  };

  // Live duplicate checker debouncing wrapper
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (newTitle.trim().length >= 8 && newTitle !== checkedTitle) {
        checkDuplicates(newTitle);
      } else if (newTitle.trim().length < 8) {
        setDuplicateSuggestions([]);
      }
    }, 450); // 450ms debounce

    return () => clearTimeout(delayDebounce);
  }, [newTitle]);

  const checkDuplicates = async (title) => {
    setCheckingDuplicates(true);
    setCheckedTitle(title);
    try {
      const res = await api.post('/threads/check-duplicate', {
        title,
        category: newCategory
      });
      setDuplicateSuggestions(res.data);
    } catch (error) {
      console.error('Similarity check error:', error.message);
    }
    setCheckingDuplicates(false);
  };

  const handleCreateThread = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreationLoading(true);
    try {
      // Format of posting question is just category and title (body defaults to title)
      const res = await api.post('/threads/create', {
        title: newTitle,
        body: newTitle,
        category: newCategory
      });

      setShowAskModal(false);
      setNewTitle('');
      setNewCategory('General Queries');
      setDuplicateSuggestions([]);
      fetchThreads(); // Reload feed
      
      if (res.data.status === 'active') {
        setSelectedThreadId(res.data._id);
      }
    } catch (error) {
      console.error('Create thread error:', error.message);
      showAlert(error.response?.data?.message || 'Failed to create thread', 'error');
    }
    setCreationLoading(false);
  };

  const handleThreadVote = async (e, threadId) => {
    e.stopPropagation();
    try {
      const res = await api.post(`/threads/${threadId}/upvote`);
      setThreads(prev => 
        prev.map(t => t._id === threadId ? { ...t, upvotes: res.data.upvotes } : t)
      );
    } catch (error) {
      console.error('Vote thread error:', error.message);
      showAlert(error.response?.data?.message || 'Failed to upvote thread', 'error');
    }
  };

  const handleMeTooToggle = async (e, threadId) => {
    e.stopPropagation();
    try {
      const res = await api.post(`/threads/${threadId}/metoo`);
      setThreads(prev =>
        prev.map(t => t._id === threadId ? { ...t, meToo: res.data.meToo } : t)
      );
    } catch (error) {
      console.error('Me too error:', error.message);
      showAlert(error.response?.data?.message || 'Failed to register Me Too', 'error');
    }
  };

  // Toggle Accordions for Official FAQs
  const toggleThreadExpand = async (threadId) => {
    const isExpanded = !!expandedThreads[threadId];
    setExpandedThreads(prev => ({ ...prev, [threadId]: !isExpanded }));

    if (!isExpanded && !threadAnswers[threadId]) {
      setAnswersLoading(prev => ({ ...prev, [threadId]: true }));
      try {
        const res = await api.get(`/threads/${threadId}/answers`);
        setThreadAnswers(prev => ({ ...prev, [threadId]: res.data }));
      } catch (err) {
        console.error("Fetch answers error:", err);
      }
      setAnswersLoading(prev => ({ ...prev, [threadId]: false }));
    }
  };

  const handleExpandAll = async () => {
    const nextExpanded = {};
    const threadsToFetch = [];

    threads.forEach(t => {
      nextExpanded[t._id] = true;
      if (!threadAnswers[t._id]) {
        threadsToFetch.push(t._id);
      }
    });

    setExpandedThreads(nextExpanded);

    if (threadsToFetch.length > 0) {
      // Set loading
      const loadingState = {};
      threadsToFetch.forEach(tid => { loadingState[tid] = true; });
      setAnswersLoading(prev => ({ ...prev, ...loadingState }));

      await Promise.all(threadsToFetch.map(async (tid) => {
        try {
          const res = await api.get(`/threads/${tid}/answers`);
          setThreadAnswers(prev => ({ ...prev, [tid]: res.data }));
        } catch (err) {
          console.error(err);
        } finally {
          setAnswersLoading(prev => ({ ...prev, [tid]: false }));
        }
      }));
    }
  };

  const handleCollapseAll = () => {
    setExpandedThreads({});
  };

  const handleCategorySelect = (cat) => {
    setFilterOfficial(false);
    setSelectedCategory(cat);
  };

  const handleOfficialSelect = () => {
    setFilterOfficial(true);
    setSelectedCategory('All');
  };

  const handleCommunitySelect = () => {
    setFilterOfficial(false);
    setSelectedCategory('All');
  };

  const timeAgo = (dateString) => {
    const diff = new Date() - new Date(dateString);
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);

    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    return `${days}d ago`;
  };

  // Determine active highlights for categories dropdowns
  const isTechActive = !filterOfficial && TECH_CATEGORIES.includes(selectedCategory);
  const isNonTechActive = !filterOfficial && NON_TECH_CATEGORIES.includes(selectedCategory);
  const isOfficialActive = filterOfficial;
  const isCommunityActive = !filterOfficial && selectedCategory === 'All';

  // Find additional official FAQs not in the 11 static sections lists
  const additionalThreads = threads.filter(t => 
    t.isOfficial && 
    !ALL_STATIC_QUESTIONS.includes(t.title) && 
    (search === '' || t.title.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 font-sans">
      
      {/* Main Column: Feed */}
      <div className="lg:col-span-3 space-y-6">
        
        {/* Title & Ask Action Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-wide">FAQ Center</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Find official course guidelines or request community help instantly.</p>
          </div>
        </div>

      {/* Filter Category Dropdowns / Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Official FAQs tab */}
        <button
          onClick={handleOfficialSelect}
          className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
            isOfficialActive
              ? 'bg-slate-900 dark:bg-white text-white dark:text-brand-950 border-slate-900 dark:border-white shadow-md'
              : 'bg-white dark:bg-brand-900 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-brand-850 hover:bg-slate-50 dark:hover:bg-brand-850'
          }`}
        >
          Official FAQs
        </button>

        {/* Technical Dropdown */}
        <div className="relative inline-block group">
          <button
            className={`flex items-center space-x-1.5 px-4 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer group-hover:bg-brand-500 group-hover:text-white group-hover:border-brand-500 ${
              isTechActive
                ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/10'
                : 'bg-white dark:bg-brand-900 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-brand-850 hover:bg-slate-50 dark:hover:bg-brand-850'
            }`}
          >
            <span>Technical</span>
            <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 group-hover:rotate-180" />
          </button>
          <div 
            className="absolute left-0 w-48 bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-800 rounded-xl shadow-lg z-30 py-2 transition-all duration-200 origin-top-left opacity-0 -translate-y-2 scale-95 pointer-events-none invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 group-hover:pointer-events-auto group-hover:visible"
            style={{ top: 'calc(100% - 2px)' }}
          >
            {TECH_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => handleCategorySelect(cat)}
                className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat && !filterOfficial
                    ? 'bg-brand-50 text-brand-500 dark:bg-brand-950/40 dark:text-brand-455'
                    : 'text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-brand-850 hover:text-brand-500'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Non-Technical Dropdown */}
        <div className="relative inline-block group">
          <button
            className={`flex items-center space-x-1.5 px-4 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer group-hover:bg-brand-500 group-hover:text-white group-hover:border-brand-500 ${
              isNonTechActive
                ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/10'
                : 'bg-white dark:bg-brand-900 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-brand-850 hover:bg-slate-50 dark:hover:bg-brand-850'
            }`}
          >
            <span>Non-Technical</span>
            <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200 group-hover:rotate-180" />
          </button>
          <div 
            className="absolute left-0 w-48 bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-800 rounded-xl shadow-lg z-30 py-2 transition-all duration-200 origin-top-left opacity-0 -translate-y-2 scale-95 pointer-events-none invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 group-hover:pointer-events-auto group-hover:visible"
            style={{ top: 'calc(100% - 2px)' }}
          >
            {NON_TECH_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => handleCategorySelect(cat)}
                className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat && !filterOfficial
                    ? 'bg-brand-50 text-brand-500 dark:bg-brand-950/40 dark:text-brand-455'
                    : 'text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-brand-850 hover:text-brand-500'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Community Board tab */}
        <button
          onClick={handleCommunitySelect}
          className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
            isCommunityActive
              ? 'bg-slate-900 dark:bg-white text-white dark:text-brand-950 border-slate-900 dark:border-white shadow-md'
              : 'bg-white dark:bg-brand-900 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-brand-850 hover:bg-slate-50 dark:hover:bg-brand-850'
          }`}
        >
          Community Board
        </button>
      </div>

      {/* DYNAMIC RENDERING: Official FAQs (mockup documentation) vs Community Board P2P */}
      {filterOfficial ? (
        
        /* High Fidelity Official FAQs Documentation Layout */
        <div className="bg-white dark:bg-brand-900 p-8 rounded-3xl border border-slate-200 dark:border-brand-900/60 shadow-sm max-w-4xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="text-center sm:text-left space-y-1">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white font-serif tracking-tight">Vicharanashala Internship</h1>
            <p className="text-xs italic text-slate-500 dark:text-slate-400">
              Applied AI · Open-source software engineering · IIT Ropar
            </p>
          </div>

          {/* Nav */}
          <div className="flex space-x-6 border-b border-slate-200 dark:border-brand-800 pb-3 text-xs font-semibold text-slate-500">
            <span className="hover:text-slate-800 dark:hover:text-white cursor-pointer transition-colors">Overview</span>
            <span className="text-slate-850 dark:text-white border-b-2 border-slate-850 dark:border-brand-400 pb-3 cursor-pointer">FAQ</span>
            <span className="hover:text-slate-800 dark:hover:text-white cursor-pointer transition-colors">Voice</span>
            <a href="https://samagama.in" target="_blank" rel="noreferrer" className="hover:text-slate-800 dark:hover:text-white transition-colors">samagama.in</a>
          </div>

          {/* Search bar & Hooks */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search the FAQ — type a keyword (e.g. NOC, hostel, stipend)"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-brand-950 border border-slate-200 dark:border-brand-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>
            <div className="flex items-center space-x-3 text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0 select-none">
              <button onClick={handleExpandAll} className="hover:text-brand-500 transition-colors cursor-pointer">Expand all</button>
              <span className="text-slate-300">|</span>
              <button onClick={handleCollapseAll} className="hover:text-brand-500 transition-colors cursor-pointer">Collapse all</button>
            </div>
          </div>

          {/* TABLE OF CONTENTS */}
          <div className="border border-slate-200 dark:border-brand-800/80 rounded-2xl p-6 bg-white dark:bg-brand-900/40 space-y-6">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">CONTENTS</h3>
            
            <div className="space-y-6">
              {/* Loop through all 11 explicit sections */}
              {SECTIONS.map((sec) => {
                // Filter official threads that match this section's list of questions
                const sectionThreads = threads.filter(t => 
                  t.isOfficial && 
                  sec.questions.includes(t.title) && 
                  (search === '' || t.title.toLowerCase().includes(search.toLowerCase()))
                );

                // Sort section threads based on their static order in sec.questions
                sectionThreads.sort((a, b) => sec.questions.indexOf(a.title) - sec.questions.indexOf(b.title));

                if (sectionThreads.length === 0) return null;

                return (
                  <div key={sec.id} className="space-y-3.5 text-slate-850 dark:text-white">
                    <h4 className="text-sm font-extrabold">
                      {sec.id}. {sec.title}
                    </h4>
                    
                    <ul className="pl-4 space-y-3.5 border-l border-slate-100 dark:border-brand-900/60 ml-1">
                      {sectionThreads.map((thread, idx) => {
                        const qNumber = `${sec.id}.${idx + 1}`;
                        const isExpanded = !!expandedThreads[thread._id];
                        const answers = threadAnswers[thread._id] || [];
                        const loadingAnswers = answersLoading[thread._id];

                        return (
                          <li key={thread._id} className="space-y-2">
                            <div 
                              onClick={() => toggleThreadExpand(thread._id)}
                              className="text-xs font-medium text-slate-700 dark:text-slate-350 hover:text-brand-500 dark:hover:text-brand-400 cursor-pointer flex items-start space-x-2 transition-colors leading-relaxed"
                            >
                              <span className="shrink-0 text-slate-400 font-bold">{qNumber}</span>
                              <span className={isExpanded ? "font-bold text-brand-500 dark:text-brand-400" : ""}>{thread.title}</span>
                            </div>

                            {isExpanded && (
                              <div className="pl-5 pt-1 pb-1 animate-slide-in space-y-2">
                                {loadingAnswers ? (
                                  <div className="flex items-center space-x-2 py-1.5">
                                    <div className="w-3.5 h-3.5 border border-brand-500 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-[10px] text-slate-400 italic">Syncing response...</span>
                                  </div>
                                ) : answers.length > 0 ? (
                                  <div className="bg-slate-50/70 dark:bg-brand-950/20 border-l-2 border-emerald-500 p-3.5 rounded-r-xl space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-450 tracking-wider flex items-center space-x-1">
                                        <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-500/10 text-emerald-500" />
                                        <span>Verified Response</span>
                                      </span>
                                      <button
                                        onClick={() => setSelectedThreadId(thread._id)}
                                        className="text-[9px] font-bold text-brand-500 dark:text-brand-455 hover:underline cursor-pointer"
                                      >
                                        View FAQ File
                                      </button>
                                    </div>
                                    <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed whitespace-pre-wrap">
                                      {answers[0].body}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="bg-slate-50/70 dark:bg-brand-950/20 border-l-2 border-amber-500 p-3 rounded-r-xl text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                                    <span>No verified answer for this FAQ yet.</span>
                                    <button 
                                      onClick={() => setSelectedThreadId(thread._id)}
                                      className="px-2 py-1 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 rounded text-[9px] font-bold transition-all cursor-pointer"
                                    >
                                      View Discussion Page
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}

              {/* Additional Approved FAQs */}
              {additionalThreads.length > 0 && (
                <div className="space-y-3.5 text-slate-855 dark:text-white">
                  <h4 className="text-sm font-extrabold">
                    {SECTIONS.length + 1}. Additional Approved FAQs
                  </h4>
                  
                  <ul className="pl-4 space-y-3.5 border-l border-slate-100 dark:border-brand-900/60 ml-1">
                    {additionalThreads.map((thread, idx) => {
                      const qNumber = `${SECTIONS.length + 1}.${idx + 1}`;
                      const isExpanded = !!expandedThreads[thread._id];
                      const answers = threadAnswers[thread._id] || [];
                      const loadingAnswers = answersLoading[thread._id];

                      return (
                        <li key={thread._id} className="space-y-2">
                          <div 
                            onClick={() => toggleThreadExpand(thread._id)}
                            className="text-xs font-medium text-slate-700 dark:text-slate-350 hover:text-brand-500 dark:hover:text-brand-400 cursor-pointer flex items-start space-x-2 transition-colors leading-relaxed"
                          >
                            <span className="shrink-0 text-slate-400 font-bold">{qNumber}</span>
                            <span className={isExpanded ? "font-bold text-brand-500 dark:text-brand-400" : ""}>{thread.title}</span>
                          </div>

                          {isExpanded && (
                            <div className="pl-5 pt-1 pb-1 animate-slide-in space-y-2">
                              {loadingAnswers ? (
                                <div className="flex items-center space-x-2 py-1.5">
                                  <div className="w-3.5 h-3.5 border border-brand-500 border-t-transparent rounded-full animate-spin" />
                                  <span className="text-[10px] text-slate-400 italic">Syncing response...</span>
                                </div>
                              ) : answers.length > 0 ? (
                                <div className="bg-slate-50/70 dark:bg-brand-950/20 border-l-2 border-emerald-500 p-3.5 rounded-r-xl space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-455 tracking-wider flex items-center space-x-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-500/10 text-emerald-500" />
                                      <span>Verified Response</span>
                                    </span>
                                    <button
                                      onClick={() => setSelectedThreadId(thread._id)}
                                      className="text-[9px] font-bold text-brand-500 dark:text-brand-455 hover:underline cursor-pointer"
                                    >
                                      View FAQ File
                                    </button>
                                  </div>
                                  <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                    {answers[0].body}
                                  </p>
                                </div>
                              ) : (
                                <div className="bg-slate-50/70 dark:bg-brand-950/20 border-l-2 border-amber-500 p-3 rounded-r-xl text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                                  <span>No verified answer for this FAQ yet.</span>
                                  <button 
                                    onClick={() => setSelectedThreadId(thread._id)}
                                    className="px-2 py-1 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 rounded text-[9px] font-bold transition-all cursor-pointer"
                                  >
                                    View Discussion Page
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

      ) : (

        /* Community Board Feed (issues raised by others) */
        <div className="space-y-6">
          
          {/* Filter, Sort & Active state tag row */}
          <div className="bg-white dark:bg-brand-900 p-4 rounded-2xl border border-slate-200 dark:border-brand-900/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Active category stamp */}
            <div className="flex items-center space-x-2">
              <span className="bg-brand-500/10 text-brand-500 dark:text-brand-400 px-3 py-1.5 rounded-xl text-xs font-bold">
                Category: {selectedCategory}
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                ({threads.length} issues found)
              </span>
            </div>

            {/* Search and Sort controls */}
            <div className="flex flex-wrap items-center gap-4 flex-1 md:justify-end">
              <form onSubmit={handleSearchSubmit} className="relative w-full max-w-xs">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search community issues..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-brand-950 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:ring-1 focus:ring-brand-500 border border-transparent transition-all"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              </form>

              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-100 dark:bg-brand-950 text-slate-700 dark:text-slate-350 py-1.5 px-3 rounded-lg text-xs outline-none border border-transparent font-semibold cursor-pointer"
                >
                  <option value="newest">Latest Activity</option>
                  <option value="upvotes">Highest Votes</option>
                  <option value="meToo">Me Too Counts</option>
                  <option value="replies">Most Replies</option>
                </select>
              </div>
            </div>

          </div>

          {/* Loading / Results display */}
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Syncing community discussions...</p>
            </div>
          ) : threads.length === 0 ? (
            <div className="py-20 text-center bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-900/60 rounded-3xl p-8 space-y-4">
              <div className="bg-slate-100 dark:bg-brand-950/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-2xl">
                🔍
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">No discussions found</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                  We couldn't find any threads matching your filters. Try adjusting your query or create a new discussion thread.
                </p>
              </div>
              <button 
                onClick={() => setShowAskModal(true)}
                className="px-4 py-2 bg-brand-500 text-white hover:bg-brand-600 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Create First Thread
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {threads.map((thread) => {
                const userUpvoted = thread.upvotes?.includes(user?.id) || false;
                const userMeToo = thread.meToo?.includes(user?.id) || false;

                return (
                  <article
                    key={thread._id}
                    onClick={() => setSelectedThreadId(thread._id)}
                    className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-900/60 p-5 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-brand-800 cursor-pointer transition-all duration-200"
                  >
                    <div className="flex flex-col space-y-3">
                      
                      {/* Header metadata row */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="bg-brand-500/10 text-brand-500 dark:text-brand-400 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                          {thread.category}
                        </span>
                        <div className="flex items-center space-x-2 text-[10px] font-bold">
                          {thread.isOfficial && (
                            <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-450 bg-emerald-500/10 px-2 py-1 rounded-lg">
                              <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-500/10 text-emerald-500" />
                              <span>Verified FAQ</span>
                            </span>
                          )}
                          <span className="text-slate-400 flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{timeAgo(thread.createdAt)}</span>
                          </span>
                        </div>
                      </div>

                      {/* Question Title */}
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-white leading-snug hover:text-brand-500 dark:hover:text-brand-450 transition-colors">
                        {thread.title}
                      </h3>

                      {/* Snippet body */}
                      {thread.body !== thread.title && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {thread.body}
                        </p>
                      )}

                      {/* Author Details & Interactive Statistics buttons */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-brand-900/40">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-brand-950/65 flex items-center justify-center text-slate-655 dark:text-slate-300 text-[10px] font-extrabold capitalize">
                            {thread.authorName?.charAt(0)}
                          </div>
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            {thread.authorName}
                          </span>
                        </div>

                        <div className="flex items-center space-x-3">
                          {/* Me Too */}
                          <button
                            onClick={(e) => handleMeTooToggle(e, thread._id)}
                            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                              userMeToo
                                ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                                : 'bg-slate-50 hover:bg-slate-100 dark:bg-brand-950/40 dark:hover:bg-brand-950 text-slate-500 border-transparent'
                            }`}
                            title="Mark 'Me Too' (Also experiencing this)"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>{thread.meToo?.length || 0} Me Too</span>
                          </button>

                          {/* Upvotes */}
                          <button
                            onClick={(e) => handleThreadVote(e, thread._id)}
                            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                              userUpvoted
                                ? 'bg-brand-500/15 text-brand-500 dark:text-brand-400 border-brand-500/30'
                                : 'bg-slate-50 hover:bg-slate-100 dark:bg-brand-950/40 dark:hover:bg-brand-950 text-slate-500 border-transparent'
                            }`}
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                            <span>{thread.upvotes?.length || 0} Votes</span>
                          </button>

                          {/* Replies */}
                          <div className="flex items-center space-x-1 text-slate-400 px-2 py-1">
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold">{thread.repliesCount || 0} Replies</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </article>
                );
              })}
            </div>
          )}

        </div>
      )}
      
      </div> {/* End Main Column */}

      {/* Right Column: Profile Summary Card */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-900/60 p-5 rounded-3xl shadow-sm">
          
          <button
            onClick={() => setShowAskModal(true)}
            className="mb-5 w-full flex items-center justify-center space-x-1.5 px-4.5 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl text-sm font-bold transition-all shadow-md shadow-brand-500/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Ask Question</span>
          </button>

          <div className="flex items-center space-x-3 mb-5">
            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-brand-950/60 flex items-center justify-center text-slate-700 dark:text-slate-300 text-xl font-bold capitalize shadow-sm">
              {user.username.charAt(0)}
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-800 dark:text-white capitalize leading-tight">{user.username}</h2>
              <span className="text-[10px] text-slate-400 block font-bold uppercase mt-0.5">{user.role}</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="bg-slate-50 dark:bg-brand-950/40 p-3.5 rounded-2xl flex justify-between items-center border border-slate-100 dark:border-brand-850">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Questions Raised</span>
              <span className="text-sm font-black text-brand-500">{profileData?.raisedThreads?.length || 0}</span>
            </div>
            <div className="bg-slate-50 dark:bg-brand-950/40 p-3.5 rounded-2xl flex justify-between items-center border border-slate-100 dark:border-brand-850">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Questions Solved</span>
              <span className="text-sm font-black text-emerald-500">{profileData?.resolvedQuestions?.length || 0}</span>
            </div>
            <div className="bg-slate-50 dark:bg-brand-950/40 p-3.5 rounded-2xl flex justify-between items-center border border-slate-100 dark:border-brand-850">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Answers Given</span>
              <span className="text-sm font-black text-amber-500">{profileData?.answersGiven?.length || 0}</span>
            </div>
          </div>
          
          {user.role === 'admin' && (
            <button 
              onClick={() => { setSelectedThreadId(null); setActiveTab('admin'); }}
              className="mt-5 w-full px-4 py-3 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-brand-900 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Admin Panel</span>
            </button>
          )}
        </div>
      </div>

      {/* Ask Question Popup Modal Overlay */}
      {showAskModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-850 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-in font-sans">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-brand-800 bg-slate-50/50 dark:bg-brand-950/20 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-brand-500 animate-pulse" />
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Ask Question</h3>
              </div>
              <button 
                onClick={() => setShowAskModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateThread} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {/* Category selector */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1.5 tracking-wider">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-brand-950/60 border border-slate-200 dark:border-brand-850 rounded-xl text-xs outline-none text-slate-705 dark:text-slate-200 font-semibold focus:ring-1 focus:ring-brand-500 cursor-pointer"
                >
                  <optgroup label="Technical">
                    {TECH_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Non-Technical">
                    {NON_TECH_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Title input */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1.5 tracking-wider">Question</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. When is the deadline for submitting certificate clearance forms?"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-brand-950/60 border border-slate-200 dark:border-brand-850 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
                />
                
                {checkingDuplicates && (
                  <span className="text-[10px] text-slate-400 mt-1 block italic animate-pulse">Scanning knowledge base for similar questions...</span>
                )}
              </div>

              {/* LIVE SIMILAR DUPLICATES DIALOG SUGGESTION BOX */}
              {duplicateSuggestions.length > 0 && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2.5 animate-slide-in">
                  <div className="flex items-center space-x-1.5 text-amber-500 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold">Matching Existing FAQ Suggestions</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                    We found similar discussions already answered. Please verify them to see if they answer your question:
                  </p>
                  <div className="divide-y divide-amber-500/15 max-h-40 overflow-y-auto">
                    {duplicateSuggestions.map((item) => (
                      <div 
                        key={item.thread._id} 
                        onClick={() => {
                          setSelectedThreadId(item.thread._id);
                          setShowAskModal(false);
                        }}
                        className="py-2.5 flex items-center justify-between text-xs text-slate-700 dark:text-slate-350 hover:text-brand-500 hover:underline cursor-pointer group"
                      >
                        <span className="truncate max-w-[85%] font-medium leading-relaxed">
                          • {item.thread.title}
                        </span>
                        <span className="text-[9px] font-black bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded-md flex items-center space-x-1 shrink-0">
                          <span>{Math.round(item.score * 100)}% Match</span>
                          <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Info warning */}
              <div className="p-3 bg-slate-50 dark:bg-brand-950/40 rounded-xl border border-slate-100 dark:border-brand-850 flex items-start space-x-2">
                <Info className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-slate-400 leading-normal">
                  IIT Ropar FAQ checks text toxicity and spam probability using automated AI filters. Questions violating guidelines will be auto-flagged for administrator review.
                </p>
              </div>

              {/* Form submit footer */}
              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAskModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-brand-850 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creationLoading || checkingDuplicates}
                  className="px-4.5 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  {creationLoading ? 'Publishing...' : 'Publish Question'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default FAQFeed;
