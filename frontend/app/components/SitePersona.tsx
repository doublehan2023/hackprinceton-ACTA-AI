"use client";

import { useState } from "react";

interface PersonaProfile {
  id: string;
  name: string;
  shortName: string;
  color: string;
  bg: string;
  border: string;
  description: string;
  avgDaysToClose: number;
  negotiationStyle: string;
  tendencies: { clause: string; likelihood: number; note: string }[];
  preEmptiveStrategies: string[];
}

const PERSONAS: PersonaProfile[] = [
  {
    id: "academic", name: "Academic Medical Center", shortName: "AMC",
    color: "#b85450", bg: "rgba(184,84,80,0.06)", border: "rgba(184,84,80,0.2)",
    description: "Large research universities (Mayo, Johns Hopkins, UCSF). Heavy IP protection stance, slow legal review cycles, faculty publication rights are non-negotiable.",
    avgDaysToClose: 112, negotiationStyle: "Adversarial — multiple rounds expected",
    tendencies: [
      { clause: "Intellectual Property", likelihood: 89, note: "Will demand site retains background IP and any improvements to existing technology." },
      { clause: "Publication Rights", likelihood: 94, note: "Faculty culture demands right to publish. Will reject >60-day delays. Expect 30-day counter-proposal." },
      { clause: "Indemnification", likelihood: 76, note: "Will push back on blanket sponsor indemnification. Typically demands mutual negligence-based only." },
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
    id: "community", name: "Community Hospital", shortName: "Community",
    color: "#c9974a", bg: "rgba(201,151,74,0.06)", border: "rgba(201,151,74,0.2)",
    description: "Regional hospitals without dedicated research legal teams. Often use outside counsel unfamiliar with ACTA. Slower due to inexperience, not adversarial intent.",
    avgDaysToClose: 78, negotiationStyle: "Inexperienced — education-driven delays",
    tendencies: [
      { clause: "Subject Injury", likelihood: 82, note: "Unfamiliar with ACTA subject injury standards. Outside counsel often over-protects." },
      { clause: "Payment Terms", likelihood: 71, note: "Budget unfamiliarity — often need itemized cost explanations. Invoice disputes common mid-trial." },
      { clause: "Governing Law", likelihood: 58, note: "Will insist on local state jurisdiction. Rarely a dealbreaker but adds negotiation rounds." },
      { clause: "Intellectual Property", likelihood: 22, note: "Community hospitals rarely push back on IP — they don't have research IP infrastructure." },
      { clause: "Publication Rights", likelihood: 18, note: "Not a faculty-driven institution — publication rights rarely contested." },
    ],
    preEmptiveStrategies: [
      "Provide a one-page ACTA plain-English explainer with the draft",
      "Include itemized budget breakdown in initial draft to prevent payment disputes",
      "Offer local jurisdiction as a concession early — it costs nothing and saves a round",
      "Send subject injury ACTA language with explicit annotation explaining coverage scope",
    ],
  },
  {
    id: "university", name: "University Research Center", shortName: "University",
    color: "#5d8a90", bg: "rgba(93,138,144,0.06)", border: "rgba(93,138,144,0.2)",
    description: "Stand-alone research institutes affiliated with universities. Moderate IP sophistication. Publication rights important but often more flexible than AMCs.",
    avgDaysToClose: 65, negotiationStyle: "Collaborative — willing to use ACTA as anchor",
    tendencies: [
      { clause: "Intellectual Property", likelihood: 67, note: "Will push for joint ownership on derivative discoveries. More flexible than AMCs on licensing." },
      { clause: "Confidentiality", likelihood: 61, note: "Academic disclosure exceptions are important. Will push for peer review submission carve-outs." },
      { clause: "Termination", likelihood: 55, note: "Concerned about mid-trial termination and enrolled patient obligations." },
      { clause: "Publication Rights", likelihood: 48, note: "Important but more negotiable — often accept 45-60 day review." },
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
    id: "private", name: "Private Research Site", shortName: "Private Site",
    color: "#6a9e78", bg: "rgba(106,158,120,0.06)", border: "rgba(106,158,120,0.2)",
    description: "For-profit CROs and dedicated trial sites. Most ACTA-familiar. Fastest to close. Primary concern is payment terms and overhead.",
    avgDaysToClose: 28, negotiationStyle: "Transactional — efficiency-driven",
    tendencies: [
      { clause: "Payment Terms", likelihood: 79, note: "Will negotiate hard on per-patient fees. Net-15 preferred over Net-30. Watch screen failure reimbursement." },
      { clause: "Termination", likelihood: 64, note: "Will require termination-for-convenience payment coverage for incurred costs." },
      { clause: "Intellectual Property", likelihood: 12, note: "Private sites rarely contest IP — they operate as service providers." },
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

  const getClauseRisk = (clauseName: string, persona: PersonaProfile) =>
    persona.tendencies.find(t =>
      clauseName.toLowerCase().includes(t.clause.toLowerCase()) ||
      t.clause.toLowerCase().includes(clauseName.split(" ")[0].toLowerCase())
    ) || null;

  const criticalClauses = Object.entries(clauses).filter(([, c]) => c.deviation === "critical");

  return (
    <div>
      <style>{`
        .persona-intro {
          margin-bottom: 20px;
        }
        .persona-intro-title { font-size: 14px; font-weight: 500; color: #2d3d38; margin-bottom: 5px; }
        .persona-intro-sub { font-family: 'DM Mono', monospace; font-size: 11px; color: #7a9088; line-height: 1.6; }

        .persona-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 24px;
        }
        @media (max-width: 600px) { .persona-grid { grid-template-columns: 1fr; } }

        .persona-card {
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.18s;
          border: 1px solid rgba(90,110,90,0.12);
          background: #f0efdf;
        }
        .persona-card:hover { transform: translateY(-1px); border-color: rgba(90,110,90,0.22); }
        .persona-card.selected { transform: translateY(-1px); }

        .persona-card-name { font-size: 13px; font-weight: 500; color: #2d3d38; margin-bottom: 2px; }
        .persona-card-short { font-family: 'DM Mono', monospace; font-size: 10px; color: #7a9088; margin-bottom: 10px; }
        .persona-days-num { font-size: 26px; font-weight: 600; font-variant-numeric: tabular-nums; }
        .persona-days-label { font-family: 'DM Mono', monospace; font-size: 10px; color: #7a9088; }
        .persona-style {
          font-family: 'DM Mono', monospace; font-size: 10px; color: #b0bfba;
          padding-top: 8px; border-top: 1px solid rgba(90,110,90,0.08); margin-top: 8px;
        }

        .persona-detail {
          border-radius: 14px; padding: 22px; margin-bottom: 20px;
          border: 1px solid;
        }
        .persona-detail-name { font-size: 15px; font-weight: 500; margin-bottom: 6px; }
        .persona-detail-desc { font-size: 13px; color: #7a9088; line-height: 1.65; margin-bottom: 20px; }

        .friction-label {
          font-family: 'DM Mono', monospace; font-size: 10px;
          text-transform: uppercase; letter-spacing: 1.5px; color: #b0bfba; margin-bottom: 12px;
        }
        .friction-row {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 10px 0; border-bottom: 1px solid rgba(90,110,90,0.06);
        }
        .friction-row:last-child { border-bottom: none; }
        .friction-clause { font-size: 12px; font-weight: 500; width: 150px; flex-shrink: 0; color: #2d3d38; }
        .friction-bar-wrap { flex: 1; height: 5px; background: rgba(90,110,90,0.1); border-radius: 4px; overflow: hidden; }
        .friction-bar-fill { height: 100%; border-radius: 4px; transition: width 0.8s ease; }
        .friction-pct { font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 500; width: 36px; text-align: right; flex-shrink: 0; }
        .friction-note { font-size: 11px; color: #7a9088; line-height: 1.5; margin-top: 3px; }

        .overlap-alert {
          display: flex; gap: 10px; padding: 12px 14px; border-radius: 8px;
          background: rgba(184,84,80,0.05); border: 1px solid rgba(184,84,80,0.15);
          margin-bottom: 8px; font-size: 12px; color: #7a9088; line-height: 1.5;
        }
        .overlap-dot { width: 6px; height: 6px; border-radius: 50%; background: #b85450; flex-shrink: 0; margin-top: 4px; }

        .strategy-toggle {
          background: transparent;
          border: 1px solid rgba(90,110,90,0.18);
          color: #7a9088; padding: 8px 14px;
          border-radius: 8px; font-family: 'DM Mono', monospace;
          font-size: 11px; cursor: pointer; transition: all 0.15s;
          margin-top: 16px; display: flex; align-items: center; gap: 6px;
        }
        .strategy-toggle:hover { border-color: rgba(90,110,90,0.35); color: #2d3d38; }

        .strategy-list { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; }
        .strategy-item {
          display: flex; gap: 10px; padding: 12px 14px;
          border-radius: 8px; background: rgba(93,138,144,0.05);
          border: 1px solid rgba(93,138,144,0.12);
          font-size: 12.5px; color: #7a9088; line-height: 1.55;
        }
        .strategy-num { font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 500; color: #3d6a70; width: 20px; flex-shrink: 0; }
      `}</style>

      <div className="persona-intro">
        <div className="persona-intro-title">Predictive site negotiation intelligence</div>
        <div className="persona-intro-sub">
          Select the site type you are negotiating with — AI predicts which clauses will cause friction before you send.
        </div>
      </div>

      <div className="persona-grid">
        {PERSONAS.map((p) => (
          <div
            key={p.id}
            className={`persona-card ${selectedPersona?.id === p.id ? "selected" : ""}`}
            style={{
              borderColor: selectedPersona?.id === p.id ? p.border : undefined,
              background: selectedPersona?.id === p.id ? p.bg : undefined,
            }}
            onClick={() => { setSelectedPersona(selectedPersona?.id === p.id ? null : p); setShowStrategies(false); }}
          >
            <div className="persona-card-name" style={{ color: selectedPersona?.id === p.id ? p.color : undefined }}>
              {p.name}
            </div>
            <div className="persona-card-short">{p.shortName}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
              <span className="persona-days-num" style={{ color: p.color }}>{p.avgDaysToClose}</span>
              <span className="persona-days-label">avg days to close</span>
            </div>
            <div className="persona-style">{p.negotiationStyle}</div>
          </div>
        ))}
      </div>

      {selectedPersona && (
        <div className="persona-detail" style={{ borderColor: selectedPersona.border, background: selectedPersona.bg }}>
          <div className="persona-detail-name" style={{ color: selectedPersona.color }}>{selectedPersona.name}</div>
          <div className="persona-detail-desc">{selectedPersona.description}</div>

          {criticalClauses.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div className="friction-label">Overlap with your critical clauses</div>
              {criticalClauses.map(([name]) => {
                const risk = getClauseRisk(name, selectedPersona);
                if (!risk) return null;
                return (
                  <div className="overlap-alert" key={name}>
                    <div className="overlap-dot" />
                    <div>
                      <strong style={{ color: "#2d3d38" }}>{name}</strong> — This site type pushes back on this clause {risk.likelihood}% of the time.
                      Already flagged critical in your contract. High risk of multi-week delay.
                    </div>
                  </div>
                );
              }).filter(Boolean)}
            </div>
          )}

          <div className="friction-label">Predicted clause friction probability</div>
          {selectedPersona.tendencies.map((t) => {
            const barColor = t.likelihood >= 75 ? "#b85450" : t.likelihood >= 50 ? "#c9974a" : "#6a9e78";
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

          <button className="strategy-toggle" onClick={() => setShowStrategies(!showStrategies)}>
            {showStrategies ? "Hide" : "Show"} pre-emptive strategies ({selectedPersona.preEmptiveStrategies.length})
          </button>

          {showStrategies && (
            <div className="strategy-list">
              {selectedPersona.preEmptiveStrategies.map((s, i) => (
                <div className="strategy-item" key={i}>
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