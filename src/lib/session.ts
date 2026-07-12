import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// এই ফাইলটি লগইন সেশন ম্যানেজ করে — কে লগইন করে আছে, কোন রোলে (admin/teacher/student)।
// আমরা একটা এনক্রিপ্টেড কুকি ব্যবহার করছি, ডেটাবেসে আলাদা সেশন টেবিল রাখার দরকার নেই।

const secretKey = process.env.SESSION_SECRET;
if (!secretKey) {
  throw new Error("SESSION_SECRET .env.local ফাইলে সেট করা নেই।");
}
const encodedKey = new TextEncoder().encode(secretKey);

export type SessionPayload = {
  userId: string;
  role: "admin" | "teacher" | "student";
  name: string;
  // teacher হলে subjectId ও isClassTeacher, student হলে studentId ইত্যাদি এখানে যোগ করা যাবে
  extra?: Record<string, unknown>;
};

const COOKIE_NAME = "result_portal_session";

export async function createSession(payload: SessionPayload) {
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // ৮ ঘণ্টা মেয়াদ

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(encodedKey);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true, // JavaScript দিয়ে পড়া যাবে না, XSS থেকে সুরক্ষা
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null; // মেয়াদ শেষ বা ভুল টোকেন
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
