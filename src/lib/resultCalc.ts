// রেজাল্ট হিসাবের কেন্দ্রীয় লজিক — Admin, Teacher ও Student ড্যাশবোর্ড তিন জায়গাতেই এটা ব্যবহার হয়,
// যাতে একই শিক্ষার্থীর GPA/স্ট্যাটাস সব পেজে একই রকম দেখায়।
// এই ফাইলে server-only কিছু import করা যাবে না (ক্লায়েন্ট কম্পোনেন্ট থেকেও import হয়)।

/** ৪র্থ বিষয় (Economics) এ ২.০০-এর উপরের গ্রেড পয়েন্ট মূল GPA-তে যোগ হবে কিনা (বাংলাদেশ বোর্ডের নিয়ম)।
 *  false করলে ৪র্থ বিষয় পাস করলেও GPA-তে কোনো প্রভাব ফেলবে না। */
export const FOURTH_SUBJECT_BONUS_ENABLED = true;

// ---------------------------------------------------------------------------
// অনুপস্থিত (Absent) ইনপুট
// ---------------------------------------------------------------------------

const ABSENT_TOKENS = new Set(["a", "ab", "abs", "absent", "অনুপস্থিত", "অনুপস্থিতি"]);

/** শিক্ষক নম্বরের ঘরে A / absent / অনুপস্থিত লিখলে true */
export function isAbsentInput(value: string | null | undefined): boolean {
  if (value == null) return false;
  return ABSENT_TOKENS.has(String(value).trim().toLowerCase());
}

/** বাংলা সংখ্যা (০-৯) কে ইংরেজি সংখ্যায় বদলে নম্বর পার্স করে। অনুপস্থিত বা ফাঁকা হলে value = 0 */
export function parseMarkInput(value: string | null | undefined): { value: number; absent: boolean } {
  if (value == null) return { value: 0, absent: false };
  const raw = String(value).trim();
  if (raw === "") return { value: 0, absent: false };
  if (isAbsentInput(raw)) return { value: 0, absent: true };

  const banglaDigits = "০১২৩৪৫৬৭৮৯";
  const normalized = raw.replace(/[০-৯]/g, (d) => String(banglaDigits.indexOf(d)));
  const num = Number(normalized);
  return { value: Number.isFinite(num) && num >= 0 ? num : 0, absent: false };
}

// ---------------------------------------------------------------------------
// ৪র্থ বিষয় (Economics)
// ---------------------------------------------------------------------------

/** বিষয়ের নাম দেখে ৪র্থ বিষয় (Economics / অর্থনীতি) কিনা চেনে */
export function isFourthSubjectName(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  return n.includes("economics") || name.includes("অর্থনীতি");
}

// ---------------------------------------------------------------------------
// সামগ্রিক (Overall) ফলাফল
// ---------------------------------------------------------------------------

export type SubjectResultLike = {
  student_id?: string;
  letter_grade?: string | null;
  grade_point?: number | string | null;
  is_absent?: boolean | null;
  total_marks?: number | string | null;
  subjects?: { name?: string | null } | null;
};

export type OverallStatus = "Passed" | "Fail" | "Absent" | "Pending";

export type OverallResult = {
  /** "4.50" অথবা "N/A" (কোনো অনুমোদিত রেজাল্ট না থাকলে) */
  gpa: string;
  /** A+, A, A-, B, C, D, F অথবা "N/A" */
  grade: string;
  status: OverallStatus;
  /** মেধা তালিকা সাজানোর জন্য সংখ্যাসূচক GPA (Fail/Absent/Pending হলে 0) */
  gpaNumber: number;
  /** সকল বিষয়ের মোট নম্বর (ট্রাই-ব্রেকারের জন্য) */
  totalMarks: number;
};

export function gradeFromGpa(gpa: number): string {
  if (gpa >= 5.0) return "A+";
  if (gpa >= 4.0) return "A";
  if (gpa >= 3.5) return "A-";
  if (gpa >= 3.0) return "B";
  if (gpa >= 2.0) return "C";
  if (gpa >= 1.0) return "D";
  return "F";
}

function isFailedRow(r: SubjectResultLike): boolean {
  return !!r.is_absent || String(r.letter_grade || "").trim().toUpperCase() === "F";
}

/**
 * একজন শিক্ষার্থীর একটি পরীক্ষার সব বিষয়ের (অনুমোদিত) রেজাল্ট থেকে সামগ্রিক GPA, গ্রেড ও স্ট্যাটাস বের করে।
 *
 * নিয়ম:
 *  - বাধ্যতামূলক বিষয়ের যেকোনোটিতে অনুপস্থিত → status = "Absent", GPA 0.00, গ্রেড F
 *  - বাধ্যতামূলক বিষয়ের যেকোনোটিতে F → status = "Fail", GPA 0.00, গ্রেড F
 *  - ৪র্থ বিষয়ে (Economics) F বা অনুপস্থিত হলে মূল রেজাল্ট Pass-ই থাকবে; ওই বিষয় GPA থেকে বাদ যাবে
 *  - ৪র্থ বিষয়ে পাস করলে (এবং FOURTH_SUBJECT_BONUS_ENABLED হলে) গ্রেড পয়েন্টের ২.০০-এর উপরের অংশ যোগ হবে,
 *    ভাগ হবে শুধু বাধ্যতামূলক বিষয়ের সংখ্যা দিয়ে; GPA সর্বোচ্চ 5.00
 */
export function computeOverallResult(rows: SubjectResultLike[]): OverallResult {
  const pending: OverallResult = { gpa: "N/A", grade: "N/A", status: "Pending", gpaNumber: 0, totalMarks: 0 };
  if (!rows || rows.length === 0) return pending;

  const compulsory = rows.filter((r) => !isFourthSubjectName(r.subjects?.name));
  const fourth = rows.filter((r) => isFourthSubjectName(r.subjects?.name));

  // শুধু ৪র্থ বিষয়ের রেজাল্ট অনুমোদিত হয়ে থাকলে মূল ফলাফল এখনও অপেক্ষমান
  if (compulsory.length === 0) return pending;

  const totalMarks = rows.reduce((sum, r) => sum + (Number(r.total_marks) || 0), 0);

  if (compulsory.some((r) => !!r.is_absent)) {
    return { gpa: "0.00", grade: "F", status: "Absent", gpaNumber: 0, totalMarks };
  }
  if (compulsory.some(isFailedRow)) {
    return { gpa: "0.00", grade: "F", status: "Fail", gpaNumber: 0, totalMarks };
  }

  let points = compulsory.reduce((sum, r) => sum + (Number(r.grade_point) || 0), 0);

  if (FOURTH_SUBJECT_BONUS_ENABLED && fourth.length > 0) {
    const f = fourth[0];
    if (!isFailedRow(f)) {
      points += Math.max(0, (Number(f.grade_point) || 0) - 2);
    }
  }

  const gpaNumber = Math.min(5, Math.round((points / compulsory.length) * 100) / 100);
  return {
    gpa: gpaNumber.toFixed(2),
    grade: gradeFromGpa(gpaNumber),
    status: "Passed",
    gpaNumber,
    totalMarks,
  };
}

/** UI-তে দেখানোর জন্য স্ট্যাটাসের বাংলা/ইংরেজি লেবেল */
export function statusLabel(status: OverallStatus): string {
  switch (status) {
    case "Passed":
      return "পাস (Passed)";
    case "Fail":
      return "অকৃতকার্য (Fail)";
    case "Absent":
      return "অনুপস্থিত (Absent)";
    default:
      return "অপেক্ষমান (Pending)";
  }
}

/** মেধাক্রম: Passed হলে GPA বেশি আগে, সমান হলে মোট নম্বর বেশি আগে; Fail/Absent/Pending সবার শেষে */
export function compareMerit(a: OverallResult, b: OverallResult): number {
  const rank = (s: OverallStatus) => (s === "Passed" ? 0 : s === "Fail" ? 1 : s === "Absent" ? 2 : 3);
  if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
  if (b.gpaNumber !== a.gpaNumber) return b.gpaNumber - a.gpaNumber;
  return b.totalMarks - a.totalMarks;
}
