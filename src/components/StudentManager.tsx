"use client";

import { useEffect, useState } from "react";

type Student = {
  id: string;
  name: string;
  roll_number: string;
  section: string | null;
  class: string;
  group_type: string;
  session: string;
  pin_plain: string;
};

const CLASS_OPTIONS = ["একাদশ", "দ্বাদশ"];

const GROUP_OPTIONS = [
  { value: "science", label: "বিজ্ঞান (Science)" },
  { value: "arts", label: "মানবিক (Arts)" },
  { value: "commerce", label: "ব্যবসায় শিক্ষা (Commerce)" },
];

export default function StudentManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [lastCreatedPin, setLastCreatedPin] = useState<{
    name: string;
    pin: string;
  } | null>(null);

  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [section, setSection] = useState("");
  const [groupType, setGroupType] = useState("");
  const [academicSession, setAcademicSession] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/students");
      const data = await res.json();
      if (res.ok) setStudents(data.students || []);
    } catch {
      setError("তথ্য লোড করতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleDelete(id: string, name: string) {
    const confirmed = window.confirm(
      `তুমি কি নিশ্চিত "${name}" কে ডিলিট করতে চাও? এটা আর ফিরিয়ে আনা যাবে না।`
    );
    if (!confirmed) return;

    setDeletingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/students?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "ডিলিট করতে সমস্যা হয়েছে।");
        return;
      }
      loadData();
    } catch {
      setError("সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করো।");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLastCreatedPin(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          rollNumber,
          studentClass,
          section,
          groupType,
          academicSession,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "ছাত্র/ছাত্রী যোগ করতে সমস্যা হয়েছে।");
        return;
      }

      setLastCreatedPin({ name, pin: data.plainPin });
      setName("");
      setRollNumber("");
      setStudentClass("");
      setSection("");
      setGroupType("");
      // academicSession রেখে দিলাম, কারণ পরপর একই session এর অনেক ছাত্র যোগ করা হয় সাধারণত
      loadData();
    } catch {
      setError("সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করো।");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-6">
      <h2 className="text-lg font-bold text-gray-800">ছাত্র/ছাত্রী যোগ করুন</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">নাম</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border rounded-lg px-3 py-2"
            placeholder="ছাত্র/ছাত্রীর পূর্ণ নাম"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Roll Number
            </label>
            <input
              type="text"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2"
              placeholder="যেমন: 101"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Class</label>
            <select
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              required
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
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Section <span className="text-gray-400">(ঐচ্ছিক)</span>
          </label>
          <input
            type="text"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="যেমন: A (না থাকলে ফাঁকা রাখো)"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">বিভাগ</label>
          <select
            value={groupType}
            onChange={(e) => setGroupType(e.target.value)}
            required
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">বিভাগ বাছাই করো</option>
            {GROUP_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Session</label>
          <input
            type="text"
            value={academicSession}
            onChange={(e) => setAcademicSession(e.target.value)}
            required
            className="w-full border rounded-lg px-3 py-2"
            placeholder="যেমন: 2024-2025"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {lastCreatedPin && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-700 text-sm font-medium">
              &quot;{lastCreatedPin.name}&quot; যোগ হয়েছে। এই PIN টা ছাত্রকে
              জানিয়ে দাও (নিচের তালিকাতেও সবসময় দেখতে পাবে):
            </p>
            <p className="text-2xl font-bold text-green-800 mt-2 tracking-widest">
              {lastCreatedPin.pin}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-50"
        >
          {submitting ? "যোগ করা হচ্ছে..." : "ছাত্র/ছাত্রী যোগ করো"}
        </button>
      </form>

      <div>
        <h3 className="text-md font-semibold text-gray-700 mb-2">
          বর্তমান ছাত্র/ছাত্রীগণ
        </h3>
        {loading ? (
          <p className="text-sm text-gray-500">লোড হচ্ছে...</p>
        ) : students.length === 0 ? (
          <p className="text-sm text-gray-500">
            এখনো কোনো ছাত্র/ছাত্রী যোগ করা হয়নি।
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">নাম</th>
                  <th className="py-2 pr-4">Roll</th>
                  <th className="py-2 pr-4">Class</th>
                  <th className="py-2 pr-4">Section</th>
                  <th className="py-2 pr-4">বিভাগ</th>
                  <th className="py-2 pr-4">Session</th>
                  <th className="py-2 pr-4">PIN</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{s.name}</td>
                    <td className="py-2 pr-4">{s.roll_number}</td>
                    <td className="py-2 pr-4">{s.class}</td>
                    <td className="py-2 pr-4">{s.section || "-"}</td>
                    <td className="py-2 pr-4">
                      {GROUP_OPTIONS.find((g) => g.value === s.group_type)
                        ?.label || s.group_type}
                    </td>
                    <td className="py-2 pr-4">{s.session}</td>
                    <td className="py-2 pr-4 font-mono font-semibold text-gray-700">
                      {s.pin_plain}
                    </td>
                    <td className="py-2 pr-4">
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        disabled={deletingId === s.id}
                        className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                      >
                        {deletingId === s.id ? "ডিলিট হচ্ছে..." : "ডিলিট"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
