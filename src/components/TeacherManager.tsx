"use client";

import { useEffect, useState } from "react";

type Subject = {
  id: string;
  name: string;
};

type Teacher = {
  id: string;
  name: string;
  index_number: string;
  subject_id: string;
  is_class_teacher: boolean;
  subjects: { name: string } | null;
};

export default function TeacherManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [name, setName] = useState("");
  const [indexNumber, setIndexNumber] = useState("");
  const [password, setPassword] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [isClassTeacher, setIsClassTeacher] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [subjectsRes, teachersRes] = await Promise.all([
        fetch("/api/admin/subjects"),
        fetch("/api/admin/teachers"),
      ]);
      const subjectsData = await subjectsRes.json();
      const teachersData = await teachersRes.json();

      if (subjectsRes.ok) setSubjects(subjectsData.subjects || []);
      if (teachersRes.ok) setTeachers(teachersData.teachers || []);
    } catch {
      setError("তথ্য লোড করতে সমস্যা হয়েছে।");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          indexNumber,
          password,
          subjectId,
          isClassTeacher,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "শিক্ষক যোগ করতে সমস্যা হয়েছে।");
        return;
      }

      setSuccessMsg(`"${name}" কে সফলভাবে শিক্ষক হিসেবে যোগ করা হয়েছে।`);
      setName("");
      setIndexNumber("");
      setPassword("");
      setSubjectId("");
      setIsClassTeacher(false);
      loadData();
    } catch {
      setError("সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করো।");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-6">
      <h2 className="text-lg font-bold text-gray-800">শিক্ষক যোগ করুন</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">নাম</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border rounded-lg px-3 py-2"
            placeholder="শিক্ষকের পূর্ণ নাম"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Index Number
          </label>
          <input
            type="text"
            value={indexNumber}
            onChange={(e) => setIndexNumber(e.target.value)}
            required
            className="w-full border rounded-lg px-3 py-2"
            placeholder="যেমন: T-101"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Password</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border rounded-lg px-3 py-2"
            placeholder="শিক্ষকের জন্য একটি পাসওয়ার্ড দাও"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">বিষয়</label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            required
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">বিষয় বাছাই করো</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isClassTeacher"
            checked={isClassTeacher}
            onChange={(e) => setIsClassTeacher(e.target.checked)}
          />
          <label htmlFor="isClassTeacher" className="text-sm text-gray-600">
            ইনি কি ক্লাস টিচার? (ছাত্র/ছাত্রী যোগ ও এডিট করতে পারবেন)
          </label>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {successMsg && (
          <p className="text-green-600 text-sm">{successMsg}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="bg-green-600 text-white rounded-lg px-4 py-2 font-medium disabled:opacity-50"
        >
          {submitting ? "যোগ করা হচ্ছে..." : "শিক্ষক যোগ করো"}
        </button>
      </form>

      <div>
        <h3 className="text-md font-semibold text-gray-700 mb-2">
          বর্তমান শিক্ষকগণ
        </h3>
        {loading ? (
          <p className="text-sm text-gray-500">লোড হচ্ছে...</p>
        ) : teachers.length === 0 ? (
          <p className="text-sm text-gray-500">এখনো কোনো শিক্ষক যোগ করা হয়নি।</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">নাম</th>
                  <th className="py-2 pr-4">Index Number</th>
                  <th className="py-2 pr-4">বিষয়</th>
                  <th className="py-2 pr-4">ক্লাস টিচার</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{t.name}</td>
                    <td className="py-2 pr-4">{t.index_number}</td>
                    <td className="py-2 pr-4">{t.subjects?.name || "-"}</td>
                    <td className="py-2 pr-4">
                      {t.is_class_teacher ? "হ্যাঁ" : "না"}
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
