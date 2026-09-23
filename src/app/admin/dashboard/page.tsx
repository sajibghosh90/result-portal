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
  mcq_full: number;
  cq_full: number;
  practical_full: number;
}

interface ResultRecord {
  id: string;
  student_id: string;
  subject_id: string;
  exam_type: string;
  mcq_marks: number;
  cq_marks: number;
  practical_marks: number;
  total_marks: number;
  letter_grade: string;
  grade_point: number;
  status: string;
  is_absent: boolean;
  students?: { name: string; roll_number: string; class: string } | null;
  subjects?: { name: string; mcq_full: number; cq_full: number; practical_full: number } | null;
}

interface GroupedPendingResult {
  groupKey: string;
  subjectId: string;
  subjectName: string;
  examType: string;
  className: string;
  totalStudents: number;
  results: ResultRecord[];
}

export default function AdminDashboard() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjectList, setSubjectList] = useState<SubjectOption[]>([]);
  const [pendingResults, setPendingResults] = useState<ResultRecord[]>([]);
  const [approvedResults, setApprovedResults] = useState<ResultRecord[]>([]);

  // ট্যাবুলেশন শিটের জন্য ফিল্টার
  const [tabClass, setTabClass] = useState("");
  const [tabExam, setTabExam] = useState("");

  // এডিটিং স্টেট
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [editMcq, setEditMcq] = useState("");
  const [editCq, setEditCq] = useState("");
  const [editPrac, setEditPrac] = useState("");

  const [studentName, setStudentName] = useState("");
  const [studentRoll, setStudentRoll] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [studentGroup, setStudentGroup] = useState("");

  const [teacherName, setTeacherName] = useState("");
  const [teacherIndex, setTeacherIndex] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [isClassTeacher, setIsClassTeacher] = useState(false);

  // রিসেট বা ডাটা ক্লিয়ার সিকিউরিটি স্টেট
  const [resetPasswordInput, setResetPasswordInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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

  const getExamName = (type: string) => {
    switch (type) {
      case "first_terminal":
        return "প্রথম সাময়িক (First Terminal)";
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
        .select("*")
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
        .select("*, students(name, roll_number, class), subjects(name, mcq_full, cq_full, practical_full)")
        .or("status.eq.submitted,status.eq.pending");
      if (resData) setPendingResults(resData as any);

      const { data: appRes } = await supabase
        .from("results")
        .select("*, students(name, roll_number, class), subjects(name, mcq_full, cq_full, practical_full)")
        .eq("status", "approved");
      if (appRes) setApprovedResults(appRes as any);

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
    if (!supabase) return;

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
    if (!confirm(`আপনি কি নিশ্চিত যে "${name}"-কে এবং তার সকল রেজাল্ট ডাটাবেস থেকে স্থায়ীভাবে মুছে ফেলতে চান?`)) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      await supabase.from("results").delete().eq("student_id", id);
      const { error } = await supabase.from("students").delete().eq("id", id);
      
      if (error) {
        setMessage("❌ শিক্ষার্থী ডিলিট করতে সমস্যা: " + error.message);
      } else {
        setMessage(`🗑️ "${name}" এবং তার সমস্ত ফলাফল সফলভাবে মুছে ফেলা হয়েছে!`);
        loadData();
      }
    } catch (err: any) {
      setMessage("❌ এরর: " + err.message);
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
    if (!supabase) return;

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

  const handleApproveGroup = async (subjectId: string, examType: string, className: string) => {
    if (!confirm(`আপনি কি এই বিষয় ও পরীক্ষার সকল শিক্ষার্থীদের ফলাফল একসাথে অনুমোদন করতে চান?`)) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    setLoading(true);

    try {
      const targetIds = pendingResults
        .filter(
          (r) =>
            r.subject_id === subjectId &&
            r.exam_type === examType &&
            (r.students?.class === className || !className)
        )
        .map((r) => r.id);

      if (targetIds.length === 0) {
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("results")
        .update({ status: "approved", updated_at: new Date().toISOString() })
        .in("id", targetIds);

      if (error) {
        setMessage("❌ অনুমোদন করতে সমস্যা হয়েছে: " + error.message);
      } else {
        setMessage("✅ বিষয়টির সকল শিক্ষার্থীর ফলাফল সফলভাবে অনুমোদন করা হয়েছে!");
        await loadData();
      }
    } catch (err: any) {
      setMessage("❌ এরর: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockSubmission = async (subjectId: string, examType: string) => {
    if (!confirm("আপনি কি এই বিষয় ও পরীক্ষার জন্য শিক্ষকের সাবমিশন আনলক করতে চান?")) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("results")
        .delete()
        .eq("subject_id", subjectId)
        .eq("exam_type", examType)
        .eq("status", "pending");

      if (error) {
        setMessage("❌ আনলক করতে সমস্যা: " + error.message);
      } else {
        setMessage("🔓 সাবমিশন সফলভাবে আনলক করা হয়েছে!");
        await loadData();
      }
    } catch (err: any) {
      setMessage("❌ এরর: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResult = async (resultId: string) => {
    if (!confirm("আপনি কি নিশ্চিত যে এই রেজাল্টটি ডাটাবেস থেকে স্থায়ীভাবে মুছে ফেলতে চান?")) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("results").delete().eq("id", resultId);
      if (error) {
        setMessage("❌ ডিলিট করতে সমস্যা: " + error.message);
      } else {
        setMessage("🗑️ রেজাল্ট সফলভাবে মুছে ফেলা হয়েছে!");
        await loadData();
      }
    } catch (err: any) {
      setMessage("❌ এরর: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // টেস্ট ডাটা বা সব রেজাল্ট রিসেট করার ফাংশন (পাসওয়ার্ড প্রোটেক্টেড)
  const handleResetAllResults = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // এডমিন পাসওয়ার্ড বা পিন চেক (এখানে ডিফল্ট সিকিউরিটি পাসওয়ার্ড 'admin123' বা তোমার সেট করা পাসওয়ার্ড দিতে পারো)
    if (resetPasswordInput !== "admin123" && resetPasswordInput !== "123456") {
      setMessage("❌ ভুল এডমিন পাসওয়ার্ড! টেস্ট ডাটা রিসেট করা হয়নি।");
      return;
    }

    if (!confirm("⚠️ আপনি কি সত্যিই সমস্ত পরীক্ষার ফলাফল (পেন্ডিং ও অনুমোদিত উভয়ই) চিরতরে মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না!")) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    setLoading(true);
    try {
      // results টেবিলের সব ডেটা ডিলিট করা
      const { error } = await supabase.from("results").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) {
        setMessage("❌ ডাটা রিসেট করতে সমস্যা: " + error.message);
      } else {
        setMessage("🧹 সফলভাবে সমস্ত টেস্ট ও পরীক্ষার রেজাল্ট মুছে ফেলা হয়েছে! ডাটাবেজ এখন সম্পূর্ণ ফ্রেশ।");
        setResetPasswordInput("");
        await loadData();
      }
    } catch (err: any) {
      setMessage("❌ এরর: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEditResult = (res: ResultRecord) => {
    setEditingResultId(res.id);
    setEditMcq(res.is_absent && res.mcq_marks === 0 ? "A" : String(res.mcq_marks));
    setEditCq(res.is_absent && res.cq_marks === 0 ? "A" : String(res.cq_marks));
    setEditPrac(res.is_absent && res.practical_marks === 0 ? "A" : String(res.practical_marks));
  };

  const handleSaveEditResult = async (res: ResultRecord) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setLoading(true);

    const parseVal = (v: string) => (v.toUpperCase() === "A" || v === "" ? 0 : Number(v) || 0);

    const mcqVal = parseVal(editMcq);
    const cqVal = parseVal(editCq);
    const pracVal = parseVal(editPrac);

    const total = mcqVal + cqVal + pracVal;
    const isAbsent = editMcq.toUpperCase() === "A" || editCq.toUpperCase() === "A" || editPrac.toUpperCase() === "A";

    const subName = res.subjects?.name || "";
    const mcqFull = res.subjects?.mcq_full || 0;
    const cqFull = res.subjects?.cq_full || 0;
    const pracFull = res.subjects?.practical_full || 0;

    const isICT = subName.toLowerCase().includes("ict") || subName.includes("আইসিটি");

    let isPassed = true;

    if (isICT) {
      if (cqVal < 17 || mcqVal < 8) isPassed = false;
    } else {
      if (cqFull === 70 && cqVal < 23) isPassed = false;
      else if (cqFull > 0 && cqFull !== 70 && cqVal < Math.floor(cqFull * 0.33)) isPassed = false;

      if (mcqFull === 30 && mcqVal < 10) isPassed = false;
      else if (mcqFull > 0 && mcqFull !== 30 && mcqVal < Math.floor(mcqFull * 0.33)) isPassed = false;

      if (pracFull > 0 && pracVal < Math.floor(pracFull * 0.33)) isPassed = false;
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
      const effectiveFullMarks = isICT ? 75 : (mcqFull + cqFull + pracFull);
      const percentage = (total / (effectiveFullMarks || 100)) * 100;

      if (percentage >= 80) { calculatedGrade = "A+"; calculatedPoint = 5.0; }
      else if (percentage >= 70) { calculatedGrade = "A"; calculatedPoint = 4.0; }
      else if (percentage >= 60) { calculatedGrade = "A-"; calculatedPoint = 3.5; }
      else if (percentage >= 50) { calculatedGrade = "B"; calculatedPoint = 3.0; }
      else if (percentage >= 40) { calculatedGrade = "C"; calculatedPoint = 2.0; }
      else if (percentage >= 33) { calculatedGrade = "D"; calculatedPoint = 1.0; }
    }

    try {
      const { error } = await supabase
        .from("results")
        .update({
          mcq_marks: mcqVal,
          cq_marks: cqVal,
          practical_marks: pracVal,
          total_marks: total,
          letter_grade: calculatedGrade,
          grade_point: calculatedPoint,
          is_absent: isAbsent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", res.id);

      if (error) {
        setMessage("❌ আপডেট করতে সমস্যা: " + error.message);
      } else {
        setMessage("✏️ রেজাল্ট সফলভাবে সংশোধন করা হয়েছে!");
        setEditingResultId(null);
        await loadData();
      }
    } catch (err: any) {
      setMessage("❌ এরর: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm("আপনি কি এই শিক্ষককে ডিলিট করতে চান?")) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { error } = await supabase.from("teachers").delete().eq("id", id);
    if (!error) loadData();
  };

  const calculateStudentOverallGPA = (studentId: string) => {
    const studentRes = approvedResults.filter(
      (r) => r.student_id === studentId && r.exam_type === tabExam
    );
    if (studentRes.length === 0) return { gpa: "N/A", grade: "N/A", status: "অনুপস্থিত/অপেক্ষমান" };

    let totalPoints = 0;
    let hasFailed = false;

    for (const r of studentRes) {
      if (r.letter_grade === "F" || r.is_absent) {
        hasFailed = true;
      }
      totalPoints += Number(r.grade_point) || 0;
    }

    if (hasFailed) {
      return { gpa: "0.00", grade: "F", status: "Fail" };
    }

    const avgGpa = (totalPoints / studentRes.length).toFixed(2);
    const numGpa = Number(avgGpa);

    let finalGrade = "D";
    if (numGpa >= 5.0) finalGrade = "A+";
    else if (numGpa >= 4.0) finalGrade = "A";
    else if (numGpa >= 3.5) finalGrade = "A-";
    else if (numGpa >= 3.0) finalGrade = "B";
    else if (numGpa >= 2.0) finalGrade = "C";

    return { gpa: avgGpa, grade: finalGrade, status: "Passed" };
  };

  const groupedResults: GroupedPendingResult[] = Object.values(
    pendingResults.reduce((acc: { [key: string]: GroupedPendingResult }, item) => {
      const subId = item.subject_id || "unknown";
      const exam = item.exam_type || "unknown";
      const cls = item.students?.class || "unknown";
      const groupKey = `${subId}_${exam}_${cls}`;

      if (!acc[groupKey]) {
        acc[groupKey] = {
          groupKey,
          subjectId: subId,
          subjectName: item.subjects?.name || "বিষয়",
          examType: exam,
          className: cls,
          totalStudents: 0,
          results: [],
        };
      }

      acc[groupKey].results.push(item);
      acc[groupKey].totalStudents += 1;
      return acc;
    }, {})
  );

  const tabStudents = students.filter((s) => s.class === tabClass);

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* হেডার */}
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
              message.includes("✅") || message.includes("🔓") || message.includes("✏️") || message.includes("🗑️") || message.includes("🧹")
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}

        {/* ১. রেজাল্ট অনুমোদন, এডিট, ডিলিট ও আনলক */}
        <details className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden group" open>
          <summary className="p-6 cursor-pointer font-bold text-gray-800 text-lg flex justify-between items-center bg-white hover:bg-gray-50 transition list-none select-none">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📝</span>
              <div>
                <span className="text-gray-800 font-bold">রেজাল্ট অনুমোদন ও সংশোধন (Result Approval & Edit)</span>
                <p className="text-xs text-gray-500 font-normal mt-0.5">
                  শিক্ষকদের জমা দেওয়া রেজাল্ট অনুমোদন, সংশোধন, ডিলিট অথবা শিক্ষকের জন্য আনলক করুন
                </p>
              </div>
            </div>
            <span className="text-gray-400 group-open:rotate-180 transition-transform duration-200">
              ▼
            </span>
          </summary>

          <div className="p-6 border-t border-gray-200 space-y-6">
            {groupedResults.length > 0 ? (
              groupedResults.map((group) => (
                <div key={group.groupKey} className="border border-gray-200 rounded-xl bg-gray-50 p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-200 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-gray-800">
                        📚 বিষয়: <span className="text-blue-600">{group.subjectName}</span>
                      </h3>
                      <p className="text-xs text-gray-600 mt-0.5">
                        পরীক্ষা: <span className="font-semibold text-gray-800">{getExamName(group.examType)}</span> | 
                        শ্রেণী: <span className="font-semibold text-gray-800">{group.className === "11" ? "একাদশ" : group.className === "12" ? "দ্বাদশ" : group.className}</span> | 
                        মোট শিক্ষার্থী: <span className="font-semibold text-emerald-600">{group.totalStudents} জন</span>
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUnlockSubmission(group.subjectId, group.examType)}
                        disabled={loading}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-2 rounded-xl text-xs transition shadow-sm"
                      >
                        🔓 আনলক করুন
                      </button>

                      <button
                        onClick={() => handleApproveGroup(group.subjectId, group.examType, group.className)}
                        disabled={loading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm"
                      >
                        {loading ? "অনুমোদন হচ্ছে..." : "✅ রেজাল্ট এপ্রুভ করুন"}
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                    <table className="w-full text-sm text-left text-gray-600">
                      <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 text-xs">
                        <tr>
                          <th className="p-2.5">রোল</th>
                          <th className="p-2.5">শিক্ষার্থীর নাম</th>
                          <th className="p-2.5">MCQ</th>
                          <th className="p-2.5">CQ</th>
                          <th className="p-2.5">Prac</th>
                          <th className="p-2.5">মোট</th>
                          <th className="p-2.5">গ্রেড</th>
                          <th className="p-2.5 text-right">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs">
                        {group.results.map((res) => {
                          const isEditing = editingResultId === res.id;

                          return (
                            <tr key={res.id} className="hover:bg-gray-50">
                              <td className="p-2.5 font-semibold text-gray-800">{res.students?.roll_number || "N/A"}</td>
                              <td className="p-2.5 font-medium">{res.students?.name || "N/A"}</td>

                              {isEditing ? (
                                <>
                                  <td className="p-1">
                                    <input
                                      type="text"
                                      value={editMcq}
                                      onChange={(e) => setEditMcq(e.target.value)}
                                      className="w-12 px-1 py-0.5 border rounded text-center bg-white text-xs font-bold"
                                    />
                                  </td>
                                  <td className="p-1">
                                    <input
                                      type="text"
                                      value={editCq}
                                      onChange={(e) => setEditCq(e.target.value)}
                                      className="w-12 px-1 py-0.5 border rounded text-center bg-white text-xs font-bold"
                                    />
                                  </td>
                                  <td className="p-1">
                                    <input
                                      type="text"
                                      value={editPrac}
                                      onChange={(e) => setEditPrac(e.target.value)}
                                      className="w-12 px-1 py-0.5 border rounded text-center bg-white text-xs font-bold"
                                    />
                                  </td>
                                  <td className="p-2.5 font-bold text-gray-400">-</td>
                                  <td className="p-2.5 font-bold text-gray-400">-</td>
                                  <td className="p-2.5 text-right flex gap-1 justify-end">
                                    <button
                                      onClick={() => handleSaveEditResult(res)}
                                      className="bg-green-600 text-white px-2 py-0.5 rounded text-xs font-bold"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingResultId(null)}
                                      className="bg-gray-300 text-gray-700 px-2 py-0.5 rounded text-xs font-bold"
                                    >
                                      Cancel
                                    </button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="p-2.5 font-mono">{res.is_absent && res.mcq_marks === 0 ? "A" : res.mcq_marks}</td>
                                  <td className="p-2.5 font-mono">{res.is_absent && res.cq_marks === 0 ? "A" : res.cq_marks}</td>
                                  <td className="p-2.5 font-mono">{res.is_absent && res.practical_marks === 0 ? "A" : res.practical_marks}</td>
                                  <td className="p-2.5 font-bold text-blue-600">{res.total_marks}</td>
                                  <td className="p-2.5 font-bold text-emerald-600">{res.letter_grade || "N/A"}</td>
                                  <td className="p-2.5 text-right flex gap-2 justify-end">
                                    <button
                                      onClick={() => startEditResult(res)}
                                      className="text-blue-600 hover:underline font-semibold"
                                    >
                                      এডিট
                                    </button>
                                    <button
                                      onClick={() => handleDeleteResult(res.id)}
                                      className="text-red-600 hover:underline font-semibold"
                                    >
                                      ডিলিট
                                    </button>
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">বর্তমানে কোনো পেন্ডিং রেজাল্ট নেই।</p>
            )}
          </div>
        </details>

        {/* ২. সর্বমোট GPA ও ট্যাবুলেশন শিট */}
        <details className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden group">
          <summary className="p-6 cursor-pointer font-bold text-gray-800 text-lg flex justify-between items-center bg-white hover:bg-gray-50 transition list-none select-none">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <span className="text-gray-800 font-bold">মেধা তালিকা ও ট্যাবুলেশন শিট (Overall GPA)</span>
                <p className="text-xs text-gray-500 font-normal mt-0.5">
                  অনুমোদিত সকল বিষয়ের সমন্বয়ে শিক্ষার্থীদের মেধা তালিকা ও GPA দেখুন
                </p>
              </div>
            </div>
            <span className="text-gray-400 group-open:rotate-180 transition-transform duration-200">
              ▼
            </span>
          </summary>

          <div className="p-6 border-t border-gray-200 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  {tabClass === "11" && (
                    <>
                      <option value="first_terminal">প্রথম সাময়িক (First Terminal)</option>
                      <option value="year_final">বার্ষিকী (Year Change)</option>
                    </>
                  )}
                  {tabClass === "12" && (
                    <>
                      <option value="pre_test">Pre-Test</option>
                      <option value="test">Test</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {tabClass && tabExam ? (
              tabStudents.length > 0 ? (
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-sm text-left text-gray-600 bg-white">
                    <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                      <tr>
                        <th className="p-3">রোল</th>
                        <th className="p-3">শিক্ষার্থীর নাম</th>
                        <th className="p-3 text-center">সর্বমোট GPA</th>
                        <th className="p-3 text-center">গ্রেড (Final)</th>
                        <th className="p-3 text-center">ফলাফল</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {tabStudents.map((st) => {
                        const { gpa, grade, status } = calculateStudentOverallGPA(st.id);

                        return (
                          <tr key={st.id} className="hover:bg-gray-50 transition">
                            <td className="p-3 font-semibold text-gray-800">{st.roll_number}</td>
                            <td className="p-3 font-medium">{st.name}</td>
                            <td className="p-3 text-center font-extrabold text-blue-600">{gpa}</td>
                            <td className="p-3 text-center font-extrabold text-emerald-600">{grade}</td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                  status === "Passed"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {status === "Passed" ? "পাস (Passed)" : "অকৃতকার্য (Fail)"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">কোনো শিক্ষার্থী পাওয়া যায়নি।</p>
              )
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                📌 মেধা তালিকা দেখতে উপরে থেকে <span className="font-bold">শ্রেণী</span> এবং <span className="font-bold">পরীক্ষার নাম</span> নির্বাচন করুন।
              </p>
            )}
          </div>
        </details>

        {/* ৩. শিক্ষক ব্যবস্থাপনা */}
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

        {/* ৪. শিক্ষার্থী ব্যবস্থাপনা */}
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

        {/* ৫. ডেটা রিসেট বা টেস্ট রেজাল্ট ক্লিয়ার (পাসওয়ার্ড প্রটেক্টেড) */}
        <details className="bg-red-50 rounded-2xl shadow-sm border border-red-200 overflow-hidden group">
          <summary className="p-6 cursor-pointer font-bold text-red-800 text-lg flex justify-between items-center bg-red-50 hover:bg-red-100 transition list-none select-none">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <span className="text-red-800 font-bold">ডেটা ম্যানেজমেন্ট ও রিসেট (Danger Zone)</span>
                <p className="text-xs text-red-600 font-normal mt-0.5">
                  টেস্ট পারপাসের সকল পরীক্ষার ফলাফল বা রেজাল্ট এক ক্লিকে মুছে ফেলুন (শিক্ষক ও ছাত্র অক্ষুণ্ণ থাকবে)
                </p>
              </div>
            </div>
            <span className="text-red-400 group-open:rotate-180 transition-transform duration-200">
              ▼
            </span>
          </summary>

          <div className="p-6 border-t border-red-200 space-y-4 bg-white">
            <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-sm text-red-700 space-y-2">
              <p className="font-bold">সতর্কবাণী:</p>
              <p className="text-xs">
                এই অপশনটি ব্যবহার করলে শিক্ষকদের জমা দেওয়া এবং এডমিন কর্তৃক অনুমোদিত সমস্ত পরীক্ষার রেজাল্ট ডাটাবেজ থেকে চিরতরে মুছে যাবে। তবে শিক্ষক এবং শিক্ষার্থীদের নিবন্ধিত অ্যাকাউন্টগুলো সুরক্ষিত থাকবে। এটি করার জন্য এডমিন পাসওয়ার্ড প্রদান করতে হবে।
              </p>
            </div>

            <form onSubmit={handleResetAllResults} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">এডমিন পাসওয়ার্ড দিন (নিরাপত্তার জন্য)</label>
                <input
                  type="password"
                  placeholder="এডমিন পাসওয়ার্ড লিখুন"
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 border border-red-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition shadow-sm"
              >
                {loading ? "রিসেট হচ্ছে..." : "🧹 সমস্ত টেস্ট রেজাল্ট ক্লিয়ার করুন (Clear Results)"}
              </button>
            </form>
          </div>
        </details>

      </div>
    </main>
  );
}
