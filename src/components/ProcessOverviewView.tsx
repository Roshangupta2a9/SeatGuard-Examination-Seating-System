import React from 'react';
import { Student, Classroom, AllocationState } from '../types';
import { soundEffects } from '../utils/audioFeedback';
import {
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  Grid,
  Sparkles,
} from 'lucide-react';

interface ProcessOverviewViewProps {
  students: Student[];
  classrooms: Classroom[];
  allocation: AllocationState | null;
  onRunAllocation: () => void;
  onNavigateTab: (tab: string) => void;
  onLoadSample: () => void;
}

export const ProcessOverviewView: React.FC<ProcessOverviewViewProps> = ({
  students,
  classrooms,
  allocation,
  onRunAllocation,
  onNavigateTab,
  onLoadSample,
}) => {
  const totalBenches = classrooms.reduce((sum, c) => sum + (Number(c.benches) || 0), 0);
  const totalCapacity = totalBenches * 2;
  const totalStudents = students.length;
  const allocatedCount = allocation?.assignments.length || 0;
  const isShortage = totalStudents > totalCapacity;

  return (
    <div className="space-y-6">
      {/* Hero Process Card */}
      <div className="bg-gradient-to-br from-white via-slate-50 to-purple-50/40 p-7 rounded-3xl border border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] space-y-5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-900 text-xs font-bold font-mono">
            <span>PLATFORM PROCESS ENGINE</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Bench Seating Allocation Platform
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            Takes your Student List (Roll Number & Name) and Classrooms (Bench Count), computes total capacity (Benches × 2), and fills seats sequentially from Classroom 1, Bench 1 (Left & Right) to Classroom 2.
          </p>
        </div>

        {/* 4 Steps Graphic */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
            <span className="text-[10px] font-mono font-bold text-purple-700 uppercase">Step 1</span>
            <div className="font-bold text-xs text-slate-900">Calculate Capacity</div>
            <p className="text-[11px] text-slate-500 font-mono">
              Total Benches ({totalBenches}) × 2 = <strong className="text-purple-900">{totalCapacity} seats</strong>
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
            <span className="text-[10px] font-mono font-bold text-purple-700 uppercase">Step 2</span>
            <div className="font-bold text-xs text-slate-900">Load Student List</div>
            <p className="text-[11px] text-slate-500 font-mono">
              {totalStudents} students ready for bench-wise assignment
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
            <span className="text-[10px] font-mono font-bold text-purple-700 uppercase">Step 3</span>
            <div className="font-bold text-xs text-slate-900">Bench-Wise Filling</div>
            <p className="text-[11px] text-slate-500">
              Room 1: Bench 1 (Left/Right) → Bench 2... then Room 2
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
            <span className="text-[10px] font-mono font-bold text-purple-700 uppercase">Step 4</span>
            <div className="font-bold text-xs text-slate-900">Process Ends</div>
            <p className="text-[11px] text-slate-500 font-mono">
              {allocatedCount} of {totalStudents} students seated
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 flex items-center justify-between border-t border-slate-100 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                soundEffects.success();
                onRunAllocation();
                onNavigateTab('output-1');
              }}
              disabled={students.length === 0 || classrooms.length === 0}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-xs text-white bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 cursor-pointer -translate-y-0.5 shadow-[0_12px_24px_-6px_rgba(109,40,217,0.4)] hover:-translate-y-1 hover:shadow-[0_16px_32px_-6px_rgba(109,40,217,0.5)] transition-all disabled:opacity-50 disabled:translate-y-0"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Execute Seating Allocation</span>
              <ArrowRight className="w-4 h-4 text-purple-200" />
            </button>

            <button
              onClick={onLoadSample}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Load Sample (50 Students & 2 Classrooms)</span>
            </button>
          </div>

          {isShortage && (
            <div className="flex items-center gap-2 text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Capacity Shortage: Need {totalStudents - totalCapacity} more seats</span>
            </div>
          )}
        </div>
      </div>

      {/* Classroom Filling Order Tracker */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Sequential Classroom Allocation Order
          </h3>
          <span className="text-xs text-slate-500 font-mono">1 Bench = 2 Students (Left & Right)</span>
        </div>

        <div className="space-y-3">
          {classrooms.map((c, idx) => {
            const roomSeated = (allocation?.assignments || []).filter((a) => a.classroomId === c.id).length;
            const cap = c.benches * 2;
            const isFull = roomSeated >= cap;
            const pct = cap > 0 ? Math.round((roomSeated / cap) * 100) : 0;

            return (
              <div
                key={c.id}
                className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-purple-800">
                      Step 3.{idx + 1}
                    </span>
                    <strong className="text-slate-900">{c.name}</strong>
                    <span className="text-slate-500 font-mono">({c.benches} Benches · {cap} Seats)</span>
                  </div>

                  <div className="text-right font-mono">
                    <span className="font-bold text-slate-900">{roomSeated} / {cap} Seated</span>
                    <span className="text-slate-400 ml-2">({pct}%)</span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-purple-700 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
