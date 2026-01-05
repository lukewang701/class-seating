export interface ClassData {
  name: string;
  teacherName: string;
  rows: number;
  cols: number;
  students: string[];
  seatingArrangement: Record<string, string>; // seatId -> studentName
  lockedSeats: Set<string>; // seatIds
  studentTitles: Record<string, string[]>; // studentName -> titles[]
  officerTags: string[];
  teacherTags: string[];
  officerTagsUsage: Record<string, number>;
  teacherTagsUsage: Record<string, number>;
  customOfficerTags: string[];
  customTeacherTags: string[];
}

export type Page = 'settings' | 'students' | 'roles' | 'seating' | 'teacherView';

export interface SavedData {
  version: string;
  timestamp: string;
  classData: {
    name: string;
    teacherName: string;
    rows: number;
    cols: number;
    students: string[];
    seatingArrangement: Record<string, string>;
    lockedSeats: string[]; // Set converted to Array for JSON
    studentTitles: Record<string, string[]>;
    officerTags: string[];
    teacherTags: string[];
    officerTagsUsage: Record<string, number>;
    teacherTagsUsage: Record<string, number>;
    customOfficerTags?: string[];
    customTeacherTags?: string[];
  };
  currentPage: Page;
}

export interface Tag {
  name: string;
  type: 'officer' | 'teacher';
}
