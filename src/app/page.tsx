import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        
        {/* প্রতিষ্ঠানের লোগো ও নাম */}
        <div className="space-y-3">
          <div className="w-20 h-20 mx-auto flex items-center justify-center overflow-hidden">
            <img 
              src="/NEW LOGO.png" 
              alt="Institution Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              ছকাপন উচ্চ বিদ্যালয় ও কলেজ
            </h1>
            <p className="text-lg font-semibold text-gray-800">
              College Result Portal
            </p>
            <p className="text-sm text-gray-500">কলেজ রেজাল্ট প্রকাশনা ব্যবস্থা</p>
          </div>
        </div>

        {/* নেভিগেশন বাটনসমূহ */}
        <div className="space-y-4 pt-2">
          <Link
            href="/student/login"
            className="block w-full py-4 rounded-xl bg-blue-600 text-white font-semibold text-lg shadow hover:bg-blue-700 transition"
          >
            শিক্ষার্থী লগইন
          </Link>
          <Link
            href="/teacher/login"
            className="block w-full py-4 rounded-xl bg-emerald-600 text-white font-semibold text-lg shadow hover:bg-emerald-700 transition"
          >
            শিক্ষক লগইন
          </Link>
          <Link
            href="/admin/login"
            className="block w-full py-3 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-red-300 transition"
          >
            এডমিন লগইন
          </Link>
        </div>
      </div>
    </main>
  );
}
