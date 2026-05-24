import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../utils/api';

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
      <div className="py-20 text-center text-xs text-slate-400">
        Loading profile details...
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="py-20 text-center text-xs text-slate-500 font-bold">
        Failed to load profile details. Please verify your server connection.
      </div>
    );
  }

  const { raisedThreads, resolvedQuestions, answersGiven } = profileData;

  return (
    <div className="flex-1 p-6 max-w-3xl mx-auto space-y-6 font-sans">
      
      {/* Profile Info Card */}
      <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-950 p-6 rounded-2xl shadow-sm flex items-center space-x-4">
        <div className="w-16 h-16 rounded-full bg-brand-500 flex items-center justify-center text-white text-xl font-bold capitalize">
          {user.username.charAt(0)}
        </div>
        <div>
          <h2 className="text-base font-extrabold text-slate-800 dark:text-white capitalize">{user.username}</h2>
          <span className="text-[10px] text-slate-400 block font-bold uppercase">{user.email}</span>
          <div className="mt-1.5 flex items-center space-x-2">
            <span className="bg-slate-100 dark:bg-brand-950 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
              Role: {user.role}
            </span>
            <span className="bg-brand-500/10 text-brand-500 px-2 py-0.5 rounded text-[10px] font-bold">
              SP: {user.spPoints}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-brand-900 border border-slate-200 dark:border-brand-950 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-150 dark:border-brand-950 bg-slate-50/50 dark:bg-brand-950/20">
          <button
            onClick={() => setActiveSubTab('raised')}
            className={`px-4 py-2.5 text-xs font-bold transition-colors border-b-2 ${
              activeSubTab === 'raised' 
                ? 'border-brand-500 text-brand-500' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            My Questions ({raisedThreads.length})
          </button>
          <button
            onClick={() => setActiveSubTab('resolved')}
            className={`px-4 py-2.5 text-xs font-bold transition-colors border-b-2 ${
              activeSubTab === 'resolved' 
                ? 'border-brand-500 text-brand-500' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Resolved ({resolvedQuestions.length})
          </button>
          <button
            onClick={() => setActiveSubTab('answers')}
            className={`px-4 py-2.5 text-xs font-bold transition-colors border-b-2 ${
              activeSubTab === 'answers' 
                ? 'border-brand-500 text-brand-500' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            My Answers ({answersGiven.length})
          </button>
        </div>

        {/* Tab logs */}
        <div className="p-4 max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-brand-950">
          {activeSubTab === 'raised' && (
            raisedThreads.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No questions created yet.</p>
            ) : (
              raisedThreads.map(thread => (
                <div key={thread._id} className="py-2.5 text-xs text-slate-700 dark:text-slate-350">
                  {thread.title}
                </div>
              ))
            )
          )}

          {activeSubTab === 'resolved' && (
            resolvedQuestions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No resolved questions.</p>
            ) : (
              resolvedQuestions.map(thread => (
                <div key={thread._id} className="py-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  ✓ {thread.title}
                </div>
              ))
            )
          )}

          {activeSubTab === 'answers' && (
            answersGiven.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No answers submitted.</p>
            ) : (
              answersGiven.map(ans => (
                <div key={ans._id} className="py-3 text-xs space-y-1">
                  <span className="text-[10px] text-slate-450 block font-bold">On FAQ: "{ans.threadTitle}"</span>
                  <p className="text-slate-600 dark:text-slate-300 italic">"{ans.body}"</p>
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
