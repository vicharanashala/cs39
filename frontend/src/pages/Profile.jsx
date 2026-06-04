import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../utils/api';
import { Volume2, Mic, CheckCircle2, Award, User, Mail, ShieldAlert } from 'lucide-react';

const Profile = () => {
  const { user } = useApp();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('raised'); // 'raised' | 'answers' | 'resolved'

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get(`/profile/${user.id}`);
      setProfileData(res.data);
    } catch (err) {
      console.error('Fetch profile data error:', err.message);
      setError(true);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-400 font-bold uppercase tracking-wider">
        Syncing contributor profile...
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="py-20 text-center text-xs text-slate-500 font-bold uppercase tracking-wider space-y-4">
        <p>Failed to resolve profile details.</p>
        <button onClick={fetchProfileData} className="soft-primary px-4 py-2 rounded-xl text-xs font-black">Retry</button>
      </div>
    );
  }

  const { raisedThreads, resolvedQuestions, answersGiven } = profileData;

  return (
    <div className="flex-1 p-6 max-w-3xl mx-auto space-y-6 font-sans">
      
      {/* Profile Info Card */}
      <div className="soft-panel bg-white/70 dark:bg-[#0b0c10]/40 border border-slate-200/50 dark:border-white/5 p-6 rounded-3xl shadow-xl backdrop-blur-3xl flex items-center space-x-5 relative overflow-hidden">
        
        {/* Decorative background glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-2xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-black capitalize shadow-lg shadow-indigo-500/10 shrink-0">
          {user.username.charAt(0)}
        </div>
        
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-lg font-black text-slate-900 dark:text-white capitalize tracking-tight flex items-center gap-1.5">
            {user.username}
            {user.role === 'admin' && (
              <span className="bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border border-indigo-500/20">Staff Admin</span>
            )}
          </h2>
          <span className="text-[10px] text-slate-450 dark:text-slate-500 block font-bold uppercase tracking-wider">{user.email}</span>
          
          <div className="pt-1 flex items-center gap-2 flex-wrap text-[9px] font-black uppercase tracking-wider">
            <span className="bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-lg border border-slate-200/40 dark:border-white/5 shadow-sm">
              Role: {user.role}
            </span>
            {user.role !== 'admin' && (
              <span className="bg-amber-500/10 text-[#E07A15] dark:text-[#FFAE59] px-2.5 py-1 rounded-lg border border-amber-500/20 shadow-sm flex items-center gap-1">
                <Award className="w-3.5 h-3.5" /> SP Score: {user.spPoints}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs list container */}
      <div className="soft-panel bg-white/70 dark:bg-[#0b0c10]/40 border border-slate-200/50 dark:border-white/5 rounded-3xl shadow-xl backdrop-blur-3xl overflow-hidden">
        <div className="flex border-b border-slate-150 dark:border-white/5 bg-slate-50/20 dark:bg-white/[0.01]">
          <button
            onClick={() => setActiveSubTab('raised')}
            className={`px-5 py-3.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeSubTab === 'raised' 
                ? 'border-[#E07A15] dark:border-[#FFAE59] text-[#E07A15] dark:text-[#FFAE59]' 
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            My Questions ({raisedThreads.length})
          </button>
          <button
            onClick={() => setActiveSubTab('resolved')}
            className={`px-5 py-3.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeSubTab === 'resolved' 
                ? 'border-[#E07A15] dark:border-[#FFAE59] text-[#E07A15] dark:text-[#FFAE59]' 
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Resolved ({resolvedQuestions.length})
          </button>
          <button
            onClick={() => setActiveSubTab('answers')}
            className={`px-5 py-3.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeSubTab === 'answers' 
                ? 'border-[#E07A15] dark:border-[#FFAE59] text-[#E07A15] dark:text-[#FFAE59]' 
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            My Answers ({answersGiven.length})
          </button>
        </div>

        {/* Tab logs list */}
        <div className="p-5 max-h-80 overflow-y-auto divide-y divide-slate-150 dark:divide-white/5">
          {activeSubTab === 'raised' && (
            raisedThreads.length === 0 ? (
              <p className="text-xs text-slate-400 font-extrabold uppercase tracking-wider text-center py-8">No questions raised yet.</p>
            ) : (
              raisedThreads.map(thread => (
                <div key={thread._id} className="py-3 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-350 hover:text-[#E07A15] dark:hover:text-[#FFAE59] transition-colors leading-relaxed">
                  • {thread.title}
                </div>
              ))
            )
          )}

          {activeSubTab === 'resolved' && (
            resolvedQuestions.length === 0 ? (
              <p className="text-xs text-slate-400 font-extrabold uppercase tracking-wider text-center py-8">No resolved guides checked.</p>
            ) : (
              resolvedQuestions.map(thread => (
                <div key={thread._id} className="py-3 text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-black leading-relaxed">
                  ✓ {thread.title}
                </div>
              ))
            )
          )}

          {activeSubTab === 'answers' && (
            answersGiven.length === 0 ? (
              <p className="text-xs text-slate-400 font-extrabold uppercase tracking-wider text-center py-8">No explanation answers posted.</p>
            ) : (
              answersGiven.map(ans => (
                <div key={ans._id} className="py-4 space-y-1.5 transition-colors">
                  <span className="text-[9px] text-[#E07A15] dark:text-[#FFAE59] block font-black uppercase tracking-wider">On FAQ Question: "{ans.threadTitle}"</span>
                  <p className="text-xs text-slate-750 dark:text-slate-300 font-semibold italic bg-slate-50 dark:bg-white/[0.01] p-3 rounded-2xl border border-slate-200/50 dark:border-white/5 leading-relaxed">
                    "{ans.body}"
                  </p>
                </div>
              ))
            )
          )}
        </div>
      </div>

    </div>
  );
};

export default Profile;
