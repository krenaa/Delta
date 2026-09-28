"use client";

import { useState, useRef, ChangeEvent, DragEvent, useMemo } from "react";
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
  ChevronUp,
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
  Lightbulb,
  Link2,
  MessageSquare,
  PauseCircle,
  Pencil,
  Printer,
  RefreshCw,
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

type ActiveSection = "sources" | "review" | "roadmap" | "bullets" | "interview";

export default function ResumeGapAnalyzerPage() {
  const [activeSection, setActiveSection] = useState<ActiveSection>("sources");
  const [jobDescription, setJobDescription] = useState(DEFAULT_JD);
  const [resumeText, setResumeText] = useState(DEFAULT_RESUME);

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

      if (data.proposed_gap) {
        setHitlReview(data.proposed_gap);
        setActiveSection("review");
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

    setLoading(true);
    setError(null);

    const feedbackToSend =
      customAdjustment !== undefined ? customAdjustment : userAdjustment;

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
      setActiveSection("roadmap");
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
    if (!hitlReview) return;
    const updated = { ...hitlReview };
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
    if (companyName || insights?.company_name) {
      md += `**Target Company:** ${companyName || insights?.company_name}\n`;
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
          <div class="meta">Role: <strong>${detectedRole}</strong>${companyName || insights?.company_name ? ` | Company: <strong>${companyName || insights?.company_name}</strong>` : ""} | Candidate: <strong>${detectedCandidateName}</strong></div>

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

  // Status numbers
  const missingCount = finalOutput?.missing.length ?? hitlReview?.missing.length ?? 0;
  const weakCount = finalOutput?.weak.length ?? hitlReview?.weak.length ?? 0;
  const strongCount = finalOutput?.strong.length ?? hitlReview?.strong.length ?? 0;

  return (
    <div
      style={{ backgroundColor: "var(--bg)", color: "var(--text-primary)" }}
      className="min-h-screen font-sans pb-20 relative selection:bg-[var(--teal-600)]/20"
    >
      {/* Subtle Cool Ambient Radial Glows */}
      <div className="absolute top-0 left-1/4 w-[550px] h-[350px] bg-[var(--teal-600)]/5 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-20 right-1/4 w-[500px] h-[350px] bg-[var(--navy-700)]/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Top Header (Clean Light Surface, Navy Logo & Text, Subtle Border) */}
      <header
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        className="sticky top-0 z-30 border-b px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 mb-4 sm:mb-6 shadow-xs"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Bold Navy Logo Box with White Icon */}
            <div
              style={{ backgroundColor: "var(--navy-900)", color: "var(--surface)" }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-xs font-black text-base sm:text-lg select-none shrink-0"
            >
              Δ
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 style={{ color: "var(--navy-900)" }} className="text-base sm:text-lg font-bold tracking-tight">
                  Delta
                </h1>
                <span
                  style={{ backgroundColor: "var(--navy-50)", color: "var(--navy-900)", borderColor: "var(--border)" }}
                  className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold tracking-wide border"
                >
                  LangGraph Agentic Audit
                </span>
              </div>
              <p style={{ color: "var(--text-muted)" }} className="text-[10px] sm:text-[11px] font-medium line-clamp-1">
                Targeted skill diagnosis, 48-hr bridge roadmap & interview defense
              </p>
            </div>
          </div>

          {/* Top Actions: Light styling pills with subtle border */}
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            <div
              style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-muted)" }}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full border text-[11px] sm:text-xs font-medium"
            >
              <span style={{ backgroundColor: "var(--teal-600)" }} className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(15,118,110,0.8)]" />
              <span>AI Engine Ready</span>
            </div>

            {(finalOutput || hitlReview) && (
              <button
                onClick={handleReset}
                style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                className="flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 border hover:bg-[var(--navy-50)] rounded-xl text-[11px] sm:text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>New Audit</span>
              </button>
            )}
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
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-4 sm:gap-6 items-start">
        {/* LEFT SIDEBAR NAVIGATION DRAWER */}
        <aside
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          className="w-full lg:w-60 shrink-0 border rounded-[12px] shadow-[0_1px_3px_rgba(15,31,61,0.08)] hover:shadow-[0_4px_12px_rgba(15,31,61,0.12)] transition-shadow overflow-hidden lg:sticky lg:top-20"
        >
          {/* Target Profile Card (Auto-detected from JD and Resume) */}
          <div style={{ borderColor: "var(--border)" }} className="p-3 sm:p-4 border-b">
            <div className="flex items-center justify-between gap-2 lg:block">
              <div>
                <span
                  style={{ backgroundColor: "var(--role-bg)", color: "var(--role-text)", borderColor: "var(--role-border)" }}
                  className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border inline-block"
                >
                  Target Role
                </span>
                <h3 style={{ color: "var(--navy-900)" }} className="text-xs sm:text-sm font-bold mt-1 leading-snug truncate max-w-[200px] sm:max-w-xs lg:max-w-none">
                  {detectedRole}
                </h3>
              </div>
              <p style={{ color: "var(--text-muted)" }} className="text-[10px] sm:text-[11px] font-medium truncate mt-0.5 hidden sm:block lg:block">
                Candidate: {detectedCandidateName}
              </p>
            </div>
            {(companyName || insights?.company_name) && (
              <div style={{ color: "var(--navy-700)" }} className="flex items-center gap-1.5 text-[11px] font-bold mt-1 truncate">
                <Building2 className="w-3.5 h-3.5 text-[var(--navy-700)] shrink-0" />
                <span className="truncate">{companyName || insights?.company_name}</span>
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
            <p style={{ color: "var(--text-muted)" }} className="text-[10px] font-medium truncate mt-0.5 sm:hidden">
              Candidate: {detectedCandidateName}
            </p>
          </div>

          {/* Navigation Items: Horizontal scrollable strip on mobile/tablet, vertical stack on desktop */}
          <nav className="p-1.5 sm:p-2 flex flex-row lg:flex-col overflow-x-auto gap-1 sm:gap-1.5 text-xs no-scrollbar">
            <button
              onClick={() => setActiveSection("sources")}
              style={{
                backgroundColor: activeSection === "sources" ? "var(--navy-900)" : "transparent",
                color: activeSection === "sources" ? "var(--surface)" : "var(--text-muted)",
              }}
              className="shrink-0 lg:w-full flex items-center justify-between gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg transition cursor-pointer font-medium hover:bg-[var(--navy-50)] hover:text-[var(--navy-900)] whitespace-nowrap"
            >
              <div className="flex items-center gap-2">
                <FileUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="text-xs">Source Materials</span>
              </div>
              <span
                style={{
                  backgroundColor: activeSection === "sources" ? "var(--navy-700)" : "var(--navy-50)",
                  color: activeSection === "sources" ? "var(--surface)" : "var(--navy-900)",
                  borderColor: activeSection === "sources" ? "rgba(255,255,255,0.2)" : "var(--border)",
                }}
                className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded font-semibold border"
              >
                Inputs
              </span>
            </button>

            <button
              onClick={() => (hitlReview || finalOutput) && setActiveSection("review")}
              disabled={!hitlReview && !finalOutput}
              style={{
                backgroundColor: activeSection === "review" ? "var(--navy-900)" : "transparent",
                color: activeSection === "review" ? "var(--surface)" : "var(--text-muted)",
              }}
              className={`shrink-0 lg:w-full flex items-center justify-between gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg transition cursor-pointer font-medium hover:bg-[var(--navy-50)] hover:text-[var(--navy-900)] whitespace-nowrap ${
                !hitlReview && !finalOutput ? "opacity-40 cursor-not-allowed" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <TableProperties className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="text-xs">Skill Verification</span>
              </div>
              {(hitlReview || finalOutput) && (
                <span
                  style={{
                    backgroundColor: activeSection === "review" ? "var(--navy-700)" : "var(--missing-bg)",
                    color: activeSection === "review" ? "var(--surface)" : "var(--missing)",
                    borderColor: activeSection === "review" ? "rgba(255,255,255,0.2)" : "var(--missing-border)",
                  }}
                  className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded font-semibold border"
                >
                  ✕ {missingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => finalOutput && setActiveSection("roadmap")}
              disabled={!finalOutput}
              style={{
                backgroundColor: activeSection === "roadmap" ? "var(--navy-900)" : "transparent",
                color: activeSection === "roadmap" ? "var(--surface)" : "var(--text-muted)",
              }}
              className={`shrink-0 lg:w-full flex items-center justify-between gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg transition cursor-pointer font-medium hover:bg-[var(--navy-50)] hover:text-[var(--navy-900)] whitespace-nowrap ${
                !finalOutput ? "opacity-40 cursor-not-allowed" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="text-xs">48-Hour Roadmap</span>
              </div>
              {insights?.missing_roadmap && (
                <span
                  style={{
                    backgroundColor: activeSection === "roadmap" ? "var(--navy-700)" : "var(--navy-50)",
                    color: activeSection === "roadmap" ? "var(--surface)" : "var(--navy-900)",
                    borderColor: activeSection === "roadmap" ? "rgba(255,255,255,0.2)" : "var(--border)",
                  }}
                  className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded font-semibold border"
                >
                  {insights.missing_roadmap.length} PoCs
                </span>
              )}
            </button>

            <button
              onClick={() => finalOutput && setActiveSection("bullets")}
              disabled={!finalOutput}
              style={{
                backgroundColor: activeSection === "bullets" ? "var(--navy-900)" : "transparent",
                color: activeSection === "bullets" ? "var(--surface)" : "var(--text-muted)",
              }}
              className={`shrink-0 lg:w-full flex items-center justify-between gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg transition cursor-pointer font-medium hover:bg-[var(--navy-50)] hover:text-[var(--navy-900)] whitespace-nowrap ${
                !finalOutput ? "opacity-40 cursor-not-allowed" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <Wand2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="text-xs">Resume Bullets</span>
              </div>
              {weakCount > 0 && (
                <span
                  style={{
                    backgroundColor: activeSection === "bullets" ? "var(--navy-700)" : "var(--weak-bg)",
                    color: activeSection === "bullets" ? "var(--surface)" : "var(--weak)",
                    borderColor: activeSection === "bullets" ? "rgba(255,255,255,0.2)" : "var(--weak-border)",
                  }}
                  className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded font-semibold border"
                >
                  ~ {weakCount} Weak
                </span>
              )}
            </button>

            <button
              onClick={() => finalOutput && setActiveSection("interview")}
              disabled={!finalOutput}
              style={{
                backgroundColor: activeSection === "interview" ? "var(--navy-900)" : "transparent",
                color: activeSection === "interview" ? "var(--surface)" : "var(--text-muted)",
              }}
              className={`shrink-0 lg:w-full flex items-center justify-between gap-2 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-lg transition cursor-pointer font-medium hover:bg-[var(--navy-50)] hover:text-[var(--navy-900)] whitespace-nowrap ${
                !finalOutput ? "opacity-40 cursor-not-allowed" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="text-xs">Interview Defense</span>
              </div>
              {insights?.interview_questions && (
                <span
                  style={{
                    backgroundColor: activeSection === "interview" ? "var(--navy-700)" : "var(--navy-50)",
                    color: activeSection === "interview" ? "var(--surface)" : "var(--navy-900)",
                    borderColor: activeSection === "interview" ? "rgba(255,255,255,0.2)" : "var(--border)",
                  }}
                  className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded font-semibold border"
                >
                  {insights.interview_questions.length} Qs
                </span>
              )}
            </button>
          </nav>
        </aside>

        {/* RIGHT MAIN WORKSPACE CANVAS */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* ========================================================================= */}
          {/* UPPER BODY SECTION: Role Readiness Score + Copy + Download PDF           */}
          {/* ========================================================================= */}
          {finalOutput && (activeSection === "roadmap" || activeSection === "bullets" || activeSection === "interview") && (
            <div
              style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
              className="p-4 sm:p-6 rounded-[12px] border shadow-[0_1px_3px_rgba(15,31,61,0.08)] hover:shadow-[0_4px_12px_rgba(15,31,61,0.12)] transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5"
            >
              <div className="flex items-start sm:items-center gap-3 sm:gap-4">
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
                <div>
                  <h3 style={{ color: "var(--navy-900)" }} className="text-sm sm:text-base font-bold">
                    Role Readiness: {insights?.match_score ?? 74}%
                  </h3>
                  <p style={{ color: "var(--text-muted)" }} className="text-xs max-w-xl mt-0.5 leading-relaxed">
                    {insights?.executive_summary ||
                      `High potential candidacy with ${missingCount} bridgeable engineering gaps.`}
                  </p>
                </div>
              </div>

              {/* Upper Body Action Buttons: Clean Copy & Download PDF */}
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 w-full sm:w-auto">
                <button
                  onClick={handleCopyMarkdown}
                  style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl border text-xs font-semibold shadow-2xs transition hover:bg-[var(--navy-50)] cursor-pointer"
                  title="Copy full analysis report"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[var(--strong)]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownloadPDF}
                  style={{ backgroundColor: "var(--teal-600)", color: "var(--surface)" }}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition hover:bg-[var(--teal-700)] cursor-pointer"
                  title="Download printable executive PDF dossier"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          )}

          {/* PHASE 2 REVIEW STATUS BAR: Clear bucket icons and text labels */}
          {activeSection === "review" && hitlReview && !finalOutput && (
            <div
              style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
              className="p-3.5 sm:p-5 rounded-[12px] border shadow-[0_1px_3px_rgba(15,31,61,0.08)] hover:shadow-[0_4px_12px_rgba(15,31,61,0.12)] transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
            >
              <div className="flex items-center gap-3">
                <div
                  style={{ backgroundColor: "var(--navy-50)", borderColor: "var(--border)", color: "var(--navy-900)" }}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shrink-0"
                >
                  <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--navy-900)]" />
                </div>
                <div>
                  <h3 style={{ color: "var(--navy-900)" }} className="text-xs sm:text-sm font-bold">
                    Phase 2: Human Verification Active
                  </h3>
                  <p style={{ color: "var(--text-muted)" }} className="text-[11px] sm:text-xs">
                    Refine skill classifications before final 48-hour roadmap and readiness scoring.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span
                  style={{ backgroundColor: "var(--missing-bg)", color: "var(--missing)", borderColor: "var(--missing-border)" }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold border"
                >
                  <span className="font-bold">✕</span>
                  <span>{hitlReview.missing.length} Missing</span>
                </span>
                <span
                  style={{ backgroundColor: "var(--weak-bg)", color: "var(--weak)", borderColor: "var(--weak-border)" }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold border"
                >
                  <span className="font-bold">~</span>
                  <span>{hitlReview.weak.length} Weak</span>
                </span>
                <span
                  style={{ backgroundColor: "var(--strong-bg)", color: "var(--strong)", borderColor: "var(--strong-border)" }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold border"
                >
                  <span className="font-bold">✓</span>
                  <span>{hitlReview.strong.length} Strong</span>
                </span>
              </div>
            </div>
          )}

          {/* SECTION 1: SOURCE INGESTION */}
          {activeSection === "sources" && (
            <div className="flex flex-col gap-4 sm:gap-6">
              <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-stretch">
                {/* Job Description Panel */}
                <div
                  style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                  className="flex-1 min-w-0 flex flex-col h-full rounded-[12px] border shadow-[0_1px_3px_rgba(15,31,61,0.08)] hover:shadow-[0_4px_12px_rgba(15,31,61,0.12)] transition-shadow overflow-hidden focus-within:border-[var(--teal-600)] focus-within:ring-2 focus-within:ring-[var(--teal-600)]/20"
                >
                  <div style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }} className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 border-b">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-[var(--navy-900)] shrink-0" />
                      <span style={{ color: "var(--navy-900)" }} className="text-xs font-bold uppercase tracking-wider">
                        Target Job Description
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {companyName && (
                        <span
                          style={{ backgroundColor: "var(--navy-50)", color: "var(--navy-900)", borderColor: "var(--border)" }}
                          className="text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md border truncate max-w-[100px] sm:max-w-none"
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

                  {/* URL Ingestion Input Bar (LinkedIn, Greenhouse, Lever, Company URL) */}
                  <div style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }} className="p-2.5 sm:p-3 border-b flex flex-col gap-2.5">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-500">
                          <Globe className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        </div>
                        <input
                          type="url"
                          value={jobUrl}
                          onChange={(e) => setJobUrl(e.target.value)}
                          placeholder="Paste LinkedIn, Greenhouse, Lever, or Company URL..."
                          style={{ backgroundColor: "var(--bg)", color: "var(--text-primary)", borderColor: "var(--border)" }}
                          className="w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-[var(--teal-600)]/40 focus:border-[var(--teal-600)] placeholder:text-[var(--text-muted)]/70 font-sans"
                        />
                      </div>
                      {/* Outlined Teal Fetch & Contextualize Button */}
                      <button
                        type="button"
                        disabled={fetchingUrl || !jobUrl.trim()}
                        onClick={() => handleFetchJobUrl()}
                        style={{ borderColor: "var(--teal-600)", color: "var(--teal-600)" }}
                        className="px-3.5 py-1.5 rounded-xl border bg-transparent hover:bg-[var(--teal-600)]/10 text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0"
                      >
                        {fetchingUrl ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Fetching Platform...</span>
                          </>
                        ) : (
                          <>
                            <Link2 className="w-3.5 h-3.5" />
                            <span>Fetch & Contextualize</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Active Connected Company Context Banner (Bulleted & Non-redundant) */}
                    {companyName && (
                      <div
                        style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
                        className="p-2.5 sm:p-3 rounded-xl border text-xs shadow-2xs"
                      >
                        <div style={{ borderColor: "var(--border)" }} className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b">
                          <div style={{ color: "var(--navy-900)" }} className="flex items-center gap-1.5 font-bold">
                            <Building2 className="w-3.5 h-3.5 text-[var(--navy-900)] shrink-0" />
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
                            <Check className="w-3 h-3 text-[var(--strong)]" />
                            <span>Context Anchored</span>
                          </span>
                          <span style={{ color: "var(--text-muted)" }} className="font-normal hidden sm:inline">
                            Grounds "Why Company Wants" on next phase
                          </span>
                        </div>
                      </div>
                    )}

                    {urlFetchSuccessMsg && !companyName && (
                      <div className="text-[11px] text-[var(--strong)] flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-[var(--strong)]" />
                        <span>{urlFetchSuccessMsg}</span>
                      </div>
                    )}
                  </div>

                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste target job requirements and duties here, or fetch directly from a URL above..."
                    style={{ backgroundColor: "var(--bg)", color: "var(--text-primary)" }}
                    className="flex-1 w-full p-3 sm:p-4 text-xs sm:text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--teal-600)]/40 focus:border-[var(--teal-600)] resize-none placeholder:text-[var(--text-muted)]/70 min-h-[260px] sm:min-h-[340px] lg:min-h-[420px]"
                  />
                </div>

                {/* Candidate Resume Panel: Tailored width so resume covers full width and height is scrollable */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={onDropFile}
                  style={{ backgroundColor: "var(--surface)", borderColor: isDragOver ? "var(--teal-600)" : "var(--border)" }}
                  className="w-full lg:w-[410px] xl:w-[430px] shrink-0 flex flex-col h-full rounded-[12px] border transition-all shadow-[0_1px_3px_rgba(15,31,61,0.08)] hover:shadow-[0_4px_12px_rgba(15,31,61,0.12)] overflow-hidden focus-within:border-[var(--teal-600)]"
                >
                  {/* Clean, Streamlined Header */}
                  <div style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }} className="flex items-center justify-between px-3.5 sm:px-4 py-2 sm:py-2.5 border-b">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[var(--navy-900)] shrink-0" />
                      <span style={{ color: "var(--navy-900)" }} className="text-xs font-bold uppercase tracking-wider">
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
                                backgroundColor: pdfViewMode === "preview" ? "var(--navy-900)" : "transparent",
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
                                backgroundColor: pdfViewMode === "text" ? "var(--navy-900)" : "transparent",
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
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--teal-600)]" />
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

                  {/* Full Width & Breadth Resume PDF Viewer (Zero Grey Canvas) */}
                  {pdfUrl && pdfViewMode === "preview" ? (
                    <div
                      style={{ borderColor: "var(--border)" }}
                      className="flex-1 w-full flex flex-col relative border-b overflow-hidden bg-[var(--surface)]"
                    >
                      <ResumePdfViewer pdfUrl={pdfUrl} />
                    </div>
                  ) : (
                    <textarea
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      placeholder="Paste candidate experience or drop a PDF resume file directly here..."
                      style={{ backgroundColor: "var(--bg)", color: "var(--text-primary)" }}
                      className="flex-1 w-full p-3 sm:p-4 text-xs sm:text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--teal-600)]/40 focus:border-[var(--teal-600)] resize-none placeholder:text-[var(--text-muted)]/70 min-h-[260px] sm:min-h-[340px] lg:min-h-[420px]"
                    />
                  )}

                  {/* Clean Footer with Document Status */}
                  <div style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-muted)" }} className="px-3.5 sm:px-4 py-2 border-t text-[11px] flex items-center justify-between gap-2">
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
                className="p-3.5 sm:p-4 rounded-[12px] border shadow-[0_1px_3px_rgba(15,31,61,0.08)] hover:shadow-[0_4px_12px_rgba(15,31,61,0.12)] transition-shadow flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4"
              >
                <div style={{ color: "var(--text-muted)" }} className="flex items-center gap-2 text-xs">
                  <span style={{ backgroundColor: "var(--teal-600)" }} className="w-2 h-2 rounded-full shadow-[0_0_6px_rgba(15,118,110,0.6)] shrink-0"></span>
                  <span className="truncate">
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
          )}

          {/* SECTION 2: SKILL RECLASSIFICATION (MIDDLE PAGE / HITL REVIEW) */}
          {activeSection === "review" && hitlReview && (
            <section
              style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
              className="border rounded-[12px] p-4 sm:p-6 lg:p-8 shadow-[0_1px_3px_rgba(15,31,61,0.08)] relative overflow-hidden transition-all"
            >
              {/* Top Navy Accent Line */}
              <div style={{ backgroundColor: "var(--navy-900)" }} className="absolute top-0 left-0 right-0 h-1.5" />

              {/* Panel Title & Status */}
              <div style={{ borderColor: "var(--border)" }} className="flex items-center justify-between flex-wrap gap-4 pb-4 sm:pb-5 mb-5 sm:mb-6 border-b">
                <div className="flex items-center gap-3">
                  <div
                    style={{ backgroundColor: "var(--navy-50)", borderColor: "var(--border)", color: "var(--navy-900)" }}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shadow-xs shrink-0"
                  >
                    <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--navy-900)]" />
                  </div>
                  <div>
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
                    <p style={{ color: "var(--text-muted)" }} className="text-xs mt-0.5">
                      Review AI-detected skills. Reclassify between categories using the interactive chips or provide custom natural language guidance below.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Refined Columns for Moving Skills with Clear Bucket Icons and Colors */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-6">
                {/* Column 1: Missing Skills (✕ Missing) */}
                <div
                  style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
                  className="p-3.5 sm:p-4.5 rounded-[12px] border flex flex-col justify-between shadow-2xs"
                >
                  <div>
                    <div style={{ borderColor: "var(--border)" }} className="flex items-center justify-between pb-2.5 mb-2.5 border-b">
                      <div className="flex items-center gap-2 text-[var(--missing)] text-xs font-bold uppercase tracking-wider">
                        <span className="font-black text-sm">✕</span>
                        <span>Missing Gaps</span>
                      </div>
                      <span
                        style={{ backgroundColor: "var(--missing-bg)", color: "var(--missing)", borderColor: "var(--missing-border)" }}
                        className="px-2 py-0.5 rounded-full text-xs font-bold border"
                      >
                        {hitlReview.missing.length}
                      </span>
                    </div>
                    <p style={{ color: "var(--text-muted)" }} className="text-[11px] mb-3">
                       Zero evidence in submitted resume. Requires 48-hr proof project.
                    </p>

                    <div className="flex flex-col gap-2">
                      {hitlReview.missing.length > 0 ? (
                        hitlReview.missing.map((s, i) => (
                          <div
                            key={i}
                            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                            className="p-2 sm:p-2.5 border rounded-lg shadow-2xs flex items-center justify-between gap-1.5 sm:gap-2 group hover:border-[var(--navy-900)] transition"
                          >
                            <span style={{ color: "var(--navy-900)" }} className="text-xs font-semibold font-mono truncate min-w-0 flex-1">
                              {s}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleMoveSkill(s, "missing", "weak")}
                                title="Promote to Weak / Needs Proof"
                                style={{ backgroundColor: "var(--surface)", color: "var(--weak)", borderColor: "var(--border)" }}
                                className="px-2 py-0.5 rounded-md text-[10px] font-semibold border transition cursor-pointer flex items-center gap-0.5 hover:bg-[var(--weak-bg)]"
                              >
                                <span>~ Weak</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleMoveSkill(s, "missing", "strong")}
                                title="Promote to Verified Strong"
                                style={{ backgroundColor: "var(--surface)", color: "var(--strong)", borderColor: "var(--border)" }}
                                className="px-2 py-0.5 rounded-md text-[10px] font-semibold border transition cursor-pointer flex items-center gap-0.5 hover:bg-[var(--strong-bg)]"
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
                          No missing gaps detected
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Column 2: Weak / Needs Proof (~ Weak) */}
                <div
                  style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
                  className="p-3.5 sm:p-4.5 rounded-[12px] border flex flex-col justify-between shadow-2xs"
                >
                  <div>
                    <div style={{ borderColor: "var(--border)" }} className="flex items-center justify-between pb-2.5 mb-2.5 border-b">
                      <div className="flex items-center gap-2 text-[var(--weak)] text-xs font-bold uppercase tracking-wider">
                        <span className="font-black text-sm">~</span>
                        <span>Needs Proof</span>
                      </div>
                      <span
                        style={{ backgroundColor: "var(--weak-bg)", color: "var(--weak)", borderColor: "var(--weak-border)" }}
                        className="px-2 py-0.5 rounded-full text-xs font-bold border"
                      >
                        {hitlReview.weak.length}
                      </span>
                    </div>
                    <p style={{ color: "var(--text-muted)" }} className="text-[11px] mb-3">
                      Mentioned superficially; needs quantified XYZ bullet rewrites.
                    </p>

                    <div className="flex flex-col gap-2">
                      {hitlReview.weak.length > 0 ? (
                        hitlReview.weak.map((s, i) => (
                          <div
                            key={i}
                            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                            className="p-2 sm:p-2.5 border rounded-lg shadow-2xs flex items-center justify-between gap-1.5 sm:gap-2 group hover:border-[var(--navy-900)] transition"
                          >
                            <span style={{ color: "var(--navy-900)" }} className="text-xs font-semibold font-mono truncate min-w-0 flex-1">
                              {s}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleMoveSkill(s, "weak", "missing")}
                                title="Demote to Missing Gap"
                                style={{ backgroundColor: "var(--surface)", color: "var(--missing)", borderColor: "var(--border)" }}
                                className="px-2 py-0.5 rounded-md text-[10px] font-semibold border transition cursor-pointer flex items-center gap-0.5 hover:bg-[var(--missing-bg)]"
                              >
                                <span>✕ Gap</span>
                                <ArrowDownRight className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleMoveSkill(s, "weak", "strong")}
                                title="Promote to Verified Strong"
                                style={{ backgroundColor: "var(--surface)", color: "var(--strong)", borderColor: "var(--border)" }}
                                className="px-2 py-0.5 rounded-md text-[10px] font-semibold border transition cursor-pointer flex items-center gap-0.5 hover:bg-[var(--strong-bg)]"
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
                          No weak skills detected
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Column 3: Verified Strong (✓ Strong) */}
                <div
                  style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
                  className="p-3.5 sm:p-4.5 rounded-[12px] border flex flex-col justify-between shadow-2xs md:col-span-2 lg:col-span-1"
                >
                  <div>
                    <div style={{ borderColor: "var(--border)" }} className="flex items-center justify-between pb-2.5 mb-2.5 border-b">
                      <div className="flex items-center gap-2 text-[var(--strong)] text-xs font-bold uppercase tracking-wider">
                        <span className="font-black text-sm">✓</span>
                        <span>Verified Strong</span>
                      </div>
                      <span
                        style={{ backgroundColor: "var(--strong-bg)", color: "var(--strong)", borderColor: "var(--strong-border)" }}
                        className="px-2 py-0.5 rounded-full text-xs font-bold border"
                      >
                        {hitlReview.strong.length}
                      </span>
                    </div>
                    <p style={{ color: "var(--text-muted)" }} className="text-[11px] mb-3">
                      Directly validated by strong evidence and hands-on projects.
                    </p>

                    <div className="flex flex-col gap-2">
                      {hitlReview.strong.length > 0 ? (
                        hitlReview.strong.map((s, i) => (
                          <div
                            key={i}
                            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                            className="p-2 sm:p-2.5 border rounded-lg shadow-2xs flex items-center justify-between gap-1.5 sm:gap-2 group hover:border-[var(--navy-900)] transition"
                          >
                            <span style={{ color: "var(--navy-900)" }} className="text-xs font-semibold font-mono truncate min-w-0 flex-1">
                              {s}
                            </span>
                            <button
                              onClick={() => handleMoveSkill(s, "strong", "weak")}
                              title="Demote to Weak / Needs Proof"
                              style={{ backgroundColor: "var(--surface)", color: "var(--weak)", borderColor: "var(--border)" }}
                              className="px-2 py-0.5 rounded-md text-[10px] font-semibold border transition cursor-pointer flex items-center gap-0.5 shrink-0 hover:bg-[var(--weak-bg)]"
                            >
                              <span>~ Weak</span>
                              <ArrowDownRight className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div
                          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-muted)" }}
                          className="p-4 rounded-lg border border-dashed text-center text-xs italic"
                        >
                          No strong skills verified yet
                        </div>
                      )}
                    </div>
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
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--navy-900)]" />
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
                      <span>Confirm & Generate 48-Hour Roadmap</span>
                    </>
                  )}
                </button>
              </div>
            </section>
          )}

          {/* SECTION 3: 48-HOUR ROADMAP (ALL 3 VERTICAL CARDS IN HARMONIOUS ANALYTICAL STYLE) */}
          {activeSection === "roadmap" && finalOutput && (
            <div className="space-y-6">
              {insights?.missing_roadmap && insights.missing_roadmap.length > 0 ? (
                insights.missing_roadmap.map((item, idx) => {
                  const isProjectCopied = copiedProjectKey === idx;
                  return (
                    <div
                      key={idx}
                      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                      className="rounded-[12px] border overflow-hidden shadow-[0_1px_3px_rgba(15,31,61,0.08)] hover:shadow-[0_4px_12px_rgba(15,31,61,0.12)] transition-all"
                    >
                      {/* Skill Card Header */}
                      <div
                        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                        className="p-3.5 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3">
                          <span
                            style={{ backgroundColor: "var(--navy-900)", color: "var(--surface)" }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 style={{ color: "var(--navy-900)" }} className="text-sm sm:text-base font-bold font-mono">
                                {item.skill}
                              </h4>
                              <span
                                style={{ backgroundColor: "var(--missing-bg)", color: "var(--missing)", borderColor: "var(--missing-border)" }}
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider"
                              >
                                ✕ Gap Deliverable
                              </span>
                            </div>
                            <p style={{ color: "var(--text-muted)" }} className="text-xs mt-0.5">
                              Addressed via 48-hr proof deliverable & experience anchor
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const bridge = getBridgeData(item.skill, idx, item.transferable_from);
                            handleCopyProject(
                              idx,
                              `48-Hour PoC Project for ${item.skill}:\n${item.bridge_project}\n\nResume Anchor Project:\n${bridge.project}\n\nResume Bridge Angle:\n${bridge.pitch}`
                            );
                          }}
                          style={{
                            backgroundColor: isProjectCopied ? "var(--navy-50)" : "var(--surface)",
                            borderColor: isProjectCopied ? "var(--strong)" : "var(--border)",
                            color: isProjectCopied ? "var(--strong)" : "var(--text-primary)",
                          }}
                          className="self-end sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer hover:bg-[var(--navy-50)] shadow-2xs shrink-0"
                        >
                          {isProjectCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[var(--strong)]" />
                              <span>Copied PoC</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                              <span>Copy Roadmap</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* 3 VERTICAL CARDS: UNIFIED ANALYTICAL STYLING */}
                      <div className="p-3.5 sm:p-5 grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4.5">
                        {/* Vertical Card 1: Why Company Wants This (Context Grounded) */}
                        <div
                          style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
                          className="p-3.5 sm:p-4.5 rounded-[12px] border flex flex-col justify-between shadow-2xs hover:border-[var(--navy-900)] transition"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2.5">
                              <div className="flex items-center gap-2">
                                <div
                                  style={{ backgroundColor: "var(--surface)", color: "var(--navy-900)", borderColor: "var(--border)" }}
                                  className="w-6 h-6 rounded-lg border flex items-center justify-center shrink-0"
                                >
                                  <Building2 className="w-3.5 h-3.5 text-[var(--navy-900)]" />
                                </div>
                                <span style={{ color: "var(--navy-900)" }} className="text-xs font-bold uppercase tracking-wider">
                                  {companyName || insights?.company_name
                                    ? `Why ${(companyName || insights?.company_name)?.toUpperCase()} Wants`
                                    : "Why Company Wants"}
                                </span>
                              </div>
                              {(companyName || insights?.company_name) && (
                                <span
                                  style={{ backgroundColor: "var(--surface)", color: "var(--navy-700)", borderColor: "var(--border)" }}
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0"
                                >
                                  {sourcePlatform || "URL Linked"}
                                </span>
                              )}
                            </div>

                            {item.company_keywords && item.company_keywords.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-3">
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

                          <div style={{ borderColor: "var(--border)", color: "var(--text-muted)" }} className="pt-3 mt-3 border-t text-[10px] font-semibold uppercase tracking-wider flex items-center justify-between">
                            <span>
                              {companyName || insights?.company_name
                                ? `${companyName || insights?.company_name} Intent`
                                : "Hiring Manager Intent"}
                            </span>
                            {(companyName || insights?.company_name) && (
                              <span className="text-[9px] font-bold text-[var(--strong)] flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5 text-[var(--strong)]" />
                                <span>Platform Grounded</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Vertical Card 2: 48-Hour Proof-of-Concept Project */}
                        <div
                          style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
                          className="p-3.5 sm:p-4.5 rounded-[12px] border flex flex-col justify-between shadow-2xs hover:border-[var(--navy-900)] transition"
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-2.5">
                              <div
                                style={{ backgroundColor: "var(--surface)", color: "var(--navy-900)", borderColor: "var(--border)" }}
                                className="w-6 h-6 rounded-lg border flex items-center justify-center shrink-0"
                              >
                                <Flame className="w-3.5 h-3.5 text-[var(--navy-900)]" />
                              </div>
                              <span style={{ color: "var(--navy-900)" }} className="text-xs font-bold uppercase tracking-wider">
                                48-Hour PoC Project
                              </span>
                            </div>

                            {item.project_keywords && item.project_keywords.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-3">
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

                            {/* Structured Productive Engineering Project Blueprint */}
                            <div className="space-y-2 text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed font-sans">
                              <p className="font-medium">
                                {item.bridge_project}
                              </p>
                            </div>
                          </div>

                          <div style={{ borderColor: "var(--border)", color: "var(--text-muted)" }} className="pt-3 mt-3 border-t text-[10px] font-semibold uppercase tracking-wider flex items-center justify-between">
                            <span>Deliverable Project</span>
                            <span style={{ color: "var(--navy-900)" }} className="font-mono font-bold">48 Hrs</span>
                          </div>
                        </div>

                        {/* Vertical Card 3: Resume Bridge (Real Resume Projects & Directly Editable) */}
                        {(() => {
                          const bridge = getBridgeData(item.skill, idx, item.transferable_from);
                          return (
                            <div
                              style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
                              className="p-3.5 sm:p-4.5 rounded-[12px] border flex flex-col justify-between shadow-2xs hover:border-[var(--navy-900)] transition"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                  <div className="flex items-center gap-2">
                                    <div
                                      style={{ backgroundColor: "var(--surface)", color: "var(--navy-900)", borderColor: "var(--border)" }}
                                      className="w-6 h-6 rounded-lg border flex items-center justify-center shrink-0"
                                    >
                                      <Award className="w-3.5 h-3.5 text-[var(--navy-900)]" />
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
                                    style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--navy-900)" }}
                                    className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border transition cursor-pointer hover:bg-[var(--navy-50)]"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    <span>{bridge.isEditing ? "Close" : "Edit Bridge"}</span>
                                  </button>
                                </div>

                                {bridge.isEditing ? (
                                  <div className="space-y-3 pt-1">
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
                                        placeholder="e.g. Shivay Intelligence AI Internship / FastAPI Backend"
                                        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                                        className="w-full text-xs p-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[var(--teal-600)]/40 focus:border-[var(--teal-600)]"
                                      />
                                    </div>

                                    <div>
                                      <label style={{ color: "var(--text-muted)" }} className="block text-[10px] font-bold uppercase tracking-wider mb-1">
                                        Bridge Pitch / Narrative:
                                      </label>
                                      <textarea
                                        rows={3}
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
                                        Reset to Default
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
                                        <span>Save Changes</span>
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {/* Real Resume Project Anchor Badge */}
                                    <div
                                      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                                      className="mb-2.5 p-2 rounded-xl border"
                                    >
                                      <div style={{ color: "var(--navy-900)" }} className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 mb-0.5">
                                        <FolderGit2 className="w-3 h-3 text-[var(--navy-900)]" />
                                        <span>Resume Anchor:</span>
                                      </div>
                                      <p style={{ color: "var(--text-primary)" }} className="text-xs font-semibold leading-snug line-clamp-2">
                                        {bridge.project}
                                      </p>
                                    </div>

                                    {item.bridge_keywords && item.bridge_keywords.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mb-2.5">
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

                              <div style={{ borderColor: "var(--border)", color: "var(--text-muted)" }} className="pt-3 mt-3 border-t text-[10px] font-semibold uppercase tracking-wider flex items-center justify-between">
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
          )}

          {/* SECTION 4: RESUME BULLETS */}
          {activeSection === "bullets" && finalOutput && (
            <div className="space-y-4">
              {insights?.weak_improvements && insights.weak_improvements.length > 0 ? (
                insights.weak_improvements.map((item, idx) => (
                  <div
                    key={idx}
                    style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                    className="p-4 sm:p-5 rounded-[12px] border shadow-[0_1px_3px_rgba(15,31,61,0.08)] hover:shadow-[0_4px_12px_rgba(15,31,61,0.12)] space-y-3 transition-shadow"
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
                            <div className="flex items-start gap-2.5 flex-grow">
                              <span style={{ color: "var(--navy-900)" }} className="font-bold mt-0.5 shrink-0">•</span>
                              <p style={{ color: "var(--text-primary)" }} className="text-xs sm:text-sm opacity-90 leading-relaxed font-sans">
                                {bullet}
                              </p>
                            </div>

                            <button
                              onClick={() => handleCopyBullet(bulletKey, bullet)}
                              style={{
                                backgroundColor: isBulletCopied ? "var(--navy-50)" : "var(--surface)",
                                borderColor: isBulletCopied ? "var(--strong)" : "var(--border)",
                                color: isBulletCopied ? "var(--strong)" : "var(--text-primary)",
                              }}
                              className="self-end sm:self-auto flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer shrink-0 hover:bg-[var(--navy-50)] shadow-2xs"
                            >
                              {isBulletCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-[var(--strong)]" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />
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
          )}

          {/* SECTION 5: INTERVIEW DEFENSE (Clicking ANYWHERE in question card opens/closes answer) */}
          {activeSection === "interview" && finalOutput && (
            <div className="space-y-4">
              {insights?.interview_questions && insights.interview_questions.length > 0 ? (
                insights.interview_questions.map((q, idx) => {
                  const isCopied = copiedQuestionKey === idx;
                  const isExpanded = !!expandedQuestions[idx];

                  return (
                    <div
                      key={idx}
                      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                      className="rounded-[12px] border overflow-hidden shadow-[0_1px_3px_rgba(15,31,61,0.08)] hover:shadow-[0_4px_12px_rgba(15,31,61,0.12)] transition-shadow"
                    >
                      {/* Clicking ANYWHERE in this header row toggles open/close */}
                      <div
                        onClick={() => toggleQuestionExpanded(idx)}
                        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
                        className="p-3.5 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-3 hover:bg-[var(--navy-50)] transition cursor-pointer select-none border-b"
                      >
                        <div className="flex items-start gap-2.5 sm:gap-3 flex-grow min-w-0">
                          <span
                            style={{ backgroundColor: "var(--navy-50)", color: "var(--navy-900)", borderColor: "var(--border)" }}
                            className="w-6 h-6 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
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
                              backgroundColor: isCopied ? "var(--navy-50)" : "var(--surface)",
                              borderColor: isCopied ? "var(--strong)" : "var(--border)",
                              color: isCopied ? "var(--strong)" : "var(--text-primary)",
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer hover:bg-[var(--navy-50)] shadow-2xs"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-[var(--strong)]" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />
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
                            <Lightbulb className="w-3.5 h-3.5 text-[var(--navy-900)]" />
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
          )}
        </main>
      </div>
    </div>
  );
}