import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireRole } from "@/lib/session";
import { checkSecret, hashPassword, safeEqual } from "@/lib/password";
import {
  LOGIN_MAX_ATTEMPTS,
  LOGIN_WINDOW_MS,
  clearFailures,
  lockedForSeconds,
  recordFailure,
  tooManyMessage,
} from "@/lib/rateLimit";

// শিক্ষক নিজের পাসওয়ার্ড বদলান — বর্তমান পাসওয়ার্ড মিললে তবেই
const MIN_NEW_PASSWORD = 8;

export async function POST(req: NextRequest) {
  const session = await requireRole("teacher");
  if (!session) {
    return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "বর্তমান ও নতুন পাসওয়ার্ড দুটোই দিতে হবে।" }, { status: 400 });
    }
    if (newPassword.length < MIN_NEW_PASSWORD) {
      return NextResponse.json(
        { error: `নতুন পাসওয়ার্ড কমপক্ষে ${MIN_NEW_PASSWORD} অক্ষরের হতে হবে।` },
        { status: 400 }
      );
    }
    if (safeEqual(currentPassword, newPassword)) {
      return NextResponse.json({ error: "নতুন পাসওয়ার্ড আগেরটার মতো হতে পারবে না।" }, { status: 400 });
    }

    const key = `teacher-pw:${session.userId}`;
    const wait = lockedForSeconds(key, LOGIN_MAX_ATTEMPTS);
    if (wait > 0) {
      return NextResponse.json({ error: tooManyMessage(wait) }, { status: 429 });
    }

    const { data: teacher } = await supabaseAdmin
      .from("teachers")
      .select("id, password")
      .eq("id", session.userId)
      .maybeSingle();

    const { ok } = await checkSecret(currentPassword, teacher?.password);
    if (!teacher || !ok) {
      recordFailure(key, LOGIN_WINDOW_MS);
      return NextResponse.json({ error: "বর্তমান পাসওয়ার্ড ভুল।" }, { status: 401 });
    }

    const { error } = await supabaseAdmin
      .from("teachers")
      .update({ password: await hashPassword(newPassword) })
      .eq("id", teacher.id);
    if (error) {
      return NextResponse.json({ error: "পাসওয়ার্ড বদলাতে সমস্যা হয়েছে।" }, { status: 500 });
    }

    clearFailures(key);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করো।" }, { status: 500 });
  }
}
