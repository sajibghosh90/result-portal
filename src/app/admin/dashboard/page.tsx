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
  pin: string;
}

interface Teacher {
  id: string;
  name: string;
  index_number: string;
  is_class_teacher: boolean;
  subjects?: { name: string } | null;
}

interface SubjectOption {
  id: string;
  name: string;
  group_type?: string;
}

interface PendingResult {
  id: string;
  student_id: string;
  subject_id: string;
  exam_type: string;
  total_marks: number;
  status: string;
  students?: { name: string; roll_number: string; class: string } | null;
  subjects?: { name: string } | null;
}

export default function AdminDashboard() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjectList, setSubjectList] = useState<SubjectOption[]>([]);
  const [pendingResults, setPendingResults] = useState<PendingResult[]>([]);

  const [studentName, setStudentName] = useState("");
  const [studentRoll, setStudentRoll] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [studentGroup, setStudentGroup] = useState("");

  const [teacherName, setTeacherName] = useState("");
  const [teacherIndex, setTeacherIndex] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [isClassTeacher, setIsClassTeacher] = useState(false);

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
      console.error("Supabase init error:", err);
      return null;
    }
  };

  const getExamName = (type: string) => {
    switch (type) {
      case "first_terminal":
        return "প্রথম সাময়িক";
      case "year_final":
        return "বার্ষিকী (Year Change)";
      case "pre_test":
        return "Pre-Test";
      case "test":
        return "Test";
      default:
        return type;
    }
  };

  const loadData = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      const { data: subData } = await supabase
        .from("subjects")
        .select("id, name, group_type")
        .order("name", { ascending: true });
      if (subData) setSubjectList(subData);

      const { data: tcData } = await supabase
        .from("teachers")
        .select("id, name, index_number, is_class_teacher, subjects(name)");
      if (tcData) setTeachers(tcData as any);

      const { data: stData } = await supabase
        .from("students")
        .select("id, name, roll_number, class, group_type, pin")
        .order("roll_number", { ascending: true });
      if (stData) setStudents(stData as any);

      const { data: resData } = await supabase
        .from("results")
        .select("*, students(name, roll_number, class), subjects(name)")
        .or("status.eq.submitted,status.eq.pending");
      if (resData) setPendingResults(resData as any);
    } catch (e) {
      console.error("Data load error:", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/admin/login");
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessage("❌ ডাটাবেস সংযোগ পাওয়া যায়নি।");
      setLoading(false);
      return;
    }

    try {
      const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();

      const { error } = await supabase.from("students").insert([
        {
          name: studentName.trim(),
          roll_number: studentRoll.trim(),
          class: studentClass.trim(),
          group_type: studentGroup.trim(),
          pin: generatedPin,
          pin_plain: generatedPin,
        },
      ]);

      if (error) {
        setMessage("❌ সেভ করতে সমস্যা: " + error.message);
      } else {
        setMessage("✅ নতুন শিক্ষার্থী সফলভাবে যুক্ত হয়েছে!");
        setStudentName("");
        setStudentRoll("");
        setStudentClass("");
        setStudentGroup("");
        await loadData();
      }
    } catch (err: any) {
      setMessage("❌ এরর: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!confirm(`আপনি কি নিশ্চিত যে "${name}"-কে ডিলিট করতে চান?`)) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { error } = await supabase.from("students").delete().eq("id", id);

    if (error) {
      setMessage("❌ ডিলিট করতে সমস্যা হয়েছে: " + error.message);
    } else {
      setMessage("✅ শিক্ষার্থী মুছে ফেলা হয়েছে!");
      loadData();
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!selectedSubjectId) {
      setMessage("❌ অনুগ্রহ করে শিক্ষকের জন্য একটি বিষয় নির্বাচন করুন।");
      setLoading(false);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.from("teachers").insert([
        {
          name: teacherName.trim(),
          index_number: teacherIndex.trim(),
          password: teacherPassword || "123456",
          subject_id: selectedSubjectId,
          is_class_teacher: isClassTeacher,
        },
      ]);

      if (error) {
        setMessage("❌ শিক্ষক যোগ করতে সমস্যা হয়েছে: " + error.message);
      } else {
        setMessage("✅ শিক্ষক সফলভাবে যুক্ত হয়েছেন!");
        setTeacherName("");
        setTeacherIndex("");
        setTeacherPassword("");
        setSelectedSubjectId("");
        setIsClassTeacher(false);
        await loadData();
      }
    } catch (err: any) {
      setMessage("❌ এরর: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveResult = async (id: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { error } = await supabase
      .from("results")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (!error) loadData();
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm("আপনি কি এই শিক্ষককে ডিলিট করতে চান?")) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { error } = await supabase.from("teachers").delete().eq("id", id);
    if (!error) loadData();
  };

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">

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
            className={`p-4 rounded-xl text-sm font-medium shadow-sm transition-all duration-300 animate-bounce ${
              message.includes("✅")
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}

        {/* ১. রেজাল্ট অনুমোদন */}
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
                      <th className="p-3">পরীক্ষা</th>
                      <th className="p-3">বিষয়</th>
                      <th className="p-3">মোট নম্বর</th>
                      <th className="p-3 text-center">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendingResults.map((res) => (
                      <tr key={res.id} className="hover:bg-gray-50 transition">
                        <td className="p-3 font-medium">{res.students?.name || "N/A"}</td>
                        <td className="p-3 font-semibold text-gray-800">{res.students?.roll_number || "N/A"}</td>
                        <td className="p-3">{res.students?.class || "N/A"}</td>
                        <td className="p-3 font-semibold text-blue-600">{getExamName(res.exam_type)}</td>
                        <td className="p-3">{res.subjects?.name || "N/A"}</td>
                        <td className="p-3 font-bold text-emerald-600">{res.total_marks}</td>
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

        {/* ২. শিক্ষক ব্যবস্থাপনা */}
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
            <form onSubmit={handleAddTeacher} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">শিক্ষকের নাম</label>
                <input
                  type="text"
                  placeholder="যেমন: MD Rashed"
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
                  placeholder="যেমন: x12345"
                  value={teacherIndex}
                  onChange={(e) => setTeacherIndex(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">পাসওয়ার্ড</label>
                <input
                  type="password"
                  placeholder="ডিফল্ট: 123456"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">বিষয় নির্বাচন করুন *</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  required
                >
                  <option value="">-- বিষয় বেছে নিন --</option>
                  {subjectList.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} {sub.group_type ? `(${sub.group_type})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2 md:col-span-2">
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
                        <td className="p-3 font-mono">{tc.index_number}</td>
                        <td className="p-3">{tc.subjects?.name || "N/A"}</td>
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

        {/* ৩. শিক্ষার্থী ব্যবস্থাপনা */}
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
            <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">শিক্ষার্থীর নাম</label>
                <input
                  type="text"
                  placeholder="যেমন: Md.raihan"
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
                  placeholder="যেমন: 101"
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
                  <option value="science">বিজ্ঞান (science)</option>
                  <option value="arts">মানবিক (arts)</option>
                  <option value="commerce">ব্যবসায় শিক্ষা (commerce)</option>
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
                      <th className="p-3 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((st) => (
                      <tr key={st.id} className="hover:bg-gray-50 transition">
                        <td className="p-3 font-semibold text-gray-800">{st.roll_number}</td>
                        <td className="p-3 font-medium">{st.name}</td>
                        <td className="p-3">{st.class === "11" ? "একাদশ" : st.class === "12" ? "দ্বাদশ" : st.class}</td>
                        <td className="p-3">{st.group_type}</td>
                        <td className="p-3 font-mono font-bold text-blue-600">{st.pin || "N/A"}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteStudent(st.id, st.name)}
                            className="text-red-600 hover:underline font-semibold text-xs bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-md transition"
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

      </div>
    </main>
  );
}
