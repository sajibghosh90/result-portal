import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Result Portal",
  description: "কলেজ রেজাল্ট প্রকাশনা ব্যবস্থা",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
