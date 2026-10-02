export interface GapAnalysisResult {
  missing: string[];
  weak: string[];
  strong: string[];
}

export interface MissingSkillRoadmap {
  skill: string;
  company_keywords?: string[];
  why_it_matters: string;
  project_keywords?: string[];
  bridge_project: string;
  bridge_keywords?: string[];
  transferable_from: string;
}

export interface WeakImprovement {
  skill: string;
  recommended_bullets: string[];
}

export interface InterviewQuestion {
  question: string;
  targeted_skill: string;
  suggested_talking_points: string;
}

export interface Tier1Insights {
  match_score?: number;
  company_name?: string;
  company_context?: string;
  executive_summary?: string;
  missing_roadmap?: MissingSkillRoadmap[];
  weak_improvements: WeakImprovement[];
  interview_questions: InterviewQuestion[];
}

export interface AnalyzeResponse {
  thread_id: string;
  status: string;
  proposed_gap: GapAnalysisResult | null;
  interrupt_message?: string;
}

export interface FinalResponse {
  thread_id: string;
  status: string;
  final_output: GapAnalysisResult | null;
  insights?: Tier1Insights | null;
}

export interface AuditHistoryItem {
  id: string;
  timestamp: string;
  roleTitle: string;
  companyName?: string;
  matchScore?: number;
  jobDescription: string;
  resumeText: string;
  uploadedFileName?: string;
  pdfDataUrl?: string;
  hitlReview: GapAnalysisResult | null;
  finalOutput: GapAnalysisResult | null;
  insights: Tier1Insights | null;
}
