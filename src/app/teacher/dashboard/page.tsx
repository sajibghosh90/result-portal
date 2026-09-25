"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://sggawreafobexiitvzhk.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Q3yt3P2yL1Pni5j9kc_TEA_GstfuUW8";

interface Student {
  id: string;
  name: string;
  roll_number: string;
  class: string;
  group_type: string;
}

interface Subject {
  id: string;
  name: string;
  group_type?: string; 
  mcq_full: number;
  cq_full: number;
  practical_full: number;
}

interface Teacher {
  id: string;
  name: string;
  index_number: string;
  subject_id: string;
  subjects?: Subject | null;
}

interface HistoryResult {
  id: string;
  exam_type: string;
  status: string;
  created_at: string;
  students?: { name: string; roll_number: string; class: string } | null;
}

export default function TeacherDashboard() {
  const router = useRouter();

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [examType, setExamType] = useState("");

  const [marks, setMarks] = useState<{ [studentId: string]: { mcq: string; cq: string; practical: string; written: string } }>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"input" | "history" | "tabulation">("input");
  const [historyResults, setHistoryResults] = useState<HistoryResult[]>([]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const getSupabaseClient = () => {
    try {
      return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (err) {
      console.error("Supabase init error:", err);
      return null;
    }
  };

  useEffect(() => {
    const fetchTeacherData = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const teacherId = localStorage.getItem("teacherId");
      if (!teacherId) {
        router.push("/teacher/login");
        return;
      }

      const { data, error } = await supabase
        .from("teachers")
        .select("id, name, index_number, subject_id, subjects(*)")
        .eq("id", teacherId)
        .single();

      if (error || !data) {
        router.push("/teacher/login");
      } else {
        setTeacher(data as any);
      }
    };

    fetchTeacherData();
  }, [router]);

  useEffect(() => {
    const fetchStudentsAndHistory = async () => {
      const supabase = getSupabaseClient();
      if (!supabase || !teacher) return;

      const { data: stData } = await supabase
        .from("students")
        .select("id, name, roll_number, class, group_type")
        .order("roll_number", { ascending: true });

      if (stData) {
        setStudents(stData as any);
      }

      if (teacher.subject_id) {
        const { data: resData } = await supabase
          .from("results")
          .select("id, exam_type, status, created_at, students(name, roll_number, class)")
          .eq("subject_id", teacher.subject_id);

        if (resData) {
          setHistoryResults(resData as any);
        }
      }
    };

    fetchStudentsAndHistory();
  }, [teacher]);

  const handleLogout = () => {
    localStorage.removeItem("teacherId");
    router.push("/teacher/login");
  };

  const handleMarkChange = (studentId: string, field: "mcq" | "cq" | "practical" | "written", value: string) => {
    setMarks((prev) => ({
      ...prev,
      [studentId]: {
        mcq: prev[studentId]?.mcq || "",
        cq: prev[studentId]?.cq || "",
        practical: prev[studentId]?.practical || "",
        written: prev[studentId]?.written || "",
        [field]: value,
      },
    }));
  };

  // সাবজেক্টটি ১০০ নম্বরের লিখিত (যেমন ইংরেজি) কি না তা চেক করা
  const isOnlyWrittenSubject = () => {
    if (!teacher || !teacher.subjects) return false;
    const subName = teacher.subjects.name ? teacher.subjects.name.toLowerCase() : "";
    const mcqFull = teacher.subjects.mcq_full ?? 0;
    const pracFull = teacher.subjects.practical_full ?? 0;
    
    // যদি নাম ইংরেজি হয় অথবা MCQ ও Practical শূন্য হয়
    return subName.includes("english") || subName.includes("ইংরেজি") || (mcqFull === 0 && pracFull === 0);
  };

  // লাইভ টোটাল এবং গ্রেড ক্যালকুলেশন ফাংশন
  const calculateLiveResult = (studentId: string) => {
    const studentMarks = marks[studentId] || { mcq: "", cq: "", practical: "", written: "" };
    const parseVal = (v: string) => (v.toUpperCase() === "A" || v === "" ? 0 : Number(v) || 0);

    const isWrittenOnly = isOnlyWrittenSubject();

    let total = 0;
    let isAbsent = false;
    let isPassed = true;

    const subName = teacher?.subjects?.name || "";
    const mcqFull = teacher?.subjects?.mcq_full || 30;
    const cqFull = teacher?.subjects?.cq_full || 70;
    const pracFull = teacher?.subjects?.practical_full || 0;
    const isICT = subName.toLowerCase().includes("ict") || subName.includes("আইসিটি");

    if (isWrittenOnly) {
      const writtenVal = parseVal(studentMarks.written);
      total = writtenVal;
      isAbsent = studentMarks.written.toUpperCase() === "A";
      if (writtenVal < 33) isPassed = false;
    } else {
      const mcqVal = parseVal(studentMarks.mcq);
      const cqVal = parseVal(studentMarks.cq);
      const pracVal = parseVal(studentMarks.practical);

      total = mcqVal + cqVal + pracVal;
      isAbsent = studentMarks.mcq.toUpperCase() === "A" || studentMarks.cq.toUpperCase() === "A" || studentMarks.practical.toUpperCase() === "A";

      if (isICT) {
        if (cqVal < 17 || mcqVal < 8) isPassed = false;
      } else {
        if (cqFull === 70 && cqVal < 23) isPassed = false;
        else if (cqFull > 0 && cqFull !== 70 && cqVal < Math.floor(cqFull * 0.33)) isPassed = false;

        if (mcqFull === 30 && mcqVal < 10) isPassed = false;
        else if (mcqFull > 0 && mcqFull !== 30 && mcqVal < Math.floor(mcqFull * 0.33)) isPassed = false;

        if (pracFull > 0 && pracVal < Math.floor(pracFull * 0.33)) isPassed = false;
      }
    }

    let calculatedGrade = "F";
    if (isAbsent) {
      calculatedGrade = "F";
    } else if (!isPassed) {
      calculatedGrade = "F";
    } else {
      const effectiveFullMarks = isWrittenOnly ? 100 : (isICT ? 75 : (mcqFull + cqFull + pracFull));
      const percentage = (total / (effectiveFullMarks || 100)) * 100;

      if (percentage >= 80) calculatedGrade = "A+";
      else if (percentage >= 70) calculatedGrade = "A";
      else if (percentage >= 60) calculatedGrade = "A-";
      else if (percentage >= 50) calculatedGrade = "B";
      else if (percentage >= 40) calculatedGrade = "C";
      else if (percentage >= 33) calculatedGrade = "D";
    }

    return { total, calculatedGrade, isAbsent };
  };

  // ফিল্টারিং লজিক
  const getFilteredStudents = () => {
    if (!selectedClass || !teacher || !teacher.subjects) return [];

    const subName = teacher.subjects.name ? teacher.subjects.name.toLowerCase().trim() : "";
    const subGroup = teacher.subjects.group_type ? teacher.subjects.group_type.toLowerCase().trim() : "";

    const isCommonOrEconomics = 
      !subGroup || 
      subGroup === "common" || 
      subGroup === "all" || 
      subName.includes("অর্থনীতি") || 
      subName.includes("economics") ||
      subName.includes("english") ||
      subName.includes("ইংরেজি");

    return students.filter((st) => {
      if (st.class !== selectedClass) return false;

      if (isCommonOrEconomics) {
        return true;
      }

      const stGroup = st.group_type ? st.group_type.toLowerCase().trim() : "";
      return stGroup === subGroup;
    });
  };

  const currentFilteredStudents = getFilteredStudents();

  const handleSubmitMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !examType || !teacher || !teacher.subject_id) {
      setMessage("❌ অনুগ্রহ করে শ্রেণী ও পরীক্ষার নাম নির্বাচন করুন।");
      return;
    }

    if (currentFilteredStudents.length === 0) {
      setMessage("❌ এই শ্রেণীতে কোনো শিক্ষার্থী পাওয়া যায়নি।");
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return;

    setLoading(true);
    setMessage("");

    const isWrittenOnly = isOnlyWrittenSubject();
    const subName = teacher.subjects?.name || "";
    const mcqFull = teacher.subjects?.mcq_full || 30;
    const cqFull = teacher.subjects?.cq_full || 70;
    const pracFull = teacher.subjects?.practical_full || 0;
    const isICT = subName.toLowerCase().includes("ict") || subName.includes("আইসিটি");

    try {
      const resultsToInsert = [];

      for (const st of currentFilteredStudents) {
        const studentMarks = marks[st.id] || { mcq: "", cq: "", practical: "", written: "" };
        const parseVal = (v: string) => (v.toUpperCase() === "A" || v === "" ? 0 : Number(v) || 0);

        let total = 0;
        let isAbsent = false;
        let isPassed = true;
        let mcqVal = 0;
        let cqVal = 0;
        let pracVal = 0;

        if (isWrittenOnly) {
          const writtenVal = parseVal(studentMarks.written);
          cqVal = writtenVal; // ১০০ নম্বরের লিখিত নম্বরটি cq_marks ফিল্ডে সেভ হবে যাতে ডাটাবেজে সামঞ্জস্য থাকে
          total = writtenVal;
          isAbsent = studentMarks.written.toUpperCase() === "A";
          if (writtenVal < 33) isPassed = false;
        } else {
          mcqVal = parseVal(studentMarks.mcq);
          cqVal = parseVal(studentMarks.cq);
          pracVal = parseVal(studentMarks.practical);

          total = mcqVal + cqVal + pracVal;
          isAbsent = studentMarks.mcq.toUpperCase() === "A" || studentMarks.cq.toUpperCase() === "A" || studentMarks.practical.toUpperCase() === "A";

          if (isICT) {
            if (cqVal < 17 || mcqVal < 8) isPassed = false;
          } else {
            if (cqFull === 70 && cqVal < 23) isPassed = false;
            else if (cqFull > 0 && cqFull !== 70 && cqVal < Math.floor(cqFull * 0.33)) isPassed = false;

            if (mcqFull === 30 && mcqVal < 10) isPassed = false;
            else if (mcqFull > 0 && mcqFull !== 30 && mcqVal < Math.floor(mcqFull * 0.33)) isPassed = false;

            if (pracFull > 0 && pracVal < Math.floor(pracFull * 0.33)) isPassed = false;
          }
        }

        let calculatedGrade = "F";
        let calculatedPoint = 0;

        if (isAbsent) {
          calculatedGrade = "F";
          calculatedPoint = 0;
        } else if (!isPassed) {
          calculatedGrade = "F";
          calculatedPoint = 0;
        } else {
          const effectiveFullMarks = isWrittenOnly ? 100 : (isICT ? 75 : (mcqFull + cqFull + pracFull));
          const percentage = (total / (effectiveFullMarks || 100)) * 100;

          if (percentage >= 80) { calculatedGrade = "A+"; calculatedPoint = 5.0; }
          else if (percentage >= 70) { calculatedGrade = "A"; calculatedPoint = 4.0; }
          else if (percentage >= 60) { calculatedGrade = "A-"; calculatedPoint = 3.5; }
          else if (percentage >= 50) { calculatedGrade = "B"; calculatedPoint = 3.0; }
          else if (percentage >= 40) { calculatedGrade = "C"; calculatedPoint = 2.0; }
          else if (percentage >= 33) { calculatedGrade = "D"; calculatedPoint = 1.0; }
        }

        resultsToInsert.push({
          student_id: st.id,
          subject_id: teacher.subject_id,
          exam_type: examType,
          mcq_marks: mcqVal,
          cq_marks: cqVal,
          practical_marks: pracVal,
          total_marks: total,
          letter_grade: calculatedGrade,
          grade_point: calculatedPoint,
          is_absent: isAbsent,
          status: "pending",
        });
      }

      const { error } = await supabase.from("results").insert(resultsToInsert);

      if (error) {
        setMessage("❌ ফলাফল জমা দিতে সমস্যা: " + error.message);
      } else {
        setMessage("✅ ফলাফল সফলভাবে এডমিনের কাছে জমা দেওয়া হয়েছে!");
        setMarks({});
        setSelectedClass("");
        setExamType("");
      }
    } catch (err: any) {
      setMessage("❌ এরর: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const isWrittenOnly = isOnlyWrittenSubject();

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* শিক্ষক হেডার */}
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800">শিক্ষক ড্যাশবোর্ড</h1>
            <p className="text-sm text-gray-600 mt-0.5">
              স্বাগত সম্মানিত শিক্ষক, <span className="font-bold text-blue-600">{teacher?.name}</span>! 
              অ্যাসাইনকৃত বিষয়: <span className="font-semibold text-emerald-600">{teacher?.subjects?.name || "লোড হচ্ছে..."}</span>
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
            className={`p-4 rounded-xl text-sm font-medium shadow-sm transition-all duration-300 animate-bounce ${
              message.includes("✅")
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}

        {/* ট্যাব নেভিগেশন */}
        <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-gray-200 gap-2">
          <button
            onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${
              activeTab === "input" ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            📝 নম্বর ইনপুট ফর্ম
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition ${
              activeTab === "history" ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            📋 জমা দেওয়া মার্কস (History)
          </button>
        </div>

        {/* ট্যাব ১: নম্বর ইনপুট ফর্ম */}
        {activeTab === "input" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span>📌 নম্বর ইনপুট ফর্ম ({teacher?.subjects?.name}) {isWrittenOnly && "(১০০ নম্বর লিখিত)"}</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">শ্রেণী নির্বাচন করুন</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
                >
                  <option value="">-- শ্রেণী নির্বাচন --</option>
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
              currentFilteredStudents.length > 0 ? (
                <form onSubmit={handleSubmitMarks} className="space-y-4">
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-sm text-left text-gray-600 bg-white">
                      <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 text-xs">
                        <tr>
                          <th className="p-3">রোল</th>
                          <th className="p-3">শিক্ষার্থীর নাম</th>
                          <th className="p-3">বিভাগ</th>
                          {isWrittenOnly ? (
                            <th className="p-3">Written / লিখিত (Max: 100)</th>
                          ) : (
                            <>
                              <th className="p-3">MCQ (Max: {teacher?.subjects?.mcq_full || 30})</th>
                              <th className="p-3">CQ / সৃজনশীল (Max: {teacher?.subjects?.cq_full || 70})</th>
                              {teacher?.subjects?.practical_full ? (
                                <th className="p-3">Practical (Max: {teacher.subjects.practical_full})</th>
                              ) : null}
                            </>
                          )}
                          <th className="p-3 text-center">সর্বমোট</th>
                          <th className="p-3 text-center">গ্রেড</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs">
                        {currentFilteredStudents.map((st) => {
                          const { total, calculatedGrade } = calculateLiveResult(st.id);

                          return (
                            <tr key={st.id} className="hover:bg-gray-50">
                              <td className="p-3 font-semibold text-gray-800">{st.roll_number}</td>
                              <td className="p-3 font-medium">{st.name}</td>
                              <td className="p-3 font-semibold text-blue-600 uppercase">{st.group_type}</td>
                              
                              {isWrittenOnly ? (
                                <td className="p-2">
                                  <input
                                    type="text"
                                    placeholder="নম্বর/A"
                                    value={marks[st.id]?.written || ""}
                                    onChange={(e) => handleMarkChange(st.id, "written", e.target.value)}
                                    className="w-28 px-2.5 py-1.5 border rounded-lg text-center bg-white font-bold"
                                  />
                                </td>
                              ) : (
                                <>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      placeholder="নম্বর/A"
                                      value={marks[st.id]?.mcq || ""}
                                      onChange={(e) => handleMarkChange(st.id, "mcq", e.target.value)}
                                      className="w-20 px-2.5 py-1.5 border rounded-lg text-center bg-white font-bold"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      placeholder="নম্বর/A"
                                      value={marks[st.id]?.cq || ""}
                                      onChange={(e) => handleMarkChange(st.id, "cq", e.target.value)}
                                      className="w-20 px-2.5 py-1.5 border rounded-lg text-center bg-white font-bold"
                                    />
                                  </td>
                                  {teacher?.subjects?.practical_full ? (
                                    <td className="p-2">
                                      <input
                                        type="text"
                                        placeholder="নম্বর/A"
                                        value={marks[st.id]?.practical || ""}
                                        onChange={(e) => handleMarkChange(st.id, "practical", e.target.value)}
                                        className="w-20 px-2.5 py-1.5 border rounded-lg text-center bg-white font-bold"
                                      />
                                    </td>
                                  ) : null}
                                </>
                              )}

                              <td className="p-3 text-center font-extrabold text-blue-600 text-sm">
                                {total}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                                  calculatedGrade === "F" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"
                                }`}>
                                  {calculatedGrade}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition shadow-sm"
                  >
                    {loading ? "জমা দেওয়া হচ্ছে..." : "ফলাফল জমা দিন (Submit)"}
                  </button>
                </form>
              ) : (
                <p className="text-sm text-gray-500 text-center py-6">
                  📌 এই শ্রেণীর জন্য আপনার সাবজেক্টের সাথে মিলে যায় এমন কোনো শিক্ষার্থী পাওয়া যায়নি।
                </p>
              )
            ) : (
              <p className="text-sm text-gray-500 text-center py-6">
                📌 নম্বর ইনপুট করতে উপরে থেকে <span className="font-bold">শ্রেণী</span> এবং <span className="font-bold">পরীক্ষার নাম</span> নির্বাচন করুন।
              </p>
            )}
          </div>
        )}

        {/* ট্যাব ২: হিস্ট্রি */}
        {activeTab === "history" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">📋 আপনার জমা দেওয়া মার্কসের তালিকা</h2>
            {historyResults.length > 0 ? (
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-sm text-left text-gray-600 bg-white">
                  <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-3">রোল</th>
                      <th className="p-3">শিক্ষার্থীর নাম</th>
                      <th className="p-3">পরীক্ষা</th>
                      <th className="p-3">স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historyResults.map((res) => (
                      <tr key={res.id} className="hover:bg-gray-50">
                        <td className="p-3 font-semibold text-gray-800">{res.students?.roll_number}</td>
                        <td className="p-3 font-medium">{res.students?.name}</td>
                        <td className="p-3">{res.exam_type}</td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                              res.status === "approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {res.status === "approved" ? "অনুমোদিত (Approved)" : "অপেক্ষমান (Pending)"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-6">আপনি এখনও কোনো ফলাফল জমা দেননি।</p>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
