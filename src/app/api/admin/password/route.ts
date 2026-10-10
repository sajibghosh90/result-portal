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

// এডমিন নিজের পাসওয়ার্ড বদলান।
// নতুন পাসওয়ার্ডের hash Supabase-এর admin_credentials টেবিলে থাকে; টেবিলে রো না থাকলে Vercel-এর ADMIN_PASSWORD চলে।
// ইউজারনেম আগের মতোই ADMIN_USERNAME (Vercel Environment Variable) থেকে আসে।

const MIN_NEW_PASSWORD = 8;

export async function POST(req: NextRequest) {
  const session = await requireRole("admin");
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

    const key = "admin-pw-change";
    const wait = lockedForSeconds(key, LOGIN_MAX_ATTEMPTS);
    if (wait > 0) {
      return NextResponse.json({ error: tooManyMessage(wait) }, { status: 429 });
    }

    // বর্তমান পাসওয়ার্ড যাচাই: ডেটাবেসে hash থাকলে সেটা, নাহলে Environment Variable
    const { data: row } = await supabaseAdmin
      .from("admin_credentials")
      .select("password_hash")
      .eq("id", 1)
      .maybeSingle();

    let currentOk = false;
    if (row?.password_hash) {
      currentOk = (await checkSecret(currentPassword, row.password_hash)).ok;
    } else {
      const envPassword = process.env.ADMIN_PASSWORD;
      currentOk = !!envPassword && safeEqual(currentPassword, envPassword);
    }

    if (!currentOk) {
      recordFailure(key, LOGIN_WINDOW_MS);
      return NextResponse.json({ error: "বর্তমান পাসওয়ার্ড ভুল।" }, { status: 401 });
    }

    const { error } = await supabaseAdmin
      .from("admin_credentials")
      .upsert({ id: 1, password_hash: await hashPassword(newPassword), updated_at: new Date().toISOString() });

    if (error) {
      return NextResponse.json(
        {
          error:
            "পাসওয়ার্ড সেভ করা যায়নি। Supabase-এ admin_credentials টেবিল বানানো আছে কিনা দেখুন। (" + error.message + ")",
        },
        { status: 500 }
      );
    }

    clearFailures(key);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করো।" }, { status: 500 });
  }
}
