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

interface Teacher {
  id: string;
  name: string;
  index_no: string;
  subject: string;
  is_class_teacher?: boolean;
}

interface PendingResult {
  id: string;
  student_id: string;
  subject_name: string;
  marks: number;
  exam_type: string;
  status: string;
  students?: {
    name: string;
    roll: string;
    class_name: string;
  };
}

export default function AdminDashboard() {
  const router = useRouter();

  // ডাটা স্টেট
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [pendingResults, setPendingResults] = useState<PendingResult[]>([]);

  // ফর্ম স্টেট (শিক্ষার্থী যোগ - শুধুমাত্র ৪টি তথ্য)
  const [studentName, setStudentName] = useState("");
  const [studentRoll, setStudentRoll] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [studentGroup, setStudentGroup] = useState("");

  // ফর্ম স্টেট (শিক্ষক যোগ)
  const [teacherName, setTeacherName] = useState("");
  const [teacherIndex, setTeacherIndex] = useState("");
  const [teacherSubject, setTeacherSubject] = useState("");
  const [isClassTeacher, setIsClassTeacher] = useState(false);

  // অন্যান্য স্টেট
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const getSupabaseClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
  };

  const loadData = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // ১. শিক্ষার্থী লোড
    const { data: stData } = await supabase
      .from("students")
      .select("id, name, roll, class_name, group_name, pin")
      .order("roll", { ascending: true });
    if (stData) setStudents(stData);

    // ২. শিক্ষক লোড
    const { data: tcData } = await supabase
      .from("teachers")
      .select("id, name, index_no, subject, is_class_teacher");
    if (tcData) setTeachers(tcData);

    // ৩. পেন্ডিং রেজাল্ট লোড
    const { data: resData } = await supabase
      .from("results")
      .select("*, students(name, roll, class_name)")
      .eq("status", "pending");
    if (resData) setPendingResults(resData);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/admin/login");
  };

  // শিক্ষার্থী যোগ করার হ্যান্ডলার (সেকশন ও সেশন বাদ)
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();

    const { error } = await supabase.from("students").insert([
      {
        name: studentName,
        roll: studentRoll,
        class_name: studentClass,
        group_name: studentGroup,
        pin: generatedPin,
      },
    ]);

    setLoading(false);
    if (error) {
      setMessage("❌ শিক্ষার্থী যোগ করতে সমস্যা হয়েছে: " + error.message);
    } else {
      setMessage("✅ শিক্ষার্থী সফলভাবে যুক্ত হয়েছে!");
      setStudentName("");
      setStudentRoll("");
      setStudentClass("");
      setStudentGroup("");
      loadData();
    }
  };

  // শিক্ষক যোগ করার হ্যান্ডলার
  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { error } = await supabase.from("teachers").insert([
      {
        name: teacherName,
        index_no: teacherIndex,
        subject: teacherSubject,
        is_class_teacher: isClassTeacher,
      },
    ]);

    setLoading(false);
    if (error) {
      setMessage("❌ শিক্ষক যোগ করতে সমস্যা হয়েছে: " + error.message);
    } else {
      setMessage("✅ শিক্ষক সফলভাবে যুক্ত হয়েছেন!");
      setTeacherName("");
      setTeacherIndex("");
      setTeacherSubject("");
      setIsClassTeacher(false);
      loadData();
    }
  };

  // রেজাল্ট এপ্রুভ করার হ্যান্ডলার
  const handleApproveResult = async (id: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { error } = await supabase
      .from("results")
      .update({ status: "approved" })
      .eq("id", id);

    if (!error) {
      loadData();
    }
  };

  // শিক্ষক ডিলিট হ্যান্ডলার
  const handleDeleteTeacher = async (id: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { error } = await supabase.from("teachers").delete().eq("id", id);
    if (!error) loadData();
  };

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* হেডার সেকশন */}
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800">এডমিন প্যানেল</h1>
            <p className="text-sm text-gray-500 mt-0.5">সিস্টেম ব্যবস্থাপনা ও নিয়ন্ত্রণ ড্যাশবোর্ড</p>
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
            className={`p-4 rounded-xl text-sm ${
              message.includes("✅")
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}

        {/* ১. রেজাল্ট অনুমোদন (Approval) অ্যাকর্ডিয়ন */}
        <details className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden group">
          <summary className="p-6 cursor-pointer font-bold text-gray-800 text-lg flex justify-between items-center bg-white hover:bg-gray-50 transition list-none select-none">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📝</span>
              <div>
                <span className="text-gray-800 font-bold">রেজাল্ট অনুমোদন (Approval)</span>
                <p className="text-xs text-gray-500 font-normal mt-0.5">
                  শিক্ষকদের জমা দেওয়া পেন্ডিং রেজাল্ট দেখুন ও অ্যাপ্রুভ করুন
                </p>
              </div>
            </div>
            <span className="text-gray-400 group-open:rotate-180 transition-transform duration-200">
              ▼
            </span>
          </summary>

          <div className="p-6 border-t border-gray-200">
            {pendingResults.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600 bg-white rounded-xl border border-gray-200">
                  <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-3">শিক্ষার্থীর নাম</th>
                      <th className="p-3">রোল</th>
                      <th className="p-3">শ্রেণী</th>
                      <th className="p-3">বিষয়</th>
                      <th className="p-3">প্রাপ্ত নম্বর</th>
                      <th className="p-3 text-center">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendingResults.map((res) => (
                      <tr key={res.id} className="hover:bg-gray-50 transition">
                        <td className="p-3 font-medium">{res.students?.name || "N/A"}</td>
                        <td className="p-3 font-semibold text-gray-800">{res.students?.roll || "N/A"}</td>
                        <td className="p-3">{res.students?.class_name || "N/A"}</td>
                        <td className="p-3">{res.subject_name}</td>
                        <td className="p-3 font-bold text-emerald-600">{res.marks}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleApproveResult(res.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-md text-xs font-semibold transition"
                          >
                            এপ্রুভ করুন
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">বর্তমানে কোনো পেন্ডিং রেজাল্ট নেই।</p>
            )}
          </div>
        </details>

        {/* ২. শিক্ষক ব্যবস্থাপনা অ্যাকর্ডিয়ন */}
        <details className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden group">
          <summary className="p-6 cursor-pointer font-bold text-gray-800 text-lg flex justify-between items-center bg-white hover:bg-gray-50 transition list-none select-none">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👨‍🏫</span>
              <div>
                <span className="text-gray-800 font-bold">শিক্ষক ব্যবস্থাপনা</span>
                <p className="text-xs text-gray-500 font-normal mt-0.5">
                  নতুন শিক্ষক যোগ করুন এবং বিদ্যমান শিক্ষকদের তালিকা দেখুন
                </p>
              </div>
            </div>
            <span className="text-gray-400 group-open:rotate-180 transition-transform duration-200">
              ▼
            </span>
          </summary>

          <div className="p-6 border-t border-gray-200 space-y-6">
            {/* শিক্ষক যোগ করার ফর্ম */}
            <form onSubmit={handleAddTeacher} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">শিক্ষকের নাম</label>
                <input
                  type="text"
                  placeholder="যেমন: Joyanta Malakar"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Index Number</label>
                <input
                  type="text"
                  placeholder="যেমন: n-509089"
                  value={teacherIndex}
                  onChange={(e) => setTeacherIndex(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">বিষয়</label>
                <input
                  type="text"
                  placeholder="যেমন: বাংলা"
                  value={teacherSubject}
                  onChange={(e) => setTeacherSubject(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="classTeacher"
                  checked={isClassTeacher}
                  onChange={(e) => setIsClassTeacher(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="classTeacher" className="text-sm text-gray-700 font-medium">
                  তিনি কি ক্লাস টিচার?
                </label>
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-sm transition"
                >
                  {loading ? "সংরক্ষণ হচ্ছে..." : "শিক্ষক যুক্ত করুন"}
                </button>
              </div>
            </form>

            {/* বর্তমান শিক্ষকগণ */}
            <div>
              <h3 className="text-base font-bold text-gray-800 mb-3">বর্তমান শিক্ষকগণ</h3>
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-sm text-left text-gray-600 bg-white">
                  <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-3">নাম</th>
                      <th className="p-3">Index Number</th>
                      <th className="p-3">বিষয়</th>
                      <th className="p-3">ক্লাস টিচার</th>
                      <th className="p-3 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {teachers.map((tc) => (
                      <tr key={tc.id} className="hover:bg-gray-50 transition">
                        <td className="p-3 font-medium">{tc.name}</td>
                        <td className="p-3 font-mono">{tc.index_no}</td>
                        <td className="p-3">{tc.subject}</td>
                        <td className="p-3">{tc.is_class_teacher ? "হ্যাঁ" : "না"}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteTeacher(tc.id)}
                            className="text-red-600 hover:underline font-semibold text-xs"
                          >
                            ডিলিট
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </details>

        {/* ৩. শিক্ষার্থী ব্যবস্থাপনা অ্যাকর্ডিয়ন (সেকশন ও সেশন ফিল্ড বাদ) */}
        <details className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden group">
          <summary className="p-6 cursor-pointer font-bold text-gray-800 text-lg flex justify-between items-center bg-white hover:bg-gray-50 transition list-none select-none">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎓</span>
              <div>
                <span className="text-gray-800 font-bold">শিক্ষার্থী ব্যবস্থাপনা</span>
                <p className="text-xs text-gray-500 font-normal mt-0.5">
                  নতুন শিক্ষার্থী নিবন্ধিত করুন ও রোল/রেজিস্ট্রেশন ডাটাবেস পরিচালনা করুন
                </p>
              </div>
            </div>
            <span className="text-gray-400 group-open:rotate-180 transition-transform duration-200">
              ▼
            </span>
          </summary>

          <div className="p-6 border-t border-gray-200 space-y-6">
            {/* নতুন শিক্ষার্থী যোগ করার ফর্ম (শুধু নাম, রোল, শ্রেণী, বিভাগ) */}
            <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">শিক্ষার্থীর নাম</label>
                <input
                  type="text"
                  placeholder="যেমন: মোঃ আরিফ হোসেন"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">রোল নম্বর</label>
                <input
                  type="text"
                  placeholder="যেমন: ১০১"
                  value={studentRoll}
                  onChange={(e) => setStudentRoll(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">শ্রেণী</label>
                <select
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  required
                >
                  <option value="">-- শ্রেণী নির্বাচন করুন --</option>
                  <option value="11">একাদশ (11)</option>
                  <option value="12">দ্বাদশ (12)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">বিভাগ (Group)</label>
                <select
                  value={studentGroup}
                  onChange={(e) => setStudentGroup(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  required
                >
                  <option value="">-- বিভাগ নির্বাচন করুন --</option>
                  <option value="বিজ্ঞান">বিজ্ঞান</option>
                  <option value="মানবিক">মানবিক</option>
                  <option value="ব্যবসায় শিক্ষা">ব্যবসায় শিক্ষা</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-sm transition"
                >
                  {loading ? "সংরক্ষণ হচ্ছে..." : "শিক্ষার্থী যুক্ত করুন"}
                </button>
              </div>
            </form>

            {/* নিবন্ধিত শিক্ষার্থীদের তালিকা */}
            <div>
              <h3 className="text-base font-bold text-gray-800 mb-3">নিবন্ধিত শিক্ষার্থীদের তালিকা (মোট: {students.length} জন)</h3>
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-sm text-left text-gray-600 bg-white">
                  <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-3">রোল</th>
                      <th className="p-3">শিক্ষার্থীর নাম</th>
                      <th className="p-3">শ্রেণী</th>
                      <th className="p-3">বিভাগ</th>
                      <th className="p-3">পিন (PIN)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((st) => (
                      <tr key={st.id} className="hover:bg-gray-50 transition">
                        <td className="p-3 font-semibold text-gray-800">{st.roll}</td>
                        <td className="p-3 font-medium">{st.name}</td>
                        <td className="p-3">{st.class_name === "11" ? "একাদশ" : st.class_name === "12" ? "দ্বাদশ" : st.class_name}</td>
                        <td className="p-3">{st.group_name}</td>
                        <td className="p-3 font-mono font-bold text-blue-600">{st.pin || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </details>

      </div>
    </main>
  );
}
