"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://sggawreafobexiitvzhk.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Q3yt3P2yL1Pni5j9kc_TEA_GstfuUW8";

interface TeacherSession {
  id: string;
  name: string;
  index_number: string;
  subject_id: string;
  is_class_teacher: boolean;
}

interface SubjectDetail {
  id: string;
  name: string;
  group_type: string;
  mcq_full: number;
  cq_full: number;
  practical_full: number;
}

interface Student {
  id: string;
  name: string;
  roll_number: string;
  class: string;
  group_type: string;
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
  subjects?: { name: string } | null;
}

export default function TeacherDashboard() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"input" | "history" | "tabulation">("input");
  const [teacher, setTeacher] = useState<TeacherSession | null>(null);
  const [subject, setSubject] = useState<SubjectDetail | null>(null);
  const [selectedClass, setSelectedClass] = useState("");
  const [examType, setExamType] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  
  // মার্কস ইনপুট স্টেট
  const [marks, setMarks] = useState<{ [key: string]: { mcq: string; cq: string; practical: string } }>({});
  
  // সাবমিটেড হিস্ট্রি এবং ট্যাবুলেশন ডাটা
  const [submittedHistory, setSubmittedHistory] = useState<{ [key: string]: ResultRecord }>({});
  const [allApprovedResults, setAllApprovedResults] = useState<ResultRecord[]>([]);

  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(false);

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
      console.error("Supabase Client Init Error:", err);
      return null;
    }
  };

  useEffect(() => {
    const sessionData = localStorage.getItem("teacherSession");
    if (!sessionData) {
      router.push("/teacher/login");
      return;
    }

    try {
      const parsedTeacher: TeacherSession = JSON.parse(sessionData);
      setTeacher(parsedTeacher);

      if (parsedTeacher.subject_id) {
        fetchSubjectDetails(parsedTeacher.subject_id);
      }
    } catch (e) {
      console.error("Session parse error:", e);
      router.push("/teacher/login");
    }
  }, []);

  const fetchSubjectDetails = async (subjectId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { data } = await supabase
      .from("subjects")
      .select("*")
      .eq("id", subjectId)
      .single();

    if (data) setSubject(data);
  };

  // শ্রেণী বা পরীক্ষা পরিবর্তন হলে শিক্ষার্থীদের তথ্য এবং পূর্বে সেভ হওয়া রেজাল্ট চেক করা
  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      setSubmittedHistory({});
      setIsAlreadySubmitted(false);
      return;
    }

    const fetchStudentsAndExistingResults = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const { data: stData } = await supabase
        .from("students")
        .select("id, name, roll_number, class, group_type")
        .eq("class", selectedClass)
        .order("roll_number", { ascending: true });

      if (stData) {
        setStudents(stData);
        
        // ইনপুট ক্লিয়ার
        const initialMarks: { [key: string]: { mcq: string; cq: string; practical: string } } = {};
        stData.forEach((st) => {
          initialMarks[st.id] = { mcq: "", cq: "", practical: "" };
        });
        setMarks(initialMarks);

        // যদি পরীক্ষা সিলেক্ট করা থাকে তবে আগে সেভ করা রেজাল্ট আছে কিনা তা চেক করব
        if (examType && teacher && subject) {
          const { data: resData } = await supabase
            .from("results")
            .select("*")
            .eq("subject_id", subject.id)
            .eq("exam_type", examType);

          if (resData && resData.length > 0) {
            setIsAlreadySubmitted(true);
            const historyMap: { [key: string]: ResultRecord } = {};
            resData.forEach((r) => {
              historyMap[r.student_id] = r;
            });
            setSubmittedHistory(historyMap);
          } else {
            setIsAlreadySubmitted(false);
            setSubmittedHistory({});
          }
        }
      }
    };

    fetchStudentsAndExistingResults();
  }, [selectedClass, examType, teacher, subject]);

  // ট্যাবুলেশন শিট লোড
  useEffect(() => {
    if (activeTab === "tabulation" && selectedClass && examType) {
      const fetchTabulation = async () => {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const { data } = await supabase
          .from("results")
          .select("*, subjects(name)")
          .eq("exam_type", examType)
          .eq("status", "approved");

        if (data) {
          setAllApprovedResults(data as any);
        }
      };

      fetchTabulation();
    }
  }, [activeTab, selectedClass, examType]);

  const handleLogout = () => {
    localStorage.removeItem("teacherSession");
    router.push("/teacher/login");
  };

  const handleMarkChange = (studentId: string, field: "mcq" | "cq" | "practical", value: string) => {
    let val = value.trim();
    if (val.toLowerCase() === "a") {
      val = "A";
    }

    setMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: val,
      },
    }));
  };

  const calculateGradeAndPoint = (stMarks: { mcq: string; cq: string; practical: string }) => {
    if (!subject) return { grade: "F", point: 0, statusText: "Fail", isPassed: false };

    const isMcqAbsent = subject.mcq_full > 0 && stMarks.mcq === "A";
    const isCqAbsent = subject.cq_full > 0 && stMarks.cq === "A";
    const isPracAbsent = subject.practical_full > 0 && stMarks.practical === "A";

    if (isMcqAbsent || isCqAbsent || isPracAbsent) {
      return { grade: "F", point: 0, statusText: "Absent", isPassed: false };
    }

    const mcqVal = Number(stMarks.mcq) || 0;
    const cqVal = Number(stMarks.cq) || 0;
    const pracVal = Number(stMarks.practical) || 0;

    const isICT = subject.name.toLowerCase().includes("ict") || subject.name.includes("আইসিটি") || subject.name.toLowerCase().includes("information");

    let isPassed = true;

    if (isICT) {
      if (cqVal < 17 || mcqVal < 8) isPassed = false;
    } else {
      if (subject.cq_full > 0 && cqVal < Math.ceil(subject.cq_full * 0.33)) isPassed = false;
      if (subject.mcq_full > 0 && mcqVal < Math.ceil(subject.mcq_full * 0.33)) isPassed = false;
      if (subject.practical_full > 0 && pracVal < Math.ceil(subject.practical_full * 0.33)) isPassed = false;
    }

    if (!isPassed) {
      return { grade: "F", point: 0, statusText: "F (Fail)", isPassed: false };
    }

    const totalObtained = mcqVal + cqVal + pracVal;
    const effectiveFullMarks = isICT ? 75 : (subject.mcq_full + subject.cq_full + subject.practical_full);
    const percentage = (totalObtained / (effectiveFullMarks || 100)) * 100;

    if (percentage >= 80) return { grade: "A+", point: 5.0, statusText: "A+", isPassed: true };
    if (percentage >= 70) return { grade: "A", point: 4.0, statusText: "A", isPassed: true };
    if (percentage >= 60) return { grade: "A-", point: 3.5, statusText: "A-", isPassed: true };
    if (percentage >= 50) return { grade: "B", point: 3.0, statusText: "B", isPassed: true };
    if (percentage >= 40) return { grade: "C", point: 2.0, statusText: "C", isPassed: true };
    if (percentage >= 33) return { grade: "D", point: 1.0, statusText: "D", isPassed: true };

    return { grade: "F", point: 0, statusText: "F (Fail)", isPassed: false };
  };

  const handleSubmitResults = async () => {
    if (!selectedClass || !examType) {
      setMessage("❌ অনুগ্রহ করে শ্রেণী এবং পরীক্ষার নাম নির্বাচন করুন।");
      return;
    }

    if (!teacher || !subject) {
      setMessage("❌ শিক্ষক অথবা বিষয়ের তথ্য পাওয়া যায়নি।");
      return;
    }

    // ১. ভ্যালিডেশন চেক (ফাঁকা ফিল্ড ও সর্বোচ্চ নম্বর অতিক্রম)
    for (const st of students) {
      const stMarks = marks[st.id] || { mcq: "", cq: "", practical: "" };

      if (subject.mcq_full > 0 && stMarks.mcq === "") {
        alert(`রোল ${st.roll_number} (${st.name})-এর MCQ নম্বর বা 'A' ইনপুট দেওয়া হয়নি!`);
        return;
      }
      if (subject.cq_full > 0 && stMarks.cq === "") {
        alert(`রোল ${st.roll_number} (${st.name})-এর CQ নম্বর বা 'A' ইনপুট দেওয়া হয়নি!`);
        return;
      }
      if (subject.practical_full > 0 && stMarks.practical === "") {
        alert(`রোল ${st.roll_number} (${st.name})-এর ব্যবহারিক নম্বর বা 'A' ইনপুট দেওয়া হয়নি!`);
        return;
      }

      const numMcq = Number(stMarks.mcq) || 0;
      const numCq = Number(stMarks.cq) || 0;
      const numPractical = Number(stMarks.practical) || 0;

      if (
        (subject.mcq_full > 0 && stMarks.mcq !== "A" && numMcq > subject.mcq_full) ||
        (subject.cq_full > 0 && stMarks.cq !== "A" && numCq > subject.cq_full) ||
        (subject.practical_full > 0 && stMarks.practical !== "A" && numPractical > subject.practical_full)
      ) {
        alert("প্রিয় স্যার/ম্যাডাম আপনি মার্ক্স ইনপুট maximum থেকে বেশি দিয়েছেন");
        return;
      }
    }

    // ২. কনফার্মেশন পপ-আপ বার্তা (নতুন যুক্ত করা হলো)
    const confirmSubmit = window.confirm("আপনি কি নিশ্চিত? একবার জমা দিলে আপনি আর এই ফলাফল পরিবর্তন করতে পারবেন না।");
    if (!confirmSubmit) return;

    setLoading(true);
    setMessage("");

    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const resultsToInsert = students.map((st) => {
        const stMarks = marks[st.id] || { mcq: "", cq: "", practical: "" };

        const parseValue = (val: string) => (val === "A" || val === "" ? 0 : Number(val) || 0);

        const mcqVal = parseValue(stMarks.mcq);
        const cqVal = parseValue(stMarks.cq);
        const practicalVal = parseValue(stMarks.practical);
        const total = mcqVal + cqVal + practicalVal;

        const isAbsent =
          (subject.mcq_full > 0 ? stMarks.mcq === "A" : true) &&
          (subject.cq_full > 0 ? stMarks.cq === "A" : true) &&
          (subject.practical_full > 0 ? stMarks.practical === "A" : true);

        const { grade, point } = calculateGradeAndPoint(stMarks);

        return {
          student_id: st.id,
          subject_id: subject.id,
          teacher_id: teacher.id,
          exam_type: examType,
          mcq_marks: mcqVal,
          cq_marks: cqVal,
          practical_marks: practicalVal,
          total_marks: total,
          letter_grade: grade,
          grade_point: point,
          status: "pending",
          is_absent: isAbsent,
        };
      });

      const { error } = await supabase.from("results").upsert(resultsToInsert);

      if (error) {
        setMessage("❌ রেজাল্ট সংরক্ষণ করতে সমস্যা: " + error.message);
      } else {
        setMessage("✅ সকল শিক্ষার্থীর রেজাল্ট সফলভাবে জমা নেওয়া হয়েছে!");
        setIsAlreadySubmitted(true);
        
        // সাবমিট হওয়ার সাথে সাথে হিস্ট্রি ডাটা ফেচ
        const { data: resData } = await supabase
          .from("results")
          .select("*")
          .eq("subject_id", subject.id)
          .eq("exam_type", examType);

        if (resData) {
          const historyMap: { [key: string]: ResultRecord } = {};
          resData.forEach((r) => {
            historyMap[r.student_id] = r;
          });
          setSubmittedHistory(historyMap);
        }
      }
    } catch (err: any) {
      setMessage("❌ এরর: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStudentOverallGPA = (studentId: string) => {
    const studentRes = allApprovedResults.filter((r) => r.student_id === studentId);
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

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* হেডার */}
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800">শিক্ষক ড্যাশবোর্ড</h1>
            <p className="text-sm text-gray-600 mt-1">
              স্বাগতম সম্মানিত শিক্ষক, <span className="font-bold text-blue-600">{teacher?.name || "লোড হচ্ছে..."}</span>!
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              অ্যাসাইনকৃত বিষয়: <span className="font-bold text-emerald-600">{subject?.name || "লোড হচ্ছে..."}</span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-xl text-sm font-semibold transition"
          >
            লগআউট
          </button>
        </div>

        {/* ৩টি প্রধান ট্যাব */}
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
          <button
            onClick={() => setActiveTab("input")}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === "input"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            📝 নম্বর ইনপুট ফর্ম
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === "history"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            📜 জমা দেওয়া মার্কস (History)
          </button>

          <button
            onClick={() => setActiveTab("tabulation")}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === "tabulation"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            📊 ট্যাবুলেশন শিট (GPA View)
          </button>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl text-sm font-medium shadow-sm animate-bounce ${
              message.includes("✅")
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}

        {/* ট্যাব ১: নম্বর ইনপুট */}
        {activeTab === "input" && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 gap-2">
              <h2 className="text-lg font-bold text-gray-800">
                📝 নম্বর ইনপুট ফর্ম ({subject?.name || "বিষয়"})
              </h2>
              <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-lg">
                💡 অনুপস্থিতে <strong>'A'</strong> লিখুন
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">শ্রেণী নির্বাচন করুন</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
                >
                  <option value="">-- শ্রেণী বেছে নিন --</option>
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
                  {selectedClass === "11" && (
                    <>
                      <option value="first_terminal">প্রথম সাময়িক (First Terminal)</option>
                      <option value="year_final">বার্ষিকী (Year Change)</option>
                    </>
                  )}
                  {selectedClass === "12" && (
                    <>
                      <option value="pre_test">Pre-Test</option>
                      <option value="test">Test</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {selectedClass && examType ? (
              isAlreadySubmitted ? (
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
                  <p className="text-amber-800 font-bold text-base">
                    🔒 আপনি ইতিমধ্যে এই শ্রেণী ও পরীক্ষার ফলাফল জমা দিয়েছেন!
                  </p>
                  <p className="text-xs text-amber-700">
                    একই শিক্ষক একই ক্লাসের একই পরীক্ষায় মাত্র একবারই রেজাল্ট দিতে পারবেন। 
                    জমা দেওয়া মার্কস দেখতে <strong>"📜 জমা দেওয়া মার্কস (History)"</strong> ট্যাবে ক্লিক করুন। 
                    কোনো সংশোধনের প্রয়োজন হলে এডমিনের সাথে যোগাযোগ করুন।
                  </p>
                </div>
              ) : students.length > 0 ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-sm text-left text-gray-600 bg-white">
                      <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                        <tr>
                          <th className="p-3">রোল</th>
                          <th className="p-3">শিক্ষার্থীর নাম</th>
                          {subject && subject.mcq_full > 0 && <th className="p-3">MCQ (Max: {subject.mcq_full})</th>}
                          {subject && subject.cq_full > 0 && <th className="p-3">CQ/সৃজনশীল (Max: {subject.cq_full})</th>}
                          {subject && subject.practical_full > 0 && <th className="p-3">ব্যবহারিক (Max: {subject.practical_full})</th>}
                          <th className="p-3">মোট নম্বর</th>
                          <th className="p-3 text-center">গ্রেড (Status)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {students.map((st) => {
                          const stMarks = marks[st.id] || { mcq: "", cq: "", practical: "" };

                          const parseVal = (v: string) => (v === "A" || v === "" ? 0 : Number(v) || 0);
                          const total = parseVal(stMarks.mcq) + parseVal(stMarks.cq) + parseVal(stMarks.practical);

                          const { statusText, isPassed } = calculateGradeAndPoint(stMarks);

                          return (
                            <tr key={st.id} className="hover:bg-gray-50 transition">
                              <td className="p-3 font-semibold text-gray-800">{st.roll_number}</td>
                              <td className="p-3 font-medium">{st.name}</td>

                              {subject && subject.mcq_full > 0 && (
                                <td className="p-3">
                                  <input
                                    type="text"
                                    placeholder="নম্বর/A"
                                    value={stMarks.mcq}
                                    onChange={(e) => handleMarkChange(st.id, "mcq", e.target.value)}
                                    className={`w-24 px-2 py-1 border rounded-lg text-sm text-center bg-white ${
                                      stMarks.mcq === "A" ? "font-bold text-red-600 bg-red-50 border-red-300" : ""
                                    }`}
                                  />
                                </td>
                              )}

                              {subject && subject.cq_full > 0 && (
                                <td className="p-3">
                                  <input
                                    type="text"
                                    placeholder="নম্বর/A"
                                    value={stMarks.cq}
                                    onChange={(e) => handleMarkChange(st.id, "cq", e.target.value)}
                                    className={`w-24 px-2 py-1 border rounded-lg text-sm text-center bg-white ${
                                      stMarks.cq === "A" ? "font-bold text-red-600 bg-red-50 border-red-300" : ""
                                    }`}
                                  />
                                </td>
                              )}

                              {subject && subject.practical_full > 0 && (
                                <td className="p-3">
                                  <input
                                    type="text"
                                    placeholder="নম্বর/A"
                                    value={stMarks.practical}
                                    onChange={(e) => handleMarkChange(st.id, "practical", e.target.value)}
                                    className={`w-24 px-2 py-1 border rounded-lg text-sm text-center bg-white ${
                                      stMarks.practical === "A" ? "font-bold text-red-600 bg-red-50 border-red-300" : ""
                                    }`}
                                  />
                                </td>
                              )}

                              <td className="p-3 font-bold text-blue-600">{total}</td>

                              <td className="p-3 text-center font-bold">
                                <span
                                  className={`px-2.5 py-1 rounded-lg text-xs ${
                                    statusText === "Absent"
                                      ? "bg-red-100 text-red-700 font-extrabold"
                                      : isPassed
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-red-100 text-red-600"
                                  }`}
                                >
                                  {statusText}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <button
                    onClick={handleSubmitResults}
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition shadow-sm"
                  >
                    {loading ? "জমা দেওয়া হচ্ছে..." : "ফলাফল জমা দিন (Submit)"}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-6">
                  এই শ্রেণীর কোনো শিক্ষার্থী নিবন্ধিত পাওয়া যায়নি।
                </p>
              )
            ) : (
              <p className="text-sm text-gray-500 text-center py-6">
                📌 নম্বর ইনপুট দিতে উপরে থেকে <span className="font-bold">শ্রেণী</span> এবং <span className="font-bold">পরীক্ষার নাম</span> নির্বাচন করুন।
              </p>
            )}

          </div>
        )}

        {/* ট্যাব ২: জমা দেওয়া মার্কস (History) */}
        {activeTab === "history" && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-gray-800">
                📜 আপনার জমা দেওয়া নম্বরসমূহ (Read Only)
              </h2>
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-lg font-medium">
                🔒 পরিবর্তনের জন্য এডমিনের সাথে যোগাযোগ করুন
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">শ্রেণী নির্বাচন করুন</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
                >
                  <option value="">-- শ্রেণী বেছে নিন --</option>
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
                  {selectedClass === "11" && (
                    <>
                      <option value="first_terminal">প্রথম সাময়িক (First Terminal)</option>
                      <option value="year_final">বার্ষিকী (Year Change)</option>
                    </>
                  )}
                  {selectedClass === "12" && (
                    <>
                      <option value="pre_test">Pre-Test</option>
                      <option value="test">Test</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {selectedClass && examType ? (
              students.length > 0 && Object.keys(submittedHistory).length > 0 ? (
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-sm text-left text-gray-600 bg-white">
                    <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                      <tr>
                        <th className="p-3">রোল</th>
                        <th className="p-3">শিক্ষার্থীর নাম</th>
                        {subject && subject.mcq_full > 0 && <th className="p-3">MCQ Marks</th>}
                        {subject && subject.cq_full > 0 && <th className="p-3">CQ Marks</th>}
                        {subject && subject.practical_full > 0 && <th className="p-3">Practical Marks</th>}
                        <th className="p-3">মোট নম্বর</th>
                        <th className="p-3 text-center">গ্রেড (Status)</th>
                        <th className="p-3 text-center">অনুমোদন অবস্থা</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {students.map((st) => {
                        const rec = submittedHistory[st.id];

                        return (
                          <tr key={st.id} className="hover:bg-gray-50 transition">
                            <td className="p-3 font-semibold text-gray-800">{st.roll_number}</td>
                            <td className="p-3 font-medium">{st.name}</td>

                            {subject && subject.mcq_full > 0 && (
                              <td className="p-3 font-mono font-bold">
                                {rec ? (rec.is_absent && rec.mcq_marks === 0 ? "A" : rec.mcq_marks) : "-"}
                              </td>
                            )}

                            {subject && subject.cq_full > 0 && (
                              <td className="p-3 font-mono font-bold">
                                {rec ? (rec.is_absent && rec.cq_marks === 0 ? "A" : rec.cq_marks) : "-"}
                              </td>
                            )}

                            {subject && subject.practical_full > 0 && (
                              <td className="p-3 font-mono font-bold">
                                {rec ? (rec.is_absent && rec.practical_marks === 0 ? "A" : rec.practical_marks) : "-"}
                              </td>
                            )}

                            <td className="p-3 font-bold text-blue-600">{rec ? rec.total_marks : "-"}</td>

                            <td className="p-3 text-center font-bold">
                              <span
                                className={`px-2.5 py-1 rounded-lg text-xs ${
                                  rec?.is_absent
                                    ? "bg-red-100 text-red-700"
                                    : rec?.letter_grade === "F"
                                    ? "bg-red-100 text-red-600"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {rec ? (rec.is_absent ? "Absent" : rec.letter_grade) : "-"}
                              </span>
                            </td>

                            <td className="p-3 text-center">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  rec?.status === "approved"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {rec?.status === "approved" ? "Approved" : "Pending"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-6">
                  এই শ্রেণী ও পরীক্ষার জন্য এখনও কোনো নম্বর জমা দেওয়া হয়নি।
                </p>
              )
            ) : (
              <p className="text-sm text-gray-500 text-center py-6">
                📌 জমা দেওয়া নম্বর দেখতে উপরে থেকে <span className="font-bold">শ্রেণী</span> এবং <span className="font-bold">পরীক্ষার নাম</span> নির্বাচন করুন।
              </p>
            )}
          </div>
        )}

        {/* ট্যাব ৩: ট্যাবুলেশন শিট */}
        {activeTab === "tabulation" && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
            <h2 className="text-lg font-bold text-gray-800 border-b pb-3">
              📊 শ্রেণীভিত্তিক সর্বমোট GPA ও ট্যাবুলেশন শিট
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">শ্রেণী নির্বাচন করুন</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
                >
                  <option value="">-- শ্রেণী বেছে নিন --</option>
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
                  {selectedClass === "11" && (
                    <>
                      <option value="first_terminal">প্রথম সাময়িক (First Terminal)</option>
                      <option value="year_final">বার্ষিকী (Year Change)</option>
                    </>
                  )}
                  {selectedClass === "12" && (
                    <>
                      <option value="pre_test">Pre-Test</option>
                      <option value="test">Test</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {selectedClass && examType ? (
              students.length > 0 ? (
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
                      {students.map((st) => {
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
                <p className="text-sm text-gray-500 text-center py-6">শিক্ষার্থী পাওয়া যায়নি।</p>
              )
            ) : (
              <p className="text-sm text-gray-500 text-center py-6">
                📌 ট্যাবুলেশন শিট দেখতে উপরে থেকে <span className="font-bold">শ্রেণী</span> এবং <span className="font-bold">পরীক্ষার নাম</span> নির্বাচন করুন।
              </p>
            )}

          </div>
        )}

      </div>
    </main>
  );
}
