"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSignUp } from "@clerk/nextjs/legacy";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Target,
  Zap,
  RefreshCw,
  UserPlus,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import clsx from "clsx";
import { AuthErrorBoundary } from "@/components/auth/AuthErrorBoundary";
import { parseClerkAuthErrors, FieldErrors } from "@/utils/authErrors";

type SignUpViewMode = "register" | "verification";

function SignUpContent() {
  const router = useRouter();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { isLoaded: isSignUpLoaded, signUp, setActive } = useSignUp();

  // Form State
  const [viewMode, setViewMode] = useState<SignUpViewMode>("register");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Error States
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Password Strength Calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "bg-slate-200" };

    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500", text: "text-red-600" };
    if (score <= 3) return { score: 2, label: "Fair", color: "bg-amber-500", text: "text-amber-600" };
    return { score: 3, label: "Strong", color: "bg-teal-600", text: "text-teal-600" };
  }, [password]);

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

  // Handle Google OAuth SSO Sign-Up
  const handleGoogleSignUp = async () => {
    if (!isSignUpLoaded || !signUp) return;
    setGoogleLoading(true);
    setErrors({});
    try {
      await signUp.authenticateWithRedirect({
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

  // Step 1: Submit Initial Sign-Up Form
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignUpLoaded || !signUp) return;

    setErrors({});
    setSuccessMsg(null);

    // Client-side validations
    const validationErrors: FieldErrors = {};
    if (!firstName.trim()) validationErrors.firstName = "First name is required.";
    if (!lastName.trim()) validationErrors.lastName = "Last name is required.";
    if (!email.trim()) validationErrors.email = "Email address is required.";
    if (!password) validationErrors.password = "Password is required.";
    else if (password.length < 8) validationErrors.password = "Password must be at least 8 characters.";

    if (password !== confirmPassword) {
      validationErrors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      await signUp.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailAddress: email.trim(),
        password,
      });

      // Prepare email verification OTP
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setSuccessMsg(`We sent a 6-digit verification code to ${email.trim()}`);
      setViewMode("verification");
    } catch (err: unknown) {
      console.error("Sign-up error:", err);
      setErrors(parseClerkAuthErrors(err));
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Email OTP Code
  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignUpLoaded || !signUp) return;

    if (!verificationCode.trim()) {
      setErrors({ code: "Please enter the 6-digit verification code." });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/");
      } else {
        setErrors({
          general: {
            message: `Verification status: ${result.status}. Additional steps required.`,
            type: "general",
          },
        });
      }
    } catch (err: unknown) {
      console.error("Verification error:", err);
      setErrors(parseClerkAuthErrors(err));
    } finally {
      setLoading(false);
    }
  };

  // Resend Email Verification Code
  const handleResendCode = async () => {
    if (!isSignUpLoaded || !signUp) return;
    setResendingCode(true);
    setErrors({});
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setSuccessMsg("A new verification code has been sent to your email address.");
    } catch (err: unknown) {
      console.error("Resend code error:", err);
      setErrors(parseClerkAuthErrors(err));
    } finally {
      setResendingCode(false);
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
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center shadow-md shadow-teal-600/20 font-mono text-white text-base font-black">
            Δ
          </div>
          <span className="text-base font-extrabold tracking-tight text-slate-900">Delta</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-7xl mx-auto z-10 flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 py-6 overflow-y-auto">
        {/* Left Column: Platform Marketing Benefits (Hidden on Mobile) */}
        <div className="hidden lg:flex flex-1 max-w-lg flex-col space-y-4 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-700 text-xs font-semibold uppercase tracking-wider w-fit">
            <UserPlus className="w-3.5 h-3.5 text-teal-600" />
            <span>Create Account • Start Free</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 leading-tight">
            Create Your Account & <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-600">Bridge Skill Gaps</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Register for free to unlock targeted skill gap audits, generate custom 48-hour PoC deliverable roadmaps, and save your user-scoped session history.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600 border border-teal-200 shrink-0 mt-0.5">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">Instant AI Resume Diagnosis</h4>
                <p className="text-xs text-slate-500">Automatically isolate missing high-value skills against any tech stack or Job Description URL.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600 border border-teal-200 shrink-0 mt-0.5">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">Personalized PoC Roadmaps</h4>
                <p className="text-xs text-slate-500">Receive step-by-step 48-hour mini project specifications to prove zero-evidence skills.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600 border border-teal-200 shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">Private User-Scoped Audit Vault</h4>
                <p className="text-xs text-slate-500">All uploaded resumes and audit histories are securely tied to your user session across devices.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Custom Delta Auth Card */}
        <div className="w-full max-w-md shrink-0 flex flex-col items-center justify-center">
          <div className="w-full bg-white border border-slate-200/90 shadow-xl shadow-slate-200/50 rounded-2xl p-6 sm:p-7 space-y-5">
            {/* View Mode 1: Initial Registration Form */}
            {viewMode === "register" && (
              <>
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Create your Delta Account
                  </h2>
                  <p className="text-xs text-slate-500">
                    Get started with your Google account or email.
                  </p>
                </div>

                {/* Google SSO Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignUp}
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

                {/* General Error Banner with explicit Sign-In link if account already exists */}
                {errors.general && (
                  <div
                    className={clsx(
                      "p-3 rounded-xl border text-xs font-medium space-y-1.5",
                      errors.general.type === "account_exists"
                        ? "bg-amber-50 border-amber-200 text-amber-900"
                        : "bg-red-50 border-red-200 text-red-700"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle
                        className={clsx(
                          "w-4 h-4 shrink-0",
                          errors.general.type === "account_exists"
                            ? "text-amber-600"
                            : "text-red-500"
                        )}
                      />
                      <span>{errors.general.message}</span>
                    </div>

                    {errors.general.type === "account_exists" && (
                      <Link
                        href="/sign-in"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 hover:underline pt-1"
                      >
                        <span>Sign in to your Delta account</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                )}

                {/* Registration Form */}
                <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
                  {/* Clerk Captcha Target Container for Bot Protection */}
                  <div id="clerk-captcha" className="w-full" />

                  {/* Full Name Grid (First Name + Last Name) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="firstName" className="block text-xs font-bold text-slate-700">
                        First Name
                      </label>
                      <input
                        id="firstName"
                        type="text"
                        placeholder="Alex"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        aria-invalid={!!errors.firstName}
                        className={clsx(
                          "w-full px-3.5 py-2.5 bg-slate-50 border text-slate-900 text-xs rounded-xl focus:bg-white focus:ring-2 outline-none transition font-medium",
                          errors.firstName
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                            : "border-slate-200 focus:border-teal-600 focus:ring-teal-600/20"
                        )}
                      />
                      {errors.firstName && (
                        <p className="text-[11px] text-red-600 font-semibold pt-0.5">
                          {errors.firstName}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="lastName" className="block text-xs font-bold text-slate-700">
                        Last Name
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        placeholder="Morgan"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        aria-invalid={!!errors.lastName}
                        className={clsx(
                          "w-full px-3.5 py-2.5 bg-slate-50 border text-slate-900 text-xs rounded-xl focus:bg-white focus:ring-2 outline-none transition font-medium",
                          errors.lastName
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                            : "border-slate-200 focus:border-teal-600 focus:ring-teal-600/20"
                        )}
                      />
                      {errors.lastName && (
                        <p className="text-[11px] text-red-600 font-semibold pt-0.5">
                          {errors.lastName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1">
                    <label htmlFor="email" className="block text-xs font-bold text-slate-700">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      placeholder="alex@example.com"
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

                  {/* Password */}
                  <div className="space-y-1">
                    <label htmlFor="password" className="block text-xs font-bold text-slate-700">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none rounded-md transition-colors border-none bg-transparent cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-red-600 font-semibold pt-0.5">{errors.password}</p>
                    )}

                    {/* Password Strength Meter */}
                    {password && (
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Password strength:</span>
                          <span className={clsx("font-bold", passwordStrength.text)}>
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden flex gap-1">
                          <div
                            className={clsx(
                              "h-full transition-all duration-300 rounded-full",
                              passwordStrength.score >= 1 ? passwordStrength.color : "bg-transparent",
                              "w-1/3"
                            )}
                          />
                          <div
                            className={clsx(
                              "h-full transition-all duration-300 rounded-full",
                              passwordStrength.score >= 2 ? passwordStrength.color : "bg-transparent",
                              "w-1/3"
                            )}
                          />
                          <div
                            className={clsx(
                              "h-full transition-all duration-300 rounded-full",
                              passwordStrength.score >= 3 ? passwordStrength.color : "bg-transparent",
                              "w-1/3"
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1">
                    <label htmlFor="confirmPassword" className="block text-xs font-bold text-slate-700">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        aria-invalid={!!errors.confirmPassword}
                        className={clsx(
                          "w-full px-3.5 py-2.5 pr-10 bg-slate-50 border text-slate-900 text-xs rounded-xl focus:bg-white focus:ring-2 outline-none transition font-medium",
                          errors.confirmPassword
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                            : "border-slate-200 focus:border-teal-600 focus:ring-teal-600/20"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none rounded-md transition-colors border-none bg-transparent cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-xs text-red-600 font-semibold pt-0.5">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || googleLoading}
                    className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/25 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30 mt-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Creating account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Free Account</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>

                {/* Footer Link */}
                <div className="text-center text-xs text-slate-500 pt-1">
                  <span>Already have an account? </span>
                  <Link href="/sign-in" className="text-teal-600 font-bold hover:text-teal-700 hover:underline">
                    Sign in
                  </Link>
                </div>
              </>
            )}

            {/* View Mode 2: Email OTP Code Verification */}
            {viewMode === "verification" && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Verify Your Email
                  </h2>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    We sent a 6-digit verification code to <span className="font-bold text-slate-800">{email}</span>.
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

                <form onSubmit={handleVerificationSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label htmlFor="verification-code" className="block text-xs font-bold text-slate-700">
                      Verification Code
                    </label>
                    <input
                      id="verification-code"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      required
                      aria-invalid={!!errors.code}
                      className={clsx(
                        "w-full px-3.5 py-2.5 bg-slate-50 border text-slate-900 text-center font-mono text-sm tracking-widest rounded-xl focus:bg-white focus:ring-2 outline-none transition font-bold",
                        errors.code
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                          : "border-slate-200 focus:border-teal-600 focus:ring-teal-600/20"
                      )}
                    />
                    {errors.code && (
                      <p className="text-xs text-red-600 font-semibold pt-0.5">{errors.code}</p>
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
                        <span>Verifying code...</span>
                      </>
                    ) : (
                      <span>Complete Sign Up →</span>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setViewMode("register")}
                      className="font-bold text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      ← Change email
                    </button>

                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendingCode}
                      className="font-bold text-teal-600 hover:text-teal-700 hover:underline disabled:opacity-50"
                    >
                      {resendingCode ? "Resending..." : "Resend code"}
                    </button>
                  </div>
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

export default function SignUpPage() {
  return (
    <AuthErrorBoundary>
      <Suspense
        fallback={
          <div className="h-screen w-full flex items-center justify-center bg-[#F8FAFC]">
            <RefreshCw className="w-6 h-6 text-teal-600 animate-spin" />
          </div>
        }
      >
        <SignUpContent />
      </Suspense>
    </AuthErrorBoundary>
  );
}
