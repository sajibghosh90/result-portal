// বাংলাদেশ বোর্ডের প্রচলিত গ্রেডিং স্কেল অনুযায়ী গ্রেড ও গ্রেড পয়েন্ট বের করার ফাংশন
// পূর্ণমান সবসময় ১০০ ধরা হচ্ছে (mcq_full + cq_full + practical_full = ১০০)

export type GradeResult = {
  grade: string;
  gradePoint: number;
};

export function calculateGrade(
  totalMarks: number,
  fullMarks: number = 100
): GradeResult {
  const percentage = fullMarks > 0 ? (totalMarks / fullMarks) * 100 : 0;

  if (percentage >= 80) return { grade: "A+", gradePoint: 5.0 };
  if (percentage >= 70) return { grade: "A", gradePoint: 4.0 };
  if (percentage >= 60) return { grade: "A-", gradePoint: 3.5 };
  if (percentage >= 50) return { grade: "B", gradePoint: 3.0 };
  if (percentage >= 40) return { grade: "C", gradePoint: 2.0 };
  if (percentage >= 33) return { grade: "D", gradePoint: 1.0 };
  return { grade: "F", gradePoint: 0.0 };
}

export const EXAM_TYPES = [
  { value: "first_term", label: "First Term" },
  { value: "mid_term", label: "Mid Term" },
  { value: "year_final", label: "Year Final" },
  { value: "year_change", label: "Year Change" },
];

export const CLASS_OPTIONS = ["একাদশ", "দ্বাদশ"];

// ---------------------------------------------------------------------------
// বিষয়ভিত্তিক নম্বর → মোট, পাস/ফেল, গ্রেড ও গ্রেড পয়েন্ট (সার্ভারে শিক্ষকের সাবমিট ও এডমিনের এডিট — দুই জায়গাতেই একই লজিক)
// ---------------------------------------------------------------------------

import { isAbsentInput, parseMarkInput } from "./resultCalc";

export type SubjectScheme = {
  name?: string | null;
  mcq_full?: number | null;
  cq_full?: number | null;
  practical_full?: number | null;
};

export type MarksInput = {
  mcq?: string | number | null;
  cq?: string | number | null;
  practical?: string | number | null;
  /** শুধু লিখিত (১০০ নম্বর) বিষয়ের জন্য; না দিলে cq ধরা হয় */
  written?: string | number | null;
};

export type SubjectEvaluation = {
  mcq: number;
  cq: number;
  practical: number;
  total: number;
  isAbsent: boolean;
  isPassed: boolean;
  grade: string;
  gradePoint: number;
  /** প্রতিটি অংশের সর্বোচ্চ সীমা (এর বেশি নম্বর দেওয়া যাবে না) */
  limits: { mcq: number; cq: number; practical: number };
};

export function isICTSubject(subject: SubjectScheme): boolean {
  const n = subject.name || "";
  return n.toLowerCase().includes("ict") || n.includes("আইসিটি");
}

export function isWrittenOnlySubject(subject: SubjectScheme): boolean {
  const n = (subject.name || "").toLowerCase();
  const mcq = subject.mcq_full ?? 0;
  const prac = subject.practical_full ?? 0;
  return n.includes("english") || n.includes("ইংরেজি") || (mcq === 0 && prac === 0);
}

const toText = (v: string | number | null | undefined) => (v == null ? "" : String(v));

export function evaluateSubjectMarks(subject: SubjectScheme, input: MarksInput): SubjectEvaluation {
  const writtenOnly = isWrittenOnlySubject(subject);
  const ict = isICTSubject(subject);
  const mcqFull = subject.mcq_full || 30;
  const cqFull = subject.cq_full || 70;
  const pracFull = subject.practical_full || 0;

  let mcq = 0;
  let cq = 0;
  let practical = 0;
  let total = 0;
  let isAbsent = false;
  let isPassed = true;

  if (writtenOnly) {
    const raw = input.written != null && toText(input.written) !== "" ? input.written : input.cq;
    const w = parseMarkInput(toText(raw));
    cq = w.value;
    total = w.value;
    isAbsent = w.absent;
    if (w.value < 33) isPassed = false;
  } else {
    const m = parseMarkInput(toText(input.mcq));
    const c = parseMarkInput(toText(input.cq));
    const p = parseMarkInput(toText(input.practical));
    mcq = m.value;
    cq = c.value;
    practical = pracFull > 0 ? p.value : 0;
    total = mcq + cq + practical;
    isAbsent =
      isAbsentInput(toText(input.mcq)) || isAbsentInput(toText(input.cq)) || isAbsentInput(toText(input.practical));

    if (ict) {
      if (cq < 17 || mcq < 8) isPassed = false;
    } else {
      if (cqFull === 70 && cq < 23) isPassed = false;
      else if (cqFull > 0 && cqFull !== 70 && cq < Math.floor(cqFull * 0.33)) isPassed = false;

      if (mcqFull === 30 && mcq < 10) isPassed = false;
      else if (mcqFull > 0 && mcqFull !== 30 && mcq < Math.floor(mcqFull * 0.33)) isPassed = false;

      if (pracFull > 0 && practical < Math.floor(pracFull * 0.33)) isPassed = false;
    }
  }

  let grade = "F";
  let gradePoint = 0;
  if (!isAbsent && isPassed) {
    const effectiveFull = writtenOnly ? 100 : ict ? 75 : mcqFull + cqFull + pracFull;
    ({ grade, gradePoint } = calculateGrade(total, effectiveFull || 100));
  }

  return {
    mcq,
    cq,
    practical,
    total,
    isAbsent,
    isPassed,
    grade,
    gradePoint,
    limits: writtenOnly
      ? { mcq: 0, cq: 100, practical: 0 }
      : { mcq: mcqFull, cq: cqFull, practical: pracFull },
  };
}
