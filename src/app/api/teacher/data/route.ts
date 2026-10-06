import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireRole } from "@/lib/session";
import { canonicalClass } from "@/lib/classes";

// শিক্ষক ড্যাশবোর্ডের ডেটা — শিক্ষকের নিজের তথ্য, শিক্ষার্থী (PIN ছাড়া), নিজের বিষয়ের জমা দেওয়া রেজাল্ট,
// এবং মেধা তালিকার জন্য অনুমোদিত রেজাল্ট।

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireRole("teacher");
  if (!session) {
    return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 401 });
  }

  const { data: teacher } = await supabaseAdmin
    .from("teachers")
    .select("id, name, index_number, subject_id, subjects(*)")
    .eq("id", session.userId)
    .maybeSingle();

  if (!teacher) {
    return NextResponse.json({ error: "শিক্ষক পাওয়া যায়নি।" }, { status: 401 });
  }

  const [stRes, histRes, appRes] = await Promise.all([
    supabaseAdmin
      .from("students")
      .select("id, name, roll_number, section, class, group_type, session, fourth_subject_id")
      .order("roll_number", { ascending: true }),
    teacher.subject_id
      ? supabaseAdmin
          .from("results")
          .select(
            "id, student_id, exam_type, status, created_at, letter_grade, grade_point, mcq_marks, cq_marks, practical_marks, total_marks, is_absent, students(name, roll_number, class)"
          )
          .eq("subject_id", teacher.subject_id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabaseAdmin
      .from("results")
      .select(
        "id, student_id, subject_id, exam_type, status, letter_grade, grade_point, mcq_marks, cq_marks, practical_marks, total_marks, is_absent, subjects(name)"
      )
      .eq("status", "approved"),
  ]);

  const err = [stRes, histRes, appRes].find((r) => r.error)?.error;
  if (err) {
    return NextResponse.json({ error: "ডেটা আনতে সমস্যা: " + err.message }, { status: 500 });
  }

  return NextResponse.json({
    teacher,
    students: (stRes.data || []).map((s) => ({ ...s, class: canonicalClass(s.class) })),
    historyResults: histRes.data || [],
    approvedResults: appRes.data || [],
  });
}
