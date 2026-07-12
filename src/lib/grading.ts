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
