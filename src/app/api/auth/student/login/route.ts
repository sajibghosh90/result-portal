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

    if (!rollNumber || !studentClass || !pin) {
      return NextResponse.json(
        { error: "Roll Number, Class, ও PIN তিনটাই দিতে হবে।" },
        { status: 400 }
      );
    }

    const { data: students, error } = await supabaseAdmin
      .from("students")
      .select("*");

    if (error) {
      return NextResponse.json(
        { error: "ডেটাবেজ কুয়েরি করতে সমস্যা হয়েছে: " + error.message },
        { status: 500 }
      );
    }

    if (!students || students.length === 0) {
      return NextResponse.json(
        { error: "students টেবিলে কোনো ডেটা পাওয়া যায়নি।" },
        { status: 401 }
      );
    }

    const student = students.find((st) => {
      const dbRoll = String(st.roll_number || st.roll || st.rollNumber || "").trim();
      const dbClass = String(st.class || st.studentClass || st.className || "").trim();
      
      const isRollMatch = dbRoll === rollNumber;
      
      let isClassMatch = dbClass === studentClass || dbClass.includes(studentClass);
      if (studentClass === "11" && (dbClass === "একাদশ" || dbClass === "11" || dbClass.toLowerCase().includes("11"))) {
        isClassMatch = true;
      } else if (studentClass === "12" && (dbClass === "দ্বাদশ" || dbClass === "12" || dbClass.toLowerCase().includes("12"))) {
        isClassMatch = true;
      }

      return isRollMatch && isClassMatch;
    });

    if (!student) {
      return NextResponse.json(
        { error: "এই রোল ও ক্লাসের কোনো শিক্ষার্থী পাওয়া যায়নি।" },
        { status: 401 }
      );
    }

    const studentPinField = student.pin || student.password || "";
    let isValid = false;
    
    if (studentPinField) {
      const dbPinStr = String(studentPinField).trim();
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
        { error: "পাসওয়ার্ড বা পিন ভুল হয়েছে।" },
        { status: 401 }
      );
    }

    const matchedRoll = String(student.roll_number || student.roll || student.rollNumber || rollNumber);

    await createSession({
      userId: student.id,
      role: "student",
      name: student.name || student.student_name,
      extra: {
        roll: matchedRoll,
        section: student.section,
        class: student.class,
        groupType: student.group_type || student.group,
        session: student.session,
      },
    });

    return NextResponse.json({ success: true, student });
  } catch (err: any) {
    return NextResponse.json(
      { error: "সার্ভারে সমস্যা হয়েছে: " + (err.message || "অজানা ত্রুটি") },
      { status: 500 }
    );
  }
}
