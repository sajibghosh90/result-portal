import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import LogoutButton from "@/components/LogoutButton";
import ResultEntryForm from "@/components/ResultEntryForm";
import AccordionCard from "@/components/AccordionCard";

interface Student {
  id: string;
  name: string;
  roll: string;
  class_name: string;
  group_name: string;
  pin?: string;
}

export default async function TeacherDashboard() {
  const session = await getSession();

  if (!session || session.role !== "teacher") {
    redirect("/teacher/login");
  }

  // ডাটাবেস থেকে সব শিক্ষার্থী ও তাদের পিন লোড করা
  const { data: students } = await supabase
    .from("students")
    .select("id, name, roll, class_name, group_name, pin")
    .order("roll", { ascending: true });

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

        {/* ১. রেজাল্ট ইনপুট সেকশন (Accordion) */}
        <AccordionCard
          title="শিক্ষার্থীদের রেজাল্ট যোগ করুন"
          subtitle="ড্রপডাউন থেকে শিক্ষার্থী ও বিষয় নির্বাচন করে নম্বর ইনপুট দিন"
          icon="📝"
          defaultOpen={true}
        >
          <ResultEntryForm teacherId={session.id} />
        </AccordionCard>

        {/* ২. সকল শিক্ষার্থী ও পিন নম্বর এর তালিকা (Dropdown / Collapsible) */}
        <AccordionCard
          title="সকল শিক্ষার্থী ও পিন (PIN) তালিকা"
          subtitle="শিক্ষার্থীদের রোল, নাম ও পিন নম্বর দেখতে ক্লিক করে এক্সপ্যান্ড করুন"
          icon="🎓"
          badgeCount={students?.length || 0}
          defaultOpen={false}
        >
          {students && students.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-600 bg-white rounded-xl overflow-hidden border border-gray-200">
                <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="p-3">রোল</th>
                    <th className="p-3">শিক্ষার্থীর নাম</th>
                    <th className="p-3">শ্রেণী</th>
                    <th className="p-3">বিভাগ</th>
                    <th className="p-3 text-center bg-amber-50 text-amber-800">পিন (PIN)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((student: Student) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition">
                      <td className="p-3 font-semibold text-gray-800">{student.roll}</td>
                      <td className="p-3 font-medium">{student.name}</td>
                      <td className="p-3">{student.class_name}</td>
                      <td className="p-3">{student.group_name}</td>
                      <td className="p-3 text-center font-mono font-bold text-blue-600 bg-amber-50/50">
                        {student.pin || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">কোনো শিক্ষার্থী পাওয়া যায়নি।</p>
          )}
        </AccordionCard>
      </div>
    </main>
  );
}
