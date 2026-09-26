import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const secretKey = process.env.SESSION_SECRET;
const encodedKey = new TextEncoder().encode(secretKey || "default_fallback_secret_key_change_me");

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("result_portal_session")?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: "No session token" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ["HS256"] });
    if (!payload || payload.role !== "student") {
      return NextResponse.json({ success: false, error: "Invalid role" }, { status: 401 });
    }

    const studentId = payload.userId || payload.id;
    if (!studentId) {
      return NextResponse.json({ success: false, error: "No student ID in session" }, { status: 401 });
    }

    // সুপাবেস থেকে লেটেস্ট স্টুডেন্ট ডাটা ফেচ করা
    const { data: student, error } = await supabaseAdmin
      .from("students")
      .select("*")
      .eq("id", studentId)
      .single();

    if (error || !student) {
      return NextResponse.json({ success: false, error: "Student not found in DB" }, { status: 404 });
    }

    return NextResponse.json({ success: true, student });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
