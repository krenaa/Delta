"use client";

import { useState, useRef, useEffect, ChangeEvent, DragEvent, useMemo } from "react";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  BookOpen,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Coffee,
  Copy,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  FileUp,
  Flame,
  FolderGit2,
  Globe,
  HelpCircle,
  History,
  Lightbulb,
  Link2,
  MessageSquare,
  PauseCircle,
  Pencil,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  TableProperties,
  Target,
  Trash2,
  Upload,
  UserCheck,
  Wand2,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import dynamic from "next/dynamic";
const ResumePdfViewer = dynamic(() => import("./ResumePdfViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 w-full min-h-[580px] flex items-center justify-center bg-white text-xs text-[var(--text-muted)]">
      Rendering full-width resume...
    </div>
  ),
});

interface GapAnalysisResult {
  missing: string[];
  weak: string[];
  strong: string[];
}

interface MissingSkillRoadmap {
  skill: string;
  company_keywords?: string[];
  why_it_matters: string;
  project_keywords?: string[];
  bridge_project: string;
  bridge_keywords?: string[];
  transferable_from: string;
}

interface WeakImprovement {
  skill: string;
  recommended_bullets: string[];
}

interface InterviewQuestion {
  question: string;
  targeted_skill: string;
  suggested_talking_points: string;
}

interface Tier1Insights {
  match_score?: number;
  company_name?: string;
  company_context?: string;
  executive_summary?: string;
  missing_roadmap?: MissingSkillRoadmap[];
  weak_improvements: WeakImprovement[];
  interview_questions: InterviewQuestion[];
}

interface AnalyzeResponse {
  thread_id: string;
  status: string;
  proposed_gap: GapAnalysisResult | null;
  interrupt_message?: string;
}

interface FinalResponse {
  thread_id: string;
  status: string;
  final_output: GapAnalysisResult | null;
  insights?: Tier1Insights | null;
}

const DEFAULT_JD = `Senior AI Workflow Engineer
Role & Responsibilities:
- Build autonomous multi-agent pipelines and real-time workflows using LangGraph and Python.
- Containerize and deploy services using Docker and Kubernetes in AWS cloud.
- Design relational schemas in PostgreSQL and configure Redis caching layers.
- Implement structured outputs, RAG pipelines, and LLM evaluation benchmarks.`;

const DEFAULT_RESUME = `Candidate: Krena Patel
Senior Full-Stack & AI Engineer (4 Years Experience)
Summary:
Built multi-agent systems and high-throughput backend APIs for enterprise clients.
Key Experience:
- Engineered asynchronous microservices with Python, FastAPI, and PostgreSQL.
- Containerized development and staging pipelines using Docker.
- Explored LangGraph prototypes for ambient AI assistants and agent graphs.
- Implemented CI/CD pipelines, Git workflows, and automated testing with pytest.`;

interface AuditHistoryItem {
  id: string;
  timestamp: string;
  roleTitle: string;
  companyName?: string;
  matchScore?: number;
  jobDescription: string;
  resumeText: string;
  hitlReview: GapAnalysisResult | null;
  finalOutput: GapAnalysisResult | null;
  insights: Tier1Insights | null;
}

type ActiveSection = "sources" | "review" | "roadmap" | "bullets" | "interview";

export default function ResumeGapAnalyzerPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [activeSection, setActiveSection] = useState<ActiveSection>("sources");

  // Clean slate default inputs (empty strings)
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");

  // Audit History state & drawer toggle
  const [history, setHistory] = useState<AuditHistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Load saved audit history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("delta_audit_history");
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load audit history from localStorage:", e);
    }
  }, []);

  const handleLoadDemo = () => {
    setJobDescription(DEFAULT_JD);
    setResumeText(DEFAULT_RESUME);
    setError(null);
  };

  const handleClearInputs = () => {
    setJobDescription("");
    setResumeText("");
    setPdfUrl(null);
    setUploadedFileName(null);
    setHitlReview(null);
    setFinalOutput(null);
    setInsights(null);
    setActiveSection("sources");
  };

  const saveAuditToHistory = (
    jd: string,
    res: string,
    hitl: GapAnalysisResult | null,
    finalOut: GapAnalysisResult | null,
    ins: Tier1Insights | null
  ) => {
    try {
      if (!jd.trim() || !res.trim()) return;
      const title = ins?.company_name
        ? `${ins.company_name} Audit`
        : jd.split("\n")[0].slice(0, 32) || "Audit Report";

      const newItem: AuditHistoryItem = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        roleTitle: title,
        companyName: ins?.company_name,
        matchScore: ins?.match_score,
        jobDescription: jd,
        resumeText: res,
        hitlReview: hitl,
        finalOutput: finalOut,
        insights: ins,
      };

      setHistory((prev) => {
        const filtered = prev.filter(
          (item) => item.jobDescription !== jd || item.resumeText !== res
        );
        const updated = [newItem, ...filtered].slice(0, 10);
        localStorage.setItem("delta_audit_history", JSON.stringify(updated));
        return updated;
      });
    } catch (e) {
      console.error("Failed to save audit history:", e);
    }
  };

  const handleLoadHistoryItem = (item: AuditHistoryItem) => {
    setJobDescription(item.jobDescription);
    setResumeText(item.resumeText);
    setHitlReview(item.hitlReview);
    setFinalOutput(item.finalOutput);
    setInsights(item.insights);
    setActiveSection(item.finalOutput ? "roadmap" : item.hitlReview ? "review" : "sources");
    setIsHistoryOpen(false);
  };

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      localStorage.setItem("delta_audit_history", JSON.stringify(updated));
      return updated;
    });
  };

  // PDF Preview State
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfViewMode, setPdfViewMode] = useState<"preview" | "text">("preview");

  // System states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedBulletKey, setCopiedBulletKey] = useState<string | null>(null);
  const [copiedQuestionKey, setCopiedQuestionKey] = useState<number | null>(null);
  const [copiedProjectKey, setCopiedProjectKey] = useState<number | null>(null);

  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // HITL state (Phase 2)
  const [threadId, setThreadId] = useState<string | null>(null);
  const [hitlReview, setHitlReview] = useState<GapAnalysisResult | null>(null);
  const [userAdjustment, setUserAdjustment] = useState("");

  // Final Output state (Phase 3)
  const [finalOutput, setFinalOutput] = useState<GapAnalysisResult | null>(null);
  const [insights, setInsights] = useState<Tier1Insights | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});

  // User customizable resume bridges (key = skillName)
  const [customBridges, setCustomBridges] = useState<
    Record<string, { project?: string; pitch?: string; isEditing?: boolean }>
  >({});

  // Caches for last analyzed inputs and confirmed review to prevent redundant re-runs
  const lastAnalyzedInputsRef = useRef<{ jd: string; resume: string } | null>(null);
  const lastConfirmedReviewRef = useRef<{
    missing: string[];
    weak: string[];
    strong: string[];
    adjustment: string;
  } | null>(null);

  // Flag to avoid scrollspy feedback loops during programmatic smooth scrolling
  const isProgrammaticScrollRef = useRef(false);

  // Auto-scroll active navigation tab horizontally ONLY within the mobile ribbon (< 1024px)
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      const nav = document.getElementById("mobile-tab-nav");
      const el =
        document.getElementById(`mobile-nav-tab-${activeSection}`) ||
        document.getElementById(`nav-tab-${activeSection}`);
      if (nav && el) {
        const navRect = nav.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const offset = elRect.left - navRect.left - (navRect.width / 2 - elRect.width / 2);
        nav.scrollBy({ left: offset, behavior: "smooth" });
      }
    }
  }, [activeSection]);

  // Robust Scrollspy: listens to window scroll across all 5 sections without jitter
  useEffect(() => {
    if (!finalOutput && !hitlReview) return;

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return;

      const interviewEl = document.getElementById("section-interview");
      const bulletsEl = document.getElementById("section-bullets");
      const roadmapEl = document.getElementById("section-roadmap");
      const reviewEl = document.getElementById("section-review");
      const sourcesEl = document.getElementById("section-sources");

      const isMobile = window.innerWidth < 1024;
      const triggerY = isMobile ? 130 : 100;

      // Bottom-of-page check: if scrolled to the very bottom, activate interview
      if (
        interviewEl &&
        window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 60
      ) {
        if (activeSection !== "interview") {
          setActiveSection("interview");
        }
        return;
      }

      let current: ActiveSection = "sources";
      if (interviewEl && interviewEl.getBoundingClientRect().top <= triggerY) {
        current = "interview";
      } else if (bulletsEl && bulletsEl.getBoundingClientRect().top <= triggerY) {
        current = "bullets";
      } else if (roadmapEl && roadmapEl.getBoundingClientRect().top <= triggerY) {
        current = "roadmap";
      } else if (reviewEl && reviewEl.getBoundingClientRect().top <= triggerY) {
        current = "review";
      } else if (sourcesEl) {
        current = "sources";
      }

      if (current !== activeSection) {
        setActiveSection(current);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [finalOutput, hitlReview, activeSection]);

  const handleNavClick = (section: ActiveSection) => {
    setActiveSection(section);
    isProgrammaticScrollRef.current = true;

    const tryScroll = (attempts = 0) => {
      const el = document.getElementById(`section-${section}`);
      if (el) {
        const headerOffset = typeof window !== "undefined" && window.innerWidth < 1024 ? 120 : 85;
        const elementPosition = el.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: "smooth",
        });
      } else if (attempts < 6) {
        setTimeout(() => tryScroll(attempts + 1), 60);
        return;
      } else if (section === "sources") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 700);
    };

    setTimeout(() => tryScroll(0), 40);
  };

  // Dynamically detect role and candidate name from documents
  const detectedRole = useMemo(() => {
    const lines = jobDescription.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const clean = line.replace(/^[#*\s-]+/, "").replace(/^role\s*[:&]/i, "").trim();
      if (clean.length > 3 && !clean.toLowerCase().startsWith("responsibilities") && !clean.toLowerCase().startsWith("requirements")) {
        return clean.slice(0, 36);
      }
    }
    return "Target Role";
  }, [jobDescription]);

  const detectedCandidateName = useMemo(() => {
    if (uploadedFileName) {
      return uploadedFileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").slice(0, 28);
    }
    const match = resumeText.match(/(?:candidate|name)[\s:]+([A-Za-z\s]+)/i);
    if (match && match[1]) return match[1].trim().slice(0, 28);
    return "Candidate Resume";
  }, [resumeText, uploadedFileName]);

  // Dynamically extract candidate projects and real experience anchors from resume text
  const detectedResumeProjects = useMemo(() => {
    if (!resumeText) return [];
    const lines = resumeText.split("\n").map((l) => l.trim()).filter(Boolean);
    const projects: string[] = [];

    let inRelevantSection = false;
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (
        lower.includes("project") ||
        lower.includes("experience") ||
        lower.includes("internship") ||
        lower.includes("work history") ||
        lower.includes("portfolio")
      ) {
        inRelevantSection = true;
        continue;
      }
      if (
        lower.includes("education") ||
        lower.includes("certification") ||
        lower.includes("skills:") ||
        lower.includes("contact")
      ) {
        inRelevantSection = false;
      }

      // Check bullet points or action verbs
      if (
        line.startsWith("-") ||
        line.startsWith("*") ||
        line.startsWith("•") ||
        /^(built|engineered|developed|implemented|designed|created|led|architected|deployed)\b/i.test(line)
      ) {
        const clean = line.replace(/^[-*•\s]+/, "").trim();
        if (clean.length > 8 && clean.length < 110) {
          projects.push(clean);
        }
      } else if (
        inRelevantSection &&
        line.length > 5 &&
        line.length < 65 &&
        !line.endsWith(":") &&
        !line.includes("@") &&
        !/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})/i.test(line)
      ) {
        projects.push(line.replace(/^[#*\s-]+/, "").trim());
      }
    }

    const unique = Array.from(new Set(projects));
    if (unique.length === 0) {
      return [
        "FastAPI Asynchronous Microservices & PostgreSQL",
        "LangGraph Autonomous Multi-Agent Graphs",
        "Dockerized Staging & Production Deployment Pipeline",
        "CI/CD Git Workflows & Automated PyTest Suite",
      ];
    }
    return unique.slice(0, 10);
  }, [resumeText]);

  // Bridge state helpers
  const getBridgeData = (skillName: string, fallbackIdx: number, defaultPitch: string) => {
    const custom = customBridges[skillName];
    const defaultProj =
      detectedResumeProjects.length > 0
        ? detectedResumeProjects[fallbackIdx % detectedResumeProjects.length]
        : "Production Microservices";
    const project = custom?.project !== undefined ? custom.project : defaultProj;
    const pitch = custom?.pitch !== undefined ? custom.pitch : defaultPitch;
    return {
      project,
      pitch,
      isEditing: !!custom?.isEditing,
      isModified: custom !== undefined && (custom.project !== defaultProj || custom.pitch !== defaultPitch),
    };
  };

  const updateBridge = (
    skillName: string,
    updates: { project?: string; pitch?: string; isEditing?: boolean }
  ) => {
    setCustomBridges((prev) => {
      const current = prev[skillName] || {};
      return {
        ...prev,
        [skillName]: {
          ...current,
          ...updates,
        },
      };
    });
  };

  const resetBridge = (skillName: string) => {
    setCustomBridges((prev) => {
      const next = { ...prev };
      delete next[skillName];
      return next;
    });
  };

  // Job & Company URL Ingestion state
  const [jobUrl, setJobUrl] = useState("");
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [companyContext, setCompanyContext] = useState<string | null>(null);
  const [sourcePlatform, setSourcePlatform] = useState<string | null>(null);
  const [urlFetchSuccessMsg, setUrlFetchSuccessMsg] = useState<string | null>(null);

  // Skill verification tab & search states for fatigue-free editing
  const [skillCategoryTab, setSkillCategoryTab] = useState<"missing" | "weak" | "strong">("missing");
  const [skillSearchQuery, setSkillSearchQuery] = useState("");

  // 48-Hour Roadmap mobile sub-tab and accordion expansion state
  const [roadmapMobileTabs, setRoadmapMobileTabs] = useState<Record<number, "poc" | "why" | "bridge">>({});
  const [expandedRoadmapItems, setExpandedRoadmapItems] = useState<Record<number, boolean>>({});

  // Safe company name resolution: only displays if supplied by user or actually present in the JD!
  const effectiveCompanyName = useMemo(() => {
    if (companyName && companyName.trim()) return companyName.trim();
    if (insights?.company_name && insights.company_name.trim()) {
      const raw = insights.company_name.trim();
      if (jobDescription.toLowerCase().includes(raw.toLowerCase())) {
        return raw;
      }
    }
    return null;
  }, [companyName, insights?.company_name, jobDescription]);

  const handleFetchJobUrl = async (overrideUrl?: string) => {
    const targetUrl = (overrideUrl || jobUrl).trim();
    if (!targetUrl) {
      setError("Please paste a valid job or company URL (e.g. from LinkedIn, Greenhouse, Lever, etc.).");
      return;
    }

    setFetchingUrl(true);
    setError(null);
    setUrlFetchSuccessMsg(null);

    try {
      let response: Response;
      try {
        response = await fetch("/api/fetch-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: targetUrl }),
        });
      } catch {
        response = await fetch("http://localhost:8000/api/fetch-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: targetUrl }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Failed to fetch URL" }));
        throw new Error(errorData.detail || `Server returned ${response.status}`);
      }

      const data = await response.json();
      if (data.job_description_clean) {
        setJobDescription(data.job_description_clean);
      }
      if (data.company_name) {
        setCompanyName(data.company_name);
      }
      if (data.company_context) {
        setCompanyContext(data.company_context);
      }
      if (data.source_platform) {
        setSourcePlatform(data.source_platform);
      }
      setUrlFetchSuccessMsg(
        `Successfully loaded from ${data.source_platform || "Platform"}! Context for "${data.company_name}" connected.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`URL ingestion error: ${msg}`);
    } finally {
      setFetchingUrl(false);
    }
  };

  const handleReset = () => {
    setJobDescription("");
    setResumeText("");
    setHitlReview(null);
    setFinalOutput(null);
    setInsights(null);
    setThreadId(null);
    setUserAdjustment("");
    setError(null);
    setUploadedFileName(null);
    setPdfUrl(null);
    setCustomBridges({});
    setJobUrl("");
    setCompanyName(null);
    setCompanyContext(null);
    setSourcePlatform(null);
    setUrlFetchSuccessMsg(null);
    setSkillSearchQuery("");
    setSkillCategoryTab("missing");
    setRoadmapMobileTabs({});
    setExpandedRoadmapItems({});
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    lastAnalyzedInputsRef.current = null;
    lastConfirmedReviewRef.current = null;
    setActiveSection("sources");
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploadingFile(true);
    setError(null);

    // If PDF, store local preview blob URL immediately
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const blobUrl = URL.createObjectURL(file);
      setPdfUrl(blobUrl);
      setPdfViewMode("preview");
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      let response: Response;
      try {
        response = await fetch("/api/upload-resume", {
          method: "POST",
          body: formData,
        });
      } catch {
        response = await fetch("http://localhost:8000/api/upload-resume", {
          method: "POST",
          body: formData,
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(errorData.detail || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      setResumeText(data.extracted_text);
      setUploadedFileName(file.name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Resume file upload error: ${msg}`);
    } finally {
      setUploadingFile(false);
    }
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const onDropFile = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleStartAnalysis = async () => {
    if (!jobDescription.trim() || !resumeText.trim()) {
      setError("Please ensure both Job Description and Resume text are provided.");
      return;
    }

    // Fast-path: if inputs have not changed since last run, redirect immediately without re-calling the backend
    if (
      lastAnalyzedInputsRef.current &&
      lastAnalyzedInputsRef.current.jd === jobDescription.trim() &&
      lastAnalyzedInputsRef.current.resume === resumeText.trim()
    ) {
      if (finalOutput) {
        handleNavClick("roadmap");
        return;
      }
      if (hitlReview) {
        handleNavClick("review");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      let response: Response;
      try {
        response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_description_text: jobDescription,
            resume_text: resumeText,
            company_name: companyName,
            company_context: companyContext,
          }),
        });
      } catch {
        response = await fetch("http://localhost:8000/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_description_text: jobDescription,
            resume_text: resumeText,
            company_name: companyName,
            company_context: companyContext,
          }),
        });
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(
          `Server returned ${response.status}: ${response.statusText} ${errorBody}`
        );
      }

      const data: AnalyzeResponse = await response.json();
      setThreadId(data.thread_id);

      // Record input snapshot
      lastAnalyzedInputsRef.current = {
        jd: jobDescription.trim(),
        resume: resumeText.trim(),
      };

      if (data.proposed_gap) {
        setHitlReview(data.proposed_gap);
        handleNavClick("review");
        saveAuditToHistory(jobDescription, resumeText, data.proposed_gap, null, null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        `Failed to run analysis: ${msg}. Please ensure FastAPI backend is running on port 8000.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResumeAnalysis = async (customAdjustment?: string) => {
    if (!threadId) return;

    const feedbackToSend =
      customAdjustment !== undefined ? customAdjustment : userAdjustment;

    // Fast-path: if finalOutput already exists and review classification + feedback have not changed, redirect immediately
    if (finalOutput && hitlReview && lastConfirmedReviewRef.current) {
      const prev = lastConfirmedReviewRef.current;
      const sameMissing = JSON.stringify(prev.missing) === JSON.stringify(hitlReview.missing);
      const sameWeak = JSON.stringify(prev.weak) === JSON.stringify(hitlReview.weak);
      const sameStrong = JSON.stringify(prev.strong) === JSON.stringify(hitlReview.strong);
      const sameAdj = (prev.adjustment || "").trim() === (feedbackToSend || "").trim();

      if (sameMissing && sameWeak && sameStrong && sameAdj) {
        handleNavClick("roadmap");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      let response: Response;
      try {
        response = await fetch("/api/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            thread_id: threadId,
            user_feedback: feedbackToSend,
          }),
        });
      } catch {
        response = await fetch("http://localhost:8000/api/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            thread_id: threadId,
            user_feedback: feedbackToSend,
          }),
        });
      }

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}: ${response.statusText}`
        );
      }

      const data: FinalResponse = await response.json();
      setFinalOutput(data.final_output);
      if (data.insights) {
        setInsights(data.insights);
      }
      saveAuditToHistory(
        jobDescription,
        resumeText,
        hitlReview,
        data.final_output,
        data.insights || null
      );

      // Record confirmed review snapshot
      if (hitlReview) {
        lastConfirmedReviewRef.current = {
          missing: [...hitlReview.missing],
          weak: [...hitlReview.weak],
          strong: [...hitlReview.strong],
          adjustment: feedbackToSend || "",
        };
      }

      handleNavClick("roadmap");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to finalize analysis: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveSkill = (
    skill: string,
    from: "missing" | "weak" | "strong",
    to: "missing" | "weak" | "strong"
  ) => {
    const current = hitlReview || finalOutput;
    if (!current) return;
    const updated = {
      missing: [...current.missing],
      weak: [...current.weak],
      strong: [...current.strong],
    };
    updated[from] = updated[from].filter((s) => s !== skill);
    if (!updated[to].includes(skill)) {
      updated[to].push(skill);
    }
    setHitlReview(updated);

    const note = `Move ${skill} from ${from} to ${to}`;
    setUserAdjustment((prev) => (prev ? `${prev}; ${note}` : note));
  };

  const buildMarkdownReport = () => {
    if (!finalOutput) return "";
    let md = `# Technical Gap Analysis & Career Roadmap Report\n\n`;
    md += `**Target Role:** ${detectedRole}\n`;
    if (effectiveCompanyName) {
      md += `**Target Company:** ${effectiveCompanyName}\n`;
    }
    if (companyContext || insights?.company_context) {
      md += `**Company Context & Priorities:**\n${companyContext || insights?.company_context}\n`;
    }
    md += `**Candidate:** ${detectedCandidateName}\n\n`;

    if (insights?.match_score) {
      md += `**Match Readiness Score:** ${insights.match_score}%\n\n`;
    }

    if (insights?.executive_summary) {
      md += `## Executive Synthesis\n${insights.executive_summary}\n\n`;
    }

    md += `## 1. Skill Gap Evaluation\n\n`;
    md += `### ✕ Missing Skills (${finalOutput.missing.length})\n`;
    md += finalOutput.missing.length > 0
      ? finalOutput.missing.map((s) => `- ✕ ${s}`).join("\n") + "\n\n"
      : "_None detected_\n\n";

    md += `### ~ Weak Skills (${finalOutput.weak.length})\n`;
    md += finalOutput.weak.length > 0
      ? finalOutput.weak.map((s) => `- ~ ${s}`).join("\n") + "\n\n"
      : "_None detected_\n\n";

    md += `### ✓ Strong Skills (${finalOutput.strong.length})\n`;
    md += finalOutput.strong.length > 0
      ? finalOutput.strong.map((s) => `- ✓ ${s}`).join("\n") + "\n\n"
      : "_None detected_\n\n";

    if (insights?.missing_roadmap && insights.missing_roadmap.length > 0) {
      md += `## 2. Missing Skills 48-Hour Action Roadmap\n\n`;
      insights.missing_roadmap.forEach((item, idx) => {
        const bridge = getBridgeData(item.skill, idx, item.transferable_from);
        md += `### ${idx + 1}. ${item.skill}\n`;
        if (item.company_keywords && item.company_keywords.length > 0) {
          md += `**Company Focus:** ${item.company_keywords.map((k) => `#${k}`).join(" ")}\n`;
        }
        md += `**Why Company Wants This:**\n${item.why_it_matters}\n\n`;
        if (item.project_keywords && item.project_keywords.length > 0) {
          md += `**Project Deliverable:** ${item.project_keywords.map((k) => `🛠️ ${k}`).join(" ")}\n`;
        }
        md += `**48-Hour Proof-of-Concept Project:**\n${item.bridge_project}\n\n`;
        md += `**Resume Project Anchor:** ${bridge.project}\n`;
        if (item.bridge_keywords && item.bridge_keywords.length > 0) {
          md += `**Bridge Tags:** ${item.bridge_keywords.map((k) => `🌉 ${k}`).join(" ")}\n`;
        }
        md += `**Resume Bridge Connection:**\n${bridge.pitch}\n\n---\n\n`;
      });
    }

    if (insights?.weak_improvements && insights.weak_improvements.length > 0) {
      md += `## 3. Recommended Resume Bullet Rewrites\n\n`;
      insights.weak_improvements.forEach((item) => {
        md += `### ${item.skill}\n`;
        item.recommended_bullets.forEach((b) => {
          md += `- ${b}\n`;
        });
        md += `\n`;
      });
    }

    if (insights?.interview_questions && insights.interview_questions.length > 0) {
      md += `## 4. High-Probability Interview Questions\n\n`;
      insights.interview_questions.forEach((q, idx) => {
        md += `### Q${idx + 1}: ${q.question} (${q.targeted_skill})\n`;
        md += `**Suggested Strategy & Talking Points:**\n${q.suggested_talking_points}\n\n`;
      });
    }

    return md;
  };

  // High-Quality PDF Download generator via printable executive dossier
  const handleDownloadPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    const printStyles = `
      :root {
        --navy-900: ${typeof window !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--navy-900").trim() : ""};
        --navy-700: ${typeof window !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--navy-700").trim() : ""};
        --navy-50: ${typeof window !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--navy-50").trim() : ""};
        --bg: ${typeof window !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() : ""};
        --surface: ${typeof window !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--surface").trim() : ""};
        --border: ${typeof window !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--border").trim() : ""};
        --text-primary: ${typeof window !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--text-primary").trim() : ""};
        --text-muted: ${typeof window !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--text-muted").trim() : ""};
        --missing: ${typeof window !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--missing").trim() : ""};
        --missing-bg: ${typeof window !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--missing-bg").trim() : ""};
        --missing-border: ${typeof window !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--missing-border").trim() : ""};
        --weak: ${typeof window !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--weak").trim() : ""};
        --weak-bg: ${typeof window !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--weak-bg").trim() : ""};
        --weak-border: ${typeof window !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--weak-border").trim() : ""};
        --strong: ${typeof window !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--strong").trim() : ""};
        --strong-bg: ${typeof window !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--strong-bg").trim() : ""};
        --strong-border: ${typeof window !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--strong-border").trim() : ""};
      }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: var(--navy-900); max-width: 820px; margin: 0 auto; line-height: 1.5; background: var(--surface); }
      h1 { font-size: 22px; margin-bottom: 4px; color: var(--navy-900); font-weight: 800; }
      .meta { color: var(--text-muted); font-size: 12px; margin-top: 0; margin-bottom: 20px; }
      .score-box { background: var(--navy-50); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 24px; }
      .score-title { font-size: 16px; font-weight: bold; color: var(--navy-900); margin-bottom: 4px; }
      h2 { font-size: 15px; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid var(--border); padding-bottom: 6px; color: var(--navy-900); text-transform: uppercase; letter-spacing: 0.5px; }
      .card { border: 1px solid var(--border); border-radius: 10px; padding: 14px; margin-bottom: 16px; background: var(--surface); page-break-inside: avoid; }
      .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 10px; }
      .grid-item { background: var(--bg); padding: 10px; border-radius: 8px; font-size: 11px; }
      .grid-item strong { display: block; font-size: 10px; text-transform: uppercase; color: var(--navy-900); margin-bottom: 4px; }
      .badge-missing { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background: var(--missing-bg); color: var(--missing); border: 1px solid var(--missing-border); margin-right: 4px; }
      .badge-weak { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background: var(--weak-bg); color: var(--weak); border: 1px solid var(--weak-border); margin-right: 4px; }
      .badge-strong { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background: var(--strong-bg); color: var(--strong); border: 1px solid var(--strong-border); margin-right: 4px; }
      ul { margin: 6px 0; padding-left: 20px; font-size: 12px; }
      li { margin-bottom: 4px; }
      @media print { body { padding: 16px; } }
    `;

    const reportHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Career Gap Analysis & Roadmap - ${detectedRole}</title>
          <style>
            ${printStyles}
          </style>
        </head>
        <body>
          <h1>Technical Gap Analysis & Career Roadmap</h1>
          <div class="meta">Role: <strong>${detectedRole}</strong>${effectiveCompanyName ? ` | Company: <strong>${effectiveCompanyName}</strong>` : ""} | Candidate: <strong>${detectedCandidateName}</strong></div>

          <div class="score-box">
            <div class="score-title">Role Readiness Score: ${insights?.match_score ?? 74}%</div>
            ${(companyContext || insights?.company_context) ? `<p style="font-size: 11px; margin: 4px 0 6px 0; color: var(--navy-900); font-weight: 600;">🏢 Company Mission: ${companyContext || insights?.company_context}</p>` : ""}
            <p style="font-size: 12px; margin: 4px 0 0 0; color: var(--navy-900);">${insights?.executive_summary || ""}</p>
          </div>

          <h2>1. 48-Hour Missing Skills Roadmap</h2>
          ${(insights?.missing_roadmap || []).map((item, idx) => {
            const bridge = getBridgeData(item.skill, idx, item.transferable_from);
            return `
            <div class="card">
              <div style="font-weight: bold; font-size: 13px; color: var(--navy-900);">
                <span class="badge-missing">✕ Gap</span> ${idx + 1}. ${item.skill}
              </div>
              <div class="grid">
                <div class="grid-item">
                  <strong>Why Company Wants</strong>
                  <p style="margin: 0; color: var(--navy-900);">${item.why_it_matters}</p>
                </div>
                <div class="grid-item" style="background: var(--surface); border: 1px solid var(--border);">
                  <strong>48-Hour PoC Deliverable</strong>
                  <p style="margin: 0; color: var(--navy-900); font-weight: 500;">${item.bridge_project}</p>
                </div>
                <div class="grid-item">
                  <strong>Resume Bridge (${bridge.project})</strong>
                  <p style="margin: 0; color: var(--navy-900);">${bridge.pitch}</p>
                </div>
              </div>
            </div>
          `;}).join("")}

          <h2>2. Recommended Resume Bullet Rewrites</h2>
          ${(insights?.weak_improvements || []).map(w => `
            <div class="card">
              <span class="badge-weak">~ ${w.skill}</span>
              <ul>
                ${w.recommended_bullets.map(b => `<li>${b}</li>`).join("")}
              </ul>
            </div>
          `).join("")}

          <h2>3. High-Probability Interview Questions</h2>
          ${(insights?.interview_questions || []).map((q, idx) => `
            <div class="card">
              <div style="font-weight: bold; font-size: 12px; margin-bottom: 4px;"><span class="badge-missing">✕ Q${idx + 1}</span> ${q.question}</div>
              <div style="font-size: 11px; color: var(--text-muted);"><strong>Strategy:</strong> ${q.suggested_talking_points}</div>
            </div>
          `).join("")}

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(reportHtml);
    printWindow.document.close();
  };

  const handleCopyMarkdown = () => {
    const md = buildMarkdownReport();
    if (!md) return;
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyBullet = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBulletKey(key);
    setTimeout(() => setCopiedBulletKey(null), 2000);
  };

  const handleCopyQuestion = (idx: number, q: InterviewQuestion) => {
    const text = `Question: ${q.question}\nTargeted Skill: ${q.targeted_skill}\nTalking Points: ${q.suggested_talking_points}`;
    navigator.clipboard.writeText(text);
    setCopiedQuestionKey(idx);
    setTimeout(() => setCopiedQuestionKey(null), 2000);
  };

  const handleCopyProject = (idx: number, projectText: string) => {
    navigator.clipboard.writeText(projectText);
    setCopiedProjectKey(idx);
    setTimeout(() => setCopiedProjectKey(null), 2000);
  };

  const toggleQuestionExpanded = (idx: number) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // Unified Review and Status numbers
  const activeReview = hitlReview || finalOutput;
  const missingCount = activeReview?.missing.length ?? 0;
  const weakCount = activeReview?.weak.length ?? 0;
  const strongCount = activeReview?.strong.length ?? 0;

  // Filtered skills for instantaneous searching/filtering without endless scrolling
  const filteredMissing = useMemo(() => {
    if (!activeReview) return [];
    if (!skillSearchQuery.trim()) return activeReview.missing;
    const q = skillSearchQuery.toLowerCase().trim();
    return activeReview.missing.filter((s) => s.toLowerCase().includes(q));
  }, [activeReview, skillSearchQuery]);

  const filteredWeak = useMemo(() => {
    if (!activeReview) return [];
    if (!skillSearchQuery.trim()) return activeReview.weak;
    const q = skillSearchQuery.toLowerCase().trim();
    return activeReview.weak.filter((s) => s.toLowerCase().includes(q));
  }, [activeReview, skillSearchQuery]);

  const filteredStrong = useMemo(() => {
    if (!activeReview) return [];
    if (!skillSearchQuery.trim()) return activeReview.strong;
    const q = skillSearchQuery.toLowerCase().trim();
    return activeReview.strong.filter((s) => s.toLowerCase().includes(q));
  }, [activeReview, skillSearchQuery]);

  return (
    <div
      style={{ backgroundColor: "var(--bg)", color: "var(--text-primary)" }}
      className="min-h-screen font-sans pb-20 relative selection:bg-[var(--teal-600)]/20 overflow-x-clip w-full max-w-full"
    >
      {/* Subtle Cool Ambient Radial Glows (Clipped to prevent horizontal overflow on mobile) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/4 w-[350px] sm:w-[550px] h-[250px] sm:h-[350px] bg-[var(--navy-700)]/5 rounded-full blur-[100px] sm:blur-[140px]" />
        <div className="absolute top-20 right-1/4 w-[300px] sm:w-[500px] h-[250px] sm:h-[350px] bg-[var(--navy-700)]/5 rounded-full blur-[100px] sm:blur-[140px]" />
      </div>

      {/* Top Header (Clean Light Surface, Navy Logo & Text, Sticky on Mobile and Desktop) */}
      <header
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        className="sticky top-0 z-30 border-b shadow-xs w-full max-w-full"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3 flex flex-row items-center justify-between gap-2 sm:gap-4 w-full min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Bold Navy Logo Box with White Icon */}
            <div
              style={{ backgroundColor: "var(--navy-900)", color: "var(--surface)" }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-xs font-black text-sm sm:text-lg select-none shrink-0"
            >
              Δ
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 style={{ color: "var(--navy-900)" }} className="text-sm sm:text-lg font-bold tracking-tight">
                  Delta
                </h1>
              </div>
              <p style={{ color: "var(--text-muted)" }} className="hidden md:block text-[10px] sm:text-[11px] font-medium truncate sm:line-clamp-1">
                Targeted skill diagnosis, 48-hr bridge roadmap & interview defense
              </p>
            </div>
          </div>

          {/* Top Actions: Light styling pills with subtle border in one single line */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">

            {/* Audit History Drawer Button */}
            <button
              onClick={() => setIsHistoryOpen(true)}
              style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--navy-900)" }}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 border hover:bg-[var(--navy-50)] rounded-xl text-[10px] sm:text-xs font-semibold shadow-xs transition cursor-pointer shrink-0"
              title="View past saved audits"
            >
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--teal-600)] shrink-0" />
              <span className="hidden xs:inline">History</span>
              {history.length > 0 && (
                <span className="bg-[var(--teal-600)] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center shrink-0">
                  {history.length}
                </span>
              )}
            </button>

            {(finalOutput || hitlReview) && (
              <button
                onClick={handleReset}
                style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3.5 sm:py-1.5 border hover:bg-[var(--navy-50)] rounded-xl text-[10px] sm:text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--text-muted)]" />
                <span className="hidden xs:inline">New Audit</span>
                <span className="xs:hidden">Reset</span>
              </button>
            )}

            {/* Clerk Authentication */}
            {isLoaded && (
              <>
                {!isSignedIn ? (
                  <SignInButton mode="modal">
                    <button
                      type="button"
                      style={{ backgroundColor: "var(--navy-900)", color: "var(--surface)" }}
                      className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold shadow-xs hover:opacity-90 transition cursor-pointer shrink-0"
                    >
                      <span>Sign In</span>
                    </button>
                  </SignInButton>
                ) : (
                  <div className="flex items-center pl-0.5 sm:pl-1 shrink-0">
                    <UserButton
                      appearance={{
                        elements: {
                          avatarBox: "w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-slate-200",
                        },
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile View Floating Horizontal Navigation Ribbon (inside sticky header, only on mobile < 1024px) */}
        <div
          style={{ borderColor: "var(--border)" }}
          className="lg:hidden border-t px-2 sm:px-4 py-1.5 bg-[var(--surface)]"
        >
          <div className="relative w-full min-w-0">
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-[var(--surface)] to-transparent z-10 opacity-70" />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[var(--surface)] to-transparent z-10 opacity-70" />

            <nav
              id="mobile-tab-nav"
              className="flex items-center gap-1.5 overflow-x-auto delta-scrollbar-h snap-x snap-mandatory py-0.5 w-full min-w-0"
            >
              <button
                id="mobile-nav-tab-sources"
                onClick={() => handleNavClick("sources")}
                style={{
                  backgroundColor: activeSection === "sources" ? "var(--navy-900)" : "transparent",
                  color: activeSection === "sources" ? "var(--surface)" : "var(--text-muted)",
                }}
                className="shrink-0 snap-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer font-medium hover:bg-[var(--navy-50)] hover:text-[var(--navy-900)] whitespace-nowrap text-xs"
              >
                <FileUp className="w-3.5 h-3.5 shrink-0" />
                <span>Source Materials</span>
              </button>

              <button
                id="mobile-nav-tab-review"
                onClick={() => (hitlReview || finalOutput) && handleNavClick("review")}
                disabled={!hitlReview && !finalOutput}
                style={{
                  backgroundColor: activeSection === "review" ? "var(--navy-900)" : "transparent",
                  color: activeSection === "review" ? "var(--surface)" : "var(--text-muted)",
                }}
                className={`shrink-0 snap-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer font-medium hover:bg-[var(--navy-50)] hover:text-[var(--navy-900)] whitespace-nowrap text-xs ${
                  !hitlReview && !finalOutput ? "opacity-40 cursor-not-allowed" : ""
                }`}
              >
                <TableProperties className="w-3.5 h-3.5 shrink-0" />
                <span>Skill Verification</span>
                {(hitlReview || finalOutput) && (
                  <span
                    style={{
                      backgroundColor: "var(--missing-bg)",
                      color: "var(--missing)",
                      borderColor: "var(--missing-border)",
                    }}
                    className="text-[9px] px-1.5 py-0.2 rounded font-semibold border"
                  >
                    ✕ {missingCount}
                  </span>
                )}
              </button>

              <button
                id="mobile-nav-tab-roadmap"
                onClick={() => finalOutput && handleNavClick("roadmap")}
                disabled={!finalOutput}
                style={{
                  backgroundColor: activeSection === "roadmap" ? "var(--navy-900)" : "transparent",
                  color: activeSection === "roadmap" ? "var(--surface)" : "var(--text-muted)",
                }}
                className={`shrink-0 snap-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer font-medium hover:bg-[var(--navy-50)] hover:text-[var(--navy-900)] whitespace-nowrap text-xs ${
                  !finalOutput ? "opacity-40 cursor-not-allowed" : ""
                }`}
              >
                <Target className="w-3.5 h-3.5 shrink-0" />
                <span>48-Hour Roadmap</span>
              </button>

              <button
                id="mobile-nav-tab-bullets"
                onClick={() => finalOutput && handleNavClick("bullets")}
                disabled={!finalOutput}
                style={{
                  backgroundColor: activeSection === "bullets" ? "var(--navy-900)" : "transparent",
                  color: activeSection === "bullets" ? "var(--surface)" : "var(--text-muted)",
                }}
                className={`shrink-0 snap-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer font-medium hover:bg-[var(--navy-50)] hover:text-[var(--navy-900)] whitespace-nowrap text-xs ${
                  !finalOutput ? "opacity-40 cursor-not-allowed" : ""
                }`}
              >
                <Wand2 className="w-3.5 h-3.5 shrink-0" />
                <span>Resume Bullets</span>
                {weakCount > 0 && (
                  <span
                    style={{
                      backgroundColor: "var(--weak-bg)",
                      color: "var(--weak)",
                      borderColor: "var(--weak-border)",
                    }}
                    className="text-[9px] px-1.5 py-0.2 rounded font-semibold border"
                  >
                    ~ {weakCount}
                  </span>
                )}
              </button>

              <button
                id="mobile-nav-tab-interview"
                onClick={() => finalOutput && handleNavClick("interview")}
                disabled={!finalOutput}
                style={{
                  backgroundColor: activeSection === "interview" ? "var(--navy-900)" : "transparent",
                  color: activeSection === "interview" ? "var(--surface)" : "var(--text-muted)",
                }}
                className={`shrink-0 snap-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer font-medium hover:bg-[var(--navy-50)] hover:text-[var(--navy-900)] whitespace-nowrap text-xs ${
                  !finalOutput ? "opacity-40 cursor-not-allowed" : ""
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span>Interview Defense</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mb-4 sm:mb-6">
          <div
            style={{ backgroundColor: "var(--surface)", borderColor: "rgba(220, 38, 38, 0.3)" }}
            className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-xs sm:text-sm flex items-start gap-2.5 sm:gap-3 shadow-xs"
          >
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--missing)] shrink-0 mt-0.5" />
            <div className="flex-grow min-w-0">
              <p style={{ color: "var(--missing)" }} className="font-semibold text-xs sm:text-sm">System Notice</p>
              <p style={{ color: "var(--text-primary)" }} className="mt-0.5 opacity-80 break-words text-xs">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              style={{ color: "var(--text-muted)" }}
              className="hover:text-[var(--navy-900)] text-xs font-bold cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SIDE-BY-SIDE LAYOUT: Left Sidebar Navigation + Right Content Workspace     */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-4 sm:gap-6 items-start w-full min-w-0 max-w-full">
        {/* ========================================================================= */}
        {/* MOBILE VIEW (< 1024px): Top Target Role Card + Floating Sticky Ribbon     */}
        {/* ========================================================================= */}
        <div className="lg:hidden w-full flex flex-col gap-2 min-w-0">
          {/* Target Role Card */}
          <div
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
            className="w-full border rounded-[12px] p-3 sm:p-4 shadow-2xs min-w-0"
          >
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="min-w-0 flex-1">
                <span
                  style={{ backgroundColor: "var(--role-bg)", color: "var(--role-text)", borderColor: "var(--role-border)" }}
                  className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border inline-block"
                >
                  Target Role
                </span>
                <h3 style={{ color: "var(--navy-900)" }} className="text-xs sm:text-sm font-bold mt-1 leading-snug truncate max-w-full">
                  {detectedRole}
                </h3>
              </div>
              <p style={{ color: "var(--text-muted)" }} className="text-[10px] sm:text-[11px] font-medium truncate mt-0.5 shrink-0">
                Candidate: {detectedCandidateName}
              </p>
            </div>
            {effectiveCompanyName && (
              <div style={{ color: "var(--navy-700)" }} className="flex items-center gap-1.5 text-[11px] font-bold mt-1.5 truncate min-w-0">
                <Building2 className="w-3.5 h-3.5 text-[var(--navy-700)] shrink-0" />
                <span className="truncate min-w-0 flex-1">{effectiveCompanyName}</span>
                {sourcePlatform && (
                  <span
                    style={{ backgroundColor: "var(--navy-50)", color: "var(--navy-900)", borderColor: "var(--border)" }}
                    className="text-[9px] px-1.5 py-0.2 rounded font-semibold border shrink-0"
                  >
                    {sourcePlatform}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DESKTOP VIEW (>= 1024px): Floating Sticky Left Sidebar                    */}
        {/* ========================================================================= */}
        <aside
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          className="hidden lg:block w-60 shrink-0 border rounded-[12px] shadow-[0_1px_3px_rgba(15,31,61,0.08)] hover:shadow-[0_4px_12px_rgba(15,31,61,0.12)] transition-shadow overflow-hidden sticky top-20 self-start z-20"
        >
          {/* Target Profile Card */}
          <div style={{ borderColor: "var(--border)" }} className="p-4 border-b w-full min-w-0">
            <div>
              <span
                style={{ backgroundColor: "var(--role-bg)", color: "var(--role-text)", borderColor: "var(--role-border)" }}
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border inline-block"
              >
                Target Role
              </span>
              <h3 style={{ color: "var(--navy-900)" }} className="text-sm font-bold mt-1 leading-snug truncate max-w-full">
                {detectedRole}
              </h3>
            </div>
            {effectiveCompanyName && (
              <div style={{ color: "var(--navy-700)" }} className="flex items-center gap-1.5 text-[11px] font-bold mt-1.5 truncate min-w-0">
                <Building2 className="w-3.5 h-3.5 text-[var(--navy-700)] shrink-0" />
                <span className="truncate min-w-0 flex-1">{effectiveCompanyName}</span>
                {sourcePlatform && (
                  <span
                    style={{ backgroundColor: "var(--navy-50)", color: "var(--navy-900)", borderColor: "var(--border)" }}
                    className="text-[9px] px-1.5 py-0.2 rounded font-semibold border shrink-0"
                  >
                    {sourcePlatform}
                  </span>
                )}
              </div>
            )}
            <p style={{ color: "var(--text-muted)" }} className="text-[11px] font-medium truncate mt-1">
              Candidate: {detectedCandidateName}
            </p>
          </div>

          {/* Desktop Navigation Items */}
          <nav className="p-2 flex flex-col gap-1.5 text-xs w-full min-w-0">
            <button
              id="nav-tab-sources"
              onClick={() => handleNavClick("sources")}
              style={{
                backgroundColor: activeSection === "sources" ? "var(--navy-900)" : "transparent",
                color: activeSection === "sources" ? "var(--surface)" : "var(--text-muted)",
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg transition cursor-pointer font-medium hover:bg-[var(--navy-50)] hover:text-[var(--navy-900)] text-xs"
            >
              <div className="flex items-center gap-2">
                <FileUp className="w-4 h-4 shrink-0" />
                <span className="text-xs">Source Materials</span>
              </div>
              <span
                style={{
                  backgroundColor: activeSection === "sources" ? "rgba(255,255,255,0.15)" : "var(--navy-50)",
                  color: activeSection === "sources" ? "var(--surface)" : "var(--navy-900)",
                  borderColor: activeSection === "sources" ? "rgba(255,255,255,0.25)" : "var(--border)",
                }}
                className="text-[10px] px-1.5 py-0.5 rounded font-semibold border"
              >
                Inputs
              </span>
            </button>

            <button
              id="nav-tab-review"
              onClick={() => (hitlReview || finalOutput) && handleNavClick("review")}
              disabled={!hitlReview && !finalOutput}
              style={{
                backgroundColor: activeSection === "review" ? "var(--navy-900)" : "transparent",
                color: activeSection === "review" ? "var(--surface)" : "var(--text-muted)",
              }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg transition cursor-pointer font-medium hover:bg-[var(--navy-50)] hover:text-[var(--navy-900)] text-xs ${
                !hitlReview && !finalOutput ? "opacity-40 cursor-not-allowed" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <TableProperties className="w-4 h-4 shrink-0" />
                <span className="text-xs">Skill Verification</span>
              </div>
              {(hitlReview || finalOutput) && (
                <span
                  style={{
                    backgroundColor: "var(--missing-bg)",
                    color: "var(--missing)",
                    borderColor: "var(--missing-border)",
                  }}
                  className="text-[10px] px-1.5 py-0.5 rounded font-semibold border"
                >
                  ✕ {missingCount}
                </span>
              )}
            </button>

            <button
              id="nav-tab-roadmap"
              onClick={() => finalOutput && handleNavClick("roadmap")}
              disabled={!finalOutput}
              style={{
                backgroundColor: activeSection === "roadmap" ? "var(--navy-900)" : "transparent",
                color: activeSection === "roadmap" ? "var(--surface)" : "var(--text-muted)",
              }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg transition cursor-pointer font-medium hover:bg-[var(--navy-50)] hover:text-[var(--navy-900)] text-xs ${
                !finalOutput ? "opacity-40 cursor-not-allowed" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 shrink-0" />
                <span className="text-xs">48-Hour Roadmap</span>
              </div>
              {insights?.missing_roadmap && (
                <span
                  style={{
                    backgroundColor: activeSection === "roadmap" ? "rgba(255,255,255,0.15)" : "var(--navy-50)",
                    color: activeSection === "roadmap" ? "var(--surface)" : "var(--navy-900)",
                    borderColor: activeSection === "roadmap" ? "rgba(255,255,255,0.25)" : "var(--border)",
                  }}
                  className="text-[10px] px-1.5 py-0.5 rounded font-semibold border"
                >
                  {insights.missing_roadmap.length} PoCs
                </span>
              )}
            </button>

            <button
              id="nav-tab-bullets"
              onClick={() => finalOutput && handleNavClick("bullets")}
              disabled={!finalOutput}
              style={{
                backgroundColor: activeSection === "bullets" ? "var(--navy-900)" : "transparent",
                color: activeSection === "bullets" ? "var(--surface)" : "var(--text-muted)",
              }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg transition cursor-pointer font-medium hover:bg-[var(--navy-50)] hover:text-[var(--navy-900)] text-xs ${
                !finalOutput ? "opacity-40 cursor-not-allowed" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 shrink-0" />
                <span className="text-xs">Resume Bullets</span>
              </div>
              {weakCount > 0 && (
                <span
                  style={{
                    backgroundColor: "var(--weak-bg)",
                    color: "var(--weak)",
                    borderColor: "var(--weak-border)",
                  }}
                  className="text-[10px] px-1.5 py-0.5 rounded font-semibold border"
                >
                  ~ {weakCount}
                </span>
              )}
            </button>

            <button
              id="nav-tab-interview"
              onClick={() => finalOutput && handleNavClick("interview")}
              disabled={!finalOutput}
              style={{
                backgroundColor: activeSection === "interview" ? "var(--navy-900)" : "transparent",
                color: activeSection === "interview" ? "var(--surface)" : "var(--text-muted)",
              }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg transition cursor-pointer font-medium hover:bg-[var(--navy-50)] hover:text-[var(--navy-900)] text-xs ${
                !finalOutput ? "opacity-40 cursor-not-allowed" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span className="text-xs">Interview Defense</span>
              </div>
              {insights?.interview_questions && (
                <span
                  style={{
                    backgroundColor: activeSection === "interview" ? "rgba(255,255,255,0.15)" : "var(--navy-50)",
                    color: activeSection === "interview" ? "var(--surface)" : "var(--navy-900)",
                    borderColor: activeSection === "interview" ? "rgba(255,255,255,0.25)" : "var(--border)",
                  }}
                  className="text-[10px] px-1.5 py-0.5 rounded font-semibold border"
                >
                  {insights.interview_questions.length} Qs
                </span>
              )}
            </button>
          </nav>
        </aside>

        {/* RIGHT MAIN WORKSPACE CANVAS */}
        <main className="flex-1 min-w-0 max-w-full w-full space-y-10">
          {/* ========================================================================= */}
          {/* SECTION 1: SOURCE MATERIALS (#section-sources)                           */}
          {/* ========================================================================= */}
          <section id="section-sources" className="scroll-mt-28 lg:scroll-mt-24 space-y-4 w-full min-w-0 max-w-full">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <div
                  style={{ backgroundColor: "var(--navy-50)", color: "var(--navy-900)" }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                >
                  <FileUp className="w-4 h-4 text-[var(--navy-700)]" />
                </div>
                <div>
                  <h2 style={{ color: "var(--navy-900)" }} className="text-sm sm:text-base font-bold">
                    Source Materials & Role Specification
                  </h2>
                  <p style={{ color: "var(--text-muted)" }} className="text-xs">
                    Target job description, live URL context & candidate resume inputs
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!jobDescription && !resumeText ? (
                  <button
                    type="button"
                    onClick={handleLoadDemo}
                    style={{ backgroundColor: "var(--navy-900)", color: "var(--surface)" }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold shadow-xs hover:opacity-90 transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-300 animate-pulse" />
                    <span>Load Sample Demo</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleClearInputs}
                    style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-muted)" }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium border hover:bg-[var(--navy-50)] hover:text-[var(--navy-900)] transition cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear Slate</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:gap-6 w-full min-w-0 max-w-full">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch w-full min-w-0">
                {/* Job Description Panel (Symmetric Equal Grid Box) */}
                <div
                  style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                  className="w-full min-w-0 flex flex-col h-[540px] sm:h-[600px] rounded-[12px] border shadow-[0_1px_3px_rgba(15,31,61,0.08)] hover:shadow-[0_4px_12px_rgba(15,31,61,0.12)] transition-shadow overflow-hidden"
                >
                  {/* Fixed Header Row 1: Title & Stats */}
                  <div style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }} className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 border-b gap-2 min-w-0 shrink-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Briefcase className="w-4 h-4 text-[var(--navy-700)] shrink-0" />
                      <span style={{ color: "var(--navy-900)" }} className="text-xs font-bold uppercase tracking-wider truncate">
                        Target Job Description
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {companyName && (
                        <span
                          style={{ backgroundColor: "var(--navy-50)", color: "var(--navy-900)", borderColor: "var(--border)" }}
                          className="text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md border truncate max-w-[80px] sm:max-w-none"
                        >
                          🏢 {companyName}
                        </span>
                      )}
                      <span style={{ color: "var(--text-muted)" }} className="text-[11px] font-mono shrink-0">
                        {jobDescription.split(/\s+/).filter(Boolean).length} words
                      </span>
                      {jobDescription && (
                        <button
                          type="button"
                          onClick={() => {
                            setJobDescription("");
                            setCompanyName(null);
                            setCompanyContext(null);
                            setJobUrl("");
                            setUrlFetchSuccessMsg(null);
                          }}
                          title="Clear job description and context"
                          style={{ color: "var(--text-muted)" }}
                          className="p-1 rounded hover:bg-[var(--navy-50)] hover:text-[var(--navy-900)] transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Fixed Header Row 2: URL Ingestion Input Bar (LinkedIn, Greenhouse, Lever, Company URL) */}
                  <div style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }} className="p-2.5 sm:p-3 border-b flex flex-col gap-2 w-full min-w-0 shrink-0">
                    <div className="flex flex-row items-center gap-2 w-full min-w-0">
                      <div className="relative flex-1 min-w-0">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                          <Globe className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        </div>
                        <input
                          type="url"
                          value={jobUrl}
                          onChange={(e) => setJobUrl(e.target.value)}
                          placeholder="Paste LinkedIn, Greenhouse, Lever, or Company URL..."
                          style={{ backgroundColor: "var(--bg)", color: "var(--text-primary)", borderColor: "var(--border)" }}
                          className="w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-[var(--teal-600)]/40 focus:border-[var(--teal-600)] placeholder:text-[var(--text-muted)]/70 font-sans min-w-0"
                        />
                      </div>
                      {/* Solid Teal Fetch & Contextualize Action Button */}
                      <button
                        type="button"
                        disabled={fetchingUrl || !jobUrl.trim()}
                        onClick={() => handleFetchJobUrl()}
                        style={{ backgroundColor: "var(--teal-600)", color: "var(--surface)" }}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-2xs transition hover:bg-[var(--teal-700)] cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap"
                      >
                        {fetchingUrl ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Fetching...</span>
                          </>
                        ) : (
                          <>
                            <Link2 className="w-3.5 h-3.5" />
                            <span>Fetch & Contextualize</span>
                          </>
                        )}
                      </button>
                    </div>

                    {urlFetchSuccessMsg && !companyName && (
                      <div className="text-[11px] text-[var(--strong)] flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-[var(--strong)]" />
                        <span>{urlFetchSuccessMsg}</span>
                      </div>
                    )}
                  </div>

                  {/* Content Area: Internally Scrollable Container for Company Context + Job Description Text */}
                  <div className="flex-1 min-h-0 w-full overflow-y-auto delta-scrollbar relative flex flex-col bg-[var(--bg)]">
                    {/* Active Connected Company Context Banner (Anchored at top of scrollable content) */}
                    {companyName && (
                      <div className="p-2.5 sm:p-3 border-b shrink-0 bg-[var(--surface)]">
                        <div
                          style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
                          className="p-2.5 sm:p-3 rounded-xl border text-xs shadow-2xs"
                        >
                          <div style={{ borderColor: "var(--border)" }} className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b">
                            <div style={{ color: "var(--navy-900)" }} className="flex items-center gap-1.5 font-bold">
                              <Building2 className="w-3.5 h-3.5 text-[var(--navy-700)] shrink-0" />
                              <span className="truncate">Company Context: {companyName}</span>
                              {sourcePlatform && (
                                <span
                                  style={{ backgroundColor: "var(--surface)", color: "var(--navy-900)", borderColor: "var(--border)" }}
                                  className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded font-semibold border shrink-0"
                                >
                                  {sourcePlatform}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setCompanyName(null);
                                setCompanyContext(null);
                                setJobUrl("");
                                setJobDescription("");
                                setUrlFetchSuccessMsg(null);
                              }}
                              style={{ color: "var(--text-muted)" }}
                              className="text-[10px] font-semibold hover:text-[var(--navy-900)] hover:underline cursor-pointer shrink-0"
                            >
                              Clear
                            </button>
                          </div>

                          {companyContext && (
                            <div className="space-y-1.5 mb-2">
                              {companyContext
                                .split("\n")
                                .map((line) => line.replace(/^[-*•\s]+/, "").trim())
                                .filter(Boolean)
                                .map((bullet, bidx) => (
                                  <div key={bidx} style={{ color: "var(--text-primary)" }} className="flex items-start gap-2 text-[11px] leading-snug">
                                    <span style={{ backgroundColor: "var(--navy-900)" }} className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"></span>
                                    <span>{bullet}</span>
                                  </div>
                                ))}
                            </div>
                          )}

                          <div style={{ borderColor: "var(--border)", color: "var(--text-muted)" }} className="pt-1.5 border-t text-[10px] font-semibold flex items-center justify-between">
                            <span className="flex items-center gap-1 text-[var(--strong)]">
                              <Check className="w-3.5 h-3.5 text-[var(--strong)]" />
                              <span>Context Anchored</span>
                            </span>
                            <span style={{ color: "var(--text-muted)" }} className="font-normal hidden sm:inline">
                              Grounds "Why Company Wants" on next phase
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste target job requirements and duties here, or fetch directly from a URL above..."
                      style={{ backgroundColor: "transparent", color: "var(--text-primary)" }}
                      className="flex-1 min-h-[220px] w-full p-3 sm:p-4 text-xs sm:text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--teal-600)]/40 focus:border-[var(--teal-600)] resize-none placeholder:text-[var(--text-muted)]/70 border-0"
                    />

                    {/* Subtle bottom scroll indicator fade */}
                    <div className="pointer-events-none sticky bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[var(--bg)] to-transparent shrink-0" />
                  </div>
                </div>

                {/* Candidate Resume Panel: Identical Fixed Height & Internal Scroll */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={onDropFile}
                  style={{ backgroundColor: "var(--surface)", borderColor: isDragOver ? "var(--navy-900)" : "var(--border)" }}
                  className="w-full min-w-0 flex flex-col h-[540px] sm:h-[600px] rounded-[12px] border transition-all shadow-[0_1px_3px_rgba(15,31,61,0.08)] hover:shadow-[0_4px_12px_rgba(15,31,61,0.12)] overflow-hidden"
                >
                  {/* Clean, Streamlined Header (Fixed, Does Not Scroll) */}
                  <div style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }} className="flex items-center justify-between px-3.5 sm:px-4 py-2 sm:py-2.5 border-b gap-2 flex-wrap sm:flex-nowrap min-w-0 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-[var(--navy-700)] shrink-0" />
                      <span style={{ color: "var(--navy-900)" }} className="text-xs font-bold uppercase tracking-wider truncate">
                        Candidate Resume
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.txt,.md"
                        onChange={onFileInputChange}
                        className="hidden"
                      />

                      {!pdfUrl ? (
                        /* Single Primary Upload Button when empty */
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingFile}
                          style={{ backgroundColor: "var(--teal-600)", color: "var(--surface)" }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition hover:bg-[var(--teal-700)] cursor-pointer disabled:opacity-50"
                        >
                          {uploadingFile ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Parsing...</span>
                            </>
                          ) : (
                            <>
                              <FileUp className="w-3.5 h-3.5" />
                              <span>Upload PDF</span>
                            </>
                          )}
                        </button>
                      ) : (
                        /* Compact, Minimal Controls when Resume is loaded */
                        <>
                          {/* Segmented View Mode Toggle */}
                          <div
                            style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
                            className="flex items-center p-0.5 rounded-lg border text-[11px]"
                          >
                            <button
                              type="button"
                              onClick={() => setPdfViewMode("preview")}
                              style={{
                                backgroundColor: pdfViewMode === "preview" ? "var(--teal-600)" : "transparent",
                                color: pdfViewMode === "preview" ? "var(--surface)" : "var(--text-muted)",
                              }}
                              className="px-2 py-0.5 rounded-md font-semibold transition cursor-pointer"
                            >
                              PDF
                            </button>
                            <button
                              type="button"
                              onClick={() => setPdfViewMode("text")}
                              style={{
                                backgroundColor: pdfViewMode === "text" ? "var(--teal-600)" : "transparent",
                                color: pdfViewMode === "text" ? "var(--surface)" : "var(--text-muted)",
                              }}
                              className="px-2 py-0.5 rounded-md font-semibold transition cursor-pointer"
                            >
                              Text
                            </button>
                          </div>

                          {/* Quick Icon Actions */}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingFile}
                            title="Replace / Upload new PDF"
                            style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}
                            className="p-1.5 rounded-lg border hover:bg-[var(--navy-50)] hover:text-[var(--navy-900)] transition cursor-pointer disabled:opacity-50"
                          >
                            {uploadingFile ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--navy-700)]" />
                            ) : (
                              <FileUp className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open original PDF in new tab"
                            style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}
                            className="p-1.5 rounded-lg border hover:bg-[var(--navy-50)] hover:text-[var(--navy-900)] transition cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          <button
                            onClick={() => {
                              setResumeText("");
                              setUploadedFileName(null);
                              setPdfUrl(null);
                            }}
                            title="Clear resume"
                            style={{ color: "var(--text-muted)" }}
                            className="p-1.5 rounded-lg hover:bg-[var(--missing-bg)] hover:text-[var(--missing)] transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Content Area: Internally Scrollable PDF Canvas or Textarea */}
                  <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden relative bg-[var(--surface)]">
                    {pdfUrl && pdfViewMode === "preview" ? (
                      <div className="flex-1 min-h-0 w-full h-full flex flex-col relative overflow-hidden bg-[var(--surface)]">
                        <ResumePdfViewer pdfUrl={pdfUrl} />
                      </div>
                    ) : (
                      <textarea
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                        placeholder="Paste candidate experience or drop a PDF resume file directly here..."
                        style={{ backgroundColor: "var(--bg)", color: "var(--text-primary)" }}
                        className="flex-1 min-h-0 w-full h-full p-3 sm:p-4 text-xs sm:text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--teal-600)]/40 focus:border-[var(--teal-600)] resize-none placeholder:text-[var(--text-muted)]/70 overflow-y-auto delta-scrollbar border-0"
                      />
                    )}

                    {/* Subtle bottom scroll indicator fade */}
                    <div className="pointer-events-none sticky bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[var(--surface)] to-transparent shrink-0" />
                  </div>

                  {/* Clean Fixed Footer with Document Status */}
                  <div style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-muted)" }} className="px-3.5 sm:px-4 py-2 border-t text-[11px] flex items-center justify-between gap-2 shrink-0">
                    {uploadedFileName ? (
                      <>
                        <span className="flex items-center gap-1.5 font-medium truncate max-w-[180px] sm:max-w-[240px]">
                          <FileCheck className="w-3.5 h-3.5 text-[var(--strong)] shrink-0" />
                          <span className="font-mono truncate text-[var(--navy-900)]">{uploadedFileName}</span>
                        </span>
                        <span className="font-mono text-[10px] text-[var(--text-muted)] shrink-0">
                          {resumeText.split(/\s+/).filter(Boolean).length} words
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="truncate">💡 Tip: Drop any PDF resume file directly onto this card</span>
                        <span className="font-mono shrink-0">PDF, TXT, DOCX</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Sources Bottom Action Bar (Anchors bottom cleanly, no dead space) */}
              <div
                style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                className="p-3.5 sm:p-4 rounded-[12px] border shadow-[0_1px_3px_rgba(15,31,61,0.08)] hover:shadow-[0_4px_12px_rgba(15,31,61,0.12)] transition-shadow flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 w-full min-w-0 max-w-full"
              >
                <div style={{ color: "var(--text-muted)" }} className="flex items-center gap-2 text-xs min-w-0 flex-1">
                  <span style={{ backgroundColor: "var(--strong)" }} className="w-2 h-2 rounded-full shadow-[0_0_6px_rgba(22,163,74,0.6)] shrink-0"></span>
                  <span className="truncate min-w-0">
                    Ready for audit: <strong className="text-[var(--navy-900)]">{jobDescription.split(/\s+/).filter(Boolean).length}w JD</strong>
                    {companyName ? ` (${companyName})` : ""} &bull;{" "}
                    <strong className="text-[var(--navy-900)]">{uploadedFileName ? uploadedFileName : `${resumeText.split(/\s+/).filter(Boolean).length}w Resume`}</strong>
                  </span>
                </div>

                {/* Prominent Solid Teal CTA Button */}
                <button
                  onClick={handleStartAnalysis}
                  disabled={loading}
                  style={{ backgroundColor: "var(--teal-600)", color: "var(--surface)" }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm tracking-wide shadow-md transition-all hover:bg-[var(--teal-700)] cursor-pointer disabled:opacity-50 active:scale-[0.99] shrink-0"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[var(--surface)]" />
                      <span>Auditing Skills with LLM...</span>
                    </>
                  ) : (
                    <>
                      <span>Run Gap Analysis Audit</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* SECTION 2: SKILL RECLASSIFICATION (MIDDLE PAGE / HITL REVIEW) */}
          {activeReview && (
            <section
              id="section-review"
              style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
              className="scroll-mt-28 lg:scroll-mt-24 border rounded-[12px] p-4 sm:p-6 lg:p-8 shadow-[0_1px_3px_rgba(15,31,61,0.08)] relative overflow-hidden transition-all w-full min-w-0 max-w-full"
            >
              {/* Panel Title & Status */}
              <div style={{ borderColor: "var(--border)" }} className="flex items-center justify-between flex-wrap gap-4 pb-4 sm:pb-5 mb-4 sm:mb-5 border-b">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    style={{ backgroundColor: "var(--navy-50)", borderColor: "var(--border)", color: "var(--navy-900)" }}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shadow-xs shrink-0"
                  >
                    <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--navy-700)]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 style={{ color: "var(--navy-900)" }} className="text-sm sm:text-base lg:text-lg font-bold tracking-tight">
                        Skill Reclassification & Verification
                      </h2>
                      <span
                        style={{ backgroundColor: "var(--navy-50)", color: "var(--navy-900)", borderColor: "var(--border)" }}
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                      >
                        Human-in-the-Loop
                      </span>
                    </div>
                    <p style={{ color: "var(--text-muted)" }} className="text-xs mt-0.5 truncate sm:whitespace-normal">
                      Quickly verify or reclassify skills. Tap any pill to promote or demote.
                    </p>
                  </div>
                </div>
              </div>

              {/* Fast Controls Bar: Search Filter + Mobile Category Tabs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
                {/* Search / Filter Input */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={skillSearchQuery}
                    onChange={(e) => setSkillSearchQuery(e.target.value)}
                    placeholder={`Filter ${missingCount + weakCount + strongCount} skills...`}
                    style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    className="w-full pl-9 pr-7 py-1.5 rounded-xl border text-xs focus:outline-none focus:border-[var(--teal-600)] focus:ring-1 focus:ring-[var(--teal-600)] placeholder:text-[var(--text-muted)]/70"
                  />
                  {skillSearchQuery && (
                    <button
                      onClick={() => setSkillSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--navy-900)] text-xs cursor-pointer p-0.5"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Mobile / Tablet Segmented Category Tabs (Hides the other 2 columns on small screens to cut vertical scroll by 70%) */}
                <div className="flex lg:hidden items-center p-1 rounded-xl bg-[var(--bg)] border border-[var(--border)] gap-1">
                  <button
                    onClick={() => setSkillCategoryTab("missing")}
                    style={{
                      backgroundColor: skillCategoryTab === "missing" ? "var(--surface)" : "transparent",
                      color: skillCategoryTab === "missing" ? "var(--missing)" : "var(--text-muted)",
                      boxShadow: skillCategoryTab === "missing" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    }}
                    className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>✕ Missing</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-[var(--missing-bg)] text-[var(--missing)] border border-[var(--missing-border)]">
                      {filteredMissing.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setSkillCategoryTab("weak")}
                    style={{
                      backgroundColor: skillCategoryTab === "weak" ? "var(--surface)" : "transparent",
                      color: skillCategoryTab === "weak" ? "var(--weak)" : "var(--text-muted)",
                      boxShadow: skillCategoryTab === "weak" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    }}
                    className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>~ Proof</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-[var(--weak-bg)] text-[var(--weak)] border border-[var(--weak-border)]">
                      {filteredWeak.length}
                    </span>
                  </button>
                  <button
                    onClick={() => setSkillCategoryTab("strong")}
                    style={{
                      backgroundColor: skillCategoryTab === "strong" ? "var(--surface)" : "transparent",
                      color: skillCategoryTab === "strong" ? "var(--strong)" : "var(--text-muted)",
                      boxShadow: skillCategoryTab === "strong" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    }}
                    className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>✓ Strong</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-[var(--strong-bg)] text-[var(--strong)] border border-[var(--strong-border)]">
                      {filteredStrong.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* 3 Refined Columns for Moving Skills (Side-by-side on desktop, 1-at-a-time on mobile via tabs) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mb-5">
                {/* Column 1: Missing Skills (✕ Missing) */}
                <div
                  style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
                  className={`p-3.5 sm:p-4 rounded-[12px] border flex-col justify-between shadow-2xs ${
                    skillCategoryTab !== "missing" ? "hidden lg:flex" : "flex"
                  }`}
                >
                  <div>
                    <div style={{ borderColor: "var(--border)" }} className="flex items-center justify-between pb-2 mb-2 border-b">
                      <div className="flex items-center gap-2 text-[var(--missing)] text-xs font-bold uppercase tracking-wider">
                        <span className="font-black text-sm">✕</span>
                        <span>Missing Gaps</span>
                      </div>
                      <span
                        style={{ backgroundColor: "var(--missing-bg)", color: "var(--missing)", borderColor: "var(--missing-border)" }}
                        className="px-2 py-0.5 rounded-full text-xs font-bold border font-mono"
                      >
                        {filteredMissing.length !== activeReview.missing.length
                          ? `${filteredMissing.length}/${activeReview.missing.length}`
                          : activeReview.missing.length}
                      </span>
                    </div>
                    <p style={{ color: "var(--text-muted)" }} className="text-[11px] mb-2.5">
                      Zero evidence in submitted resume. Requires 48-hr proof project.
                    </p>

                    {/* Scrollable list with fixed max height so the page never stretches infinitely */}
                    <div className="flex flex-col gap-1.5 max-h-[340px] sm:max-h-[380px] overflow-y-auto delta-scrollbar pr-1">
                      {filteredMissing.length > 0 ? (
                        filteredMissing.map((s, i) => (
                          <div
                            key={i}
                            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                            className="px-2.5 py-1.5 sm:px-3 sm:py-2 border rounded-lg shadow-2xs flex items-center justify-between gap-2 group hover:border-[var(--navy-900)] transition"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span style={{ backgroundColor: "var(--missing)" }} className="w-1.5 h-1.5 rounded-full shrink-0" />
                              <span style={{ color: "var(--navy-900)" }} className="text-xs sm:text-[13px] font-semibold font-mono truncate" title={s}>
                                {s}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleMoveSkill(s, "missing", "weak")}
                                title="Promote to Weak / Needs Proof"
                                style={{ backgroundColor: "var(--weak-bg)", color: "var(--weak)", borderColor: "var(--weak-border)" }}
                                className="h-6 sm:h-6.5 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold border transition cursor-pointer flex items-center gap-0.5 hover:bg-[var(--weak)] hover:text-white active:scale-95 shadow-2xs"
                              >
                                <span>~ Weak</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleMoveSkill(s, "missing", "strong")}
                                title="Promote to Verified Strong"
                                style={{ backgroundColor: "var(--strong-bg)", color: "var(--strong)", borderColor: "var(--strong-border)" }}
                                className="h-6 sm:h-6.5 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold border transition cursor-pointer flex items-center gap-0.5 hover:bg-[var(--strong)] hover:text-white active:scale-95 shadow-2xs"
                              >
                                <span>✓ Strong</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div
                          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-muted)" }}
                          className="p-4 rounded-lg border border-dashed text-center text-xs italic"
                        >
                          {skillSearchQuery ? "No missing skills match filter" : "No missing gaps detected"}
                        </div>
                      )}
                    </div>
                    {filteredMissing.length > 5 && (
                      <p style={{ color: "var(--text-muted)" }} className="text-[10px] font-mono text-center pt-1.5 opacity-70">
                        Scroll inside box to see all {filteredMissing.length} skills
                      </p>
                    )}
                  </div>
                </div>

                {/* Column 2: Weak / Needs Proof (~ Weak) */}
                <div
                  style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
                  className={`p-3.5 sm:p-4 rounded-[12px] border flex-col justify-between shadow-2xs ${
                    skillCategoryTab !== "weak" ? "hidden lg:flex" : "flex"
                  }`}
                >
                  <div>
                    <div style={{ borderColor: "var(--border)" }} className="flex items-center justify-between pb-2 mb-2 border-b">
                      <div className="flex items-center gap-2 text-[var(--weak)] text-xs font-bold uppercase tracking-wider">
                        <span className="font-black text-sm">~</span>
                        <span>Needs Proof</span>
                      </div>
                      <span
                        style={{ backgroundColor: "var(--weak-bg)", color: "var(--weak)", borderColor: "var(--weak-border)" }}
                        className="px-2 py-0.5 rounded-full text-xs font-bold border font-mono"
                      >
                        {filteredWeak.length !== activeReview.weak.length
                          ? `${filteredWeak.length}/${activeReview.weak.length}`
                          : activeReview.weak.length}
                      </span>
                    </div>
                    <p style={{ color: "var(--text-muted)" }} className="text-[11px] mb-2.5">
                      Mentioned superficially; needs quantified XYZ bullet rewrites.
                    </p>

                    <div className="flex flex-col gap-1.5 max-h-[340px] sm:max-h-[380px] overflow-y-auto delta-scrollbar pr-1">
                      {filteredWeak.length > 0 ? (
                        filteredWeak.map((s, i) => (
                          <div
                            key={i}
                            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                            className="px-2.5 py-1.5 sm:px-3 sm:py-2 border rounded-lg shadow-2xs flex items-center justify-between gap-2 group hover:border-[var(--navy-900)] transition"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span style={{ backgroundColor: "var(--weak)" }} className="w-1.5 h-1.5 rounded-full shrink-0" />
                              <span style={{ color: "var(--navy-900)" }} className="text-xs sm:text-[13px] font-semibold font-mono truncate" title={s}>
                                {s}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleMoveSkill(s, "weak", "missing")}
                                title="Demote to Missing Gap"
                                style={{ backgroundColor: "var(--missing-bg)", color: "var(--missing)", borderColor: "var(--missing-border)" }}
                                className="h-6 sm:h-6.5 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold border transition cursor-pointer flex items-center gap-0.5 hover:bg-[var(--missing)] hover:text-white active:scale-95 shadow-2xs"
                              >
                                <span>✕ Gap</span>
                                <ArrowDownRight className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleMoveSkill(s, "weak", "strong")}
                                title="Promote to Verified Strong"
                                style={{ backgroundColor: "var(--strong-bg)", color: "var(--strong)", borderColor: "var(--strong-border)" }}
                                className="h-6 sm:h-6.5 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold border transition cursor-pointer flex items-center gap-0.5 hover:bg-[var(--strong)] hover:text-white active:scale-95 shadow-2xs"
                              >
                                <span>✓ Strong</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div
                          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-muted)" }}
                          className="p-4 rounded-lg border border-dashed text-center text-xs italic"
                        >
                          {skillSearchQuery ? "No weak skills match filter" : "No weak skills detected"}
                        </div>
                      )}
                    </div>
                    {filteredWeak.length > 5 && (
                      <p style={{ color: "var(--text-muted)" }} className="text-[10px] font-mono text-center pt-1.5 opacity-70">
                        Scroll inside box to see all {filteredWeak.length} skills
                      </p>
                    )}
                  </div>
                </div>

                {/* Column 3: Verified Strong (✓ Strong) */}
                <div
                  style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
                  className={`p-3.5 sm:p-4 rounded-[12px] border flex-col justify-between shadow-2xs ${
                    skillCategoryTab !== "strong" ? "hidden lg:flex" : "flex"
                  }`}
                >
                  <div>
                    <div style={{ borderColor: "var(--border)" }} className="flex items-center justify-between pb-2 mb-2 border-b">
                      <div className="flex items-center gap-2 text-[var(--strong)] text-xs font-bold uppercase tracking-wider">
                        <span className="font-black text-sm">✓</span>
                        <span>Verified Strong</span>
                      </div>
                      <span
                        style={{ backgroundColor: "var(--strong-bg)", color: "var(--strong)", borderColor: "var(--strong-border)" }}
                        className="px-2 py-0.5 rounded-full text-xs font-bold border font-mono"
                      >
                        {filteredStrong.length !== activeReview.strong.length
                          ? `${filteredStrong.length}/${activeReview.strong.length}`
                          : activeReview.strong.length}
                      </span>
                    </div>
                    <p style={{ color: "var(--text-muted)" }} className="text-[11px] mb-2.5">
                      Directly validated by strong evidence and hands-on projects.
                    </p>

                    <div className="flex flex-col gap-1.5 max-h-[340px] sm:max-h-[380px] overflow-y-auto delta-scrollbar pr-1">
                      {filteredStrong.length > 0 ? (
                        filteredStrong.map((s, i) => (
                          <div
                            key={i}
                            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                            className="px-2.5 py-1.5 sm:px-3 sm:py-2 border rounded-lg shadow-2xs flex items-center justify-between gap-2 group hover:border-[var(--navy-900)] transition"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span style={{ backgroundColor: "var(--strong)" }} className="w-1.5 h-1.5 rounded-full shrink-0" />
                              <span style={{ color: "var(--navy-900)" }} className="text-xs sm:text-[13px] font-semibold font-mono truncate" title={s}>
                                {s}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleMoveSkill(s, "strong", "weak")}
                                title="Demote to Weak / Needs Proof"
                                style={{ backgroundColor: "var(--weak-bg)", color: "var(--weak)", borderColor: "var(--weak-border)" }}
                                className="h-6 sm:h-6.5 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold border transition cursor-pointer flex items-center gap-0.5 hover:bg-[var(--weak)] hover:text-white active:scale-95 shadow-2xs"
                              >
                                <span>~ Weak</span>
                                <ArrowDownRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div
                          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-muted)" }}
                          className="p-4 rounded-lg border border-dashed text-center text-xs italic"
                        >
                          {skillSearchQuery ? "No strong skills match filter" : "No strong skills verified yet"}
                        </div>
                      )}
                    </div>
                    {filteredStrong.length > 5 && (
                      <p style={{ color: "var(--text-muted)" }} className="text-[10px] font-mono text-center pt-1.5 opacity-70">
                        Scroll inside box to see all {filteredStrong.length} skills
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Natural Language Adjustment Input Box */}
              <div
                style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
                className="p-4 sm:p-5 rounded-[12px] mb-6 shadow-2xs border"
              >
                <div className="flex items-center justify-between mb-2">
                  <label style={{ color: "var(--navy-900)" }} className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--navy-700)]" />
                    <span>Custom Human Guidance & Context</span>
                  </label>
                  <span style={{ color: "var(--text-muted)" }} className="text-[11px] font-mono">Optional</span>
                </div>
                <input
                  type="text"
                  value={userAdjustment}
                  onChange={(e) => setUserAdjustment(e.target.value)}
                  placeholder="e.g. 'I used Redis extensively for session tokens at my previous role; treat as strong'..."
                  style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                  className="w-full px-4 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none focus:border-[var(--teal-600)] focus:ring-2 focus:ring-[var(--teal-600)]/40 transition placeholder:text-[var(--text-muted)]/70"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => handleResumeAnalysis("")}
                  disabled={loading}
                  style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl border text-xs sm:text-sm font-semibold tracking-wide transition cursor-pointer hover:bg-[var(--navy-50)]"
                >
                  Approve As Is
                </button>
                <button
                  onClick={() => handleResumeAnalysis()}
                  disabled={loading}
                  style={{ backgroundColor: "var(--teal-600)", color: "var(--surface)" }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-3 rounded-xl text-xs sm:text-sm font-bold shadow-md transition hover:bg-[var(--teal-700)] cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[var(--surface)]" />
                      <span>Generating 48-Hour Roadmap...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>{finalOutput ? "Update & Re-generate Roadmap" : "Confirm & Generate 48-Hour Roadmap"}</span>
                    </>
                  )}
                </button>
              </div>
            </section>
          )}

          {/* SECTION 3, 4, 5: MERGED AUTOSCROLLABLE AUDIT REPORT */}
          {finalOutput && (
            <div className="space-y-12 w-full min-w-0 max-w-full">
              {/* Role Readiness Scorecard & Report Actions Banner */}
              <div
                style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                className="p-4 sm:p-6 rounded-[12px] border shadow-[0_1px_3px_rgba(15,31,61,0.08)] hover:shadow-[0_4px_12px_rgba(15,31,61,0.12)] transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5 w-full min-w-0 max-w-full"
              >
                <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div
                    style={{ backgroundColor: "var(--navy-50)", borderColor: "var(--border)", color: "var(--navy-900)" }}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border flex flex-col items-center justify-center shrink-0 shadow-2xs"
                  >
                    <span className="text-lg sm:text-xl font-black leading-none">
                      {insights?.match_score ?? 74}%
                    </span>
                    <span style={{ color: "var(--text-muted)" }} className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider mt-0.5">
                      Match
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 style={{ color: "var(--navy-900)" }} className="text-sm sm:text-base font-bold">
                      Role Readiness: {insights?.match_score ?? 74}%
                    </h3>
                    <p style={{ color: "var(--text-muted)" }} className="text-xs max-w-xl mt-0.5 leading-relaxed break-words">
                      {insights?.executive_summary ||
                        `High potential candidacy with ${missingCount} bridgeable engineering gaps.`}
                    </p>
                  </div>
                </div>

                {/* Upper Body Action Buttons: Clean Copy & Download PDF */}
                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 w-full sm:w-auto">
                  <button
                    onClick={handleCopyMarkdown}
                    style={{
                      backgroundColor: copied ? "var(--strong-bg)" : "var(--teal-600)",
                      color: copied ? "var(--strong)" : "var(--surface)",
                      borderColor: copied ? "var(--strong-border)" : "transparent",
                    }}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition hover:bg-[var(--teal-700)] cursor-pointer whitespace-nowrap"
                    title="Copy full analysis report"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[var(--strong)]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    style={{ backgroundColor: "var(--teal-600)", color: "var(--surface)" }}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition hover:bg-[var(--teal-700)] cursor-pointer whitespace-nowrap"
                    title="Download printable executive PDF dossier"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>

              {/* PHASE 1: 48-HOUR ROADMAP */}
              <section id="section-roadmap" className="scroll-mt-28 lg:scroll-mt-24 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] flex-wrap gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      style={{ backgroundColor: "var(--navy-50)", color: "var(--navy-900)" }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0"
                    >
                      <Target className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 style={{ color: "var(--navy-900)" }} className="text-sm sm:text-base font-bold truncate">
                        Phase 1: 48-Hour Execution Roadmap
                      </h3>
                      <p style={{ color: "var(--text-muted)" }} className="text-[11px] sm:text-xs truncate">
                        Rapid portfolio proof projects targeting zero-evidence missing skills
                      </p>
                    </div>
                  </div>

                  {insights?.missing_roadmap && insights.missing_roadmap.length > 0 && (
                    <div className="flex items-center gap-2 shrink-0">
                      {(() => {
                        const roadmap = insights.missing_roadmap;
                        const allAreExpanded = roadmap.every((_, i) =>
                          expandedRoadmapItems[i] !== undefined ? expandedRoadmapItems[i] : i === 0
                        );
                        return (
                          <button
                            onClick={() => {
                              const nextState: Record<number, boolean> = {};
                              roadmap.forEach((_, i) => {
                                nextState[i] = !allAreExpanded;
                              });
                              setExpandedRoadmapItems(nextState);
                            }}
                            style={{ borderColor: "var(--border)", color: "var(--navy-900)" }}
                            className="text-[10px] sm:text-[11px] font-semibold px-2.5 py-1 rounded-lg border hover:bg-[var(--navy-50)] transition cursor-pointer"
                          >
                            {allAreExpanded ? "Collapse All" : "Expand All"}
                          </button>
                        );
                      })()}
                      <span
                        style={{ backgroundColor: "var(--navy-50)", color: "var(--navy-900)", borderColor: "var(--border)" }}
                        className="text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-full border shrink-0"
                      >
                        {insights.missing_roadmap.length} PoCs
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
              {insights?.missing_roadmap && insights.missing_roadmap.length > 0 ? (
                insights.missing_roadmap.map((item, idx) => {
                  const isProjectCopied = copiedProjectKey === idx;
                  const isExpanded =
                    expandedRoadmapItems[idx] !== undefined
                      ? expandedRoadmapItems[idx]
                      : idx === 0;
                  const currentMobileTab = roadmapMobileTabs[idx] || "poc";

                  return (
                    <div
                      key={idx}
                      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                      className="rounded-[12px] border overflow-hidden shadow-[0_1px_3px_rgba(15,31,61,0.08)] hover:shadow-[0_4px_12px_rgba(15,31,61,0.12)] transition-all w-full min-w-0 max-w-full"
                    >
                      {/* Skill Card Header (Clickable anywhere to expand/collapse) */}
                      <div
                        onClick={() =>
                          setExpandedRoadmapItems((prev) => ({
                            ...prev,
                            [idx]: prev[idx] !== undefined ? !prev[idx] : idx !== 0,
                          }))
                        }
                        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                        className={`p-3 sm:p-4 flex items-center justify-between gap-2.5 sm:gap-4 w-full min-w-0 cursor-pointer select-none transition hover:bg-[var(--navy-50)]/40 ${
                          isExpanded ? "border-b" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <span
                            style={{ backgroundColor: "var(--navy-900)", color: "var(--surface)" }}
                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                          >
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <h4 style={{ color: "var(--navy-900)" }} className="text-xs sm:text-sm font-bold font-mono truncate">
                                {item.skill}
                              </h4>
                              <span
                                style={{ backgroundColor: "var(--missing-bg)", color: "var(--missing)", borderColor: "var(--missing-border)" }}
                                className="px-1.5 sm:px-2 py-0.2 rounded-full text-[9px] sm:text-[10px] font-bold border uppercase tracking-wider shrink-0"
                              >
                                ✕ Gap Deliverable
                              </span>
                            </div>
                            <p style={{ color: "var(--text-muted)" }} className="text-[11px] truncate hidden sm:block mt-0.5">
                              Addressed via 48-hr proof deliverable & experience anchor
                            </p>
                          </div>
                        </div>

                        {/* Top Action Pills & Chevron */}
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const bridge = getBridgeData(item.skill, idx, item.transferable_from);
                              handleCopyProject(
                                idx,
                                `48-Hour PoC Project for ${item.skill}:\n${item.bridge_project}\n\nResume Anchor Project:\n${bridge.project}\n\nResume Bridge Angle:\n${bridge.pitch}`
                              );
                            }}
                            style={{
                              backgroundColor: isProjectCopied ? "var(--strong-bg)" : "var(--teal-600)",
                              borderColor: isProjectCopied ? "var(--strong-border)" : "transparent",
                              color: isProjectCopied ? "var(--strong)" : "var(--surface)",
                            }}
                            className="flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-xs transition hover:bg-[var(--teal-700)] cursor-pointer"
                            title="Copy PoC Details"
                          >
                            {isProjectCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-[var(--strong)]" />
                                <span className="hidden sm:inline">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Copy PoC</span>
                              </>
                            )}
                          </button>

                          <div
                            style={{ color: "var(--text-muted)" }}
                            className="p-1 rounded-md hover:bg-[var(--navy-50)] text-[var(--navy-700)] transition"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expandable Body: 3-Tab Switcher on Mobile, 3 Columns on Desktop */}
                      {isExpanded && (
                        <div className="p-3 sm:p-4.5">
                          {/* Mobile View Tab Switcher: Cuts vertical height by 70% */}
                          <div className="flex lg:hidden items-center p-1 rounded-xl bg-[var(--bg)] border border-[var(--border)] gap-1 mb-3">
                            <button
                              onClick={() =>
                                setRoadmapMobileTabs((prev) => ({ ...prev, [idx]: "poc" }))
                              }
                              style={{
                                backgroundColor: currentMobileTab === "poc" ? "var(--surface)" : "transparent",
                                color: currentMobileTab === "poc" ? "var(--navy-900)" : "var(--text-muted)",
                                boxShadow: currentMobileTab === "poc" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                              }}
                              className="flex-1 py-1 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Flame className="w-3.5 h-3.5 text-[var(--navy-700)]" />
                              <span>48-Hr PoC</span>
                            </button>
                            <button
                              onClick={() =>
                                setRoadmapMobileTabs((prev) => ({ ...prev, [idx]: "why" }))
                              }
                              style={{
                                backgroundColor: currentMobileTab === "why" ? "var(--surface)" : "transparent",
                                color: currentMobileTab === "why" ? "var(--navy-900)" : "var(--text-muted)",
                                boxShadow: currentMobileTab === "why" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                              }}
                              className="flex-1 py-1 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Building2 className="w-3.5 h-3.5 text-[var(--navy-700)]" />
                              <span>Why Needed</span>
                            </button>
                            <button
                              onClick={() =>
                                setRoadmapMobileTabs((prev) => ({ ...prev, [idx]: "bridge" }))
                              }
                              style={{
                                backgroundColor: currentMobileTab === "bridge" ? "var(--surface)" : "transparent",
                                color: currentMobileTab === "bridge" ? "var(--navy-900)" : "var(--text-muted)",
                                boxShadow: currentMobileTab === "bridge" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                              }}
                              className="flex-1 py-1 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Award className="w-3.5 h-3.5 text-[var(--navy-700)]" />
                              <span>Resume Bridge</span>
                            </button>
                          </div>

                          {/* 3 CARDS: Responsive 3-Column on desktop, 1 tab on mobile */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4.5">
                            {/* Card 1: 48-Hour PoC Project (Primary Deliverable) */}
                            <div
                              style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
                              className={`p-3 sm:p-4 rounded-[12px] border flex-col justify-between shadow-2xs hover:border-[var(--navy-900)] transition ${
                                currentMobileTab !== "poc" ? "hidden lg:flex" : "flex"
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <div
                                    style={{ backgroundColor: "var(--surface)", color: "var(--navy-900)", borderColor: "var(--border)" }}
                                    className="w-6 h-6 rounded-lg border flex items-center justify-center shrink-0"
                                  >
                                    <Flame className="w-3.5 h-3.5 text-[var(--navy-700)]" />
                                  </div>
                                  <span style={{ color: "var(--navy-900)" }} className="text-xs font-bold uppercase tracking-wider">
                                    48-Hour PoC Project
                                  </span>
                                </div>

                                {item.project_keywords && item.project_keywords.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                                    {item.project_keywords.map((kw, kidx) => (
                                      <span
                                        key={kidx}
                                        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--navy-700)" }}
                                        className="px-2 py-0.5 rounded-md border text-[10px] font-semibold font-mono"
                                      >
                                        🛠️ {kw}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                <div className="space-y-2 text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed font-sans">
                                  <p className="font-medium">
                                    {item.bridge_project}
                                  </p>
                                </div>
                              </div>

                              <div style={{ borderColor: "var(--border)", color: "var(--text-muted)" }} className="pt-2.5 mt-2.5 border-t text-[10px] font-semibold uppercase tracking-wider flex items-center justify-between">
                                <span>Deliverable Project</span>
                                <span style={{ color: "var(--navy-900)" }} className="font-mono font-bold">48 Hrs</span>
                              </div>
                            </div>

                            {/* Card 2: Why Company Wants This */}
                            <div
                              style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
                              className={`p-3 sm:p-4 rounded-[12px] border flex-col justify-between shadow-2xs hover:border-[var(--navy-900)] transition ${
                                currentMobileTab !== "why" ? "hidden lg:flex" : "flex"
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    <div
                                      style={{ backgroundColor: "var(--surface)", color: "var(--navy-900)", borderColor: "var(--border)" }}
                                      className="w-6 h-6 rounded-lg border flex items-center justify-center shrink-0"
                                    >
                                      <Building2 className="w-3.5 h-3.5 text-[var(--navy-700)]" />
                                    </div>
                                    <span style={{ color: "var(--navy-900)" }} className="text-xs font-bold uppercase tracking-wider">
                                      {effectiveCompanyName
                                        ? `Why ${effectiveCompanyName.toUpperCase()} Wants`
                                        : "Why Role Requires"}
                                    </span>
                                  </div>
                                  {effectiveCompanyName && (
                                    <span
                                      style={{ backgroundColor: "var(--surface)", color: "var(--navy-700)", borderColor: "var(--border)" }}
                                      className="text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0"
                                    >
                                      {sourcePlatform || "Target Grounded"}
                                    </span>
                                  )}
                                </div>

                                {item.company_keywords && item.company_keywords.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                                    {item.company_keywords.map((kw, kidx) => (
                                      <span
                                        key={kidx}
                                        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--navy-700)" }}
                                        className="px-2 py-0.5 rounded-md border text-[10px] font-semibold"
                                      >
                                        #{kw}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                <p style={{ color: "var(--text-primary)" }} className="text-xs sm:text-sm opacity-90 leading-relaxed font-sans">
                                  {item.why_it_matters}
                                </p>
                              </div>

                              <div style={{ borderColor: "var(--border)", color: "var(--text-muted)" }} className="pt-2.5 mt-2.5 border-t text-[10px] font-semibold uppercase tracking-wider flex items-center justify-between">
                                <span>
                                  {effectiveCompanyName
                                    ? `${effectiveCompanyName} Intent`
                                    : "Hiring Manager Intent"}
                                </span>
                                {effectiveCompanyName && (
                                  <span className="text-[9px] font-bold text-[var(--strong)] flex items-center gap-0.5">
                                    <Check className="w-2.5 h-2.5 text-[var(--strong)]" />
                                    <span>Target Grounded</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Card 3: Resume Bridge */}
                            {(() => {
                              const bridge = getBridgeData(item.skill, idx, item.transferable_from);
                              return (
                                <div
                                  style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
                                  className={`p-3 sm:p-4 rounded-[12px] border flex-col justify-between shadow-2xs hover:border-[var(--navy-900)] transition ${
                                    currentMobileTab !== "bridge" ? "hidden lg:flex" : "flex"
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                      <div className="flex items-center gap-2">
                                        <div
                                          style={{ backgroundColor: "var(--surface)", color: "var(--navy-900)", borderColor: "var(--border)" }}
                                          className="w-6 h-6 rounded-lg border flex items-center justify-center shrink-0"
                                        >
                                          <Award className="w-3.5 h-3.5 text-[var(--navy-700)]" />
                                        </div>
                                        <span style={{ color: "var(--navy-900)" }} className="text-xs font-bold uppercase tracking-wider">
                                          Resume Bridge
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateBridge(item.skill, { isEditing: !bridge.isEditing })
                                        }
                                        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                                        className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border transition cursor-pointer hover:bg-[var(--navy-50)]"
                                      >
                                        <Pencil className="w-3 h-3" />
                                        <span>{bridge.isEditing ? "Close" : "Edit Bridge"}</span>
                                      </button>
                                    </div>

                                    {bridge.isEditing ? (
                                      <div className="space-y-2.5 pt-1">
                                        <div>
                                          <label style={{ color: "var(--navy-900)" }} className="block text-[10px] font-bold uppercase tracking-wider mb-1">
                                            Select from Resume Projects:
                                          </label>
                                          <select
                                            value={
                                              detectedResumeProjects.includes(bridge.project)
                                                ? bridge.project
                                                : "__custom__"
                                            }
                                            onChange={(e) => {
                                              if (e.target.value !== "__custom__") {
                                                updateBridge(item.skill, { project: e.target.value });
                                              }
                                            }}
                                            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                                            className="w-full text-xs p-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[var(--teal-600)]/40 focus:border-[var(--teal-600)] truncate"
                                          >
                                            {detectedResumeProjects.map((p, pidx) => (
                                              <option key={pidx} value={p}>
                                                {p}
                                              </option>
                                            ))}
                                            <option value="__custom__">
                                              ✎ Custom Project Name...
                                            </option>
                                          </select>
                                        </div>

                                        <div>
                                          <label style={{ color: "var(--text-muted)" }} className="block text-[10px] font-bold uppercase tracking-wider mb-1">
                                            Project Name Anchor:
                                          </label>
                                          <input
                                            type="text"
                                            value={bridge.project}
                                            onChange={(e) =>
                                              updateBridge(item.skill, { project: e.target.value })
                                            }
                                            placeholder="e.g. FastAPI Microservice / Auth Pipeline"
                                            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                                            className="w-full text-xs p-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[var(--teal-600)]/40 focus:border-[var(--teal-600)]"
                                          />
                                        </div>

                                        <div>
                                          <label style={{ color: "var(--text-muted)" }} className="block text-[10px] font-bold uppercase tracking-wider mb-1">
                                            Bridge Pitch / Narrative:
                                          </label>
                                          <textarea
                                            rows={2}
                                            value={bridge.pitch}
                                            onChange={(e) =>
                                              updateBridge(item.skill, { pitch: e.target.value })
                                            }
                                            placeholder="Explain how your real project proves transferable capability..."
                                            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                                            className="w-full text-xs p-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[var(--teal-600)]/40 focus:border-[var(--teal-600)] resize-none leading-relaxed"
                                          />
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                          <button
                                            type="button"
                                            onClick={() => resetBridge(item.skill)}
                                            style={{ color: "var(--text-muted)" }}
                                            className="text-[10px] font-semibold hover:text-[var(--navy-900)] hover:underline transition cursor-pointer"
                                          >
                                            Reset
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              updateBridge(item.skill, { isEditing: false })
                                            }
                                            style={{ backgroundColor: "var(--teal-600)", color: "var(--surface)" }}
                                            className="px-2.5 py-1 text-[10px] font-semibold rounded-lg shadow-2xs transition hover:bg-[var(--teal-700)] cursor-pointer flex items-center gap-1"
                                          >
                                            <Check className="w-3 h-3" />
                                            <span>Save</span>
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <div
                                          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                                          className="mb-2 p-2 rounded-xl border"
                                        >
                                          <div style={{ color: "var(--navy-900)" }} className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 mb-0.5">
                                            <FolderGit2 className="w-3 h-3 text-[var(--navy-700)]" />
                                            <span>Resume Anchor:</span>
                                          </div>
                                          <p style={{ color: "var(--text-primary)" }} className="text-xs font-semibold leading-snug line-clamp-2">
                                            {bridge.project}
                                          </p>
                                        </div>

                                        {item.bridge_keywords && item.bridge_keywords.length > 0 && (
                                          <div className="flex flex-wrap gap-1.5 mb-2">
                                            {item.bridge_keywords.map((kw, kidx) => (
                                              <span
                                                key={kidx}
                                                style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--navy-700)" }}
                                                className="px-2 py-0.5 rounded-md border text-[10px] font-semibold"
                                              >
                                                🌉 {kw}
                                              </span>
                                            ))}
                                          </div>
                                        )}

                                        <p style={{ color: "var(--text-primary)" }} className="text-xs sm:text-sm opacity-90 leading-relaxed font-sans">
                                          {bridge.pitch}
                                        </p>
                                      </>
                                    )}
                                  </div>

                                  <div style={{ borderColor: "var(--border)", color: "var(--text-muted)" }} className="pt-2.5 mt-2.5 border-t text-[10px] font-semibold uppercase tracking-wider flex items-center justify-between">
                                    <span>Connect Your Project</span>
                                    {bridge.isModified && (
                                      <span
                                        style={{ backgroundColor: "var(--surface)", color: "var(--navy-900)", borderColor: "var(--border)" }}
                                        className="text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase"
                                      >
                                        Customized
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div
                  style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-muted)" }}
                  className="p-8 rounded-[12px] border text-center text-xs"
                >
                  No critical missing skill gaps detected.
                </div>
              )}
                </div>
              </section>

              {/* PHASE 2: RESUME BULLETS */}
              <section id="section-bullets" className="scroll-mt-28 lg:scroll-mt-24 space-y-4 pt-6 border-t border-[var(--border)]">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2.5">
                    <div
                      style={{ backgroundColor: "var(--weak-bg)", color: "var(--weak)" }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                    >
                      <Wand2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 style={{ color: "var(--navy-900)" }} className="text-sm sm:text-base font-bold">
                        Phase 2: Resume Bullet Improvements
                      </h3>
                      <p style={{ color: "var(--text-muted)" }} className="text-[11px] sm:text-xs">
                        Quantified XYZ impact rewrites targeting weak skills and experiential bridges
                      </p>
                    </div>
                  </div>
                  {insights?.weak_improvements && (
                    <span
                      style={{ backgroundColor: "var(--weak-bg)", color: "var(--weak)", borderColor: "var(--weak-border)" }}
                      className="text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-full border shrink-0"
                    >
                      {insights.weak_improvements.length} Rewrites
                    </span>
                  )}
                </div>

                <div className="space-y-4 w-full min-w-0 max-w-full">
              {insights?.weak_improvements && insights.weak_improvements.length > 0 ? (
                insights.weak_improvements.map((item, idx) => (
                  <div
                    key={idx}
                    style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                    className="p-4 sm:p-5 rounded-[12px] border shadow-[0_1px_3px_rgba(15,31,61,0.08)] hover:shadow-[0_4px_12px_rgba(15,31,61,0.12)] space-y-3 transition-shadow w-full min-w-0 max-w-full"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span
                        style={{ backgroundColor: "var(--weak-bg)", color: "var(--weak)", borderColor: "var(--weak-border)" }}
                        className="px-2.5 py-1 rounded-lg border font-mono text-xs font-bold"
                      >
                        ~ {item.skill}
                      </span>
                      <span style={{ color: "var(--text-muted)" }} className="text-xs font-medium">XYZ Impact Model</span>
                    </div>

                    <div className="space-y-2">
                      {item.recommended_bullets.map((bullet, bidx) => {
                        const bulletKey = `${item.skill}-${bidx}`;
                        const isBulletCopied = copiedBulletKey === bulletKey;
                        return (
                          <div
                            key={bidx}
                            style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
                            className="p-3 sm:p-3.5 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-2.5 sm:gap-3 group hover:border-[var(--navy-900)] transition"
                          >
                            <div className="flex items-start gap-2.5 flex-grow min-w-0">
                              <span style={{ color: "var(--navy-700)" }} className="font-bold mt-0.5 shrink-0">•</span>
                              <p style={{ color: "var(--text-primary)" }} className="text-xs sm:text-sm opacity-90 leading-relaxed font-sans break-words">
                                {bullet}
                              </p>
                            </div>

                            <button
                              onClick={() => handleCopyBullet(bulletKey, bullet)}
                              style={{
                                backgroundColor: isBulletCopied ? "var(--strong-bg)" : "var(--teal-600)",
                                borderColor: isBulletCopied ? "var(--strong-border)" : "transparent",
                                color: isBulletCopied ? "var(--strong)" : "var(--surface)",
                              }}
                              className="self-end sm:self-auto flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-xs transition hover:bg-[var(--teal-700)] cursor-pointer shrink-0"
                            >
                              {isBulletCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-[var(--strong)]" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-muted)" }}
                  className="p-8 rounded-[12px] border text-center text-xs"
                >
                  No weak bullet improvements needed.
                </div>
              )}
                </div>
              </section>

              {/* PHASE 3: INTERVIEW DEFENSE */}
              <section id="section-interview" className="scroll-mt-28 lg:scroll-mt-24 space-y-4 pt-6 border-t border-[var(--border)]">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                  <div className="flex items-center gap-2.5">
                    <div
                      style={{ backgroundColor: "var(--navy-50)", color: "var(--navy-900)" }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 style={{ color: "var(--navy-900)" }} className="text-sm sm:text-base font-bold">
                        Phase 3: Technical Interview Defense & Deep Dives
                      </h3>
                      <p style={{ color: "var(--text-muted)" }} className="text-[11px] sm:text-xs">
                        Anticipated architectural probes and battle-tested talking points
                      </p>
                    </div>
                  </div>
                  {insights?.interview_questions && (
                    <span
                      style={{ backgroundColor: "var(--navy-50)", color: "var(--navy-900)", borderColor: "var(--border)" }}
                      className="text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-full border shrink-0"
                    >
                      {insights.interview_questions.length} Questions
                    </span>
                  )}
                </div>

                <div className="space-y-4 w-full min-w-0 max-w-full">
              {insights?.interview_questions && insights.interview_questions.length > 0 ? (
                insights.interview_questions.map((q, idx) => {
                  const isCopied = copiedQuestionKey === idx;
                  const isExpanded = !!expandedQuestions[idx];

                  return (
                    <div
                      key={idx}
                      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                      className="rounded-[12px] border overflow-hidden shadow-[0_1px_3px_rgba(15,31,61,0.08)] hover:shadow-[0_4px_12px_rgba(15,31,61,0.12)] transition-shadow w-full min-w-0 max-w-full"
                    >
                      {/* Clicking ANYWHERE in this header row toggles open/close */}
                      <div
                        onClick={() => toggleQuestionExpanded(idx)}
                        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                        className="p-3.5 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-3 hover:bg-[var(--navy-50)] transition cursor-pointer select-none border-b"
                      >
                        <div className="flex items-start gap-2.5 sm:gap-3 flex-grow min-w-0">
                          <span
                            style={{ backgroundColor: "var(--navy-900)", color: "var(--surface)" }}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                          >
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span
                              style={{ backgroundColor: "var(--missing-bg)", borderColor: "var(--missing-border)", color: "var(--missing)" }}
                              className="inline-block px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                            >
                              ✕ Probing Gap: {q.targeted_skill}
                            </span>
                            <h4 style={{ color: "var(--navy-900)" }} className="text-xs sm:text-sm font-semibold leading-snug">
                              {q.question}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleCopyQuestion(idx, q)}
                            style={{
                              backgroundColor: isCopied ? "var(--strong-bg)" : "var(--teal-600)",
                              borderColor: isCopied ? "var(--strong-border)" : "transparent",
                              color: isCopied ? "var(--strong)" : "var(--surface)",
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-xs transition hover:bg-[var(--teal-700)] cursor-pointer"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-[var(--strong)]" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Q&A</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => toggleQuestionExpanded(idx)}
                            style={{ color: "var(--text-muted)" }}
                            className="p-1.5 rounded-lg hover:text-[var(--navy-900)] hover:bg-[var(--navy-50)] transition cursor-pointer"
                            title={isExpanded ? "Collapse" : "Expand"}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Strategic Talking Points */}
                      {isExpanded && (
                        <div
                          style={{ backgroundColor: "var(--navy-50)", borderColor: "var(--border)" }}
                          className="p-3.5 sm:p-5 flex items-start gap-2.5 sm:gap-3 border-t"
                        >
                          <div
                            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--navy-900)" }}
                            className="w-6 h-6 rounded-md border flex items-center justify-center shrink-0 mt-0.5"
                          >
                            <Lightbulb className="w-3.5 h-3.5 text-[var(--navy-700)]" />
                          </div>
                          <div className="flex-grow">
                            <p style={{ color: "var(--navy-900)" }} className="text-xs font-bold uppercase tracking-wider mb-1">
                              Strategic Talking Points & Response Framework
                            </p>
                            <p style={{ color: "var(--text-primary)" }} className="text-xs sm:text-sm opacity-85 leading-relaxed whitespace-pre-line font-sans">
                              {q.suggested_talking_points}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div
                  style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-muted)" }}
                  className="p-8 rounded-[12px] border text-center text-xs"
                >
                  No interview questions generated.
                </div>
              )}
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      {/* Audit History Slide-Over Drawer */}
      {isHistoryOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
          onClick={() => setIsHistoryOpen(false)}
        >
          <div
            className="w-full max-w-md h-full bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl flex flex-col min-h-0 animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--navy-900)] text-white">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400" />
                <h3 className="font-bold text-sm">Audit History</h3>
                <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full font-mono">
                  {history.length} Saved
                </span>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 delta-scrollbar">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-[var(--text-muted)]">
                  <Clock className="w-10 h-10 mb-3 text-slate-300 stroke-[1.5]" />
                  <p className="text-sm font-semibold text-[var(--navy-900)]">No Saved Audits Yet</p>
                  <p className="text-xs mt-1">Run an audit or click "Load Sample Demo" to populate and automatically save reports in your history.</p>
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleLoadHistoryItem(item)}
                    className="p-3.5 rounded-xl border border-[var(--border)] hover:border-[var(--teal-600)] hover:shadow-md transition cursor-pointer bg-[var(--surface)] flex flex-col gap-2 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-[var(--navy-900)] truncate group-hover:text-[var(--teal-600)] transition">
                          {item.roleTitle}
                        </h4>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {item.timestamp}
                        </span>
                      </div>
                      {item.matchScore !== undefined && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
                          {item.matchScore}% Match
                        </span>
                      )}
                      <button
                        onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                        className="p-1 text-[var(--text-muted)] hover:text-red-600 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 transition"
                        title="Delete audit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 bg-[var(--navy-50)]/50 p-2 rounded-lg font-mono">
                      {item.jobDescription.slice(0, 110)}...
                    </p>

                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[var(--border)] text-[var(--teal-600)] font-semibold">
                      <span>{item.finalOutput ? "Final Report Ready" : "Verification Step"}</span>
                      <span className="group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5">
                        Restore Audit →
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer */}
            {history.length > 0 && (
              <div className="p-3 border-t border-[var(--border)] bg-[var(--navy-50)] flex items-center justify-between">
                <span className="text-[11px] text-[var(--text-muted)]">Stored locally in browser</span>
                <button
                  onClick={() => {
                    setHistory([]);
                    localStorage.removeItem("delta_audit_history");
                  }}
                  className="text-[11px] text-red-600 hover:underline font-medium"
                >
                  Clear All History
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}