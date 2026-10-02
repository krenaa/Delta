import io
import uuid
from typing import Optional
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langgraph.types import Command
import pypdf

from src.core.state import AgentState, GapAnalysisResult, Tier1Insights
from src.services.url_fetcher import fetch_and_analyze_job_url, JobUrlParsedResult
from src.core.workflow import build_gap_analyzer_graph

app = FastAPI(
    title="Resume Gap Analyzer Agent",
    description="LangGraph Human-in-the-Loop Resume vs JD Gap Analysis API with Tier 1 Insights",
    version="1.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory graph checkpointer
graph = build_gap_analyzer_graph()


class FetchUrlRequest(BaseModel):
    url: str


class AnalyzeRequest(BaseModel):
    job_description_text: str
    resume_text: str
    company_name: Optional[str] = None
    company_context: Optional[str] = None


class AnalyzeResponse(BaseModel):
    thread_id: str
    status: str
    proposed_gap: Optional[GapAnalysisResult] = None
    interrupt_message: Optional[str] = None


class ResumeRequest(BaseModel):
    thread_id: str
    user_feedback: Optional[str] = ""


class FinalResponse(BaseModel):
    thread_id: str
    status: str
    final_output: Optional[GapAnalysisResult] = None
    insights: Optional[Tier1Insights] = None


class UploadResumeResponse(BaseModel):
    filename: str
    extracted_text: str


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "resume-gap-analyzer"}


@app.post("/api/fetch-url", response_model=JobUrlParsedResult)
async def fetch_job_url(payload: FetchUrlRequest):
    """Fetches job and company context from a URL (e.g. LinkedIn, Greenhouse, Lever, company careers)."""
    if not payload.url or not payload.url.strip():
        raise HTTPException(status_code=400, detail="A valid job or company URL is required.")
    try:
        result = await fetch_and_analyze_job_url(payload.url.strip())
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch and analyze URL: {str(e)}"
        )


@app.post("/api/upload-resume", response_model=UploadResumeResponse)
async def upload_resume(file: UploadFile = File(...)):
    """Extracts plain text from uploaded PDF or plain text resume."""
    try:
        contents = await file.read()
        filename = file.filename or "uploaded_resume.txt"

        if filename.lower().endswith(".pdf"):
            pdf_stream = io.BytesIO(contents)
            reader = pypdf.PdfReader(pdf_stream)
            extracted_pages = [page.extract_text() or "" for page in reader.pages]
            full_text = "\n\n".join(extracted_pages).strip()
            if not full_text:
                raise ValueError("Could not extract readable text from PDF.")
        else:
            # Treat as plain text / markdown
            full_text = contents.decode("utf-8", errors="replace").strip()

        return UploadResumeResponse(filename=filename, extracted_text=full_text)
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Failed to parse resume file: {str(e)}"
        )


@app.post("/api/analyze", response_model=AnalyzeResponse)
def start_analysis(payload: AnalyzeRequest):
    """Starts the LangGraph workflow and runs until the HITL interrupt() step."""
    thread_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    initial_state: AgentState = {
        "jd_text": payload.job_description_text,
        "resume_text": payload.resume_text,
        "company_name": payload.company_name,
        "company_context": payload.company_context,
        "extracted_jd_skills": [],
        "extracted_candidate_skills": [],
        "gap_analysis": None,
        "user_feedback": None,
        "final_output": None,
        "insights": None,
    }

    try:
        result = graph.invoke(initial_state, config=config)
        interrupts = result.get("__interrupt__", [])
        interrupt_msg = (
            interrupts[0].value.get("message") if interrupts else None
        )

        return AnalyzeResponse(
            thread_id=thread_id,
            status="WAITING_FOR_REVIEW" if interrupts else "COMPLETED",
            proposed_gap=result.get("gap_analysis"),
            interrupt_message=interrupt_msg,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/api/resume", response_model=FinalResponse)
def resume_analysis(payload: ResumeRequest):
    """Resumes the paused graph from the HITL step with user feedback and generates Tier 1 insights."""
    config = {"configurable": {"thread_id": payload.thread_id}}

    try:
        final_result = graph.invoke(
            Command(resume=payload.user_feedback or ""), config=config
        )
        return FinalResponse(
            thread_id=payload.thread_id,
            status="FINALIZED",
            final_output=final_result.get("final_output"),
            insights=final_result.get("insights"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume failed: {str(e)}")
