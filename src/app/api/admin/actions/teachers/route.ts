import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 401 });
  }

  try {
    const { name, indexNumber, password, subjectId, isClassTeacher } =
      await req.json();

    if (!name || !indexNumber || !subjectId) {
      return NextResponse.json(
        { error: "নাম, Index Number, ও বিষয় দিতে হবে।" },
        { status: 400 }
      );
    }

    // টিচার লগইন রুট প্লেইন টেক্সট পাসওয়ার্ড মেলাতেও পারে (backward-compatible),
    // তাই এখানেও আগের মতোই প্লেইন সেভ হচ্ছে — আচরণ অপরিবর্তিত।
    const { error } = await supabaseAdmin.from("teachers").insert([
      {
        name: String(name).trim(),
        index_number: String(indexNumber).trim(),
        password: password || "123456",
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
    return NextResponse.json(
      { error: "সার্ভারে সমস্যা হয়েছে: " + message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "অনুমতি নেই।" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id দিতে হবে।" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("teachers").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      { error: "ডিলিট করতে সমস্যা: " + error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
