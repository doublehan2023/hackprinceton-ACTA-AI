from __future__ import annotations

from src.agents.clause_extraction import ClauseExtractionAgent
from src.agents.compliance_check import ComplianceCheckAgent
from src.agents.risk_identification import RiskIdentificationAgent
from src.agents.suggestion import SuggestionAgent
from src.parsers.document_parser import parse_text
from src.pipeline.state import ClauseType, ContractReviewState


def test_review_flow_handles_inline_text_with_headings() -> None:
    parsed = parse_text(
        "1. Confidentiality\n"
        "Confidential information must remain protected.\n\n"
        "2. Payment Terms\n"
        "Invoices are due within thirty days."
    )
    state = ContractReviewState(review_id="review-1", filename="inline.txt", raw_text=parsed.raw_text, sections=parsed.sections)

    state = state.model_copy(update=ClauseExtractionAgent()(state))
    state = state.model_copy(update=RiskIdentificationAgent()(state))
    state = state.model_copy(update=ComplianceCheckAgent()(state))
    state = state.model_copy(update=SuggestionAgent()(state))

    assert len(state.clauses) == 2
    assert state.summary.startswith("Reviewed 2 clauses.")
    assert {clause.section_title for clause in state.clauses} == {"1. Confidentiality", "2. Payment Terms"}


def test_clause_extraction_agent_can_use_llm_response() -> None:
    parsed = parse_text(
        "1. Confidentiality\n"
        "Confidential information must remain protected.\n\n"
        "2. Payment Terms\n"
        "Invoices are due within thirty days."
    )
    state = ContractReviewState(review_id="review-llm", filename="inline.txt", raw_text=parsed.raw_text, sections=parsed.sections)

    class FakeResponse:
        content = """
        {
          "clauses": [
            {
              "text": "Confidential information must remain protected.",
              "clause_type": "Confidentiality",
              "section_title": "1. Confidentiality",
              "section_order": 1,
              "evidence": ["confidential information"],
              "classification_confidence": 0.91
            },
            {
              "text": "Invoices are due within thirty days.",
              "clause_type": "Payment Terms",
              "section_title": "2. Payment Terms",
              "section_order": 2,
              "evidence": ["invoices"],
              "classification_confidence": 0.88
            }
          ]
        }
        """

    class FakeLLM:
        def invoke(self, messages):
            assert len(messages) == 2
            return FakeResponse()

    agent = ClauseExtractionAgent()
    agent.llm = FakeLLM()

    result = agent(state)

    assert len(result["clauses"]) == 2
    assert result["clauses"][0].clause_type is ClauseType.CONFIDENTIALITY
    assert result["clauses"][1].clause_type is ClauseType.PAYMENT_TERMS
    assert result["clauses"][0].section_order == 1
    assert result["clauses"][1].section_order == 2
