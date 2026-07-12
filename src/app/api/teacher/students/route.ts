import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSession } from "@/lib/session";

// শিক্ষকের নিজের বিষয়ের জন্য যোগ্য ছাত্র/ছাত্রীদের তালিকা আনে (Class অনুযায়ী ফিল্টার করে)
// একই সাথে, যদি সেই Exam Type এ আগে থেকে কোনো নম্বর দেওয়া থাকে, সেটাও ফেরত দেয় (এডিট করার জন্য)

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 401 });
  }

  const studentClass = req.nextUrl.searchParams.get("class");
  const examType = req.nextUrl.searchParams.get("examType");

  if (!studentClass || !examType) {
    return NextResponse.json(
      { error: "Class ও Exam Type উল্লেখ করা জরুরি।" },
      { status: 400 }
    );
  }

  const subjectId = (session.extra as { subjectId?: string })?.subjectId;
  if (!subjectId) {
    return NextResponse.json(
      { error: "তোমার একাউন্টে কোনো বিষয় সেট করা নেই।" },
      { status: 400 }
    );
  }

  // বিষয়ের তথ্য (group_type ও পূর্ণমান বিভাজন) আনা
  const { data: subject, error: subjectError } = await supabaseAdmin
    .from("subjects")
    .select("id, name, group_type, mcq_full, cq_full, practical_full")
    .eq("id", subjectId)
    .single();

  if (subjectError || !subject) {
    return NextResponse.json(
      { error: "বিষয়ের তথ্য আনতে সমস্যা হয়েছে।" },
      { status: 500 }
    );
  }

  // যোগ্য ছাত্র/ছাত্রী: বিষয়টা common হলে সবাই, নাহলে একই group_type এর ছাত্ররা
  let studentsQuery = supabaseAdmin
    .from("students")
    .select("id, name, roll_number, section, group_type")
    .eq("class", studentClass)
    .order("roll_number", { ascending: true });

  if (subject.group_type !== "common") {
    studentsQuery = studentsQuery.eq("group_type", subject.group_type);
  }

  const { data: students, error: studentsError } = await studentsQuery;

  if (studentsError) {
    return NextResponse.json(
      { error: "ছাত্র/ছাত্রীদের তালিকা আনতে সমস্যা হয়েছে।" },
      { status: 500 }
    );
  }

  // আগে থেকে দেওয়া নম্বর (থাকলে) আনা
  const studentIds = (students || []).map((s) => s.id);
  const { data: existingResults } = await supabaseAdmin
    .from("results")
    .select(
      "id, student_id, mcq_marks, cq_marks, practical_marks, total_marks, status"
    )
    .eq("subject_id", subjectId)
    .eq("exam_type", examType)
    .in("student_id", studentIds.length > 0 ? studentIds : [""]);

  type ExistingResult = {
    id: string;
    student_id: string;
    mcq_marks: number;
    cq_marks: number;
    practical_marks: number;
    total_marks: number;
    status: string;
  };

  const resultsByStudent: Record<string, ExistingResult> = {};
  (existingResults || []).forEach((r) => {
    resultsByStudent[r.student_id] = r as ExistingResult;
  });

  return NextResponse.json({
    subject,
    students: students || [],
    existingResults: resultsByStudent,
  });
}
