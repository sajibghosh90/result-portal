import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkSecret, hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { canonicalClass, classVariants } from "@/lib/classes";
import {
  LOGIN_MAX_ATTEMPTS,
  LOGIN_WINDOW_MS,
  clearFailures,
  getClientIp,
  lockedForSeconds,
  recordFailure,
  tooManyMessage,
} from "@/lib/rateLimit";

// শিক্ষার্থী লগইন — Roll + Class + PIN।
// শুধু মিলে যাওয়া শিক্ষার্থীকেই ডেটাবেস থেকে আনা হয় (সবাইকে নয়), এবং রেজাল্ট এখানে পাঠানো হয় না —
// ড্যাশবোর্ড লগইনের পর /api/student/me থেকে নিজের ডেটা আনে।

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

    const variants = classVariants(studentClass);
    const cls = canonicalClass(studentClass);
    const ipKey = `student-ip:${getClientIp(req)}`;
    const acctKey = `student:${cls}:${rollNumber}`;
    const wait = Math.max(lockedForSeconds(ipKey, LOGIN_MAX_ATTEMPTS * 6), lockedForSeconds(acctKey, LOGIN_MAX_ATTEMPTS));
    if (wait > 0) {
      return NextResponse.json({ error: tooManyMessage(wait) }, { status: 429 });
    }

    const { data: candidates, error } = await supabaseAdmin
      .from("students")
      .select("id, name, pin")
      .eq("roll_number", rollNumber)
      .in("class", variants);

    if (error) {
      return NextResponse.json({ error: "ডেটাবেজ কুয়েরি করতে সমস্যা হয়েছে।" }, { status: 500 });
    }

    let matched: { id: string; name: string; pin: string } | null = null;
    let needsUpgrade = false;
    for (const c of candidates || []) {
      const r = await checkSecret(pin, c.pin);
      if (r.ok) {
        matched = c;
        needsUpgrade = r.needsUpgrade;
        break;
      }
    }

    if (!matched) {
      recordFailure(ipKey, LOGIN_WINDOW_MS);
      recordFailure(acctKey, LOGIN_WINDOW_MS);
      return NextResponse.json(
        { error: "Roll, Class অথবা PIN ভুল হয়েছে।" },
        { status: 401 }
      );
    }

    clearFailures(acctKey);

    if (needsUpgrade) {
      await supabaseAdmin
        .from("students")
        .update({ pin: await hashPassword(pin) })
        .eq("id", matched.id);
    }

    await createSession({ userId: matched.id, role: "student", name: matched.name });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করো।" },
      { status: 500 }
    );
  }
}
