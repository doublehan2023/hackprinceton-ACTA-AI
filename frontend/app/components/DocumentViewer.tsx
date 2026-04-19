"use client";

import { useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────
// DOCUMENT VIEWER
// Left: contract rendered as a clean paper document with
//       inline colour-coded clause highlights
// Right: compact clause map sidebar
// Clicking either → fires onClauseClick(key) so parent can
//   switch to Redlines tab and scroll to that clause
// ─────────────────────────────────────────────────────────────

interface Clause {
  type?: string;
  text: string;
  deviation?: "critical" | "minor" | "aligned" | string;
  risk_reason?: string;
  suggested_clause?: string;
  confidence?: number;
}

interface Props {
  contractText: string;
  clauses: Record<string, Clause>;
  onClauseClick: (clauseKey: string) => void;
}

// ── Cream/sage palette per deviation ──
const STYLES = {
  critical: {
    bg:        "rgba(184,84,80,0.11)",
    border:    "rgba(184,84,80,0.40)",
    textColor: "#6b1f1d",
    chipBg:    "rgba(184,84,80,0.13)",
    chipText:  "#b85450",
    dot:       "#b85450",
    icon:      "●",
  },
  minor: {
    bg:        "rgba(201,151,74,0.11)",
    border:    "rgba(201,151,74,0.40)",
    textColor: "#6b4010",
    chipBg:    "rgba(201,151,74,0.13)",
    chipText:  "#c9974a",
    dot:       "#c9974a",
    icon:      "●",
  },
  aligned: {
    bg:        "rgba(106,158,120,0.10)",
    border:    "rgba(106,158,120,0.35)",
    textColor: "#1e4a2e",
    chipBg:    "rgba(106,158,120,0.13)",
    chipText:  "#6a9e78",
    dot:       "#6a9e78",
    icon:      "●",
  },
} as const;

function getStyle(dev?: string) {
  return STYLES[(dev as keyof typeof STYLES) ?? "minor"] ?? STYLES.minor;
}

// ── Segment type: plain text or a matched clause ──
interface Segment {
  text: string;
  clauseKey?: string;
  deviation?: string;
}

// ── Annotate the raw contract text with clause highlights ──
function annotate(raw: string, clauses: Record<string, Clause>): Segment[] {
  // Build [(position, key, fullText, deviation)] sorted by position
  const hits = Object.entries(clauses)
    .map(([key, c]) => {
      const snippet = c.text.slice(0, 100).trim();
      const pos = raw.indexOf(snippet);
      return { key, pos, fullText: c.text, deviation: c.deviation ?? "minor" };
    })
    .filter(h => h.pos !== -1)
    .sort((a, b) => a.pos - b.pos);

  if (hits.length === 0) return [{ text: raw }];

  const segments: Segment[] = [];
  let cursor = 0;

  for (const hit of hits) {
    if (hit.pos < cursor) continue; // overlap guard
    if (hit.pos > cursor) {
      segments.push({ text: raw.slice(cursor, hit.pos) });
    }
    const end = Math.min(hit.pos + hit.fullText.length, raw.length);
    segments.push({ text: raw.slice(hit.pos, end), clauseKey: hit.key, deviation: hit.deviation });
    cursor = end;
  }

  if (cursor < raw.length) segments.push({ text: raw.slice(cursor) });
  return segments;
}

// ── Split a plain-text segment into visual paragraphs ──
function paragraphs(text: string): string[] {
  return text.split(/\n{2,}/).map(p => p.replace(/\n/g, " ").trim()).filter(Boolean);
}

export default function DocumentViewer({ contractText, clauses, onClauseClick }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const entries  = Object.entries(clauses);
  const segments = annotate(contractText, clauses);

  const counts = {
    critical: entries.filter(([, c]) => c.deviation === "critical").length,
    minor:    entries.filter(([, c]) => c.deviation === "minor").length,
    aligned:  entries.filter(([, c]) => c.deviation === "aligned").length,
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      <style>{`
        /* ═══ DOCUMENT PANE ═══ */
        .dv-doc-pane {
          flex: 1;
          overflow-y: auto;
          background: #f0efdf;
        }

        .dv-paper {
          max-width: 720px;
          margin: 0 auto;
          padding: 56px 72px 80px;
          background: #fafaf8;
          min-height: 100%;
          font-family: 'DM Sans', Arial, sans-serif;
          font-size: 13.5px;
          line-height: 1.9;
          color: #2d3d38;
          box-shadow: 0 0 0 1px rgba(90,110,90,0.08), 0 4px 32px rgba(0,0,0,0.04);
        }

        .dv-doc-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 36px;
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(90,110,90,0.14);
        }
        .dv-doc-title {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #7a9088;
        }
        .dv-doc-counts {
          display: flex;
          gap: 12px;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
        }

        .dv-para {
          margin-bottom: 16px;
          color: #2d3d38;
        }

        /* ── Inline highlight ── */
        .dv-hl {
          border-radius: 3px;
          padding: 1px 0;
          cursor: pointer;
          position: relative;
          border-bottom: 2px solid transparent;
          transition: filter 0.12s, outline 0.12s;
          display: inline;
        }
        .dv-hl:hover { filter: brightness(0.94); }

        /* Floating label (shows on hover via parent:hover in CSS) */
        .dv-hl-label {
          display: none;
          position: absolute;
          bottom: calc(100% + 6px);
          left: 0;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          padding: 4px 10px;
          border-radius: 6px;
          white-space: nowrap;
          z-index: 60;
          pointer-events: none;
          box-shadow: 0 2px 10px rgba(0,0,0,0.10);
          line-height: 1.4;
        }
        .dv-hl:hover .dv-hl-label { display: block; }

        .dv-doc-footer {
          margin-top: 48px;
          padding-top: 16px;
          border-top: 1px solid rgba(90,110,90,0.10);
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: #7a9088;
          text-align: center;
          letter-spacing: 0.5px;
        }

        /* ═══ CLAUSE SIDEBAR ═══ */
        .dv-sidebar {
          width: 268px;
          flex-shrink: 0;
          overflow-y: auto;
          border-left: 1px solid rgba(90,110,90,0.12);
          background: #f7f6ee;
          padding: 22px 14px;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .dv-sb-header {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #7a9088;
          margin-bottom: 12px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(90,110,90,0.12);
        }

        .dv-legend {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .dv-legend-item {
          display: flex;
          align-items: center;
          gap: 5px;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: #7a9088;
        }
        .dv-legend-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
        }

        .dv-sb-item {
          padding: 10px 11px;
          border-radius: 8px;
          border: 1px solid rgba(90,110,90,0.10);
          background: #fafaf4;
          cursor: pointer;
          transition: all 0.14s;
          margin-bottom: 6px;
        }
        .dv-sb-item:hover { transform: translateX(2px); }

        .dv-sb-item-top {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        }
        .dv-sb-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .dv-sb-name {
          font-size: 11.5px;
          font-weight: 500;
          color: #2d3d38;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .dv-sb-chip {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          padding: 1px 6px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          flex-shrink: 0;
        }
        .dv-sb-snippet {
          font-size: 11px;
          color: #8fa89c;
          line-height: 1.5;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .dv-sb-hint {
          display: none;
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          color: #5d8a90;
          margin-top: 5px;
        }
        .dv-sb-item:hover .dv-sb-hint { display: block; }

        @media (max-width: 900px) {
          .dv-sidebar { display: none; }
        }
      `}</style>

      {/* ── LEFT: DOCUMENT ── */}
      <div className="dv-doc-pane">
        <div className="dv-paper">

          {/* Header row */}
          <div className="dv-doc-meta">
            <div className="dv-doc-title">Clinical Trial Agreement</div>
            <div className="dv-doc-counts">
              <span style={{ color: "#b85450" }}>● {counts.critical} critical</span>
              <span style={{ color: "#c9974a" }}>● {counts.minor} minor</span>
              <span style={{ color: "#6a9e78" }}>● {counts.aligned} aligned</span>
            </div>
          </div>

          {/* Annotated body */}
          {segments.map((seg, si) => {

            // ── Plain text ──
            if (!seg.clauseKey) {
              return paragraphs(seg.text).map((p, pi) => (
                <p className="dv-para" key={`p-${si}-${pi}`}>{p}</p>
              ));
            }

            // ── Highlighted clause ──
            const s = getStyle(seg.deviation);
            const isActive = hovered === seg.clauseKey;

            return (
              <span
                key={`hl-${si}`}
                className="dv-hl"
                style={{
                  backgroundColor: s.bg,
                  borderBottomColor: s.border,
                  color: s.textColor,
                  outline: isActive ? `2px solid ${s.dot}` : "none",
                  outlineOffset: "1px",
                }}
                onMouseEnter={() => setHovered(seg.clauseKey!)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onClauseClick(seg.clauseKey!)}
              >
                {/* Hover label */}
                <span
                  className="dv-hl-label"
                  style={{ background: s.chipBg, color: s.chipText, border: `1px solid ${s.border}` }}
                >
                  <span style={{ marginRight: 4 }}>{s.icon}</span>
                  {seg.clauseKey}
                  <span style={{ opacity: 0.55, marginLeft: 6 }}>→ view redline</span>
                </span>

                {seg.text}
              </span>
            );
          })}

          <div className="dv-doc-footer">
            Highlights indicate ACTA compliance status · Click any highlighted passage to view its full redline analysis
          </div>
        </div>
      </div>

      {/* ── RIGHT: CLAUSE MAP SIDEBAR ── */}
      <div className="dv-sidebar">
        <div className="dv-sb-header">Clause Map</div>

        <div className="dv-legend">
          <div className="dv-legend-item">
            <div className="dv-legend-dot" style={{ background: "#b85450" }} />Critical
          </div>
          <div className="dv-legend-item">
            <div className="dv-legend-dot" style={{ background: "#c9974a" }} />Minor
          </div>
          <div className="dv-legend-item">
            <div className="dv-legend-dot" style={{ background: "#6a9e78" }} />Aligned
          </div>
        </div>

        {entries.map(([key, clause]) => {
          const s = getStyle(clause.deviation);
          const isActive = hovered === key;
          return (
            <div
              key={key}
              className="dv-sb-item"
              style={{
                borderColor: isActive ? s.border : undefined,
                background: isActive ? s.bg : undefined,
              }}
              onMouseEnter={() => setHovered(key)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onClauseClick(key)}
            >
              <div className="dv-sb-item-top">
                <div className="dv-sb-dot" style={{ background: s.dot }} />
                <div className="dv-sb-name" title={key}>{key}</div>
                <div className="dv-sb-chip" style={{ background: s.chipBg, color: s.chipText }}>
                  {clause.deviation ?? "minor"}
                </div>
              </div>
              <div className="dv-sb-snippet">
                {clause.text.slice(0, 88)}{clause.text.length > 88 ? "…" : ""}
              </div>
              <div className="dv-sb-hint">↗ jump to redline analysis</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}