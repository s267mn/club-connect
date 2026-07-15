import type { Metadata } from "next";
import { Sora, Public_Sans } from "next/font/google";
import "./globals.css";
import Sidebar from './components/Sidebar';
import NotificationBell from './components/NotificationBell';
import { ImageViewerProvider } from '@/context/ImageViewerContext';
import ImageViewerPortal from '@/components/ui/ImageViewerPortal';
import { LoadingProvider } from '@/context/LoadingContext';
import LoadingScreen from '@/components/ui/LoadingScreen';
import NavigationEvents from '@/components/NavigationEvents';
import Footer from './components/Footer';

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
        <LoadingProvider>
          <NavigationEvents />
          <ImageViewerProvider>
            <LoadingScreen />
            <div className="bg-ambient">
              <div className="blob blob-1" />
              <div className="blob blob-2" />
              <div className="blob blob-3" />
            </div>

            <div className="fixed top-0 left-0 h-screen w-3 bg-[var(--peach-ink)] z-0 pointer-events-none" />

            <NotificationBell />
            <Sidebar />

            <div className="lg:pl-64 min-h-screen flex flex-col">
              <div className="flex-1">{children}</div>
              <Footer />
            </div>

            <ImageViewerPortal />
          </ImageViewerProvider>
        </LoadingProvider>
      </body>
    </html>
  );
}