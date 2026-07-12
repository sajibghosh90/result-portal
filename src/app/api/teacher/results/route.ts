import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSession } from "@/lib/session";
import { calculateGrade } from "@/lib/grading";

// শিক্ষক একসাথে একাধিক ছাত্রের নম্বর সাবমিট করে — প্রতিটার জন্য total_marks, grade, grade_point
// অটো ক্যালকুলেট হয়ে যায়। আগে থেকে result থাকলে সেটা আপডেট হয় (এবং history তে লগ হয়),
// না থাকলে নতুন তৈরি হয়।

type MarksEntry = {
  studentId: string;
  mcqMarks: number;
  cqMarks: number;
  practicalMarks: number;
};

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "teacher") {
    return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 401 });
  }

  const subjectId = (session.extra as { subjectId?: string })?.subjectId;
  if (!subjectId) {
    return NextResponse.json(
      { error: "তোমার একাউন্টে কোনো বিষয় সেট করা নেই।" },
      { status: 400 }
    );
  }

  try {
    const { examType, entries } = (await req.json()) as {
      examType: string;
      entries: MarksEntry[];
    };

    if (!examType || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: "Exam Type ও অন্তত একজন ছাত্রের নম্বর দিতে হবে।" },
        { status: 400 }
      );
    }

    // বিষয়ের পূর্ণমান আনা, গ্রেড হিসাব করার জন্য
    const { data: subject } = await supabaseAdmin
      .from("subjects")
      .select("mcq_full, cq_full, practical_full")
      .eq("id", subjectId)
      .single();

    const fullMarks =
      (subject?.mcq_full || 0) +
      (subject?.cq_full || 0) +
      (subject?.practical_full || 0) || 100;

    // আগে থেকে থাকা result গুলো একসাথে আনা (history log এর জন্য)
    const studentIds = entries.map((e) => e.studentId);
    const { data: existing } = await supabaseAdmin
      .from("results")
      .select("id, student_id, total_marks, status")
      .eq("subject_id", subjectId)
      .eq("exam_type", examType)
      .in("student_id", studentIds);

    const existingByStudent: Record<
      string,
      { id: string; total_marks: number; status: string }
    > = {};
    (existing || []).forEach((r) => {
      existingByStudent[r.student_id] = r;
    });

    let successCount = 0;
    const historyRows: {
      result_id: string;
      old_total_marks: number;
      new_total_marks: number;
      old_status: string;
      new_status: string;
      changed_by: string;
    }[] = [];

    for (const entry of entries) {
      const total =
        (entry.mcqMarks || 0) +
        (entry.cqMarks || 0) +
        (entry.practicalMarks || 0);
      const { grade, gradePoint } = calculateGrade(total, fullMarks);

      const existingRow = existingByStudent[entry.studentId];

      if (existingRow) {
        const { error: updateError } = await supabaseAdmin
          .from("results")
          .update({
            mcq_marks: entry.mcqMarks || 0,
            cq_marks: entry.cqMarks || 0,
            practical_marks: entry.practicalMarks || 0,
            total_marks: total,
            grade,
            grade_point: gradePoint,
            status: "submitted",
            submitted_by: session.userId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingRow.id);

        if (!updateError) {
          successCount++;
          historyRows.push({
            result_id: existingRow.id,
            old_total_marks: existingRow.total_marks,
            new_total_marks: total,
            old_status: existingRow.status,
            new_status: "submitted",
            changed_by: session.userId,
          });
        }
      } else {
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from("results")
          .insert({
            student_id: entry.studentId,
            subject_id: subjectId,
            exam_type: examType,
            mcq_marks: entry.mcqMarks || 0,
            cq_marks: entry.cqMarks || 0,
            practical_marks: entry.practicalMarks || 0,
            total_marks: total,
            grade,
            grade_point: gradePoint,
            status: "submitted",
            submitted_by: session.userId,
          })
          .select("id")
          .single();

        if (!insertError && inserted) {
          successCount++;
          historyRows.push({
            result_id: inserted.id,
            old_total_marks: 0,
            new_total_marks: total,
            old_status: "নতুন",
            new_status: "submitted",
            changed_by: session.userId,
          });
        }
      }
    }

    if (historyRows.length > 0) {
      await supabaseAdmin.from("result_history").insert(historyRows);
    }

    return NextResponse.json({
      success: true,
      count: successCount,
      total: entries.length,
    });
  } catch {
    return NextResponse.json(
      { error: "সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করো।" },
      { status: 500 }
    );
  }
}
