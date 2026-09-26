"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://sggawreafobexiitvzhk.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Q3yt3P2yL1Pni5j9kc_TEA_GstfuUW8";

interface StudentResult {
  id: string;
  exam_type: string;
  mcq_marks: number;
  cq_marks: number;
  practical_marks: number;
  total_marks: number;
  letter_grade: string;
  grade_point: number;
  is_absent: boolean;
  subjects?: { name: string; mcq_full: number; cq_full: number; practical_full: number } | null;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [results, setResults] = useState<StudentResult[]>([]);
  const [selectedExam, setSelectedExam] = useState("first_terminal");
  const [loading, setLoading] = useState(true);

  const getSupabaseClient = () => {
    try {
      return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (err) {
      console.error("Supabase init error:", err);
      return null;
    }
  };

  useEffect(() => {
    const fetchStudentData = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      // সেশন বা কুকি থেকে শিক্ষার্থীর তথ্য পেতে API কল করা যেতে পারে অথবা ক্লায়েন্ট সাইড চেক
      // যেহেতু আমরা কুকি/সেশন ব্যবহার করছি, তাই একটি হালকা ফেচ বা সেশন রাউট ব্যবহার করতে পারি
      // অথবা সরাসরি লোকালস্টোরেজ/সেশন API থেকে নিতে পারি। 
    };

    fetchStudentData();
  }, []);

  // ছাত্রের তথ্য ও অনুমোদিত ফলাফল লোড করার জন্য useEffect
  useEffect(() => {
    const loadStudentResults = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      try {
        // সেশন থেকে ইউজারের আইডি নেওয়ার জন্য কুকি বা সেশন API চেক করা
        const res = await fetch("/api/auth/session"); // অথবা তোমার সেশন API রুট থাকলে
        // যদি সরাসরি সেশন API না থাকে, তবে আমরা সেশন রিড করার অন্য উপায় দেখতে পারি।
        // তবে সবচেয়ে সহজ হলো ছাত্র ড্যাশবোর্ডে সার্ভার কম্পোনেন্ট থেকে ক্লায়েন্টে ডেটা পাস করা।
      } catch (err) {
        console.error(err);
      }
    };
  }, []);

  // চলো এটিকে আরও সহজ ও ডাইরেক্ট করি যাতে সার্ভার সাইড সেশন থেকে আইডি নিয়ে ক্লায়েন্টে রেজাল্ট ফেচ করা যায়:
  return <StudentDashboardContent />;
}
