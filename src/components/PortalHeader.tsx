"use client";

import { useRouter } from "next/navigation";

type Props = {
  subtitle: string;
  badge?: string;
  onLogout?: () => void | Promise<void>;
};

// শিক্ষক ও শিক্ষার্থী ড্যাশবোর্ডের একই রকম প্রফেশনাল হেডার (এডমিন প্যানেলের স্টাইলের সাথে মিল রেখে)
export default function PortalHeader({ subtitle, badge, onLogout }: Props) {
  const router = useRouter();

  async function handleLogout() {
    if (onLogout) {
      await onLogout();
      return;
    }
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/");
    }
  }

  return (
    <header className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 shadow-lg print:hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #fff 0px, #fff 1px, transparent 1px, transparent 14px)",
        }}
      />
      <div className="relative flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 rounded-xl bg-white p-1.5 ring-1 ring-amber-300/40 shadow-md">
            <img src="/NEW LOGO.png" alt="প্রতিষ্ঠানের লোগো" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[15px] sm:text-xl font-bold text-white leading-snug">
              ছকাপন উচ্চ বিদ্যালয় ও কলেজ
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-snug">{subtitle}</p>
            {badge && (
              <span className="mt-1 inline-block rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                {badge}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleLogout}
          aria-label="লগআউট"
          className="shrink-0 flex items-center gap-1.5 rounded-lg bg-rose-700 px-3 py-2 text-xs sm:text-sm font-medium text-white transition hover:bg-rose-600 active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="hidden sm:inline">লগআউট</span>
        </button>
      </div>
      <div className="h-[3px] bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500" />
    </header>
  );
}
