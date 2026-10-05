"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AuthErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("AuthErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC] text-slate-800 p-6 select-none">
          <div className="w-full max-w-md bg-white border border-slate-200/90 shadow-xl shadow-slate-200/50 rounded-2xl p-7 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black tracking-tight text-slate-900">
                Authentication Service Notice
              </h2>
              <p className="text-xs text-slate-500">
                We encountered an issue loading the authentication service.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left">
                <p className="text-[11px] font-mono text-slate-600 break-words">
                  {this.state.error.message || "Unknown client authentication error"}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/25 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Authentication Service</span>
              </button>

              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors py-2 px-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Delta Main Platform</span>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
