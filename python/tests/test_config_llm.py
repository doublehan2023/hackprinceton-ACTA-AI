from __future__ import annotations

from src import config


def test_get_llm_runtime_prefers_openai_settings(monkeypatch) -> None:
    monkeypatch.setattr(config, "load_dotenv", lambda _: None)
    monkeypatch.delenv("K2_API_KEY", raising=False)
    monkeypatch.setenv("OPENAI_API_KEY", "openai-key")
    monkeypatch.setenv("OPENAI_MODEL", "gpt-4o-mini")
    monkeypatch.setenv("OPENAI_BASE_URL", "https://api.openai.example/v1")
    config.get_settings.cache_clear()
    config.get_llm_runtime.cache_clear()

    runtime = config.get_llm_runtime()

    assert runtime.enabled is True
    assert runtime.provider_name == "openai"
    assert runtime.model == "gpt-4o-mini"
    assert runtime.base_url == "https://api.openai.example/v1"


def test_get_llm_runtime_prefers_k2_when_configured(monkeypatch) -> None:
    monkeypatch.setattr(config, "load_dotenv", lambda _: None)
    monkeypatch.setenv("K2_API_KEY", "k2-key")
    monkeypatch.setenv("K2_MODEL", "MBZUAI-IFM/K2-Think-v2")
    monkeypatch.setenv("K2_BASE_URL", "https://api.k2think.ai/v1")
    config.get_settings.cache_clear()
    config.get_llm_runtime.cache_clear()

    runtime = config.get_llm_runtime()

    assert runtime.enabled is True
    assert runtime.provider_name == "k2"
    assert runtime.model == "MBZUAI-IFM/K2-Think-v2"
    assert runtime.base_url == "https://api.k2think.ai/v1"


def test_get_llm_runtime_reports_disabled_when_api_key_missing(monkeypatch) -> None:
    monkeypatch.setattr(config, "load_dotenv", lambda _: None)
    monkeypatch.delenv("K2_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    config.get_settings.cache_clear()
    config.get_llm_runtime.cache_clear()

    runtime = config.get_llm_runtime()

    assert runtime.enabled is False
    assert runtime.disabled_reason == "No API key configured for the Python service."
