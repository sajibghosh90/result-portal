import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSession } from "@/lib/session";

// ছাত্র/ছাত্রী সংক্রান্ত সব write অপারেশন (Add, Promote, Roll আপডেট, Delete) —
// service role key দিয়ে সার্ভার থেকে চলে, browser কখনো এই key দেখে না।
// এডমিন ড্যাশবোর্ডের আগের লজিক হুবহু অক্ষুণ্ণ রেখে শুধু জায়গা বদলানো হয়েছে।

// সেশন ফরম্যাট: 2025-26 অথবা 2025-2026
const SESSION_RE = /^\d{4}-(\d{2}|\d{4})$/;

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

    if (action === "add") {
      const { name, rollNumber, studentClass, groupType, session: sessionName, fourthSubjectId } = body;
      if (!name || !rollNumber || !studentClass || !groupType) {
        return NextResponse.json(
          { error: "সব তথ্য দিতে হবে।" },
          { status: 400 }
        );
      }
      const sessionTrim = sessionName ? String(sessionName).trim() : "";
      if (sessionTrim && !SESSION_RE.test(sessionTrim)) {
        return NextResponse.json(
          { error: "সেশনের ফরম্যাট ঠিক নয়। যেমন: 2025-26" },
          { status: 400 }
        );
      }

      const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();

      const { error } = await supabaseAdmin.from("students").insert([
        {
          name: String(name).trim(),
          roll_number: String(rollNumber).trim(),
          class: String(studentClass).trim(),
          group_type: String(groupType).trim(),
          session: sessionTrim || null,
          fourth_subject_id: fourthSubjectId || null,
          pin: generatedPin,
          pin_plain: generatedPin,
        },
      ]);

      if (error) {
        return NextResponse.json(
          { error: "সেভ করতে সমস্যা: " + error.message },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true });
    }

    if (action === "promote_11_to_12") {
      const { data: class11Students, error: fetchError } = await supabaseAdmin
        .from("students")
        .select("id, class")
        .or("class.eq.11,class.eq.১১,class.eq.একাদশ");

      if (fetchError) {
        return NextResponse.json(
          { error: "শিক্ষার্থী খুঁজতে সমস্যা: " + fetchError.message },
          { status: 500 }
        );
      }
      if (!class11Students || class11Students.length === 0) {
        return NextResponse.json(
          { error: "একাদশ শ্রেণীতে কোনো শিক্ষার্থী পাওয়া যায়নি!" },
          { status: 404 }
        );
      }

      const ids = class11Students.map((s) => s.id);
      const { error: updateError } = await supabaseAdmin
        .from("students")
        .update({ class: "12", updated_at: new Date().toISOString() })
        .in("id", ids);

      if (updateError) {
        return NextResponse.json(
          { error: "প্রমোশন করতে সমস্যা: " + updateError.message },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, count: ids.length });
    }

    // বিদ্যমান শিক্ষার্থীর সেশন ও ৪র্থ বিষয় আপডেট
    if (action === "update_profile") {
      const { studentId, session: sessionName, fourthSubjectId } = body;
      if (!studentId) {
        return NextResponse.json({ error: "শিক্ষার্থী নির্বাচন করতে হবে।" }, { status: 400 });
      }
      const sessionTrim = sessionName ? String(sessionName).trim() : "";
      if (sessionTrim && !SESSION_RE.test(sessionTrim)) {
        return NextResponse.json(
          { error: "সেশনের ফরম্যাট ঠিক নয়। যেমন: 2025-26" },
          { status: 400 }
        );
      }

      const { error } = await supabaseAdmin
        .from("students")
        .update({
          session: sessionTrim || null,
          fourth_subject_id: fourthSubjectId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", studentId);

      if (error) {
        return NextResponse.json(
          { error: "আপডেট করতে সমস্যা: " + error.message },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true });
    }

    if (action === "update_roll") {
      const { studentId, newRoll } = body;
      if (!studentId || !newRoll) {
        return NextResponse.json(
          { error: "শিক্ষার্থী ও নতুন রোল দিতে হবে।" },
          { status: 400 }
        );
      }

      const { error } = await supabaseAdmin
        .from("students")
        .update({
          roll_number: String(newRoll).trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", studentId);

      if (error) {
        return NextResponse.json(
          { error: "আপডেট করতে সমস্যা: " + error.message },
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

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id দিতে হবে।" }, { status: 400 });
  }

  await supabaseAdmin.from("results").delete().eq("student_id", id);
  const { error } = await supabaseAdmin.from("students").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "ডিলিট করতে সমস্যা: " + error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
