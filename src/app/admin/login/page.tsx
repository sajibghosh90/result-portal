"use client";
import { useState } from "react";
import { useRouter }️ from "next/navigation";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      // তোমার প্রজেক্টের অরিজিনাল লগইন চেক বা API কল এখানে হবে
      // আপাতত ডেমো চেক বা তোমার আগের লজিক এখানে বসাতে পারো
      if (username === "Sajib_Admin" && password) {
        router.push("/admin/dashboard");
      } else {
        // অথবা সরাসরি তোমার Supabase ক্লায়েন্ট দিয়ে চেক করতে পারো
        setErrorMsg("ভুল ইউজারনেম বা পাসওয়ার্ড!");
        setLoading(false);
      }
    } catch (err) {
      setErrorMsg("লগইন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* ব্যাকগ্রাউন্ড গ্লোয়িং এবং ডেকোরেটিভ ডিজাইন ইফেক্ট */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* মূল লগইন কার্ড */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 relative z-10 space-y-6">
        
        {/* প্রতিষ্ঠানের লোগো ও নাম হেডার */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-50 to-blue-50 p-2 border border-indigo-100 shadow-md items-center justify-center overflow-hidden mx-auto">
            <img 
              src="/NEW LOGO.png" 
              alt="Institution Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
              ছকাপন উচ্চ বিদ্যালয় ও কলেজ
            </h1>
            <p className="text-xs text-indigo-600 font-semibold mt-1">
              🔐 অফিসিয়াল এডমিন পোর্টাল লগইন
            </p>
          </div>
        </div>

        {/* এরর মেসেজ শো করার জন্য */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-3 rounded-xl text-center font-medium">
            {errorMsg}
          </div>
        )}

        {/* লগইন ফর্ম */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              ইউজারনেম (Username)
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              placeholder="আপনার ইউজারনেম দিন"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              পাসওয়ার্ড (Password)
            </label>
            <input
              type="password"
              value= {password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all duration-200 text-sm tracking-wide"
          >
            {loading ? "লগইন হচ্ছে..." : "প্রবেশ করুন (Login)"}
          </button>
        </form>

        {/* ফুটার বা হোমপেজে ফেরার লিংক */}
        <div className="text-center pt-2 border-t border-gray-100">
          <a
            href="/"
            className="text-xs font-medium text-gray-500 hover:text-indigo-600 transition inline-flex items-center gap-1"
          >
            ← মূল হোমপেজে ফিরে যান
          </a>
        </div>

      </div>
    </div>
  );
}
