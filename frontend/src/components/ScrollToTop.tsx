"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

export default function ScrollToTop() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      if (scrollY > 150) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!showScrollTop) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-50 p-3.5 rounded-full bg-teal-600 hover:bg-teal-500 text-white shadow-[0_4px_20px_rgba(13,148,136,0.6)] border border-teal-400/40 transition-all duration-300 cursor-pointer transform hover:scale-110 active:scale-95 flex items-center justify-center group"
      title="Back to Top"
    >
      <ChevronUp className="w-6 h-6 text-white group-hover:-translate-y-0.5 transition-transform stroke-[2.5]" />
    </button>
  );
}
