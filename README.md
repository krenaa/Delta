# 🤖 Job Agent — Resume Gap Analyzer & Career Coach

An Agentic AI application powered by **LangGraph**, **FastAPI**, and **Next.js** that automates ATS-grade job description analysis, candidate resume comparison, Human-in-the-Loop (HITL) refinement, custom theme UI scrollbars, and 48-hour proof-of-concept project roadmapping.

---

## 📁 Repository Structure

```
job-agent/
├── backend/                  # Python FastAPI & LangGraph AI Backend
│   ├── .venv/                # Python Virtual Environment
│   ├── src/                  # Core application source code
│   │   ├── api/              # FastAPI router endpoints & HTTP schemas
│   │   │   ├── __init__.py
│   │   │   └── routes.py     # Endpoint definitions (/api/analyze, /api/resume, etc.)
│   │   ├── core/             # AI workflow engine & state schemas
│   │   │   ├── __init__.py
│   │   │   ├── state.py      # Pydantic models & LangGraph AgentState
│   │   │   ├── llm.py        # Groq/Gemini LLM provider client with fallback
│   │   │   └── workflow.py   # LangGraph StateGraph & interrupt workflow
│   │   └── services/         # Domain services & web scraper
│   │       ├── __init__.py
│   │       ├── url_fetcher.py # Web extraction engine for job postings
│   │       └── insights_kb.py # Knowledge Base domain prompts & insights engine
│   ├── main.py               # Uvicorn entrypoint (uvicorn main:app --reload)
│   ├── .env                  # Backend API keys & environment secrets
│   ├── requirements.txt      # Python dependencies
│   ├── run_pipeline.py       # LangGraph CLI pipeline test runner
│   └── FUTURE_ENHANCEMENTS.md
├── frontend/                 # Modern Next.js 15 App Router Frontend
│   ├── src/                  # Source code
│   │   ├── app/              # Next.js App Router pages (layout, globals.css, auth)
│   │   ├── components/       # Reusable UI components (ScrollToTop, ResumePdfViewer)
│   │   ├── lib/              # API fetch helpers & HTTP utilities
│   │   ├── types/            # TypeScript domain interfaces
│   │   └── middleware.ts     # Next.js authentication middleware
│   ├── public/               # Static icons, PDF worker, and screenshots
│   ├── .env.local            # Frontend environment configuration
│   ├── next.config.ts        # Next.js build configuration
│   ├── package.json          # Node dependencies
│   └── tsconfig.json         # TypeScript compiler configuration
├── .gitignore                # Root Git ignore rule set
└── README.md                 # Project documentation
```

---

## 📸 Screenshots

| 1. Input & Fetch Job Context | 2. Human-in-the-Loop (HITL) Review Modal |
| :---: | :---: |
| ![Job Context & Resume Input](frontend/public/screenshots/input_screen.png) | ![HITL Review Modal](frontend/public/screenshots/hitl_modal.png) |

| 3. Strategic Readiness Score & Executive Insights | 4. 48-Hour PoC Missing Skill Roadmap |
| :---: | :---: |
| ![Executive Insights](frontend/public/screenshots/insights_dashboard.png) | ![48-Hr PoC Roadmap](frontend/public/screenshots/poc_roadmap.png) |

---

## ✨ Key Features

- **🎨 Universal Delta Custom Scrollbar**: Beautiful, slim, theme-matched scrollbar across all containers, drawers, modals, and textareas.
- **🌐 Automated Job URL Extraction**: Paste any job URL (LinkedIn, Greenhouse, Lever, company career pages) to automatically extract company mission, tech stack, and role requirements.
- **📄 Resume PDF & Text Parsing**: Drag and drop `.pdf`, `.txt`, or `.md` resumes with client-side PDF rendering.
- **🧠 LangGraph State Machine Workflow**:
  - **Requirement & Profile Extraction**: Structured technical entity extraction.
  - **ATS Gap Analysis Classifier**: Buckets required skills into **Missing**, **Weak**, and **Strong**.
  - **⏸️ Human-in-the-Loop Interrupt (`interrupt()`)**: Execution pauses for human verification before finalizing analysis.
  - **📈 Strategic Tier 1 Insights**: Generates Readiness Score (0-100%), Executive Summary, 48-Hour Proof-of-Concept Project Roadmaps, Resume Bullet Upgrades, and Technical Interview Defense Questions.
- **🔐 Custom Auth UI**: Sleek, non-scrollable light theme authentication pages seamlessly styled to match application aesthetics.

---

## 🛠️ Tech Stack

- **AI Framework**: LangGraph (`StateGraph` + `MemorySaver` checkpointer)
- **LLM Engines**: Groq (primary) with Gemini fallback mechanisms
- **Backend API**: FastAPI, Pydantic v2, `pypdf`, `httpx`, `beautifulsoup4`
- **Frontend UI**: Next.js (App Router), React, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons

---

## 🚀 Getting Started

### 1. Backend Setup

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Configure environment variables in backend/.env:
# GROQ_API_KEY=your_groq_api_key
# GOOGLE_API_KEY=your_google_gemini_api_key
# OPENROUTER_API_KEY=your_openrouter_api_key

# 3. (Optional) Run CLI Pipeline Test
python run_pipeline.py

# 4. Start FastAPI Backend Server
python -m uvicorn main:app --reload --port 8000
```
Backend interactive API docs will be live at `http://localhost:8000/docs`.

### 2. Frontend Setup

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Start Next.js Development Server
npm run dev
```
Frontend application will be live at `http://localhost:3000`.

---

## 📄 License

MIT
