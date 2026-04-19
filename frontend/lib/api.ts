const BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Deviation = "critical" | "minor" | "aligned";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

interface BackendUploadResponse {
  filename: string;
  full_text: string;
  char_count: number;
  text_preview: string;
}

interface BackendAssessmentPayload {
  clause_type: string;
  raw_text: string;
  risk_level: string;
  deviation_summary: string;
  suggested_action: string;
  confidence: number;
}

interface BackendRedlinePayload {
  proposed_text: string;
  original_text: string;
  suggested_text: string;
  reason: string;
  priority: string;
}

interface BackendClausePayload {
  assessment: BackendAssessmentPayload;
  redline?: BackendRedlinePayload | null;
  model_used?: string | null;
}

interface BackendSuggestionPayload {
  clause_id: string;
  clause_type: string;
  original_text: string;
  suggested_text: string;
  reason: string;
  priority: string;
  confidence: number;
}

interface BackendAnalyzeResponse {
  summary: string;
  clauses: BackendClausePayload[];
  suggestions: BackendSuggestionPayload[];
  missing_clause_types: string[];
  extraction_model?: string | null;
  version_diff: string;
  risk_score: number;
}

export interface UploadResponse {
  filename: string;
  full_text: string;
  char_count: number;
  text_preview: string;
}

export interface AnalysisClause {
  type: string;
  text: string;
  deviation: Deviation;
  risk_reason: string;
  suggested_clause: string;
  confidence: number;
  model_used: string;
}

export interface AnalysisMetrics {
  risk_score: number;
  risk_level: RiskLevel;
  total_clauses: number;
  critical: number;
  minor: number;
  aligned: number;
  recommendation: string;
}

export interface RedlineItem {
  clause: string;
  type: string;
  severity: Deviation;
  action: string;
  priority: number;
  original_text: string;
  suggested_text: string;
  text_changed: boolean;
  diff: { removed: string; added: string };
  reason: string;
  confidence: number;
  model_used: string;
  ui_style: { color: string };
}

export interface AnalysisResult {
  filename: string;
  summary: string;
  clauses: Record<string, AnalysisClause>;
  metrics: AnalysisMetrics;
  redlines: RedlineItem[];
  missing_clause_types: string[];
  version_diff: string;
  extraction_model: string;
}

async function getErrorMessage(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status})`;
  try {
    const payload = (await response.json()) as { detail?: string };
    return payload.detail || fallback;
  } catch {
    return fallback;
  }
}

function toDeviation(riskLevel: string): Deviation {
  switch (riskLevel.toLowerCase()) {
    case "red":
      return "critical";
    case "yellow":
      return "minor";
    default:
      return "aligned";
  }
}

function toRiskLevel(score: number, critical: number, minor: number): RiskLevel {
  if (critical >= 3 || score >= 85) {
    return "CRITICAL";
  }
  if (critical > 0 || score >= 55) {
    return "HIGH";
  }
  if (minor > 0 || score >= 25) {
    return "MEDIUM";
  }
  return "LOW";
}

function toRecommendation(critical: number, minor: number, missingClauseTypes: string[]): string {
  if (critical > 0) {
    return "Address the critical clauses before routing this CTA for signature.";
  }
  if (missingClauseTypes.length > 0) {
    return `Add the missing ${missingClauseTypes.length === 1 ? "clause" : "clauses"} before final review.`;
  }
  if (minor > 0) {
    return "Resolve the yellow-flagged clauses to align the agreement with the ACTA baseline.";
  }
  return "The agreement is largely aligned with the ACTA baseline.";
}

function createClauseKey(clauseType: string, seen: Map<string, number>): string {
  const nextCount = (seen.get(clauseType) || 0) + 1;
  seen.set(clauseType, nextCount);
  return nextCount === 1 ? clauseType : `${clauseType} (${nextCount})`;
}

function priorityToNumber(priority: string): number {
  switch (priority.toLowerCase()) {
    case "high":
      return 1;
    case "medium":
      return 2;
    case "low":
      return 3;
    default:
      return 4;
  }
}

function normalizeAnalysisResponse(payload: BackendAnalyzeResponse, filename: string): AnalysisResult {
  const clauses: Record<string, AnalysisClause> = {};
  const suggestionsByType = new Map<string, BackendSuggestionPayload[]>();
  const seenTypes = new Map<string, number>();

  for (const suggestion of payload.suggestions) {
    const key = suggestion.clause_type || "General Clause";
    const existing = suggestionsByType.get(key) || [];
    existing.push(suggestion);
    suggestionsByType.set(key, existing);
  }

  for (const clause of payload.clauses) {
    const clauseType = clause.assessment.clause_type || "General Clause";
    const key = createClauseKey(clauseType, seenTypes);
    const matchingSuggestion = (suggestionsByType.get(clauseType) || []).shift();
    clauses[key] = {
      type: clauseType,
      text: clause.assessment.raw_text,
      deviation: toDeviation(clause.assessment.risk_level),
      risk_reason: clause.assessment.deviation_summary || clause.assessment.suggested_action,
      suggested_clause:
        clause.redline?.suggested_text ||
        clause.redline?.proposed_text ||
        matchingSuggestion?.suggested_text ||
        clause.assessment.raw_text,
      confidence: clause.assessment.confidence ?? matchingSuggestion?.confidence ?? 0,
      model_used: clause.model_used || payload.extraction_model || "python-review-pipeline",
    };
  }

  const entries = Object.entries(clauses);
  const critical = entries.filter(([, clause]) => clause.deviation === "critical").length;
  const minor = entries.filter(([, clause]) => clause.deviation === "minor").length;
  const aligned = entries.filter(([, clause]) => clause.deviation === "aligned").length;
  const riskLevel = toRiskLevel(payload.risk_score, critical, minor);

  const redlines: RedlineItem[] = entries.map(([key, clause]) => ({
    clause: key,
    type: clause.type,
    severity: clause.deviation,
    action: clause.deviation === "aligned" ? "Keep as drafted" : "Revise to ACTA baseline",
    priority: clause.deviation === "critical" ? 1 : clause.deviation === "minor" ? 2 : 3,
    original_text: clause.text,
    suggested_text: clause.suggested_clause,
    text_changed: clause.text.trim() !== clause.suggested_clause.trim(),
    diff: {
      removed: clause.text,
      added: clause.suggested_clause,
    },
    reason: clause.risk_reason,
    confidence: clause.confidence,
    model_used: clause.model_used,
    ui_style: {
      color:
        clause.deviation === "critical"
          ? "#b85450"
          : clause.deviation === "minor"
            ? "#c9974a"
            : "#6a9e78",
    },
  }));

  return {
    filename,
    summary: payload.summary,
    clauses,
    metrics: {
      risk_score: payload.risk_score,
      risk_level: riskLevel,
      total_clauses: entries.length,
      critical,
      minor,
      aligned,
      recommendation: toRecommendation(critical, minor, payload.missing_clause_types),
    },
    redlines,
    missing_clause_types: payload.missing_clause_types,
    version_diff: payload.version_diff,
    extraction_model: payload.extraction_model || "python-review-pipeline",
  };
}

export async function uploadFile(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(`${BASE}/api/upload`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const payload = (await response.json()) as BackendUploadResponse;
  return {
    filename: payload.filename,
    full_text: payload.full_text,
    char_count: payload.char_count,
    text_preview: payload.text_preview,
  };
}

export async function analyzeCTA(
  text: string,
  filename: string,
  _geminiKey?: string,
  _maxClauses?: number,
): Promise<AnalysisResult> {
  const response = await fetch(`${BASE}/api/v1/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: filename,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const payload = (await response.json()) as BackendAnalyzeResponse;
  return normalizeAnalysisResponse(payload, filename);
}

export async function analyzeContractFile(file: File): Promise<{
  upload: UploadResponse;
  analysis: AnalysisResult;
}> {
  const upload = await uploadFile(file);
  const analysis = await analyzeCTA(upload.full_text, upload.filename || file.name);
  return { upload, analysis };
}

export async function chatWithContract(
  question: string,
  context: string,
): Promise<{ answer: string; status: string }> {
  const response = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question, context }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const payload = (await response.json()) as { answer: string };
  return {
    answer: payload.answer,
    status: "ok",
  };
}

interface RewriteClauseInput {
  type?: string;
  text: string;
  risk_reason?: string;
  suggested_clause?: string;
  deviation?: string;
}

export async function rewriteACTA(
  clauses: Record<string, RewriteClauseInput>,
): Promise<Record<string, string>> {
  const response = await fetch(`${BASE}/api/acta-rewrite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clauses: Object.fromEntries(
        Object.entries(clauses).map(([key, clause]) => [
          key,
          {
            type: clause.type,
            text: clause.text,
            risk_reason: clause.risk_reason,
            suggested_clause: clause.suggested_clause,
            deviation: clause.deviation,
          },
        ]),
      ),
    }),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const payload = (await response.json()) as { rewrites: Record<string, string> };
  return payload.rewrites;
}

export function summarizeSuggestionPriority(priority: string): number {
  return priorityToNumber(priority);
}
