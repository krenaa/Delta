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
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
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
          colorBackground: "#ffffff",
          borderRadius: "0.75rem",
        },
        elements: {
          rootBox: "w-full flex justify-center",
          card: "bg-white border border-slate-200/80 shadow-xl shadow-slate-200/50 rounded-2xl p-6 sm:p-7 w-full max-w-md",
          cardBox: "shadow-none border-0 w-full bg-white",
          headerTitle: "text-xl sm:text-2xl font-black text-slate-900 tracking-tight",
          headerSubtitle: "text-xs font-medium text-slate-500 mt-1",
          socialButtonsBlockButton: "bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-xs rounded-xl py-2.5 transition shadow-xs flex items-center justify-center gap-2",
          socialButtonsBlockButtonText: "text-xs font-bold text-slate-700",
          formButtonPrimary: "bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/25 transition py-2.5 w-full",
          formFieldLabel: "text-xs font-bold text-slate-700 mb-1",
          formFieldInput: "bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition py-2.5 px-3 font-medium",
          footerActionLink: "text-teal-600 font-bold hover:text-teal-700 hover:underline text-xs",
          footerActionText: "text-xs font-medium text-slate-500",
          footer: "bg-transparent border-t-0 p-0 mt-4 shadow-none border-none",
          footerAction: "bg-transparent",
          dividerLine: "bg-slate-200",
          dividerText: "text-[10px] font-bold text-slate-400 uppercase bg-white px-2",
          formFieldErrorText: "text-xs text-red-600 font-medium mt-1",
          identityPreviewText: "text-xs text-slate-700 font-semibold",
          identityPreviewEditButtonIcon: "text-teal-600",
          devModeBadge: "hidden",
          footerPages: "hidden",
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
