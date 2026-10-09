"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PortalHeader from "@/components/PortalHeader";
import { computeOverallResult, isFourthSubjectRow } from "@/lib/resultCalc";

export const dynamic = "force-dynamic";

export default function StudentDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [studentData, setStudentData] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [highestMarksMap, setHighestMarksMap] = useState<{ [key: string]: number }>({});
  
  const [activeTab, setActiveTab] = useState<"home" | "notice" | "routine" | "result">("home");
  const [selectedExamType, setSelectedExamType] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/student/me", { cache: "no-store" });
        if (res.status === 401) {
          router.push("/student/login");
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.success) {
          router.push("/student/login");
          return;
        }
        setStudentData(data.student);
        setResults(data.results || []);
        setHighestMarksMap(data.highestMarksMap || {});
      } catch (err) {
        console.error("Dashboard error:", err);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600 font-semibold text-sm">অপেক্ষা করো...</p>
        </div>
      </div>
    );
  }

  if (!studentData) {
    if (!loadError) return null;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center space-y-3 max-w-xs">
          <p className="text-3xl">📡</p>
          <p className="text-gray-700 font-semibold text-sm">ডেটা লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করো।</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl text-sm"
          >
            আবার চেষ্টা করো
          </button>
        </div>
      </div>
    );
  }

  const studentName = studentData.name || studentData.student_name || "শিক্ষার্থী";
  const studentRoll = studentData.roll_number || studentData.roll || "-";
  const studentClass = String(studentData.class || studentData.studentClass || "11");
  const studentGroup = String(studentData.group_type || studentData.group || "সাধারণ");

  const getExamsForStudentClass = (cls: string) => {
    if (cls === "12" || cls.toLowerCase().includes("দ্বাদশ")) {
      return [
        { type: "pre_test", title: "Pre-Test পরীক্ষা" },
        { type: "test", title: "Test পরীক্ষা" }
      ];
    } else {
      return [
        { type: "first_terminal", title: "প্রথম সাময়িক পরীক্ষা (First Terminal)" },
        { type: "year_final", title: "বার্ষিক পরীক্ষা (Year Final)" }
      ];
    }
  };

  const availableExams = getExamsForStudentClass(studentClass);

  const getExamTitle = (type: string) => {
    switch (type) {
      case "first_terminal": return "প্রথম সাময়িক পরীক্ষা (First Terminal)";
      case "year_final": return "বার্ষিক পরীক্ষা (Year Final)";
      case "pre_test": return "Pre-Test পরীক্ষা";
      case "test": return "Test পরীক্ষা";
      default: return type;
    }
  };

  const examResults = results.filter((r: any) => {
    if (!selectedExamType) return false;
    const rExam = r.exam_type;
    const rCls = String(r.class || studentClass);
    // নিরাপত্তার দ্বিতীয় স্তর: ব্রাউজারের পুরনো cache-এ pending রেজাল্ট থাকলেও তা দেখানো হবে না
    return r.status === "approved" && rCls === studentClass && rExam === selectedExamType;
  });

  // সামগ্রিক ফলাফল — ৪র্থ বিষয় (Economics) ও অনুপস্থিতির নিয়মসহ (src/lib/resultCalc.ts)
  const overall = computeOverallResult(examResults, studentData.fourth_subject_id);
  const hasFailed = overall.status === "Fail" || overall.status === "Absent";
  const avgGpa = overall.gpaNumber;
  const finalLetterGrade = overall.grade;
  const finalGpaStr =
    overall.status === "Absent"
      ? "0.00 (F) — অনুপস্থিত"
      : overall.status === "Fail"
      ? "0.00 (Fail)"
      : `${overall.gpa} (${finalLetterGrade})`;

  const getPerformanceRemark = (gpa: number, hasFailed: boolean) => {
    if (hasFailed) return "অকৃতকার্য হয়েছে। নিয়মিত পড়াশোনা ও আরও বেশি মনোযোগের প্রয়োজন।";
    if (gpa >= 5.0) return "অত্যন্ত চমৎকার ও গৌরবোজ্জ্বল ফলাফল! এই ধারা অব্যাহত রাখো।";
    if (gpa >= 4.0) return "খুব ভালো ফলাফল! আরও একটু চেষ্টা করলে আরও ভালো করা সম্ভব।";
    if (gpa >= 3.5) return "সন্তোষজনক ফলাফল। নিয়মিত অধ্যবসায় চালিয়ে যাও।";
    if (gpa >= 3.0) return "মোটামুটি ফলাফল। পড়াশোনায় আরও মনযোগী হতে হবে।";
    return "পাশের মান সন্তোষজনক নয়। আরও কঠোর পরিশ্রম করতে হবে।";
  };

  const remarkText = getPerformanceRemark(avgGpa, hasFailed);
  const classNameStr = studentClass === "11" ? "একাদশ শ্রেণী" : studentClass === "12" ? "দ্বাদশ শ্রেণী" : `শ্রেণী: ${studentClass}`;

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-6 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* ড্যাশবোর্ড হেডার - লোগো ও প্রতিষ্ঠানের নাম */}
        <PortalHeader subtitle="রেজাল্ট ম্যানেজমেন্ট পোর্টাল" badge="শিক্ষার্থী পোর্টাল" />

        {/* ১. টপ প্রোফাইল ও স্বাগতম হেডার */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-blue-600 print:hidden">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            স্বাগতম প্রিয় শিক্ষার্থী, <span className="text-blue-600">{studentName}</span>!
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            রোল: <span className="font-semibold text-gray-700">{studentRoll}</span> | শ্রেণী: <span className="font-semibold text-gray-700">{studentClass === "11" ? "একাদশ" : studentClass === "12" ? "দ্বাদশ" : studentClass}</span> | গ্রুপ: <span className="font-semibold text-gray-700 uppercase">{studentGroup}</span>{studentData.session && (<> | সেশন: <span className="font-semibold text-gray-700">{studentData.session}</span></>)}
          </p>
        </div>

        {/* ২. ৩টি মূল বাটন হাব (নোটিশ, রুটিন, রেজাল্ট) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 print:hidden text-center space-y-4">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">শিক্ষার্থী ড্যাশবোর্ড মেনু</h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <button
              onClick={() => { setActiveTab("notice"); setSelectedExamType(""); }}
              className={`p-3 sm:p-4 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 border shadow-sm active:scale-95 ${
                activeTab === "notice" 
                  ? "bg-blue-600 text-white border-blue-600" 
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              }`}
            >
              📢 নোটিশ বোর্ড
            </button>
            <button
              onClick={() => { setActiveTab("routine"); setSelectedExamType(""); }}
              className={`p-3 sm:p-4 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 border shadow-sm active:scale-95 ${
                activeTab === "routine" 
                  ? "bg-blue-600 text-white border-blue-600" 
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              }`}
            >
              📅 ক্লাস রুটিন
            </button>
            <button
              onClick={() => { setActiveTab("result"); setSelectedExamType(""); }}
              className={`p-3 sm:p-4 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 border shadow-sm active:scale-95 ${
                activeTab === "result" 
                  ? "bg-blue-600 text-white border-blue-600" 
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              }`}
            >
              📊 পরীক্ষার রেজাল্ট
            </button>
          </div>
        </div>

        {/* নোটিশ ট্যাব */}
        {activeTab === "notice" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center space-y-3 print:hidden">
            <span className="text-4xl">📢</span>
            <h3 className="text-lg font-bold text-gray-800">নোটিশ বোর্ড</h3>
            <p className="text-sm text-gray-500">খুব শীঘ্রই কলেজের জরুরি নোটিশগুলো এখানে প্রকাশিত হবে।</p>
            <button 
              onClick={() => setActiveTab("home")} 
              className="mt-4 text-xs font-bold text-blue-600 hover:underline"
            >
              ← ড্যাশবোর্ডে ফিরে যান
            </button>
          </div>
        )}

        {/* রুটিন ট্যাব */}
        {activeTab === "routine" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center space-y-3 print:hidden">
            <span className="text-4xl">📅</span>
            <h3 className="text-lg font-bold text-gray-800">ক্লাস রুটিন</h3>
            <p className="text-sm text-gray-500">একাডেমিক ক্লাস রুটিন শীঘ্রই এখানে যুক্ত করা হবে।</p>
            <button 
              onClick={() => setActiveTab("home")} 
              className="mt-4 text-xs font-bold text-blue-600 hover:underline"
            >
              ← ড্যাশবোর্ডে ফিরে যান
            </button>
          </div>
        )}

        {/* ৩. যখন 'রেজাল্ট' ট্যাবে ক্লিক করা হবে */}
        {activeTab === "result" && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 print:hidden space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                🎯 তোমার শ্রেণীর পরীক্ষাসমূহ:
              </h3>
              
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <select
                  value={selectedExamType}
                  onChange={(e) => setSelectedExamType(e.target.value)}
                  className="border border-gray-300 rounded-xl px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800 flex-1 sm:w-80"
                >
                  <option value="">-- পরীক্ষা সিলেক্ট করো  --</option>
                  {availableExams.map((ex) => (
                    <option key={ex.type} value={ex.type}>
                      {ex.title}
                    </option>
                  ))}
                </select>

                {selectedExamType && (
                  <button
                    onClick={() => window.print()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm flex items-center gap-2"
                  >
                    🖨️ RESULT PDF DOWNLOAD
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ৪. মার্কশিট বা কপি ভিউ */}
        {activeTab === "result" && selectedExamType && examResults.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6 print:shadow-none print:border-none print:p-2">
            
            {/* অফিশিয়াল মার্কশিট হেডার */}
            <div className="text-center border-b border-gray-300 pb-4 space-y-2">
              <div className="flex justify-center items-center gap-4">
                <img 
                  src="/NEW LOGO.png" 
                  alt="College Logo" 
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                />
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-wide">
                    CHHAKAPON HIGH SCHOOL AND COLLEGE
                  </h2>
                  <p className="text-xs text-gray-600 font-semibold">
                    EIIN: 129686 | Kulaura, Moulvibazar
                  </p>
                </div>
              </div>
              <div className="inline-block bg-gray-100 text-gray-800 px-4 py-1 rounded-full text-xs font-bold mt-2 border border-gray-200">
                {classNameStr} — {getExamTitle(selectedExamType)} | একাডেমিক ট্রান্সক্রিপ্ট / মার্কশিট
              </div>
            </div>

            {/* ছাত্রের তথ্য */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs sm:text-sm">
              <div><span className="text-gray-500">শিক্ষার্থীর নাম:</span> <strong className="text-gray-800">{studentName}</strong></div>
              <div><span className="text-gray-500">রোল নম্বর:</span> <strong className="text-gray-800">{studentRoll}</strong></div>
              <div><span className="text-gray-500">শ্রেণী:</span> <strong className="text-gray-800">{studentClass === "11" ? "একাদশ" : studentClass === "12" ? "দ্বাদশ" : studentClass}</strong></div>
              <div><span className="text-gray-500">গ্রুপ:</span> <strong className="text-gray-800 uppercase">{studentGroup}</strong></div>
              <div><span className="text-gray-500">সর্বমোট GPA:</span> <strong className="text-blue-600 font-extrabold">{finalGpaStr}</strong></div>
              <div><span className="text-gray-500">চূড়ান্ত ফলাফল:</span> <strong className={hasFailed ? "text-red-600 font-bold" : "text-emerald-600 font-bold"}>{overall.status === "Absent" ? "অনুপস্থিত (Absent)" : overall.status === "Fail" ? "অকৃতকার্য (Fail)" : "কৃতকার্য (Pass)"}</strong></div>
            </div>

            {/* টেবিল */}
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-sm text-left text-gray-600 bg-white">
                <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 text-xs">
                  <tr>
                    <th className="p-3">বিষয়ের নাম</th>
                    <th className="p-3 text-center">MCQ</th>
                    <th className="p-3 text-center">লিখিত (CQ)</th>
                    <th className="p-3 text-center">সর্বমোট</th>
                    <th className="p-3 text-center">সর্বোচ্চ নম্বর</th>
                    <th className="p-3 text-center">গ্রেড</th>
                    <th className="p-3 text-center">জিপিএ (GPA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                  {examResults.map((res: any) => {
                    const highestKey = `${res.exam_type}_${res.subject_id}`;
                    const highestMark = highestMarksMap[highestKey] ?? res.total_marks;

                    return (
                      <tr key={res.id} className="hover:bg-gray-50">
                        <td className="p-3 font-semibold text-gray-800">
                          {res.subjects?.name || "বিষয়"}
                          {isFourthSubjectRow(res, studentData.fourth_subject_id) && (
                            <span className="ml-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">৪র্থ বিষয়</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono">{res.is_absent && res.mcq_marks === 0 ? "A" : res.mcq_marks}</td>
                        <td className="p-3 text-center font-mono">{res.is_absent && res.cq_marks === 0 ? "A" : res.cq_marks}</td>
                        <td className="p-3 text-center font-extrabold text-blue-600">{res.total_marks}</td>
                        <td className="p-3 text-center font-semibold text-purple-600">{highestMark}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                            res.letter_grade === "F" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {res.letter_grade}
                          </span>
                        </td>
                        <td className="p-3 text-center font-semibold text-gray-700">{res.grade_point}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* মূল্যায়ন ও মন্তব্য */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs sm:text-sm space-y-1">
              <strong className="text-blue-900 block">📝 মূল্যায়ন ও মন্তব্য (Remarks):</strong>
              <p className="text-blue-800 font-medium">{remarkText}</p>
            </div>

            {/* স্বাক্ষর সেকশন */}
            <div className="pt-12 flex justify-between items-end text-xs font-semibold text-gray-700 mt-8">
              <div className="text-center">
                <div className="border-t border-gray-400 w-36 pt-1">শ্রেণী শিক্ষক</div>
              </div>
              <div className="text-center space-y-2">
                <div className="flex justify-center h-12 items-end">
                  <img 
                    src="/NEW SIG.png" 
                    alt="Principal Signature" 
                    className="max-h-14 object-contain mix-blend-multiply"
                  />
                </div>
                <div className="border-t border-gray-400 w-44 pt-1">অধ্যক্ষ / Principal</div>
              </div>
            </div>

            {/* ডেভেলপার ক্রেডিট লাইন */}
            <div className="pt-8 text-center border-t border-gray-200 mt-6 text-[10px] text-gray-400 font-mono tracking-wider print:mt-12">
              DEVELOPED BY SAJIB GHOSH, LECTURER ICT | ALL RIGHTS RESERVED BY S@JIB
            </div>

          </div>
        ) : activeTab === "result" && selectedExamType ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center space-y-3">
            <span className="text-4xl">📭</span>
            <h2 className="text-base font-bold text-gray-800">এই পরীক্ষার কোনো ফলাফল পাওয়া যায়নি</h2>
            <p className="text-sm text-gray-500">
              শিক্ষকদের জমাকৃত ফলাফল এডমিন কর্তৃক অনুমোদিত হওয়ার পর মার্কশিট এখানে দেখতে পাবে।
            </p>
          </div>
        ) : null}

      </div>
    </main>
  );
}
