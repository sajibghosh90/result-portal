"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

export default function StudentDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [highestMarksMap, setHighestMarksMap] = useState<{ [key: string]: number }>({});
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        // ১. সেশন ইনফো পাওয়ার জন্য আমরা ব্রাউজার থেকে বা API থেকে ডাটা আনতে পারি
        // অথবা সরাসরি ড্যাশবোর্ড API বা সুপাবেস থেকে ফেচ করতে পারি
        const res = await fetch("/api/student/session-data"); // অথবা সরাসরি ডাটা লোড
        const data = await res.json();

        if (!res.ok || !data.session) {
          router.push("/student/login");
          return;
        }

        setSession(data.session);
        setResults(data.results || []);
        setHighestMarksMap(data.highestMarksMap || {});
      } catch (err: any) {
        console.error("Dashboard load error:", err);
        setErrorMsg(err.message || "ডেটা লোড করতে সমস্যা হয়েছে।");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600 font-semibold animate-pulse text-lg">মার্কশিট লোড হচ্ছে...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-6 rounded-2xl shadow border border-red-200 text-center space-y-3">
          <p className="text-red-600 font-bold">{errorMsg}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold"
          >
            পুনরায় চেষ্টা করো
          </button>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const extraData = session.extra || {};
  const studentRoll = extraData.roll || session.roll || "-";
  const studentClass = String(extraData.class || session.class || "");
  const studentGroup = String(extraData.groupType || session.groupType || "সাধারণ");
  const studentName = session.name || "শিক্ষার্থী";

  const examsMap: { [key: string]: any[] } = {};
  if (results && Array.isArray(results)) {
    results.forEach((res) => {
      if (res && res.exam_type) {
        if (!examsMap[res.exam_type]) {
          examsMap[res.exam_type] = [];
        }
        examsMap[res.exam_type].push(res);
      }
    });
  }

  const getPerformanceRemark = (gpa: number, hasFailed: boolean) => {
    if (hasFailed) return "অকৃতকার্য হয়েছে। নিয়মিত পড়াশোনা ও আরও বেশি মনোযোগের প্রয়োজন।";
    if (gpa >= 5.0) return "অত্যন্ত চমৎকার ও গৌরবোজ্জ্বল ফলাফল! এই ধারা অব্যাহত রাখো।";
    if (gpa >= 4.0) return "খুব ভালো ফলাফল! আরও একটু চেষ্টা করলে আরও ভালো করা সম্ভব।";
    if (gpa >= 3.5) return "সন্তোষজনক ফলাফল। নিয়মিত অধ্যবসায় চালিয়ে যাও।";
    if (gpa >= 3.0) return "মোটামুটি ফলাফল। পড়াশোনায় আরও মনযোগী হতে হবে।";
    return "পাশের মান সন্তোষজনক নয়। আরও কঠোর পরিশ্রম করতে হবে।";
  };

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* হেডার */}
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-200 print:hidden">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              স্বাগতম, <span className="text-blue-600">{studentName}</span>!
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              রোল: <span className="font-semibold text-gray-700">{studentRoll}</span> | শ্রেণী: <span className="font-semibold text-gray-700">{studentClass === "11" ? "একাদশ" : studentClass === "12" ? "দ্বাদশ" : studentClass}</span> | গ্রুপ: <span className="font-semibold text-gray-700 uppercase">{studentGroup}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm flex items-center gap-2"
            >
              🖨️ প্রিন্ট / PDF ডাউনলোড
            </button>
            <LogoutButton />
          </div>
        </div>

        {results && results.length > 0 ? (
          Object.keys(examsMap).map((examType) => {
            const examResults = examsMap[examType] || [];
            let totalGradePoints = 0;
            let hasFailed = false;

            examResults.forEach((r: any) => {
              if (r.letter_grade === "F" || r.is_absent) {
                hasFailed = true;
              }
              totalGradePoints += Number(r.grade_point) || 0;
            });

            const avgGpa = examResults.length > 0 ? Number((totalGradePoints / examResults.length).toFixed(2)) : 0;
            const finalGpaStr = hasFailed ? "0.00 (Fail)" : avgGpa.toFixed(2);
            const remarkText = getPerformanceRemark(avgGpa, hasFailed);

            const getExamTitle = (type: string) => {
              switch (type) {
                case "first_terminal": return "প্রথম সাময়িক পরীক্ষা (First Terminal)";
                case "year_final": return "বার্ষিক পরীক্ষা (Year Final)";
                case "pre_test": return "Pre-Test পরীক্ষা";
                case "test": return "Test পরীক্ষা";
                default: return type;
              }
            };

            return (
              <div key={examType} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-6 print:shadow-none print:border-none print:p-2">
                
                {/* অফিশিয়াল মার্কশিট হেডার */}
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
                    {getExamTitle(examType)} - একাডেমিক ট্রান্সক্রিপ্ট / মার্কশিট
                  </div>
                </div>

                {/* ছাত্রের তথ্য */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs sm:text-sm">
                  <div><span className="text-gray-500">শিক্ষার্থীর নাম:</span> <strong className="text-gray-800">{studentName}</strong></div>
                  <div><span className="text-gray-500">রোল নম্বর:</span> <strong className="text-gray-800">{studentRoll}</strong></div>
                  <div><span className="text-gray-500">শ্রেণী:</span> <strong className="text-gray-800">{studentClass === "11" ? "একাদশ" : "দ্বাদশ"}</strong></div>
                  <div><span className="text-gray-500">গ্রুপ:</span> <strong className="text-gray-800 uppercase">{studentGroup}</strong></div>
                  <div><span className="text-gray-500">সর্বমোট GPA:</span> <strong className="text-blue-600 font-extrabold">{finalGpaStr}</strong></div>
                  <div><span className="text-gray-500">চূড়ান্ত ফলাফল:</span> <strong className={hasFailed ? "text-red-600 font-bold" : "text-emerald-600 font-bold"}>{hasFailed ? "অকৃতকার্য (Fail)" : "কৃতকার্য (Pass)"}</strong></div>
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
                            <td className="p-3 font-semibold text-gray-800">{res.subjects?.name || "বিষয়"}</td>
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

                {/* মূল্যায়ন ও মন্তব্য */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs sm:text-sm space-y-1">
                  <strong className="text-blue-900 block">📝 মূল্যায়ন ও মন্তব্য (Remarks):</strong>
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

              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center space-y-3">
            <span className="text-4xl">📭</span>
            <h2 className="text-base font-bold text-gray-800">কোনো প্রকাশিত ফলাফল পাওয়া যায়নি</h2>
            <p className="text-sm text-gray-500">
              শিক্ষকদের জমাকৃত ফলাফল এডমিন কর্তৃক অনুমোদিত হওয়ার পর মার্কশিট এখানে দেখতে পাবে।
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
