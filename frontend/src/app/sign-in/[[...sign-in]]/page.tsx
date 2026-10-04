"use client";

import { useState, useEffect, Suspense } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ShieldCheck, Sparkles, Target, Zap, AlertCircle, RefreshCw, Lock } from "lucide-react";

function SignInContent() {
  const clerkSignIn = useSignIn() as any;
  const { isLoaded, signIn, setActive } = clerkSignIn;
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPdfUploadReason = searchParams.get("reason") === "pdf_upload";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Auto-clear loading error once Clerk SDK finishes initializing
  useEffect(() => {
    if (isLoaded && error === "Authentication service is loading. Please wait a moment...") {
      setError(null);
    }
  }, [isLoaded, error]);

  // Google OAuth Sign In
  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      let currentSignIn = signIn;
      let loaded = isLoaded;

      // If Clerk SDK is still initializing, wait up to 4 seconds
      if (!loaded || !currentSignIn) {
        let attempts = 0;
        while ((!loaded || !currentSignIn) && attempts < 20) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          attempts++;
          loaded = clerkSignIn?.isLoaded;
          currentSignIn = clerkSignIn?.signIn;
        }
      }

      if (!currentSignIn) {
        setError("Sign in service unavailable. Please refresh the page.");
        setGoogleLoading(false);
        return;
      }

      await currentSignIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (err: any) {
      console.error("Google sign in error:", err);
      const msg = err?.errors?.[0]?.message || err?.message || "Google authentication failed. Please try again.";
      setError(msg);
      setGoogleLoading(false);
    }
  };

  // Email / Password Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email address and password.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await signIn.create({
        identifier: email,
        password: password,
      });

      if (result.status === "complete") {
        if (setActive) {
          await setActive({ session: result.createdSessionId });
        }
        router.push("/");
      } else {
        setError("Sign in incomplete. Please check your credentials.");
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.message || err?.message || "Invalid credentials. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

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
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>AI Career Copilot & Gap Analyzer</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 leading-tight">
            Bridge Engineering Gaps in <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-600">48 Hours</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Welcome back to Delta. Sign in to access your persistent audit history, verified skill profiles, custom bridge projects, and live interview strategy guides.
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

        {/* Right Column: Custom Auth Card */}
        <div className="w-full max-w-md shrink-0">
          <div className="bg-white border border-slate-200/90 shadow-xl shadow-slate-200/60 rounded-2xl p-6 sm:p-7 space-y-5">
            {/* Contextual Notice Banner for PDF Upload */}
            {isPdfUploadReason && (
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-800 text-xs font-semibold flex items-center gap-2.5 animate-fadeIn">
                <Lock className="w-4 h-4 shrink-0 text-teal-600" />
                <span>Please sign in to upload your PDF resume and analyze skill gaps.</span>
              </div>
            )}

            {/* Header */}
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Sign in to Delta</h2>
              <p className="text-xs text-slate-500 mt-1">Welcome back! Please enter your details.</p>
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-800 text-xs shadow-2xs transition cursor-pointer disabled:opacity-60"
            >
              {googleLoading ? (
                <RefreshCw className="w-4 h-4 text-teal-600 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{googleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-2">
              <div className="w-full border-t border-slate-200" />
              <span className="absolute bg-white px-3 text-[10px] font-mono uppercase text-slate-400">or</span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Email address</label>
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 outline-none transition font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">Password</label>
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 outline-none transition font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/25 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Switch to Sign Up */}
            <div className="text-center text-xs text-slate-500 pt-1">
              Don't have an account?{" "}
              <Link href="/sign-up" className="text-teal-600 font-bold hover:underline">
                Sign up
              </Link>
            </div>
          </div>
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
