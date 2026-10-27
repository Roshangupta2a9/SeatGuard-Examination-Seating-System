import React, { useState } from 'react';
import { Classroom } from '../types';
import { soundEffects } from '../utils/audioFeedback';
import {
  Building2,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Layers,
  Users,
  CheckCircle2,
  X,
} from 'lucide-react';

interface ClassroomInputViewProps {
  classrooms: Classroom[];
  onAddClassroom: (classroom: Classroom) => void;
  onUpdateClassroom: (id: string, updated: Partial<Classroom>) => void;
  onDeleteClassroom: (id: string) => void;
  onLoadSample: () => void;
  onClearClassrooms: () => void;
}

export const ClassroomInputView: React.FC<ClassroomInputViewProps> = ({
  classrooms,
  onAddClassroom,
  onUpdateClassroom,
  onDeleteClassroom,
  onLoadSample,
  onClearClassrooms,
}) => {
  const [roomName, setRoomName] = useState('');
  const [benches, setBenches] = useState<number>(15);

  // Edit modal
  const [editingRoom, setEditingRoom] = useState<Classroom | null>(null);
  const [editName, setEditName] = useState('');
  const [editBenches, setEditBenches] = useState<number>(15);

  const totalBenches = classrooms.reduce((sum, c) => sum + (Number(c.benches) || 0), 0);
  const totalCapacity = totalBenches * 2; // 1 Bench = 2 Students

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || benches <= 0) return;

    soundEffects.snap();
    onAddClassroom({
      id: `cls-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: roomName.trim(),
      benches: Number(benches),
    });

    setRoomName('');
    setBenches(15);
  };

  const handleOpenEdit = (c: Classroom) => {
    soundEffects.click();
    setEditingRoom(c);
    setEditName(c.name);
    setEditBenches(c.benches);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom || !editName.trim() || editBenches <= 0) return;

    soundEffects.snap();
    onUpdateClassroom(editingRoom.id, {
      name: editName.trim(),
      benches: Number(editBenches),
    });
    setEditingRoom(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800 font-mono">
              INPUT 2
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Classrooms with Bench Count
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manually enter the classrooms and total benches available. Each bench seats 2 students (Seat 1: Left, Seat 2: Right).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onLoadSample}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Load Sample Classrooms (Room 101 & 102)</span>
          </button>

          {classrooms.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Clear all entered classrooms?')) {
                  onClearClassrooms();
                }
              }}
              className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* 3 Calculated Capacity Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-400 block">Total Classrooms</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{classrooms.length}</span>
            <span className="text-xs text-slate-400">rooms entered</span>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-400 block">Total Benches</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-blue-700">{totalBenches}</span>
            <span className="text-xs text-slate-400">benches across rooms</span>
          </div>
        </div>

        <div className="p-5 bg-gradient-to-br from-purple-50 to-indigo-50/40 rounded-2xl border border-purple-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900 block">Total Calculated Capacity</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-200 text-purple-900 font-bold">
              Total Benches × 2
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-purple-950">{totalCapacity}</span>
            <span className="text-xs text-purple-700 font-semibold">Student Seats</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Add Classroom Form + Table of Classrooms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Classroom Form */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-700" />
            <span>Enter Classroom & Benches</span>
          </h3>

          <form onSubmit={handleAddRoom} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Classroom Name / Number *
              </label>
              <input
                type="text"
                placeholder="e.g. Room 101, Hall A"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Total Number of Benches available *
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={benches}
                onChange={(e) => setBenches(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white font-mono"
                required
              />
            </div>

            {/* Calculated Room Capacity Banner */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 font-mono text-xs flex items-center justify-between">
              <span>Calculated Room Capacity:</span>
              <strong className="text-sm text-blue-950">{benches * 2} Students</strong>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-blue-800 text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Classroom</span>
            </button>
          </form>

          <p className="text-[11px] text-slate-400 leading-relaxed pt-2 border-t border-slate-100">
            * Note: Seating will fill sequentially starting from Classroom 1, Bench 1 to its last bench, then move to Classroom 2.
          </p>
        </div>

        {/* Table of Classrooms */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-sm text-slate-900">
              Configured Classrooms ({classrooms.length})
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Filling Order: Top to Bottom
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                <tr>
                  <th className="py-2.5 px-3 w-16 text-center font-mono">Order</th>
                  <th className="py-2.5 px-3">Classroom Name / Number</th>
                  <th className="py-2.5 px-3 text-center">Available Benches</th>
                  <th className="py-2.5 px-3 text-center">Capacity (Benches × 2)</th>
                  <th className="py-2.5 px-3 w-20 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classrooms.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No classrooms entered yet. Add a classroom above or click "Load Sample Classrooms".
                    </td>
                  </tr>
                ) : (
                  classrooms.map((c, idx) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center font-mono font-bold text-purple-700">
                        #{idx + 1}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900 text-sm">
                        {c.name}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-semibold text-slate-800">
                        {c.benches} benches
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-blue-700">
                        {c.benches * 2} students
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                            title="Edit classroom"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              soundEffects.click();
                              onDeleteClassroom(c.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Delete classroom"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Classroom Modal */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 relative">
            <button
              onClick={() => setEditingRoom(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-slate-900">
              Edit Classroom Details
            </h3>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Classroom Name / Number
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Total Number of Benches
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={editBenches}
                  onChange={(e) => setEditBenches(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                  required
                />
              </div>

              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-950 font-mono text-xs">
                Capacity: <strong>{editBenches * 2} Students</strong>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
