import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { hashPassword } from "@/lib/password";
import { getSession } from "@/lib/session";

// এডমিন প্যানেল থেকে শিক্ষক যোগ করা এবং শিক্ষকদের তালিকা দেখা

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("teachers")
    .select("id, name, index_number, subject_id, is_class_teacher, subjects(name)")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "শিক্ষকদের তালিকা আনতে সমস্যা হয়েছে।" },
      { status: 500 }
    );
  }

  return NextResponse.json({ teachers: data });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 401 });
  }

  try {
    const { name, indexNumber, password, subjectId, isClassTeacher } =
      await req.json();

    if (!name || !indexNumber || !password || !subjectId) {
      return NextResponse.json(
        { error: "নাম, Index Number, Password, ও বিষয় — সবগুলো দিতে হবে।" },
        { status: 400 }
      );
    }

    // একই Index Number দিয়ে আগে থেকে কোনো শিক্ষক আছে কিনা চেক করা
    const { data: existing } = await supabaseAdmin
      .from("teachers")
      .select("id")
      .eq("index_number", indexNumber)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "এই Index Number দিয়ে আগে থেকেই একজন শিক্ষক আছেন।" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const { data: teacher, error } = await supabaseAdmin
      .from("teachers")
      .insert({
        name,
        index_number: indexNumber,
        password: hashedPassword,
        subject_id: subjectId,
        is_class_teacher: Boolean(isClassTeacher),
      })
      .select("id, name, index_number")
      .single();

    if (error || !teacher) {
      return NextResponse.json(
        { error: "শিক্ষক যোগ করতে সমস্যা হয়েছে।" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, teacher });
  } catch {
    return NextResponse.json(
      { error: "সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করো।" },
      { status: 500 }
    );
  }
}
