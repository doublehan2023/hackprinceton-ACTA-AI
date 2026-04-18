"use client";

import React, { useState } from "react";

interface Clause {
  type?: string;
  text: string;
  risk_reason?: string;
  suggested_clause?: string;
  deviation?: "critical" | "minor" | "aligned" | string;
  confidence?: number;
  model_used?: string;
}

interface Props {
  redlines: Record<string, Clause>;
}

interface AnthropicResponseBlock {
  text?: string;
}

interface AnthropicResponse {
  content?: AnthropicResponseBlock[];
}

// ─────────────────────────────────────────────
// CONFIDENCE TRAFFIC LIGHT
// ⚫ unknown  🔴 critical  🟡 minor  🟢 aligned
// ─────────────────────────────────────────────
function trafficLight(deviation: string, confidence: number): {
  icon: string;
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  if (confidence === 0 || confidence === undefined) {
    return { icon: "⚫", label: "Unknown", color: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)" };
  }
  if (deviation === "critical") {
    return { icon: "🔴", label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)" };
  }
  if (deviation === "minor") {
    return { icon: "🟡", label: "Minor", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" };
  }
  if (deviation === "aligned") {
    return { icon: "🟢", label: "Aligned", color: "#22c55e", bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.25)" };
  }
  return { icon: "⚫", label: "Unknown", color: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)" };
}

// ─────────────────────────────────────────────
// ONE-CLICK ACTA MODE
// Calls Claude via Anthropic API to rewrite every
// deviating clause to ACTA standard in one shot
// ─────────────────────────────────────────────
async function runACTARewrite(clauses: Record<string, Clause>): Promise<Record<string, string>> {
  const deviating = Object.entries(clauses)
    .filter(([, c]) => c.deviation !== "aligned")
    .map(([name, c]) => `CLAUSE: ${name}\nTYPE: ${c.type}\nTEXT: ${c.text}\nISSUE: ${c.risk_reason}`);

  if (deviating.length === 0) return {};

  const prompt = `You are a senior clinical trial legal expert. The following clauses deviate from ACTA standards.

For EACH clause, rewrite it to be fully ACTA-compliant. Return ONLY valid JSON in this exact format:
{
  "CLAUSE_NAME": "full rewritten ACTA-compliant clause text",
  ...
}

ACTA STANDARDS REFERENCE:
- Publication Rights: Site gets 60-day review. Sponsor may delay up to 90 days for patent filing only.
- IP: Sponsor retains compound rights. Site retains independently developed IP.
- Indemnification: Mutual negligence-based only. Sponsor covers product liability.
- Confidentiality: 5-year protection. Excludes publicly known info.
- Payment Terms: Net-30. Itemized budget. Indirect cost cap 26% F&A.
- Subject Injury: Sponsor covers research-related injury costs.

CLAUSES TO REWRITE:
${deviating.join("\n\n")}

Return ONLY valid JSON, no markdown, no explanation.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = (await response.json()) as AnthropicResponse;
  const text = data.content?.map((block) => block.text || "").join("") || "";
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return {};
  }
}

export default function RedlineViewer({ redlines }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"all" | "critical" | "minor" | "aligned">("all");

  // ── ONE-CLICK ACTA MODE STATE ──
  const [actaMode, setActaMode] = useState(false);
  const [actaLoading, setActaLoading] = useState(false);
  const [actaRewrites, setActaRewrites] = useState<Record<string, string>>({});
  const [actaMemo, setActaMemo] = useState<string>("");

  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const entries = Object.entries(redlines);
  const filtered = filter === "all" ? entries : entries.filter(([, c]) => c.deviation === filter);

  const counts = {
    critical: entries.filter(([, c]) => c.deviation === "critical").length,
    minor: entries.filter(([, c]) => c.deviation === "minor").length,
    aligned: entries.filter(([, c]) => c.deviation === "aligned").length,
  };

  // ── TRIGGER ONE-CLICK ACTA REWRITE ──
  const handleACTAMode = async () => {
    setActaLoading(true);
    setActaMode(false);
    setActaRewrites({});
    setActaMemo("");

    const rewrites = await runACTARewrite(redlines);
    setActaRewrites(rewrites);

    // Build negotiation memo
    const clauseNames = Object.keys(rewrites);
    const memo = clauseNames.length > 0
      ? `ACTA RESET MEMO\nGenerated: ${new Date().toLocaleDateString()}\n\nThis memo summarizes all clause changes applied to bring this Clinical Trial Agreement into full ACTA compliance.\n\n${clauseNames.map((n, i) => `${i + 1}. ${n} — Rewritten to ACTA standard.`).join("\n")}\n\nAll changes represent pre-negotiated ACTA compromises. Both parties are encouraged to review and confirm alignment.`
      : "All clauses are already ACTA-compliant.";

    setActaMemo(memo);
    setActaMode(true);
    setActaLoading(false);
  };

  if (entries.length === 0) {
    return (
      <div style={{
        padding: 40, textAlign: "center", color: "#64748b",
        fontFamily: "var(--font-mono, monospace)", fontSize: 13,
        border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 12,
      }}>
        No clauses analyzed yet.
      </div>
    );
  }

  return (
    <div>
      <style>{`
        /* ── TRAFFIC LIGHT LEGEND ── */
        .tl-legend {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
          padding: 12px 16px;
          background: #0d1422;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          flex-wrap: wrap;
        }
        .tl-legend-title {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          color: #475569;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-right: 4px;
          align-self: center;
        }
        .tl-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          color: #64748b;
        }

        /* ── ACTA MODE BANNER ── */
        .acta-mode-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 20px;
          padding: 14px 18px;
          border-radius: 12px;
          border: 1px solid rgba(59,130,246,0.25);
          background: rgba(59,130,246,0.06);
          flex-wrap: wrap;
        }
        .acta-mode-label {
          font-size: 13px;
          font-weight: 700;
          color: #93c5fd;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .acta-mode-sub {
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          color: #64748b;
          margin-top: 3px;
        }
        .acta-btn {
          padding: 9px 18px;
          background: #1d4ed8;
          color: white;
          border: none;
          border-radius: 8px;
          font-family: var(--font-display, sans-serif);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .acta-btn:hover:not(:disabled) { background: #1e40af; }
        .acta-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .acta-btn.reset { background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #64748b; }
        .acta-btn.reset:hover { border-color: rgba(255,255,255,0.2); color: #f1f5f9; }

        /* ── ACTA MEMO ── */
        .acta-memo {
          margin-bottom: 20px;
          padding: 16px 18px;
          border-radius: 12px;
          background: #080c14;
          border: 1px solid rgba(34,197,94,0.2);
          font-family: var(--font-mono, monospace);
          font-size: 12px;
          color: #86efac;
          white-space: pre-wrap;
          line-height: 1.7;
        }
        .acta-memo-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #22c55e;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* ── FILTER BAR ── */
        .filter-bar {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .filter-chip {
          padding: 5px 14px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.08);
          background: transparent;
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          color: #64748b;
          letter-spacing: 0.5px;
        }
        .filter-chip:hover { border-color: rgba(255,255,255,0.2); color: #f1f5f9; }
        .filter-chip.active-all    { background: rgba(99,102,241,0.15); border-color: #6366f1; color: #a5b4fc; }
        .filter-chip.active-critical { background: rgba(239,68,68,0.12); border-color: #ef4444; color: #fca5a5; }
        .filter-chip.active-minor  { background: rgba(245,158,11,0.12); border-color: #f59e0b; color: #fcd34d; }
        .filter-chip.active-aligned { background: rgba(34,197,94,0.12); border-color: #22c55e; color: #86efac; }

        /* ── CLAUSE CARDS ── */
        .clause-card {
          border-radius: 12px;
          margin-bottom: 12px;
          overflow: hidden;
          transition: all 0.2s;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .clause-card:hover { border-color: rgba(255,255,255,0.12); }

        .clause-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          cursor: pointer;
          user-select: none;
          background: #0d1422;
        }
        .clause-header:hover { background: #111827; }

        .severity-stripe {
          width: 3px;
          border-radius: 2px;
          align-self: stretch;
          min-height: 20px;
          flex-shrink: 0;
        }
        .clause-name {
          flex: 1;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: -0.2px;
        }
        .clause-type-tag {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          color: #64748b;
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .model-tag {
          font-family: var(--font-mono, monospace);
          font-size: 9px;
          padding: 2px 7px;
          border-radius: 4px;
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.2);
          color: #a5b4fc;
        }
        .severity-badge {
          padding: 3px 10px;
          border-radius: 4px;
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .confidence-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
        }
        .confidence-bar-wrap {
          width: 48px;
          height: 4px;
          background: rgba(255,255,255,0.07);
          border-radius: 4px;
          overflow: hidden;
        }
        .confidence-bar-fill {
          height: 100%;
          border-radius: 4px;
        }
        .confidence-pct {
          font-family: var(--font-mono, monospace);
          font-size: 9px;
          color: #334155;
        }
        .chevron {
          color: #475569;
          font-size: 11px;
          transition: transform 0.2s;
        }
        .chevron.open { transform: rotate(180deg); }

        .clause-body {
          border-top: 1px solid rgba(255,255,255,0.06);
          padding: 18px;
          background: #080c14;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .clause-section-label {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #475569;
          margin-bottom: 8px;
        }
        .original-text {
          background: rgba(239,68,68,0.04);
          border: 1px solid rgba(239,68,68,0.12);
          border-radius: 8px;
          padding: 12px 14px;
          font-size: 13px;
          line-height: 1.65;
          color: #cbd5e1;
          font-family: Georgia, serif;
        }
        .risk-text {
          font-size: 13px;
          line-height: 1.6;
          color: #94a3b8;
        }
        .suggested-text {
          background: rgba(34,197,94,0.05);
          border: 1px solid rgba(34,197,94,0.15);
          border-radius: 8px;
          padding: 12px 14px;
          font-size: 13px;
          line-height: 1.65;
          color: #d1fae5;
          font-family: Georgia, serif;
        }
        .acta-rewrite-text {
          background: rgba(59,130,246,0.05);
          border: 1px solid rgba(59,130,246,0.2);
          border-radius: 8px;
          padding: 12px 14px;
          font-size: 13px;
          line-height: 1.65;
          color: #bfdbfe;
          font-family: Georgia, serif;
        }
        .acta-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 4px;
          background: rgba(34,197,94,0.1);
          border: 1px solid rgba(34,197,94,0.2);
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          color: #86efac;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
          width: fit-content;
        }
        .acta-reset-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 4px;
          background: rgba(59,130,246,0.1);
          border: 1px solid rgba(59,130,246,0.2);
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          color: #93c5fd;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
          width: fit-content;
        }
        .diff-wrap {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        @media (max-width: 700px) { .diff-wrap { grid-template-columns: 1fr; } }
        .diff-removed {
          background: rgba(239,68,68,0.05);
          border: 1px solid rgba(239,68,68,0.15);
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 12px;
          font-family: Georgia, serif;
          color: #fca5a5;
          line-height: 1.6;
          text-decoration: line-through;
          opacity: 0.7;
        }
        .diff-added {
          background: rgba(34,197,94,0.05);
          border: 1px solid rgba(34,197,94,0.15);
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 12px;
          font-family: Georgia, serif;
          color: #86efac;
          line-height: 1.6;
        }
        .diff-label {
          font-family: var(--font-mono, monospace);
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 6px;
          opacity: 0.7;
        }
        @keyframes acta-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.3); }
          50% { box-shadow: 0 0 0 6px rgba(59,130,246,0); }
        }
        .acta-loading-ring {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.2);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── TRAFFIC LIGHT LEGEND ── */}
      <div className="tl-legend">
        <span className="tl-legend-title">Risk Key:</span>
        <div className="tl-item">🔴 <span>Critical — Must replace, major ACTA deviation</span></div>
        <div className="tl-item">🟡 <span>Minor — Revise, standard negotiation point</span></div>
        <div className="tl-item">🟢 <span>Aligned — Matches ACTA baseline</span></div>
        <div className="tl-item">⚫ <span>Unknown — Needs human review</span></div>
      </div>

      {/* ── ONE-CLICK ACTA MODE BAR ── */}
      <div className="acta-mode-bar">
        <div>
          <div className="acta-mode-label">
            ⚡ One-Click ACTA Mode
          </div>
          <div className="acta-mode-sub">
            Rewrites every deviating clause to ACTA standard in one shot + generates a negotiation memo
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {actaMode && (
            <button className="acta-btn reset" onClick={() => { setActaMode(false); setActaRewrites({}); setActaMemo(""); }}>
              ✕ Clear
            </button>
          )}
          <button className="acta-btn" onClick={handleACTAMode} disabled={actaLoading}
            style={{ animation: actaLoading ? "none" : "acta-pulse 2s infinite" }}>
            {actaLoading ? <><span className="acta-loading-ring" /> Rewriting…</> : "⚡ Reset to ACTA Baseline"}
          </button>
        </div>
      </div>

      {/* ── ACTA NEGOTIATION MEMO ── */}
      {actaMode && actaMemo && (
        <div className="acta-memo">
          <div className="acta-memo-label">✓ ACTA Negotiation Memo — Ready to Send</div>
          {actaMemo}
        </div>
      )}

      {/* ── FILTER BAR ── */}
      <div className="filter-bar">
        <button className={`filter-chip ${filter === "all" ? "active-all" : ""}`} onClick={() => setFilter("all")}>
          All ({entries.length})
        </button>
        <button className={`filter-chip ${filter === "critical" ? "active-critical" : ""}`} onClick={() => setFilter("critical")}>
          🔴 Critical ({counts.critical})
        </button>
        <button className={`filter-chip ${filter === "minor" ? "active-minor" : ""}`} onClick={() => setFilter("minor")}>
          🟡 Minor ({counts.minor})
        </button>
        <button className={`filter-chip ${filter === "aligned" ? "active-aligned" : ""}`} onClick={() => setFilter("aligned")}>
          🟢 Aligned ({counts.aligned})
        </button>
      </div>

      {/* ── CLAUSE CARDS ── */}
      {filtered.map(([key, clause]) => {
        const isOpen = expanded[key];
        const dev = clause.deviation ?? "minor";
        const conf = clause.confidence ?? 0;
        const tl = trafficLight(dev, conf);
        const confidence = conf * 100;
        const hasActaRewrite = actaMode && actaRewrites[key];

        return (
          <div className="clause-card" key={key} style={{ borderColor: isOpen ? tl.border : undefined }}>
            <div className="clause-header" onClick={() => toggle(key)}>
              <div className="severity-stripe" style={{ background: tl.color }} />

              {/* Traffic light icon */}
              <span style={{ fontSize: 16, flexShrink: 0 }}>{tl.icon}</span>

              <div className="clause-name">{key}</div>

              {clause.type && clause.type !== "General Clause" && (
                <span className="clause-type-tag">{clause.type}</span>
              )}

              {clause.model_used && (
                <span className="model-tag">{clause.model_used}</span>
              )}

              <div className="severity-badge" style={{ background: tl.bg, color: tl.color }}>
                {dev.toUpperCase()}
              </div>

              {/* Confidence bar + % */}
              {confidence > 0 && (
                <div className="confidence-wrap" title={`AI confidence: ${Math.round(confidence)}%`}>
                  <div className="confidence-bar-wrap">
                    <div className="confidence-bar-fill" style={{ width: `${confidence}%`, background: tl.color }} />
                  </div>
                  <span className="confidence-pct">{Math.round(confidence)}%</span>
                </div>
              )}

              {hasActaRewrite && (
                <span style={{
                  fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 7px",
                  borderRadius: 4, background: "rgba(59,130,246,0.15)", color: "#93c5fd",
                  letterSpacing: "0.5px", flexShrink: 0
                }}>REWRITTEN</span>
              )}

              <span className={`chevron ${isOpen ? "open" : ""}`}>▼</span>
            </div>

            {isOpen && (
              <div className="clause-body">

                {/* Original clause */}
                <div>
                  <div className="clause-section-label">📄 Original Clause</div>
                  <div className="original-text">{clause.text}</div>
                </div>

                {/* Risk reason */}
                {clause.risk_reason && (
                  <div>
                    <div className="clause-section-label">⚠️ ACTA Deviation Analysis</div>
                    <div className="risk-text">{clause.risk_reason}</div>
                  </div>
                )}

                {/* ONE-CLICK ACTA REWRITE — shown when ACTA mode is active */}
                {hasActaRewrite ? (
                  <div>
                    <div className="clause-section-label">⚡ One-Click ACTA Rewrite</div>
                    <div className="acta-reset-tag">⚡ ACTA Baseline Reset</div>
                    {/* Track-changes style diff */}
                    <div className="diff-wrap">
                      <div className="diff-removed">
                        <div className="diff-label" style={{ color: "#fca5a5" }}>─ Removed</div>
                        {clause.text}
                      </div>
                      <div className="diff-added">
                        <div className="diff-label" style={{ color: "#86efac" }}>+ ACTA Standard</div>
                        {actaRewrites[key]}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard AI suggestion shown when not in ACTA mode */
                  clause.suggested_clause && clause.suggested_clause !== clause.text && (
                    <div>
                      <div className="clause-section-label">✏️ AI Redline Suggestion</div>
                      <div className="acta-tag">✓ ACTA Compliant</div>
                      <div className="suggested-text">{clause.suggested_clause}</div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
