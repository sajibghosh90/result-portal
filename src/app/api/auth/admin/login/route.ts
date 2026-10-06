import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/session";
import { safeEqual } from "@/lib/password";
import {
  LOGIN_MAX_ATTEMPTS,
  LOGIN_WINDOW_MS,
  clearFailures,
  getClientIp,
  lockedForSeconds,
  recordFailure,
  tooManyMessage,
} from "@/lib/rateLimit";

// এডমিন লগইন — একটাই এডমিন অ্যাকাউন্ট, Environment Variables থেকে।
// ভুল চেষ্টা সীমিত (rate limit) এবং তুলনা timing-safe।

export async function POST(req: NextRequest) {
  const key = `admin:${getClientIp(req)}`;
  const wait = lockedForSeconds(key, LOGIN_MAX_ATTEMPTS);
  if (wait > 0) {
    return NextResponse.json({ error: tooManyMessage(wait) }, { status: 429 });
  }

  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username ও Password দুটোই দিতে হবে।" },
        { status: 400 }
      );
    }

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminUsername || !adminPassword) {
      return NextResponse.json({ error: "সার্ভার কনফিগারেশন অসম্পূর্ণ।" }, { status: 500 });
    }

    // দুটো তুলনাই সবসময় চালানো হয়, যাতে সময় দেখে অনুমান করা না যায়
    const userOk = safeEqual(String(username), adminUsername);
    const passOk = safeEqual(String(password), adminPassword);

    if (!userOk || !passOk) {
      recordFailure(key, LOGIN_WINDOW_MS);
      return NextResponse.json({ error: "ভুল Username অথবা Password।" }, { status: 401 });
    }

    clearFailures(key);
    await createSession({ userId: "admin", role: "admin", name: "Admin" });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করো।" },
      { status: 500 }
    );
  }
}
