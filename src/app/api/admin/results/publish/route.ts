import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSession } from "@/lib/session";

// এডমিন সাবমিট হওয়া রেজাল্ট গুলো অনুমোদন (publish) করে — এরপরই ছাত্র/ছাত্রীরা দেখতে পাবে

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 401 });
  }

  try {
    const { resultIds } = (await req.json()) as { resultIds: string[] };

    if (!Array.isArray(resultIds) || resultIds.length === 0) {
      return NextResponse.json(
        { error: "কোন রেজাল্ট গুলো অনুমোদন করতে হবে তা উল্লেখ করা হয়নি।" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabaseAdmin
      .from("results")
      .select("id, total_marks, status")
      .in("id", resultIds);

    const { error } = await supabaseAdmin
      .from("results")
      .update({ status: "published", updated_at: new Date().toISOString() })
      .in("id", resultIds);

    if (error) {
      return NextResponse.json(
        { error: "রেজাল্ট অনুমোদন করতে সমস্যা হয়েছে।" },
        { status: 500 }
      );
    }

    const historyRows = (existing || []).map((r) => ({
      result_id: r.id,
      old_total_marks: r.total_marks,
      new_total_marks: r.total_marks,
      old_status: r.status,
      new_status: "published",
      changed_by: session.userId,
    }));

    if (historyRows.length > 0) {
      await supabaseAdmin.from("result_history").insert(historyRows);
    }

    return NextResponse.json({ success: true, count: resultIds.length });
  } catch {
    return NextResponse.json(
      { error: "সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করো।" },
      { status: 500 }
    );
  }
}
