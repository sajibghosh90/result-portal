"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://sggawreafobexiitvzhk.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Q3yt3P2yL1Pni5j9kc_TEA_GstfuUW8";

interface TeacherSession {
  id: string;
  name: string;
  index_number: string;
  subject_id: string;
  is_class_teacher: boolean;
}

interface SubjectDetail {
  id: string;
  name: string;
  group_type: string;
  mcq_full: number;
  cq_full: number;
  practical_full: number;
}

interface Student {
  id: string;
  name: string;
  roll_number: string;
  class: string;
  group_type: string;
}

export default function TeacherDashboard() {
  const router = useRouter();

  const [teacher, setTeacher] = useState<TeacherSession | null>(null);
  const [subject, setSubject] = useState<SubjectDetail | null>(null);
  const [selectedClass, setSelectedClass] = useState("");
  const [examType, setExamType] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  
  // মার্কস ইনপুট স্টেট (স্ট্রিং হিসেবে সেভ রাখা যাতে 'A' বা ফাঁকা ফিল্ড সামলানো যায়)
  const [marks, setMarks] = useState<{ [key: string]: { mcq: string; cq: string; practical: string } }>({});
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const getSupabaseClient = () => {
    try {
      return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (err) {
      console.error("Supabase Client Init Error:", err);
      return null;
    }
  };

  useEffect(() => {
    const sessionData = localStorage.getItem("teacherSession");
    if (!sessionData) {
      router.push("/teacher/login");
      return;
    }

    try {
      const parsedTeacher: TeacherSession = JSON.parse(sessionData);
      setTeacher(parsedTeacher);

      if (parsedTeacher.subject_id) {
        fetchSubjectDetails(parsedTeacher.subject_id);
      }
    } catch (e) {
      console.error("Session parse error:", e);
      router.push("/teacher/login");
    }
  }, []);

  const fetchSubjectDetails = async (subjectId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { data } = await supabase
      .from("subjects")
      .select("*")
      .eq("id", subjectId)
      .single();

    if (data) setSubject(data);
  };

  useEffect(() => {
    setExamType("");
    if (!selectedClass) {
      setStudents([]);
      return;
    }

    const fetchStudents = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const { data } = await supabase
        .from("students")
        .select("id, name, roll_number, class, group_type")
        .eq("class", selectedClass)
        .order("roll_number", { ascending: true });

      if (data) {
        setStudents(data);
        // ইনপুট ফিল্ড ফাঁকা ("") দিয়ে ইনিশিয়ালাইজ করা (ডিফল্ট ০ থাকবে না)
        const initialMarks: { [key: string]: { mcq: string; cq: string; practical: string } } = {};
        data.forEach((st) => {
          initialMarks[st.id] = { mcq: "", cq: "", practical: "" };
        });
        setMarks(initialMarks);
      }
    };

    fetchStudents();
  }, [selectedClass]);

  const handleLogout = () => {
    localStorage.removeItem("teacherSession");
    router.push("/teacher/login");
  };

  const handleMarkChange = (studentId: string, field: "mcq" | "cq" | "practical", value: string) => {
    let val = value.trim();

    // যদি A বা a দেওয়া হয় তবে 'A' রাখা
    if (val.toLowerCase() === "a") {
      val = "A";
    }

    setMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: val,
      },
    }));
  };

  const handleSubmitResults = async () => {
    if (!selectedClass || !examType) {
      setMessage("❌ অনুগ্রহ করে শ্রেণী এবং পরীক্ষার নাম নির্বাচন করুন।");
      return;
    }

    if (!teacher || !subject) {
      setMessage("❌ শিক্ষক অথবা বিষয়ের তথ্য পাওয়া যায়নি।");
      return;
    }

    // ১. চেক করা যে কোনো শিক্ষার্থীর ইনপুট ফিল্ড ফাঁকা আছে কিনা
    for (const st of students) {
      const stMarks = marks[st.id] || { mcq: "", cq: "", practical: "" };

      if (subject.mcq_full > 0 && stMarks.mcq === "") {
        setMessage(`❌ রোল ${st.roll_number} (${st.name})-এর MCQ নম্বর বা 'A' ইনপুট দেওয়া হয়নি!`);
        return;
      }
      if (subject.cq_full > 0 && stMarks.cq === "") {
        setMessage(`❌ রোল ${st.roll_number} (${st.name})-এর CQ নম্বর বা 'A' ইনপুট দেওয়া হয়নি!`);
        return;
      }
      if (subject.practical_full > 0 && stMarks.practical === "") {
        setMessage(`❌ রোল ${st.roll_number} (${st.name})-এর ব্যবহারিক নম্বর বা 'A' ইনপুট দেওয়া হয়নি!`);
        return;
      }
    }

    setLoading(true);
    setMessage("");

    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const resultsToInsert = students.map((st) => {
        const stMarks = marks[st.id] || { mcq: "", cq: "", practical: "" };

        // 'A' বা অনুপস্থিত হলে নম্বর ০ হিসেবে হিসাব হবে
        const parseValue = (val: string) => (val === "A" || val === "" ? 0 : Number(val) || 0);

        const mcqVal = parseValue(stMarks.mcq);
        const cqVal = parseValue(stMarks.cq);
        const practicalVal = parseValue(stMarks.practical);
        const total = mcqVal + cqVal + practicalVal;

        // সমস্ত ফিল্ডে A দিলে স্ট্যাটাস absent ধরা সহজ
        const isAbsent =
          (subject.mcq_full > 0 ? stMarks.mcq === "A" : true) &&
          (subject.cq_full > 0 ? stMarks.cq === "A" : true) &&
          (subject.practical_full > 0 ? stMarks.practical === "A" : true);

        return {
          student_id: st.id,
          subject_id: subject.id,
          teacher_id: teacher.id,
          exam_type: examType,
          mcq_marks: mcqVal,
          cq_marks: cqVal,
          practical_marks: practicalVal,
          total_marks: total,
          status: "pending",
          is_absent: isAbsent,
        };
      });

      const { error } = await supabase.from("results").upsert(resultsToInsert);

      if (error) {
        setMessage("❌ রেজাল্ট সংরক্ষণ করতে সমস্যা: " + error.message);
      } else {
        setMessage("✅ সকল শিক্ষার্থীর রেজাল্ট সফলভাবে জমা দেওয়া হয়েছে! এডমিন অনুমোদনের পর প্রকাশ পাবে।");
      }
    } catch (err: any) {
      setMessage("❌ এরর: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* হেডার */}
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800">শিক্ষক ড্যাশবোর্ড</h1>
            <p className="text-sm text-gray-600 mt-1">
              স্বাগতম সম্মানিত শিক্ষক, <span className="font-bold text-blue-600">{teacher?.name || "লোড হচ্ছে..."}</span>!
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              অ্যাসাইনকৃত বিষয়: <span className="font-bold text-emerald-600">{subject?.name || "লোড হচ্ছে..."}</span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            লগআউট
          </button>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl text-sm font-medium shadow-sm animate-bounce ${
              message.includes("✅")
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}

        {/* নম্বর ইনপুট ফর্ম */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="text-lg font-bold text-gray-800">
              📝 নম্বর ইনপুট ফর্ম ({subject?.name || "বিষয়"})
            </h2>
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-lg">
              💡 অনুপস্থিত শিক্ষার্থীদের জন্য নম্বর ফিল্ডে <strong>'A'</strong> লিখুন
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">শ্রেণী নির্বাচন করুন</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
              >
                <option value="">-- শ্রেণী বেছে নিন --</option>
                <option value="11">একাদশ (11)</option>
                <option value="12">দ্বাদশ (12)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">পরীক্ষার নাম</label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                disabled={!selectedClass}
                className="w-full px-3 py-2 border rounded-xl text-sm bg-white disabled:bg-gray-100"
              >
                <option value="">-- পরীক্ষা বেছে নিন --</option>
                {selectedClass === "11" && (
                  <>
                    <option value="first_terminal">প্রথম সাময়িক (First Terminal)</option>
                    <option value="year_final">বার্ষিকী (Year Change)</option>
                  </>
                )}
                {selectedClass === "12" && (
                  <>
                    <option value="pre_test">Pre-Test</option>
                    <option value="test">Test</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {selectedClass && examType ? (
            students.length > 0 ? (
              <div className="space-y-4">
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-sm text-left text-gray-600 bg-white">
                    <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                      <tr>
                        <th className="p-3">রোল</th>
                        <th className="p-3">শিক্ষার্থীর নাম</th>
                        {subject && subject.mcq_full > 0 && <th className="p-3">MCQ (Max: {subject.mcq_full})</th>}
                        {subject && subject.cq_full > 0 && <th className="p-3">CQ/সৃজনশীল (Max: {subject.cq_full})</th>}
                        {subject && subject.practical_full > 0 && <th className="p-3">ব্যবহারিক (Max: {subject.practical_full})</th>}
                        <th className="p-3">মোট নম্বর</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {students.map((st) => {
                        const stMarks = marks[st.id] || { mcq: "", cq: "", practical: "" };

                        const parseVal = (v: string) => (v === "A" || v === "" ? 0 : Number(v) || 0);
                        const total = parseVal(stMarks.mcq) + parseVal(stMarks.cq) + parseVal(stMarks.practical);

                        const isAllAbsent =
                          (subject?.mcq_full ? stMarks.mcq === "A" : true) &&
                          (subject?.cq_full ? stMarks.cq === "A" : true) &&
                          (subject?.practical_full ? stMarks.practical === "A" : true);

                        return (
                          <tr key={st.id} className="hover:bg-gray-50 transition">
                            <td className="p-3 font-semibold text-gray-800">{st.roll_number}</td>
                            <td className="p-3 font-medium">{st.name}</td>

                            {subject && subject.mcq_full > 0 && (
                              <td className="p-3">
                                <input
                                  type="text"
                                  placeholder="নম্বর/A"
                                  value={stMarks.mcq}
                                  onChange={(e) => handleMarkChange(st.id, "mcq", e.target.value)}
                                  className={`w-24 px-2 py-1 border rounded-lg text-sm text-center bg-white ${
                                    stMarks.mcq === "A" ? "font-bold text-red-600 bg-red-50 border-red-300" : ""
                                  }`}
                                />
                              </td>
                            )}

                            {subject && subject.cq_full > 0 && (
                              <td className="p-3">
                                <input
                                  type="text"
                                  placeholder="নম্বর/A"
                                  value={stMarks.cq}
                                  onChange={(e) => handleMarkChange(st.id, "cq", e.target.value)}
                                  className={`w-24 px-2 py-1 border rounded-lg text-sm text-center bg-white ${
                                    stMarks.cq === "A" ? "font-bold text-red-600 bg-red-50 border-red-300" : ""
                                  }`}
                                />
                              </td>
                            )}

                            {subject && subject.practical_full > 0 && (
                              <td className="p-3">
                                <input
                                  type="text"
                                  placeholder="নম্বর/A"
                                  value={stMarks.practical}
                                  onChange={(e) => handleMarkChange(st.id, "practical", e.target.value)}
                                  className={`w-24 px-2 py-1 border rounded-lg text-sm text-center bg-white ${
                                    stMarks.practical === "A" ? "font-bold text-red-600 bg-red-50 border-red-300" : ""
                                  }`}
                                />
                              </td>
                            )}

                            <td className="p-3 font-bold">
                              {isAllAbsent ? (
                                <span className="text-red-600 font-extrabold bg-red-100 px-2 py-0.5 rounded">
                                  Absent (A)
                                </span>
                              ) : (
                                <span className="text-blue-600">{total}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={handleSubmitResults}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition shadow-sm"
                >
                  {loading ? "জমা দেওয়া হচ্ছে..." : "ফলাফল জমা দিন (Submit)"}
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-6">
                এই শ্রেণীর কোনো শিক্ষার্থী নিবন্ধিত পাওয়া যায়নি।
              </p>
            )
          ) : (
            <p className="text-sm text-gray-500 text-center py-6">
              📌 নম্বর ইনপুট দিতে উপরে থেকে <span className="font-bold">শ্রেণী</span> এবং <span className="font-bold">পরীক্ষার নাম</span> নির্বাচন করুন।
            </p>
          )}

        </div>

      </div>
    </main>
  );
}
