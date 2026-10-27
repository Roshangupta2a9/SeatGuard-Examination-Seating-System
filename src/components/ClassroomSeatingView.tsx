import React, { useState } from 'react';
import { Classroom, AllocationState, Student } from '../types';
import { getClassroomBenchGroups } from '../services/allocationEngine';
import { exportBenchAssignmentsToCSV, downloadTextFile } from '../utils/csvUtils';
import { soundEffects } from '../utils/audioFeedback';
import {
  Building2,
  Printer,
  Download,
  Grid,
  List,
  Search,
  CheckCircle2,
  Users,
} from 'lucide-react';

interface ClassroomSeatingViewProps {
  classrooms: Classroom[];
  allocation: AllocationState | null;
}

export const ClassroomSeatingView: React.FC<ClassroomSeatingViewProps> = ({
  classrooms,
  allocation,
}) => {
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>(
    classrooms[0]?.id || ''
  );
  const [viewMode, setViewMode] = useState<'bench-cards' | 'table'>('bench-cards');
  const [searchFilter, setSearchFilter] = useState('');

  const currentClassroom =
    classrooms.find((c) => c.id === selectedClassroomId) || classrooms[0];

  const assignments = allocation?.assignments || [];

  if (!currentClassroom || classrooms.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-sm font-semibold text-slate-500">
          No classrooms entered yet. Add classrooms in "Input 2: Classrooms" first.
        </p>
      </div>
    );
  }

  const roomAssignments = assignments.filter(
    (a) => a.classroomId === currentClassroom.id
  );
  const benchGroups = getClassroomBenchGroups(currentClassroom, assignments);

  const roomCapacity = (Number(currentClassroom.benches) || 0) * 2;
  const roomSeatedCount = roomAssignments.length;
  const occupancyPercent =
    roomCapacity > 0 ? Math.round((roomSeatedCount / roomCapacity) * 100) : 0;

  const handlePrint = () => {
    soundEffects.snap();
    window.print();
  };

  const handleExportCSV = () => {
    soundEffects.click();
    const csv = exportBenchAssignmentsToCSV(roomAssignments);
    downloadTextFile(`seating_${currentClassroom.name.replace(/\s+/g, '_')}.csv`, csv);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar (Hidden during print) */}
      <div className="no-print bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 font-mono">
                OUTPUT 1
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Classroom Bench Seating Lists
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Clear bench-by-bench seating directory showing student assignment for Left and Right seats.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              disabled={roomAssignments.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs cursor-pointer transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={roomAssignments.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-purple-800 rounded-xl shadow-sm cursor-pointer transition-colors disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Print Door Notice</span>
            </button>
          </div>
        </div>

        {/* Classroom Tabs & View Mode */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Classroom Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {classrooms.map((c) => {
              const isSelected = c.id === currentClassroom.id;
              const seated = assignments.filter((a) => a.classroomId === c.id).length;
              const cap = c.benches * 2;

              return (
                <button
                  key={c.id}
                  onClick={() => {
                    soundEffects.click();
                    setSelectedClassroomId(c.id);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-purple-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{c.name}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                      isSelected ? 'bg-purple-800 text-purple-200' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {seated}/{cap}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setViewMode('bench-cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'bench-cards'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Bench Cards</span>
            </button>

            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Classroom Status Summary Strip */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <span className="text-base font-bold text-slate-900">{currentClassroom.name}</span>
          <p className="text-slate-500 mt-0.5 font-mono">
            {currentClassroom.benches} Total Benches ({roomCapacity} Student Capacity · 1 Bench = 2 Seats)
          </p>
        </div>

        <div className="flex items-center gap-4 font-mono text-xs">
          <span>Seated: <strong className="text-purple-700">{roomSeatedCount}</strong></span>
          <span>·</span>
          <span>Vacant: <strong className="text-slate-600">{Math.max(0, roomCapacity - roomSeatedCount)}</strong></span>
          <span>·</span>
          <span>Occupancy: <strong className="text-emerald-700">{occupancyPercent}%</strong></span>
        </div>
      </div>

      {/* VIEW 1: VISUAL BENCH CARDS */}
      {viewMode === 'bench-cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {benchGroups.map((bg) => (
            <div
              key={bg.benchNumber}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3 hover:border-purple-300 transition-colors"
            >
              {/* Bench Number Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-mono text-xs font-extrabold text-slate-900">
                  Bench #{bg.benchNumber}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  2 Seats
                </span>
              </div>

              {/* Left and Right Seats */}
              <div className="grid grid-cols-2 gap-2">
                {/* Left Seat */}
                <div
                  className={`p-2.5 rounded-xl border text-left ${
                    bg.leftSeat
                      ? 'bg-purple-50/70 border-purple-200 text-purple-950'
                      : 'bg-slate-50 border-dashed border-slate-200 text-slate-400 italic text-center py-4'
                  }`}
                >
                  <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block mb-1">
                    [Seat 1: Left]
                  </span>
                  {bg.leftSeat ? (
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold font-mono text-purple-900 truncate">
                        {bg.leftSeat.rollNo}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-800 truncate">
                        {bg.leftSeat.name}
                      </div>
                    </div>
                  ) : (
                    <span className="text-[11px]">Vacant</span>
                  )}
                </div>

                {/* Right Seat */}
                <div
                  className={`p-2.5 rounded-xl border text-left ${
                    bg.rightSeat
                      ? 'bg-purple-50/70 border-purple-200 text-purple-950'
                      : 'bg-slate-50 border-dashed border-slate-200 text-slate-400 italic text-center py-4'
                  }`}
                >
                  <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block mb-1">
                    [Seat 2: Right]
                  </span>
                  {bg.rightSeat ? (
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold font-mono text-purple-900 truncate">
                        {bg.rightSeat.rollNo}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-800 truncate">
                        {bg.rightSeat.name}
                      </div>
                    </div>
                  ) : (
                    <span className="text-[11px]">Vacant</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 2: CLEAR TABLE LIST */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print-page">
          {/* Printable Classroom Door Header */}
          <div className="p-6 border-b border-slate-200 text-center space-y-1">
            <h1 className="text-lg font-bold text-slate-900 uppercase tracking-wide">
              {currentClassroom.name} — Seating Arrangement Notice
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Total Benches: {currentClassroom.benches} · Total Capacity: {roomCapacity} Students
            </p>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
              <tr>
                <th className="py-2.5 px-4 w-28 font-mono">Bench Number</th>
                <th className="py-2.5 px-4 w-28 font-mono">Seat Side</th>
                <th className="py-2.5 px-4">Student Roll Number</th>
                <th className="py-2.5 px-4">Student Name</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roomAssignments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    No students seated in this classroom yet. Click "Generate Seating" in the top bar.
                  </td>
                </tr>
              ) : (
                roomAssignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                      Bench #{a.benchNumber}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-purple-700 uppercase">
                      {a.side} Side
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                      {a.student.rollNo}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-800">
                      {a.student.name}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
