import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";
import StudentListView from "@/components/StudentListView";

export default async function TeacherDashboard() {
  const session = await getSession();

  if (!session || session.role !== "teacher") {
    redirect("/teacher/login");
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              স্বাগতম, {session.name}
            </h1>
            <p className="text-sm text-gray-500">শিক্ষক ড্যাশবোর্ড</p>
          </div>
          <LogoutButton />
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow p-6">
            <p className="text-gray-500">
              এখানে শীঘ্রই রেজাল্ট আপলোড/আপডেট করার অপশন থাকবে।
            </p>
          </div>

          <StudentListView />
        </div>
      </div>
    </main>
  );
}
