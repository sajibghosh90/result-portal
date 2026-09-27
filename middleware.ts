import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// এই middleware সাইটের প্রতিটা রিকোয়েস্টের আগে চলে — লগইন সেশন ছাড়া
// কেউ যেন সরাসরি URL টাইপ করে dashboard এ ঢুকতে না পারে, সেটা নিশ্চিত করে

const COOKIE_NAME = "result_portal_session";

const PROTECTED_PREFIXES: { prefix: string; role: string; loginPath: string }[] = [
  { prefix: "/admin/dashboard", role: "admin", loginPath: "/admin/login" },
  { prefix: "/teacher/dashboard", role: "teacher", loginPath: "/teacher/login" },
  { prefix: "/student/dashboard", role: "student", loginPath: "/student/login" },
];

async function verifySession(token: string, secret: Uint8Array) {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return payload as { role?: string };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const match = PROTECTED_PREFIXES.find((p) =>
    req.nextUrl.pathname.startsWith(p.prefix)
  );
  if (!match) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const secretKey = process.env.SESSION_SECRET;

  if (!token || !secretKey) {
    return NextResponse.redirect(new URL(match.loginPath, req.url));
  }

  const encodedKey = new TextEncoder().encode(secretKey);
  const payload = await verifySession(token, encodedKey);

  if (!payload || payload.role !== match.role) {
    return NextResponse.redirect(new URL(match.loginPath, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/dashboard/:path*", "/teacher/dashboard/:path*", "/student/dashboard/:path*"],
};
