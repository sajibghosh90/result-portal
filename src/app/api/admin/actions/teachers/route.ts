import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireRole } from "@/lib/session";
import { hashPassword } from "@/lib/password";

export async function POST(req: NextRequest) {
  const session = await requireRole("admin");
  if (!session) {
    return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 401 });
  }

  try {
    const { name, indexNumber, password, subjectId, isClassTeacher } = await req.json();

    if (!name || !indexNumber || !subjectId) {
      return NextResponse.json({ error: "নাম, Index Number, ও বিষয় দিতে হবে।" }, { status: 400 });
    }
    if (!password || String(password).length < 6) {
      return NextResponse.json(
        { error: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।" },
        { status: 400 }
      );
    }

    const index = String(indexNumber).trim();
    const { data: dup } = await supabaseAdmin
      .from("teachers")
      .select("id")
      .eq("index_number", index)
      .maybeSingle();
    if (dup) {
      return NextResponse.json({ error: "এই Index Number আগে থেকেই আছে।" }, { status: 409 });
    }

    const { error } = await supabaseAdmin.from("teachers").insert([
      {
        name: String(name).trim(),
        index_number: index,
        password: await hashPassword(String(password)),
        subject_id: subjectId,
        is_class_teacher: Boolean(isClassTeacher),
      },
    ]);

    if (error) {
      return NextResponse.json(
        { error: "শিক্ষক যোগ করতে সমস্যা হয়েছে: " + error.message },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "অজানা এরর";
    return NextResponse.json({ error: "সার্ভারে সমস্যা হয়েছে: " + message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireRole("admin");
  if (!session) {
    return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id দিতে হবে।" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("teachers").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "ডিলিট করতে সমস্যা: " + error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
