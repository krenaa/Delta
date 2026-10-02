from typing import Dict, List, Tuple
from src.core.state import InterviewQuestion, MissingSkillRoadmap, WeakImprovement

# Domain-specific knowledge base containing hiring manager rationale, 48-hr bridge projects, interview Q&A, and resume bullets
TECH_KNOWLEDGE_BASE: Dict[str, Dict[str, any]] = {
    "kubernetes": {
        "company_keywords": ["Zero-Downtime Releases", "Pod Autoscaling", "Microservice Mesh"],
        "why_it_matters": (
            "Production microservices in this role are deployed as containerized pods across distributed clusters. "
            "The engineering team requires developers who understand pod lifecycles, resource limits (CPU/memory), "
            "and rolling zero-downtime updates to prevent service disruptions."
        ),
        "project_keywords": ["Local k3s Cluster", "Custom Helm Chart", "ConfigMaps & Probes"],
        "bridge_project": (
            "Deploy a lightweight local k3s or Minikube cluster. Author a custom Helm chart for your FastAPI app "
            "with 3 replicas, a ConfigMap for environment settings, and liveness/readiness probes. "
            "Record a 2-minute terminal demo or publish the Helm repository to GitHub."
        ),
        "bridge_keywords": ["FastAPI Docker App", "Docker Compose", "Containerized APIs"],
        "transferable_from": "Connect this with your containerized FastAPI / Docker microservices project: frame Docker containerization as the direct stepping stone to Kubernetes Pod specs and Helm deployment manifests.",
        "question": "How have you handled zero-downtime rolling deployments, StatefulSets vs Deployments, and cluster pod crash-loop debugging in Kubernetes?",
        "talking_points": (
            "1. Discuss core Kubernetes architecture: Pods, Services, Ingress, and ConfigMaps/Secrets.\n"
            "2. Frame your Docker and containerization experience as the foundational stepping stone to orchestration.\n"
            "3. Mention hands-on experience deploying local k3s/Minikube clusters, writing Helm charts, and setting resource limits to avoid OOMKills."
        ),
        "bullets": [
            "Orchestrated containerized microservices on Kubernetes, authoring Helm charts and configuring Horizontal Pod Autoscaling (HPA) to absorb 3x traffic surges.",
            "Standardized Kubernetes deployment manifests with liveness/readiness probes and ingress controllers, maintaining 99.9% uptime during zero-downtime releases.",
        ],
    },
    "redis": {
        "company_keywords": ["Sub-ms Latency", "Cache Invalidation", "Thundering Herd Prevention"],
        "why_it_matters": (
            "High-throughput APIs require sub-millisecond caching, session management, and distributed rate limiting "
            "to prevent relational database connection pool exhaustion under sudden traffic spikes."
        ),
        "project_keywords": ["FastAPI Redis Middleware", "Sliding-Window Limiter", "Cache-Aside TTL"],
        "bridge_project": (
            "Implement a FastAPI middleware using `redis-py` that executes a sliding-window rate limiter (100 req/min) "
            "and caches expensive database query results with deterministic TTLs. "
            "Benchmark using Locust/k6 showing an 80% database load reduction and <10ms p95 latency."
        ),
        "bridge_keywords": ["Python In-Memory Caching", "PostgreSQL Queries", "FastAPI Endpoints"],
        "transferable_from": "Connect this with your backend database query layer: Python in-memory dictionaries and SQL query caching map directly into Redis key-value and sorted set operations.",
        "question": "In what scenarios would you choose Redis over a relational database or an application in-memory cache, and how do you handle cache invalidation, key eviction policies, and cache stampedes?",
        "talking_points": (
            "1. Clarify Redis data structures: Strings, Hashes, Sorted Sets, and Pub/Sub rather than just treating it as a dumb key-value store.\n"
            "2. Detail caching patterns: Cache-Aside vs Write-Through, setting deterministic TTLs, and using mutex locks or probabilistic early expiration to prevent dogpiling/stampedes.\n"
            "3. Highlight past experience caching expensive DB query results or session states to achieve sub-10ms response times."
        ),
        "bullets": [
            "Implemented high-throughput Redis distributed caching layer utilizing Cache-Aside pattern, reducing primary database load by 55% and trimming p95 latency to <12ms.",
            "Architected atomic distributed rate limiters and session storage pipelines using Redis Sorted Sets and pipelined Lua scripts.",
        ],
    },
    "aws": {
        "company_keywords": ["Cloud Scalability", "IAM Least-Privilege", "VPC Network Isolation"],
        "why_it_matters": (
            "The engineering team hosts its production infrastructure on AWS. They need developers who can configure "
            "services like ECS/EKS, S3, and RDS independently while adhering to IAM least-privilege security standards."
        ),
        "project_keywords": ["ECS Fargate Task", "ECR Image Pipeline", "GitHub Actions OIDC"],
        "bridge_project": (
            "Using the AWS Free Tier, push a container image to AWS ECR, deploy it as an ECS Fargate task behind an Application "
            "Load Balancer (ALB), and automate the deployment pipeline using GitHub Actions with AWS OIDC authentication."
        ),
        "bridge_keywords": ["Linux Server Admin", "CI/CD Pipelines", "Docker Containers"],
        "transferable_from": "Connect this with your CI/CD and deployment workflows: Linux administration, environment management, and container builds directly bridge into AWS ECS task configurations.",
        "question": "How do you architect scalable, secure cloud environments in AWS using services like ECS/EKS, RDS, S3, and IAM role least-privilege principles?",
        "talking_points": (
            "1. Emphasize Infrastructure-as-Code (Terraform, CloudFormation) and multi-tier VPC topology (public vs private subnets, NAT Gateways).\n"
            "2. Explain least-privilege security: IAM role delegation and instance profiles instead of hardcoded API access keys.\n"
            "3. Highlight automated CI/CD deployment pipelines integrating AWS services with automated health checks and CloudWatch monitoring."
        ),
        "bullets": [
            "Provisioned resilient AWS cloud infrastructure spanning ECS Fargate, RDS Multi-AZ, S3, and CloudFront, automating continuous deployments via GitHub Actions.",
            "Hardened enterprise cloud posture with strict IAM least-privilege policies, VPC security group boundaries, and automated CloudWatch alarms.",
        ],
    },
    "langgraph": {
        "company_keywords": ["Stateful Agent Graphs", "Cyclical LLM Loops", "HITL Human Gates"],
        "why_it_matters": (
            "The company is advancing from simple one-shot LLM prompts to stateful, multi-turn agent graphs "
            "that require cyclical execution, memory persistence across sessions, and human approval interrupts."
        ),
        "project_keywords": ["3-Node StateGraph", "MemorySaver Checkpointer", "interrupt() Resume"],
        "bridge_project": (
            "Build an open-source 3-node LangGraph agent: Research Node -> Reasoning Node -> Human Approval Interrupt (`interrupt()`) -> Tool Execution. "
            "Persist session history using `MemorySaver` and write a test demonstrating workflow resumption via `Command(resume=...)`."
        ),
        "bridge_keywords": ["Python Async Microservices", "State Machine Logic", "Pydantic Schemas"],
        "transferable_from": "Connect this with your asynchronous Python API workflows: state channels, validation schemas, and microservice pipelines bridge directly into LangGraph state machine designs.",
        "question": "How does LangGraph's cyclical graph architecture differ from linear LangChain chains, and how do you implement state persistence, conditional branching, and human-in-the-loop interrupts?",
        "talking_points": (
            "1. Explain StateGraph architecture: nodes as functional state transformers, edges as routing logic, and state schemas defined via TypedDict or Pydantic.\n"
            "2. Detail checkpointing with MemorySaver or PostgresSaver to enable conversational multi-turn sessions and time-travel state inspection.\n"
            "3. Describe using `interrupt()` for human approvals (HITL) and resuming execution with `Command(resume=...)` without re-running prior nodes."
        ),
        "bullets": [
            "Architected stateful multi-agent reasoning workflows using LangGraph, incorporating cyclical routing loops, persistent checkpointers, and Human-in-the-Loop review gates.",
            "Engineered custom tool-calling agents and structured output evaluators, increasing complex task completion accuracy by 45% across multi-step execution graphs.",
        ],
    },
    "llm": {
        "company_keywords": ["Zero Hallucination", "Strict JSON Schemas", "Latency & Cost Tuning"],
        "why_it_matters": (
            "Production GenAI products require rigorous validation to prevent hallucinations, reduce latency, and ensure strict JSON schema compliance for downstream automation."
        ),
        "project_keywords": ["ChromaDB Vector RAG", "Multi-Provider Fallback", "Pydantic Output Parser"],
        "bridge_project": (
            "Build a production RAG pipeline using ChromaDB, Pydantic structured output parsing, and multi-model fallback (e.g. Groq Llama for speed, Gemini for complex reasoning). "
            "Write an evaluation suite measuring schema validity rate and retrieval precision."
        ),
        "bridge_keywords": ["FastAPI Schema Contracts", "REST API Validation", "Data Cleaning"],
        "transferable_from": "Connect this with your backend contract validation: Pydantic schemas and REST payload sanitization directly apply to LLM structured output parsing and RAG prompt grounding.",
        "question": "How do you evaluate and optimize LLM latency, token cost, and hallucination rates in production pipelines (e.g. structured output parsing, temperature tuning, and RAG retrieval)?",
        "talking_points": (
            "1. Detail structured output enforcement using Pydantic schemas and provider function-calling APIs to guarantee deterministic JSON outputs.\n"
            "2. Discuss RAG mechanics: semantic chunking, embedding generation, vector indexing, and re-ranking to ground LLM reasoning in verified documents.\n"
            "3. Highlight multi-provider fallback routing (e.g., fast inference with Groq vs deep reasoning with Gemini) to optimize cost and latency."
        ),
        "bullets": [
            "Built production RAG pipelines integrating vector search and semantic chunking, reducing hallucination rates by 40% and cutting LLM token costs by 50% via intelligent caching.",
            "Engineered structured schema validation using Pydantic and multi-provider fallback routing, achieving 99.8% JSON response compliance.",
        ],
    },
    "docker": {
        "company_keywords": ["Reproducible Staging", "Minimal Image Footprint", "Container Hardening"],
        "why_it_matters": (
            "Containerization ensures deterministic builds across local development, staging environments, and CI/CD deployment pipelines."
        ),
        "project_keywords": ["Multi-Stage Dockerfile", "Distroless Runtime", "docker-compose Network"],
        "bridge_project": (
            "Refactor a single-stage Dockerfile into a hardened multi-stage build (builder + distroless runtime), reducing image footprint from 800MB to 90MB with non-root security enforcement."
        ),
        "bridge_keywords": ["Python venv Isolation", "Requirements Management", "Git Workflows"],
        "transferable_from": "Connect this with your local development setups: virtual environments and dependency management map directly to Docker layer caching and isolation.",
        "question": "How do you optimize multi-stage Docker builds for minimal image size and layer caching efficiency, and what security practices do you enforce in container images?",
        "talking_points": (
            "1. Walk through multi-stage Dockerfiles: separating heavy build-time toolchains from lightweight runtime images.\n"
            "2. Discuss layer caching: copying dependency definitions (`requirements.txt`, `package.json`) before application code.\n"
            "3. Address container security: running as non-root user, scanning images with Trivy, and avoiding secret injection during image build time."
        ),
        "bullets": [
            "Optimized production Docker multi-stage builds, shrinking container footprint by 65% and cutting CI/CD deployment build times from 11m to 3m.",
            "Containerized distributed full-stack services with docker-compose, standardizing developer onboarding and isolated end-to-end testing environments.",
        ],
    },
    "postgresql": {
        "company_keywords": ["ACID Reliability", "Query Plan Optimization", "Connection Pool Tuning"],
        "why_it_matters": (
            "The company's core transactions and relational datasets rely on PostgreSQL. They need engineers who can write efficient queries and design schemas without bottlenecking production databases."
        ),
        "project_keywords": ["100k Mock DB Setup", "EXPLAIN ANALYZE Benchmarks", "Composite B-Tree Indexes"],
        "bridge_project": (
            "Populate a PostgreSQL database with 100,000 mock transactional records. Write an analysis script comparing query plans (`EXPLAIN ANALYZE`) before and after composite B-Tree indexing, demonstrating a 10x query speedup."
        ),
        "bridge_keywords": ["SQLAlchemy ORM", "Relational Schemas", "FastAPI DB Repositories"],
        "transferable_from": "Connect this with your relational database models: SQLAlchemy models, foreign key relationships, and query construction bridge directly into index optimization and connection pooling.",
        "question": "How do you investigate and resolve slow queries in PostgreSQL using EXPLAIN ANALYZE, and how do you design indexes for high-concurrency read/write workloads?",
        "talking_points": (
            "1. Explain query execution analysis: recognizing sequential scans, nested loop joins vs hash joins, and identifying missing indexes.\n"
            "2. Compare index types: B-Tree for equality/range, GIN for JSONB/full-text search, and partial indexes for filtered query optimization.\n"
            "3. Discuss operational durability: connection pooling with PgBouncer, auto-vacuum tuning, and zero-downtime schema migrations with Alembic."
        ),
        "bullets": [
            "Designed normalized PostgreSQL database schemas with B-tree and composite indexing, tuning execution plans to accelerate query speeds by 60%.",
            "Configured connection pooling via PgBouncer and automated database migration pipelines, supporting 2,000+ concurrent connections under peak loads.",
        ],
    },
}

QUESTION_TEMPLATES: List[Tuple[str, str]] = [
    (
        "In production architectures requiring {skill}, what core design patterns, performance trade-offs, and failure modes have you encountered?",
        "Demonstrate solid conceptual mastery of {skill}. Explain how your proven experience in related tools directly maps to this domain, and reference concrete hands-on laboratory or proof-of-concept projects where you applied it.",
    ),
    (
        "How would you approach designing, monitoring, and scaling a high-reliability service built around {skill} in an enterprise environment?",
        "Walk through system design fundamentals: load distribution, error boundaries, automated health monitoring, and graceful degradation when integrating {skill}.",
    ),
    (
        "What are the most common pitfalls or anti-patterns when deploying {skill}, and how do you ensure code maintainability and security?",
        "Highlight your systematic debugging approach, adherence to industry best practices, test automation, and proactive security hardening for {skill}.",
    ),
    (
        "Can you discuss how {skill} integrates with existing CI/CD pipelines, containerized deployments, and team collaboration workflows?",
        "Frame {skill} within modern engineering practices: automated linting, test suites, infrastructure-as-code, and continuous delivery with zero downtime.",
    ),
]

BULLET_TEMPLATES: List[List[str]] = [
    [
        "Engineered and integrated {skill} modules into core service pipelines, improving processing throughput and reducing latency by 35%.",
        "Standardized development workflows and automated testing for {skill}, accelerating team deployment velocity by 40%.",
    ],
    [
        "Architected scalable infrastructure components utilizing {skill}, reducing infrastructure overhead and maintaining 99.9% service availability.",
        "Authored comprehensive documentation and reusable code templates for {skill}, onboarding 5+ team members and establishing best-practice guidelines.",
    ],
]


def get_skill_knowledge(skill_name: str, index: int = 0) -> Tuple[InterviewQuestion, WeakImprovement]:
    """Retrieves deep domain-specific knowledge or generates uniquely varied content for a skill."""
    cleaned = skill_name.strip().lower()

    matched_key = None
    for key in TECH_KNOWLEDGE_BASE:
        if key in cleaned or cleaned in key:
            matched_key = key
            break

    if matched_key:
        data = TECH_KNOWLEDGE_BASE[matched_key]
        question = InterviewQuestion(
            question=data["question"],
            targeted_skill=skill_name,
            suggested_talking_points=data["talking_points"],
        )
        improvement = WeakImprovement(
            skill=skill_name,
            recommended_bullets=data["bullets"],
        )
        return question, improvement

    q_tmpl, points_tmpl = QUESTION_TEMPLATES[index % len(QUESTION_TEMPLATES)]
    b_tmpl_set = BULLET_TEMPLATES[index % len(BULLET_TEMPLATES)]

    question = InterviewQuestion(
        question=q_tmpl.format(skill=skill_name),
        targeted_skill=skill_name,
        suggested_talking_points=points_tmpl.format(skill=skill_name),
    )
    improvement = WeakImprovement(
        skill=skill_name,
        recommended_bullets=[b.format(skill=skill_name) for b in b_tmpl_set],
    )
    return question, improvement


def get_missing_skill_roadmap(skill_name: str, index: int = 0) -> MissingSkillRoadmap:
    """Generates an actionable 48-hour bridge plan, hiring manager context, and transferable project connection for a missing skill."""
    cleaned = skill_name.strip().lower()

    matched_key = None
    for key in TECH_KNOWLEDGE_BASE:
        if key in cleaned or cleaned in key:
            matched_key = key
            break

    if matched_key and "why_it_matters" in TECH_KNOWLEDGE_BASE[matched_key]:
        data = TECH_KNOWLEDGE_BASE[matched_key]
        return MissingSkillRoadmap(
            skill=skill_name,
            company_keywords=data.get("company_keywords", [f"{skill_name} Production Standards", "Core Reliability"]),
            why_it_matters=data["why_it_matters"],
            project_keywords=data.get("project_keywords", [f"{skill_name} 48-Hr PoC", "GitHub Repository"]),
            bridge_project=data["bridge_project"],
            bridge_keywords=data.get("bridge_keywords", ["Existing Backend Work", "Core Architecture"]),
            transferable_from=data["transferable_from"],
        )

    # Dynamic fallback for unlisted skills
    return MissingSkillRoadmap(
        skill=skill_name,
        company_keywords=[f"{skill_name} Production Mastery", "Architecture Reliability"],
        why_it_matters=(
            f"The team utilizes {skill_name} as a core pillar of their tech stack. "
            f"Demonstrating familiarity with {skill_name} standards, architecture, and common pitfalls is critical to ensuring rapid project onboarding."
        ),
        project_keywords=[f"{skill_name} 48-Hr Prototype", "GitHub Demonstration"],
        bridge_project=(
            f"Build a focused 48-hour prototype project integrating {skill_name} into a sample repository. "
            f"Document the architectural decisions, configuration steps, and test results in a clear GitHub README."
        ),
        bridge_keywords=["Existing Software Experience", "Core Principles"],
        transferable_from=(
            f"Connect this with your existing software engineering foundation: your core backend skills "
            f"provide a strong conceptual baseline to ramp up quickly on {skill_name}."
        ),
    )
