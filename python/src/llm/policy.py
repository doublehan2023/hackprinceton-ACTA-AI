from __future__ import annotations

from src.config import LLMRuntime


def validate_llm_runtime(
    runtime: LLMRuntime,
    *,
    require_enabled: bool = True,
    provider_type: str = "openai_compatible",
    allowed_provider_names: set[str] | None = None,
) -> str | None:
    if require_enabled and not runtime.enabled:
        return runtime.disabled_reason or "LLM runtime is not configured."

    if provider_type and runtime.provider_type != provider_type:
        return f"LLM runtime must be {provider_type}, got {runtime.provider_type}."

    if allowed_provider_names is not None and runtime.provider_name not in allowed_provider_names:
        allowed = ", ".join(sorted(allowed_provider_names))
        return f"LLM runtime provider must be one of: {allowed}."

    return None
