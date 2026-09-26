import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

interface ResultItem {
  id: string;
  exam_type: string;
  mcq_marks: number;
  cq_marks: number;
  practical_marks: number;
  total_marks: number;
  letter_grade: string;
  grade_point: number;
  is_absent: boolean;
  subjects?: { name: string; mcq_full: number; cq_full: number; practical_full: number } | null;
}

export default async function StudentDashboard() {
  const session = await getSession();

  if (!session || session.role !== "student") {
    redirect("/student/login");
  }

  const studentId = session.userId;

  const { data: results } = await supabaseAdmin
    .from("results")
    .select("*, subjects(name, mcq_full, cq_full, practical_full)")
    .eq("student_id", studentId)
    .eq("status", "approved");

  const examsMap: { [key: string]: ResultItem[] } = {};
  
  if (results) {
    results.forEach((res: ResultItem) => {
      if (!examsMap[res.exam_type]) {
        examsMap[res.exam_type] = [];
      }
      examsMap[res.exam_type]!.push(res);
    });
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              স্বাগতম, <span className="text-blue-600">{session.name}</span>!
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              শ্রেণী: <span className="font-semibold text-gray-700">{session.extra?.class === "11" ? "একাদশ" : session.extra?.class === "12" ? "দ্বাদশ" : session.extra?.class}</span> | শাখা/গ্রুপ: <span className="font-semibold text-gray-700 uppercase">{session.extra?.groupType || "সাধারণ"}</span>
            </p>
          </div>
          <LogoutButton />
        </div>

        {results && results.length > 0 ? (
          Object.keys(examsMap).map((examType) => {
            const examResults = examsMap[examType] || [];
            let totalGradePoints = 0;
            let hasFailed = false;

            examResults.forEach((r) => {
              if (r.letter_grade === "F" || r.is_absent) {
                hasFailed = true;
              }
              totalGradePoints += Number(r.grade_point) || 0;
            });

            const avgGpa = (totalGradePoints / examResults.length).toFixed(2);
            const finalGpa = hasFailed ? "0.00 (Fail)" : avgGpa;

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
              <div key={examType} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-4 gap-2">
                  <h2 className="text-lg font-bold text-gray-800">
                    📜 {getExamTitle(examType)}
                  </h2>
                  <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-xl text-xs font-extrabold">
                    সর্বমোট GPA: {finalGpa}
                  </div>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-sm text-left text-gray-600 bg-white">
                    <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 text-xs">
                      <tr>
                        <th className="p-3">বিষয়ের নাম</th>
                        <th className="p-3 text-center">MCQ</th>
                        <th className="p-3 text-center">CQ</th>
                        <th className="p-3 text-center">Practical</th>
                        <th className="p-3 text-center">মোট নম্বর</th>
                        <th className="p-3 text-center">গ্রেড</th>
                        <th className="p-3 text-center">জিপিএ (GPA)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {examResults.map((res) => (
                        <tr key={res.id} className="hover:bg-gray-50">
                          <td className="p-3 font-semibold text-gray-800">{res.subjects?.name || "বিষয়"}</td>
                          <td className="p-3 text-center font-mono">{res.is_absent && res.mcq_marks === 0 ? "A" : res.mcq_marks}</td>
                          <td className="p-3 text-center font-mono">{res.is_absent && res.cq_marks === 0 ? "A" : res.cq_marks}</td>
                          <td className="p-3 text-center font-mono">{res.is_absent && res.practical_marks === 0 ? "A" : res.practical_marks}</td>
                          <td className="p-3 text-center font-bold text-blue-600">{res.total_marks}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                              res.letter_grade === "F" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"
                            }`}>
                              {res.letter_grade}
                            </span>
                          </td>
                          <td className="p-3 text-center font-semibold text-gray-700">{res.grade_point}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center space-y-3">
            <span className="text-4xl">📭</span>
            <h2 className="text-base font-bold text-gray-800">কোনো প্রকাশিত ফলাফল পাওয়া যায়নি</h2>
            <p className="text-sm text-gray-500">
              শিক্ষকদের জমাকৃত ফলাফল এডমিন কর্তৃক অনুমোদিত (Approved) হওয়ার পর এখানে দেখতে পাবে।
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
