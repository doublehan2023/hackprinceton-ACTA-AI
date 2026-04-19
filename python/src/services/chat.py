from __future__ import annotations

from src.api.schemas import ChatResponse
from src.llm import build_messages, coerce_response_text, get_llm_client, truncate_text


def truncate_context(context: str, max_chars: int = 12000) -> str:
    return truncate_text(context, max_chars)


def fallback_chat_answer(question: str, context: str) -> str:
    cleaned_context = context.strip()
    if cleaned_context:
        return (
            "I could not reach the configured language model, so here is a context-grounded fallback.\n\n"
            f"Question: {question.strip()}\n\n"
            "The uploaded contract context is available, but advanced Q&A is currently offline. "
            "Please check that `OPENAI_API_KEY` is set for the Python service and try again."
        )
    return (
        "I could not reach the configured language model, and no contract context was provided. "
        "Please upload or analyze a contract first, then ask your question again."
    )


def build_chat_messages(question: str, context: str) -> list[object]:
    system_prompt = (
        "You are a precise legal contract analysis assistant for clinical trial agreements. "
        "Answer the user's question using the supplied contract context when available. "
        "If the context is insufficient, say so clearly instead of inventing details. "
        "Keep answers concise, practical, and focused on the contract text."
    )
    user_prompt = (
        f"Question:\n{question.strip()}\n\n"
        f"Contract context:\n{truncate_context(context) if context.strip() else '[No contract context provided]'}"
    )

    return build_messages(system_prompt, user_prompt)


def coerce_chat_content(content: object) -> str:
    return coerce_response_text(content)


def answer_chat(question: str, context: str, *, llm: object | None = None) -> ChatResponse:
    client = get_llm_client()[0] if llm is None else llm
    if client is None:
        return ChatResponse(answer=fallback_chat_answer(question, context))

    try:
        response = client.invoke(build_chat_messages(question, context))
        answer = coerce_chat_content(getattr(response, "content", response))
    except Exception:
        answer = fallback_chat_answer(question, context)

    if not answer:
        answer = fallback_chat_answer(question, context)

    return ChatResponse(answer=answer)
