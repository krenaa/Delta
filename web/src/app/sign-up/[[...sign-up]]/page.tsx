import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0a1628] to-[#0F1F3D] text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Back to Home button */}
      <div className="w-full max-w-md mb-6 z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-teal-400 transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Delta Copilot
        </Link>
      </div>

      {/* Brand header */}
      <div className="flex flex-col items-center mb-6 text-center z-10">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <span className="font-mono text-white text-xl font-black">Δ</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Delta</span>
          <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
            Career Copilot
          </span>
        </div>
        <p className="text-xs text-slate-400 max-w-sm">
          Create an account to start your skill verification and 48-hr bridge roadmap.
        </p>
      </div>

      {/* Clerk SignUp Component */}
      <div className="z-10 shadow-2xl rounded-2xl overflow-hidden">
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          appearance={{
            elements: {
              card: "bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-2xl",
              headerTitle: "text-slate-900 font-bold",
              headerSubtitle: "text-slate-500",
              socialButtonsBlockButton: "border border-slate-200 hover:bg-slate-50 font-medium text-slate-700 transition-all",
              formButtonPrimary: "bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all shadow-md shadow-teal-600/20",
              footerActionLink: "text-teal-600 hover:text-teal-700 font-medium",
            },
          }}
        />
      </div>

      <div className="mt-8 text-center text-[11px] text-slate-500 z-10 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-teal-400" />
        Secured by Clerk & Google OAuth • Delta AI Engine
      </div>
    </div>
  );
}
