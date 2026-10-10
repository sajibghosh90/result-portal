import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireRole } from "@/lib/session";
import { evaluateSubjectMarks, isWrittenOnlySubject, resolveSubjectScheme, type MarksInput } from "@/lib/grading";
import { EXAMS_BY_CLASS, canonicalClass, classVariants } from "@/lib/classes";
import { isCommonSubject } from "@/lib/publish";

// শিক্ষক নিজের বিষয়ের নম্বর জমা দেয়। গ্রেড/জিপিএ এখন সার্ভারে হিসাব হয় (ব্রাউজারে নয়),
// তাই কেউ ভুয়া গ্রেড পাঠাতে পারে না। জমা হওয়া রেজাল্ট "pending" থাকে — এডমিন অনুমোদনের পর শিক্ষার্থী দেখে।

export const dynamic = "force-dynamic";

type Subject = {
  id: string;
  name: string;
  group_type: string | null;
  mcq_full: number | null;
  cq_full: number | null;
  practical_full: number | null;
};

export async function POST(req: NextRequest) {
  const session = await requireRole("teacher");
  if (!session) {
    return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const examType = String(body.examType || "");
    const cls = canonicalClass(body.studentClass);
    const marks = (body.marks || {}) as Record<string, MarksInput>;

    if (!EXAMS_BY_CLASS[cls]?.includes(examType)) {
      return NextResponse.json({ error: "শ্রেণী ও পরীক্ষার নাম সঠিক নয়।" }, { status: 400 });
    }

    // শিক্ষকের বিষয় ডেটাবেস থেকে নেওয়া হয় (সেশনের পুরনো মানের উপর ভরসা নয়)
    const { data: teacher } = await supabaseAdmin
      .from("teachers")
      .select("id, subject_id, subjects(id, name, group_type, mcq_full, cq_full, practical_full)")
      .eq("id", session.userId)
      .maybeSingle();

    const subject = (teacher?.subjects as unknown as Subject | null) || null;
    if (!teacher || !subject) {
      return NextResponse.json({ error: "তোমার একাউন্টে কোনো বিষয় সেট করা নেই।" }, { status: 400 });
    }

    const { data: allStudents, error: stErr } = await supabaseAdmin
      .from("students")
      .select("id, name, roll_number, group_type")
      .in("class", classVariants(cls));
    if (stErr) {
      return NextResponse.json({ error: "শিক্ষার্থীর তালিকা আনতে সমস্যা হয়েছে।" }, { status: 500 });
    }

    const subjectGroup = (subject.group_type || "").toLowerCase().trim();
    const eligible = (allStudents || []).filter(
      (s) => isCommonSubject(subject) || (s.group_type || "").toLowerCase().trim() === subjectGroup
    );
    if (eligible.length === 0) {
      return NextResponse.json({ error: "এই শ্রেণীতে কোনো শিক্ষার্থী পাওয়া যায়নি।" }, { status: 400 });
    }

    // ডাবল সাবমিট প্রতিরোধ
    const { data: already } = await supabaseAdmin
      .from("results")
      .select("id")
      .eq("subject_id", subject.id)
      .eq("exam_type", examType)
      .in("student_id", eligible.map((s) => s.id))
      .limit(1);
    if (already && already.length > 0) {
      return NextResponse.json(
        { error: "এই শ্রেণী ও পরীক্ষার ফলাফল ইতিমধ্যে জমা দেওয়া হয়েছে। পুনরায় জমা দেওয়া যাবে না।" },
        { status: 409 }
      );
    }

    // বাংলা ১ম/২য় পত্রের জন্য শিক্ষকের "Has MCQ" চেকবক্সের মান (অন্য বিষয়ে এটি উপেক্ষিত হয়)
    const scheme = resolveSubjectScheme(subject, typeof body.hasMcq === "boolean" ? body.hasMcq : undefined);
    const writtenOnly = isWrittenOnlySubject(scheme);
    const hasPractical = (scheme.practical_full || 0) > 0;
    const rows = [];

    for (const st of eligible) {
      const m = marks[st.id];
      const blank = (v: unknown) => v === undefined || v === null || String(v).trim() === "";
      const label = `রোল ${st.roll_number} (${st.name})`;

      if (!m) {
        return NextResponse.json({ error: `${label}-এর কোনো নম্বর দেওয়া হয়নি!` }, { status: 400 });
      }
      if (writtenOnly ? blank(m.written) : blank(m.mcq) || blank(m.cq) || (hasPractical && blank(m.practical))) {
        return NextResponse.json({ error: `${label}-এর সব নম্বর ঘর পূরণ করা বাধ্যতামূলক!` }, { status: 400 });
      }

      const ev = evaluateSubjectMarks(scheme, m);
      if (ev.mcq > ev.limits.mcq || ev.cq > ev.limits.cq || ev.practical > ev.limits.practical) {
        return NextResponse.json(
          { error: `${label}-এর নম্বর বিষয়ের পূর্ণমানের চেয়ে বেশি হতে পারে না।` },
          { status: 400 }
        );
      }

      rows.push({
        student_id: st.id,
        subject_id: subject.id,
        exam_type: examType,
        mcq_marks: ev.mcq,
        cq_marks: ev.cq,
        practical_marks: ev.practical,
        total_marks: ev.total,
        letter_grade: ev.grade,
        grade_point: ev.gradePoint,
        is_absent: ev.isAbsent,
        status: "pending",
      });
    }

    const { error } = await supabaseAdmin.from("results").insert(rows);
    if (error) {
      return NextResponse.json({ error: "ফলাফল জমা দিতে সমস্যা: " + error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: rows.length });
  } catch {
    return NextResponse.json({ error: "সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করো।" }, { status: 500 });
  }
}
