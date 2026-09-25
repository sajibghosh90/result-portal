import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rollNumber = String(body.rollNumber || "").trim();
    const studentClass = String(body.studentClass || "").trim();
    const pin = String(body.pin || "").trim();

    console.log("Login Attempt -> Roll:", rollNumber, "Class:", studentClass, "Pin:", pin);

    if (!rollNumber || !studentClass || !pin) {
      return NextResponse.json(
        { error: "Roll Number, Class, ও PIN তিনটাই দিতে হবে।" },
        { status: 400 }
      );
    }

    // ক্লাস যাই হোক না কেন, ডাটাবেজ থেকে ওই ক্লাসের সব শিক্ষার্থীকে একসাথে নিয়ে আসা
    const { data: students, error } = await supabaseAdmin
      .from("students")
      .select("id, name, pin, section, class, group_type, session, roll_number");

    if (error) {
      console.error("Supabase Query Error:", error.message);
      return NextResponse.json(
        { error: "ডেটাবেজ কুয়েরি করতে সমস্যা হয়েছে।" },
        { status: 500 }
      );
    }

    // জাভাস্ক্রিপ্ট দিয়ে ফ্লেক্সিবল ম্যাচিং (রোল এবং ক্লাস উভয় ক্ষেত্রেই স্ট্রিং রূপান্তর করে চেক করা)
    const student = students?.find((st) => {
      const dbRoll = String(st.roll_number || "").trim();
      const dbClass = String(st.class || "").trim();
      
      const isRollMatch = dbRoll === rollNumber;
      
      // ক্লাস ম্যাচিং এর বিভিন্ন সম্ভাব্য রূপ (যেমন "11", "একাদশ", ইত্যাদি)
      let isClassMatch = dbClass === studentClass || dbClass.includes(studentClass);
      if (studentClass === "11" && (dbClass === "একাদশ" || dbClass === "11" || dbClass.toLowerCase().includes("11"))) {
        isClassMatch = true;
      } else if (studentClass === "12" && (dbClass === "দ্বাদশ" || dbClass === "12" || dbClass.toLowerCase().includes("12"))) {
        isClassMatch = true;
      }

      return isRollMatch && isClassMatch;
    });

    console.log("Matched Student:", student);

    if (!student) {
      return NextResponse.json(
        { error: "এই রোল ও ক্লাসের কোনো শিক্ষার্থী পাওয়া যায়নি।" },
        { status: 401 }
      );
    }

    // পিন যাচাই
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
