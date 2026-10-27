import React, { useState, useRef } from 'react';
import { Student } from '../types';
import { parseStudentCSV, downloadTextFile, inferDepartmentFromRollNo } from '../utils/csvUtils';
import { soundEffects } from '../utils/audioFeedback';
import {
  Users,
  Plus,
  Trash2,
  Upload,
  Download,
  Search,
  FileText,
  AlertCircle,
  Sparkles,
  ClipboardPaste,
} from 'lucide-react';

interface StudentInputViewProps {
  students: Student[];
  onAddStudent: (student: Student) => void;
  onAddBatchStudents: (students: Student[]) => void;
  onDeleteStudent: (id: string) => void;
  onClearStudents: () => void;
  onLoadSample: () => void;
}

export const StudentInputView: React.FC<StudentInputViewProps> = ({
  students,
  onAddStudent,
  onAddBatchStudents,
  onDeleteStudent,
  onClearStudents,
  onLoadSample,
}) => {
  // Single student form
  const [rollNo, setRollNo] = useState('');
  const [name, setName] = useState('');

  // Bulk paste modal / toggle
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNo.trim() || !name.trim()) return;

    soundEffects.snap();
    onAddStudent({
      id: `std-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      rollNo: rollNo.trim(),
      name: name.trim(),
      department: inferDepartmentFromRollNo(rollNo.trim()),
    });

    setRollNo('');
    setName('');
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) return;

    soundEffects.success();
    const lines = bulkText.trim().split(/\r?\n/);
    const newStudents: Student[] = [];

    lines.forEach((line, idx) => {
      const clean = line.trim();
      if (!clean) return;

      // Handle comma or tab or space separated values
      let r = '';
      let n = '';
      if (clean.includes(',')) {
        const parts = clean.split(',');
        r = parts[0]?.trim() || '';
        n = parts.slice(1).join(',').trim() || '';
      } else if (clean.includes('\t')) {
        const parts = clean.split('\t');
        r = parts[0]?.trim() || '';
        n = parts.slice(1).join(' ').trim() || '';
      } else {
        const parts = clean.split(/\s+/);
        r = parts[0] || '';
        n = parts.slice(1).join(' ') || `Student ${idx + 1}`;
      }

      if (r && n) {
        newStudents.push({
          id: `std-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          rollNo: r,
          name: n,
          department: inferDepartmentFromRollNo(r),
        });
      }
    });

    if (newStudents.length > 0) {
      onAddBatchStudents(newStudents);
      setBulkText('');
      setShowBulkPaste(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { students: parsed, errors } = parseStudentCSV(text);
      if (errors.length > 0 && parsed.length === 0) {
        alert(errors.join('\n'));
      } else {
        soundEffects.success();
        onAddBatchStudents(parsed);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadTemplate = () => {
    const template = "Roll Number,Name\n101,Aarav Sharma\n102,Ananya Verma\n103,Aditya Gupta";
    downloadTextFile('students_sample_template.csv', template);
  };

  const filteredStudents = students.filter(
    (s) =>
      s.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Input 1 Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-purple-100 text-purple-800 font-mono">
              INPUT 1
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Student List
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Provide the list of students to be seated. Each student requires a Roll Number and Name.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              soundEffects.click();
              setShowBulkPaste(!showBulkPaste);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
          >
            <ClipboardPaste className="w-4 h-4 text-purple-700" />
            <span>{showBulkPaste ? 'Hide Bulk Paste' : 'Bulk Paste'}</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,.txt"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            <Upload className="w-4 h-4 text-slate-600" />
            <span>Upload CSV</span>
          </button>

          <button
            onClick={handleDownloadTemplate}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Download CSV Template"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={onLoadSample}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Load 50 Sample Students</span>
          </button>
        </div>
      </div>

      {/* Bulk Paste Box (Collapsible) */}
      {showBulkPaste && (
        <form onSubmit={handleBulkSubmit} className="bg-white p-5 rounded-2xl border border-purple-200 shadow-sm space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Bulk Paste Student Records (One student per line)
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Format: RollNumber, Student Name</span>
          </div>

          <textarea
            rows={5}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`101, Aarav Sharma\n102, Ananya Verma\n103, Aditya Gupta`}
            className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowBulkPaste(false)}
              className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Add Pasted Students
            </button>
          </div>
        </form>
      )}

      {/* Two-Column: Single Student Entry Form + Student List Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Single Student Manual Form */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-purple-700" />
            <span>Add Single Student</span>
          </h3>

          <form onSubmit={handleAddSingle} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Roll Number *
              </label>
              <input
                type="text"
                placeholder="e.g. 101 or 25CS001"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Student Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Aarav Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-purple-800 text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add to Student List</span>
            </button>
          </form>

          {/* Quick Stats Box */}
          <div className="pt-4 border-t border-slate-100 text-xs space-y-1.5 text-slate-500 font-mono">
            <div className="flex justify-between">
              <span>Total Students Added:</span>
              <strong className="text-slate-900">{students.length}</strong>
            </div>
          </div>
        </div>

        {/* Student Table View */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900">
                Registered Students ({students.length})
              </span>
              {students.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('Clear all students from the list?')) {
                      onClearStudents();
                    }
                  }}
                  className="text-[11px] text-rose-600 hover:underline font-semibold ml-2 cursor-pointer"
                >
                  Clear List
                </button>
              )}
            </div>

            {/* Search filter */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search roll or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-600"
              />
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-x-auto max-h-[460px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10 font-bold text-slate-700">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center font-mono">#</th>
                  <th className="py-2.5 px-3">Roll Number</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3 w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      {students.length === 0
                        ? 'No students added yet. Add a student, bulk paste, or click "Load 50 Sample Students".'
                        : 'No matching students found for search filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-purple-900">
                        {s.rollNo}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {s.name}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            soundEffects.click();
                            onDeleteStudent(s.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove student"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
