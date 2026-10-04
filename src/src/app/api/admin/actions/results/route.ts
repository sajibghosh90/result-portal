import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSession } from "@/lib/session";
import { parseMarkInput, isAbsentInput } from "@/lib/resultCalc";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = body.action;

    if (action === "approve_group") {
      const { resultIds } = body as { resultIds: string[] };
      if (!Array.isArray(resultIds) || resultIds.length === 0) {
        return NextResponse.json({ success: true, count: 0 });
      }

      const { error } = await supabaseAdmin
        .from("results")
        .update({ status: "approved", updated_at: new Date().toISOString() })
        .in("id", resultIds)
        .in("status", ["pending", "submitted"]);

      if (error) {
        return NextResponse.json(
          { error: "অনুমোদন করতে সমস্যা হয়েছে: " + error.message },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, count: resultIds.length });
    }

    if (action === "unlock") {
      const { subjectId, examType } = body;
      if (!subjectId || !examType) {
        return NextResponse.json(
          { error: "বিষয় ও পরীক্ষা দিতে হবে।" },
          { status: 400 }
        );
      }

      const { error } = await supabaseAdmin
        .from("results")
        .delete()
        .eq("subject_id", subjectId)
        .eq("exam_type", examType)
        .eq("status", "pending");

      if (error) {
        return NextResponse.json(
          { error: "আনলক করতে সমস্যা: " + error.message },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true });
    }

    if (action === "delete_result") {
      const { resultId } = body;
      if (!resultId) {
        return NextResponse.json({ error: "resultId দিতে হবে।" }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from("results")
        .delete()
        .eq("id", resultId);

      if (error) {
        return NextResponse.json(
          { error: "ডিলিট করতে সমস্যা: " + error.message },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true });
    }

    if (action === "edit_result") {
      const { resultId, editMcq, editCq, editPrac } = body;
      if (!resultId) {
        return NextResponse.json({ error: "resultId দিতে হবে।" }, { status: 400 });
      }

      const { data: res, error: fetchError } = await supabaseAdmin
        .from("results")
        .select("id, subject_id, subjects(name, mcq_full, cq_full, practical_full)")
        .eq("id", resultId)
        .single();

      if (fetchError || !res) {
        return NextResponse.json(
          { error: "রেজাল্ট খুঁজে পাওয়া যায়নি।" },
          { status: 404 }
        );
      }

      // ঠিক আগের মতোই grading লজিক — resultCalc.ts এর ভাগ করা ফাংশন ব্যবহার করে
      const mcqVal = parseMarkInput(editMcq).value;
      const cqVal = parseMarkInput(editCq).value;
      const pracVal = parseMarkInput(editPrac).value;
      const total = mcqVal + cqVal + pracVal;
      const isAbsent =
        isAbsentInput(editMcq) || isAbsentInput(editCq) || isAbsentInput(editPrac);

      const subjectInfo = (res as { subjects?: { name?: string; mcq_full?: number; cq_full?: number; practical_full?: number } | null }).subjects;
      const subName = subjectInfo?.name || "";
      const mcqFull = subjectInfo?.mcq_full || 0;
      const cqFull = subjectInfo?.cq_full || 0;
      const pracFull = subjectInfo?.practical_full || 0;

      const isICT = subName.toLowerCase().includes("ict") || subName.includes("আইসিটি");

      let isPassed = true;
      if (isICT) {
        if (cqVal < 17 || mcqVal < 8) isPassed = false;
      } else {
        if (cqFull === 70 && cqVal < 23) isPassed = false;
        else if (cqFull > 0 && cqFull !== 70 && cqVal < Math.floor(cqFull * 0.33))
          isPassed = false;

        if (mcqFull === 30 && mcqVal < 10) isPassed = false;
        else if (mcqFull > 0 && mcqFull !== 30 && mcqVal < Math.floor(mcqFull * 0.33))
          isPassed = false;

        if (pracFull > 0 && pracVal < Math.floor(pracFull * 0.33)) isPassed = false;
      }

      let calculatedGrade = "F";
      let calculatedPoint = 0;

      if (isAbsent || !isPassed) {
        calculatedGrade = "F";
        calculatedPoint = 0;
      } else {
        const effectiveFullMarks = isICT ? 75 : mcqFull + cqFull + pracFull;
        const percentage = (total / (effectiveFullMarks || 100)) * 100;

        if (percentage >= 80) { calculatedGrade = "A+"; calculatedPoint = 5.0; }
        else if (percentage >= 70) { calculatedGrade = "A"; calculatedPoint = 4.0; }
        else if (percentage >= 60) { calculatedGrade = "A-"; calculatedPoint = 3.5; }
        else if (percentage >= 50) { calculatedGrade = "B"; calculatedPoint = 3.0; }
        else if (percentage >= 40) { calculatedGrade = "C"; calculatedPoint = 2.0; }
        else if (percentage >= 33) { calculatedGrade = "D"; calculatedPoint = 1.0; }
      }

      const { error: updateError } = await supabaseAdmin
        .from("results")
        .update({
          mcq_marks: mcqVal,
          cq_marks: cqVal,
          practical_marks: pracVal,
          total_marks: total,
          letter_grade: calculatedGrade,
          grade_point: calculatedPoint,
          is_absent: isAbsent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", resultId);

      if (updateError) {
        return NextResponse.json(
          { error: "আপডেট করতে সমস্যা: " + updateError.message },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true });
    }

    if (action === "reset_all") {
      const { password } = body;
      if (password !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json(
          { error: "ভুল এডমিন পাসওয়ার্ড! টেস্ট ডাটা রিসেট করা হয়নি।" },
          { status: 401 }
        );
      }

      const { error } = await supabaseAdmin
        .from("results")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) {
        return NextResponse.json(
          { error: "ডাটা রিসেট করতে সমস্যা: " + error.message },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "অজানা action।" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "অজানা এরর";
    return NextResponse.json(
      { error: "সার্ভারে সমস্যা হয়েছে: " + message },
      { status: 500 }
    );
  }
}
