import bcrypt from "bcryptjs";

// পাসওয়ার্ড/পিন hash করার এবং যাচাই করার ফাংশন
// এটা প্লেইন টেক্সট পাসওয়ার্ডকে এমনভাবে এনক্রিপ্ট করে যে ডেটাবেস দেখলেও আসল পাসওয়ার্ড বোঝা যায় না

export async function hashPassword(plain: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(plain, saltRounds);
}

export async function verifyPassword(
  plain: string,
  hashed: string
): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

// ছাত্রদের জন্য অটোমেটিক ৪-সংখ্যার র‍্যান্ডম PIN জেনারেট করে
export function generatePin(): string {
  const pin = Math.floor(1000 + Math.random() * 9000); // 1000-9999
  return pin.toString();
}
