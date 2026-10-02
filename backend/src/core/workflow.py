import os
import re
from typing import Dict, List, Optional
from dotenv import load_dotenv
from pydantic import BaseModel, Field

from langgraph.graph import END, START, StateGraph
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import interrupt

from src.core.state import (
    AgentState,
    GapAnalysisResult,
    InterviewQuestion,
    MissingSkillRoadmap,
    Tier1Insights,
    WeakImprovement,
)
from src.core.llm import execute_llm_with_fallback
from src.services.insights_kb import get_missing_skill_roadmap, get_skill_knowledge

load_dotenv()


class ExtractedSkills(BaseModel):
    skills: List[str] = Field(
        default_factory=list,
        description="List of extracted skills, technologies, frameworks, and tools",
    )


def extract_skills_heuristic(text: str) -> List[str]:
    """Fallback text extractor when LLM key is absent or offline."""
    common_keywords = [
        "python", "fastapi", "docker", "kubernetes", "langgraph", "langchain",
        "react", "next.js", "typescript", "javascript", "postgresql", "sql",
        "mongodb", "redis", "celery", "playwright", "aws", "gcp", "azure",
        "git", "ci/cd", "graphql", "rest api", "linux", "machine learning",
        "llm", "rag", "pytorch", "tensorflow"
    ]
    lower_text = text.lower()
    found = []
    for kw in common_keywords:
        pattern = r"\b" + re.escape(kw) + r"\b"
        if re.search(pattern, lower_text):
            found.append(kw.title())
    return found


def extract_jd_node(state: AgentState) -> dict:
    """Node 1: Extract core requirements, technologies, and experience from the JD."""
    jd_text = state.get("jd_text", "")

    messages = [
        (
            "system",
            "You are an expert technical recruiter. Extract all required core technical skills, "
            "programming languages, frameworks, databases, and tools from the job description.",
        ),
        ("human", f"Job Description:\n{jd_text}"),
    ]
    llm_result = execute_llm_with_fallback(
        messages=messages, structured_schema=ExtractedSkills
    )

    if llm_result and hasattr(llm_result, "skills") and llm_result.skills:
        extracted = llm_result.skills
    else:
        extracted = extract_skills_heuristic(jd_text)
        if not extracted and jd_text.strip():
            words = [
                w.strip(",.- ")
                for w in jd_text.split()
                if len(w) > 3 and w.istitle()
            ]
            extracted = list(dict.fromkeys(words))[:8]

    return {"extracted_jd_skills": extracted}


def extract_resume_node(state: AgentState) -> dict:
    """Node 2: Extract demonstrated candidate skills and experience from the resume text."""
    resume_text = state.get("resume_text", "")

    messages = [
        (
            "system",
            "You are an expert technical resume reviewer. Extract all technical skills, languages, "
            "frameworks, tools, and platforms demonstrated in the candidate's resume.",
        ),
        ("human", f"Resume Text:\n{resume_text}"),
    ]
    llm_result = execute_llm_with_fallback(
        messages=messages, structured_schema=ExtractedSkills
    )

    if llm_result and hasattr(llm_result, "skills") and llm_result.skills:
        extracted = llm_result.skills
    else:
        extracted = extract_skills_heuristic(resume_text)
        if not extracted and resume_text.strip():
            words = [
                w.strip(",.- ")
                for w in resume_text.split()
                if len(w) > 3 and w.istitle()
            ]
            extracted = list(dict.fromkeys(words))[:8]

    return {"extracted_candidate_skills": extracted}


def compare_node(state: AgentState) -> dict:
    """Node 3: Compares JD vs Resume and buckets skills into Missing, Weak, and Strong."""
    jd_skills = state.get("extracted_jd_skills", [])
    candidate_skills = state.get("extracted_candidate_skills", [])
    jd_text = state.get("jd_text", "")
    resume_text = state.get("resume_text", "")

    messages = [
        (
            "system",
            "You are an ATS Gap Analysis Engine. Compare the required Job Description skills against the candidate's resume.\n"
            "Categorize every required skill into exactly one of three buckets:\n"
            "1. 'missing': Required by JD but not present in the resume.\n"
            "2. 'weak': Mentioned in passing or listed in skills, but lacking project depth, metrics, or substantive experience.\n"
            "3. 'strong': Clearly demonstrated match backed by hands-on experience or shipped projects.\n"
            "Do not include percentages or scores. Return only the categorized lists.",
        ),
        (
            "human",
            f"Required Skills:\n{jd_skills}\n\nJob Description:\n{jd_text}\n\n"
            f"Candidate Skills:\n{candidate_skills}\n\nCandidate Resume:\n{resume_text}",
        ),
    ]
    llm_result = execute_llm_with_fallback(
        messages=messages, structured_schema=GapAnalysisResult
    )

    if (
        llm_result
        and isinstance(llm_result, GapAnalysisResult)
        and (llm_result.missing or llm_result.weak or llm_result.strong)
    ):
        gap_result = llm_result
    else:
        jd_set = {s.lower(): s for s in jd_skills}
        cand_set = {s.lower(): s for s in candidate_skills}
        resume_lower = resume_text.lower()

        missing: List[str] = []
        weak: List[str] = []
        strong: List[str] = []

        for lower_skill, orig_skill in jd_set.items():
            if lower_skill not in cand_set:
                missing.append(orig_skill)
            else:
                count = len(
                    re.findall(r"\b" + re.escape(lower_skill) + r"\b", resume_lower)
                )
                has_action_verbs = any(
                    verb in resume_lower
                    for verb in [
                        "built", "engineered", "deployed", "scaled", "designed", "led", "developed"
                    ]
                )
                if count > 1 or has_action_verbs:
                    strong.append(orig_skill)
                else:
                    weak.append(orig_skill)

        gap_result = GapAnalysisResult(
            missing=missing,
            weak=weak,
            strong=strong,
        )

    return {"gap_analysis": gap_result}


def hitl_review_node(state: AgentState) -> dict:
    """Node 4: Pauses execution with interrupt() for Human-in-the-Loop review and adjustment."""
    current_analysis = state.get("gap_analysis")
    review_data = (
        current_analysis.model_dump()
        if hasattr(current_analysis, "model_dump")
        else current_analysis
    )

    user_feedback = interrupt({
        "review_data": review_data,
        "message": "Human-in-the-Loop Review: Confirm or provide adjustments for the gap analysis.",
    })

    return {"user_feedback": str(user_feedback) if user_feedback is not None else ""}


def finalize_node(state: AgentState) -> dict:
    """Node 5: Applies user adjustments (if any) and finalizes the output."""
    gap: Optional[GapAnalysisResult] = state.get("gap_analysis")
    user_feedback = state.get("user_feedback", "")

    if not gap:
        gap = GapAnalysisResult(missing=[], weak=[], strong=[])

    missing = list(gap.missing)
    weak = list(gap.weak)
    strong = list(gap.strong)

    if user_feedback and isinstance(user_feedback, str):
        feedback_lower = user_feedback.lower()
        for skill in list(missing + weak):
            if "to strong" in feedback_lower and skill.lower() in feedback_lower:
                if skill in missing:
                    missing.remove(skill)
                if skill in weak:
                    weak.remove(skill)
                if skill not in strong:
                    strong.append(skill)
        for skill in list(missing):
            if "to weak" in feedback_lower and skill.lower() in feedback_lower:
                missing.remove(skill)
                if skill not in weak:
                    weak.append(skill)

    final_result = GapAnalysisResult(
        missing=missing,
        weak=weak,
        strong=strong,
    )
    return {"final_output": final_result}


def generate_insights_node(state: AgentState) -> dict:
    """Node 6: Generates Tier 1 Missing Roadmap, Weak-to-Strong bullets & Technical Interview Questions."""
    final_output: Optional[GapAnalysisResult] = state.get("final_output")
    jd_text = state.get("jd_text", "")
    resume_text = state.get("resume_text", "")
    company_name = state.get("company_name", "")
    company_context = state.get("company_context", "")

    if not final_output:
        final_output = GapAnalysisResult(missing=[], weak=[], strong=[])

    total_skills = len(final_output.strong) + len(final_output.weak) + len(final_output.missing)
    calculated_score = int(
        round(
            (len(final_output.strong) * 1.0 + len(final_output.weak) * 0.5)
            / max(total_skills, 1)
            * 100
        )
    )

    target_weak_skills = list(final_output.weak)
    if not target_weak_skills and final_output.missing:
        target_weak_skills = list(final_output.missing)[:2]

    company_prompt_section = ""
    if company_name:
        company_prompt_section += f"Target Company: {company_name}\n"
    if company_context:
        company_prompt_section += f"Company Mission & Engineering Context:\n{company_context}\n"

    messages = [
        (
            "system",
            "You are an executive technical career coach and hiring lead. Analyze the candidate's skill gaps against the target JD.\n"
            "Provide a comprehensive, high-value structured evaluation:\n"
            "1. 'match_score': An integer readiness score (0-100) reflecting candidate suitability.\n"
            "2. 'company_name': The target company name ONLY if explicitly named in the Target Company section or Job Description. If no company is explicitly named, return null. NEVER fabricate or hallucinate a company name.\n"
            "3. 'company_context': Brief context on the company's core mission and architecture (or null if unknown).\n"
            "4. 'executive_summary': A 2-3 sentence executive synthesis connecting the dots: highlight existing core strengths, identify the main architectural gaps, and define the primary interview ramp-up strategy.\n"
            "5. 'missing_roadmap': For each missing skill, provide:\n"
            "   - 'company_keywords': 1-3 punchy keywords on why the company requires this (e.g. ['Zero-Downtime', 'Pod Autoscaling']).\n"
            "   - 'why_it_matters': 1-2 sentence explanation of why the hiring engineering team specifically requires this for the role. Ground this directly in what the company builds!\n"
            "   - 'project_keywords': 1-3 punchy keywords on the 48-hr project deliverable (e.g. ['Local k3s', 'Helm Manifest']).\n"
            "   - 'bridge_project': Concrete 48-hour hands-on proof project the candidate can build to prove competence.\n"
            "   - 'bridge_keywords': 1-3 punchy keywords on which project of yours to connect (e.g. ['FastAPI App', 'Docker Compose']).\n"
            "   - 'transferable_from': Which project/experience from candidate background directly bridges into this skill.\n"
            "6. 'weak_improvements': For each weak skill, generate 2 concrete, metric-driven resume bullet points demonstrating hands-on impact.\n"
            "7. 'interview_questions': 3-4 realistic technical interview questions probing gaps, with strategic talking points connecting past experience to rapid ramp-up.\n"
            "Keep advice highly actionable, engineering-focused, and tailored.",
        ),
        (
            "human",
            f"{company_prompt_section}"
            f"Missing Skills:\n{final_output.missing}\n\nWeak Skills:\n{final_output.weak}\n\nStrong Skills:\n{final_output.strong}\n\nJob Description:\n{jd_text}\n\nResume Summary:\n{resume_text}",
        ),
    ]

    llm_result = execute_llm_with_fallback(
        messages=messages, structured_schema=Tier1Insights
    )

    if (
        llm_result
        and isinstance(llm_result, Tier1Insights)
        and (llm_result.weak_improvements or llm_result.interview_questions or llm_result.missing_roadmap)
    ):
        insights = llm_result
        if not insights.match_score:
            insights.match_score = calculated_score
        if company_name:
            insights.company_name = company_name
        elif insights.company_name:
            # Validate that the company name actually appears in the job description
            clean_company = insights.company_name.strip()
            if clean_company.lower() not in jd_text.lower():
                insights.company_name = None
        if company_context and not insights.company_context:
            insights.company_context = company_context
        if not insights.missing_roadmap and final_output.missing:
            insights.missing_roadmap = [
                get_missing_skill_roadmap(s, idx)
                for idx, s in enumerate(final_output.missing)
            ]
        else:
            # Ensure each roadmap has keywords populated
            for idx, rm in enumerate(insights.missing_roadmap):
                default_rm = get_missing_skill_roadmap(rm.skill, idx)
                if not rm.company_keywords:
                    rm.company_keywords = default_rm.company_keywords
                if not rm.project_keywords:
                    rm.project_keywords = default_rm.project_keywords
                if not rm.bridge_keywords:
                    rm.bridge_keywords = default_rm.bridge_keywords
        if not insights.executive_summary:
            strong_str = ", ".join(final_output.strong[:3]) or "core software engineering"
            missing_str = ", ".join(final_output.missing[:3]) or "advanced cloud infrastructure"
            insights.executive_summary = (
                f"Candidate demonstrates proven foundation in {strong_str}. "
                f"The primary gap lies in {missing_str}. "
                f"Position transferable strengths during interviews while demonstrating rapid ramp-up via focused proof-of-concept projects."
            )
    else:
        # Domain-aware knowledge base generator fallback
        missing_roadmap: List[MissingSkillRoadmap] = [
            get_missing_skill_roadmap(s, idx)
            for idx, s in enumerate(final_output.missing)
        ]

        improvements: List[WeakImprovement] = []
        for idx, s in enumerate(target_weak_skills):
            _, improvement = get_skill_knowledge(s, index=idx)
            improvements.append(improvement)

        questions: List[InterviewQuestion] = []
        target_q_skills = (final_output.missing + final_output.weak)[:4]
        for idx, s in enumerate(target_q_skills):
            question, _ = get_skill_knowledge(s, index=idx)
            questions.append(question)

        strong_str = ", ".join(final_output.strong[:3]) or "core software engineering"
        missing_str = ", ".join(final_output.missing[:3]) or "advanced cloud infrastructure"
        exec_summary = (
            f"Candidate brings verified competence in {strong_str}. "
            f"The primary architectural gaps center around {missing_str}. "
            f"Leverage your proven backend foundation to demonstrate how your conceptual mastery bridges directly to these required systems."
        )

        insights = Tier1Insights(
            match_score=calculated_score,
            company_name=company_name or None,
            company_context=company_context or None,
            executive_summary=exec_summary,
            missing_roadmap=missing_roadmap,
            weak_improvements=improvements,
            interview_questions=questions,
        )

    return {"insights": insights}


def build_gap_analyzer_graph(checkpointer=None):
    """Constructs the Phase B/C/Tier-1 LangGraph state machine with MemorySaver."""
    builder = StateGraph(AgentState)

    builder.add_node("extract_jd_node", extract_jd_node)
    builder.add_node("extract_resume_node", extract_resume_node)
    builder.add_node("compare_node", compare_node)
    builder.add_node("hitl_review_node", hitl_review_node)
    builder.add_node("finalize_node", finalize_node)
    builder.add_node("generate_insights_node", generate_insights_node)

    builder.add_edge(START, "extract_jd_node")
    builder.add_edge(START, "extract_resume_node")
    builder.add_edge(["extract_jd_node", "extract_resume_node"], "compare_node")
    builder.add_edge("compare_node", "hitl_review_node")
    builder.add_edge("hitl_review_node", "finalize_node")
    builder.add_edge("finalize_node", "generate_insights_node")
    builder.add_edge("generate_insights_node", END)

    if checkpointer is None:
        checkpointer = MemorySaver()

    return builder.compile(checkpointer=checkpointer)
