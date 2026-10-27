import React, { useState } from 'react';
import { Student, BenchAssignment, AllocationState } from '../types';
import { soundEffects } from '../utils/audioFeedback';
import {
  Search,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Printer,
  Sparkles,
  Building2,
  Users,
} from 'lucide-react';

interface StudentFinderViewProps {
  students: Student[];
  allocation: AllocationState | null;
}

export const StudentFinderView: React.FC<StudentFinderViewProps> = ({
  students,
  allocation,
}) => {
  const [query, setQuery] = useState('');
  const [searchedText, setSearchedText] = useState('');

  const assignments = allocation?.assignments || [];

  const handleSearch = (term: string) => {
    soundEffects.click();
    setQuery(term);
    setSearchedText(term.trim().toLowerCase());
  };

  const matchedAssignment = assignments.find(
    (a) =>
      a.student.rollNo.toLowerCase() === searchedText ||
      a.student.name.toLowerCase().includes(searchedText)
  );

  const unallocatedStudent = allocation?.unallocatedStudents.find(
    (s) =>
      s.rollNo.toLowerCase() === searchedText ||
      s.name.toLowerCase().includes(searchedText)
  );

  const studentExistsInRoster = students.some(
    (s) =>
      s.rollNo.toLowerCase() === searchedText ||
      s.name.toLowerCase().includes(searchedText)
  );

  const sampleQuickRolls = students.slice(0, 6).map((s) => s.rollNo);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Search Box */}
      <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs text-center space-y-4">
        <div className="w-12 h-12 bg-purple-50 text-purple-700 rounded-2xl flex items-center justify-center mx-auto border border-purple-200">
          <Search className="w-6 h-6" />
        </div>

        <div>
          <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-purple-100 text-purple-800 font-mono">
            OUTPUT 2
          </span>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Student Seat Finder
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Enter a student's Roll Number or Name to instantly retrieve their assigned Classroom, Bench Number, and Side (Left / Right).
          </p>
        </div>

        {/* Search Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(query);
          }}
          className="max-w-md mx-auto flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Enter Roll Number or Name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs cursor-pointer transition-all"
          >
            Find Seat
          </button>
        </form>

        {/* Quick Click Sample Roll Numbers */}
        {sampleQuickRolls.length > 0 && (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-400 font-medium mr-1">Quick Select:</span>
            {sampleQuickRolls.map((roll) => (
              <button
                key={roll}
                onClick={() => handleSearch(roll)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 rounded-lg text-[11px] font-mono font-bold transition-colors cursor-pointer"
              >
                {roll}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Result Card: Seat Assigned */}
      {searchedText && matchedAssignment && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-7 space-y-6 animate-in fade-in slide-in-from-bottom-2">
          {/* Student Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                Assigned Seating Record
              </span>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                {matchedAssignment.student.name}
              </h3>
              <span className="text-xs font-mono font-bold text-slate-500">
                Roll Number: {matchedAssignment.student.rollNo}
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl self-start sm:self-auto">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Seat Confirmed</span>
            </div>
          </div>

          {/* 3 Result Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Classroom Name / Number
              </span>
              <span className="text-lg font-bold text-slate-900 block mt-1">
                {matchedAssignment.classroomName}
              </span>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-purple-700 block tracking-wider">
                Assigned Bench Number
              </span>
              <span className="text-2xl font-extrabold font-mono text-purple-950 block mt-0.5">
                Bench #{matchedAssignment.benchNumber}
              </span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Bench Side (Seat Position)
              </span>
              <span className="text-lg font-bold text-purple-800 block mt-1 uppercase font-mono">
                {matchedAssignment.side} Side ({matchedAssignment.side === 'Left' ? 'Seat 1' : 'Seat 2'})
              </span>
            </div>
          </div>

          {/* Direct Notice Line */}
          <div className="p-3.5 bg-slate-900 text-white rounded-xl text-center font-mono text-xs">
            Student <strong className="text-amber-300">{matchedAssignment.student.name}</strong> ({matchedAssignment.student.rollNo}) is assigned to <strong className="text-white">{matchedAssignment.classroomName}</strong> on <strong className="text-purple-300">Bench #{matchedAssignment.benchNumber}</strong>, sitting on the <strong className="text-white">{matchedAssignment.side} Side</strong>.
          </div>
        </div>
      )}

      {/* Result Card: Unallocated due to insufficient benches */}
      {searchedText && unallocatedStudent && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-950 space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <h3 className="font-bold text-sm">
              Student Unallocated ({unallocatedStudent.name} - Roll #{unallocatedStudent.rollNo})
            </h3>
          </div>
          <p className="text-xs text-rose-800">
            This student could not be seated because total classroom capacity has been reached. Please add more benches or another classroom in "Input 2".
          </p>
        </div>
      )}

      {/* Result Card: Not Found in Student List */}
      {searchedText && !matchedAssignment && !unallocatedStudent && (
        <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-2">
          <p className="text-sm font-bold text-slate-800">
            No student found matching "{searchedText}"
          </p>
          <p className="text-xs text-slate-500">
            Verify the Roll Number or Name. You can check the "Input 1: Student List" tab to confirm registered students.
          </p>
        </div>
      )}
    </div>
  );
};
