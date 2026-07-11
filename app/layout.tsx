import type { Metadata } from "next";
import { Sora, Public_Sans } from "next/font/google";
import "./globals.css";
import Sidebar from './components/Sidebar';
import NotificationBell from './components/NotificationBell';

const sora = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const publicSans = Public_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClubConnect | NITK",
  description: "Verified club contributions for NITK students",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sora.variable} ${publicSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-[var(--bg)] text-[var(--ink)]">
        <div className="bg-ambient">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
        </div>

        <div className="fixed top-0 left-0 h-screen w-48 bg-[var(--peach-ink)] z-0 pointer-events-none" />

        <NotificationBell />
        <Sidebar />

        <div className="lg:pl-64 min-h-screen">{children}</div>
      </body>
    </html>
  );
}