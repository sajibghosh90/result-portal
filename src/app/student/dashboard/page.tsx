"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function StudentDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [highestMarksMap, setHighestMarksMap] = useState<{ [key: string]: number }>({});
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function loadStudentData() {
      try {
        // ব্রাউজারের লোকাল স্টোরেজ বা সেশন থেকে অথবা সরাসরি ইনপুট থেকে রোল বা আইডি নিতে পারি
        // অথবা আমরা localStorage এ লগইন করার সময় স্টুডেন্ট অবজেক্ট সেভ করে রাখতে পারি।
        const savedStudent = localStorage.getItem("current_student");
        
        if (!savedStudent) {
          router.push("/student/login");
          return;
        }

        const currentStudent = JSON.parse(savedStudent);
        setStudentData(currentStudent);

        // ফলাফল ফেচ করা
        const { data: resData, error: resError } = await supabase
          .from("results")
          .select("*, subjects(name, mcq_full, cq_full, practical_full)")
          .eq("student_id", currentStudent.id)
          .eq("status", "approved");

        if (resError) throw resError;
        setResults(resData || []);

        // সর্বোচ্চ নম্বরের ম্যাপ
        const { data: allClassResults } = await supabase
          .from("results")
          .select("exam_type, subject_id, total_marks")
          .eq("status", "approved");

        const marksMap: { [key: string]: number } = {};
        if (allClassResults && Array.isArray(allClassResults)) {
          allClassResults.forEach((r: any) => {
            if (r && r.exam_type && r.subject_id) {
              const key = `${r.exam_type}_${r.subject_id}`;
              const marks = Number(r.total_marks) || 0;
              if (!marksMap[key] || marks > marksMap[key]) {
                marksMap[key] = marks;
              }
            }
          });
        }
        setHighestMarksMap(marksMap);

      } catch (err: any) {
        console.error("Dashboard load error:", err);
        setErrorMsg(err.message || "ডেটা লোড করতে সমস্যা হয়েছে।");
      } finally {
        setLoading(false);
      }
    }

    loadStudentData();
  }, [router]);

  // লগইন পেজ থেকে সফল লগইনের পর যাতে localStorage-এ ডেটা থাকে, তার জন্য লগইন এপিআই বা পেজ আপডেট করছি নিচে
  // ...
