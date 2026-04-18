const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

type BackendRiskLevel = "red" | "yellow" | "green";

interface BackendClauseResult {
  assessment: {
    clause_type: string;
    raw_text: string;
    risk_level: BackendRiskLevel;
    deviation_summary: string;
    suggested_action: string;
    confidence: number;
  };
  redline?: {
    proposed_text: string;
  } | null;
}

interface BackendAnalyzeResponse {
  summary: string;
  clauses: BackendClauseResult[];
  missing_clause_types?: string[];
}

type FrontendDeviation = "critical" | "minor" | "aligned";

interface FrontendClause {
  type: string;
  text: string;
  risk_reason: string;
  suggested_clause?: string;
  deviation: FrontendDeviation;
  confidence: number;
}

export interface FrontendAnalyzeResult {
  filename: string;
  summary: string;
  clauses: Record<string, FrontendClause>;
  metrics: {
    critical: number;
    minor: number;
    aligned: number;
    total_clauses: number;
    risk_level: "HIGH" | "MEDIUM" | "LOW";
    recommendation: string;
  };
  missing_clause_types: string[];
}

function toDeviation(riskLevel: BackendRiskLevel): FrontendDeviation {
  if (riskLevel === "red") return "critical";
  if (riskLevel === "yellow") return "minor";
  return "aligned";
}

function toRiskLevel(critical: number, minor: number): "HIGH" | "MEDIUM" | "LOW" {
  if (critical > 0) return "HIGH";
  if (minor > 0) return "MEDIUM";
  return "LOW";
}

function buildRecommendation(critical: number, minor: number): string {
  if (critical > 0) {
    return "Escalate the redlined clauses for legal review before sending this CTA back to the counterparty.";
  }
  if (minor > 0) {
    return "Address the yellow clauses in the next negotiation pass and confirm the fallback language with counsel.";
  }
  return "The reviewed clauses appear aligned with the ACTA baseline. A final human check is still recommended.";
}

function normalizeAnalyzeResponse(data: BackendAnalyzeResponse, filename: string): FrontendAnalyzeResult {
  const clauses = data.clauses.reduce<Record<string, FrontendClause>>((acc, clause, index) => {
    const deviation = toDeviation(clause.assessment.risk_level);
    acc[`Clause ${index + 1}: ${clause.assessment.clause_type}`] = {
      type: clause.assessment.clause_type,
      text: clause.assessment.raw_text,
      risk_reason: clause.assessment.deviation_summary,
      suggested_clause: clause.redline?.proposed_text,
      deviation,
      confidence: clause.assessment.confidence,
    };
    return acc;
  }, {});

  const critical = Object.values(clauses).filter((clause) => clause.deviation === "critical").length;
  const minor = Object.values(clauses).filter((clause) => clause.deviation === "minor").length;
  const aligned = Object.values(clauses).filter((clause) => clause.deviation === "aligned").length;

  return {
    filename,
    summary: data.summary,
    clauses,
    metrics: {
      critical,
      minor,
      aligned,
      total_clauses: critical + minor + aligned,
      risk_level: toRiskLevel(critical, minor),
      recommendation: buildRecommendation(critical, minor),
    },
    missing_clause_types: data.missing_clause_types ?? [],
  };
}

export async function analyzeCTA(file: File): Promise<FrontendAnalyzeResult> {
  const formData = new FormData();
  formData.append("title", file.name.replace(/\.[^.]+$/, "") || file.name);
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || "Analyze failed");
  }

  const data = (await res.json()) as BackendAnalyzeResponse;
  return normalizeAnalyzeResponse(data, file.name);
}
