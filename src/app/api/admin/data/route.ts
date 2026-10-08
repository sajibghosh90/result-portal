import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireRole } from "@/lib/session";
import { isBcryptHash } from "@/lib/password";
import { canonicalClass } from "@/lib/classes";

// এডমিন ড্যাশবোর্ডের সব ডেটা এক জায়গা থেকে — এখন সার্ভারে এডমিন সেশন যাচাই করে তবেই আসে।
// (আগে ব্রাউজার সরাসরি Supabase-এ যেত, ফলে PIN/পাসওয়ার্ড যে কেউ পড়তে পারত।)

export const dynamic = "force-dynamic";

const RESULT_SELECT =
  "*, students(name, roll_number, class), subjects(name, mcq_full, cq_full, practical_full)";

export async function GET() {
  const session = await requireRole("admin");
  if (!session) {
    return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 401 });
  }

  const [subRes, tcRes, stRes, pendRes, appRes] = await Promise.all([
    supabaseAdmin.from("subjects").select("*").order("name", { ascending: true }),
    // শিক্ষকের পাসওয়ার্ড কখনো পাঠানো হয় না
    supabaseAdmin
      .from("teachers")
      .select("id, name, index_number, is_class_teacher, subject_id, subjects(id, name, group_type)"),
    supabaseAdmin.from("students").select("*").order("roll_number", { ascending: true }),
    supabaseAdmin.from("results").select(RESULT_SELECT).in("status", ["submitted", "pending"]),
    supabaseAdmin.from("results").select(RESULT_SELECT).eq("status", "approved"),
  ]);

  const firstError = [subRes, tcRes, stRes, pendRes, appRes].find((r) => r.error)?.error;
  if (firstError) {
    return NextResponse.json({ error: "ডেটা আনতে সমস্যা: " + firstError.message }, { status: 500 });
  }

  // অ্যাডমিনকে ছাত্রকে জানানোর জন্য PIN দেখানো হয় (pin_plain); hash ফিল্ড কখনো যায় না
  const students = (stRes.data || []).map((s) => {
    const { pin, pin_plain, ...rest } = s as Record<string, unknown> & { pin?: string; pin_plain?: string };
    const shown = pin_plain || (pin && !isBcryptHash(pin) ? pin : "");
    return { ...rest, class: canonicalClass(String(rest.class ?? "")), pin: shown || "" };
  });

  return NextResponse.json({
    subjects: subRes.data || [],
    teachers: tcRes.data || [],
    students,
    pendingResults: pendRes.data || [],
    approvedResults: appRes.data || [],
  });
}
