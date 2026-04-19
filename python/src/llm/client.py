from __future__ import annotations

from src.config import LLMRuntime, get_llm, get_llm_runtime as _get_llm_runtime


def get_llm_runtime() -> LLMRuntime:
    return _get_llm_runtime()


def get_llm_client() -> tuple[object | None, LLMRuntime]:
    runtime = get_llm_runtime()
    if not runtime.enabled:
        return None, runtime
    return get_llm(), runtime
