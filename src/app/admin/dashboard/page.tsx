import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";
import TeacherManager from "@/components/TeacherManager";
import StudentManager from "@/components/StudentManager";
import ResultApproval from "@/components/ResultApproval";
import AccordionCard from "@/components/AccordionCard";

export default async function AdminDashboard() {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800">এডমিন প্যানেল</h1>
            <p className="text-sm text-gray-500 mt-1">সিস্টেম ব্যবস্থাপনা ও নিয়ন্ত্রণ ড্যাশবোর্ড</p>
          </div>
          <LogoutButton />
        </div>

        {/* Accordion Sections */}
        <div className="space-y-4">
          {/* রেজাল্ট অ্যাপ্রুভাল সেকশন */}
          <AccordionCard
            title="রেজাল্ট অনুমোদন (Approval)"
            subtitle="শিক্ষকদের জমা দেওয়া পেন্ডিং রেজাল্ট দেখুন ও অ্যাপ্রুভ করুন"
            icon="📝"
            defaultOpen={true}
          >
            <ResultApproval />
          </AccordionCard>

          {/* শিক্ষক ব্যবস্থাপনা সেকশন */}
          <AccordionCard
            title="শিক্ষক ব্যবস্থাপনা"
            subtitle="নতুন শিক্ষক যোগ করুন এবং বিদ্যমান শিক্ষকদের তালিকা দেখুন"
            icon="👨‍🏫"
          >
            <TeacherManager />
          </AccordionCard>

          {/* শিক্ষার্থী ব্যবস্থাপনা সেকশন */}
          <AccordionCard
            title="শিক্ষার্থী ব্যবস্থাপনা"
            subtitle="নতুন শিক্ষার্থী নিবন্ধিত করুন ও রোল/রেজিস্ট্রেশন ডাটাবেস পরিচালনা করুন"
            icon="🎓"
          >
            <StudentManager />
          </AccordionCard>
        </div>
      </div>
    </main>
  );
}