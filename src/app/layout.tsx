import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SynthTrade Pro - Deriv Trading Bot",
  description: "Professional automated trading bot for Deriv synthetic indices. Trade Boom, Crash, Volatility, and Jump indices with advanced strategies.",
  keywords: ["trading bot", "deriv", "synthetic indices", "automated trading", "boom", "crash", "volatility"],
  authors: [{ name: "SynthTrade Pro" }],
  icons: {
    icon: "/trading-bot-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0e17] text-foreground min-h-screen`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
