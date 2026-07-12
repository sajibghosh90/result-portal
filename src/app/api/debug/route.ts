import { NextResponse } from "next/server";

export async function GET() {
  const u = process.env.ADMIN_USERNAME || "";
  const p = process.env.ADMIN_PASSWORD || "";
  return NextResponse.json({
    usernameLength: u.length,
    passwordLength: p.length,
    usernameFirstLast: u.length > 0 ? `${u[0]}...${u[u.length - 1]}` : "empty",
    hasLeadingTrailingSpaceUsername: u !== u.trim(),
    hasLeadingTrailingSpacePassword: p !== p.trim(),
  });
}
