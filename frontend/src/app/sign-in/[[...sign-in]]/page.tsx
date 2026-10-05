"use client";

import { Suspense, useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Target,
  Zap,
  Lock,
  RefreshCw,
  LogIn,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import clsx from "clsx";
import { AuthErrorBoundary } from "@/components/auth/AuthErrorBoundary";
import { parseClerkAuthErrors, FieldErrors } from "@/utils/authErrors";

type SignInViewMode = "sign_in" | "forgot_email" | "forgot_reset";

function SignInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { isLoaded: isSignInLoaded, signIn, setActive } = useSignIn();

  const isPdfUploadReason = searchParams.get("reason") === "pdf_upload";

  // Form State
  const [viewMode, setViewMode] = useState<SignInViewMode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Status & Error States
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Redirect signed-in users automatically
  useEffect(() => {
    if (isAuthLoaded && isSignedIn) {
      router.replace("/");
    }
  }, [isAuthLoaded, isSignedIn, router]);

  if (!isAuthLoaded || isSignedIn) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC] gap-3 text-slate-600 font-medium select-none">
        <RefreshCw className="w-7 h-7 text-teal-600 animate-spin" />
        <span className="text-xs">Checking session security...</span>
      </div>
    );
  }

  // Handle Google OAuth SSO
  const handleGoogleSignIn = async () => {
    if (!isSignInLoaded || !signIn) return;
    setGoogleLoading(true);
    setErrors({});
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (err: unknown) {
      console.error("Google SSO error:", err);
      setErrors(parseClerkAuthErrors(err));
      setGoogleLoading(false);
    }
  };

  // Handle Standard Email + Password Sign-In
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded || !signIn) return;

    setLoading(true);
    setErrors({});
    setSuccessMsg(null);

    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/");
      } else {
        console.log("Sign-in incomplete status:", result.status);
        setErrors({
          general: {
            message: `Sign in status: ${result.status}. Additional verification required.`,
            type: "general",
          },
        });
      }
    } catch (err: unknown) {
      console.error("Sign-in error:", err);
      const parsed = parseClerkAuthErrors(err);
      setErrors(parsed);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Send Reset Code for Password Reset
  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded || !signIn) return;

    if (!email.trim()) {
      setErrors({ email: "Please enter your email address to reset password." });
      return;
    }

    setLoading(true);
    setErrors({});
    setSuccessMsg(null);

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      });
      setSuccessMsg(`We sent a 6-digit verification code to ${email.trim()}`);
      setViewMode("forgot_reset");
    } catch (err: unknown) {
      console.error("Send reset code error:", err);
      setErrors(parseClerkAuthErrors(err));
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit Code and New Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded || !signIn) return;

    if (!resetCode.trim()) {
      setErrors({ code: "Please enter the 6-digit verification code." });
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setErrors({ password: "New password must be at least 8 characters long." });
      return;
    }

    setLoading(true);
    setErrors({});
    setSuccessMsg(null);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: resetCode.trim(),
        password: newPassword,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/");
      } else {
        setErrors({
          general: {
            message: `Password reset status: ${result.status}. Additional steps required.`,
            type: "general",
          },
        });
      }
    } catch (err: unknown) {
      console.error("Reset password error:", err);
      setErrors(parseClerkAuthErrors(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col justify-between relative overflow-hidden select-none p-4 sm:p-6 lg:px-10 lg:py-6">
      {/* Light Ambient Radial Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Bar Navigation */}
      <header className="w-full max-w-7xl mx-auto z-20 flex items-center justify-between shrink-0">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-teal-600 transition-colors py-2 px-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-teal-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30"
        >
          <ArrowLeft className="w-4 h-4 text-teal-600" />
          <span>Back to Delta Platform</span>
        </Link>

        <div className="flex items-center gap-2">
          <img src="/icon.svg" alt="Delta Logo" className="w-8 h-8 rounded-lg shadow-sm shrink-0 object-contain" />
          <span className="text-base font-extrabold tracking-tight text-slate-900">Delta</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-7xl mx-auto z-10 flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 py-6 overflow-y-auto">
        {/* Left Column: Platform Marketing Benefits (Hidden on Mobile) */}
        <div className="hidden lg:flex flex-1 max-w-lg flex-col space-y-4 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-700 text-xs font-semibold uppercase tracking-wider w-fit">
            <LogIn className="w-3.5 h-3.5 text-teal-600" />
            <span>Sign In • Delta Copilot</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 leading-tight">
            Welcome Back to <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-600">Delta</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Sign in to access your persistent audit history, verified skill profiles, custom 48-hour bridge projects, and live interview strategy guides.
          </p>

          <div className="space-y-3 pt-2">
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

        {/* Right Column: Custom Delta Auth Card */}
        <div className="w-full max-w-md shrink-0 flex flex-col items-center justify-center">
          {isPdfUploadReason && (
            <div className="w-full mb-3 p-3 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-800 text-xs font-semibold flex items-center gap-2.5 shadow-sm">
              <Lock className="w-4 h-4 shrink-0 text-teal-600" />
              <span>Please sign in to upload your PDF resume and analyze skill gaps.</span>
            </div>
          )}

          <div className="w-full bg-white border border-slate-200/90 shadow-xl shadow-slate-200/50 rounded-2xl p-6 sm:p-7 space-y-5">
            {/* View Mode 1: Standard Sign In */}
            {viewMode === "sign_in" && (
              <>
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Sign in to Delta
                  </h2>
                  <p className="text-xs text-slate-500">
                    Welcome back! Please enter your details.
                  </p>
                </div>

                {/* Google SSO Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30 focus-visible:border-teal-600 disabled:opacity-60 cursor-pointer"
                >
                  {googleLoading ? (
                    <RefreshCw className="w-4 h-4 text-teal-600 animate-spin" />
                  ) : (
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                  <span className="leading-none select-none">Continue with Google</span>
                </button>

                {/* Divider */}
                <div className="relative flex items-center justify-center">
                  <div className="w-full border-t border-slate-200" />
                  <span className="absolute bg-white px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    OR
                  </span>
                </div>

                {/* General Error Banner with explicit Sign-Up link if no account exists */}
                {errors.general && (
                  <div
                    className={clsx(
                      "p-3 rounded-xl border text-xs font-medium space-y-1.5",
                      errors.general.type === "no_account"
                        ? "bg-amber-50 border-amber-200 text-amber-900"
                        : "bg-red-50 border-red-200 text-red-700"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle
                        className={clsx(
                          "w-4 h-4 shrink-0",
                          errors.general.type === "no_account"
                            ? "text-amber-600"
                            : "text-red-500"
                        )}
                      />
                      <span>{errors.general.message}</span>
                    </div>

                    {errors.general.type === "no_account" && (
                      <Link
                        href="/sign-up"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 hover:underline pt-1"
                      >
                        <span>Create a Delta account now</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSignInSubmit} className="space-y-4">
                  {/* Email Field */}
                  <div className="space-y-1">
                    <label htmlFor="email" className="block text-xs font-bold text-slate-700">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? "email-error" : undefined}
                      className={clsx(
                        "w-full px-3.5 py-2.5 bg-slate-50 border text-slate-900 text-xs rounded-xl focus:bg-white focus:ring-2 outline-none transition font-medium",
                        errors.email
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                          : "border-slate-200 focus:border-teal-600 focus:ring-teal-600/20"
                      )}
                    />
                    {errors.email && (
                      <p id="email-error" className="text-xs text-red-600 font-semibold pt-0.5">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label htmlFor="password" className="block text-xs font-bold text-slate-700">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setErrors({});
                          setSuccessMsg(null);
                          setViewMode("forgot_email");
                        }}
                        className="text-xs font-bold text-teal-600 hover:text-teal-700 hover:underline outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30 rounded"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        aria-invalid={!!errors.password}
                        aria-describedby={errors.password ? "password-error" : undefined}
                        className={clsx(
                          "w-full px-3.5 py-2.5 pr-10 bg-slate-50 border text-slate-900 text-xs rounded-xl focus:bg-white focus:ring-2 outline-none transition font-medium",
                          errors.password
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                            : "border-slate-200 focus:border-teal-600 focus:ring-teal-600/20"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30 rounded-md transition-colors border-none bg-transparent cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p id="password-error" className="text-xs text-red-600 font-semibold pt-0.5">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || googleLoading}
                    className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/25 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>

                {/* Footer Switch Link */}
                <div className="text-center text-xs text-slate-500 pt-1">
                  <span>Don&apos;t have an account? </span>
                  <Link href="/sign-up" className="text-teal-600 font-bold hover:text-teal-700 hover:underline">
                    Sign up
                  </Link>
                </div>
              </>
            )}

            {/* View Mode 2: Forgot Password - Step 1 (Send Email Code) */}
            {viewMode === "forgot_email" && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center mb-2">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Reset your password
                  </h2>
                  <p className="text-xs text-slate-500">
                    Enter your email address and we&apos;ll send you a 6-digit verification code.
                  </p>
                </div>

                {errors.general && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{errors.general.message}</span>
                  </div>
                )}

                <form onSubmit={handleSendResetCode} className="space-y-4">
                  <div className="space-y-1">
                    <label htmlFor="reset-email" className="block text-xs font-bold text-slate-700">
                      Email address
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      aria-invalid={!!errors.email}
                      className={clsx(
                        "w-full px-3.5 py-2.5 bg-slate-50 border text-slate-900 text-xs rounded-xl focus:bg-white focus:ring-2 outline-none transition font-medium",
                        errors.email
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                          : "border-slate-200 focus:border-teal-600 focus:ring-teal-600/20"
                      )}
                    />
                    {errors.email && (
                      <p className="text-xs text-red-600 font-semibold pt-0.5">{errors.email}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/25 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sending reset code...</span>
                      </>
                    ) : (
                      <span>Send Reset Code</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setErrors({});
                      setViewMode("sign_in");
                    }}
                    className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors py-1"
                  >
                    ← Back to Sign In
                  </button>
                </form>
              </div>
            )}

            {/* View Mode 3: Forgot Password - Step 2 (Submit Code & New Password) */}
            {viewMode === "forgot_reset" && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Set new password
                  </h2>
                  <p className="text-xs text-slate-500">
                    Enter the code sent to <span className="font-semibold text-slate-800">{email}</span>.
                  </p>
                </div>

                {successMsg && (
                  <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl text-xs font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-600" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {errors.general && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{errors.general.message}</span>
                  </div>
                )}

                <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label htmlFor="reset-code" className="block text-xs font-bold text-slate-700">
                      Verification Code
                    </label>
                    <input
                      id="reset-code"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      required
                      aria-invalid={!!errors.code}
                      className={clsx(
                        "w-full px-3.5 py-2.5 bg-slate-50 border text-slate-900 text-center font-mono text-sm tracking-widest rounded-xl focus:bg-white focus:ring-2 outline-none transition",
                        errors.code
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                          : "border-slate-200 focus:border-teal-600 focus:ring-teal-600/20"
                      )}
                    />
                    {errors.code && (
                      <p className="text-xs text-red-600 font-semibold pt-0.5">{errors.code}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="new-password" className="block text-xs font-bold text-slate-700">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="At least 8 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        aria-invalid={!!errors.password}
                        className={clsx(
                          "w-full px-3.5 py-2.5 pr-10 bg-slate-50 border text-slate-900 text-xs rounded-xl focus:bg-white focus:ring-2 outline-none transition font-medium",
                          errors.password
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                            : "border-slate-200 focus:border-teal-600 focus:ring-teal-600/20"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none rounded-md transition-colors border-none bg-transparent cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-red-600 font-semibold pt-0.5">{errors.password}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/25 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Updating password...</span>
                      </>
                    ) : (
                      <span>Reset Password & Sign In</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setErrors({});
                      setViewMode("sign_in");
                    }}
                    className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors py-1"
                  >
                    ← Back to Sign In
                  </button>
                </form>
              </div>
            )}
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
    <AuthErrorBoundary>
      <Suspense
        fallback={
          <div className="h-screen w-full flex items-center justify-center bg-[#F8FAFC]">
            <RefreshCw className="w-6 h-6 text-teal-600 animate-spin" />
          </div>
        }
      >
        <SignInContent />
      </Suspense>
    </AuthErrorBoundary>
  );
}
