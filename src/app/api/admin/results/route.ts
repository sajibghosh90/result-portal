import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSession } from "@/lib/session";

// এডমিন প্যানেলে submitted (অনুমোদনের অপেক্ষায়) রেজাল্ট দেখার জন্য
// Exam Type ও Class দিয়ে ফিল্টার করা যায়

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 401 });
  }

  const examType = req.nextUrl.searchParams.get("examType");
  const studentClass = req.nextUrl.searchParams.get("class");
  const status = req.nextUrl.searchParams.get("status") || "submitted";

  if (!examType || !studentClass) {
    return NextResponse.json(
      { error: "Class ও Exam Type উল্লেখ করা জরুরি।" },
      { status: 400 }
    );
  }

  // প্রথমে ওই class এর ছাত্র/ছাত্রীদের id বের করা
  const { data: students, error: studentsError } = await supabaseAdmin
    .from("students")
    .select("id, name, roll_number, section, group_type")
    .eq("class", studentClass);

  if (studentsError) {
    return NextResponse.json(
      { error: "ছাত্র/ছাত্রীদের তালিকা আনতে সমস্যা হয়েছে।" },
      { status: 500 }
    );
  }

  type StudentInfo = {
    id: string;
    name: string;
    roll_number: string;
    section: string | null;
    group_type: string;
  };

  const studentMap: Record<string, StudentInfo> = {};
  (students || []).forEach((s) => {
    studentMap[s.id] = s as StudentInfo;
  });
  const studentIds = (students || []).map((s) => s.id);

  if (studentIds.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const { data: results, error } = await supabaseAdmin
    .from("results")
    .select("id, student_id, subject_id, total_marks, grade, grade_point, status, subjects(name)")
    .eq("exam_type", examType)
    .eq("status", status)
    .in("student_id", studentIds)
    .order("student_id", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "রেজাল্ট আনতে সমস্যা হয়েছে।" },
      { status: 500 }
    );
  }

  const enriched = (results || []).map((r) => ({
    ...r,
    student: studentMap[r.student_id],
  }));

  return NextResponse.json({ results: enriched });
}
