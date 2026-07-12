import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";

export default async function StudentDashboard() {
  const session = await getSession();

  if (!session || session.role !== "student") {
    redirect("/student/login");
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              স্বাগতম, {session.name}
            </h1>
            <p className="text-sm text-gray-500">শিক্ষার্থী ড্যাশবোর্ড</p>
          </div>
          <LogoutButton />
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-gray-500">
            এখানে শীঘ্রই তোমার সব সাবজেক্টের রেজাল্ট দেখানো হবে।
          </p>
        </div>
      </div>
    </main>
  );
}
