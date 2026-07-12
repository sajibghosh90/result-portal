import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/session";

// এডমিন লগইন — এখন আমরা একটাই এডমিন অ্যাকাউন্ট রাখছি, .env.local ফাইলে সেট করা।
// ভবিষ্যতে একাধিক এডমিন লাগলে এটাকে ডেটাবেস-বেসড করে দেওয়া যাবে।

export async function POST(req: NextRequest) {
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

    if (username !== adminUsername || password !== adminPassword) {
      return NextResponse.json(
        { error: "ভুল Username অথবা Password।" },
        { status: 401 }
      );
    }

    await createSession({
      userId: "admin",
      role: "admin",
      name: "Admin",
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করো।" },
      { status: 500 }
    );
  }
}
