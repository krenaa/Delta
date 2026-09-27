from typing import List, Optional
from pydantic import BaseModel, Field
from typing_extensions import TypedDict


class InputState(BaseModel):
    job_description_text: str = Field(
        ..., description="Raw text of the target job description"
    )
    resume_text: str = Field(..., description="Raw text of candidate resume")


class GapAnalysisResult(BaseModel):
    missing: List[str] = Field(
        default_factory=list,
        description="Required skills/technologies not found in resume",
    )
    weak: List[str] = Field(
        default_factory=list,
        description="Mentioned briefly, lacking project/experience depth",
    )
    strong: List[str] = Field(
        default_factory=list,
        description="Clearly demonstrated skill matches backed by experience",
    )


class MissingSkillRoadmap(BaseModel):
    skill: str = Field(..., description="The missing skill name")
    company_keywords: List[str] = Field(
        default_factory=list,
        description="1-3 punchy keywords on why the company requires this (e.g. ['Zero-Downtime Deployments', 'Pod Scaling'])",
    )
    why_it_matters: str = Field(
        ..., description="Why the hiring team specifically requires this skill for the role"
    )
    project_keywords: List[str] = Field(
        default_factory=list,
        description="1-3 punchy keywords on the 48-hr project deliverable (e.g. ['Local k3s Cluster', 'Helm Chart'])",
    )
    bridge_project: str = Field(
        ...,
        description="A concrete 48-hour hands-on proof-of-concept project the candidate can build and link",
    )
    bridge_keywords: List[str] = Field(
        default_factory=list,
        description="1-3 punchy keywords on which project of yours connects (e.g. ['FastAPI Microservices', 'Docker Compose'])",
    )
    transferable_from: str = Field(
        ...,
        description="Existing skill or concept from candidate background that directly bridges into this skill",
    )


class WeakImprovement(BaseModel):
    skill: str = Field(..., description="The skill identified as weak or needing proof")
    recommended_bullets: List[str] = Field(
        default_factory=list,
        description="High-impact resume bullet points demonstrating hands-on experience and metrics",
    )


class InterviewQuestion(BaseModel):
    question: str = Field(
        ..., description="A targeted technical interview question probing a skill gap"
    )
    targeted_skill: str = Field(..., description="The skill or gap being tested")
    suggested_talking_points: str = Field(
        ...,
        description="Strategic talking points on how to answer honestly, connecting past experience to rapid ramp-up",
    )


class Tier1Insights(BaseModel):
    match_score: int = Field(
        default=70, description="Overall match readiness percentage (0-100)"
    )
    company_name: Optional[str] = Field(
        default=None, description="Hiring company or organization name"
    )
    company_context: Optional[str] = Field(
        default=None, description="Mission, architecture, and engineering priorities of the hiring company"
    )
    executive_summary: str = Field(
        default="",
        description="2-3 sentence executive synthesis connecting the dots between candidate background and job requirements",
    )
    missing_roadmap: List[MissingSkillRoadmap] = Field(
        default_factory=list,
        description="Deep actionable roadmaps for missing skills with hiring manager context and 48-hour bridge projects",
    )
    weak_improvements: List[WeakImprovement] = Field(default_factory=list)
    interview_questions: List[InterviewQuestion] = Field(default_factory=list)


class AgentState(TypedDict):
    jd_text: str
    resume_text: str
    company_name: Optional[str]
    company_context: Optional[str]
    extracted_jd_skills: List[str]
    extracted_candidate_skills: List[str]
    gap_analysis: Optional[GapAnalysisResult]
    user_feedback: Optional[str]
    final_output: Optional[GapAnalysisResult]
    insights: Optional[Tier1Insights]