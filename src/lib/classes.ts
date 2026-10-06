// ডেটাবেসে ক্লাস "11" / "১১" / "একাদশ" — যেকোনো রূপে থাকতে পারে (পুরনো ডেটার জন্য)।
const C11 = ["11", "১১", "একাদশ"];
const C12 = ["12", "১২", "দ্বাদশ"];

export function classVariants(input: string | null | undefined): string[] {
  const t = String(input ?? "").trim();
  if (C11.includes(t)) return C11;
  if (C12.includes(t)) return C12;
  return t ? [t] : [];
}

/** "11" / "12" অথবা অচেনা হলে যেমন আছে তেমন */
export function canonicalClass(input: string | null | undefined): string {
  const t = String(input ?? "").trim();
  if (C11.includes(t)) return "11";
  if (C12.includes(t)) return "12";
  return t;
}

export const EXAMS_BY_CLASS: Record<string, string[]> = {
  "11": ["first_terminal", "year_final"],
  "12": ["pre_test", "test"],
};
