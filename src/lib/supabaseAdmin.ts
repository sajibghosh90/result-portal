import { createClient } from "@supabase/supabase-js";

// এই ক্লায়েন্টটি শুধুমাত্র সার্ভার-সাইড কোডে (API routes, Server Actions) ব্যবহার হবে।
// এটি service_role key ব্যবহার করে, যা RLS bypass করে — তাই কখনো ব্রাউজার/ক্লায়েন্ট কোডে import করা যাবে না।

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Supabase URL অথবা Service Role Key .env.local ফাইলে সেট করা নেই।"
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
