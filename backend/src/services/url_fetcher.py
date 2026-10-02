import json
import re
import urllib.parse
from typing import Optional
from bs4 import BeautifulSoup
import httpx
from pydantic import BaseModel, Field

from src.core.llm import execute_llm_with_fallback


class JobUrlParsedResult(BaseModel):
    url: str
    company_name: str = Field(
        default="Target Company", description="Extracted company or organization name"
    )
    role_title: str = Field(
        default="Target Role", description="Extracted job or position title"
    )
    company_context: str = Field(
        default="",
        description="Concise bullet points summarizing company domain, core infrastructure, and engineering mission",
    )
    company_context_bullets: list[str] = Field(
        default_factory=list,
        description="List of distinct bullet points for company background",
    )
    job_description_clean: str = Field(
        default="",
        description="Clean, structured job description text with role requirements and duties",
    )
    source_platform: str = Field(
        default="Web", description="Detected job source platform (e.g. LinkedIn, Greenhouse, Web)"
    )


class JobUrlLLMSchema(BaseModel):
    company_name: str = Field(
        description="The hiring company or organization name (e.g. 'Anthropic', 'Vueverse', 'Scale AI')"
    )
    role_title: str = Field(
        description="The target job title (e.g. 'Senior AWS AI Cloud Engineer')"
    )
    company_context_bullets: list[str] = Field(
        description=(
            "2 to 3 concise bullet points strictly on the company itself: "
            "(1) Domain & Industry: what the company does, their clients or market sector. "
            "(2) Tech Stack & Infrastructure: core platforms, cloud environments, or architecture they run. "
            "(3) Engineering Priority: scale, security, compliance, or core engineering ethos. "
            "CRITICAL: Do NOT copy or repeat the job requirements, duties, or role overview here!"
        )
    )
    job_description_clean: str = Field(
        description="A clean, structured markdown/plain-text representation of the role responsibilities and technical requirements. Do NOT repeat the company context bullets here."
    )


def detect_platform(url: str) -> str:
    url_lower = url.lower()
    if "linkedin.com" in url_lower:
        return "LinkedIn"
    if "greenhouse.io" in url_lower:
        return "Greenhouse"
    if "lever.co" in url_lower:
        return "Lever"
    if "workable.com" in url_lower:
        return "Workable"
    if "indeed.com" in url_lower:
        return "Indeed"
    if "ashbyhq.com" in url_lower:
        return "Ashby"
    return "Company Careers / Web"


def extract_from_slug(url: str) -> tuple[Optional[str], Optional[str]]:
    """Heuristic extraction of role and company from typical job URL slugs."""
    try:
        parsed = urllib.parse.urlparse(url)
        path = parsed.path.strip("/")
        # Pattern like /jobs/view/senior-ai-engineer-at-acme-corp-12345
        match = re.search(r"([a-z0-9-]+)-at-([a-z0-9-]+)(?:-\d+)?$", path, re.I)
        if match:
            role = match.group(1).replace("-", " ").title()
            company = match.group(2).replace("-", " ").title()
            return role, company
        # Generic slug
        parts = [p for p in path.split("/") if p and p not in ("jobs", "view", "job", "careers")]
        if parts:
            last = parts[-1].split("?")[0]
            clean = re.sub(r"-\d+$", "", last).replace("-", " ").title()
            if len(clean) > 3:
                return clean, parsed.netloc.replace("www.", "").split(".")[0].title()
    except Exception:
        pass
    return None, None


async def fetch_and_analyze_job_url(raw_url: str) -> JobUrlParsedResult:
    """Fetches public webpage content from a job/company URL and uses LLM to extract company context and JD."""
    url = raw_url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    platform = detect_platform(url)
    slug_role, slug_company = extract_from_slug(url)

    html_content = ""
    fetch_error = None

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.google.com/",
    }

    try:
        async with httpx.AsyncClient(
            headers=headers,
            timeout=4.0,
            follow_redirects=True,
            verify=False,
        ) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                html_content = resp.text
            elif resp.status_code in (403, 429, 999):
                fetch_error = (
                    f"{platform} returned HTTP {resp.status_code} (automated bot guard). "
                    "We extracted available metadata from the URL."
                )
            else:
                fetch_error = f"Server returned HTTP {resp.status_code} {resp.reason_phrase}."
    except Exception as e:
        fetch_error = f"Network request failed: {str(e)}"

    extracted_title = ""
    extracted_company = slug_company or ""
    extracted_text = ""
    json_ld_desc = ""

    if html_content:
        soup = BeautifulSoup(html_content, "html.parser")

        # 1. Check for JSON-LD JobPosting schema
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string or "")
                # Could be single object or array
                items = data if isinstance(data, list) else [data]
                for item in items:
                    if isinstance(item, dict) and item.get("@type") == "JobPosting":
                        if item.get("title"):
                            extracted_title = item["title"]
                        hiring_org = item.get("hiringOrganization")
                        if isinstance(hiring_org, dict) and hiring_org.get("name"):
                            extracted_company = hiring_org["name"]
                        elif isinstance(hiring_org, str):
                            extracted_company = hiring_org
                        if item.get("description"):
                            json_ld_desc = BeautifulSoup(item["description"], "html.parser").get_text(separator="\n").strip()
            except Exception:
                continue

        # 2. Extract OpenGraph and title tags
        og_title = soup.find("meta", property="og:title")
        if og_title and not extracted_title:
            extracted_title = og_title.get("content", "").strip()

        og_desc = soup.find("meta", property="og:description")
        meta_desc = og_desc.get("content", "").strip() if og_desc else ""

        if not extracted_title and soup.title:
            extracted_title = soup.title.get_text().strip()

        # 3. Clean and extract body text
        for tag in soup(["script", "style", "nav", "footer", "header", "noscript", "svg", "form"]):
            tag.decompose()

        # Target job content containers first
        content_candidates = soup.select(
            ".show-more-less-html__markup, .job-description, .description, #job-description, "
            "[data-testid='job-description'], article, main"
        )
        if content_candidates:
            extracted_text = "\n".join(c.get_text(separator="\n") for c in content_candidates).strip()
        else:
            extracted_text = soup.get_text(separator="\n").strip()

        # Clean multiple spaces and blank lines
        extracted_text = re.sub(r"\n{3,}", "\n\n", extracted_text)

        # Prefer JSON-LD description if body is sparse
        if json_ld_desc and len(json_ld_desc) > len(extracted_text) * 0.5:
            extracted_text = f"{extracted_title}\nCompany: {extracted_company}\n\n{json_ld_desc}\n\n{extracted_text}"
        elif meta_desc and len(extracted_text) < 200:
            extracted_text = f"{extracted_title}\n\n{meta_desc}\n\n{extracted_text}"

    # Trim to ~3500 words to avoid prompt overflow
    trimmed_text = " ".join(extracted_text.split()[:3000]) if extracted_text else ""

    # If we have extracted web text, pass to LLM for high-fidelity extraction & company context
    if trimmed_text and len(trimmed_text) > 80:
        messages = [
            (
                "system",
                "You are an expert technical talent scout and company researcher. Given the raw web text extracted from a job posting or company page, "
                "synthesize a clean, high-value structured profile without duplicate content:\n"
                "1. 'company_name': Accurate official company name (e.g. 'Vueverse', 'Scale AI', 'Anthropic').\n"
                "2. 'role_title': Concise target job title.\n"
                "3. 'company_context_bullets': 2 to 3 concise, high-impact bullet points strictly focused on the company itself:\n"
                "   • Domain & Industry: what the company does, their clients or market sector.\n"
                "   • Tech Stack & Infrastructure: core platforms, cloud environments, or architecture they run.\n"
                "   • Engineering Mission: scale, security, compliance, or core engineering ethos.\n"
                "   CRITICAL: Do NOT copy or repeat the job requirements, duties, or role overview here!\n"
                "4. 'job_description_clean': A structured job description starting directly with Role Overview, Responsibilities, and Technical Requirements. Do NOT repeat the company context bullets here.\n"
                "Return only the structured output.",
            ),
            (
                "human",
                f"Source Platform: {platform}\nSource URL: {url}\nFallback Info: Title='{extracted_title or slug_role}', Company='{extracted_company or slug_company}'\n\nRaw Page Text:\n{trimmed_text}",
            ),
        ]

        llm_result = execute_llm_with_fallback(
            messages=messages, structured_schema=JobUrlLLMSchema
        )

        if llm_result and getattr(llm_result, "company_name", None):
            bullets = [b.strip() for b in getattr(llm_result, "company_context_bullets", []) if b.strip()]
            bullets_str = "\n".join(f"• {b}" for b in bullets) if bullets else f"• {llm_result.company_name} is scaling engineering capabilities."
            return JobUrlParsedResult(
                url=url,
                company_name=llm_result.company_name.strip(),
                role_title=llm_result.role_title.strip(),
                company_context=bullets_str,
                company_context_bullets=bullets,
                job_description_clean=llm_result.job_description_clean.strip(),
                source_platform=platform,
            )

    # Fallback heuristic if LLM unavailable or scraping was blocked
    final_role = extracted_title or slug_role or "Senior AI Engineer"
    # Clean generic prefixes/suffixes from title
    final_role = re.sub(r"\s*[-|].*$", "", final_role).strip()

    final_company = extracted_company or slug_company or "Target Company"
    clean_jd = trimmed_text if trimmed_text else (
        f"Role: {final_role}\nCompany: {final_company}\n\n"
        f"Source: {platform} ({url})\n\n"
        "Key Responsibilities:\n"
        "- Build scalable production microservices and engineering pipelines.\n"
        "- Implement autonomous multi-agent workflows and high-throughput APIs.\n"
        "- Maintain cloud infrastructure, automated testing, and CI/CD rollouts."
    )

    fallback_bullets = [
        f"Domain: {final_company} technology organization",
        "Architecture: Cloud-native infrastructure, scalable APIs, and automated deployment workflows",
        "Engineering Focus: High availability, architectural rigor, and rapid technical ramp-up",
    ]

    return JobUrlParsedResult(
        url=url,
        company_name=final_company,
        role_title=final_role,
        company_context="\n".join(f"• {b}" for b in fallback_bullets),
        company_context_bullets=fallback_bullets,
        job_description_clean=clean_jd,
        source_platform=platform,
    )
