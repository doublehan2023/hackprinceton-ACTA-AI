from __future__ import annotations

import json
import re

try:
    from langchain_core.messages import HumanMessage, SystemMessage
except ImportError:  # pragma: no cover - optional dependency in local test env
    HumanMessage = None
    SystemMessage = None


def truncate_text(text: str, max_chars: int, marker: str = "[TRUNCATED]") -> str:
    normalized = text.strip()
    if len(normalized) <= max_chars:
        return normalized
    return normalized[:max_chars].rstrip() + f"\n\n{marker}"


def build_messages(system_prompt: str, user_prompt: str) -> list[object]:
    if HumanMessage is not None and SystemMessage is not None:
        return [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def coerce_response_text(content: object) -> str:
    if isinstance(content, list):
        parts: list[str] = []
        for part in content:
            if isinstance(part, dict):
                parts.append(str(part.get("text", "")))
            else:
                text = getattr(part, "text", None)
                parts.append(str(text if text is not None else part))
        text = "".join(parts)
    elif isinstance(content, str):
        text = content
    else:
        text = str(content)

    text = text.strip()
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL | re.IGNORECASE).strip()
    if "</think>" in text.lower():
        parts = re.split(r"</think>", text, flags=re.IGNORECASE, maxsplit=1)
        text = parts[-1].strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def parse_json_response(response: object) -> dict[str, object]:
    text = coerce_response_text(getattr(response, "content", response))
    payload = json.loads(text)
    if not isinstance(payload, dict):
        raise ValueError("Expected top-level JSON object from LLM response.")
    return payload
