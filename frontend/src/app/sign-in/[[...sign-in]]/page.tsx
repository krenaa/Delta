"use client";

import { Suspense } from "react";
import { useEffect } from "react";
import { SignIn, useAuth } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Sparkles, Target, Zap, Lock, RefreshCw, LogIn } from "lucide-react";

function SignInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const isPdfUploadReason = searchParams.get("reason") === "pdf_upload";

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || isSignedIn) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC] gap-3 text-slate-600 font-medium">
        <RefreshCw className="w-7 h-7 text-teal-600 animate-spin" />
        <span className="text-xs">Checking session security...</span>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col justify-between relative overflow-hidden select-none p-4 sm:p-6 lg:px-10 lg:py-6">
      {/* Subtle Light Ambient Radial Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Bar Navigation */}
      <header className="w-full max-w-7xl mx-auto z-20 flex items-center justify-between shrink-0">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-teal-600 transition-colors py-2 px-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-teal-300"
        >
          <ArrowLeft className="w-4 h-4 text-teal-600" />
          <span>Back to Delta Platform</span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center shadow-md shadow-teal-600/20 font-mono text-white text-base font-black">
            Δ
          </div>
          <span className="text-base font-extrabold tracking-tight text-slate-900">Delta</span>
        </div>
      </header>

      {/* Main Full Page Split Grid Container */}
      <main className="w-full max-w-7xl mx-auto z-10 flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 py-2 overflow-hidden">
        {/* Left Column: Platform Value Proposition */}
        <div className="flex-1 max-w-lg space-y-4 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-700 text-xs font-semibold uppercase tracking-wider">
            <LogIn className="w-3.5 h-3.5 text-teal-600" />
            <span>Sign In • Delta Copilot</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 leading-tight">
            Welcome Back to <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-600">Delta</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Sign in to access your persistent audit history, verified skill profiles, custom 48-hour bridge projects, and live interview strategy guides.
          </p>

          {/* Feature Bullets */}
          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600 border border-teal-200 shrink-0 mt-0.5">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">Human-in-the-Loop Verification</h4>
                <p className="text-xs text-slate-500">Drag and reclassify candidate skills between Missing, Needs Proof, and Verified Strong.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600 border border-teal-200 shrink-0 mt-0.5">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">48-Hour PoC Deliverable Roadmaps</h4>
                <p className="text-xs text-slate-500">Actionable mini-projects that anchor zero-evidence missing skills to real resume experience.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600 border border-teal-200 shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">User-Scoped Session History</h4>
                <p className="text-xs text-slate-500">Your audit records and original PDF resumes remain private, persistent, and accessible anywhere.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Native Clerk Auth Component (Light Theme Custom Styled) */}
        <div className="w-full max-w-md shrink-0 flex flex-col items-center justify-center">
          {isPdfUploadReason && (
            <div className="w-full mb-3 p-3 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-800 text-xs font-semibold flex items-center gap-2.5 shadow-sm">
              <Lock className="w-4 h-4 shrink-0 text-teal-600" />
              <span>Please sign in to upload your PDF resume and analyze skill gaps.</span>
            </div>
          )}

          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            forceRedirectUrl="/"
            appearance={{
              elements: {
                rootBox: "w-full flex justify-center",
                card: "bg-white border border-slate-200/90 shadow-xl shadow-slate-200/50 rounded-2xl p-6 sm:p-7 w-full max-w-md",
                cardBox: "shadow-none border-0 w-full bg-white",
                headerTitle: "text-xl sm:text-2xl font-black text-slate-900 tracking-tight",
                headerSubtitle: "text-xs font-medium text-slate-500 mt-1",
                socialButtonsBlockButton: "bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-xs rounded-xl py-2.5 transition shadow-xs flex items-center justify-center gap-2",
                socialButtonsBlockButtonText: "text-xs font-bold text-slate-700",
                formButtonPrimary: "bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/25 transition py-2.5 w-full",
                formFieldLabel: "text-xs font-bold text-slate-700 mb-1",
                formFieldInput: "bg-slate-50/80 border border-slate-200 text-slate-900 text-xs rounded-xl focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 transition py-2.5 px-3 font-medium",
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
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto z-10 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-200 shrink-0">
        <span>© Delta Career Copilot Platform</span>
      </footer>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex items-center justify-center bg-[#F8FAFC]">
          <RefreshCw className="w-6 h-6 text-teal-600 animate-spin" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
