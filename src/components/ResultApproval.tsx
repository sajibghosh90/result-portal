"use client";

import { useEffect, useState } from "react";
import { EXAM_TYPES, CLASS_OPTIONS } from "@/lib/grading";

type ResultRow = {
  id: string;
  total_marks: number;
  grade: string;
  grade_point: number;
  status: string;
  subjects: { name: string } | null;
  student: {
    id: string;
    name: string;
    roll_number: string;
    section: string | null;
  };
};

export default function ResultApproval() {
  const [studentClass, setStudentClass] = useState("");
  const [examType, setExamType] = useState("");
  const [results, setResults] = useState<ResultRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function loadResults() {
    if (!studentClass || !examType) return;
    setLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch(
        `/api/admin/results?class=${encodeURIComponent(
          studentClass
        )}&examType=${encodeURIComponent(examType)}&status=submitted`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "রেজাল্ট আনতে সমস্যা হয়েছে।");
        setResults([]);
        return;
      }
      setResults(data.results);
      setSelectedIds(new Set());
    } catch {
      setError("সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করো।");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentClass, examType]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map((r) => r.id)));
    }
  }

  async function handlePublish(ids: string[]) {
    if (ids.length === 0) return;
    setPublishing(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/admin/results/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultIds: ids }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "অনুমোদন করতে সমস্যা হয়েছে।");
        return;
      }
      setSuccessMsg(`${data.count} টি রেজাল্ট প্রকাশিত হয়েছে।`);
      loadResults();
    } catch {
      setError("সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করো।");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-6">
      <h2 className="text-lg font-bold text-gray-800">
        রেজাল্ট অনুমোদন (Pending Approval)
      </h2>

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
          Class ও Exam Type বাছাই করলে অনুমোদনের অপেক্ষায় থাকা রেজাল্ট দেখাবে।
        </p>
      ) : results.length === 0 ? (
        <p className="text-sm text-gray-500">
          এখন অনুমোদনের অপেক্ষায় কোনো রেজাল্ট নেই — সব ঠিকঠাক আছে।
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={selectedIds.size === results.length}
                onChange={toggleSelectAll}
              />
              সব বাছাই করো
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => handlePublish(Array.from(selectedIds))}
                disabled={publishing || selectedIds.size === 0}
                className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                বাছাইকৃতগুলো প্রকাশ করো ({selectedIds.size})
              </button>
              <button
                onClick={() => handlePublish(results.map((r) => r.id))}
                disabled={publishing}
                className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {publishing ? "প্রকাশ হচ্ছে..." : "সব প্রকাশ করো"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4"></th>
                  <th className="py-2 pr-4">Roll</th>
                  <th className="py-2 pr-4">নাম</th>
                  <th className="py-2 pr-4">বিষয়</th>
                  <th className="py-2 pr-4">নম্বর</th>
                  <th className="py-2 pr-4">গ্রেড</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                      />
                    </td>
                    <td className="py-2 pr-4">{r.student?.roll_number}</td>
                    <td className="py-2 pr-4">{r.student?.name}</td>
                    <td className="py-2 pr-4">{r.subjects?.name}</td>
                    <td className="py-2 pr-4">{r.total_marks}</td>
                    <td className="py-2 pr-4 font-medium">
                      {r.grade} ({r.grade_point})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
