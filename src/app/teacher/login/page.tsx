"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TeacherLoginPage() {
  const router = useRouter();
  const [indexNumber, setIndexNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/teacher/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ indexNumber, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "লগইন ব্যর্থ হয়েছে।");
      return;
    }

    router.push("/teacher/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow p-8">
        <h1 className="text-xl font-bold text-gray-800 mb-1">শিক্ষক লগইন</h1>
        <p className="text-sm text-gray-500 mb-6">
          Index Number ও Password দিয়ে লগইন করো
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Index Number
            </label>
            <input
              type="text"
              value={indexNumber}
              onChange={(e) => setIndexNumber(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition disabled:opacity-60"
          >
            {loading ? "লগইন হচ্ছে..." : "লগইন করো"}
          </button>
        </form>

        <Link
          href="/"
          className="block text-center text-sm text-gray-400 mt-6 hover:underline"
        >
          হোমপেজে ফিরে যাও
        </Link>
      </div>
    </main>
  );
}
