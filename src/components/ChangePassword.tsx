"use client";

import { useState } from "react";

type Props = {
  endpoint: string; // যেমন "/api/teacher/password"
};

// নিজের পাসওয়ার্ড বদলানোর ছোট কার্ড — শিক্ষক ও এডমিন দুই ড্যাশবোর্ডেই ব্যবহার হয়
export default function ChangePassword({ endpoint }: Props) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (next.length < 8) return setMsg({ ok: false, text: "নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।" });
    if (next !== again) return setMsg({ ok: false, text: "নতুন পাসওয়ার্ড দুই ঘরে মেলেনি।" });

    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: data.error || "পাসওয়ার্ড বদলানো যায়নি।" });
      } else {
        setMsg({ ok: true, text: "✅ পাসওয়ার্ড সফলভাবে বদলানো হয়েছে।" });
        setCurrent("");
        setNext("");
        setAgain("");
      }
    } catch {
      setMsg({ ok: false, text: "নেটওয়ার্ক সমস্যা, আবার চেষ্টা করুন।" });
    } finally {
      setBusy(false);
    }
  };

  const input =
    "w-full h-11 px-3 border border-gray-300 rounded-xl text-sm bg-white focus:border-blue-500 focus:outline-none";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm print:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
      >
        <span className="font-bold text-sm text-gray-800">🔑 পাসওয়ার্ড বদলান</span>
        <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <form onSubmit={submit} className="px-5 pb-5 space-y-3 border-t border-gray-100 pt-4">
          <input
            type="password"
            autoComplete="current-password"
            placeholder="বর্তমান পাসওয়ার্ড"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={input}
            required
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="নতুন পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={input}
            required
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="নতুন পাসওয়ার্ড আবার লিখুন"
            value={again}
            onChange={(e) => setAgain(e.target.value)}
            className={input}
            required
          />
          {msg && (
            <p className={`text-xs font-medium ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2.5 rounded-xl text-sm transition"
          >
            {busy ? "অপেক্ষা করো..." : "পাসওয়ার্ড বদলান"}
          </button>
        </form>
      )}
    </div>
  );
}
