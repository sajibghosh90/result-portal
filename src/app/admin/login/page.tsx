"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
      if (username === "Sajib_Admin" && password) {
        router.push("/admin/dashboard");
      } else {
        setErrorMsg("ভুল ইউজারনেম বা পাসওয়ার্ড!");
        setLoading(false);
      }
    } catch (err) {
      setErrorMsg("লগইন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* মূল কার্ড */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-6">
        
        {/* প্রতিষ্ঠানের লোগো ও নাম (নতুন যুক্ত করা হলো) */}
        <div className="text-center space-y-3 pb-2 border-b border-gray-100">
          <div className="w-16 h-16 mx-auto bg-gray-50 rounded-xl p-1.5 border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm">
            <img 
              src="/NEW LOGO.png" 
              alt="Institution Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
              ছকাপন উচ্চ বিদ্যালয় ও কলেজ
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              অফিসিয়াল এডমিন পোর্টাল
            </p>
          </div>
        </div>

        {/* আগের মতো সাধারণ লগইন হেডার */}
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-gray-800">এডমিন লগইন</h1>
          <p className="text-xs text-gray-500">Username ও Password দিয়ে লগ ইন করুন </p>
        </div>

        {/* এরর মেসেজ */}
        {errorMsg && (
          <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg text-center font-medium">
            {errorMsg}
          </div>
        )}

        {/* লগইন ফর্ম */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 transition"
              placeholder="Username দিন"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg transition duration-200 text-sm shadow-md"
          >
            {loading ? "লগইন হচ্ছে..." : "লগইন করুন"}
          </button>
        </form>

        {/* হোমপেজে ফেরার লিংক */}
        <div className="text-center pt-2">
          <a
            href="/"
            className="text-xs text-gray-500 hover:text-gray-800 transition font-medium"
          >
            হোমপেজে ফিরে যান
          </a>
        </div>

      </div>
    </div>
  );
}
