import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Result Portal",
  description: "কলেজ রেজাল্ট প্রকাশনা ব্যবস্থা",
  manifest: "/manifest.json", // এই লাইনটি মেটাডেটার ভেতরে যুক্ত করা হলো
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        
        {/* সার্ভিস ওয়ার্কার রেজিস্টার করার জন্য এই স্ক্রিপ্টটি যোগ করা হলো */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
