import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";

interface Student {
  id: string;
  name: string;
  roll: string;
  class_name: string;
  group_name: string;
}

export default async function TeacherDashboard() {
  const session = await getSession();

  if (!session || session.role !== "teacher") {
    redirect("/teacher/login");
  }

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800">শিক্ষক ড্যাশবোর্ড</h1>
            <p className="text-sm text-gray-500 mt-1">
              স্বাগতম, <span className="font-semibold text-gray-700">{session.name || "শিক্ষক"}</span>!
            </p>
          </div>
          <LogoutButton />
        </div>

        {/* ১. রেজাল্ট ইনপুট সেকশন */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>📝</span> শিক্ষার্থীদের রেজাল্ট যোগ করুন
          </h2>
          <p className="text-sm text-gray-600 bg-blue-50 p-4 rounded-xl border border-blue-100">
            রেজাল্ট ইনপুট ফর্মটি লোড হচ্ছে... (এডমিন প্যানেল থেকে অনুমোদিত স্টুডেন্টদের তালিকা এখান থেকে সিলেক্ট করতে পারবেন)
          </p>
        </div>

        {/* ২. সকল শিক্ষার্থীর তালিকা (Native Collapsible / Dropdown) */}
        <details className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden group">
          <summary className="p-6 cursor-pointer font-bold text-gray-800 text-lg flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition list-none select-none">
            <div className="flex items-center gap-3">
              <span>🎓</span>
              <div>
                <span>সকল শিক্ষার্থীর তালিকা</span>
              </div>
            </div>
            <span className="text-gray-400 group-open:rotate-180 transition-transform duration-200">
              ▼
            </span>
          </summary>

          <div className="p-6 border-t border-gray-200 text-sm text-gray-600">
            <p className="text-center py-4">শিক্ষার্থীদের নামের তালিকা দেখতে ক্লিক করুন। সকল নিবন্ধিত শিক্ষার্থী এখানে প্রদর্শিত হবে।</p>
          </div>
        </details>
      </div>
    </main>
  );
}
