from __future__ import annotations

from src.config import LLMRuntime
from src.agents.risk_identification import RiskIdentificationAgent
from src.pipeline.state import Clause, ClauseType, ContractReviewState, RiskLevel


def test_risk_identification_escalates_acta_deviation_rules() -> None:
    state = ContractReviewState(
        review_id="risk-rules",
        raw_text="Termination clause",
        clauses=[
            Clause(
                id="clause-1",
                clause_type=ClauseType.TERMINATION,
                text="Sponsor may terminate this agreement at any time in its sole discretion without cause.",
                source_order=1,
                classification_confidence=0.91,
            )
        ],
    )

    result = RiskIdentificationAgent()(state)

    assert result["overall_risk_level"] is RiskLevel.RED
    assert result["risk_score"] >= 55
    assert result["risk_findings"][0].risk_type == "unilateral_termination"
    assert result["risk_findings"][0].risk_level is RiskLevel.RED
    assert result["risk_findings"][0].engine == "rules"
    assert result["needs_human_review"] is True


def test_risk_identification_merges_llm_assessment_with_rule_baseline(monkeypatch) -> None:
    state = ContractReviewState(
        review_id="risk-llm",
        raw_text="Publication clause",
        clauses=[
            Clause(
                id="clause-1",
                clause_type=ClauseType.PUBLICATION_RIGHTS,
                text="Site must obtain sponsor's prior written consent before any publication.",
                source_order=1,
                classification_confidence=0.8,
            )
        ],
    )

    class FakeResponse:
        content = """
        {
          "findings": [
            {
              "clause_id": "clause-1",
              "risk_level": "red",
              "risk_type": "publication_veto",
              "description": "The clause gives the sponsor an approval right that exceeds the ACTA review period.",
              "buyer_impact": "The site can lose meaningful publication control.",
              "seller_impact": "The sponsor gains leverage to delay or block publication.",
              "rationale": "ACTA permits limited review and patent delay, not open-ended approval rights.",
              "suggested_action": "Replace approval rights with a short review window.",
              "confidence": 0.93
            }
          ],
          "overall_risk_level": "red",
          "risk_summary": "Publication rights materially deviate from ACTA."
        }
        """

    class FakeLLM:
        def invoke(self, messages):
            assert len(messages) == 2
            return FakeResponse()

    monkeypatch.setattr(
        "src.agents.risk_identification.get_llm_client",
        lambda: (
            FakeLLM(),
            LLMRuntime(provider_name="openai", enabled=True),
        ),
    )

    agent = RiskIdentificationAgent()

    result = agent(state)
    finding = result["risk_findings"][0]

    assert result["overall_risk_level"] is RiskLevel.RED
    assert result["risk_score"] >= 90
    assert finding.risk_level is RiskLevel.RED
    assert finding.risk_type == "publication_veto"
    assert finding.engine == "merged"
    assert "publication control" in finding.buyer_impact
    assert result["risk_summary"].startswith("Reviewed 1 clauses.")


def test_risk_identification_marks_results_provisional_when_llm_fails(monkeypatch) -> None:
    state = ContractReviewState(
        review_id="risk-fallback",
        raw_text="Payment clause",
        clauses=[
            Clause(
                id="clause-1",
                clause_type=ClauseType.PAYMENT_TERMS,
                text="Invoices will be paid within net 90 days after receipt.",
                source_order=1,
                classification_confidence=0.78,
            )
        ],
    )

    class BrokenLLM:
        def invoke(self, messages):
            raise RuntimeError("boom")

    monkeypatch.setattr(
        "src.agents.risk_identification.get_llm_client",
        lambda: (
            BrokenLLM(),
            LLMRuntime(provider_name="openai", enabled=True),
        ),
    )

    agent = RiskIdentificationAgent()

    result = agent(state)
    finding = result["risk_findings"][0]

    assert result["overall_risk_level"] is RiskLevel.YELLOW
    assert 28 <= result["risk_score"] < 55
    assert finding.risk_type == "extended_payment_timeline"
    assert finding.engine == "rules"
    assert result["needs_human_review"] is True
    assert result["errors"] == ["Risk identification K2 analysis failed: boom"]
    assert "provisional rule-based screening only" in result["risk_summary"]


def test_risk_identification_reports_disabled_runtime(monkeypatch) -> None:
    state = ContractReviewState(
        review_id="risk-requires-k2",
        raw_text="Payment clause",
        clauses=[
            Clause(
                id="clause-1",
                clause_type=ClauseType.PAYMENT_TERMS,
                text="Invoices will be paid within net 90 days after receipt.",
                source_order=1,
                classification_confidence=0.78,
            )
        ],
    )

    monkeypatch.setattr(
        "src.agents.risk_identification.get_llm_client",
        lambda: (
            None,
            LLMRuntime(enabled=False, disabled_reason="No API key configured for the Python service."),
        ),
    )

    result = RiskIdentificationAgent()(state)

    assert result["needs_human_review"] is True
    assert 28 <= result["risk_score"] < 55
    assert result["errors"] == ["No API key configured for the Python service."]
    assert "provisional rule-based screening only" in result["summary"]


def test_risk_identification_accepts_k2_runtime(monkeypatch) -> None:
    state = ContractReviewState(
        review_id="risk-k2-runtime",
        raw_text="Publication clause",
        clauses=[
            Clause(
                id="clause-1",
                clause_type=ClauseType.PUBLICATION_RIGHTS,
                text="Site must obtain sponsor's prior written consent before any publication.",
                source_order=1,
                classification_confidence=0.8,
            )
        ],
    )

    class FakeResponse:
        content = """
        {
          "findings": [
            {
              "clause_id": "clause-1",
              "risk_level": "red",
              "risk_type": "publication_delay",
              "description": "The clause may delay publication beyond the ACTA baseline review period.",
              "buyer_impact": "The site may wait longer to publish.",
              "seller_impact": "The sponsor keeps more review leverage.",
              "rationale": "The wording suggests a broader approval right than ACTA expects.",
              "suggested_action": "Limit the sponsor to a short review and patent delay period.",
              "confidence": 0.82
            }
          ]
        }
        """

    class FakeLLM:
        def invoke(self, messages):
            assert len(messages) == 2
            return FakeResponse()

    monkeypatch.setattr(
        "src.agents.risk_identification.get_llm_client",
        lambda: (
            FakeLLM(),
            LLMRuntime(provider_name="k2", enabled=True),
        ),
    )

    result = RiskIdentificationAgent()(state)

    assert result["risk_findings"][0].engine == "merged"
    assert result["risk_findings"][0].buyer_impact == "The site may wait longer to publish."
    assert result["overall_risk_level"] is RiskLevel.RED
