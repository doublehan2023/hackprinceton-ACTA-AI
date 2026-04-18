from __future__ import annotations

import json
import logging

from src.config import get_llm, get_settings
from src.nlp.legal_nlp import extract_clauses
from src.pipeline.state import Clause, ClauseType, ContractReviewState, Section

logger = logging.getLogger(__name__)

try:
    from langchain_core.messages import HumanMessage, SystemMessage
except ImportError:  # pragma: no cover - optional dependency in local test env
    HumanMessage = None
    SystemMessage = None

SYSTEM_PROMPT = """You are a legal contract clause extraction expert.

Extract contract clauses from the provided text and return valid JSON only.

Use this schema exactly:
{
  "clauses": [
    {
      "text": "full clause text",
      "clause_type": "one of the allowed clause types",
      "section_title": "section heading if available, otherwise null",
      "section_order": 1,
      "evidence": ["keyword or phrase that supports the classification"],
      "classification_confidence": 0.0
    }
  ]
}

Allowed clause_type values:
- Confidentiality
- Indemnification
- Payment Terms
- Intellectual Property
- Publication Rights
- Termination
- Governing Law
- Subject Injury
- Protocol Deviations
- General Clause

Rules:
- Return JSON only, with no markdown fences.
- Preserve clause ordering from the source text.
- classification_confidence must be between 0 and 1.
- Keep clause text faithful to the source.
- If a section heading is unknown, use null for section_title and null for section_order.
"""


class ClauseExtractionAgent:
    def __init__(self) -> None:
        self.llm = None

    def _ensure_llm(self) -> None:
        if self.llm is None:
            self.llm = get_llm()

    def __call__(self, state: ContractReviewState) -> dict[str, object]:
        source_text = state.raw_text.strip()
        if not source_text:
            return {"clauses": []}

        self._ensure_llm()
        if self.llm is None:
            logger.info("No LLM configured for clause extraction; using rules fallback.")
            return self._fallback_result(state)

        try:
            payload = self._extract_with_llm(source_text, state.sections)
            clauses = self._parse_clauses(payload, state.sections)
            if clauses:
                return {"clauses": clauses}
            logger.warning("LLM clause extraction returned no clauses; using rules fallback.")
        except Exception as exc:  # pragma: no cover - exercised by integration behavior
            logger.warning("LLM clause extraction failed; using rules fallback: %s", exc)

        return self._fallback_result(state)

    def _prepare_text(self, raw_text: str, sections: list[Section]) -> str:
        if sections:
            formatted_sections: list[str] = []
            for section in sections:
                header = f"[Section {section.source_order}]"
                if section.title:
                    header = f"{header} {section.title}"
                formatted_sections.append(f"{header}\n{section.body.strip()}")
            text = "\n\n".join(formatted_sections).strip()
        else:
            text = raw_text

        max_chars = 15000
        if len(text) > max_chars:
            return text[:max_chars] + "\n\n[TRUNCATED]"
        return text

    def _extract_with_llm(self, raw_text: str, sections: list[Section]) -> dict[str, object]:
        prompt_text = self._prepare_text(raw_text, sections)
        if HumanMessage is not None and SystemMessage is not None:
            messages = [
                SystemMessage(content=SYSTEM_PROMPT),
                HumanMessage(content=f"Extract structured clauses from this contract:\n\n{prompt_text}"),
            ]
        else:
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Extract structured clauses from this contract:\n\n{prompt_text}"},
            ]
        response = self.llm.invoke(messages)
        content = response.content
        if isinstance(content, list):
            content = "".join(
                part.get("text", "") if isinstance(part, dict) else str(part)
                for part in content
            )
        if not isinstance(content, str):
            content = str(content)
        return json.loads(self._strip_code_fences(content.strip()))

    def _strip_code_fences(self, content: str) -> str:
        if content.startswith("```"):
            lines = content.splitlines()
            if lines and lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            return "\n".join(lines).strip()
        return content

    def _parse_clauses(self, payload: dict[str, object], sections: list[Section]) -> list[Clause]:
        section_lookup = {section.source_order: section for section in sections}
        clauses: list[Clause] = []

        for index, item in enumerate(payload.get("clauses", []), start=1):
            if not isinstance(item, dict):
                continue

            clause_text = str(item.get("text", "")).strip()
            if not clause_text:
                continue

            raw_type = str(item.get("clause_type", ClauseType.GENERAL.value))
            clause_type = self._coerce_clause_type(raw_type)
            section_order = self._coerce_int(item.get("section_order"))
            section_title = item.get("section_title")
            if section_title is not None:
                section_title = str(section_title)
            elif section_order in section_lookup:
                section_title = section_lookup[section_order].title

            evidence = item.get("evidence", [])
            if not isinstance(evidence, list):
                evidence = []

            confidence = self._coerce_confidence(item.get("classification_confidence"))

            clauses.append(
                Clause(
                    id=f"clause-{index}",
                    clause_type=clause_type,
                    text=clause_text,
                    source_order=index,
                    section_title=section_title,
                    section_order=section_order,
                    evidence=[str(value) for value in evidence if str(value).strip()],
                    classification_confidence=confidence,
                )
            )

        max_clauses = get_settings().analysis_max_clauses
        return clauses[:max_clauses]

    def _coerce_clause_type(self, raw_value: str) -> ClauseType:
        normalized = raw_value.strip().lower()
        alias_map = {
            "confidentiality": ClauseType.CONFIDENTIALITY,
            "indemnification": ClauseType.INDEMNIFICATION,
            "payment terms": ClauseType.PAYMENT_TERMS,
            "payment": ClauseType.PAYMENT_TERMS,
            "intellectual property": ClauseType.INTELLECTUAL_PROPERTY,
            "publication rights": ClauseType.PUBLICATION_RIGHTS,
            "publication": ClauseType.PUBLICATION_RIGHTS,
            "termination": ClauseType.TERMINATION,
            "governing law": ClauseType.GOVERNING_LAW,
            "subject injury": ClauseType.SUBJECT_INJURY,
            "protocol deviations": ClauseType.PROTOCOL_DEVIATIONS,
            "general clause": ClauseType.GENERAL,
            "general": ClauseType.GENERAL,
        }
        return alias_map.get(normalized, ClauseType.GENERAL)

    def _coerce_confidence(self, value: object) -> float:
        try:
            confidence = float(value)
        except (TypeError, ValueError):
            return 0.5
        return min(max(confidence, 0.0), 1.0)

    def _coerce_int(self, value: object) -> int | None:
        try:
            return int(value) if value is not None else None
        except (TypeError, ValueError):
            return None

    def _fallback_result(self, state: ContractReviewState) -> dict[str, object]:
        return {
            "clauses": extract_clauses(
                state.raw_text,
                max_clauses=get_settings().analysis_max_clauses,
                sections=state.sections,
            )
        }
