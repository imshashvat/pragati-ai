# backend/app/services/llm_assistant.py
# Read-only LLM explainer: narrates pre-computed risk data only.
# Never generates its own risk scores. Uses NVIDIA's OpenAI-compatible API.

import json
import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# Do NOT read the key at module-import time — main.py calls load_dotenv() first,
# but modules are imported before that. Read lazily inside explain_project().
NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
PRIMARY_MODEL = "moonshotai/kimi-k3"
FALLBACK_MODEL = "meta/llama-3.1-8b-instruct"

SYSTEM_PROMPT = """You are a read-only risk-data explainer for PRAGATI-AI, 
the Government of India's infrastructure project monitoring platform.

STRICT RULES:
1. You are explaining PRE-COMPUTED risk data produced by a CatBoost ML model.
2. You MUST NOT invent, modify, or produce any risk score yourself.
3. You MUST NOT speculate beyond what the provided data shows.
4. If asked something the data does not cover, clearly say so.
5. Use plain, professional English suitable for a government official.
6. Be concise — 2-4 sentences per answer unless more detail is explicitly needed.
7. Never recommend a project be cancelled or approved — only explain the data."""


FALLBACK_RESPONSE = (
    "Assistant unavailable — showing computed data only. "
    "Please review the risk scores and SHAP drivers above."
)


def _build_user_message(project_data: dict, question: Optional[str]) -> str:
    """Serialize project context + question into the user turn."""
    ctx = json.dumps(project_data, ensure_ascii=False, default=str)
    if question:
        return f"Project data (JSON):\n{ctx}\n\nQuestion: {question}"
    return (
        f"Project data (JSON):\n{ctx}\n\n"
        "Please write a 2-3 sentence plain-language summary of this project's "
        "risk situation for a senior government official. "
        "Only use the numbers and drivers provided — do not add your own estimates."
    )


def explain_project(project_data: dict, question: Optional[str] = None) -> str:
    """
    Call NVIDIA API to explain pre-computed risk data.
    Returns a graceful fallback string on any failure — never raises.
    """
    # Read key lazily so load_dotenv() in main.py has already populated os.environ
    api_key = os.getenv("NVIDIA_API_KEY", "").strip()
    if not api_key:
        logger.warning("NVIDIA_API_KEY not set — returning fallback response.")
        return FALLBACK_RESPONSE

    payload = {
        "model": PRIMARY_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": _build_user_message(project_data, question)},
        ],
        "max_tokens": 512,
        "temperature": 0.3,
        "stream": False,
        "reasoning_effort": "low",   # Kimi K3 is a reasoning model; 'low' = faster responses
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    for model in (PRIMARY_MODEL, FALLBACK_MODEL):
        payload["model"] = model
        # Remove reasoning_effort for non-reasoning fallback models
        if model == FALLBACK_MODEL:
            payload.pop("reasoning_effort", None)
        try:
            # Kimi K3 is a reasoning model — needs a longer read timeout (up to 90s)
            timeout = httpx.Timeout(connect=10.0, read=90.0, write=10.0, pool=5.0)
            with httpx.Client(timeout=timeout) as client:
                resp = client.post(NVIDIA_URL, json=payload, headers=headers)

                # Handle 429 rate limit — wait and retry once
                if resp.status_code == 429:
                    import time
                    wait = int(resp.headers.get("Retry-After", "6"))
                    logger.warning("NVIDIA 429 rate limit (model=%s) — retrying in %ss", model, wait)
                    time.sleep(wait)
                    resp = client.post(NVIDIA_URL, json=payload, headers=headers)

                resp.raise_for_status()
                data = resp.json()
                answer = data["choices"][0]["message"]["content"].strip()
                if model != PRIMARY_MODEL:
                    logger.warning("Fell back to model %s", model)
                return answer

        except httpx.HTTPStatusError as exc:
            logger.warning(
                "NVIDIA API HTTP error with model %s: %s %s",
                model, exc.response.status_code, exc.response.text[:200],
            )
        except httpx.TimeoutException:
            logger.warning("NVIDIA API timeout with model %s", model)
        except Exception as exc:  # pylint: disable=broad-except
            logger.warning("NVIDIA API error with model %s: %s", model, exc)

    # Both models failed
    return FALLBACK_RESPONSE
