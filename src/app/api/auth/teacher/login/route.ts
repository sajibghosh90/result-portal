import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";

// শিক্ষক লগইন — Index Number + Password দিয়ে
// পাসওয়ার্ড সরাসরি টেক্সট (আগের সেভ করা) অথবা bcrypt hash — দুটোই মিলিয়ে দেখা হয়

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const indexNumber = String(body.indexNumber || "").trim();
    const password = String(body.password || "");

    if (!indexNumber || !password) {
      return NextResponse.json(
        { error: "Index Number ও Password দুটোই দিতে হবে।" },
        { status: 400 }
      );
    }

    const { data: teacher, error } = await supabaseAdmin
      .from("teachers")
      .select("id, name, password, subject_id, is_class_teacher")
      .eq("index_number", indexNumber)
      .single();

    if (error || !teacher) {
      return NextResponse.json(
        { error: "শিক্ষক পাওয়া যায়নি। সঠিক ইনডেক্স নম্বর দিন।" },
        { status: 401 }
      );
    }

    const storedPassword = String(teacher.password || "");
    let isValid = storedPassword === password;
    if (!isValid) {
      try {
        isValid = await verifyPassword(password, storedPassword);
      } catch {
        isValid = false;
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { error: "ভুল পাসওয়ার্ড দেওয়া হয়েছে।" },
        { status: 401 }
      );
    }

    await createSession({
      userId: teacher.id,
      role: "teacher",
      name: teacher.name,
      extra: {
        subjectId: teacher.subject_id,
        isClassTeacher: teacher.is_class_teacher,
      },
    });

    return NextResponse.json({ success: true, teacherId: teacher.id });
  } catch {
    return NextResponse.json(
      { error: "সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করো।" },
      { status: 500 }
    );
  }
}
