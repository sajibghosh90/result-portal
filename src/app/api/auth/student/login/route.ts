import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";

// ছাত্র/ছাত্রী লগইন — Roll Number + Class + PIN দিয়ে

export async function POST(req: NextRequest) {
  try {
    const { rollNumber, studentClass, pin } = await req.json();

    if (!rollNumber || !studentClass || !pin) {
      return NextResponse.json(
        { error: "Roll Number, Class, ও PIN তিনটাই দিতে হবে।" },
        { status: 400 }
      );
    }

    const { data: student, error } = await supabaseAdmin
      .from("students")
      .select("id, name, pin, section, class, group_type, session")
      .eq("roll_number", rollNumber)
      .eq("class", studentClass)
      .single();

    if (error || !student) {
      return NextResponse.json(
        { error: "ভুল তথ্য দেওয়া হয়েছে, আবার চেষ্টা করো।" },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(pin, student.pin);
    if (!isValid) {
      return NextResponse.json(
        { error: "ভুল তথ্য দেওয়া হয়েছে, আবার চেষ্টা করো।" },
        { status: 401 }
      );
    }

    await createSession({
      userId: student.id,
      role: "student",
      name: student.name,
      extra: {
        section: student.section,
        class: student.class,
        groupType: student.group_type,
        session: student.session,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করো।" },
      { status: 500 }
    );
  }
}
