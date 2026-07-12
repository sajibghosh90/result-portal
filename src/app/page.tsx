import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Result Portal
        </h1>
        <p className="text-gray-500 mb-10">কলেজ রেজাল্ট প্রকাশনা ব্যবস্থা</p>

        <div className="space-y-4">
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
            className="block w-full py-3 rounded-xl bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition"
          >
            এডমিন লগইন
          </Link>
        </div>
      </div>
    </main>
  );
}
