"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

interface Student {
  id: string;
  name: string;
  roll: string;
  class_name: string;
  group_name: string;
  pin?: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

export default function TeacherDashboard() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teacherName, setTeacherName] = useState("Joyanta Malakar");

  // ফর্ম স্টেট
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [marks, setMarks] = useState("");
  const [examType, setExamType] = useState("FIRST TERM");
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const getSupabaseClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
  };

  useEffect(() => {
    const fetchData = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      // শিক্ষার্থীদের তালিকা লোড
      const { data: studentData } = await supabase
        .from("students")
        .select("id, name, roll, class_name, group_name, pin")
        .order("roll", { ascending: true });

      if (studentData) setStudents(studentData);

      // বিষয়সমূহের তালিকা লোড
      const { data: subjectData } = await supabase
        .from("subjects")
        .select("id, name, code");

      if (subjectData) setSubjects(subjectData);
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/teacher/login");
  };

  const handleSubmitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!selectedStudent || !selectedSubject) {
      setMessage("❌ অনুগ্রহ করে শিক্ষার্থী এবং বিষয় নির্বাচন করুন");
      setLoading(false);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessage("❌ ডাটাবেস সংযোগ পাওয়া যায়নি");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("results").insert([
      {
        student_id: selectedStudent,
        subject_id: selectedSubject,
        marks: parseFloat(marks),
        exam_type: examType,
        status: "pending",
      },
    ]);

    setLoading(false);

    if (error) {
      setMessage("❌ রেজাল্ট জমা দিতে সমস্যা হয়েছে: " + error.message);
    } else {
      setMessage("✅ রেজাল্ট সফলভাবে জমা হয়েছে (অনুমোদনের জন্য পেন্ডিং)!");
      setMarks("");
      setSelectedStudent("");
      setSelectedSubject("");
    }
  };

  // নির্বাচিত ক্লাস অনুযায়ী স্টুডেন্ট ফিল্টার
  const filteredStudents = selectedClass
    ? students.filter((s) => s.class_name === selectedClass)
    : students;

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800">শিক্ষক ড্যাশবোর্ড</h1>
            <p className="text-sm text-gray-600 mt-1">
              স্বাগতম সম্মানিত শিক্ষক, <span className="font-semibold text-blue-600">{teacherName}</span>!
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            লগআউট
          </button>
        </div>

        {/* ১. রেজাল্ট যোগ করুন (Dropdown / Accordion) */}
        <details className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden group" open>
          <summary className="p-6 cursor-pointer font-bold text-gray-800 text-lg flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition list-none select-none">
            <div className="flex items-center gap-3">
              <span>📝</span>
              <span>শিক্ষার্থীদের রেজাল্ট যোগ করুন</span>
            </div>
            <span className="text-gray-400 group-open:rotate-180 transition-transform duration-200">
              ▼
            </span>
          </summary>

          <div className="p-6 border-t border-gray-200">
            <form onSubmit={handleSubmitResult} className="space-y-4">
              {message && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    message.includes("✅")
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {message}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* ক্লাস বাছাই করুন (শুধু একাদশ ও দ্বাদশ) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ক্লাস বাছাই করুন
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => {
                      setSelectedClass(e.target.value);
                      setSelectedStudent("");
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">-- সকল ক্লাস --</option>
                    <option value="11">একাদশ (Class 11)</option>
                    <option value="12">দ্বাদশ (Class 12)</option>
                  </select>
                </div>

                {/* Exam Type (নির্দিষ্ট ৪টি পরীক্ষা) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    পরীক্ষার নাম (Exam Type)
                  </label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="FIRST TERM">FIRST TERM</option>
                    <option value="YEAR CHANGE">YEAR CHANGE</option>
                    <option value="PRE-TEST">PRE-TEST</option>
                    <option value="TEST">TEST</option>
                  </select>
                </div>

                {/* শিক্ষার্থী সিলেক্ট করুন */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    শিক্ষার্থী নির্বাচন করুন
                  </label>
                  <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">-- শিক্ষার্থী নির্বাচন করুন --</option>
                    {filteredStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        রোল: {student.roll} - {student.name} ({student.class_name === "11" ? "একাদশ" : student.class_name === "12" ? "দ্বাদশ" : student.class_name}, {student.group_name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* বিষয় নির্বাচন করুন */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    বিষয় নির্বাচন করুন
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">-- বিষয় নির্বাচন করুন --</option>
                    {subjects.map((subj) => (
                      <option key={subj.id} value={subj.id}>
                        {subj.name} ({subj.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* প্রাপ্ত নম্বর */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    প্রাপ্ত নম্বর (Marks)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                    placeholder="যেমন: 85"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg transition duration-200 mt-2"
              >
                {loading ? "জমা হচ্ছে..." : "রেজাল্ট জমা দিন"}
              </button>
            </form>
          </div>
        </details>

        {/* ২. সকল শিক্ষার্থীর তালিকা (Dropdown / Accordion) */}
        <details className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden group">
          <summary className="p-6 cursor-pointer font-bold text-gray-800 text-lg flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition list-none select-none">
            <div className="flex items-center gap-3">
              <span>🎓</span>
              <div>
                <span>সকল শিক্ষার্থীর তালিকা</span>
                <span className="ml-3 text-xs bg-blue-100 text-blue-700 font-semibold px-2.5 py-1 rounded-full">
                  মোট: {students.length} জন
                </span>
              </div>
            </div>
            <span className="text-gray-400 group-open:rotate-180 transition-transform duration-200">
              ▼
            </span>
          </summary>

          <div className="p-6 border-t border-gray-200">
            {students.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600 bg-white rounded-xl overflow-hidden border border-gray-200">
                  <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-3">রোল</th>
                      <th className="p-3">শিক্ষার্থীর নাম</th>
                      <th className="p-3">শ্রেণী</th>
                      <th className="p-3">বিভাগ</th>
                      <th className="p-3">অটো-জেনারেটেড পিন (PIN)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50 transition">
                        <td className="p-3 font-semibold text-gray-800">{student.roll}</td>
                        <td className="p-3 font-medium">{student.name}</td>
                        <td className="p-3">
                          {student.class_name === "11" ? "একাদশ" : student.class_name === "12" ? "দ্বাদশ" : student.class_name}
                        </td>
                        <td className="p-3">{student.group_name}</td>
                        <td className="p-3 font-mono font-bold text-blue-600">
                          {student.pin || "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">কোনো শিক্ষার্থী পাওয়া যায়নি।</p>
            )}
          </div>
        </details>

      </div>
    </main>
  );
}
