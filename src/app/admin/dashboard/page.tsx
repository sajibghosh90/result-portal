"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { computeOverallResult, isFourthSubjectName, statusLabel } from "@/lib/resultCalc";
import * as XLSX from "xlsx";
import { canonicalClass } from "@/lib/classes";
import ChangePassword from "@/components/ChangePassword";
import { missingSubjects, requiredSubjects, type SubjectLite } from "@/lib/publish";

export const dynamic = "force-dynamic";

interface Student {
  id: string;
  name: string;
  roll_number: string;
  class: string;
  group_type: string;
  pin: string;
  session?: string | null;
  fourth_subject_id?: string | null;
}

interface Teacher {
  id: string;
  name: string;
  index_number: string;
  is_class_teacher: boolean;
  subject_id?: string | null;
  subjects?: { id?: string; name: string; group_type?: string | null } | null;
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
  // "শিক্ষার্থী ব্যবস্থাপনা ও প্রমোশন" সেকশনের ক্লাস ট্যাব — একাদশ/দ্বাদশ আলাদা আইসোলেটেড তালিকা
  const [stuMgmtClass, setStuMgmtClass] = useState<"11" | "12">("11");
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
  const [studentSession, setStudentSession] = useState("");
  const [studentFourth, setStudentFourth] = useState("");
  // বিদ্যমান শিক্ষার্থীর সেশন/৪র্থ বিষয় এডিট প্যানেল
  // এডিট মডাল: রোল, সেশন ও ৪র্থ বিষয় একসাথে বদলানো যায়
  const [editProfile, setEditProfile] = useState<{
    id: string;
    name: string;
    roll: string;
    session: string;
    fourth: string;
    pin: string;
  } | null>(null);

  const [teacherName, setTeacherName] = useState("");
  const [teacherIndex, setTeacherIndex] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [isClassTeacher, setIsClassTeacher] = useState(false);

  // রিসেট বা ডাটা ক্লিয়ার সিকিউরিটি স্টেট
  const [resetPasswordInput, setResetPasswordInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // নতুন শিক্ষার্থী যোগের ফর্মে ৪র্থ বিষয় ডিফল্ট হিসেবে অর্থনীতি আগে থেকে বাছা থাকবে
  useEffect(() => {
    if (studentFourth || subjectList.length === 0) return;
    const eco = subjectList.find((sb) => isFourthSubjectName(sb.name));
    if (eco) setStudentFourth(eco.id);
  }, [subjectList, studentFourth]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

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

  // সব ডেটা সার্ভার থেকে আসে (এডমিন সেশন যাচাই করে) — ব্রাউজার সরাসরি ডেটাবেসে যায় না
  const loadData = async () => {
    try {
      const res = await fetch("/api/admin/data", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setMessage("❌ ডেটা লোড করতে সমস্যা: " + (data.error || ""));
        return;
      }
      setSubjectList(data.subjects || []);
      setTeachers(data.teachers || []);
      setStudents(data.students || []);
      setPendingResults(data.pendingResults || []);
      setApprovedResults(data.approvedResults || []);
    } catch (e) {
      console.error("Data load error:", e);
      setMessage("❌ নেটওয়ার্ক সমস্যা, ডেটা লোড হয়নি।");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    router.push("/admin/login");
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/actions/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          name: studentName.trim(),
          rollNumber: studentRoll.trim(),
          studentClass: studentClass.trim(),
          groupType: studentGroup.trim(),
          session: studentSession.trim(),
          fourthSubjectId: studentFourth || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage("❌ সেভ করতে সমস্যা: " + data.error);
      } else {
        setMessage(`✅ নতুন শিক্ষার্থী যুক্ত হয়েছে! PIN: ${data.plainPin} (তালিকায়ও দেখা যাবে)`);
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
  }; // <--- handleAddStudent ফাংশন এখানে একবারই সুন্দরভাবে শেষ হলো।


  // =========================================================
  // নতুন প্রমোশন ও রোল আপডেট ফাংশন দুটি ঠিক এর নিচেই থাকবে:
  // =========================================================

  // ১. একাদশ থেকে দ্বাদশ শ্রেণীতে ব্যাচ প্রমোশন ফাংশন
  const handlePromoteClass11To12 = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/actions/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "promote_11_to_12" }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert("❌ " + (data.error || "প্রমোশন করতে সমস্যা হয়েছে।"));
      } else {
        alert(`✅ সফলভাবে ${data.count} জন শিক্ষার্থীকে দ্বাদশ শ্রেণীতে উন্নীত (Promote) করা হয়েছে!`);
        await loadData();
      }
    } catch (err: any) {
      alert("❌ প্রমোশন করতে সমস্যা হয়েছে: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ১.৫ শিক্ষার্থীর রোল, সেশন ও ৪র্থ বিষয় আপডেট (এডিট মডাল থেকে)
  const handleSaveStudent = async () => {
    if (!editProfile) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/actions/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_student",
          studentId: editProfile.id,
          rollNumber: editProfile.roll.trim(),
          session: editProfile.session.trim(),
          fourthSubjectId: editProfile.fourth || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage("✅ শিক্ষার্থীর তথ্য আপডেট হয়েছে।");
      setEditProfile(null);
      await loadData();
    } catch (err: any) {
      setMessage("❌ আপডেট করতে সমস্যা: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // নতুন PIN তৈরি
  const handleResetPin = async () => {
    if (!editProfile) return;
    if (!confirm(`"${editProfile.name}" এর জন্য নতুন PIN তৈরি করবেন? পুরনো PIN আর কাজ করবে না।`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/actions/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_pin", studentId: editProfile.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditProfile({ ...editProfile, pin: data.plainPin });
      setMessage(`✅ নতুন PIN: ${data.plainPin}`);
      await loadData();
    } catch (err: any) {
      setMessage("❌ PIN রিসেট করতে সমস্যা: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!confirm(`আপনি কি নিশ্চিত যে "${name}"-কে এবং তার সকল রেজাল্ট ডাটাবেস থেকে স্থায়ীভাবে মুছে ফেলতে চান?`)) return;

    try {
      const res = await fetch(`/api/admin/actions/students?id=${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        setMessage("❌ শিক্ষার্থী ডিলিট করতে সমস্যা: " + data.error);
      } else {
        setMessage(`🗑️ "${name}" এবং তার সমস্ত ফলাফল সফলভাবে মুছে ফেলা হয়েছে!`);
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
      setMessage("❌ অনুগ্রহ করে শিক্ষকের জন্য একটি বিষয় নির্বাচন করুন।");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/actions/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teacherName.trim(),
          indexNumber: teacherIndex.trim(),
          password: teacherPassword,
          subjectId: selectedSubjectId,
          isClassTeacher,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage("❌ শিক্ষক যোগ করতে সমস্যা হয়েছে: " + data.error);
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

  // একটি শ্রেণী + পরীক্ষার সব বিষয়ের রেজাল্ট একসাথে প্রকাশ — সব বিষয় না এলে সার্ভারও প্রকাশ করতে দেয় না
  const handlePublishExam = async (cls: string, examType: string) => {
    if (
      !confirm(
        `আপনি কি ${cls === "11" ? "একাদশ" : cls === "12" ? "দ্বাদশ" : cls} শ্রেণীর "${getExamName(examType)}" এর সব বিষয়ের রেজাল্ট এখনই প্রকাশ করতে চান? প্রকাশের পর শিক্ষার্থীরা রেজাল্ট দেখতে পারবে।`
      )
    )
      return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/actions/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish_exam", className: cls, examType }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage("❌ " + (data.error || "রেজাল্ট প্রকাশ করতে সমস্যা হয়েছে।"));
      } else {
        setMessage("✅ রেজাল্ট সফলভাবে প্রকাশ করা হয়েছে! এখন শিক্ষার্থীরা দেখতে পারবে।");
        await loadData();
      }
    } catch (err: any) {
      setMessage("❌ এরর: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockSubmission = async (subjectId: string, examType: string) => {
    if (!confirm("আপনি কি এই বিষয় ও পরীক্ষার জন্য শিক্ষকের সাবমিশন আনলক করতে চান?")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/actions/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlock", subjectId, examType }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage("❌ আনলক করতে সমস্যা: " + data.error);
      } else {
        setMessage("🔓 সাবমিশন সফলভাবে আনলক করা হয়েছে!");
        await loadData();
      }
    } catch (err: any) {
      setMessage("❌ এরর: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResult = async (resultId: string) => {
    if (!confirm("আপনি কি নিশ্চিত যে এই রেজাল্টটি ডাটাবেস থেকে স্থায়ীভাবে মুছে ফেলতে চান?")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/actions/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_result", resultId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage("❌ ডিলিট করতে সমস্যা: " + data.error);
      } else {
        setMessage("🗑️ রেজাল্ট সফলভাবে মুছে ফেলা হয়েছে!");
        await loadData();
      }
    } catch (err: any) {
      setMessage("❌ এরর: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // নির্দিষ্ট মাস্টার পাসওয়ার্ড দিয়ে টেস্ট ডাটা রিসেট করার ফাংশন
  const handleResetAllResults = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!confirm("⚠️ আপনি কি সত্যিই সমস্ত পরীক্ষার ফলাফল (পেন্ডিং ও অনুমোদিত উভয়ই) ডাটাবেস থেকে চিরতরে মুছে ফেলতে চান?")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/actions/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_all", password: resetPasswordInput }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage("❌ " + (data.error || "ডাটা রিসেট করতে সমস্যা হয়েছে।"));
      } else {
        setMessage("🧹 সফলভাবে সমস্ত টেস্ট ও পরীক্ষার রেজাল্ট মুছে ফেলা হয়েছে! ডাটাবেজ এখন সম্পূর্ণ ফ্রেশ।");
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
    setLoading(true);

    // গ্রেড ক্যালকুলেশন এখন সার্ভারে (/api/admin/actions/results, action: edit_result) হয় —
    // এতে client থেকে সরাসরি ভুয়া গ্রেড পাঠিয়ে দেওয়ার সুযোগ থাকে না।
    try {
      const apiRes = await fetch("/api/admin/actions/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit_result",
          resultId: res.id,
          editMcq,
          editCq,
          editPrac,
        }),
      });
      const data = await apiRes.json();

      if (!apiRes.ok) {
        setMessage("❌ আপডেট করতে সমস্যা: " + data.error);
      } else {
        setMessage("✏️ রেজাল্ট সফলভাবে সংশোধন করা হয়েছে!");
        setEditingResultId(null);
        await loadData();
      }
    } catch (err: any) {
      setMessage("❌ এরর: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // এডমিন কোনো শিক্ষকের পাসওয়ার্ড রিসেট করে নতুন একটি দিতে পারেন
  const handleResetTeacherPassword = async (id: string, name: string) => {
    const pw = window.prompt(`"${name}"-এর জন্য নতুন পাসওয়ার্ড লিখুন (কমপক্ষে ৬ অক্ষর, ৮+ হলে ভালো):`);
    if (pw === null) return;
    if (pw.length < 6) {
      setMessage("❌ পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।");
      return;
    }
    const res = await fetch("/api/admin/actions/teachers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, newPassword: pw }),
    });
    const data = await res.json();
    setMessage(res.ok ? `✅ ${name}-এর পাসওয়ার্ড রিসেট হয়েছে। নতুন পাসওয়ার্ডটি তাঁকে জানিয়ে দিন।` : "❌ " + (data.error || "রিসেট করা যায়নি।"));
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm("আপনি কি এই শিক্ষককে ডিলিট করতে চান?")) return;

    const res = await fetch(`/api/admin/actions/teachers?id=${id}`, { method: "DELETE" });
    if (res.ok) loadData();
  };

  // সামগ্রিক GPA — অনুপস্থিতি ও ৪র্থ বিষয় (Economics) নিয়মসহ (src/lib/resultCalc.ts)
  const calculateStudentOverallGPA = (studentId: string) => {
    const rows = approvedResults.filter((r) => r.student_id === studentId && r.exam_type === tabExam);
    const stu = students.find((s) => s.id === studentId);
    return computeOverallResult(rows, stu?.fourth_subject_id);
  };

  // মেধা তালিকা Excel ফাইল আকারে ডাউনলোড — বর্তমানে স্ক্রিনে যা দেখানো হচ্ছে ঠিক তাই, প্রতি বিষয়ের নম্বর/গ্রেড কলামসহ
  const handleExportExcel = () => {
    if (!tabClass || !tabExam || tabStudents.length === 0) return;

    const header = [
      "রোল",
      "নাম",
      "বিভাগ",
      "সেশন",
      ...subjectList.flatMap((s) => [`${s.name} (নম্বর)`, `${s.name} (গ্রেড)`]),
      "GPA",
      "গ্রেড (Final)",
      "ফলাফল",
    ];

    const rows = tabStudents.map((st) => {
      const { gpa, grade, status } = calculateStudentOverallGPA(st.id);
      const subjectCells = subjectList.flatMap((sub) => {
        const r = approvedResults.find(
          (rr) =>
            rr.student_id === st.id &&
            rr.subject_id === sub.id &&
            rr.exam_type === tabExam
        );
        if (!r) return ["-", "-"];
        return [
          r.is_absent ? "অনুপস্থিত" : r.total_marks,
          r.is_absent ? "F" : r.letter_grade,
        ];
      });
      return [
        st.roll_number,
        st.name,
        st.group_type,
        st.session || "-",
        ...subjectCells,
        gpa,
        grade,
        statusLabel(status),
      ];
    });

    try {
      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Result");

      const classLabel = tabClass === "11" ? "Class11" : "Class12";
      const filename = `Result_${classLabel}_${tabExam}.xlsx`;

      // XLSX.writeFile কিছু ব্রাউজারে/মোবাইলে নীরবে ফেইল করে — তাই নিজেই Blob বানিয়ে ডাউনলোড লিংক ক্লিক করা হচ্ছে
      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([out], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err: any) {
      console.error("Excel export error:", err);
      setMessage("❌ Excel ডাউনলোড করতে সমস্যা: " + (err?.message || "অজানা এরর"));
    }
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
          subjectName: item.subjects?.name || "বিষয়",
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

  // রেজাল্ট প্রকাশ প্যানেল — প্রতিটি (শ্রেণী + পরীক্ষা) এর জন্য কোন বিষয়ের রেজাল্ট এসেছে/বাকি আছে
  const teacherSubjects: SubjectLite[] = teachers
    .map((t) => t.subjects)
    .filter((x): x is NonNullable<Teacher["subjects"]> & { id: string } => !!x && !!x.id)
    .map((x) => ({ id: x.id, name: x.name, group_type: x.group_type }));

  const publishBatches = (() => {
    const keys = new Map<string, { cls: string; exam: string }>();
    pendingResults.forEach((r) => {
      const cls = canonicalClass(r.students?.class);
      if (!cls || !r.exam_type) return;
      keys.set(`${cls}_${r.exam_type}`, { cls, exam: r.exam_type });
    });

    return [...keys.values()]
      .sort((x, y) => (x.cls + x.exam).localeCompare(y.cls + y.exam))
      .map(({ cls, exam }) => {
        const classStudents = students.filter((st) => st.class === cls);
        const ids = new Set(classStudents.map((st) => st.id));
        const present = new Set<string>();
        [...pendingResults, ...approvedResults].forEach((r) => {
          if (r.exam_type === exam && ids.has(r.student_id)) present.add(r.subject_id);
        });
        const required = requiredSubjects(teacherSubjects, classStudents);
        const missing = missingSubjects(required, present);
        return {
          cls,
          exam,
          required,
          missing,
          presentIds: present,
          ready: required.length > 0 && missing.length === 0,
        };
      });
  })();

  // নির্বাচিত শ্রেণী ও পরীক্ষার অন্তত একটি অনুমোদিত রেজাল্ট আছে কিনা — না থাকলে "প্রকাশিত হয়নি" বার্তা দেখানো হয়
  const tabStudentIds = new Set(tabStudents.map((s) => s.id));
  const hasPublishedResults = approvedResults.some(
    (r) => r.exam_type === tabExam && tabStudentIds.has(r.student_id)
  );

  // শিক্ষার্থী ব্যবস্থাপনা তালিকা — নির্বাচিত ক্লাস ট্যাব অনুযায়ী
  const is11 = (c: string) => c === "11" || c === "১১" || c === "একাদশ";
  const is12 = (c: string) => c === "12" || c === "১২" || c === "দ্বাদশ";
  const stuMgmtList = students.filter((st) => (stuMgmtClass === "11" ? is11(st.class) : is12(st.class)));
  const GROUP_LABELS: Record<string, string> = { science: "বিজ্ঞান", arts: "মানবিক", commerce: "ব্যবসায় শিক্ষা" };

return (
    <main className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
     {/* ========================================================= */}
{/* ইনস্টিটিউশনাল হেডার — অফিসিয়াল/সার্টিফিকেট-স্টাইল, সংযত ডিজাইন */}
{/* ========================================================= */}
<header className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 shadow-xl">
  {/* সূক্ষ্ম ডায়াগোনাল টেক্সচার — অফিসিয়াল কাগজ/সার্টিফিকেটের অনুভূতি */}
  <div
    className="pointer-events-none absolute inset-0 opacity-[0.05]"
    style={{
      backgroundImage:
        "repeating-linear-gradient(135deg, #fff 0px, #fff 1px, transparent 1px, transparent 14px)",
    }}
  />

  <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6 px-6 py-6 sm:px-8">
    {/* বাম: লোগো ও প্রতিষ্ঠানের নাম */}
    <div className="flex items-center gap-5 text-center lg:text-left">
      <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl bg-white p-2 ring-1 ring-amber-300/40 shadow-lg">
        <img
          src="/NEW LOGO.png"
          alt="ছকাপন উচ্চ বিদ্যালয় ও কলেজ লোগো"
          className="w-full h-full object-contain"
        />
      </div>
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
          ছকাপন উচ্চ বিদ্যালয় ও কলেজ
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          অফিসিয়াল এডমিন ও ফলাফল ব্যবস্থাপনা পোর্টাল
        </p>
      </div>
    </div>

    {/* ডান: সেশন ব্যাজ, ভার্সন ব্যাজ ও লগআউট */}
    <div className="flex flex-wrap items-center justify-center gap-3">
      <div className="rounded-lg border border-slate-600/60 bg-slate-800/60 px-3 py-2 text-xs text-slate-300">
        সেশন <span className="font-semibold text-white">২০২৬</span>
      </div>
      <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-300">
        Admin Panel · v2.0
      </div>
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-600"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        লগআউট
      </button>
    </div>
  </div>

  {/* নিচে সোনালী রেখা — সীলমোহর/সার্টিফিকেটের অনুভূতি */}
  <div className="h-[3px] bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500" />
</header>

<ChangePassword endpoint="/api/admin/password" />
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
        <details className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden group">
          <summary className="p-6 cursor-pointer font-bold text-gray-800 text-lg flex justify-between items-center bg-white hover:bg-gray-50 transition list-none select-none">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📝</span>
              <div>
                <span className="text-gray-800 font-bold">রেজাল্ট প্রকাশ ও সংশোধন (Result Publish & Edit)</span>
                <p className="text-xs text-gray-500 font-normal mt-0.5">
                  সব বিষয়ের রেজাল্ট জমা হলে একসাথে প্রকাশ করুন; প্রয়োজনে সংশোধন, ডিলিট অথবা শিক্ষকের জন্য আনলক করুন
                </p>
              </div>
            </div>
            <span className="text-gray-400 group-open:rotate-180 transition-transform duration-200">
              ▼
            </span>
          </summary>

          <div className="p-6 border-t border-gray-200 space-y-6">
            {publishBatches.map((b) => (
              <div key={`${b.cls}_${b.exam}`} className="border border-emerald-200 bg-emerald-50 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-800">
                      🚀 {b.cls === "11" ? "একাদশ" : b.cls === "12" ? "দ্বাদশ" : b.cls} শ্রেণী — {getExamName(b.exam)}
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      জমা হয়েছে: <span className="font-semibold text-emerald-700">{b.required.length - b.missing.length}</span> /{" "}
                      {b.required.length} টি বিষয়
                    </p>
                  </div>
                  <button
                    onClick={() => handlePublishExam(b.cls, b.exam)}
                    disabled={loading || !b.ready}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm"
                  >
                    {loading ? "অপেক্ষা করো..." : "🚀 রেজাল্ট প্রকাশ করুন"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {b.required.map((sub) => (
                    <span
                      key={sub.id}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold ${
                        b.presentIds.has(sub.id) ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {b.presentIds.has(sub.id) ? "✔" : "⏳"} {sub.name}
                    </span>
                  ))}
                </div>
                {!b.ready && (
                  <p className="text-xs text-amber-700">
                    {b.required.length === 0
                      ? "এই শ্রেণীর কোনো বিষয়ে শিক্ষক নিয়োগ দেওয়া নেই।"
                      : "সব বিষয়ের রেজাল্ট জমা না হওয়া পর্যন্ত প্রকাশ করা যাবে না।"}
                  </p>
                )}
              </div>
            ))}

            {groupedResults.length > 0 ? (
              groupedResults.map((group) => (
                <div key={group.groupKey} className="border border-gray-200 rounded-xl bg-gray-50 p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-200 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-gray-800">
                        📚 বিষয়: <span className="text-blue-600">{group.subjectName}</span>
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
                  অনুমোদিত সকল বিষয়ের সমন্বয়ে শিক্ষার্থীদের মেধা তালিকা ও GPA দেখুন
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
              tabStudents.length > 0 && hasPublishedResults ? (
                <>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm flex items-center gap-1.5"
                  >
                    📥 Excel ডাউনলোড করুন
                  </button>
                </div>
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
                        const bad = status === "Fail" || status === "Absent";

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
                                    : bad
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {statusLabel(status)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                </>
              ) : tabStudents.length > 0 ? (
                <div className="text-center py-10 px-4 rounded-xl border border-dashed border-amber-300 bg-amber-50">
                  <p className="text-2xl mb-2">⏳</p>
                  <p className="text-sm font-bold text-amber-800">এখনো রেজাল্ট প্রকাশিত হয়নি।</p>
                  <p className="text-xs text-amber-700 mt-1">
                    এই শ্রেণী ও পরীক্ষার কোনো অনুমোদিত রেজাল্ট নেই। শিক্ষকদের জমা দেওয়া রেজাল্ট অনুমোদন করলে এখানে মেধা তালিকা দেখা যাবে।
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">কোনো শিক্ষার্থী পাওয়া যায়নি।</p>
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
                <label className="block text-xs font-semibold text-gray-600 mb-1">পাসওয়ার্ড</label>
                <input
                  type="password"
                  placeholder="কমপক্ষে ৬ অক্ষর"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  minLength={6}
                  required
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">বিষয় নির্বাচন করুন *</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  required
                >
                  <option value="">-- বিষয় বেছে নিন --</option>
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
                      <th className="p-3">বিষয়</th>
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
                        <td className="p-3 text-right space-x-3 whitespace-nowrap">
                          <button
                            onClick={() => handleResetTeacherPassword(tc.id, tc.name)}
                            className="text-blue-600 hover:underline font-semibold text-xs"
                          >
                            🔑 পাসওয়ার্ড রিসেট
                          </button>
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

        {/* ৪. শিক্ষার্থী ব্যবস্থাপনা ও প্রমোশন মডিউল */}
        <details className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden group">
          <summary className="p-6 cursor-pointer font-bold text-gray-800 text-lg flex justify-between items-center bg-white hover:bg-gray-50 transition list-none select-none">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎓</span>
              <div>
                <span className="text-gray-800 font-bold">শিক্ষার্থী ব্যবস্থাপনা ও প্রমোশন</span>
                <p className="text-xs text-gray-500 font-normal mt-0.5">
                  নতুন শিক্ষার্থী নিবন্ধিত করুন, একাদশ থেকে দ্বাদশ শ্রেণীতে প্রমোট করুন এবং রোল/ডাটা পরিচালনা করুন
                </p>
              </div>
            </div>
            <span className="text-gray-400 group-open:rotate-180 transition-transform duration-200">
              ▼
            </span>
          </summary>

          <div className="p-6 border-t border-gray-200 space-y-6">
            
            {/* নতুন প্রমোশন অ্যাকশন ব্যানার */}
            <div className="bg-gradient-to-r from-indigo-900 to-blue-800 text-white p-5 rounded-xl shadow flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h4 className="font-bold text-base">একাদশ থেকে দ্বাদশ শ্রেণী প্রমোশন মডিউল</h4>
                <p className="text-xs text-indigo-200 mt-0.5">এক ক্লিকে সকল একাদশ শ্রেণীর শিক্ষার্থীকে দ্বাদশ শ্রেণীতে উন্নীত করুন। (পুরনো রেজাল্ট অক্ষুণ্ণ থাকবে)</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm("আপনি কি নিশ্চিতভাবে সকল একাদশ শ্রেণীর শিক্ষার্থীকে দ্বাদশ শ্রেণীতে প্রমোট করতে চান?")) return;
                  // প্রমোশন লজিক হ্যান্ডলার কল হবে
                  if (typeof handlePromoteClass11To12 === 'function') {
                    await handlePromoteClass11To12();
                  } else {
                    alert("প্রমোশন ফাংশনটি মূল ফাইলের সাথে যুক্ত করা হয়েছে।");
                  }
                }}
                className="bg-white text-indigo-900 hover:bg-indigo-50 font-bold px-4 py-2 rounded-lg text-sm shadow transition whitespace-nowrap"
              >
                🚀 Class 11 থেকে 12 প্রমোট করুন
              </button>
            </div>

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
                  <option value="science">বিজ্ঞান (science)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">সেশন (Session)</label>
                <input
                  type="text"
                  list="session-suggestions"
                  placeholder="যেমন: 2025-26"
                  value={studentSession}
                  onChange={(e) => setStudentSession(e.target.value)}
                  pattern="\d{4}-(\d{2}|\d{4})"
                  title="ফরম্যাট: 2025-26 অথবা 2025-2026"
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  required
                />
                <datalist id="session-suggestions">
                  {[-1, 0, 1].map((d) => {
                    const y = new Date().getFullYear() + d;
                    return <option key={y} value={`${y}-${String((y + 1) % 100).padStart(2, "0")}`} />;
                  })}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">৪র্থ বিষয় (Fourth Subject)</label>
                <select
                  value={studentFourth}
                  onChange={(e) => setStudentFourth(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  required
                >
                  <option value="">-- ৪র্থ বিষয় বাছুন --</option>
                  {subjectList.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} {sub.group_type ? `(${sub.group_type})` : ""}
                    </option>
                  ))}
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
              {(() => {
                const count11 = students.filter((s) => is11(s.class)).length;
                const count12 = students.filter((s) => is12(s.class)).length;
                return (
                  <div className="flex gap-2 mb-4 bg-gray-100 p-1.5 rounded-xl w-full sm:w-fit">
                    {([
                      { key: "11", label: "একাদশ শ্রেণী", count: count11 },
                      { key: "12", label: "দ্বাদশ শ্রেণী", count: count12 },
                    ] as const).map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setStuMgmtClass(t.key)}
                        className={`flex-1 sm:flex-none px-5 py-2 rounded-lg text-sm font-bold transition ${
                          stuMgmtClass === t.key ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-white"
                        }`}
                      >
                        {t.label} ({t.count} জন)
                      </button>
                    ))}
                  </div>
                );
              })()}
              <h3 className="text-base font-bold text-gray-800 mb-3">
                {stuMgmtClass === "11" ? "একাদশ" : "দ্বাদশ"} শ্রেণীর শিক্ষার্থীদের তালিকা
              </h3>
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-sm text-left text-gray-600 bg-white">
                  <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-3">রোল</th>
                      <th className="p-3">শিক্ষার্থীর নাম</th>
                      <th className="p-3">বিভাগ</th>
                      <th className="p-3">সেশন</th>
                      <th className="p-3">পিন (PIN)</th>
                      <th className="p-3 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stuMgmtList.map((st) => (
                      <tr key={st.id} className="hover:bg-gray-50 transition">
                        <td className="p-3 font-semibold text-indigo-600">{st.roll_number}</td>
                        <td className="p-3 font-medium text-gray-800">{st.name}</td>
                        <td className="p-3">{GROUP_LABELS[st.group_type] || st.group_type}</td>
                        <td className="p-3 font-medium">{st.session || <span className="text-gray-400">—</span>}</td>
                        <td className="p-3 font-mono font-bold text-blue-600">{st.pin || "—"}</td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() =>
                              setEditProfile({
                                id: st.id,
                                name: st.name,
                                roll: st.roll_number,
                                session: st.session || "",
                                fourth: st.fourth_subject_id || "",
                                pin: st.pin || "",
                              })
                            }
                            className="text-indigo-700 hover:bg-indigo-100 font-semibold text-xs bg-indigo-50 px-3 py-1.5 rounded-md transition mr-2"
                          >
                            ✏️ এডিট
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(st.id, st.name)}
                            className="text-red-600 hover:bg-red-100 font-semibold text-xs bg-red-50 px-3 py-1.5 rounded-md transition"
                          >
                            🗑️ ডিলিট
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {stuMgmtList.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">এই শ্রেণীতে কোনো শিক্ষার্থী নেই।</p>
              )}
            </div>
          </div>
        </details>

        {/* ৫. ডেটা রিসেট বা টেস্ট রেজাল্ট ক্লিয়ার (পাসওয়ার্ড প্রটেক্টেড) */}
        <details className="bg-red-50 rounded-2xl shadow-sm border border-red-200 overflow-hidden group">
          <summary className="p-6 cursor-pointer font-bold text-red-800 text-lg flex justify-between items-center bg-red-50 hover:bg-red-100 transition list-none select-none">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <span className="text-red-800 font-bold">ডেটা ব্যবস্থাপনা ও রিসেট (Danger Zone)</span>
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
                এই অপশনটি ব্যবহার করলে শিক্ষকদের জমা দেওয়া এবং এডমিন কর্তৃক অনুমোদিত সমস্ত পরীক্ষার রেজাল্ট ডাটাবেজ থেকে চিরতরে মুছে যাবে। তবে শিক্ষক এবং শিক্ষার্থীদের নিবন্ধিত অ্যাকাউন্টগুলো সুরক্ষিত থাকবে। এটি করার জন্য এডমিন পাসওয়ার্ড প্রদান করতে হবে।
              </p>
            </div>

            <form onSubmit={handleResetAllResults} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">এডমিন পাসওয়ার্ড দিন (নিরাপত্তার জন্য)</label>
                <input
                  type="password"
                  placeholder="এডমিন পাসওয়ার্ড লিখুন"
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

        {/* শিক্ষার্থী এডিট মডাল */}
        {editProfile && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setEditProfile(null)}
          >
            <div
              className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <h3 className="text-base font-bold text-gray-800">✏️ শিক্ষার্থীর তথ্য এডিট</h3>
                <p className="text-sm text-gray-500 mt-0.5">{editProfile.name}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">রোল নম্বর</label>
                <input
                  type="text"
                  value={editProfile.roll}
                  onChange={(e) => setEditProfile({ ...editProfile, roll: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">সেশন</label>
                <input
                  type="text"
                  list="session-suggestions"
                  placeholder="যেমন: 2025-26"
                  value={editProfile.session}
                  onChange={(e) => setEditProfile({ ...editProfile, session: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">৪র্থ বিষয়</label>
                <select
                  value={editProfile.fourth}
                  onChange={(e) => setEditProfile({ ...editProfile, fourth: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                >
                  <option value="">-- ৪র্থ বিষয় বাছুন --</option>
                  {subjectList.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} {sub.group_type ? `(${sub.group_type})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                <div className="text-xs text-gray-600">
                  PIN: <span className="font-mono font-bold text-blue-600 text-sm">{editProfile.pin || "—"}</span>
                </div>
                <button
                  type="button"
                  onClick={handleResetPin}
                  disabled={loading}
                  className="text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-md disabled:opacity-50"
                >
                  🔑 নতুন PIN তৈরি
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveStudent}
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-sm disabled:opacity-50"
                >
                  {loading ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditProfile(null)}
                  className="flex-1 bg-white border text-gray-700 font-bold py-2 rounded-lg text-sm"
                >
                  বাতিল
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
