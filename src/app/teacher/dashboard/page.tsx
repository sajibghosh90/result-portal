"use client";

import PortalHeader from "@/components/PortalHeader";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  compareMerit,
  computeOverallResult,
  isFourthSubjectRow,
  statusLabel,
  type OverallResult,
} from "@/lib/resultCalc";
import { evaluateSubjectMarks, isWrittenOnlySubject } from "@/lib/grading";

export const dynamic = "force-dynamic";

interface Student {
  id: string;
  name: string;
  roll_number: string;
  class: string;
  group_type: string;
  session?: string | null;
  fourth_subject_id?: string | null;
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

// শ্রেণী অনুযায়ী পরীক্ষার তালিকা (ইনপুট ফর্ম, হিস্ট্রি ফিল্টার ও মেধা তালিকা — সব জায়গায় একই)
const EXAM_OPTIONS: Record<string, { value: string; label: string }[]> = {
  "11": [
    { value: "first_terminal", label: "প্রথম সাময়িক (First Terminal)" },
    { value: "year_final", label: "বার্ষিকী (Year Change)" },
  ],
  "12": [
    { value: "pre_test", label: "Pre-Test" },
    { value: "test", label: "Test" },
  ],
};

const examLabel = (type: string) => {
  for (const list of Object.values(EXAM_OPTIONS)) {
    const found = list.find((e) => e.value === type);
    if (found) return found.label;
  }
  return type;
};

const classLabel = (cls: string) => (cls === "11" ? "একাদশ" : cls === "12" ? "দ্বাদশ" : cls);

interface HistoryResult {
  id: string;
  student_id: string;
  exam_type: string;
  status: string;
  created_at: string;
  letter_grade: string;
  grade_point: number;
  mcq_marks: number;
  cq_marks: number;
  practical_marks: number;
  total_marks: number;
  is_absent: boolean;
  subject_id?: string;
  subjects?: { name: string } | null;
  students?: { name: string; roll_number: string; class: string } | null;
}

export default function TeacherDashboard() {
  const router = useRouter();

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [examType, setExamType] = useState("");

  const [tabClass, setTabClass] = useState("");
  const [tabExam, setTabExam] = useState("");
  const [approvedResults, setApprovedResults] = useState<HistoryResult[]>([]);

  // "জমা দেওয়া মার্কস" ট্যাবের ফিল্টার — শ্রেণী ও পরীক্ষা দুটোই না বাছা পর্যন্ত কোনো টেবিল দেখানো হবে না
  const [histClass, setHistClass] = useState("");
  const [histExam, setHistExam] = useState("");

  // মেধা তালিকা থেকে ব্যক্তিগত মার্কশিট প্রিন্ট/PDF — nonce দিয়ে একই শিক্ষার্থীর জন্য বারবার প্রিন্ট করা যায়
  const [printTarget, setPrintTarget] = useState<{ studentId: string; nonce: number } | null>(null);

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

  useEffect(() => {
    if (!printTarget) return;
    const clear = () => setPrintTarget(null);
    window.addEventListener("afterprint", clear);
    // মার্কশিটটি DOM-এ বসার পর প্রিন্ট ডায়ালগ খোলা হয়
    const t = setTimeout(() => window.print(), 200);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", clear);
    };
  }, [printTarget]);

  // সব ডেটা সার্ভার থেকে আসে (সেশন কুকি দিয়ে যাচাই হয়); ব্রাউজার সরাসরি ডেটাবেসে যায় না
  const fetchStudentsAndHistory = async () => {
    try {
      const res = await fetch("/api/teacher/data", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/teacher/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setMessage("❌ " + (data.error || "ডেটা লোড করতে সমস্যা হয়েছে।"));
        return;
      }
      setTeacher(data.teacher);
      setStudents(data.students || []);
      setHistoryResults(data.historyResults || []);
      setApprovedResults(data.approvedResults || []);
    } catch {
      setMessage("❌ নেটওয়ার্ক সমস্যা, আবার চেষ্টা করুন।");
    }
  };

  useEffect(() => {
    fetchStudentsAndHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    try { localStorage.removeItem("teacherId"); } catch {}
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

  const isOnlyWrittenSubject = () => {
    if (!teacher || !teacher.subjects) return false;
    return isWrittenOnlySubject(teacher.subjects);
  };

  // লাইভ প্রিভিউ — সার্ভারের সাবমিটে যে শেয়ার্ড লজিক চলে ঠিক সেটাই (lib/grading.ts)
  const calculateLiveResult = (studentId: string) => {
    const m = marks[studentId] || { mcq: "", cq: "", practical: "", written: "" };
    const ev = evaluateSubjectMarks(teacher?.subjects || {}, m);
    return { total: ev.total, calculatedGrade: ev.grade, isAbsent: ev.isAbsent };
  };

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
  const tabStudents = students.filter((s) => s.class === tabClass);

  // ডাবল সাবমিট প্রতিরোধের লজিক
  const hasAlreadySubmitted = historyResults.some((res: any) => {
    return res.exam_type === examType && String(res.students?.class) === String(selectedClass);
  });

  const handleSubmitMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !examType || !teacher || !teacher.subject_id) {
      setMessage("❌ অনুগ্রহ করে শ্রেণী ও পরীক্ষার নাম নির্বাচন করুন।");
      return;
    }

    if (hasAlreadySubmitted) {
      setMessage("❌ এই শ্রেণী ও পরীক্ষার ফলাফল ইতিমধ্যে জমা দেওয়া হয়েছে। পুনরায় জমা দেওয়া যাবে না।");
      return;
    }

    if (currentFilteredStudents.length === 0) {
      setMessage("❌ এই শ্রেণীতে কোনো শিক্ষার্থী পাওয়া যায়নি।");
      return;
    }

    const isWrittenOnly = isOnlyWrittenSubject();
    const pracFull = teacher.subjects?.practical_full || 0;

    for (const st of currentFilteredStudents) {
      const studentMarks = marks[st.id];
      if (!studentMarks) {
        setMessage(`❌ রোল ${st.roll_number} (${st.name})-এর কোনো নম্বর দেওয়া হয়নি! সব শিক্ষার্থীর নম্বর পূরণ করতে হবে (অনুপস্থিত থাকলে 'A' দিন)।`);
        return;
      }

      if (isWrittenOnly) {
        if (studentMarks.written === undefined || studentMarks.written.trim() === "") {
          setMessage(`❌ রোল ${st.roll_number} (${st.name})-এর লিখিত (Written) ঘরটি ফাঁকা রাখা হয়েছে!`);
          return;
        }
      } else {
        if (studentMarks.mcq === undefined || studentMarks.mcq.trim() === "" ||
            studentMarks.cq === undefined || studentMarks.cq.trim() === "" ||
            (pracFull > 0 && (studentMarks.practical === undefined || studentMarks.practical.trim() === ""))) {
          setMessage(`❌ রোল ${st.roll_number} (${st.name})-এর সব কটি নম্বর ঘর (MCQ/CQ/Prac) পূরণ করা বাধ্যতামূলক!`);
          return;
        }
      }
    }

    const confirmSubmit = window.confirm("⚠️ সতর্কতা: আপনি একবার ফলাফল জমা দিলে তা আর পরিবর্তন করা যাবে না। আপনি কি সত্যিই এই ফলাফল জমা দিতে চান?");
    if (!confirmSubmit) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // নম্বর শুধু ইনপুট হিসেবে যায়; গ্রেড, পাস/ফেল ও স্ট্যাটাস সার্ভার ঠিক করে
      const res = await fetch("/api/teacher/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentClass: selectedClass, examType, marks }),
      });
      const data = await res.json();

      if (res.status === 401) {
        router.push("/teacher/login");
        return;
      }
      if (!res.ok) {
        setMessage("❌ " + (data.error || "ফলাফল জমা দিতে সমস্যা হয়েছে।"));
      } else {
        setMessage("✅ ফলাফল সফলভাবে এডমিনের কাছে জমা দেওয়া হয়েছে!");
        setMarks({});
        setSelectedClass("");
        setExamType("");
        await fetchStudentsAndHistory();
      }
    } catch (err: any) {
      setMessage("❌ এরর: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const isWrittenOnly = isOnlyWrittenSubject();

  // ---- হিস্ট্রি ফিল্টার: শ্রেণী + পরীক্ষা দুটোই নির্বাচিত হলে তবেই ডাটা
  const filteredHistory =
    histClass && histExam
      ? historyResults.filter((r) => String(r.students?.class) === histClass && r.exam_type === histExam)
      : [];

  // ---- মেধা তালিকা: শুধু এডমিন-অনুমোদিত রেজাল্ট, মেধাক্রমে সাজানো
  const meritRows =
    tabClass && tabExam
      ? tabStudents
          .map((st) => {
            const rows = approvedResults.filter((r) => r.student_id === st.id && r.exam_type === tabExam);
            return { st, rows, overall: computeOverallResult(rows, st.fourth_subject_id) };
          })
          .sort(
            (a, b) =>
              compareMerit(a.overall, b.overall) ||
              (Number(a.st.roll_number) || 0) - (Number(b.st.roll_number) || 0)
          )
      : [];

  // ---- মার্কশিটে "সর্বোচ্চ নম্বর" — একই শ্রেণী ও পরীক্ষার অনুমোদিত রেজাল্ট থেকে
  const classByStudent: Record<string, string> = {};
  students.forEach((s) => {
    classByStudent[s.id] = s.class;
  });
  const highestBySubject: Record<string, number> = {};
  approvedResults.forEach((r) => {
    if (r.exam_type !== tabExam || classByStudent[r.student_id] !== tabClass || !r.subject_id) return;
    const m = Number(r.total_marks) || 0;
    if (m > (highestBySubject[r.subject_id] ?? -1)) highestBySubject[r.subject_id] = m;
  });

  const printStudent = printTarget ? students.find((s) => s.id === printTarget.studentId) || null : null;
  const printRows = printStudent
    ? approvedResults
        .filter((r) => r.student_id === printStudent.id && r.exam_type === tabExam)
        .sort(
          (a, b) =>
            Number(isFourthSubjectRow(a, printStudent.fourth_subject_id)) - Number(isFourthSubjectRow(b, printStudent.fourth_subject_id)) ||
            (a.subjects?.name || "").localeCompare(b.subjects?.name || "")
        )
    : [];

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 print:bg-white print:p-0">
      <div className="max-w-5xl mx-auto space-y-6 print:hidden">

        {/* ড্যাশবোর্ড হেডার - লোগো ও প্রতিষ্ঠানের নাম */}
        <PortalHeader subtitle="শিক্ষক পোর্টাল ও রেজাল্ট ম্যানেজমেন্ট" badge="শিক্ষক পোর্টাল" onLogout={handleLogout} />

        {/* শিক্ষক স্বাগতম কার্ড */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-blue-600">
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800">শিক্ষক ড্যাশবোর্ড</h1>
          <p className="text-base sm:text-lg text-gray-600 mt-1">
            স্বাগতম প্রভাষক, <span className="font-bold text-blue-600">{teacher?.name}</span>! 
            আপনার বিষয়: <span className="font-semibold text-emerald-600">{teacher?.subjects?.name || "লোড হচ্ছে..."}</span>
          </p>
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
        <div className="flex flex-wrap bg-white p-2 rounded-2xl shadow-sm border border-gray-200 gap-2">
          <button
            onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition active:scale-95 ${
              activeTab === "input" ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            📝 নম্বর ইনপুট ফর্ম
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition active:scale-95 ${
              activeTab === "history" ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            📋 জমা দেওয়া মার্কস (History)
          </button>
          <button
            onClick={() => setActiveTab("tabulation")}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition active:scale-95 ${
              activeTab === "tabulation" ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            📊 মেধা তালিকা ও ট্যাবুলেশন শিট
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
                  {(EXAM_OPTIONS[selectedClass] || []).map((ex) => (
                    <option key={ex.value} value={ex.value}>{ex.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedClass && examType ? (
              hasAlreadySubmitted ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center space-y-2">
                  <span className="text-3xl">⚠️</span>
                  <h3 className="text-base font-bold text-amber-800">এই পরীক্ষার ফলাফল ইতিমধ্যে জমা দেওয়া হয়েছে!</h3>
                  <p className="text-xs text-amber-700">
                    আপনি এই শ্রেণী এবং পরীক্ষার জন্য ইতিপূর্বে মার্কস সাবমিট করেছেন। ডাবল এন্ট্রি এড়াতে পুনরায় সাবমিট করার সুযোগ নেই। হিস্ট্রি ট্যাব থেকে স্ট্যাটাস দেখতে পারেন।
                  </p>
                </div>
              ) : currentFilteredStudents.length > 0 ? (
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
                    disabled={loading || hasAlreadySubmitted}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition shadow-sm disabled:bg-gray-400"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">শ্রেণী</label>
                <select
                  value={histClass}
                  onChange={(e) => {
                    setHistClass(e.target.value);
                    setHistExam("");
                  }}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
                >
                  <option value="">-- শ্রেণী নির্বাচন করুন --</option>
                  <option value="11">একাদশ (11)</option>
                  <option value="12">দ্বাদশ (12)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">পরীক্ষার নাম</label>
                <select
                  value={histExam}
                  onChange={(e) => setHistExam(e.target.value)}
                  disabled={!histClass}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-white disabled:bg-gray-100"
                >
                  <option value="">-- পরীক্ষা বেছে নিন --</option>
                  {(EXAM_OPTIONS[histClass] || []).map((ex) => (
                    <option key={ex.value} value={ex.value}>{ex.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {!(histClass && histExam) ? (
              <p className="text-sm text-gray-500 text-center py-6">
                📌 জমা দেওয়া মার্কস দেখতে উপরে থেকে <span className="font-bold">শ্রেণী</span> এবং <span className="font-bold">পরীক্ষার নাম</span> নির্বাচন করুন।
              </p>
            ) : filteredHistory.length > 0 ? (
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-sm text-left text-gray-600 bg-white">
                  <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 text-xs">
                    <tr>
                      <th className="p-3">রোল</th>
                      <th className="p-3">শিক্ষার্থীর নাম</th>
                      <th className="p-3">পরীক্ষা</th>
                      <th className="p-3 text-center">MCQ</th>
                      <th className="p-3 text-center">CQ</th>
                      <th className="p-3 text-center">Prac</th>
                      <th className="p-3 text-center">মোট নম্বর</th>
                      <th className="p-3 text-center">গ্রেড</th>
                      <th className="p-3">স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filteredHistory.map((res) => (
                      <tr key={res.id} className="hover:bg-gray-50">
                        <td className="p-3 font-semibold text-gray-800">{res.students?.roll_number}</td>
                        <td className="p-3 font-medium">{res.students?.name}</td>
                        <td className="p-3">{examLabel(res.exam_type)}</td>
                        <td className="p-3 text-center font-mono">{res.is_absent && res.mcq_marks === 0 ? "A" : res.mcq_marks}</td>
                        <td className="p-3 text-center font-mono">{res.is_absent && res.cq_marks === 0 ? "A" : res.cq_marks}</td>
                        <td className="p-3 text-center font-mono">{res.is_absent && res.practical_marks === 0 ? "A" : res.practical_marks}</td>
                        <td className="p-3 text-center font-bold text-blue-600">{res.total_marks}</td>
                        <td className="p-3 text-center font-bold text-emerald-600">{res.letter_grade}</td>
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
              <p className="text-sm text-gray-500 text-center py-6">এই শ্রেণী ও পরীক্ষার কোনো জমা দেওয়া মার্কস নেই।</p>
            )}
          </div>
        )}

        {/* ট্যাব ৩: মেধা তালিকা ও ট্যাবুলেশন শিট */}
        {activeTab === "tabulation" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
            <h2 className="text-lg font-bold text-gray-800">📊 মেধা তালিকা ও ট্যাবুলেশন শিট (Overall GPA)</h2>
            <p className="text-xs text-gray-500 -mt-4">
              এডমিন কর্তৃক অনুমোদিত সকল বিষয়ের সমন্বয়ে মেধা তালিকা ও GPA দেখুন। ৪র্থ বিষয় (অর্থনীতি)-তে ফেল/অনুপস্থিত থাকলেও মূল ফলাফল পাস থাকবে। মার্কশিট PDF-এর জন্য ডায়ালগে "Save as PDF" বাছুন।
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">শ্রেণী</label>
                <select
                  value={tabClass}
                  onChange={(e) => {
                    setTabClass(e.target.value);
                    setTabExam("");
                  }}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
                >
                  <option value="">-- শ্রেণী নির্বাচন করুন --</option>
                  <option value="11">একাদশ (11)</option>
                  <option value="12">দ্বাদশ (12)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">পরীক্ষার নাম</label>
                <select
                  value={tabExam}
                  onChange={(e) => setTabExam(e.target.value)}
                  disabled={!tabClass}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-white disabled:bg-gray-100"
                >
                  <option value="">-- পরীক্ষা বেছে নিন --</option>
                  {(EXAM_OPTIONS[tabClass] || []).map((ex) => (
                    <option key={ex.value} value={ex.value}>{ex.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {tabClass && tabExam ? (
              tabStudents.length > 0 ? (
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-sm text-left text-gray-600 bg-white">
                    <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 text-xs">
                      <tr>
                        <th className="p-3 text-center">মেধাক্রম</th>
                        <th className="p-3">রোল</th>
                        <th className="p-3">শিক্ষার্থীর নাম</th>
                        <th className="p-3">গ্রুপ</th>
                        <th className="p-3 text-center">সর্বমোট জিপিএ (GPA)</th>
                        <th className="p-3 text-center">চিহ্নিত গ্রেড</th>
                        <th className="p-3 text-center">স্ট্যাটাস</th>
                        <th className="p-3 text-center">মার্কশিট</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {meritRows.map(({ st, overall }, idx) => {
                        const failedLike = overall.status === "Fail" || overall.status === "Absent";
                        const hasResult = overall.status !== "Pending";
                        return (
                          <tr key={st.id} className="hover:bg-gray-50">
                            <td className="p-3 text-center font-bold text-gray-700">
                              {overall.status === "Passed" ? idx + 1 : "—"}
                            </td>
                            <td className="p-3 font-semibold text-gray-800">{st.roll_number}</td>
                            <td className="p-3 font-medium">{st.name}</td>
                            <td className="p-3 uppercase text-blue-600 font-semibold">{st.group_type}</td>
                            <td className="p-3 text-center font-extrabold text-blue-600 text-sm">{overall.gpa}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-lg font-bold text-xs ${
                                failedLike ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"
                              }`}>
                                {overall.grade}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`font-bold ${
                                failedLike ? "text-red-600" : overall.status === "Passed" ? "text-emerald-600" : "text-gray-500"
                              }`}>
                                {statusLabel(overall.status)}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                disabled={!hasResult}
                                onClick={() => setPrintTarget({ studentId: st.id, nonce: Date.now() })}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
                                title={hasResult ? "মার্কশিট PDF ডাউনলোড / প্রিন্ট" : "এই পরীক্ষার অনুমোদিত রেজাল্ট নেই"}
                              >
                                📄 Download Marksheet / PDF
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-6">এই শ্রেণীতে কোনো শিক্ষার্থী নেই।</p>
              )
            ) : (
              <p className="text-sm text-gray-500 text-center py-6">মেধা তালিকা দেখতে শ্রেণী এবং পরীক্ষার নাম নির্বাচন করুন।</p>
            )}
          </div>
        )}

      </div>

      {/* ===== মেধা তালিকা থেকে প্রিন্ট/PDF মার্কশিট — স্ক্রিনে লুকানো, শুধু প্রিন্টে দেখা যায় ===== */}
      {printStudent && (() => {
        const ov: OverallResult = computeOverallResult(printRows, printStudent.fourth_subject_id);
        const bad = ov.status === "Fail" || ov.status === "Absent";
        return (
          <div className="hidden print:block max-w-4xl mx-auto p-4 space-y-5 text-gray-900">
            <div className="text-center border-b border-gray-400 pb-3 space-y-1">
              <div className="flex justify-center items-center gap-4">
                <img src="/NEW LOGO.png" alt="College Logo" className="w-16 h-16 object-contain" />
                <div>
                  <h2 className="text-xl font-black uppercase tracking-wide">CHHAKAPON HIGH SCHOOL AND COLLEGE</h2>
                  <p className="text-xs font-semibold">EIIN: 129686 | Kulaura, Moulvibazar</p>
                </div>
              </div>
              <p className="text-xs font-bold pt-1">
                {classLabel(printStudent.class)} শ্রেণী — {examLabel(tabExam)} | একাডেমিক ট্রান্সক্রিপ্ট / মার্কশিট
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 border border-gray-300 p-3 text-sm">
              <div>শিক্ষার্থীর নাম: <strong>{printStudent.name}</strong></div>
              <div>রোল নম্বর: <strong>{printStudent.roll_number}</strong></div>
              <div>শ্রেণী: <strong>{classLabel(printStudent.class)}</strong></div>
              <div>গ্রুপ: <strong className="uppercase">{printStudent.group_type}</strong></div>
              <div>সেশন: <strong>{printStudent.session || "-"}</strong></div>
              <div>সর্বমোট GPA: <strong>{ov.gpa} ({ov.grade})</strong></div>
              <div>চূড়ান্ত ফলাফল: <strong className={bad ? "text-red-600" : ""}>{statusLabel(ov.status)}</strong></div>
            </div>

            <table className="w-full text-sm border border-gray-400 border-collapse">
              <thead>
                <tr className="bg-gray-100 text-xs">
                  <th className="border border-gray-400 p-2 text-left">বিষয়</th>
                  <th className="border border-gray-400 p-2">MCQ</th>
                  <th className="border border-gray-400 p-2">CQ/লিখিত</th>
                  <th className="border border-gray-400 p-2">Prac</th>
                  <th className="border border-gray-400 p-2">মোট</th>
                  <th className="border border-gray-400 p-2">সর্বোচ্চ</th>
                  <th className="border border-gray-400 p-2">গ্রেড</th>
                  <th className="border border-gray-400 p-2">GPA</th>
                </tr>
              </thead>
              <tbody>
                {printRows.map((r) => {
                  const abs = !!r.is_absent;
                  const cell = (v: number) => (abs && v === 0 ? "A" : v);
                  return (
                    <tr key={r.id} className="text-center">
                      <td className="border border-gray-400 p-2 text-left font-semibold">
                        {r.subjects?.name || "বিষয়"}
                        {isFourthSubjectRow(r, printStudent.fourth_subject_id) && <span className="text-[10px] ml-1">(৪র্থ বিষয়)</span>}
                      </td>
                      <td className="border border-gray-400 p-2">{cell(r.mcq_marks)}</td>
                      <td className="border border-gray-400 p-2">{cell(r.cq_marks)}</td>
                      <td className="border border-gray-400 p-2">{cell(r.practical_marks)}</td>
                      <td className="border border-gray-400 p-2 font-bold">{abs ? "Absent" : r.total_marks}</td>
                      <td className="border border-gray-400 p-2">{r.subject_id ? highestBySubject[r.subject_id] ?? "-" : "-"}</td>
                      <td className="border border-gray-400 p-2 font-bold">{abs ? "F" : r.letter_grade}</td>
                      <td className="border border-gray-400 p-2">{Number(r.grade_point).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="pt-14 flex justify-between items-end text-xs font-semibold">
              <div className="border-t border-gray-500 w-36 pt-1 text-center">শ্রেণী শিক্ষক</div>
              <div className="text-center space-y-1">
                <div className="flex justify-center h-12 items-end">
                  <img src="/NEW SIG.png" alt="Principal Signature" className="max-h-14 object-contain mix-blend-multiply" />
                </div>
                <div className="border-t border-gray-500 w-44 pt-1">অধ্যক্ষ / Principal</div>
              </div>
            </div>
            <p className="pt-6 text-center text-[10px] text-gray-400 font-mono">
              DEVELOPED BY SAJIB GHOSH, LECTURER ICT | ALL RIGHTS RESERVED BY S@JIB
            </p>
          </div>
        );
      })()}
    </main>
  );
}
