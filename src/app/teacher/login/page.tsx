"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// আপনার সঠিক Supabase URL ও Publishable Key
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://sggawreafobexiitvzhk.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Q3yt3P2yL1Pni5j9kc_TEA_GstfuUW8";

export default function TeacherLogin() {
  const router = useRouter();
  const [indexNumber, setIndexNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      // index_number দিয়ে শিক্ষক খোঁজা (case-insensitive)
      const { data: teacher, error } = await supabase
        .from("teachers")
        .select("*")
        .ilike("index_number", indexNumber.trim())
        .maybeSingle();

      if (error) {
        console.error("Login Supabase Error:", error);
        setErrorMsg("❌ ডাটাবেস এরর: " + error.message);
        setLoading(false);
        return;
      }

      if (!teacher) {
        setErrorMsg("❌ ভুল Index Number অথবা Password।");
        setLoading(false);
        return;
      }

      // পাসওয়ার্ড ম্যাচ করানো
      if (teacher.password !== password.trim()) {
        setErrorMsg("❌ ভুল Index Number অথবা Password।");
        setLoading(false);
        return;
      }

      // সেশনে টিচারের তথ্য সেভ করা
      localStorage.setItem("teacherSession", JSON.stringify(teacher));

      // সফল হলে টিচার ড্যাশবোর্ডে রিডাইরেক্ট করা
      router.push("/teacher/dashboard");
    } catch (err: any) {
      console.error("Unexpected Error:", err);
      setErrorMsg("❌ কোনো একটি সমস্যা হয়েছে: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md border border-gray-200">
        <div className="text-center mb-6">
          <span className="text-4xl">👨‍🏫</span>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">শিক্ষক লগইন</h1>
          <p className="text-xs text-gray-500 mt-1">আপনার ইনডেক্স নম্বর ও পাসওয়ার্ড দিয়ে প্রবেশ করুন</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Index Number
            </label>
            <input
              type="text"
              placeholder="যেমন: x12345"
              value={indexNumber}
              onChange={(e) => setIndexNumber(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              পাসওয়ার্ড
            </label>
            <input
              type="password"
              placeholder="পাসওয়ার্ড দিন"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition shadow-sm"
          >
            {loading ? "লগইন হচ্ছে..." : "লগইন করুন"}
          </button>
        </form>
      </div>
    </main>
  );
}
