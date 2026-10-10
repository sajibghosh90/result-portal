import type { Metadata, Viewport } from "next";
import { Hind_Siliguri } from "next/font/google";
import "./globals.css";
import LanguageToggle from "@/components/LanguageToggle";

// পেশাদার বাংলা ফন্ট — সব ডিভাইসে একই রকম সুন্দর দেখায়
const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-bangla",
});

export const metadata: Metadata = {
  title: "Result Portal",
  description: "কলেজ রেজাল্ট প্রকাশনা ব্যবস্থা",
  manifest: "/manifest.json",
  // Chrome-এর "Translate this page?" পপ-আপ বন্ধ; ভাষা বদলানো হবে অ্যাপের নিজস্ব বাংলা/English বাটনে
  other: { google: "notranslate" },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "CHSC Result", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0284c7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" className={`h-full antialiased ${hindSiliguri.variable}`}>
      <body className="min-h-full flex flex-col">
        <LanguageToggle />
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
