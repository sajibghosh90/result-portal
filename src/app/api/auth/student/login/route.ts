import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";

// ছাত্র/ছাত্রী লগইন — Roll Number + Class + PIN দিয়ে
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rollNumber = String(body.rollNumber || "").trim();
    const studentClass = String(body.studentClass || "").trim();
    const pin = String(body.pin || "").trim();

    if (!rollNumber || !studentClass || !pin) {
      return NextResponse.json(
        { error: "Roll Number, Class, ও PIN তিনটাই দিতে হবে।" },
        { status: 400 }
      );
    }

    // প্রথমে রোল নম্বর ও ক্লাস দিয়ে শিক্ষার্থীকে খুঁজে দেখা
    const { data: student, error } = await supabaseAdmin
      .from("students")
      .select("id, name, pin, section, class, group_type, session")
      .eq("roll_number", rollNumber)
      .eq("class", studentClass)
      .maybeSingle();

    if (error || !student) {
      return NextResponse.json(
        { error: "ভুল তথ্য দেওয়া হয়েছে, আবার চেষ্টা করো।" },
        { status: 401 }
      );
    }

    // পিন যাচাই: সরাসরি পিন মিলছে কিনা অথবা এনক্রিপ্টেড পাসওয়ার্ড হিসেবে মিলছে কিনা
    let isValid = false;
    if (student.pin) {
      const dbPinStr = String(student.pin).trim();
      if (dbPinStr === pin) {
        isValid = true; // সরাসরি টেক্সট পিন মিলে গেলে
      } else {
        try {
          isValid = await verifyPassword(pin, dbPinStr);
        } catch {
          isValid = false;
        }
      }
    }

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
  } catch (err: any) {
    console.error("Student login error:", err);
    return NextResponse.json(
      { error: "সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করো।" },
      { status: 500 }
    );
  }
}
