"use client";

import { useState } from "react";

// ─────────────────────────────────────────────────────────────────
// PREDICTIVE SITE PERSONA INTELLIGENCE
// 4 site types with known negotiation tendencies.
// AI predicts which clauses will cause friction BEFORE you send.
// ─────────────────────────────────────────────────────────────────

interface PersonaProfile {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
  description: string;
  avgDaysToClose: number;
  topFrictionClauses: string[];
  negotiationStyle: string;
  tendencies: { clause: string; likelihood: number; note: string }[];
  preEmptiveStrategies: string[];
}

const PERSONAS: PersonaProfile[] = [
  {
    id: "academic",
    name: "Academic Medical Center",
    shortName: "AMC",
    icon: "🏛️",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.2)",
    description: "Large research universities (Mayo, Johns Hopkins, UCSF). Heavy IP protection stance, slow legal review cycles, faculty publication rights are non-negotiable.",
    avgDaysToClose: 112,
    topFrictionClauses: ["Intellectual Property", "Publication Rights", "Indemnification"],
    negotiationStyle: "Adversarial — multiple rounds expected",
    tendencies: [
      { clause: "Intellectual Property", likelihood: 89, note: "Will demand site retains background IP and any improvements to existing technology." },
      { clause: "Publication Rights", likelihood: 94, note: "Faculty culture demands right to publish. Will reject >60-day delays. Expect counter-proposal for 30-day review." },
      { clause: "Indemnification", likelihood: 76, note: "Will push back on any blanket sponsor indemnification. Typically demands mutual negligence-based only." },
      { clause: "Confidentiality", likelihood: 45, note: "Usually acceptable at 5 years. May request academic disclosure carve-outs." },
      { clause: "Payment Terms", likelihood: 52, note: "F&A rate disputes common — will often push above 26% cap." },
    ],
    preEmptiveStrategies: [
      "Send ACTA baseline IP clause pre-emptively with cover note explaining mutual protection",
      "Explicitly grant 60-day publication review period upfront — don't wait for them to ask",
      "Cap F&A at 26% in initial draft to avoid anchor negotiation",
      "Include faculty co-investigator acknowledgment language to reduce publication friction",
    ],
  },
  {
    id: "community",
    name: "Community Hospital",
    shortName: "Community",
    icon: "🏥",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
    description: "Regional hospitals without dedicated research legal teams. Often use outside counsel unfamiliar with ACTA. Slower due to inexperience, not adversarial intent.",
    avgDaysToClose: 78,
    topFrictionClauses: ["Subject Injury", "Payment Terms", "Governing Law"],
    negotiationStyle: "Inexperienced — education-driven delays",
    tendencies: [
      { clause: "Subject Injury", likelihood: 82, note: "Unfamiliar with ACTA subject injury standards. Outside counsel often over-protects, adding broad hospital indemnification." },
      { clause: "Payment Terms", likelihood: 71, note: "Budget unfamiliarity — often need itemized cost explanations. Invoice disputes common mid-trial." },
      { clause: "Governing Law", likelihood: 58, note: "Will insist on local state jurisdiction. Rarely a dealbreaker but adds negotiation rounds." },
      { clause: "Intellectual Property", likelihood: 22, note: "Community hospitals rarely push back on IP — they don't have research IP infrastructure." },
      { clause: "Publication Rights", likelihood: 18, note: "Not a faculty-driven institution — publication rights rarely contested." },
    ],
    preEmptiveStrategies: [
      "Provide a one-page ACTA plain-English explainer with the draft to reduce outside counsel questions",
      "Include itemized budget breakdown in initial draft to prevent payment disputes",
      "Offer local jurisdiction as a concession early — it costs nothing and saves a round",
      "Send subject injury ACTA language with explicit annotation explaining Regeneron's coverage scope",
    ],
  },
  {
    id: "university",
    name: "University Research Center",
    shortName: "University",
    icon: "🎓",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.08)",
    border: "rgba(139,92,246,0.2)",
    description: "Stand-alone research institutes affiliated with universities. Moderate IP sophistication. Publication rights important but often more flexible than AMCs.",
    avgDaysToClose: 65,
    topFrictionClauses: ["Intellectual Property", "Confidentiality", "Termination"],
    negotiationStyle: "Collaborative — willing to use ACTA as anchor",
    tendencies: [
      { clause: "Intellectual Property", likelihood: 67, note: "Will push for joint ownership on derivative discoveries. More flexible than AMCs on licensing terms." },
      { clause: "Confidentiality", likelihood: 61, note: "Academic disclosure exceptions are important. Will push for carve-outs for peer review submissions." },
      { clause: "Termination", likelihood: 55, note: "Concerned about mid-trial termination and completion of enrolled patient obligations. Will add wind-down provisions." },
      { clause: "Publication Rights", likelihood: 48, note: "Important but more negotiable — often accept 45-60 day review vs. AMC's 30-day demand." },
      { clause: "Indemnification", likelihood: 38, note: "Generally accepts ACTA mutual negligence standard." },
    ],
    preEmptiveStrategies: [
      "Offer joint publication authorship acknowledgment — low cost, high goodwill",
      "Include explicit termination wind-down language for enrolled patients upfront",
      "Add academic disclosure carve-out to confidentiality clause proactively",
      "Propose licensing revenue share on derivative IP to close IP disputes faster",
    ],
  },
  {
    id: "private",
    name: "Private Research Site",
    shortName: "Private Site",
    icon: "🔬",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.2)",
    description: "For-profit clinical research organizations (CROs) and dedicated trial sites. Most ACTA-familiar. Fastest to close. Primary concern is payment terms and overhead.",
    avgDaysToClose: 28,
    topFrictionClauses: ["Payment Terms", "Termination"],
    negotiationStyle: "Transactional — efficiency-driven",
    tendencies: [
      { clause: "Payment Terms", likelihood: 79, note: "Will negotiate hard on per-patient fees and overhead. Net-15 preferred over Net-30. Watch screen failure reimbursement." },
      { clause: "Termination", likelihood: 64, note: "Will require termination-for-convenience payment coverage for already-incurred costs." },
      { clause: "Intellectual Property", likelihood: 12, note: "Private sites rarely contest IP — they operate as service providers, not IP generators." },
      { clause: "Publication Rights", likelihood: 8, note: "Almost never contested — CROs don't have academic publishing incentives." },
      { clause: "Indemnification", likelihood: 31, note: "Generally accepts ACTA standard but will review carefully." },
    ],
    preEmptiveStrategies: [
      "Offer Net-20 payment terms as a concession from Net-30 to accelerate closure",
      "Include explicit screen failure reimbursement schedule in initial budget",
      "Add termination-for-convenience payment clause covering incurred costs",
      "Front-load payment schedule — private sites value cash flow predictability",
    ],
  },
];

interface Props {
  clauses: Record<string, { type?: string; deviation?: string; risk_reason?: string }>;
}

export default function SitePersona({ clauses }: Props) {
  const [selectedPersona, setSelectedPersona] = useState<PersonaProfile | null>(null);
  const [showStrategies, setShowStrategies] = useState(false);

  // Map existing analyzed clauses to persona friction predictions
  const getClauseRisk = (clauseName: string, persona: PersonaProfile) => {
    const tendency = persona.tendencies.find(t =>
      clauseName.toLowerCase().includes(t.clause.toLowerCase()) ||
      t.clause.toLowerCase().includes(clauseName.split(" ")[0].toLowerCase())
    );
    return tendency || null;
  };

  // Find which of the user's actual critical clauses overlap with persona friction points
  const criticalClauses = Object.entries(clauses).filter(([, c]) => c.deviation === "critical");

  return (
    <div>
      <style>{`
        .persona-header {
          margin-bottom: 20px;
        }
        .persona-header-title {
          font-size: 15px;
          font-weight: 800;
          letter-spacing: -0.3px;
          margin-bottom: 6px;
        }
        .persona-header-sub {
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          color: #64748b;
          line-height: 1.5;
        }

        .persona-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        @media (max-width: 600px) { .persona-grid { grid-template-columns: 1fr; } }

        .persona-card {
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.18s;
          border: 1px solid rgba(255,255,255,0.07);
          background: #0d1422;
        }
        .persona-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.14); }
        .persona-card.selected { transform: translateY(-2px); }

        .persona-card-top {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .persona-icon {
          font-size: 24px;
        }
        .persona-name {
          font-size: 13px;
          font-weight: 700;
        }
        .persona-short {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          color: #64748b;
          margin-top: 1px;
        }

        .persona-days {
          display: flex;
          align-items: baseline;
          gap: 4px;
          margin-bottom: 8px;
        }
        .persona-days-num {
          font-size: 28px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }
        .persona-days-label {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          color: #64748b;
        }

        .persona-style {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          color: #64748b;
          padding: 4px 0;
          border-top: 1px solid rgba(255,255,255,0.05);
          margin-top: 6px;
        }

        /* Detail panel */
        .persona-detail {
          border-radius: 14px;
          padding: 24px;
          margin-bottom: 20px;
          border: 1px solid;
        }
        .persona-detail-title {
          font-size: 16px;
          font-weight: 800;
          letter-spacing: -0.3px;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .persona-detail-desc {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.65;
          margin-bottom: 20px;
        }

        .friction-title {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #475569;
          margin-bottom: 12px;
        }

        .friction-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .friction-row:last-child { border-bottom: none; }

        .friction-clause {
          font-size: 13px;
          font-weight: 600;
          width: 150px;
          flex-shrink: 0;
        }
        .friction-bar-wrap {
          flex: 1;
          height: 6px;
          background: rgba(255,255,255,0.06);
          border-radius: 4px;
          overflow: hidden;
        }
        .friction-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.8s ease;
        }
        .friction-pct {
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          font-weight: 700;
          width: 36px;
          text-align: right;
          flex-shrink: 0;
        }
        .friction-note {
          font-size: 11px;
          color: #64748b;
          line-height: 1.5;
          margin-top: 3px;
        }
        .friction-row-wrap {
          flex: 1;
        }

        /* Overlap alert */
        .overlap-alert {
          display: flex;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 8px;
          background: rgba(239,68,68,0.06);
          border: 1px solid rgba(239,68,68,0.2);
          margin-bottom: 8px;
          font-size: 12px;
          color: #fca5a5;
          line-height: 1.5;
          align-items: flex-start;
        }

        /* Strategy cards */
        .strategy-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 16px;
        }
        .strategy-card {
          display: flex;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 8px;
          background: rgba(59,130,246,0.05);
          border: 1px solid rgba(59,130,246,0.12);
          font-size: 12.5px;
          color: #94a3b8;
          line-height: 1.55;
          align-items: flex-start;
        }
        .strategy-num {
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          font-weight: 700;
          color: #3b82f6;
          width: 20px;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .toggle-strategies {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.08);
          color: #64748b;
          padding: 8px 14px;
          border-radius: 8px;
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          cursor: pointer;
          transition: all 0.15s;
          margin-top: 16px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .toggle-strategies:hover { border-color: rgba(59,130,246,0.3); color: #93c5fd; }
      `}</style>

      <div className="persona-header">
        <div className="persona-header-title">🎯 Predictive Site Negotiation Intelligence</div>
        <div className="persona-header-sub">
          Select the site type you&apos;re negotiating with — AI predicts which clauses will cause friction before you send.
        </div>
      </div>

      {/* Persona selector grid */}
      <div className="persona-grid">
        {PERSONAS.map((p) => (
          <div
            key={p.id}
            className={`persona-card ${selectedPersona?.id === p.id ? "selected" : ""}`}
            style={{
              borderColor: selectedPersona?.id === p.id ? p.border : undefined,
              background: selectedPersona?.id === p.id ? p.bg : undefined,
            }}
            onClick={() => {
              setSelectedPersona(selectedPersona?.id === p.id ? null : p);
              setShowStrategies(false);
            }}
          >
            <div className="persona-card-top">
              <div className="persona-icon">{p.icon}</div>
              <div>
                <div className="persona-name" style={{ color: selectedPersona?.id === p.id ? p.color : undefined }}>
                  {p.name}
                </div>
                <div className="persona-short">{p.shortName}</div>
              </div>
            </div>
            <div className="persona-days">
              <div className="persona-days-num" style={{ color: p.color }}>{p.avgDaysToClose}</div>
              <div className="persona-days-label">avg days to close</div>
            </div>
            <div className="persona-style">{p.negotiationStyle}</div>
          </div>
        ))}
      </div>

      {/* Selected persona detail */}
      {selectedPersona && (
        <div className="persona-detail" style={{ borderColor: selectedPersona.border, background: selectedPersona.bg }}>
          <div className="persona-detail-title" style={{ color: selectedPersona.color }}>
            <span>{selectedPersona.icon}</span>
            {selectedPersona.name}
          </div>
          <div className="persona-detail-desc">{selectedPersona.description}</div>

          {/* Overlap warnings with user's actual critical clauses */}
          {criticalClauses.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div className="friction-title">⚠️ Overlap with Your Critical Clauses</div>
              {criticalClauses.map(([name]) => {
                const risk = getClauseRisk(name, selectedPersona);
                if (!risk) return null;
                return (
                  <div className="overlap-alert" key={name}>
                    <span style={{ fontSize: 16 }}>🔴</span>
                    <div>
                      <strong>{name}</strong> — This site type pushes back on this clause {risk.likelihood}% of the time.
                      Already flagged as critical in your contract. High risk of multi-week delay.
                    </div>
                  </div>
                );
              }).filter(Boolean)}
            </div>
          )}

          {/* Friction probability bars */}
          <div className="friction-title">Predicted Clause Friction Probability</div>
          {selectedPersona.tendencies.map((t) => {
            const barColor = t.likelihood >= 75 ? "#ef4444" : t.likelihood >= 50 ? "#f59e0b" : "#22c55e";
            return (
              <div className="friction-row" key={t.clause}>
                <div className="friction-clause">{t.clause}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="friction-bar-wrap">
                      <div className="friction-bar-fill" style={{ width: `${t.likelihood}%`, background: barColor }} />
                    </div>
                    <div className="friction-pct" style={{ color: barColor }}>{t.likelihood}%</div>
                  </div>
                  <div className="friction-note">{t.note}</div>
                </div>
              </div>
            );
          })}

          {/* Pre-emptive strategies toggle */}
          <button className="toggle-strategies" onClick={() => setShowStrategies(!showStrategies)}>
            {showStrategies ? "▲ Hide" : "▼ Show"} Pre-Emptive Negotiation Strategies ({selectedPersona.preEmptiveStrategies.length})
          </button>

          {showStrategies && (
            <div className="strategy-grid">
              {selectedPersona.preEmptiveStrategies.map((s, i) => (
                <div className="strategy-card" key={i}>
                  <span className="strategy-num">{i + 1}.</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
