"use client";

import { useEffect, useState } from "react";
import { EXAM_TYPES, CLASS_OPTIONS } from "@/lib/grading";

type Student = {
  id: string;
  name: string;
  roll_number: string;
  section: string | null;
  group_type: string;
};

type Subject = {
  id: string;
  name: string;
  group_type: string;
  mcq_full: number;
  cq_full: number;
  practical_full: number;
};

type MarksRow = {
  mcq: string;
  cq: string;
  practical: string;
};

export default function ResultUploadForm() {
  const [studentClass, setStudentClass] = useState("");
  const [examType, setExamType] = useState("");
  const [subject, setSubject] = useState<Subject | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, MarksRow>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function loadStudents() {
    if (!studentClass || !examType) return;
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch(
        `/api/teacher/students?class=${encodeURIComponent(
          studentClass
        )}&examType=${encodeURIComponent(examType)}`
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "তালিকা আনতে সমস্যা হয়েছে।");
        setStudents([]);
        return;
      }

      setSubject(data.subject);
      setStudents(data.students);

      const initialMarks: Record<string, MarksRow> = {};
      data.students.forEach((s: Student) => {
        const existing = data.existingResults[s.id];
        initialMarks[s.id] = {
          mcq: existing ? String(existing.mcq_marks ?? "") : "",
          cq: existing ? String(existing.cq_marks ?? "") : "",
          practical: existing ? String(existing.practical_marks ?? "") : "",
        };
      });
      setMarks(initialMarks);
    } catch {
      setError("সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করো।");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentClass, examType]);

  function updateMark(
    studentId: string,
    field: keyof MarksRow,
    value: string
  ) {
    setMarks((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  }

  async function handleSubmit() {
    setError("");
    setSuccessMsg("");
    setSubmitting(true);

    try {
      const entries = students.map((s) => ({
        studentId: s.id,
        mcqMarks: Number(marks[s.id]?.mcq) || 0,
        cqMarks: Number(marks[s.id]?.cq) || 0,
        practicalMarks: Number(marks[s.id]?.practical) || 0,
      }));

      const res = await fetch("/api/teacher/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examType, entries }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "রেজাল্ট সাবমিট করতে সমস্যা হয়েছে।");
        return;
      }

      setSuccessMsg(
        `${data.count} জন ছাত্র/ছাত্রীর নম্বর সফলভাবে সাবমিট হয়েছে। এডমিন অনুমোদনের পর প্রকাশিত হবে।`
      );
      loadStudents();
    } catch {
      setError("সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করো।");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-6">
      <h2 className="text-lg font-bold text-gray-800">রেজাল্ট আপলোড করো</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Class</label>
          <select
            value={studentClass}
            onChange={(e) => setStudentClass(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">ক্লাস বাছাই করো</option>
            {CLASS_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Exam Type
          </label>
          <select
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">পরীক্ষা বাছাই করো</option>
            {EXAM_TYPES.map((et) => (
              <option key={et.value} value={et.value}>
                {et.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {successMsg && <p className="text-green-600 text-sm">{successMsg}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">লোড হচ্ছে...</p>
      ) : !studentClass || !examType ? (
        <p className="text-sm text-gray-500">
          Class ও Exam Type বাছাই করলে ছাত্র/ছাত্রীদের তালিকা দেখাবে।
        </p>
      ) : students.length === 0 ? (
        <p className="text-sm text-gray-500">
          এই Class-এ তোমার বিষয়ের কোনো ছাত্র/ছাত্রী পাওয়া যায়নি।
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            বিষয়: <span className="font-medium">{subject?.name}</span> —
            পূর্ণমান: MCQ {subject?.mcq_full}, CQ {subject?.cq_full}
            {subject && subject.practical_full > 0
              ? `, Practical ${subject.practical_full}`
              : ""}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Roll</th>
                  <th className="py-2 pr-4">নাম</th>
                  <th className="py-2 pr-4">MCQ</th>
                  <th className="py-2 pr-4">CQ</th>
                  {subject && subject.practical_full > 0 && (
                    <th className="py-2 pr-4">Practical</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{s.roll_number}</td>
                    <td className="py-2 pr-4">{s.name}</td>
                    <td className="py-2 pr-4">
                      <input
                        type="number"
                        min={0}
                        max={subject?.mcq_full}
                        value={marks[s.id]?.mcq ?? ""}
                        onChange={(e) =>
                          updateMark(s.id, "mcq", e.target.value)
                        }
                        className="w-20 border rounded px-2 py-1"
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="number"
                        min={0}
                        max={subject?.cq_full}
                        value={marks[s.id]?.cq ?? ""}
                        onChange={(e) =>
                          updateMark(s.id, "cq", e.target.value)
                        }
                        className="w-20 border rounded px-2 py-1"
                      />
                    </td>
                    {subject && subject.practical_full > 0 && (
                      <td className="py-2 pr-4">
                        <input
                          type="number"
                          min={0}
                          max={subject.practical_full}
                          value={marks[s.id]?.practical ?? ""}
                          onChange={(e) =>
                            updateMark(s.id, "practical", e.target.value)
                          }
                          className="w-20 border rounded px-2 py-1"
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-green-600 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-50"
          >
            {submitting ? "সাবমিট হচ্ছে..." : "রেজাল্ট সাবমিট করো"}
          </button>
        </div>
      )}
    </div>
  );
}
