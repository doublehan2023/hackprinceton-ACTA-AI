"use client";

import React, { useState, useEffect, useRef } from "react";
import { rewriteACTA } from "@/lib/api";

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
  // When set, auto-expands that clause card and scrolls to it
  jumpToClause?: string | null;
}

// ── Cream/sage palette ──
const STYLES = {
  critical: { stripe: "#b85450", badge: "rgba(184,84,80,0.12)", text: "#b85450", border: "rgba(184,84,80,0.30)" },
  minor:    { stripe: "#c9974a", badge: "rgba(201,151,74,0.12)", text: "#c9974a", border: "rgba(201,151,74,0.28)" },
  aligned:  { stripe: "#6a9e78", badge: "rgba(106,158,120,0.12)", text: "#6a9e78", border: "rgba(106,158,120,0.28)" },
  unknown:  { stripe: "#8fa89c", badge: "rgba(143,168,156,0.10)", text: "#7a9088", border: "rgba(143,168,156,0.20)" },
} as const;

function getS(dev?: string) {
  return STYLES[(dev as keyof typeof STYLES) ?? "unknown"] ?? STYLES.unknown;
}

// Confidence → traffic light icon
function tlIcon(dev?: string, conf?: number): string {
  if (!conf || conf === 0) return "⚫";
  if (dev === "critical") return "🔴";
  if (dev === "minor")    return "🟡";
  if (dev === "aligned")  return "🟢";
  return "⚫";
}

// One-click ACTA rewrite via the Python ACTA rewrite endpoint
async function runACTARewrite(clauses: Record<string, Clause>): Promise<Record<string, string>> {
  const deviating = Object.fromEntries(
    Object.entries(clauses).filter(([, clause]) => clause.deviation !== "aligned"),
  );
  if (Object.keys(deviating).length === 0) {
    return {};
  }

  try {
    return await rewriteACTA(deviating);
  } catch {
    return {};
  }
}

export default function RedlineViewer({ redlines, jumpToClause }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [filter, setFilter]     = useState<"all" | "critical" | "minor" | "aligned">("all");
  const [actaMode, setActaMode]     = useState(false);
  const [actaLoading, setActaLoading] = useState(false);
  const [actaRewrites, setActaRewrites] = useState<Record<string, string>>({});
  const [actaMemo, setActaMemo]     = useState("");

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ── Auto-expand + scroll when jumpToClause fires ──
  useEffect(() => {
    if (!jumpToClause) return;
    const key = jumpToClause;
    const id = setTimeout(() => {
      setExpanded(prev => ({ ...prev, [key]: true }));
      setFilter("all");
      setTimeout(() => {
        cardRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
    }, 0);
    return () => clearTimeout(id);
  }, [jumpToClause]);

  const toggle = (key: string) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const entries  = Object.entries(redlines);
  const filtered = filter === "all" ? entries : entries.filter(([, c]) => c.deviation === filter);
  const counts   = {
    critical: entries.filter(([, c]) => c.deviation === "critical").length,
    minor:    entries.filter(([, c]) => c.deviation === "minor").length,
    aligned:  entries.filter(([, c]) => c.deviation === "aligned").length,
  };

  const handleACTAMode = async () => {
    setActaLoading(true); setActaMode(false); setActaRewrites({}); setActaMemo("");
    const rewrites = await runACTARewrite(redlines);
    const names = Object.keys(rewrites);
    setActaRewrites(rewrites);
    setActaMemo(
      names.length > 0
        ? `ACTA RESET MEMO — ${new Date().toLocaleDateString()}\n\nAll clause changes apply the pre-negotiated ACTA compromise.\n\n${names.map((n, i) => `${i + 1}. ${n} — Rewritten to ACTA standard.`).join("\n")}\n\nBoth parties are encouraged to confirm alignment.`
        : "All clauses are already ACTA-compliant."
    );
    setActaMode(true); setActaLoading(false);
  };

  if (entries.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#7a9088",
        fontFamily: "var(--mono, monospace)", fontSize: 13,
        border: "1px dashed rgba(90,110,90,0.2)", borderRadius: 12 }}>
        No clauses analyzed yet.
      </div>
    );
  }

  return (
    <div>
      <style>{`
        /* ── TRAFFIC LIGHT LEGEND ── */
        .tl-legend {
          display: flex; gap: 16px; margin-bottom: 16px;
          padding: 12px 16px; background: rgba(138,184,154,0.07);
          border: 1px solid rgba(90,110,90,0.12); border-radius: 10px;
          flex-wrap: wrap; align-items: center;
        }
        .tl-legend-title {
          font-family: var(--mono, monospace); font-size: 10px;
          color: #7a9088; letter-spacing: 1px; text-transform: uppercase;
        }
        .tl-item { display: flex; align-items: center; gap: 5px;
          font-family: var(--mono, monospace); font-size: 11px; color: #7a9088; }

        /* ── ACTA MODE ── */
        .acta-bar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-bottom: 18px; padding: 14px 18px;
          border-radius: 12px; border: 1px solid rgba(74,122,90,0.22);
          background: rgba(74,122,90,0.05); flex-wrap: wrap;
        }
        .acta-bar-label { font-size: 13px; font-weight: 500; color: #4a7a5a; }
        .acta-bar-sub { font-family: var(--mono, monospace); font-size: 11px; color: #7a9088; margin-top: 2px; }
        .acta-btn {
          padding: 9px 16px; background: #4a7a5a; color: white; border: none;
          border-radius: 8px; font-family: var(--font, sans-serif); font-size: 13px;
          font-weight: 500; cursor: pointer; transition: all 0.15s; white-space: nowrap;
          display: flex; align-items: center; gap: 6px;
        }
        .acta-btn:hover:not(:disabled) { background: #6a9e78; }
        .acta-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .acta-btn-ghost {
          padding: 9px 14px; background: transparent;
          border: 1px solid rgba(90,110,90,0.24); color: #7a9088;
          border-radius: 8px; font-family: var(--font, sans-serif); font-size: 12px;
          cursor: pointer; transition: all 0.15s;
        }
        .acta-btn-ghost:hover { border-color: rgba(90,110,90,0.4); color: #2d3d38; }

        .acta-memo {
          margin-bottom: 18px; padding: 16px 18px; border-radius: 10px;
          background: rgba(106,158,120,0.06); border: 1px solid rgba(106,158,120,0.2);
          font-family: var(--mono, monospace); font-size: 11.5px;
          color: #4a7a5a; white-space: pre-wrap; line-height: 1.75;
        }
        .acta-memo-label {
          font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px;
          color: #6a9e78; margin-bottom: 8px; font-weight: 500;
        }

        /* ── FILTER BAR ── */
        .filter-bar { display: flex; gap: 7px; margin-bottom: 18px; flex-wrap: wrap; }
        .filter-chip {
          padding: 5px 14px; border-radius: 20px;
          border: 1px solid rgba(90,110,90,0.16); background: transparent;
          font-family: var(--mono, monospace); font-size: 11px; font-weight: 400;
          cursor: pointer; transition: all 0.14s; color: #7a9088;
        }
        .filter-chip:hover { border-color: rgba(90,110,90,0.32); color: #2d3d38; }
        .fc-all      { background: rgba(74,96,104,0.08);    border-color: #4a6068; color: #4a6068; }
        .fc-critical { background: rgba(184,84,80,0.08);    border-color: #b85450; color: #b85450; }
        .fc-minor    { background: rgba(201,151,74,0.08);   border-color: #c9974a; color: #c9974a; }
        .fc-aligned  { background: rgba(106,158,120,0.08);  border-color: #6a9e78; color: #6a9e78; }

        /* ── CLAUSE CARDS ── */
        .clause-card {
          border-radius: 12px; margin-bottom: 10px;
          border: 1px solid rgba(90,110,90,0.12); overflow: hidden;
          background: #fafaf4; transition: border-color 0.15s;
        }
        .clause-card:hover { border-color: rgba(90,110,90,0.22); }
        .clause-card.jumped {
          box-shadow: 0 0 0 2px #6a9e78;
          border-color: #6a9e78;
        }

        .clause-header {
          display: flex; align-items: center; gap: 10px;
          padding: 13px 16px; cursor: pointer; user-select: none;
          background: transparent;
        }
        .clause-header:hover { background: rgba(90,110,90,0.03); }

        .severity-stripe { width: 3px; border-radius: 2px; align-self: stretch; min-height: 18px; flex-shrink: 0; }
        .clause-name { flex: 1; font-size: 13px; font-weight: 500; color: #2d3d38; }
        .clause-type-tag {
          font-family: var(--mono, monospace); font-size: 10px; color: #7a9088;
          padding: 2px 7px; border-radius: 4px; border: 1px solid rgba(90,110,90,0.14);
        }
        .model-tag {
          font-family: var(--mono, monospace); font-size: 9px;
          padding: 2px 7px; border-radius: 4px;
          background: rgba(93,138,144,0.08); border: 1px solid rgba(93,138,144,0.18);
          color: #5d8a90;
        }
        .severity-badge {
          padding: 3px 9px; border-radius: 4px;
          font-family: var(--mono, monospace); font-size: 10px;
          letter-spacing: 0.8px; text-transform: uppercase;
        }
        .conf-wrap { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .conf-bar-wrap { width: 44px; height: 3px; background: rgba(0,0,0,0.08); border-radius: 4px; overflow: hidden; }
        .conf-bar-fill { height: 100%; border-radius: 4px; }
        .conf-pct { font-family: var(--mono, monospace); font-size: 9px; color: #8fa89c; }
        .chevron { color: #8fa89c; font-size: 10px; transition: transform 0.18s; }
        .chevron.open { transform: rotate(180deg); }

        /* rewritten badge */
        .rewritten-tag {
          font-family: var(--mono, monospace); font-size: 9px; padding: 2px 7px;
          border-radius: 4px; background: rgba(74,122,90,0.12);
          color: #4a7a5a; border: 1px solid rgba(74,122,90,0.2); flex-shrink: 0;
        }

        .clause-body {
          border-top: 1px solid rgba(90,110,90,0.10); padding: 16px;
          background: #f7f6ee; display: flex; flex-direction: column; gap: 14px;
        }
        .section-lbl {
          font-family: var(--mono, monospace); font-size: 10px;
          text-transform: uppercase; letter-spacing: 1.5px; color: #8fa89c; margin-bottom: 6px;
        }
        .original-text {
          background: rgba(184,84,80,0.04); border: 1px solid rgba(184,84,80,0.14);
          border-radius: 8px; padding: 12px 14px; font-size: 13px;
          line-height: 1.75; color: #2d3d38; font-family: Georgia, serif;
        }
        .risk-text { font-size: 13px; line-height: 1.65; color: #5a7068; }
        .suggested-text {
          background: rgba(106,158,120,0.06); border: 1px solid rgba(106,158,120,0.18);
          border-radius: 8px; padding: 12px 14px; font-size: 13px;
          line-height: 1.75; color: #1e4a2e; font-family: Georgia, serif;
        }
        .acta-tag {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 8px; border-radius: 4px;
          background: rgba(106,158,120,0.12); border: 1px solid rgba(106,158,120,0.22);
          font-family: var(--mono, monospace); font-size: 10px; color: #6a9e78;
          margin-bottom: 6px; width: fit-content;
        }
        .diff-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (max-width: 700px) { .diff-wrap { grid-template-columns: 1fr; } }
        .diff-removed {
          background: rgba(184,84,80,0.04); border: 1px solid rgba(184,84,80,0.15);
          border-radius: 8px; padding: 10px 12px; font-size: 12px;
          font-family: Georgia, serif; color: #b85450; line-height: 1.65;
          text-decoration: line-through; opacity: 0.7;
        }
        .diff-added {
          background: rgba(106,158,120,0.06); border: 1px solid rgba(106,158,120,0.18);
          border-radius: 8px; padding: 10px 12px; font-size: 12px;
          font-family: Georgia, serif; color: #1e4a2e; line-height: 1.65;
        }
        .diff-lbl { font-family: var(--mono, monospace); font-size: 9px;
          text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; opacity: 0.6; }

        .spin { animation: spin 0.7s linear infinite; display: inline-block; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Traffic light legend */}
      <div className="tl-legend">
        <span className="tl-legend-title">Risk Key:</span>
        <div className="tl-item">🔴 <span>Critical — must replace</span></div>
        <div className="tl-item">🟡 <span>Minor — revise</span></div>
        <div className="tl-item">🟢 <span>Aligned — ACTA compliant</span></div>
        <div className="tl-item">⚫ <span>Unknown — human review</span></div>
      </div>

      {/* One-click ACTA mode */}
      <div className="acta-bar">
        <div>
          <div className="acta-bar-label">⚡ One-Click ACTA Mode</div>
          <div className="acta-bar-sub">Rewrite every deviating clause to ACTA standard · generates negotiation memo</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {actaMode && (
            <button className="acta-btn-ghost" onClick={() => { setActaMode(false); setActaRewrites({}); setActaMemo(""); }}>
              Clear
            </button>
          )}
          <button className="acta-btn" onClick={handleACTAMode} disabled={actaLoading}>
            {actaLoading
              ? <><span className="spin" style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%" }} /> Rewriting…</>
              : "⚡ Reset to ACTA Baseline"}
          </button>
        </div>
      </div>

      {/* ACTA memo */}
      {actaMode && actaMemo && (
        <div className="acta-memo">
          <div className="acta-memo-label">✓ ACTA Negotiation Memo</div>
          {actaMemo}
        </div>
      )}

      {/* Filter bar */}
      <div className="filter-bar">
        {(["all", "critical", "minor", "aligned"] as const).map(f => (
          <button
            key={f}
            className={`filter-chip ${filter === f ? `fc-${f}` : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? `All (${entries.length})`
              : f === "critical" ? `🔴 Critical (${counts.critical})`
              : f === "minor"    ? `🟡 Minor (${counts.minor})`
              : `🟢 Aligned (${counts.aligned})`}
          </button>
        ))}
      </div>

      {/* Clause cards */}
      {filtered.map(([key, clause]) => {
        const isOpen = expanded[key];
        const dev    = clause.deviation ?? "minor";
        const s      = getS(dev);
const hasRewrite = actaMode && actaRewrites[key];
        const isJumped = jumpToClause === key;

        return (
          <div
            key={key}
            className={`clause-card${isJumped ? " jumped" : ""}`}
            ref={el => { cardRefs.current[key] = el; }}
          >
            <div className="clause-header" onClick={() => toggle(key)}>
              <div className="severity-stripe" style={{ background: s.stripe }} />
              <span style={{ fontSize: 15, flexShrink: 0 }}>{tlIcon(dev, clause.confidence)}</span>
              <div className="clause-name">{key}</div>

              {clause.type && clause.type !== "General Clause" && (
                <span className="clause-type-tag">{clause.type}</span>
              )}
              <div className="severity-badge" style={{ background: s.badge, color: s.text }}>
                {dev.toUpperCase()}
              </div>

              {hasRewrite && <span className="rewritten-tag">REWRITTEN</span>}
              <span className={`chevron ${isOpen ? "open" : ""}`}>▼</span>
            </div>

            {isOpen && (
              <div className="clause-body">
                {/* Original */}
                <div>
                  <div className="section-lbl">📄 Original Clause</div>
                  <div className="original-text">{clause.text}</div>
                </div>

                {/* Risk */}
                {clause.risk_reason && (
                  <div>
                    <div className="section-lbl">⚠️ ACTA Deviation</div>
                    <div className="risk-text">{clause.risk_reason}</div>
                  </div>
                )}

                {/* ACTA rewrite diff OR standard suggestion */}
                {hasRewrite ? (
                  <div>
                    <div className="section-lbl">⚡ ACTA Reset</div>
                    <div className="diff-wrap">
                      <div className="diff-removed">
                        <div className="diff-lbl" style={{ color: "#b85450" }}>─ Removed</div>
                        {clause.text}
                      </div>
                      <div className="diff-added">
                        <div className="diff-lbl" style={{ color: "#6a9e78" }}>+ ACTA Standard</div>
                        {actaRewrites[key]}
                      </div>
                    </div>
                  </div>
                ) : (
                  clause.suggested_clause && clause.suggested_clause !== clause.text && (
                    <div>
                      <div className="section-lbl">✏️ AI Redline Suggestion</div>
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
