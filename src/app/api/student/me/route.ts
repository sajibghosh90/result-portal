import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireRole } from "@/lib/session";
import { canonicalClass, classVariants } from "@/lib/classes";

// লগইন করা শিক্ষার্থীর নিজের তথ্য, অনুমোদিত (approved) রেজাল্ট ও বিষয়ভিত্তিক সর্বোচ্চ নম্বর।
// প্রতিবার সার্ভার থেকে তাজা ডেটা আসে; PIN বা অন্য কারো ডেটা কখনো পাঠানো হয় না।

export const dynamic = "force-dynamic";

const STUDENT_FIELDS = "id, name, roll_number, section, class, group_type, session, fourth_subject_id";

export async function GET() {
  const session = await requireRole("student");
  if (!session) {
    return NextResponse.json({ success: false, error: "লগইন করা নেই।" }, { status: 401 });
  }

  const { data: student, error } = await supabaseAdmin
    .from("students")
    .select(STUDENT_FIELDS)
    .eq("id", session.userId)
    .maybeSingle();

  if (error || !student) {
    return NextResponse.json({ success: false, error: "শিক্ষার্থী পাওয়া যায়নি।" }, { status: 404 });
  }

  const { data: rawResults } = await supabaseAdmin
    .from("results")
    .select("*, subjects(name, mcq_full, cq_full, practical_full)")
    .eq("student_id", student.id)
    .eq("status", "approved");

  const results = (rawResults || []).map((r) => ({
    ...r,
    class: student.class,
    subjects: r.subjects || { name: "বিষয়" },
  }));

  // সর্বোচ্চ নম্বর — শুধু এই শিক্ষার্থীর শ্রেণীর, এবং শুধু তার নিজের পরীক্ষা/বিষয়ের জন্য
  const highestMarksMap: Record<string, number> = {};
  const subjectIds = [...new Set(results.map((r) => r.subject_id).filter(Boolean))];
  const examTypes = [...new Set(results.map((r) => r.exam_type).filter(Boolean))];

  if (subjectIds.length > 0 && examTypes.length > 0) {
    const { data: classResults } = await supabaseAdmin
      .from("results")
      .select("exam_type, subject_id, total_marks, students!inner(class)")
      .eq("status", "approved")
      .in("subject_id", subjectIds)
      .in("exam_type", examTypes)
      .in("students.class", classVariants(student.class));

    for (const r of classResults || []) {
      const key = `${r.exam_type}_${r.subject_id}`;
      const marks = Number(r.total_marks) || 0;
      if (highestMarksMap[key] === undefined || marks > highestMarksMap[key]) {
        highestMarksMap[key] = marks;
      }
    }
  }

  return NextResponse.json({
    success: true,
    student: { ...student, class: canonicalClass(student.class) },
    results: results.map((r) => ({ ...r, class: canonicalClass(student.class) })),
    highestMarksMap,
  });
}
