export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-blue-50/50 flex flex-col items-center justify-center p-4">
      
      {/* মূল কন্টেইনার কার্ড */}
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/80 p-8 text-center space-y-8 relative overflow-hidden">
        
        {/* ব্যাকগ্রাউন্ড ডেকোরেটিভ গ্লো */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

        {/* প্রতিষ্ঠানের লোগো ও নাম (ইউনিিক হেডার) */}
        <div className="space-y-4 relative z-10">
          <div className="w-20 h-20 mx-auto bg-white rounded-2xl p-2 border border-indigo-100 shadow-md flex items-center justify-center overflow-hidden transform hover:scale-105 transition duration-300">
            <img 
              src="/NEW LOGO.png" 
              alt="Institution Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight">
              ছকাপন উচ্চ বিদ্যালয় ও কলেজ
            </h1>
            <p className="text-xs font-semibold tracking-wide text-indigo-600 uppercase">
              Result Portal • কলেজ রেজাল্ট প্রকাশনা ব্যবস্থা
            </p>
          </div>
        </div>

        {/* নেভিগেশন বাটনসমূহ */}
        <div className="space-y-3.5 relative z-10">
          {/* শিক্ষার্থী লগইন বা পোর্টাল বাটন */}
          <a
            href="/student-login"
            className="w-full block py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 text-sm tracking-wide"
          >
            👨‍🎓 শিক্ষার্থী লগইন
          </a>

          {/* শিক্ষক লগইন বাটন */}
          <a
            href="/teacher-login"
            className="w-full block py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200 text-sm tracking-wide"
          >
            👩‍🏫 শিক্ষক লগইন
          </a>

          {/* এডমিন লগইন বাটন */}
          <a
            href="/admin/login"
            className="w-full block py-3.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl border border-gray-200/80 transition-all duration-200 text-sm tracking-wide"
          >
            🔐 এডমিন লগইন
          </a>
        </div>

        {/* ছোট ফুটার নোট */}
        <div className="text-[11px] text-gray-400 font-medium pt-2 border-t border-gray-100 relative z-10">
          সেশন: ২০২৬ • সর্বস্বত্ব সংরক্ষিত
        </div>

      </div>
    </div>
  );
}
