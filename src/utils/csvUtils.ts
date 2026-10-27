import * as XLSX from 'xlsx';
import { Student, BenchAssignment, BenchRowItem } from '../types';

/**
 * Extracts branch/department from roll number if not explicitly specified
 * e.g., 25TEC2CS015 -> CSE, 25TECBBA010 -> BBA, 25TEC2ME020 -> ME
 */
export function inferDepartmentFromRollNo(roll: string): string {
  const clean = roll.toUpperCase();
  if (clean.includes('CS') || clean.includes('CSE')) return 'CSE';
  if (clean.includes('BBA')) return 'BBA';
  if (clean.includes('ME') || clean.includes('MECH')) return 'ME';
  if (clean.includes('EC') || clean.includes('ECE')) return 'ECE';
  if (clean.includes('EE') || clean.includes('EEE')) return 'EE';
  if (clean.includes('CE') || clean.includes('CIVIL')) return 'CE';
  if (clean.includes('BCA')) return 'BCA';
  if (clean.includes('MBA')) return 'MBA';
  if (clean.includes('IT')) return 'IT';
  if (clean.includes('AI') || clean.includes('AIML')) return 'AI/ML';
  if (clean.includes('DS')) return 'DS';
  return 'GEN';
}

/**
 * Clean room name for display (e.g. "Room 201" -> "201" or keep "201")
 */
export function formatRoomNumberOnly(rawName: string): string {
  const clean = rawName.trim();
  const match = clean.match(/^(?:room\s*|lt\s*[-_]?\s*|hall\s*)?(\w+)$/i);
  return match ? match[1] : clean;
}

/**
 * Formats a student representation as requested:
 * "25TEC2CS015 ADITYA MISHRA (CSE)"
 */
export function formatStudentBadge(student?: Student): string {
  if (!student) return '-';
  const dept = (student.department || inferDepartmentFromRollNo(student.rollNo)).trim().toUpperCase();
  return `${student.rollNo} ${student.name} (${dept})`;
}

/**
 * Parses raw text (CSV, TSV, or comma-separated text) into Student objects
 * Supports 3 columns: RollNo, Name, Department/Branch
 */
export function parseStudentCSV(csvText: string): { students: Student[]; errors: string[]; warnings: string[] } {
  const lines = csvText.trim().split(/\r?\n/);
  const students: Student[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (lines.length === 0 || (lines.length === 1 && !lines[0].trim())) {
    return { students: [], errors: ['File or text is empty.'], warnings: [] };
  }

  // Detect header or direct data
  let startIdx = 0;
  const firstLine = lines[0].toLowerCase();
  let rollIdx = 0;
  let nameIdx = 1;
  let deptIdx = 2; // Default 3rd column as Department/Branch

  if (
    firstLine.includes('roll') ||
    firstLine.includes('name') ||
    firstLine.includes('dept') ||
    firstLine.includes('branch')
  ) {
    const headers = firstLine.split(/[,\t]/).map((h) => h.trim().replace(/^["']|["']$/g, ''));
    const detectedRoll = headers.findIndex((h) =>
      h.includes('roll') || h.includes('id') || h.includes('reg') || h.includes('no')
    );
    const detectedName = headers.findIndex((h) => h.includes('name') || h.includes('student'));
    const detectedDept = headers.findIndex((h) =>
      h.includes('dept') || h.includes('branch') || h.includes('department') || h.includes('stream') || h.includes('course')
    );

    if (detectedRoll !== -1) rollIdx = detectedRoll;
    if (detectedName !== -1) nameIdx = detectedName;
    if (detectedDept !== -1) deptIdx = detectedDept;
    startIdx = 1;
  }

  const seenRolls = new Set<string>();

  for (let i = startIdx; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Split CSV/TSV line
    const cols = rawLine.split(/[,\t]/).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    const rollNo = cols[rollIdx] || '';
    const name = cols[nameIdx] || (cols.length > 1 ? cols[1] : `Student ${i}`);
    let department = cols[deptIdx] || (cols.length >= 3 ? cols[2] : '');

    if (!rollNo || !name) {
      warnings.push(`Line ${i + 1} skipped: Missing Roll Number or Name.`);
      continue;
    }

    if (!department) {
      department = inferDepartmentFromRollNo(rollNo);
    } else {
      department = department.trim().toUpperCase();
    }

    if (seenRolls.has(rollNo.toLowerCase())) {
      warnings.push(`Duplicate roll number "${rollNo}" found at line ${i + 1}.`);
    } else {
      seenRolls.add(rollNo.toLowerCase());
    }

    students.push({
      id: `std-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      rollNo,
      name,
      department,
      branch: department,
    });
  }

  return { students, errors, warnings };
}

/**
 * Parses an Excel (.xlsx, .xls) or CSV file using FileReader & XLSX library
 */
export async function parseUploadedFile(file: File): Promise<{ students: Student[]; errors: string[]; warnings: string[] }> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv' || extension === 'txt') {
    const text = await file.text();
    return parseStudentCSV(text);
  }

  // Handle Excel spreadsheets (.xlsx, .xls)
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { students: [], errors: ['No sheet found in Excel workbook.'], warnings: [] };
    }

    const sheet = workbook.Sheets[firstSheetName];
    // Convert sheet to JSON rows
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 });
    if (!rawData || rawData.length === 0) {
      return { students: [], errors: ['Excel file has no rows.'], warnings: [] };
    }

    // Convert array of arrays to CSV text representation and parse
    const csvRows = rawData
      .map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? '').trim()).join(',') : ''))
      .filter((line) => line.length > 0);

    return parseStudentCSV(csvRows.join('\n'));
  } catch (err) {
    return {
      students: [],
      errors: [`Failed to parse Excel file: ${err instanceof Error ? err.message : String(err)}`],
      warnings: [],
    };
  }
}

/**
 * Formats assignments as the exact requested table text or line-by-line:
 * "- Room 201, Bench 1, Left: 25TEC2CS015 ADITYA MISHRA (CSE)"
 * "- Room 201, Bench 1, Right: 25TECBBA010 RAHUL SHARMA (BBA)"
 */
export function formatSeatingListAsText(assignments: BenchAssignment[]): string {
  return assignments
    .map((a) => {
      const studentFormatted = formatStudentBadge(a.student);
      return `- ${a.classroomName}, Bench ${a.benchNumber}, ${a.side}: ${studentFormatted}`;
    })
    .join('\n');
}

/**
 * Formats the exact Table representation as requested:
 * "RoomNo | BenchNo | Left Seat (RollNo-Name-Dept) | Right Seat (RollNo-Name-Dept)"
 * "201 | 1 | 25TEC2CS015 ADITYA MISHRA (CSE) | 25TECBBA010 RAHUL SHARMA (BBA)"
 */
export function formatTableOutputAsText(benchRows: BenchRowItem[]): string {
  const header = 'RoomNo | BenchNo | Left Seat (RollNo-Name-Dept) | Right Seat (RollNo-Name-Dept)';
  const rows = benchRows.map((r) => {
    const leftText = formatStudentBadge(r.leftSeat);
    const rightText = formatStudentBadge(r.rightSeat);
    const roomOnly = formatRoomNumberOnly(r.classroomName);
    return `${roomOnly} | ${r.benchNumber} | ${leftText} | ${rightText}`;
  });
  return [header, ...rows].join('\n');
}

/**
 * Formats assignments as downloadable CSV with Department
 */
export function exportBenchAssignmentsToCSV(benchRows: BenchRowItem[]): string {
  const headers = [
    'RoomNo',
    'BenchNo',
    'Left Seat (RollNo-Name-Dept)',
    'Right Seat (RollNo-Name-Dept)',
    'Left_RollNo',
    'Left_Name',
    'Left_Dept',
    'Right_RollNo',
    'Right_Name',
    'Right_Dept',
  ];

  const rows = benchRows.map((r) => [
    `"${formatRoomNumberOnly(r.classroomName)}"`,
    r.benchNumber,
    `"${formatStudentBadge(r.leftSeat)}"`,
    `"${formatStudentBadge(r.rightSeat)}"`,
    `"${r.leftSeat?.rollNo || ''}"`,
    `"${r.leftSeat?.name || ''}"`,
    `"${r.leftSeat?.department || ''}"`,
    `"${r.rightSeat?.rollNo || ''}"`,
    `"${r.rightSeat?.name || ''}"`,
    `"${r.rightSeat?.department || ''}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Downloads text or CSV file to user's computer
 */
export function downloadTextFile(filename: string, content: string, mimeType = 'text/csv;charset=utf-8;'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
