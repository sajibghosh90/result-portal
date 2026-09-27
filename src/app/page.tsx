export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      
      {/* মূল কন্টেইনার */}
      <div className="w-full max-w-md text-center space-y-6 p-6">
        
        {/* প্রতিষ্ঠানের লোগো ও নাম (সিম্পল ও ক্ল্যাসিক ডিজাইন) */}
        <div className="space-y-3 pb-4">
          <div className="w-16 h-16 mx-auto flex items-center justify-center overflow-hidden">
            <img 
              src="/NEW LOGO.png" 
              alt="Institution Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-gray-900">
              ছকাপন উচ্চ বিদ্যালয় ও কলেজ
            </h1>
            <p className="text-sm font-semibold text-gray-700">
              Result Portal
            </p>
            <p className="text-xs text-gray-500">
              কলেজ রেজাল্ট প্রকাশনা ব্যবস্থা
            </p>
          </div>
        </div>

        {/* নেভিগেশন বাটনসমূহ (আগের সিম্পল স্টাইল) */}
        <div className="space-y-3">
          <a
            href="/student-login"
            className="w-full block py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition"
          >
            শিক্ষার্থী লগইন
          </a>

          <a
            href="/teacher-login"
            className="w-full block py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm transition"
          >
            শিক্ষক লগইন
          </a>

          <a
            href="/admin/login"
            className="w-full block py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg text-sm transition border border-gray-200"
          >
            এডমিন লগইন
          </a>
        </div>

      </div>
    </div>
  );
}
