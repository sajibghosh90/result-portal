"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

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

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    try {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, name, index_number, password")
        .eq("index_number", indexNumber.trim())
        .single();

      if (error || !data) {
        setErrorMsg("❌ শিক্ষক পাওয়া যায়নি। সঠিক ইনডেক্স নম্বর দিন।");
        setLoading(false);
        return;
      }

      if (data.password !== password) {
        setErrorMsg("❌ ভুল পাসওয়ার্ড দেওয়া হয়েছে।");
        setLoading(false);
        return;
      }

      // সফল লগইন হলে localStorage-এ আইডি সেভ করা
      localStorage.setItem("teacherId", data.id);
      router.push("/teacher/dashboard");
    } catch (err: any) {
      setErrorMsg("❌ লগইন করতে সমস্যা: " + err.message);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-gray-800">শিক্ষক লগইন</h1>
          <p className="text-sm text-gray-500 mt-1">আপনার ইনডেক্স নম্বর ও পাসওয়ার্ড দিয়ে প্রবেশ করুন</p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-medium border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Index Number</label>
            <input
              type="text"
              placeholder="আপনার ইনডেক্স নম্বর দিন"
              value={indexNumber}
              onChange={(e) => setIndexNumber(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">পাসওয়ার্ড</label>
            <input
              type="password"
              placeholder="******"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition shadow-sm"
          >
            {loading ? "লগইন হচ্ছে..." : "লগইন করুন"}
          </button>
        </form>
      </div>
    </main>
  );
}
