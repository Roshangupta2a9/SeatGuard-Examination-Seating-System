export interface Student {
  id: string;
  rollNo: string;
  name: string;
  department?: string; // Department / Branch e.g. CSE, BBA, ME
  branch?: string;
  subjectCode?: string;
}

export interface Classroom {
  id: string;
  name: string; // Classroom Name / Number (e.g. 201, Room 201)
  benches: number; // Total Number of Benches available in that classroom
}

export interface BenchAssignment {
  id: string;
  student: Student;
  classroomId: string;
  classroomName: string;
  benchNumber: number; // 1 to total benches in that classroom
  side: 'Left' | 'Right'; // Seat 1 = Left, Seat 2 = Right
}

export interface BenchRowItem {
  id: string;
  classroomId: string;
  classroomName: string;
  benchNumber: number;
  leftSeat?: Student;
  rightSeat?: Student;
}

export interface BenchGroup {
  benchNumber: number;
  leftSeat?: Student;
  rightSeat?: Student;
}

export interface AllocationState {
  assignments: BenchAssignment[];
  benchRows: BenchRowItem[];
  unallocatedStudents: Student[];
  totalStudents: number;
  totalBenches: number;
  totalCapacity: number; // Total Benches * 2
  isCapacityShort: boolean;
  departmentCounts: Record<string, number>;
  timestamp: string;
}
