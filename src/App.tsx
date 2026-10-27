import React, { useState, useEffect, useRef } from 'react';
import { Student, Classroom, AllocationState, BenchRowItem } from './types';
import { SAMPLE_STUDENTS, SAMPLE_CLASSROOMS } from './data/demoData';
import {
  loadInitialState,
  saveState,
  resetToDemoState,
} from './services/storageService';
import {
  runBenchSeatingAllocation,
  getClassroomBenchGroups,
} from './services/allocationEngine';
import {
  parseStudentCSV,
  parseUploadedFile,
  formatStudentBadge,
  formatRoomNumberOnly,
  formatTableOutputAsText,
  formatSeatingListAsText,
  exportBenchAssignmentsToCSV,
  downloadTextFile,
  inferDepartmentFromRollNo,
} from './utils/csvUtils';
import {
  Upload,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Printer,
  RotateCcw,
  Search,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  ShieldCheck,
  Building,
  Users,
} from 'lucide-react';

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [allocation, setAllocation] = useState<AllocationState | null>(null);

  // Top confirmation banner
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

  // New room form inputs
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomBenches, setNewRoomBenches] = useState<string>('');

  // Manual single student input
  const [newRollNo, setNewRollNo] = useState('');
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('');

  // Bulk paste text input toggle
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteText, setPasteText] = useState('');

  // Output controls: default view is 'table' as requested
  const [outputView, setOutputView] = useState<'table' | 'cards' | 'text'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showStudentList, setShowStudentList] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Initialize data from storage or default to clean state
  useEffect(() => {
    try {
      localStorage.clear();
    } catch {
      // Ignore
    }

    const saved = loadInitialState();
    setStudents(saved.students || []);
    setClassrooms(saved.classrooms || []);
    setAllocation(saved.allocation || null);
    setIsInitialized(true);
  }, []);

  // 2. Persist whenever state updates
  useEffect(() => {
    if (!isInitialized) return;
    saveState({
      students,
      classrooms,
      allocation,
      lastUpdated: new Date().toISOString(),
    });
  }, [students, classrooms, allocation, isInitialized]);

  // Recalculate seating allocation automatically
  const recalculateAllocation = (currStudents: Student[], currClassrooms: Classroom[]) => {
    const result = runBenchSeatingAllocation(currStudents, currClassrooms);
    setAllocation(result);
  };

  // Reset to demo state with multi-branch sample students (CSE, BBA, ME)
  const handleLoadSampleData = () => {
    const state = resetToDemoState();
    setStudents(state.students);
    setClassrooms(state.classrooms);
    setAllocation(state.allocation);
    setConfirmationMessage('Sample multi-branch student dataset and classrooms loaded.');
  };

  // REQUIRED LOGIC FOR CLEAR ALL BUTTON:
  // 1. a) Delete all Rooms that I added in INPUT 2 (Room Number + Number of Benches)
  //    b) Reset the Room Number and Number of Benches input fields to empty
  //    c) Set Total Rooms count to 0 and Total Capacity to 0
  // 2. Show confirmation message at top: "All X Rooms cleared. Total Y benches and Z students capacity removed."
  // 3. Do NOT reload the whole page. Only clear the rooms section.
  const handleClearAll = () => {
    const numRooms = classrooms.length;
    const benches = classrooms.reduce((sum, c) => sum + (Number(c.benches) || 0), 0);
    const capacity = benches * 2;

    // a) Delete all Rooms added in INPUT 2
    setClassrooms([]);

    // b) Reset Room Number and Number of Benches input fields to empty
    setNewRoomNumber('');
    setNewRoomBenches('');

    // c) Set Total Rooms count to 0 and Total Capacity to 0
    recalculateAllocation(students, []);

    // 2. Show confirmation message at the top
    setConfirmationMessage(
      `All ${numRooms} Rooms cleared. Total ${benches} benches and ${capacity} students capacity removed.`
    );
  };

  // Clear students list
  const handleClearStudents = () => {
    const count = students.length;
    setStudents([]);
    recalculateAllocation([], classrooms);
    setConfirmationMessage(`All ${count} students removed from list.`);
  };

  // File upload handler (supports .csv, .xlsx, .xls, .txt) with 3 columns: RollNo, Name, Department/Branch
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { students: parsed, errors, warnings } = await parseUploadedFile(file);
      if (errors.length > 0 && parsed.length === 0) {
        alert(errors.join('\n'));
      } else {
        if (warnings.length > 0) {
          console.warn('File warnings:', warnings);
        }
        const updated = [...students, ...parsed];
        setStudents(updated);
        // Automatic allocation generation
        recalculateAllocation(updated, classrooms);
        setConfirmationMessage(`Imported ${parsed.length} students from ${file.name}.`);
      }
    } catch (err) {
      alert(`Error reading file: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Bulk paste submit (Supports 3 columns: RollNo, Name, Department)
  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteText.trim()) return;

    const { students: parsed } = parseStudentCSV(pasteText);
    if (parsed.length > 0) {
      const updated = [...students, ...parsed];
      setStudents(updated);
      recalculateAllocation(updated, classrooms);
      setPasteText('');
      setShowPasteBox(false);
      setConfirmationMessage(`Added ${parsed.length} students with department detection.`);
    } else {
      alert('Could not parse any students. Format: RollNo, Name, Department (one per line)');
    }
  };

  // Add single student manually with department
  const handleAddSingleStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRollNo.trim() || !newName.trim()) return;

    const detectedDept = newDept.trim()
      ? newDept.trim().toUpperCase()
      : inferDepartmentFromRollNo(newRollNo.trim());

    const newStudent: Student = {
      id: `std-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      rollNo: newRollNo.trim(),
      name: newName.trim(),
      department: detectedDept,
      branch: detectedDept,
    };
    const updated = [...students, newStudent];
    setStudents(updated);
    recalculateAllocation(updated, classrooms);
    setNewRollNo('');
    setNewName('');
    setNewDept('');
  };

  const handleDeleteStudent = (id: string) => {
    const updated = students.filter((s) => s.id !== id);
    setStudents(updated);
    recalculateAllocation(updated, classrooms);
  };

  // Add room
  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const benchesCount = parseInt(newRoomBenches, 10);
    if (!newRoomNumber.trim() || isNaN(benchesCount) || benchesCount <= 0) return;

    const rawInput = newRoomNumber.trim();
    // Keep user's entered room number clean (e.g. 201)
    const formattedName = rawInput.toLowerCase().startsWith('room')
      ? rawInput
      : `Room ${rawInput}`;

    const newRoom: Classroom = {
      id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: formattedName,
      benches: benchesCount,
    };

    const updated = [...classrooms, newRoom];
    setClassrooms(updated);
    // Automatic generation
    recalculateAllocation(students, updated);
    setNewRoomNumber('');
    setNewRoomBenches('');
  };

  const handleDeleteRoom = (id: string) => {
    const updated = classrooms.filter((c) => c.id !== id);
    setClassrooms(updated);
    recalculateAllocation(students, updated);
  };

  // Calculations
  const totalBenches = classrooms.reduce((sum, c) => sum + (Number(c.benches) || 0), 0);
  const totalCapacity = totalBenches * 2; // 1 Bench = 2 Students
  const assignments = allocation?.assignments || [];
  const benchRows = allocation?.benchRows || [];
  const unallocated = allocation?.unallocatedStudents || [];
  const departmentCounts = allocation?.departmentCounts || {};

  // Filter bench rows based on search
  const filteredBenchRows = benchRows.filter((row) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const roomMatch = row.classroomName.toLowerCase().includes(q) || `bench ${row.benchNumber}`.includes(q);
    const leftMatch =
      row.leftSeat &&
      (row.leftSeat.rollNo.toLowerCase().includes(q) ||
        row.leftSeat.name.toLowerCase().includes(q) ||
        (row.leftSeat.department && row.leftSeat.department.toLowerCase().includes(q)));
    const rightMatch =
      row.rightSeat &&
      (row.rightSeat.rollNo.toLowerCase().includes(q) ||
        row.rightSeat.name.toLowerCase().includes(q) ||
        (row.rightSeat.department && row.rightSeat.department.toLowerCase().includes(q)));
    return roomMatch || leftMatch || rightMatch;
  });

  const filteredAssignments = assignments.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      a.student.rollNo.toLowerCase().includes(q) ||
      a.student.name.toLowerCase().includes(q) ||
      (a.student.department && a.student.department.toLowerCase().includes(q)) ||
      a.classroomName.toLowerCase().includes(q) ||
      `bench ${a.benchNumber}`.includes(q)
    );
  });

  // Table output formatted as plain text
  const tableTextOutput = formatTableOutputAsText(filteredBenchRows);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(tableTextOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Failed to copy to clipboard');
    }
  };

  const handleDownloadCSV = () => {
    const csv = exportBenchAssignmentsToCSV(benchRows);
    downloadTextFile('anti_cheating_seating_arrangement.csv', csv);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* TOP HEADER BAR */}
      <header className="no-print bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Seating Arrangement System
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Anti-Cheating
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              1 Bench = 2 Students (Left / Right) · Different Departments on Same Bench
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleLoadSampleData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border border-slate-200"
              title="Load sample students and rooms"
            >
              <span>Load Sample</span>
            </button>

            {/* Clear All button on top right */}
            <button
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 hover:text-rose-800 rounded-xl transition-colors cursor-pointer border border-rose-200 shadow-2xs"
              title="Clear All Rooms and Reset Capacity"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          </div>
        </div>
      </header>

      {/* CONFIRMATION MESSAGE AT TOP */}
      {confirmationMessage && (
        <div className="no-print bg-emerald-50 border-b border-emerald-200 px-4 sm:px-8 py-3 text-emerald-950 shadow-2xs">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm font-medium">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{confirmationMessage}</span>
            </div>
            <button
              onClick={() => setConfirmationMessage(null)}
              className="text-emerald-700 hover:text-emerald-950 font-bold text-xs p-1 rounded hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
              <span>Dismiss</span>
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ======================================================== */}
        {/* INPUT SECTION                                           */}
        {/* ======================================================== */}
        <div className="no-print grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* INPUT 1: STUDENT LIST (CSV / EXCEL with 3 columns) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-900 text-white font-mono">
                    INPUT 1
                  </span>
                  <h2 className="text-sm font-bold text-slate-900">
                    Student List (CSV or Excel)
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Format: RollNo, Name, Department/Branch
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {students.length} Students
                </span>
                {students.length > 0 && (
                  <button
                    onClick={handleClearStudents}
                    className="text-slate-400 hover:text-rose-600 text-xs p-1"
                    title="Remove all students"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Department Breakdown Badges (if present) */}
            {Object.keys(departmentCounts).length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-100 text-xs font-mono">
                <span className="text-[11px] text-slate-500 font-semibold mr-1">Detected Branches:</span>
                {Object.entries(departmentCounts).map(([dept, count]) => (
                  <span
                    key={dept}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 text-[11px] font-bold"
                  >
                    <span>{dept}:</span>
                    <span className="text-purple-700">{count}</span>
                  </span>
                ))}
              </div>
            )}

            {/* File Upload Drop Area */}
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv,.xlsx,.xls,.txt"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/70 hover:bg-slate-50 p-4 rounded-xl text-center transition-all cursor-pointer group"
              >
                <div className="flex flex-col items-center gap-1.5">
                  <Upload className="w-5 h-5 text-slate-500 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold text-slate-800">
                    Upload CSV or Excel File (.csv, .xlsx, .xls)
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    3 Columns: RollNo, Name, Department (e.g. 25TEC2CS015, ADITYA MISHRA, CSE)
                  </span>
                </div>
              </button>
            </div>

            {/* Paste or Single Add Toggles */}
            <div className="flex items-center justify-between gap-2 pt-1 text-xs">
              <button
                type="button"
                onClick={() => setShowPasteBox(!showPasteBox)}
                className="text-slate-600 hover:text-slate-900 font-semibold underline cursor-pointer"
              >
                {showPasteBox ? 'Close Paste Box' : 'Or Paste Students Text Directly'}
              </button>

              {students.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowStudentList(!showStudentList)}
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                >
                  <span>{showStudentList ? 'Hide List' : 'View List'}</span>
                  {showStudentList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Paste Text Area */}
            {showPasteBox && (
              <form onSubmit={handlePasteSubmit} className="space-y-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="block text-[11px] font-semibold text-slate-700">
                    Paste rows (RollNo, Name, Department):
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">1 per line</span>
                </div>
                <textarea
                  rows={4}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`25TEC2CS015, ADITYA MISHRA, CSE\n25TECBBA010, RAHUL SHARMA, BBA\n25TEC2ME020, AMAN SINGH, ME`}
                  className="w-full p-2.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <button
                  type="submit"
                  className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  Add Pasted Students
                </button>
              </form>
            )}

            {/* Quick Single Student Add with Department */}
            <form onSubmit={handleAddSingleStudent} className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs">
              <input
                type="text"
                placeholder="Roll (e.g. 25TEC2CS015)"
                value={newRollNo}
                onChange={(e) => setNewRollNo(e.target.value)}
                className="w-1/3 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
              />
              <input
                type="text"
                placeholder="Name (e.g. ADITYA)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
              />
              <input
                type="text"
                placeholder="Dept (CSE)"
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                className="w-20 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-mono uppercase focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
              />
              <button
                type="submit"
                disabled={!newRollNo.trim() || !newName.trim()}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold disabled:opacity-40 cursor-pointer text-xs"
              >
                + Add
              </button>
            </form>

            {/* Collapsible Student List Table */}
            {showStudentList && students.length > 0 && (
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                {students.map((s, idx) => (
                  <div key={s.id} className="p-2 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 w-6 text-right">{idx + 1}.</span>
                      <span className="font-mono font-bold text-slate-900">{s.rollNo}</span>
                      <span className="text-slate-700">{s.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 font-mono">
                        {s.department || inferDepartmentFromRollNo(s.rollNo)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteStudent(s.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* INPUT 2: ROOMS WITH BENCH COUNT */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-900 text-white font-mono">
                    INPUT 2
                  </span>
                  <h2 className="text-sm font-bold text-slate-900">
                    Classrooms with Bench Count
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  1 Bench = 2 Students (Left & Right side)
                </p>
              </div>

              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {classrooms.length} Rooms
              </span>
            </div>

            {/* Add Room Form */}
            <form onSubmit={handleAddRoom} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Classroom Name / Number *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 201 or Room 201"
                    value={newRoomNumber}
                    onChange={(e) => setNewRoomNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Total Benches Available *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    placeholder="e.g. 10"
                    value={newRoomBenches}
                    onChange={(e) => setNewRoomBenches(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs"
                    required
                  />
                </div>
              </div>

              {/* Bench Capacity Note */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-mono text-[11px] flex items-center justify-between">
                <span>1 Bench = 2 Students:</span>
                <strong>
                  {parseInt(newRoomBenches, 10) > 0
                    ? `${parseInt(newRoomBenches, 10)} benches = ${parseInt(newRoomBenches, 10) * 2} capacity`
                    : '1 Bench = 2 Students'}
                </strong>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Classroom</span>
              </button>
            </form>

            {/* List of Entered Rooms */}
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs max-h-48 overflow-y-auto">
              {classrooms.length === 0 ? (
                <div className="p-4 text-center text-slate-400">
                  No rooms added yet. Enter Room Number and Number of Benches above.
                </div>
              ) : (
                classrooms.map((c, idx) => (
                  <div key={c.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-400 w-4 font-bold">{idx + 1}.</span>
                      <div>
                        <span className="font-bold text-slate-900 text-sm block">
                          {c.name}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {c.benches} benches · <strong>{c.benches * 2} students</strong>
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteRoom(c.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      title="Remove Room"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Total Capacity Summary */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">Total Available Seats:</span>
              <span className="font-bold text-slate-900">
                {totalBenches} benches = <strong className="text-purple-700">{totalCapacity} seats</strong>
              </span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* AUTOMATIC ANTI-CHEATING RULE BANNER                      */}
        {/* ======================================================== */}
        <div className="no-print bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-950 text-sm">
                  Cheating-Proof Arrangement: Different branches on same bench
                </span>
                <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 text-[10px] font-bold rounded-full uppercase">
                  Automatic
                </span>
              </div>
              <p className="text-emerald-800 text-[11px]">
                Rule 1: Left seat and Right seat on any bench belong to different departments (e.g. CSE & BBA).
                <br />
                Rule 2: Departments are alternated row-wise so same-branch students do not sit directly in front or behind.
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[11px] text-emerald-800 font-mono block">
              Seating fills sequentially:
            </span>
            <span className="text-xs font-bold text-emerald-950 font-mono">
              Room 1 → Bench 1 (L/R) → Bench 2 → Room 2
            </span>
          </div>
        </div>

        {/* CAPACITY DEFICIT WARNING (If students > capacity) */}
        {allocation?.isCapacityShort && (
          <div className="no-print bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl flex items-start gap-3 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Capacity Shortage: </strong>
              You have {students.length} students, but rooms only have {totalCapacity} seats ({unallocated.length} students unseated).
              Please add more benches or another room above to seat everyone.
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* OUTPUT: SEATING ARRANGEMENT TABLE                        */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Prominent Label on top of output as strictly requested */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-900 text-white px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-200" />
              <span className="font-bold text-sm tracking-wide">
                Cheating-Proof Arrangement: Different branches on same bench
              </span>
            </div>
            <span className="text-[11px] font-mono text-emerald-100 hidden sm:inline">
              100% Automated · No Manual Editing Required
            </span>
          </div>

          {/* Output Control Header */}
          <div className="no-print p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-900 text-white font-mono">
                  OUTPUT
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Final Seating List
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                {assignments.length} Students Seated across {classrooms.length} Classrooms ({totalBenches} Total Benches)
              </p>
            </div>

            {/* Actions: Copy, Download CSV, Print */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleCopyText}
                disabled={benchRows.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-40"
                title="Copy table text to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? 'Copied Table!' : 'Copy Table'}</span>
              </button>

              <button
                onClick={handleDownloadCSV}
                disabled={benchRows.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download CSV</span>
              </button>

              <button
                onClick={handlePrint}
                disabled={benchRows.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer disabled:opacity-40"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* Search Bar & View Mode Toggle */}
          <div className="no-print p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Room, Roll, Name, or Branch (e.g. CSE)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {/* View Mode Toggle: Table (Primary) | Bench Desks | Text List */}
            <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl text-xs self-start sm:self-auto">
              <button
                onClick={() => setOutputView('table')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  outputView === 'table'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Table View
              </button>
              <button
                onClick={() => setOutputView('cards')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  outputView === 'cards'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Desk Cards
              </button>
              <button
                onClick={() => setOutputView('text')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  outputView === 'text'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Text List
              </button>
            </div>
          </div>

          {/* VIEW 1: EXACT TABLE OUTPUT (Prompt 10 specification) */}
          {/* Columns: RoomNo | BenchNo | Left Seat (RollNo-Name-Dept) | Right Seat (RollNo-Name-Dept) */}
          {outputView === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 border-b border-slate-200 font-bold text-slate-800">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center font-mono">#</th>
                    <th className="py-3 px-4 font-mono font-bold">RoomNo</th>
                    <th className="py-3 px-4 font-mono font-bold">BenchNo</th>
                    <th className="py-3 px-4">Left Seat (RollNo-Name-Dept)</th>
                    <th className="py-3 px-4">Right Seat (RollNo-Name-Dept)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {benchRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No classrooms or students added yet. Upload CSV and enter rooms above.
                      </td>
                    </tr>
                  ) : filteredBenchRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No benches matched "{searchQuery}".
                      </td>
                    </tr>
                  ) : (
                    filteredBenchRows.map((row, idx) => {
                      const roomOnly = formatRoomNumberOnly(row.classroomName);
                      const leftFormatted = formatStudentBadge(row.leftSeat);
                      const rightFormatted = formatStudentBadge(row.rightSeat);

                      // Distinct highlight badges for branches
                      const leftDept = row.leftSeat?.department;
                      const rightDept = row.rightSeat?.department;

                      return (
                        <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-4 text-center font-mono text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-900 font-mono">
                            {roomOnly}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                            {row.benchNumber}
                          </td>

                          {/* Left Seat */}
                          <td className="py-2.5 px-4">
                            {row.leftSeat ? (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-900 font-semibold">
                                  {leftFormatted}
                                </span>
                                {leftDept && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                                    {leftDept}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">-</span>
                            )}
                          </td>

                          {/* Right Seat */}
                          <td className="py-2.5 px-4">
                            {row.rightSeat ? (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-900 font-semibold">
                                  {rightFormatted}
                                </span>
                                {rightDept && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                                    {rightDept}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW 2: VISUAL BENCH DESKS */}
          {outputView === 'cards' && (
            <div className="p-6 space-y-6">
              {classrooms.map((room) => {
                const groups = getClassroomBenchGroups(room, assignments);
                const seatedCount = assignments.filter((a) => a.classroomId === room.id).length;

                return (
                  <div key={room.id} className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Classroom: {room.name}</h3>
                        <p className="text-xs text-slate-500 font-mono">
                          {room.benches} Benches · {room.benches * 2} Total Seats
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-slate-100 text-slate-700">
                        {seatedCount} / {room.benches * 2} Seated
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {groups.map((bg) => (
                        <div
                          key={bg.benchNumber}
                          className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2 hover:border-slate-300"
                        >
                          <div className="flex items-center justify-between text-xs font-mono pb-1 border-b border-slate-100">
                            <span className="font-bold text-slate-900">Bench #{bg.benchNumber}</span>
                            <span className="text-[10px] text-emerald-700 font-bold">Anti-Cheating</span>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 text-xs">
                            {/* Left Side */}
                            <div className={`p-2 rounded-lg border ${bg.leftSeat ? 'bg-indigo-50/60 border-indigo-200 text-indigo-950' : 'bg-slate-50 border-dashed border-slate-200 text-slate-400'}`}>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[9px] uppercase font-bold text-indigo-500">
                                  Left
                                </span>
                                {bg.leftSeat?.department && (
                                  <span className="text-[9px] font-bold px-1 rounded bg-indigo-200/80 text-indigo-900 font-mono">
                                    {bg.leftSeat.department}
                                  </span>
                                )}
                              </div>
                              {bg.leftSeat ? (
                                <div>
                                  <div className="font-mono font-bold text-indigo-950 truncate text-[11px]">
                                    {bg.leftSeat.rollNo}
                                  </div>
                                  <div className="text-[11px] truncate text-slate-700">
                                    {bg.leftSeat.name}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[10px] italic">Vacant</span>
                              )}
                            </div>

                            {/* Right Side */}
                            <div className={`p-2 rounded-lg border ${bg.rightSeat ? 'bg-amber-50/60 border-amber-200 text-amber-950' : 'bg-slate-50 border-dashed border-slate-200 text-slate-400'}`}>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[9px] uppercase font-bold text-amber-600">
                                  Right
                                </span>
                                {bg.rightSeat?.department && (
                                  <span className="text-[9px] font-bold px-1 rounded bg-amber-200/80 text-amber-900 font-mono">
                                    {bg.rightSeat.department}
                                  </span>
                                )}
                              </div>
                              {bg.rightSeat ? (
                                <div>
                                  <div className="font-mono font-bold text-amber-950 truncate text-[11px]">
                                    {bg.rightSeat.rollNo}
                                  </div>
                                  <div className="text-[11px] truncate text-slate-700">
                                    {bg.rightSeat.name}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[10px] italic">Vacant</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 3: TEXT LIST */}
          {outputView === 'text' && (
            <div className="p-6">
              {assignments.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No seating list yet. Upload your CSV or Excel file and enter rooms above.
                </div>
              ) : filteredAssignments.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No student matched "{searchQuery}".
                </div>
              ) : (
                <div className="font-mono text-xs text-slate-800 space-y-1.5 bg-slate-50 p-5 rounded-xl border border-slate-200">
                  {filteredAssignments.map((a) => (
                    <div key={a.id} className="py-0.5">
                      - {a.classroomName}, Bench {a.benchNumber}, {a.side}: {formatStudentBadge(a.student)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="no-print mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Seating Arrangement System</span>
          <span className="font-mono text-[11px]">
            Input: Student CSV (RollNo, Name, Department) + Classrooms with Benches → Output: Anti-Cheating Seating Table
          </span>
        </div>
      </footer>
    </div>
  );
}
