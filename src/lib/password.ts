import bcrypt from "bcryptjs";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";

// পাসওয়ার্ড/পিন hash করা ও যাচাই করার ফাংশন (শুধু সার্ভার-সাইড)

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export function isBcryptHash(value: string | null | undefined): boolean {
  return !!value && /^\$2[aby]\$\d{2}\$/.test(value);
}

/** সময়-নিরপেক্ষ (timing-safe) স্ট্রিং তুলনা */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * সংরক্ষিত পিন/পাসওয়ার্ড মিলিয়ে দেখে।
 * পুরনো রেকর্ডে plain text থাকলে মিললে needsUpgrade = true — ক্যালার তখন hash করে সেভ করে দেবে।
 */
export async function checkSecret(
  plain: string,
  stored: string | null | undefined
): Promise<{ ok: boolean; needsUpgrade: boolean }> {
  const s = String(stored || "");
  if (!s) return { ok: false, needsUpgrade: false };
  if (isBcryptHash(s)) {
    try {
      return { ok: await bcrypt.compare(plain, s), needsUpgrade: false };
    } catch {
      return { ok: false, needsUpgrade: false };
    }
  }
  const ok = safeEqual(plain, s);
  return { ok, needsUpgrade: ok };
}

/** নিরাপদ র‍্যান্ডম সংখ্যার PIN (ডিফল্ট ৬ সংখ্যা) */
export function generatePin(length = 6): string {
  const min = 10 ** (length - 1);
  const max = 10 ** length;
  return String(randomInt(min, max));
}
