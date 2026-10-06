import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkSecret, hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import {
  LOGIN_MAX_ATTEMPTS,
  LOGIN_WINDOW_MS,
  clearFailures,
  getClientIp,
  lockedForSeconds,
  recordFailure,
  tooManyMessage,
} from "@/lib/rateLimit";

// শিক্ষক লগইন — Index Number + Password।
// পুরনো plain-text পাসওয়ার্ড থাকলে সফল লগইনের সময় অটোমেটিক bcrypt hash করে সেভ হয়ে যায়।

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

    const ipKey = `teacher-ip:${getClientIp(req)}`;
    const acctKey = `teacher:${indexNumber.toLowerCase()}`;
    const wait = Math.max(lockedForSeconds(ipKey, LOGIN_MAX_ATTEMPTS * 4), lockedForSeconds(acctKey, LOGIN_MAX_ATTEMPTS));
    if (wait > 0) {
      return NextResponse.json({ error: tooManyMessage(wait) }, { status: 429 });
    }

    const { data: teacher } = await supabaseAdmin
      .from("teachers")
      .select("id, name, password, subject_id, is_class_teacher")
      .eq("index_number", indexNumber)
      .maybeSingle();

    const { ok, needsUpgrade } = await checkSecret(password, teacher?.password);

    if (!teacher || !ok) {
      recordFailure(ipKey, LOGIN_WINDOW_MS);
      recordFailure(acctKey, LOGIN_WINDOW_MS);
      // শিক্ষক আছে কি নেই — একই বার্তা, যাতে ইনডেক্স নম্বর যাচাই করা না যায়
      return NextResponse.json(
        { error: "Index Number অথবা Password ভুল।" },
        { status: 401 }
      );
    }

    clearFailures(acctKey);

    if (needsUpgrade) {
      await supabaseAdmin
        .from("teachers")
        .update({ password: await hashPassword(password) })
        .eq("id", teacher.id);
    }

    await createSession({
      userId: teacher.id,
      role: "teacher",
      name: teacher.name,
      extra: { subjectId: teacher.subject_id, isClassTeacher: teacher.is_class_teacher },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করো।" },
      { status: 500 }
    );
  }
}
