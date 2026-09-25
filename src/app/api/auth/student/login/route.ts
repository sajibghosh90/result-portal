import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rollNumber = String(body.rollNumber || "").trim();
    let studentClass = String(body.studentClass || "").trim();
    const pin = String(body.pin || "").trim();

    console.log("Login Attempt -> Roll:", rollNumber, "Class:", studentClass, "Pin:", pin);

    if (!rollNumber || !studentClass || !pin) {
      return NextResponse.json(
        { error: "Roll Number, Class, ও PIN তিনটাই দিতে হবে।" },
        { status: 400 }
      );
    }

    // ক্লাস ফরম্যাট হ্যান্ডেলিং: ইনপুট যাই হোক না কেন, ডাটাবেজের সাথে ম্যাচ করার জন্য অল্টারনেটিভ চেক করা
    let possibleClasses = [studentClass];
    if (studentClass === "11") {
      possibleClasses = ["11", "একাদশ", "Class 11", "class 11"];
    } else if (studentClass === "12") {
      possibleClasses = ["12", "দ্বাদশ", "Class 12", "class 12"];
    }

    // ডাটাবেজ থেকে রোল এবং সম্ভাব্য ক্লাসের যেকোনো একটির সাথে ম্যাচ করে শিক্ষার্থী খোঁজা
    const { data: student, error } = await supabaseAdmin
      .from("students")
      .select("id, name, pin, section, class, group_type, session, roll_number")
      .eq("roll_number", rollNumber)
      .in("class", possibleClasses)
      .maybeSingle();

    if (error) {
      console.error("Supabase Query Error:", error.message);
    }

    console.log("Found Student from DB:", student);

    if (!student) {
      return NextResponse.json(
        { error: "এই রোল ও ক্লাসের কোনো শিক্ষার্থী পাওয়া যায়নি।" },
        { status: 401 }
      );
    }

    // পিন যাচাই: সরাসরি পিন মিলছে কিনা অথবা এনক্রিপ্টেড পাসওয়ার্ড হিসেবে মিলছে কিনা
    let isValid = false;
    if (student.pin) {
      const dbPinStr = String(student.pin).trim();
      if (dbPinStr === pin) {
        isValid = true;
      } else {
        try {
          isValid = await verifyPassword(pin, dbPinStr);
        } catch {
          isValid = false;
        }
      }
    }

    console.log("PIN Verification Result:", isValid);

    if (!isValid) {
      return NextResponse.json(
        { error: "পাসওয়ার্ড বা পিন ভুল হয়েছে।" },
        { status: 401 }
      );
    }

    await createSession({
      userId: student.id,
      role: "student",
      name: student.name,
      extra: {
        section: student.section,
        class: student.class,
        groupType: student.group_type,
        session: student.session,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Student login unexpected error:", err);
    return NextResponse.json(
      { error: "সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করো।" },
      { status: 500 }
    );
  }
}
