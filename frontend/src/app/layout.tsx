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

import BackendHeartbeat from "@/components/BackendHeartbeat";

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
          colorBackground: "#0F1F3D",
          colorBorder: "rgba(51, 65, 85, 0.6)",
          borderRadius: "0.85rem",
        },
        elements: {
          card: "bg-[#0F1F3D]/95 backdrop-blur-xl border border-slate-700/60 shadow-2xl rounded-2xl",
          headerTitle: "text-white font-bold text-lg",
          headerSubtitle: "text-slate-400 text-xs",
          socialButtonsBlockButton: "bg-[#162A4D] border border-slate-700 hover:bg-[#1E3A8A]/50 text-slate-200 font-medium transition-all",
          formButtonPrimary: "bg-teal-600 hover:bg-teal-700 text-white font-bold transition-all shadow-md shadow-teal-600/20",
          formFieldInput: "bg-[#162A4D] border-slate-700 text-white placeholder-slate-400 focus:border-teal-500",
          footerActionLink: "text-teal-400 hover:text-teal-300 font-semibold",
          dividerLine: "bg-slate-700/60",
          dividerText: "text-slate-400 text-xs",
        },
      }}
    >
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased overflow-x-clip`}
      >
        <body className="min-h-full flex flex-col overflow-x-clip w-full max-w-full">
          <BackendHeartbeat />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
