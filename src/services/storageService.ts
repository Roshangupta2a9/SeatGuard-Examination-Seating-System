import { Student, Classroom, AllocationState } from '../types';
import { SAMPLE_STUDENTS, SAMPLE_CLASSROOMS } from '../data/demoData';
import { runBenchSeatingAllocation } from './allocationEngine';

const STORAGE_KEY = 'bench_seating_arrangement_clean_v1';

export interface AppStoredState {
  students: Student[];
  classrooms: Classroom[];
  allocation: AllocationState | null;
  lastUpdated: string;
}

export function loadInitialState(): AppStoredState {
  if (typeof window === 'undefined') {
    return {
      students: [],
      classrooms: [],
      allocation: null,
      lastUpdated: new Date().toISOString(),
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.students) && Array.isArray(parsed.classrooms)) {
        return parsed as AppStoredState;
      }
    }
  } catch (err) {
    console.error('Failed to parse saved state from localStorage:', err);
  }

  // Default is completely clean and empty (no pre-loaded sample data)
  const initialState: AppStoredState = {
    students: [],
    classrooms: [],
    allocation: null,
    lastUpdated: new Date().toISOString(),
  };

  saveState(initialState);
  return initialState;
}

export function saveState(state: AppStoredState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save state to localStorage:', err);
  }
}

export function resetToDemoState(): AppStoredState {
  const allocation = runBenchSeatingAllocation(SAMPLE_STUDENTS, SAMPLE_CLASSROOMS);
  const state: AppStoredState = {
    students: SAMPLE_STUDENTS,
    classrooms: SAMPLE_CLASSROOMS,
    allocation,
    lastUpdated: new Date().toISOString(),
  };
  saveState(state);
  return state;
}

export function clearAllState(): AppStoredState {
  const state: AppStoredState = {
    students: [],
    classrooms: [],
    allocation: null,
    lastUpdated: new Date().toISOString(),
  };
  saveState(state);
  return state;
}
