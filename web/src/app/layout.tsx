import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Delta | Resume Gap Analysis & Career Roadmap",
  description: "Targeted skill diagnosis, 48-hr bridge roadmap, and interview defense",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#0D9488",
          borderRadius: "0.75rem",
        },
        elements: {
          card: "shadow-2xl border border-slate-200/80 rounded-2xl",
          formButtonPrimary: "bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all",
        },
      }}
    >
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased overflow-x-clip`}
      >
        <body className="min-h-full flex flex-col overflow-x-clip w-full max-w-full">{children}</body>
      </html>
    </ClerkProvider>
  );
}
