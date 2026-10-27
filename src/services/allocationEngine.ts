import {
  Student,
  Classroom,
  BenchAssignment,
  BenchGroup,
  BenchRowItem,
  AllocationState,
} from '../types';
import { inferDepartmentFromRollNo } from '../utils/csvUtils';

/**
 * Normalizes a student's department/branch.
 */
function getNormalizedDept(student: Student): string {
  if (student.department && student.department.trim()) {
    return student.department.trim().toUpperCase();
  }
  if (student.branch && student.branch.trim()) {
    return student.branch.trim().toUpperCase();
  }
  return inferDepartmentFromRollNo(student.rollNo);
}

/**
 * AUTOMATED ANTI-CHEATING SEATING ALLOCATION ENGINE
 * 
 * CORE RULES:
 * 1. 2 students of the SAME department NEVER sit on the same bench (Bench Left = CSE, Right = BBA/other).
 * 2. Students of the same department should not sit directly in front or behind each other (row-wise mixing).
 * 3. If only one department exists (e.g. all CSE), alternate by RollNo groups across benches and sides
 *    so adjacent seats and vertical seats are from completely separated roll number pools.
 * 4. Process is 100% AUTOMATIC once CSV and Rooms are provided.
 */
export function runBenchSeatingAllocation(
  students: Student[],
  classrooms: Classroom[]
): AllocationState {
  const timestamp = new Date().toISOString();
  const totalBenches = classrooms.reduce((sum, c) => sum + (Number(c.benches) || 0), 0);
  const totalCapacity = totalBenches * 2; // 1 Bench = 2 Students

  const assignments: BenchAssignment[] = [];
  const benchRows: BenchRowItem[] = [];
  const unallocatedStudents: Student[] = [];

  // Group students by department
  const deptMap = new Map<string, Student[]>();
  const departmentCounts: Record<string, number> = {};

  students.forEach((s) => {
    const dept = getNormalizedDept(s);
    const updatedStudent: Student = {
      ...s,
      department: dept,
      branch: dept,
    };
    if (!deptMap.has(dept)) {
      deptMap.set(dept, []);
    }
    deptMap.get(dept)!.push(updatedStudent);
    departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
  });

  const uniqueDepts = Array.from(deptMap.keys());
  let totalRemaining = students.length;

  // Track the previous bench department in the current classroom
  let prevLeftDept: string | null = null;
  let prevRightDept: string | null = null;

  // Single-department helper if only one department is present
  let singleDeptGroupA: Student[] = [];
  let singleDeptGroupB: Student[] = [];
  let isSingleDeptMode = uniqueDepts.length === 1;

  if (isSingleDeptMode) {
    const allSingle = [...(deptMap.get(uniqueDepts[0]) || [])];
    const half = Math.ceil(allSingle.length / 2);
    singleDeptGroupA = allSingle.slice(0, half);
    singleDeptGroupB = allSingle.slice(half);
  }

  // Iterate sequentially through each classroom
  for (const classroom of classrooms) {
    const benchCount = Number(classroom.benches) || 0;
    // Reset front-to-back tracking for new classroom
    prevLeftDept = null;
    prevRightDept = null;

    for (let benchNum = 1; benchNum <= benchCount; benchNum++) {
      if (totalRemaining === 0) {
        // No more students to seat
        break;
      }

      let leftStudent: Student | undefined;
      let rightStudent: Student | undefined;

      // Check if we have multiple departments with remaining students
      const activeDepts = Array.from(deptMap.entries()).filter(([_, list]) => list.length > 0);

      if (activeDepts.length === 0) {
        break;
      }

      if (activeDepts.length === 1 && !isSingleDeptMode) {
        // Transited to single remaining department
        isSingleDeptMode = true;
        const remaining = [...activeDepts[0][1]];
        deptMap.set(activeDepts[0][0], []);
        const half = Math.ceil(remaining.length / 2);
        singleDeptGroupA = remaining.slice(0, half);
        singleDeptGroupB = remaining.slice(half);
      }

      if (isSingleDeptMode) {
        // Anti-cheating for single department:
        // Alternate Group A (lower roll numbers) and Group B (higher roll numbers) across Left/Right
        // Invert sides on alternating benches so vertical neighbors are also different groups
        const invertSides = benchNum % 2 === 0;

        if (invertSides) {
          if (singleDeptGroupB.length > 0) {
            leftStudent = singleDeptGroupB.shift();
            totalRemaining--;
          } else if (singleDeptGroupA.length > 0) {
            leftStudent = singleDeptGroupA.shift();
            totalRemaining--;
          }

          if (singleDeptGroupA.length > 0) {
            rightStudent = singleDeptGroupA.shift();
            totalRemaining--;
          } else if (singleDeptGroupB.length > 0) {
            rightStudent = singleDeptGroupB.shift();
            totalRemaining--;
          }
        } else {
          if (singleDeptGroupA.length > 0) {
            leftStudent = singleDeptGroupA.shift();
            totalRemaining--;
          } else if (singleDeptGroupB.length > 0) {
            leftStudent = singleDeptGroupB.shift();
            totalRemaining--;
          }

          if (singleDeptGroupB.length > 0) {
            rightStudent = singleDeptGroupB.shift();
            totalRemaining--;
          } else if (singleDeptGroupA.length > 0) {
            rightStudent = singleDeptGroupA.shift();
            totalRemaining--;
          }
        }
      } else {
        // Multi-department Anti-Cheating Allocator
        // STEP 1: Select Left Seat student
        // Prioritize department with most students, but avoid prevLeftDept (vertical neighbor)
        const leftCandidates = activeDepts.map(([dept, list]) => {
          let score = list.length * 10;
          if (dept === prevLeftDept) score -= 50; // Vertical penalty
          if (dept === prevRightDept) score -= 15; // Diagonal penalty
          return { dept, count: list.length, score };
        });

        leftCandidates.sort((a, b) => b.score - a.score);
        const chosenLeftDept = leftCandidates[0].dept;
        const leftQueue = deptMap.get(chosenLeftDept)!;
        leftStudent = leftQueue.shift();
        totalRemaining--;

        // STEP 2: Select Right Seat student
        // RULE: MUST NOT be the same department as leftStudent (unless no other department remains)
        const remainingActive = Array.from(deptMap.entries()).filter(([_, list]) => list.length > 0);
        const differentDeptCandidates = remainingActive.filter(([dept]) => dept !== chosenLeftDept);

        let chosenRightDept: string;

        if (differentDeptCandidates.length > 0) {
          const rightCandidates = differentDeptCandidates.map(([dept, list]) => {
            let score = list.length * 10;
            if (dept === prevRightDept) score -= 50; // Vertical penalty
            if (dept === prevLeftDept) score -= 15; // Diagonal penalty
            return { dept, count: list.length, score };
          });
          rightCandidates.sort((a, b) => b.score - a.score);
          chosenRightDept = rightCandidates[0].dept;
        } else if (remainingActive.length > 0) {
          // Fallback only if no other department exists
          chosenRightDept = remainingActive[0][0];
        } else {
          chosenRightDept = '';
        }

        if (chosenRightDept) {
          const rightQueue = deptMap.get(chosenRightDept)!;
          rightStudent = rightQueue.shift();
          totalRemaining--;
        }

        // Update previous bench history for row-wise mixing
        prevLeftDept = leftStudent?.department || null;
        prevRightDept = rightStudent?.department || null;
      }

      // Record bench row
      const benchRow: BenchRowItem = {
        id: `${classroom.id}-bench-${benchNum}`,
        classroomId: classroom.id,
        classroomName: classroom.name,
        benchNumber: benchNum,
        leftSeat: leftStudent,
        rightSeat: rightStudent,
      };
      benchRows.push(benchRow);

      // Record left seat assignment
      if (leftStudent) {
        assignments.push({
          id: `${classroom.id}-b${benchNum}-left`,
          student: leftStudent,
          classroomId: classroom.id,
          classroomName: classroom.name,
          benchNumber: benchNum,
          side: 'Left',
        });
      }

      // Record right seat assignment
      if (rightStudent) {
        assignments.push({
          id: `${classroom.id}-b${benchNum}-right`,
          student: rightStudent,
          classroomId: classroom.id,
          classroomName: classroom.name,
          benchNumber: benchNum,
          side: 'Right',
        });
      }
    }

    if (totalRemaining === 0) {
      break;
    }
  }

  // Collect unallocated students (capacity shortage)
  deptMap.forEach((list) => {
    unallocatedStudents.push(...list);
  });
  if (singleDeptGroupA.length > 0) unallocatedStudents.push(...singleDeptGroupA);
  if (singleDeptGroupB.length > 0) unallocatedStudents.push(...singleDeptGroupB);

  return {
    assignments,
    benchRows,
    unallocatedStudents,
    totalStudents: students.length,
    totalBenches,
    totalCapacity,
    isCapacityShort: students.length > totalCapacity,
    departmentCounts,
    timestamp,
  };
}

/**
 * Organizes classroom assignments into clear bench units (Bench 1: Left, Right)
 */
export function getClassroomBenchGroups(
  classroom: Classroom,
  assignments: BenchAssignment[]
): BenchGroup[] {
  const benchCount = Number(classroom.benches) || 0;
  const groups: BenchGroup[] = [];

  const roomAssignments = assignments.filter((a) => a.classroomId === classroom.id);
  const leftMap = new Map<number, Student>();
  const rightMap = new Map<number, Student>();

  roomAssignments.forEach((a) => {
    if (a.side === 'Left') leftMap.set(a.benchNumber, a.student);
    if (a.side === 'Right') rightMap.set(a.benchNumber, a.student);
  });

  for (let b = 1; b <= benchCount; b++) {
    groups.push({
      benchNumber: b,
      leftSeat: leftMap.get(b),
      rightSeat: rightMap.get(b),
    });
  }

  return groups;
}

/**
 * Quick search: Find student's assigned classroom and bench number
 */
export function findStudentAssignment(
  query: string,
  assignments: BenchAssignment[]
): BenchAssignment | null {
  const clean = query.trim().toLowerCase();
  if (!clean) return null;

  return (
    assignments.find(
      (a) =>
        a.student.rollNo.toLowerCase() === clean ||
        a.student.name.toLowerCase().includes(clean) ||
        (a.student.department && a.student.department.toLowerCase() === clean)
    ) || null
  );
}
