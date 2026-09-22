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

export default function TeacherDashboard() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [teacherName, setTeacherName] = useState("Joyanta Malakar");
  const [assignedSubject, setAssignedSubject] = useState("ইংরেজি"); // এডমিন প্যানেল থেকে আসা বিষয়

  // ফর্ম ফিল্টার স্টেট
  const [selectedClass, setSelectedClass] = useState("");
  const [examType, setExamType] = useState("");

  // মার্কস ইনপুট স্টেট (student_id -> mark)
  const [marksMap, setMarksMap] = useState<{ [key: string]: string }>({});
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

  const handleMarkChange = (studentId: string, value: string) => {
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: value,
    }));
  };

  const handleSubmitAllResults = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!selectedClass || !examType) {
      setMessage("❌ অনুগ্রহ করে ক্লাস এবং পরীক্ষার নাম সিলেক্ট করুন");
      setLoading(false);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessage("❌ ডাটাবেস সংযোগ পাওয়া যায়নি");
      setLoading(false);
      return;
    }

    // যে স্টুডেন্টদের মার্কস ইনপুট দেওয়া হয়েছে সেগুলোর ডাটা প্রস্তুত করা
    const resultsToInsert = filteredStudents
      .filter((student) => marksMap[student.id] !== undefined && marksMap[student.id] !== "")
      .map((student) => ({
        student_id: student.id,
        subject_name: assignedSubject,
        marks: parseFloat(marksMap[student.id]),
        exam_type: examType,
        status: "pending",
      }));

    if (resultsToInsert.length === 0) {
      setMessage("❌ অন্তত একজন শিক্ষার্থীর নম্বর ইনপুট দিন");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("results").insert(resultsToInsert);

    setLoading(false);

    if (error) {
      setMessage("❌ রেজাল্ট জমা দিতে সমস্যা হয়েছে: " + error.message);
    } else {
      setMessage("✅ সকল ইনপুটকৃত রেজাল্ট সফলভাবে জমা হয়েছে (অনুমোদনের জন্য পেন্ডিং)!");
      setMarksMap({});
    }
  };

  // নির্বাচিত ক্লাস অনুযায়ী ফিল্টার করা স্টুডেন্ট লিস্ট
  const filteredStudents = selectedClass
    ? students.filter((s) => s.class_name === selectedClass)
    : [];

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
            <p className="text-xs text-gray-500 mt-0.5">
              অ্যাসাইনকৃত বিষয়: <span className="font-bold text-emerald-600">{assignedSubject}</span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            লগআউট
          </button>
        </div>

        {/* ১. রেজাল্ট এন্ট্রি সেকশন */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>📝</span> নম্বর ইনপুট ফরম ({assignedSubject})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* ক্লাস বাছাই করুন */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                শ্রেণী নির্বাচন করুন
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">-- শ্রেণী বেছে নিন --</option>
                <option value="11">একাদশ (Class 11)</option>
                <option value="12">দ্বাদশ (Class 12)</option>
              </select>
            </div>

            {/* Exam Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                পরীক্ষার নাম
              </label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">-- পরীক্ষা বেছে নিন --</option>
                <option value="FIRST TERM">FIRST TERM</option>
                <option value="YEAR CHANGE">YEAR CHANGE</option>
                <option value="PRE-TEST">PRE-TEST</option>
                <option value="TEST">TEST</option>
              </select>
            </div>
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg text-sm mb-4 ${
                message.includes("✅")
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message}
            </div>
          )}

          {/* শিক্ষার্থী তালিকা ও মার্কস ইনপুট টেবিল */}
          {selectedClass && examType ? (
            <form onSubmit={handleSubmitAllResults} className="space-y-4">
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-sm text-left text-gray-600 bg-white">
                  <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-3">রোল</th>
                      <th className="p-3">শিক্ষার্থীর নাম</th>
                      <th className="p-3">বিভাগ</th>
                      <th className="p-3 text-center">প্রাপ্ত নম্বর ({assignedSubject})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50 transition">
                          <td className="p-3 font-semibold text-gray-800">{student.roll}</td>
                          <td className="p-3 font-medium">{student.name}</td>
                          <td className="p-3">{student.group_name}</td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={marksMap[student.id] || ""}
                              onChange={(e) => handleMarkChange(student.id, e.target.value)}
                              placeholder="নম্বর"
                              className="w-24 px-2 py-1 border rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-4 text-gray-500">
                          এই শ্রেণীতে কোনো শিক্ষার্থী পাওয়া যায়নি।
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredStudents.length > 0 && (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg transition duration-200 mt-4"
                >
                  {loading ? "জমা হচ্ছে..." : "সব রেজাল্ট একসাথে জমা দিন"}
                </button>
              )}
            </form>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500">
              📌 নম্বর ইনপুট দিতে উপরে থেকে <b>শ্রেণী</b> এবং <b>পরীক্ষার নাম</b> নির্বাচন করুন।
            </div>
          )}
        </div>

        {/* ২. সকল শিক্ষার্থীর তথ্য (Dropdown / Accordion) */}
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
