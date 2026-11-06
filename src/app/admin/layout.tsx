import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "../globals.css";

const heading = Fraunces({ subsets: ["latin"], variable: "--font-heading", display: "swap", weight: ["500", "600"] });
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Adde Admin" },
  robots: { index: false, follow: false },
  icons: { icon: "/assets/brand/adde-icon-512.png" },
};
export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <body className="min-h-screen bg-cream antialiased">{children}</body>
    </html>
  );
}
