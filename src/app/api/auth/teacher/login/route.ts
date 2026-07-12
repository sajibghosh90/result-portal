import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";

// শিক্ষক লগইন — Index Number + Password দিয়ে

export async function POST(req: NextRequest) {
  try {
    const { indexNumber, password } = await req.json();

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
        { error: "ভুল Index Number অথবা Password।" },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, teacher.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "ভুল Index Number অথবা Password।" },
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

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করো।" },
      { status: 500 }
    );
  }
}
