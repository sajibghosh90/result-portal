import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSession } from "@/lib/session";

// এডমিন প্যানেলে বিষয় (subject) ড্রপডাউনে দেখানোর জন্য — সব subject লিস্ট করে

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("subjects")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "বিষয়ের তালিকা আনতে সমস্যা হয়েছে।" },
      { status: 500 }
    );
  }

  return NextResponse.json({ subjects: data });
}
