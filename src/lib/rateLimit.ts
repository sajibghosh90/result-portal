// সহজ in-memory rate limiter — লগইনে ভুল পাসওয়ার্ড/পিন বারবার দিয়ে অনুমান করা (brute-force) ঠেকাতে।
// দ্রষ্টব্য: Vercel serverless-এ প্রতিটি instance-এর মেমরি আলাদা, তাই এটা "বেস্ট-এফোর্ট" সুরক্ষা।
// এর সাথে ৬ সংখ্যার PIN ও শক্ত পাসওয়ার্ড মিলিয়েই কার্যকর হয়।

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

function sweep(now: number) {
  if (store.size < 5000) return;
  for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/** সীমা ছাড়িয়ে গেলে কত সেকেন্ড অপেক্ষা করতে হবে (০ মানে ঠিক আছে) */
export function lockedForSeconds(key: string, max: number): number {
  const now = Date.now();
  const e = store.get(key);
  if (!e || e.resetAt <= now) return 0;
  return e.count >= max ? Math.ceil((e.resetAt - now) / 1000) : 0;
}

export function recordFailure(key: string, windowMs: number) {
  const now = Date.now();
  sweep(now);
  const e = store.get(key);
  if (!e || e.resetAt <= now) store.set(key, { count: 1, resetAt: now + windowMs });
  else e.count += 1;
}

export function clearFailures(key: string) {
  store.delete(key);
}

export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export function tooManyMessage(seconds: number): string {
  const min = Math.max(1, Math.ceil(seconds / 60));
  return `অনেকবার ভুল চেষ্টা হয়েছে। প্রায় ${min} মিনিট পরে আবার চেষ্টা করুন।`;
}
