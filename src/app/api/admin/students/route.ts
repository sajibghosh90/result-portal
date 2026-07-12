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
    .select(
      "id, name, roll_number, section, class, group_type, session, pin_plain"
    )
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
    const { name, rollNumber, studentClass, section, groupType, academicSession } =
      await req.json();

    // section আপাতত অপশনাল — খালি হলে empty string হিসেবে সেভ হবে
    const sectionValue = section && section.trim() !== "" ? section.trim() : "";

    if (!name || !rollNumber || !studentClass || !groupType || !academicSession) {
      return NextResponse.json(
        { error: "নাম, Roll Number, Class, বিভাগ, ও Session — এগুলো দিতে হবে।" },
        { status: 400 }
      );
    }

    // একই Roll Number + Class এ আগে থেকে কোনো ছাত্র আছে কিনা চেক করা
    const { data: existing } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("roll_number", rollNumber)
      .eq("class", studentClass)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          error:
            "এই Roll Number ও Class এ আগে থেকেই একজন ছাত্র/ছাত্রী আছে।",
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
        class: studentClass,
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

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "কোন ছাত্র/ছাত্রীকে ডিলিট করতে হবে তা উল্লেখ করা হয়নি।" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin.from("students").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "ছাত্র/ছাত্রী ডিলিট করতে সমস্যা হয়েছে।" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
