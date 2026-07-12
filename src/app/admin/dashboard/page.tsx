import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";

export default async function AdminDashboard() {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">এডমিন প্যানেল</h1>
            <p className="text-sm text-gray-500">সম্পূর্ণ নিয়ন্ত্রণ</p>
          </div>
          <LogoutButton />
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-gray-500">
            এখানে শীঘ্রই শিক্ষক/ছাত্র অ্যাড, রেজাল্ট পাবলিশ অ্যাপ্রুভ করার
            অপশন থাকবে।
          </p>
        </div>
      </div>
    </main>
  );
}
