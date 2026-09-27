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
  XCircle,
  Zap,
} from "lucide-react";

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

  // Dynamically detect role and candidate name from documents (no hardcoded benchmark boxes)
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
    md += `### Missing Skills (${finalOutput.missing.length})\n`;
    md += finalOutput.missing.length > 0
      ? finalOutput.missing.map((s) => `- ${s}`).join("\n") + "\n\n"
      : "_None detected_\n\n";

    md += `### Weak Skills (${finalOutput.weak.length})\n`;
    md += finalOutput.weak.length > 0
      ? finalOutput.weak.map((s) => `- ${s}`).join("\n") + "\n\n"
      : "_None detected_\n\n";

    md += `### Strong Skills (${finalOutput.strong.length})\n`;
    md += finalOutput.strong.length > 0
      ? finalOutput.strong.map((s) => `- ${s}`).join("\n") + "\n\n"
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

    const reportHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Career Gap Analysis & Roadmap - ${detectedRole}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1c1917; max-width: 820px; margin: 0 auto; line-height: 1.5; }
            h1 { font-size: 22px; margin-bottom: 4px; color: #78350f; font-weight: 800; }
            .meta { color: #78716c; font-size: 12px; margin-top: 0; margin-bottom: 20px; }
            .score-box { background: #fdfbf7; border: 1px solid #e7dfd5; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
            .score-title { font-size: 16px; font-weight: bold; color: #78350f; margin-bottom: 4px; }
            h2 { font-size: 15px; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #e7dfd5; padding-bottom: 6px; color: #1c1917; text-transform: uppercase; letter-spacing: 0.5px; }
            .card { border: 1px solid #e7dfd5; border-radius: 10px; padding: 14px; margin-bottom: 16px; background: #ffffff; page-break-inside: avoid; }
            .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 10px; }
            .grid-item { background: #faf8f5; padding: 10px; border-radius: 8px; font-size: 11px; }
            .grid-item strong { display: block; font-size: 10px; text-transform: uppercase; color: #78350f; margin-bottom: 4px; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background: #fef9ee; color: #92400e; border: 1px solid #fde68a; margin-right: 4px; }
            ul { margin: 6px 0; padding-left: 20px; font-size: 12px; }
            li { margin-bottom: 4px; }
            @media print { body { padding: 16px; } }
          </style>
        </head>
        <body>
          <h1>Technical Gap Analysis & Career Roadmap</h1>
          <div class="meta">Role: <strong>${detectedRole}</strong>${companyName || insights?.company_name ? ` | Company: <strong>${companyName || insights?.company_name}</strong>` : ""} | Candidate: <strong>${detectedCandidateName}</strong></div>

          <div class="score-box">
            <div class="score-title">Role Readiness Score: ${insights?.match_score ?? 74}%</div>
            ${(companyContext || insights?.company_context) ? `<p style="font-size: 11px; margin: 4px 0 6px 0; color: #78350f; font-weight: 600;">🏢 Company Mission: ${companyContext || insights?.company_context}</p>` : ""}
            <p style="font-size: 12px; margin: 4px 0 0 0; color: #44403c;">${insights?.executive_summary || ""}</p>
          </div>

          <h2>1. 48-Hour Missing Skills Roadmap</h2>
          ${(insights?.missing_roadmap || []).map((item, idx) => {
            const bridge = getBridgeData(item.skill, idx, item.transferable_from);
            return `
            <div class="card">
              <div style="font-weight: bold; font-size: 13px; color: #1c1917;">${idx + 1}. ${item.skill}</div>
              <div class="grid">
                <div class="grid-item">
                  <strong>Why Company Wants</strong>
                  <p style="margin: 0; color: #44403c;">${item.why_it_matters}</p>
                </div>
                <div class="grid-item" style="background: #ffffff; border: 1px solid #e7dfd5;">
                  <strong>48-Hour PoC Deliverable</strong>
                  <p style="margin: 0; color: #1c1917; font-weight: 500;">${item.bridge_project}</p>
                </div>
                <div class="grid-item">
                  <strong>Resume Bridge (${bridge.project})</strong>
                  <p style="margin: 0; color: #44403c;">${bridge.pitch}</p>
                </div>
              </div>
            </div>
          `;}).join("")}

          <h2>2. Recommended Resume Bullet Rewrites</h2>
          ${(insights?.weak_improvements || []).map(w => `
            <div class="card">
              <span class="badge">${w.skill}</span>
              <ul>
                ${w.recommended_bullets.map(b => `<li>${b}</li>`).join("")}
              </ul>
            </div>
          `).join("")}

          <h2>3. High-Probability Interview Questions</h2>
          ${(insights?.interview_questions || []).map((q, idx) => `
            <div class="card">
              <div style="font-weight: bold; font-size: 12px; margin-bottom: 4px;">Q${idx + 1}: ${q.question}</div>
              <div style="font-size: 11px; color: #57534e;"><strong>Strategy:</strong> ${q.suggested_talking_points}</div>
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
  const isAuditPending = !!hitlReview && !finalOutput;
  const isCompleted = !!finalOutput;

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-stone-900 font-sans selection:bg-amber-200/60 selection:text-amber-950 pb-20 relative">
      {/* Warm Parchment Ambient Radial Glows */}
      <div className="absolute top-0 left-1/4 w-[550px] h-[350px] bg-amber-200/15 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-20 right-1/4 w-[500px] h-[350px] bg-amber-100/20 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Top Header (Clean: No Copy/Download buttons in header) */}
      <header className="sticky top-0 z-30 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#E7DFD5] px-4 sm:px-8 py-3.5 mb-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#78350F] text-amber-50 flex items-center justify-center shadow-xs">
              <Coffee className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-stone-900">
                  Resume Gap Analyzer
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-[#F0EAE1] text-amber-900 border border-[#DDD1C2]">
                  LangGraph Agentic Audit
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium">
                Targeted skill diagnosis, 48-hr bridge roadmap & interview defense
              </p>
            </div>
          </div>

          {/* Top Actions: Status and New Audit */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFE9DF] border border-[#DDD2C2] text-xs font-medium text-stone-800">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>AI Engine Ready</span>
            </div>

            {(finalOutput || hitlReview) && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
                <span>New Audit</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-8 mb-6">
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300/80 text-amber-950 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-grow">
              <p className="font-semibold text-amber-950">System Notice</p>
              <p className="mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-stone-400 hover:text-stone-700 text-xs font-bold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SIDE-BY-SIDE LAYOUT: Left Sidebar Navigation + Right Content Workspace     */}
      {/* ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT SIDEBAR NAVIGATION DRAWER */}
        <aside className="w-full lg:w-60 shrink-0 bg-white border border-[#E7DFD5] rounded-3xl shadow-xs overflow-hidden lg:sticky lg:top-20">
          {/* Target Profile Card (Auto-detected from JD and Resume) */}
          <div className="p-4 border-b border-[#EFE8DD] bg-[#FAF8F5]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-200">
              Target Role
            </span>
            <h3 className="text-xs sm:text-sm font-bold text-stone-900 mt-1.5 leading-snug truncate">
              {detectedRole}
            </h3>
            {(companyName || insights?.company_name) && (
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 mt-1 truncate">
                <Building2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span className="truncate">{companyName || insights?.company_name}</span>
                {sourcePlatform && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100/80 text-amber-900 font-semibold shrink-0">
                    {sourcePlatform}
                  </span>
                )}
              </div>
            )}
            <p className="text-[11px] text-stone-500 font-medium truncate mt-0.5">
              Candidate: {detectedCandidateName}
            </p>
          </div>

          {/* Navigation Items */}
          <nav className="p-2 space-y-1 text-xs">
            <button
              onClick={() => setActiveSection("sources")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition cursor-pointer font-medium ${
                activeSection === "sources"
                  ? "bg-[#78350F] text-white shadow-xs font-semibold"
                  : "text-stone-700 hover:bg-stone-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileUp className="w-4 h-4" />
                <span>Source Materials</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                  activeSection === "sources"
                    ? "bg-[#5E2B0C] text-amber-100"
                    : "bg-stone-100 text-stone-500"
                }`}
              >
                Inputs
              </span>
            </button>

            <button
              onClick={() => (hitlReview || finalOutput) && setActiveSection("review")}
              disabled={!hitlReview && !finalOutput}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition cursor-pointer font-medium ${
                !hitlReview && !finalOutput ? "opacity-40 cursor-not-allowed text-stone-400" : ""
              } ${
                activeSection === "review"
                  ? "bg-[#78350F] text-white shadow-xs font-semibold"
                  : "text-stone-700 hover:bg-stone-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <TableProperties className="w-4 h-4" />
                <span>Skill Verification</span>
              </div>
              {(hitlReview || finalOutput) && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    activeSection === "review"
                      ? "bg-[#5E2B0C] text-amber-100"
                      : "bg-[#FDF2F0] text-[#991B1B] border border-[#FCA5A5]"
                  }`}
                >
                  {missingCount} Gaps
                </span>
              )}
            </button>

            <button
              onClick={() => finalOutput && setActiveSection("roadmap")}
              disabled={!finalOutput}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition cursor-pointer font-medium ${
                !finalOutput ? "opacity-40 cursor-not-allowed text-stone-400" : ""
              } ${
                activeSection === "roadmap"
                  ? "bg-[#78350F] text-white shadow-xs font-semibold"
                  : "text-stone-700 hover:bg-stone-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Target className="w-4 h-4" />
                <span>48-Hour Roadmap</span>
              </div>
              {insights?.missing_roadmap && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    activeSection === "roadmap"
                      ? "bg-[#5E2B0C] text-amber-100"
                      : "bg-[#FEF9EE] text-[#92400E] border border-[#FDE68A]"
                  }`}
                >
                  {insights.missing_roadmap.length} PoCs
                </span>
              )}
            </button>

            <button
              onClick={() => finalOutput && setActiveSection("bullets")}
              disabled={!finalOutput}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition cursor-pointer font-medium ${
                !finalOutput ? "opacity-40 cursor-not-allowed text-stone-400" : ""
              } ${
                activeSection === "bullets"
                  ? "bg-[#78350F] text-white shadow-xs font-semibold"
                  : "text-stone-700 hover:bg-stone-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Wand2 className="w-4 h-4" />
                <span>Resume Bullets</span>
              </div>
              {weakCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    activeSection === "bullets"
                      ? "bg-[#5E2B0C] text-amber-100"
                      : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {weakCount}
                </span>
              )}
            </button>

            <button
              onClick={() => finalOutput && setActiveSection("interview")}
              disabled={!finalOutput}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition cursor-pointer font-medium ${
                !finalOutput ? "opacity-40 cursor-not-allowed text-stone-400" : ""
              } ${
                activeSection === "interview"
                  ? "bg-[#78350F] text-white shadow-xs font-semibold"
                  : "text-stone-700 hover:bg-stone-50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4" />
                <span>Interview Defense</span>
              </div>
              {insights?.interview_questions && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    activeSection === "interview"
                      ? "bg-[#5E2B0C] text-amber-100"
                      : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {insights.interview_questions.length}
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
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E7DFD5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#FEF9EE] border border-amber-200 flex flex-col items-center justify-center text-amber-900 shrink-0 shadow-2xs">
                  <span className="text-xl font-black leading-none">
                    {insights?.match_score ?? 74}%
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-800 mt-0.5">
                    Match
                  </span>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-stone-900">
                    Role Readiness: {insights?.match_score ?? 74}%
                  </h3>
                  <p className="text-xs text-stone-500 max-w-xl mt-0.5 leading-relaxed">
                    {insights?.executive_summary ||
                      `High potential candidacy with ${missingCount} bridgeable engineering gaps.`}
                  </p>
                </div>
              </div>

              {/* Upper Body Action Buttons: Clean Copy & Download PDF */}
              <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                <button
                  onClick={handleCopyMarkdown}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
                  title="Copy full analysis report"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-stone-500" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#78350F] hover:bg-[#632C0D] text-xs font-semibold text-white transition cursor-pointer shadow-xs"
                  title="Download printable executive PDF dossier"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          )}

          {/* PHASE 2 REVIEW STATUS BAR: No premature match percentage! */}
          {activeSection === "review" && hitlReview && !finalOutput && (
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-[#E7DFD5] shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FEF9EE] border border-amber-200 flex items-center justify-center text-amber-800">
                  <UserCheck className="w-5 h-5 text-amber-800" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                    Phase 2: Human Verification Active
                  </h3>
                  <p className="text-xs text-stone-500">
                    Refine skill classifications before final 48-hour roadmap and readiness scoring.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FDF2F0] text-[#991B1B] border border-[#FCA5A5]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#991B1B]"></span>
                  {hitlReview.missing.length} Gaps
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FEF9EE] text-[#92400E] border border-[#FDE68A]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]"></span>
                  {hitlReview.weak.length} Needs Proof
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]"></span>
                  {hitlReview.strong.length} Verified
                </span>
              </div>
            </div>
          )}

          {/* SECTION 1: SOURCE INGESTION */}
          {activeSection === "sources" && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* Job Description Panel */}
                <div className="flex flex-col h-full rounded-3xl bg-white border border-[#E8DFD3] shadow-xs overflow-hidden focus-within:border-amber-600 focus-within:ring-2 focus-within:ring-amber-500/10 transition-all">
                  <div className="flex items-center justify-between px-4 py-3 bg-[#FAF8F5] border-b border-[#EFE8DD]">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-amber-800" />
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                        Target Job Description
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {companyName && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FEF9EE] text-[#92400E] border border-[#FDE68A]">
                          🏢 {companyName}
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-stone-400">
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
                          className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-[#EDE5D8] transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* URL Ingestion Input Bar (LinkedIn, Greenhouse, Lever, Company URL) */}
                  <div className="p-3 bg-[#FAF8F5]/80 border-b border-[#EFE8DD] flex flex-col gap-2.5">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                          <Globe className="w-3.5 h-3.5 text-amber-800" />
                        </div>
                        <input
                          type="url"
                          value={jobUrl}
                          onChange={(e) => setJobUrl(e.target.value)}
                          placeholder="Paste LinkedIn, Greenhouse, Lever, or Company URL..."
                          className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600 placeholder:text-stone-400 font-sans"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={fetchingUrl || !jobUrl.trim()}
                        onClick={() => handleFetchJobUrl()}
                        className="px-3.5 py-1.5 rounded-xl bg-[#78350F] hover:bg-[#632C0D] text-white text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
                      >
                        {fetchingUrl ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-200" />
                            <span>Fetching Platform...</span>
                          </>
                        ) : (
                          <>
                            <Link2 className="w-3.5 h-3.5 text-amber-200" />
                            <span>Fetch & Contextualize</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Active Connected Company Context Banner (Bulleted & Non-redundant) */}
                    {companyName && (
                      <div className="p-3 rounded-2xl bg-[#FEF9EE] border border-amber-200/90 text-xs shadow-2xs">
                        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-amber-200/70">
                          <div className="flex items-center gap-1.5 font-bold text-amber-950">
                            <Building2 className="w-3.5 h-3.5 text-amber-800" />
                            <span>Company Context: {companyName}</span>
                            {sourcePlatform && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100/90 text-amber-900 font-semibold border border-amber-200">
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
                            className="text-[10px] font-semibold text-amber-800 hover:text-amber-950 underline cursor-pointer"
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
                                <div key={bidx} className="flex items-start gap-2 text-[11px] text-stone-800 leading-snug">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-700 shrink-0 mt-1.5"></span>
                                  <span>{bullet}</span>
                                </div>
                              ))}
                          </div>
                        )}

                        <div className="pt-1.5 border-t border-amber-200/60 text-[10px] text-amber-900 font-semibold flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Context Anchored</span>
                          </span>
                          <span className="text-stone-500 font-normal">
                            Grounds "Why Company Wants" on next phase
                          </span>
                        </div>
                      </div>
                    )}

                    {urlFetchSuccessMsg && !companyName && (
                      <div className="text-[11px] text-emerald-800 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{urlFetchSuccessMsg}</span>
                      </div>
                    )}
                  </div>

                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste target job requirements and duties here, or fetch directly from a URL above..."
                    className="flex-1 w-full p-4 bg-transparent text-stone-800 text-xs sm:text-sm font-mono leading-relaxed focus:outline-none resize-none placeholder:text-stone-400 min-h-[420px]"
                  />
                </div>

                {/* Candidate Resume Panel with Proper Sized PDF Document Viewer */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={onDropFile}
                  className={`flex flex-col h-full rounded-3xl bg-white border transition-all shadow-xs overflow-hidden ${
                    isDragOver
                      ? "border-amber-600 ring-4 ring-amber-100 bg-amber-50/20"
                      : "border-[#E8DFD3] focus-within:border-amber-600"
                  }`}
                >
                  <div className="flex items-center justify-between px-4 py-2.5 bg-[#FAF8F5] border-b border-[#EFE8DD] flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-800" />
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                        Candidate Resume
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.txt,.md"
                        onChange={onFileInputChange}
                        className="hidden"
                      />

                      {/* PDF / Text View Mode Switcher if PDF is loaded */}
                      {pdfUrl && (
                        <div className="flex items-center gap-1 p-0.5 bg-stone-100 rounded-lg border border-stone-200 text-xs">
                          <button
                            type="button"
                            onClick={() => setPdfViewMode("preview")}
                            className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition cursor-pointer ${
                              pdfViewMode === "preview"
                                ? "bg-white text-stone-900 shadow-2xs"
                                : "text-stone-500 hover:text-stone-900"
                            }`}
                          >
                            PDF View
                          </button>
                          <button
                            type="button"
                            onClick={() => setPdfViewMode("text")}
                            className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition cursor-pointer ${
                              pdfViewMode === "text"
                                ? "bg-white text-stone-900 shadow-2xs"
                                : "text-stone-500 hover:text-stone-900"
                            }`}
                          >
                            Text View
                          </button>
                        </div>
                      )}

                      {/* PDF Upload Button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFile}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-stone-50 border border-stone-200 text-amber-900 text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
                      >
                        {uploadingFile ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" />
                            <span>Parsing...</span>
                          </>
                        ) : (
                          <>
                            <FileUp className="w-3.5 h-3.5 text-amber-700" />
                            <span>Upload PDF</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setResumeText("");
                          setUploadedFileName(null);
                          setPdfUrl(null);
                        }}
                        title="Clear resume"
                        className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-[#EDE5D8] transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Uploaded File Notification Tag */}
                  {uploadedFileName && (
                    <div className="px-4 py-1.5 bg-amber-50/70 border-b border-amber-100 flex items-center justify-between text-xs text-amber-900">
                      <div className="flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="font-semibold">Document:</span>
                        <span className="font-mono truncate max-w-[240px]">
                          {uploadedFileName}
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-500">
                        {resumeText.split(/\s+/).filter(Boolean).length} words extracted
                      </span>
                    </div>
                  )}

                  {/* PDF Document Viewer (Shows actual PDF with comfortable height and interactive frame) */}
                  {pdfUrl && pdfViewMode === "preview" ? (
                    <div className="flex-1 w-full min-h-[520px] h-[600px] bg-stone-100 flex flex-col relative border-b border-stone-200">
                      <div className="px-3.5 py-1.5 bg-stone-200/70 border-b border-stone-300/80 flex items-center justify-between text-[11px] text-stone-600">
                        <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-amber-800" />
                          <span>PDF Viewer</span>
                        </span>
                        <span className="text-[10px] text-stone-500 font-mono">
                          Page Navigation & Zoom Active
                        </span>
                      </div>
                      <iframe
                        src={pdfUrl}
                        title="Resume PDF Document Preview"
                        className="w-full flex-1 border-0"
                      />
                    </div>
                  ) : (
                    <textarea
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      placeholder="Paste candidate experience or drop a PDF resume file directly here..."
                      className="flex-1 w-full p-4 bg-transparent text-stone-800 text-xs sm:text-sm font-mono leading-relaxed focus:outline-none resize-none placeholder:text-stone-400 min-h-[420px]"
                    />
                  )}

                  <div className="px-4 py-2 bg-[#FAF8F5] border-t border-[#EFE8DD] text-[11px] text-stone-500 flex items-center justify-between">
                    <span>💡 Tip: Drop any PDF resume file directly onto this card</span>
                    <span className="font-mono text-stone-400">PDF, TXT, DOCX</span>
                  </div>
                </div>
              </div>

              {/* Sources Bottom Action Bar (Anchors bottom cleanly, no dead space) */}
              <div className="p-4 rounded-2xl bg-white border border-[#E8DFD3] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 text-xs text-stone-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  <span>
                    Ready for audit: <strong>{jobDescription.split(/\s+/).filter(Boolean).length} words JD</strong>
                    {companyName ? ` (${companyName})` : ""} &bull;{" "}
                    <strong>{uploadedFileName ? uploadedFileName : `${resumeText.split(/\s+/).filter(Boolean).length} words Resume`}</strong>
                  </span>
                </div>

                <button
                  onClick={handleStartAnalysis}
                  disabled={loading}
                  className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3 rounded-2xl bg-[#78350F] hover:bg-[#632C0D] text-white font-semibold text-sm tracking-wide shadow-md shadow-amber-950/15 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-100" />
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
            <section className="bg-white border border-[#E7DFD5] rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden transition-all">
              {/* Top Amber Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#78350F]" />

              {/* Panel Title & Status (Removed Phase 2 Tuning tag as requested) */}
              <div className="flex items-center justify-between flex-wrap gap-4 pb-5 mb-6 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#FAF8F5] border border-[#EFE8DD] flex items-center justify-center text-amber-900 shadow-xs">
                    <UserCheck className="w-5 h-5 text-amber-800" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                        Skill Reclassification & Verification
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FEF9EE] text-[#92400E] border border-[#FDE68A]">
                        Human-in-the-Loop
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Review AI-detected skills. Reclassify between categories using the interactive chips or provide custom natural language guidance below.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Refined Vertical Columns for Moving Skills (Unified Editorial Theme) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                {/* Column 1: Missing Skills */}
                <div className="p-4.5 rounded-2xl bg-[#FDFBF7] border border-[#EFE8DD] flex flex-col justify-between shadow-2xs">
                  <div>
                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-stone-200">
                      <div className="flex items-center gap-2 text-stone-900 text-xs font-bold uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-[#991B1B]"></span>
                        <span>Missing Gaps</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#FDF2F0] text-[#991B1B] text-xs font-bold border border-[#FCA5A5]">
                        {hitlReview.missing.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mb-3">
                      Zero evidence in submitted resume. Requires 48-hr proof project.
                    </p>

                    <div className="flex flex-col gap-2">
                      {hitlReview.missing.length > 0 ? (
                        hitlReview.missing.map((s, i) => (
                          <div
                            key={i}
                            className="p-2.5 bg-white border border-stone-200 rounded-xl shadow-2xs flex items-center justify-between gap-2 group hover:border-stone-300 transition"
                          >
                            <span className="text-xs font-semibold text-stone-900 font-mono truncate">
                              {s}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleMoveSkill(s, "missing", "weak")}
                                title="Promote to Weak / Needs Proof"
                                className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FEF9EE] text-[#92400E] hover:bg-amber-100 border border-[#FDE68A] transition cursor-pointer flex items-center gap-0.5"
                              >
                                <span>+ Weak</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleMoveSkill(s, "missing", "strong")}
                                title="Promote to Verified Strong"
                                className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#F0FDF4] text-[#166534] hover:bg-emerald-100 border border-[#BBF7D0] transition cursor-pointer flex items-center gap-0.5"
                              >
                                <span>+ Strong</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 rounded-xl border border-dashed border-stone-200 bg-white/60 text-center text-xs text-stone-400 italic">
                          No missing gaps detected
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Column 2: Weak / Needs Proof */}
                <div className="p-4.5 rounded-2xl bg-[#FDFBF7] border border-[#EFE8DD] flex flex-col justify-between shadow-2xs">
                  <div>
                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-stone-200">
                      <div className="flex items-center gap-2 text-stone-900 text-xs font-bold uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-[#D97706]"></span>
                        <span>Needs Proof</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#FEF9EE] text-[#92400E] text-xs font-bold border border-[#FDE68A]">
                        {hitlReview.weak.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mb-3">
                      Mentioned superficially; needs quantified XYZ bullet rewrites.
                    </p>

                    <div className="flex flex-col gap-2">
                      {hitlReview.weak.length > 0 ? (
                        hitlReview.weak.map((s, i) => (
                          <div
                            key={i}
                            className="p-2.5 bg-white border border-stone-200 rounded-xl shadow-2xs flex items-center justify-between gap-2 group hover:border-stone-300 transition"
                          >
                            <span className="text-xs font-semibold text-stone-900 font-mono truncate">
                              {s}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleMoveSkill(s, "weak", "missing")}
                                title="Demote to Missing Gap"
                                className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FDF2F0] text-[#991B1B] hover:bg-rose-100 border border-[#FCA5A5] transition cursor-pointer flex items-center gap-0.5"
                              >
                                <span>- Gap</span>
                                <ArrowDownRight className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleMoveSkill(s, "weak", "strong")}
                                title="Promote to Verified Strong"
                                className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#F0FDF4] text-[#166534] hover:bg-emerald-100 border border-[#BBF7D0] transition cursor-pointer flex items-center gap-0.5"
                              >
                                <span>+ Strong</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 rounded-xl border border-dashed border-stone-200 bg-white/60 text-center text-xs text-stone-400 italic">
                          No weak skills detected
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Column 3: Verified Strong */}
                <div className="p-4.5 rounded-2xl bg-[#FDFBF7] border border-[#EFE8DD] flex flex-col justify-between shadow-2xs">
                  <div>
                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-stone-200">
                      <div className="flex items-center gap-2 text-stone-900 text-xs font-bold uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-[#16A34A]"></span>
                        <span>Verified Strong</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#166534] text-xs font-bold border border-[#BBF7D0]">
                        {hitlReview.strong.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mb-3">
                      Directly validated by strong evidence and hands-on projects.
                    </p>

                    <div className="flex flex-col gap-2">
                      {hitlReview.strong.length > 0 ? (
                        hitlReview.strong.map((s, i) => (
                          <div
                            key={i}
                            className="p-2.5 bg-white border border-stone-200 rounded-xl shadow-2xs flex items-center justify-between gap-2 group hover:border-stone-300 transition"
                          >
                            <span className="text-xs font-semibold text-stone-900 font-mono truncate">
                              {s}
                            </span>
                            <button
                              onClick={() => handleMoveSkill(s, "strong", "weak")}
                              title="Demote to Weak / Needs Proof"
                              className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FEF9EE] text-[#92400E] hover:bg-amber-100 border border-[#FDE68A] transition cursor-pointer flex items-center gap-0.5 shrink-0"
                            >
                              <span>- Weak</span>
                              <ArrowDownRight className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 rounded-xl border border-dashed border-stone-200 bg-white/60 text-center text-xs text-stone-400 italic">
                          No strong skills verified yet
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Natural Language Adjustment Input Box */}
              <div className="bg-[#FAF8F5] border border-stone-200 p-4 sm:p-5 rounded-2xl mb-6 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-800" />
                    <span>Custom Human Guidance & Context</span>
                  </label>
                  <span className="text-[11px] text-stone-400 font-mono">Optional</span>
                </div>
                <input
                  type="text"
                  value={userAdjustment}
                  onChange={(e) => setUserAdjustment(e.target.value)}
                  placeholder="e.g. 'I used Redis extensively for session tokens at my previous role; treat as strong'..."
                  className="w-full px-4 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-xs sm:text-sm focus:outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-500/10 transition placeholder:text-stone-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => handleResumeAnalysis("")}
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl border border-stone-300 hover:bg-[#F5EFE7] text-stone-700 text-xs sm:text-sm font-semibold tracking-wide transition cursor-pointer"
                >
                  Approve As Is
                </button>
                <button
                  onClick={() => handleResumeAnalysis()}
                  disabled={loading}
                  className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-3 rounded-xl bg-[#78350F] hover:bg-[#632C0D] text-white text-xs sm:text-sm font-bold shadow-md shadow-amber-950/15 transition cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-100" />
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

          {/* SECTION 3: 48-HOUR ROADMAP (ALL 3 VERTICAL CARDS IN HARMONIOUS UNIFIED STYLE) */}
          {activeSection === "roadmap" && finalOutput && (
            <div className="space-y-6">
              {insights?.missing_roadmap && insights.missing_roadmap.length > 0 ? (
                insights.missing_roadmap.map((item, idx) => {
                  const isProjectCopied = copiedProjectKey === idx;
                  return (
                    <div
                      key={idx}
                      className="rounded-3xl border border-[#E7DFD5] bg-white overflow-hidden shadow-xs hover:shadow-sm transition-all"
                    >
                      {/* Skill Card Header */}
                      <div className="p-4 sm:p-5 bg-gradient-to-r from-[#FAF8F5] via-white to-[#FAF8F5] border-b border-[#EFE8DD] flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-xl bg-[#78350F] text-amber-50 flex items-center justify-center text-xs font-bold shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-bold text-stone-900 font-mono">
                                {item.skill}
                              </h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FDF2F0] text-[#991B1B] border border-[#FCA5A5] uppercase tracking-wider">
                                Gap Deliverable
                              </span>
                            </div>
                            <p className="text-xs text-stone-500 mt-0.5">
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
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                            isProjectCopied
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800 shadow-2xs"
                              : "bg-white hover:bg-stone-50 border-stone-200 text-stone-700 shadow-2xs"
                          }`}
                        >
                          {isProjectCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Copied PoC</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-stone-500" />
                              <span>Copy Roadmap</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* 3 VERTICAL CARDS SIDE-BY-SIDE: UNIFIED COHESIVE STYLING (NO ORANGE BORDER) */}
                      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4.5">
                        {/* Vertical Card 1: Why Company Wants This (Context Grounded) */}
                        <div className="p-4.5 rounded-2xl bg-[#FDFBF7] border border-[#E7DFD5] flex flex-col justify-between shadow-2xs hover:border-stone-300 transition">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-[#FEF9EE] text-[#92400E] border border-[#FDE68A] flex items-center justify-center shrink-0">
                                  <Building2 className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                                  {companyName || insights?.company_name
                                    ? `Why ${(companyName || insights?.company_name)?.toUpperCase()} Wants`
                                    : "Why Company Wants"}
                                </span>
                              </div>
                              {(companyName || insights?.company_name) && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                                  {sourcePlatform || "URL Linked"}
                                </span>
                              )}
                            </div>

                            {item.company_keywords && item.company_keywords.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {item.company_keywords.map((kw, kidx) => (
                                  <span
                                    key={kidx}
                                    className="px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-stone-200 text-stone-800 text-[10px] font-semibold"
                                  >
                                    #{kw}
                                  </span>
                                ))}
                              </div>
                            )}

                            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-sans">
                              {item.why_it_matters}
                            </p>
                          </div>

                          <div className="pt-3 mt-3 border-t border-stone-200/60 text-[10px] text-stone-500 font-semibold uppercase tracking-wider flex items-center justify-between">
                            <span>
                              {companyName || insights?.company_name
                                ? `${companyName || insights?.company_name} Intent`
                                : "Hiring Manager Intent"}
                            </span>
                            {(companyName || insights?.company_name) && (
                              <span className="text-[9px] font-bold text-emerald-800 flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Platform Grounded</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Vertical Card 2: 48-Hour Proof-of-Concept Project (Unified Style, No Orange Border) */}
                        <div className="p-4.5 rounded-2xl bg-[#FDFBF7] border border-[#E7DFD5] flex flex-col justify-between shadow-2xs hover:border-stone-300 transition">
                          <div>
                            <div className="flex items-center gap-2 mb-2.5">
                              <div className="w-6 h-6 rounded-lg bg-[#FEF9EE] text-[#92400E] border border-[#FDE68A] flex items-center justify-center shrink-0">
                                <Flame className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                                48-Hour PoC Project
                              </span>
                            </div>

                            {item.project_keywords && item.project_keywords.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {item.project_keywords.map((kw, kidx) => (
                                  <span
                                    key={kidx}
                                    className="px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-stone-200 text-stone-800 text-[10px] font-semibold font-mono"
                                  >
                                    🛠️ {kw}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Structured Productive Engineering Project Blueprint */}
                            <div className="space-y-2 text-xs sm:text-sm text-stone-800 leading-relaxed font-sans">
                              <p className="font-medium text-stone-900">
                                {item.bridge_project}
                              </p>
                            </div>
                          </div>

                          <div className="pt-3 mt-3 border-t border-stone-200/60 text-[10px] text-stone-500 font-semibold uppercase tracking-wider flex items-center justify-between">
                            <span>Deliverable Project</span>
                            <span className="font-mono text-stone-700 font-bold">48 Hrs</span>
                          </div>
                        </div>

                        {/* Vertical Card 3: Resume Bridge (Real Resume Projects & Directly Editable) */}
                        {(() => {
                          const bridge = getBridgeData(item.skill, idx, item.transferable_from);
                          return (
                            <div className="p-4.5 rounded-2xl bg-[#FDFBF7] border border-[#E7DFD5] flex flex-col justify-between shadow-2xs hover:border-stone-300 transition">
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-[#FEF9EE] text-[#92400E] border border-[#FDE68A] flex items-center justify-center shrink-0">
                                      <Award className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                                      Resume Bridge
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateBridge(item.skill, { isEditing: !bridge.isEditing })
                                    }
                                    className="flex items-center gap-1 text-[11px] font-semibold text-amber-800 hover:text-amber-950 px-2 py-0.5 rounded-md hover:bg-[#FEF9EE] border border-amber-200/60 bg-white transition cursor-pointer"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    <span>{bridge.isEditing ? "Close" : "Edit Bridge"}</span>
                                  </button>
                                </div>

                                {bridge.isEditing ? (
                                  <div className="space-y-3 pt-1">
                                    <div>
                                      <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-900 mb-1">
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
                                        className="w-full text-xs p-2 rounded-xl bg-white border border-stone-300 text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600 truncate"
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
                                      <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-600 mb-1">
                                        Project Name Anchor:
                                      </label>
                                      <input
                                        type="text"
                                        value={bridge.project}
                                        onChange={(e) =>
                                          updateBridge(item.skill, { project: e.target.value })
                                        }
                                        placeholder="e.g. Shivay Intelligence AI Internship / FastAPI Backend"
                                        className="w-full text-xs p-2 rounded-xl bg-white border border-stone-300 text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-600 mb-1">
                                        Bridge Pitch / Narrative:
                                      </label>
                                      <textarea
                                        rows={3}
                                        value={bridge.pitch}
                                        onChange={(e) =>
                                          updateBridge(item.skill, { pitch: e.target.value })
                                        }
                                        placeholder="Explain how your real project proves transferable capability..."
                                        className="w-full text-xs p-2 rounded-xl bg-white border border-stone-300 text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-600 focus:border-amber-600 resize-none leading-relaxed"
                                      />
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                      <button
                                        type="button"
                                        onClick={() => resetBridge(item.skill)}
                                        className="text-[10px] font-semibold text-stone-400 hover:text-stone-700 transition cursor-pointer"
                                      >
                                        Reset to Default
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateBridge(item.skill, { isEditing: false })
                                        }
                                        className="px-2.5 py-1 bg-[#78350F] hover:bg-[#632C0D] text-white text-[10px] font-semibold rounded-lg shadow-2xs transition cursor-pointer flex items-center gap-1"
                                      >
                                        <Check className="w-3 h-3" />
                                        <span>Save Changes</span>
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {/* Real Resume Project Anchor Badge */}
                                    <div className="mb-2.5 p-2 rounded-xl bg-[#FAF8F5] border border-stone-200/80">
                                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1 mb-0.5">
                                        <FolderGit2 className="w-3 h-3 text-amber-700" />
                                        <span>Resume Anchor:</span>
                                      </div>
                                      <p className="text-xs font-semibold text-stone-900 leading-snug line-clamp-2">
                                        {bridge.project}
                                      </p>
                                    </div>

                                    {item.bridge_keywords && item.bridge_keywords.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                                        {item.bridge_keywords.map((kw, kidx) => (
                                          <span
                                            key={kidx}
                                            className="px-2 py-0.5 rounded-md bg-white border border-stone-200 text-stone-800 text-[10px] font-semibold"
                                          >
                                            🌉 {kw}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-sans">
                                      {bridge.pitch}
                                    </p>
                                  </>
                                )}
                              </div>

                              <div className="pt-3 mt-3 border-t border-stone-200/60 text-[10px] text-stone-500 font-semibold uppercase tracking-wider flex items-center justify-between">
                                <span>Connect Your Project</span>
                                {bridge.isModified && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold uppercase">
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
                <div className="p-8 rounded-3xl border border-stone-200 bg-white text-center text-xs text-stone-500">
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
                    className="p-5 rounded-3xl border border-[#E7DED1] bg-white shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-[#FEF9EE] text-[#92400E] border border-[#FDE68A] font-mono text-xs font-bold">
                        {item.skill}
                      </span>
                      <span className="text-xs text-stone-400 font-medium">XYZ Impact Model</span>
                    </div>

                    <div className="space-y-2">
                      {item.recommended_bullets.map((bullet, bidx) => {
                        const bulletKey = `${item.skill}-${bidx}`;
                        const isBulletCopied = copiedBulletKey === bulletKey;
                        return (
                          <div
                            key={bidx}
                            className="p-3.5 rounded-xl bg-[#FAF8F5] border border-stone-200/70 flex items-start justify-between gap-3 group hover:border-amber-200 transition"
                          >
                            <div className="flex items-start gap-2.5 flex-grow">
                              <span className="text-amber-800 font-bold mt-0.5">•</span>
                              <p className="text-xs sm:text-sm text-stone-800 leading-relaxed font-sans">
                                {bullet}
                              </p>
                            </div>

                            <button
                              onClick={() => handleCopyBullet(bulletKey, bullet)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer shrink-0 ${
                                isBulletCopied
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                  : "bg-white hover:bg-stone-50 border-stone-200 text-stone-600 shadow-2xs"
                              }`}
                            >
                              {isBulletCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-stone-400" />
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
                <div className="p-8 rounded-3xl border border-stone-200 bg-white text-center text-xs text-stone-500">
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
                      className="rounded-3xl border border-[#E7DED1] bg-white overflow-hidden shadow-xs"
                    >
                      {/* Clicking ANYWHERE in this header row toggles open/close */}
                      <div
                        onClick={() => toggleQuestionExpanded(idx)}
                        className="p-4 sm:p-5 flex items-start justify-between gap-3 bg-white hover:bg-[#FAF8F5] transition cursor-pointer select-none border-b border-stone-100"
                      >
                        <div className="flex items-start gap-3 flex-grow">
                          <span className="w-6 h-6 rounded-lg bg-[#FAF8F5] text-stone-800 border border-stone-200 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded-md bg-[#FEF9EE] border border-[#FDE68A] text-[#92400E] text-[10px] font-semibold uppercase tracking-wider mb-1.5">
                              Probing Gap: {q.targeted_skill}
                            </span>
                            <h4 className="text-xs sm:text-sm font-semibold text-stone-900 leading-snug">
                              {q.question}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleCopyQuestion(idx, q)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                              isCopied
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : "bg-white hover:bg-stone-50 border-stone-200 text-stone-600 shadow-2xs"
                            }`}
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-stone-400" />
                                <span>Copy Q&A</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => toggleQuestionExpanded(idx)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
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
                        <div className="p-4 sm:p-5 bg-[#FAF8F5] flex items-start gap-3 border-t border-stone-100">
                          <div className="w-6 h-6 rounded-md bg-stone-100 flex items-center justify-center shrink-0 mt-0.5 text-stone-600">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-800" />
                          </div>
                          <div className="flex-grow">
                            <p className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                              Strategic Talking Points & Response Framework
                            </p>
                            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed whitespace-pre-line font-sans">
                              {q.suggested_talking_points}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 rounded-3xl border border-stone-200 bg-white text-center text-xs text-stone-500">
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