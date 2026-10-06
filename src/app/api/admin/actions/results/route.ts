import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireRole } from "@/lib/session";
import { evaluateSubjectMarks } from "@/lib/grading";
import { safeEqual } from "@/lib/password";
import { LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS, clearFailures, lockedForSeconds, recordFailure, tooManyMessage } from "@/lib/rateLimit";

const requireAdmin = () => requireRole("admin");

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

      // শিক্ষকের সাবমিটের সাথে একই শেয়ার্ড গ্রেডিং লজিক (lib/grading.ts)
      const subjectInfo = (res as { subjects?: { name?: string; mcq_full?: number; cq_full?: number; practical_full?: number } | null }).subjects;
      const ev = evaluateSubjectMarks(subjectInfo || {}, { mcq: editMcq, cq: editCq, practical: editPrac });
      const mcqVal = ev.mcq;
      const cqVal = ev.cq;
      const pracVal = ev.practical;
      const total = ev.total;
      const isAbsent = ev.isAbsent;
      const calculatedGrade = ev.grade;
      const calculatedPoint = ev.gradePoint;

      if (mcqVal > ev.limits.mcq || cqVal > ev.limits.cq || pracVal > ev.limits.practical) {
        return NextResponse.json({ error: "নম্বর বিষয়ের পূর্ণমানের চেয়ে বেশি হতে পারে না।" }, { status: 400 });
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
      const rKey = `reset:${session.userId}`;
      const wait = lockedForSeconds(rKey, LOGIN_MAX_ATTEMPTS);
      if (wait > 0) {
        return NextResponse.json({ error: tooManyMessage(wait) }, { status: 429 });
      }
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword || !safeEqual(String(password ?? ""), adminPassword)) {
        recordFailure(rKey, LOGIN_WINDOW_MS);
        return NextResponse.json(
          { error: "ভুল এডমিন পাসওয়ার্ড! টেস্ট ডাটা রিসেট করা হয়নি।" },
          { status: 401 }
        );
      }
      clearFailures(rKey);

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
