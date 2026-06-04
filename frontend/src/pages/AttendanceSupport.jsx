import React from 'react';
import { CalendarX2, FileCheck2, PlayCircle } from 'lucide-react';
import { UnableToAttendSession } from '../components/UnableToAttendSession';

const AttendanceSupport = () => {
  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto font-sans">
      <section className="rounded-3xl border border-slate-200/50 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/5 dark:bg-[#0b0c10]/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-500">
              <CalendarX2 className="h-4 w-4" />
              Attendance Support
            </div>
            <h1 className="mt-4 text-xl font-black text-slate-900 dark:text-white">Unable to Attend Session</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Report the issue that stopped you from joining, follow the troubleshooting steps, attach proof if needed, and track the request until it is resolved.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-400">
              <FileCheck2 className="h-4 w-4 text-emerald-500" />
              Proof upload ready
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-400">
              <PlayCircle className="h-4 w-4 text-violet-500" />
              Recorded sessions on approval
            </div>
          </div>
        </div>
      </section>

      <UnableToAttendSession />
    </div>
  );
};

export default AttendanceSupport;
