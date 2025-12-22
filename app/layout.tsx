import type { Metadata } from "next";
import { Jersey_10, Geist_Mono, Noto_Sans_KR, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import BackgroundLines from "./components/BackgroundLines";

const jersey10 = Jersey_10({
  variable: "--font-jersey-10",
  weight: "400",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  preload: false,
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "joonlovesmusic",
  description: "joon rates all the musics in the world",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${jersey10.variable} ${geistMono.variable} ${notoSansKR.variable} ${notoSansJP.variable} antialiased font-sans bg-background text-foreground overflow-hidden overflow-x-hidden`}
      >
        {/* Background vectors - persists across all pages for continuous animation */}
        <BackgroundLines />
        {/* Global page margin: 20px on all sides */}
        <div className="h-dvh w-full p-5 overflow-hidden overflow-x-hidden">{children}</div>
      </body>
    </html>
  );
}
