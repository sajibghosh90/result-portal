import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Supabase Free প্ল্যানে ~১ সপ্তাহ কোনো activity না থাকলে প্রজেক্ট Pause হয়ে যায়।
// Vercel Cron প্রতিদিন এই route-এ GET পাঠায় (vercel.json দেখো) এবং আমরা একটা খুব হালকা কোয়েরি চালাই।
//
// নিরাপত্তা: Vercel Project Settings → Environment Variables-এ CRON_SECRET সেট করলে
// Vercel নিজে "Authorization: Bearer <CRON_SECRET>" হেডার পাঠায়। সেট না থাকলে route বন্ধ থাকবে (fail closed)।

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET সেট করা নেই।" }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    // head: true → কোনো ডাটা ফেরত আসে না, শুধু count; তাই খুবই হালকা
    const { error, count } = await supabaseAdmin
      .from("subjects")
      .select("id", { count: "exact", head: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Supabase keep-alive সফল।",
      subjectsCount: count ?? 0,
      at: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
