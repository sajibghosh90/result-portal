"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function AddStudentForm({ onStudentAdded }: { onStudentAdded?: () => void }) {
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");
  const [className, setClassName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const getSupabaseClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!name || !roll || !className || !groupName) {
      setMessage("❌ অনুগ্রহ করে সবগুলো তথ্য (নাম, রোল, শ্রেণী, বিভাগ) প্রদান করুন।");
      setLoading(false);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setMessage("❌ ডাটাবেস সংযোগ পাওয়া যায়নি");
      setLoading(false);
      return;
    }

    // ৪ ডিজিটের র্যান্ডম পিন জেনারেট
    const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();

    const { error } = await supabase.from("students").insert([
      {
        name: name,
        roll: roll,
        class_name: className,
        group_name: groupName,
        pin: generatedPin,
      },
    ]);

    setLoading(false);

    if (error) {
      setMessage("❌ শিক্ষার্থী যোগ করতে সমস্যা হয়েছে: " + error.message);
    } else {
      setMessage("✅ নতুন শিক্ষার্থী সফলভাবে যোগ করা হয়েছে!");
      setName("");
      setRoll("");
      setClassName("");
      setGroupName("");
      if (onStudentAdded) onStudentAdded();
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span>👨‍🎓</span> নতুন শিক্ষার্থী যোগ করুন
      </h2>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm mb-4 ${
            message.includes("✅")
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ১. নাম */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            শিক্ষার্থীর নাম
          </label>
          <input
            type="text"
            placeholder="যেমন: মোঃ আরিফ হোসেন"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* ২. রোল */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            রোল নম্বর
          </label>
          <input
            type="text"
            placeholder="যেমন: ১০১"
            value={roll}
            onChange={(e) => setRoll(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* ৩. শ্রেণী */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            শ্রেণী
          </label>
          <select
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            required
          >
            <option value="">-- শ্রেণী নির্বাচন করুন --</option>
            <option value="11">একাদশ (11)</option>
            <option value="12">দ্বাদশ (12)</option>
          </select>
        </div>

        {/* ৪. বিভাগ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            বিভাগ (Group)
          </label>
          <select
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            required
          >
            <option value="">-- বিভাগ নির্বাচন করুন --</option>
            <option value="বিজ্ঞান">বিজ্ঞান</option>
            <option value="মানবিক">মানবিক</option>
            <option value="ব্যবসায় শিক্ষা">ব্যবসায় শিক্ষা</option>
          </select>
        </div>

        {/* Submit Button */}
        <div className="md:col-span-2 mt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition duration-200"
          >
            {loading ? "সংরক্ষণ হচ্ছে..." : "শিক্ষার্থী যুক্ত করুন"}
          </button>
        </div>
      </form>
    </div>
  );
}
