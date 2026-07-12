import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { hashPassword, generatePin } from "@/lib/password";
import { getSession } from "@/lib/session";

// এডমিন প্যানেল থেকে ছাত্র/ছাত্রী যোগ করা এবং তালিকা দেখা
// ছাত্রের জন্য পাসওয়ার্ডের বদলে অটোমেটিক ৪-সংখ্যার PIN তৈরি হয়, যা একবারই admin কে দেখানো হয়

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "teacher")) {
    return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("students")
    .select("id, name, roll_number, section, group_type, session, pin_plain")
    .order("roll_number", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "ছাত্র/ছাত্রীদের তালিকা আনতে সমস্যা হয়েছে।" },
      { status: 500 }
    );
  }

  return NextResponse.json({ students: data });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 401 });
  }

  try {
    const { name, rollNumber, section, groupType, academicSession } =
      await req.json();

    // section আপাতত অপশনাল — খালি হলে null হিসেবে সেভ হবে
    const sectionValue = section ? section : null;

    if (!name || !rollNumber || !groupType || !academicSession) {
      return NextResponse.json(
        { error: "নাম, Roll Number, বিভাগ, ও Session — এগুলো দিতে হবে।" },
        { status: 400 }
      );
    }

    // একই Roll Number + Section এ আগে থেকে কোনো ছাত্র আছে কিনা চেক করা
    let existingQuery = supabaseAdmin
      .from("students")
      .select("id")
      .eq("roll_number", rollNumber);
    existingQuery = sectionValue
      ? existingQuery.eq("section", sectionValue)
      : existingQuery.is("section", null);
    const { data: existing } = await existingQuery.maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          error:
            "এই Roll Number ও Section এ আগে থেকেই একজন ছাত্র/ছাত্রী আছে।",
        },
        { status: 409 }
      );
    }

    const plainPin = generatePin();
    const hashedPin = await hashPassword(plainPin);

    const { data: student, error } = await supabaseAdmin
      .from("students")
      .insert({
        name,
        roll_number: rollNumber,
        section: sectionValue,
        group_type: groupType,
        session: academicSession,
        pin: hashedPin,
        pin_plain: plainPin,
      })
      .select("id, name, roll_number, section")
      .single();

    if (error || !student) {
      return NextResponse.json(
        { error: "ছাত্র/ছাত্রী যোগ করতে সমস্যা হয়েছে।" },
        { status: 500 }
      );
    }

    // plainPin শুধু এই একবারই ফেরত দেওয়া হচ্ছে, ডেটাবেসে শুধু hashed ভার্সন থাকে
    return NextResponse.json({ success: true, student, plainPin });
  } catch {
    return NextResponse.json(
      { error: "সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করো।" },
      { status: 500 }
    );
  }
}
