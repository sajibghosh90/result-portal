import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireRole } from "@/lib/session";
import { generatePin, hashPassword } from "@/lib/password";
import { canonicalClass, classVariants } from "@/lib/classes";

// ছাত্র/ছাত্রী সংক্রান্ত সব write অপারেশন (Add, Promote, Edit, PIN রিসেট, Delete) —
// service role key দিয়ে সার্ভার থেকে চলে, browser কখনো এই key দেখে না।

// সেশন ফরম্যাট: 2025-26 অথবা 2025-2026
const SESSION_RE = /^\d{4}-(\d{2}|\d{4})$/;

async function rollTaken(rollNumber: string, cls: string, exceptId?: string) {
  let q = supabaseAdmin
    .from("students")
    .select("id")
    .eq("roll_number", rollNumber)
    .in("class", classVariants(cls));
  if (exceptId) q = q.neq("id", exceptId);
  const { data } = await q.limit(1);
  return !!data && data.length > 0;
}

export async function POST(req: NextRequest) {
  const session = await requireRole("admin");
  if (!session) {
    return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = body.action;

    if (action === "add") {
      const { name, rollNumber, studentClass, groupType, session: sessionName, fourthSubjectId } = body;
      if (!name || !rollNumber || !studentClass || !groupType) {
        return NextResponse.json({ error: "সব তথ্য দিতে হবে।" }, { status: 400 });
      }
      const sessionTrim = sessionName ? String(sessionName).trim() : "";
      if (sessionTrim && !SESSION_RE.test(sessionTrim)) {
        return NextResponse.json({ error: "সেশনের ফরম্যাট ঠিক নয়। যেমন: 2025-26" }, { status: 400 });
      }

      const roll = String(rollNumber).trim();
      const cls = canonicalClass(studentClass);
      if (await rollTaken(roll, cls)) {
        return NextResponse.json(
          { error: "এই রোল ও শ্রেণীতে আগে থেকেই একজন শিক্ষার্থী আছে।" },
          { status: 409 }
        );
      }

      // PIN: hash সেভ হয় (লগইনের জন্য); অ্যাডমিনকে দেখানোর জন্য আলাদা pin_plain
      const pin = generatePin();
      const { error } = await supabaseAdmin.from("students").insert([
        {
          name: String(name).trim(),
          roll_number: roll,
          class: cls,
          group_type: String(groupType).trim(),
          session: sessionTrim || null,
          fourth_subject_id: fourthSubjectId || null,
          pin: await hashPassword(pin),
          pin_plain: pin,
        },
      ]);

      if (error) {
        return NextResponse.json({ error: "সেভ করতে সমস্যা: " + error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, plainPin: pin });
    }

    if (action === "promote_11_to_12") {
      const { data: class11Students, error: fetchError } = await supabaseAdmin
        .from("students")
        .select("id, class")
        .in("class", classVariants("11"));

      if (fetchError) {
        return NextResponse.json({ error: "শিক্ষার্থী খুঁজতে সমস্যা: " + fetchError.message }, { status: 500 });
      }
      if (!class11Students || class11Students.length === 0) {
        return NextResponse.json({ error: "একাদশ শ্রেণীতে কোনো শিক্ষার্থী পাওয়া যায়নি!" }, { status: 404 });
      }

      const ids = class11Students.map((s) => s.id);
      const { error: updateError } = await supabaseAdmin
        .from("students")
        .update({ class: "12" })
        .in("id", ids);

      if (updateError) {
        return NextResponse.json({ error: "প্রমোশন করতে সমস্যা: " + updateError.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, count: ids.length });
    }

    // বিদ্যমান শিক্ষার্থীর রোল, সেশন ও ৪র্থ বিষয় একসাথে আপডেট
    if (action === "update_student") {
      const { studentId, rollNumber, session: sessionName, fourthSubjectId } = body;
      if (!studentId) {
        return NextResponse.json({ error: "শিক্ষার্থী নির্বাচন করতে হবে।" }, { status: 400 });
      }
      const roll = String(rollNumber ?? "").trim();
      if (!roll) {
        return NextResponse.json({ error: "রোল নম্বর ফাঁকা রাখা যাবে না।" }, { status: 400 });
      }
      const sessionTrim = sessionName ? String(sessionName).trim() : "";
      if (sessionTrim && !SESSION_RE.test(sessionTrim)) {
        return NextResponse.json({ error: "সেশনের ফরম্যাট ঠিক নয়। যেমন: 2025-26" }, { status: 400 });
      }

      const { data: current } = await supabaseAdmin
        .from("students")
        .select("id, class")
        .eq("id", studentId)
        .maybeSingle();
      if (!current) {
        return NextResponse.json({ error: "শিক্ষার্থী পাওয়া যায়নি।" }, { status: 404 });
      }
      if (await rollTaken(roll, current.class, studentId)) {
        return NextResponse.json(
          { error: "এই রোল নম্বর এই শ্রেণীতে অন্য শিক্ষার্থীর আছে।" },
          { status: 409 }
        );
      }

      const { error } = await supabaseAdmin
        .from("students")
        .update({
          roll_number: roll,
          session: sessionTrim || null,
          fourth_subject_id: fourthSubjectId || null,
        })
        .eq("id", studentId);

      if (error) {
        return NextResponse.json({ error: "আপডেট করতে সমস্যা: " + error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    // নতুন PIN তৈরি (PIN ভুলে গেলে বা ফাঁস হয়েছে সন্দেহ হলে)
    if (action === "reset_pin") {
      const { studentId } = body;
      if (!studentId) {
        return NextResponse.json({ error: "শিক্ষার্থী নির্বাচন করতে হবে।" }, { status: 400 });
      }
      const pin = generatePin();
      const { error } = await supabaseAdmin
        .from("students")
        .update({ pin: await hashPassword(pin), pin_plain: pin })
        .eq("id", studentId);
      if (error) {
        return NextResponse.json({ error: "PIN রিসেট করতে সমস্যা: " + error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, plainPin: pin });
    }

    return NextResponse.json({ error: "অজানা action।" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "অজানা এরর";
    return NextResponse.json({ error: "সার্ভারে সমস্যা হয়েছে: " + message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireRole("admin");
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
    return NextResponse.json({ error: "ডিলিট করতে সমস্যা: " + error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
