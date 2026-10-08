// রেজাল্ট প্রকাশের (Publish) কেন্দ্রীয় লজিক — এডমিন ড্যাশবোর্ড (UI) ও সার্ভার (API) দুই জায়গাতেই ব্যবহার হয়,
// যাতে "সব বিষয়ের রেজাল্ট এসেছে কিনা" হিসাব সবখানে একই থাকে।
// এই ফাইলে server-only কিছু import করা যাবে না (ক্লায়েন্ট কম্পোনেন্ট থেকেও import হয়)।

export type SubjectLite = {
  id: string;
  name: string;
  group_type?: string | null;
};

// এই বিষয়ে কোন শিক্ষার্থীরা অংশ নেবে — common/ইংরেজি/অর্থনীতি হলে সবাই, নাহলে একই group_type
export function isCommonSubject(subject: { name?: string | null; group_type?: string | null }): boolean {
  const name = (subject.name || "").toLowerCase().trim();
  const group = (subject.group_type || "").toLowerCase().trim();
  return (
    !group ||
    group === "common" ||
    group === "all" ||
    name.includes("অর্থনীতি") ||
    name.includes("economics") ||
    name.includes("english") ||
    name.includes("ইংরেজি")
  );
}

/**
 * একটি শ্রেণীর জন্য কোন কোন বিষয়ের রেজাল্ট আসতেই হবে।
 * নিয়ম: যে বিষয়ে শিক্ষক নিয়োগ দেওয়া আছে এবং ওই শ্রেণীতে অন্তত একজন শিক্ষার্থী সেই বিষয় পড়ে।
 */
export function requiredSubjects(
  teacherSubjects: SubjectLite[],
  classStudents: { group_type?: string | null }[]
): SubjectLite[] {
  const seen = new Set<string>();
  const out: SubjectLite[] = [];
  for (const sub of teacherSubjects) {
    if (!sub?.id || seen.has(sub.id)) continue;
    seen.add(sub.id);
    const group = (sub.group_type || "").toLowerCase().trim();
    const hasEligible = classStudents.some(
      (st) => isCommonSubject(sub) || (st.group_type || "").toLowerCase().trim() === group
    );
    if (hasEligible) out.push(sub);
  }
  return out;
}

/** যে বিষয়গুলোর রেজাল্ট এখনো আসেনি */
export function missingSubjects(required: SubjectLite[], presentSubjectIds: Set<string>): SubjectLite[] {
  return required.filter((s) => !presentSubjectIds.has(s.id));
}
