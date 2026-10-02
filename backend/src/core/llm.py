import os
from typing import Any, Optional, Type
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv(override=True)

# Preferred candidate models in priority order
GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
]

GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-1.5-flash",
]

_GROQ_DISABLED = False
_GEMINI_DISABLED = False


def execute_llm_with_fallback(
    messages: list,
    structured_schema: Optional[Type[BaseModel]] = None,
) -> Optional[Any]:
    """Invokes primary Groq LLM with automatic fallback to Gemini, trying active models."""
    global _GROQ_DISABLED, _GEMINI_DISABLED

    load_dotenv(override=True)
    groq_api_key = os.getenv("GROQ_API_KEY")
    google_api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")

    # 1. Attempt with Groq (Primary)
    if not _GROQ_DISABLED and groq_api_key and not groq_api_key.startswith("your_"):
        from langchain_groq import ChatGroq

        for model in GROQ_MODELS:
            try:
                groq_llm = ChatGroq(
                    model=model,
                    groq_api_key=groq_api_key,
                    temperature=0.1,
                    max_retries=1,
                )
                model_to_call = (
                    groq_llm.with_structured_output(structured_schema)
                    if structured_schema
                    else groq_llm
                )
                result = model_to_call.invoke(messages)
                return result
            except Exception as groq_err:
                err_str = str(groq_err)
                if "invalid_api_key" in err_str or "401" in err_str:
                    _GROQ_DISABLED = True
                    print("[!] Notice: GROQ_API_KEY is unauthorized (401). Switching to Gemini...")
                    break
                elif "model_not_found" in err_str or "404" in err_str:
                    # Try next available Groq model
                    continue
                else:
                    print(f"[!] Groq model {model} failed: {groq_err}. Trying fallback...")
                    break

    # 2. Fallback to Gemini
    if not _GEMINI_DISABLED and google_api_key and not google_api_key.startswith("your_"):
        from langchain_google_genai import ChatGoogleGenerativeAI

        for model in GEMINI_MODELS:
            try:
                gemini_llm = ChatGoogleGenerativeAI(
                    model=model,
                    google_api_key=google_api_key,
                    temperature=0.1,
                    max_retries=1,
                )
                model_to_call = (
                    gemini_llm.with_structured_output(structured_schema)
                    if structured_schema
                    else gemini_llm
                )
                result = model_to_call.invoke(messages)
                return result
            except Exception as gemini_err:
                err_str = str(gemini_err)
                if "401" in err_str or "UNAUTHENTICATED" in err_str:
                    _GEMINI_DISABLED = True
                    print("[!] Notice: GOOGLE_API_KEY is unauthorized (401).")
                    break
                elif "404" in err_str or "NOT_FOUND" in err_str:
                    # Try next Gemini model
                    continue
                else:
                    print(f"[!] Gemini model {model} failed: {gemini_err}")
                    break

    return None
