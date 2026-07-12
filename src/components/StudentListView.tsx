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

const GROUP_LABELS: Record<string, string> = {
  science: "বিজ্ঞান (Science)",
  arts: "মানবিক (Arts)",
  commerce: "ব্যবসায় শিক্ষা (Commerce)",
};

export default function StudentListView() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/admin/students");
        const data = await res.json();
        if (res.ok) {
          setStudents(data.students || []);
        } else {
          setError(data.error || "তালিকা আনতে সমস্যা হয়েছে।");
        }
      } catch {
        setError("তালিকা আনতে সমস্যা হয়েছে।");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4">
        ছাত্র/ছাত্রীদের তালিকা ও PIN
      </h2>

      {loading ? (
        <p className="text-sm text-gray-500">লোড হচ্ছে...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : students.length === 0 ? (
        <p className="text-sm text-gray-500">এখনো কোনো ছাত্র/ছাত্রী যোগ করা হয়নি।</p>
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
                    {GROUP_LABELS[s.group_type] || s.group_type}
                  </td>
                  <td className="py-2 pr-4">{s.session}</td>
                  <td className="py-2 pr-4 font-mono font-semibold text-gray-700">
                    {s.pin_plain}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
