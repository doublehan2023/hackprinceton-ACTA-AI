"use client";
import { useState } from "react";

interface Props {
  filename: string;
  metrics: {
    risk_level: string;
    total_clauses: number;
    critical: number;
    minor: number;
    aligned: number;
    recommendation: string;
  };
}

type Holder = "Sponsor (Regeneron)" | "Site Legal" | "IRB/Compliance" | "Pending Review";
type Stage = "draft" | "sponsor-review" | "site-review" | "irb" | "executed";

interface VersionEntry {
  version: string;
  date: string;
  holder: Holder;
  stage: Stage;
  note: string;
  critical: number;
  minor: number;
}

const STAGE_LABELS: Record<Stage, string> = {
  "draft": "Draft",
  "sponsor-review": "Sponsor Review",
  "site-review": "Site Legal Review",
  "irb": "IRB / Compliance",
  "executed": "Executed ✓",
};

const STAGE_ORDER: Stage[] = ["draft", "sponsor-review", "site-review", "irb", "executed"];

// ─────────────────────────────────────────────────────────
// TIME-TO-CLOSE FORECASTING LOGIC
// Based on: critical count, minor count, historical averages
// Each stage has a base duration + per-clause multiplier
// ─────────────────────────────────────────────────────────
interface StageEstimate {
  stage: Stage;
  label: string;
  baseDays: number;
  estimatedDays: number;
  bottleneck: boolean;
  bottleneckReason?: string;
}

function buildForecast(critical: number, minor: number): StageEstimate[] {
  const stages: StageEstimate[] = [
    {
      stage: "draft",
      label: "Initial Draft",
      baseDays: 3,
      estimatedDays: 3,
      bottleneck: false,
    },
    {
      stage: "sponsor-review",
      label: "Sponsor Review",
      baseDays: 7,
      estimatedDays: Math.round(7 + critical * 4 + minor * 1.5),
      bottleneck: critical >= 2,
      bottleneckReason: critical >= 2 ? `${critical} critical clauses require senior legal escalation` : undefined,
    },
    {
      stage: "site-review",
      label: "Site Legal Review",
      baseDays: 21,
      estimatedDays: Math.round(21 + critical * 8 + minor * 3),
      bottleneck: critical >= 3,
      bottleneckReason: critical >= 3 ? "High critical count — expect 3+ redline rounds from site" : undefined,
    },
    {
      stage: "irb",
      label: "IRB / Compliance",
      baseDays: 14,
      estimatedDays: Math.round(14 + (critical > 0 ? 7 : 0)),
      bottleneck: false,
    },
    {
      stage: "executed",
      label: "Final Execution",
      baseDays: 3,
      estimatedDays: 3,
      bottleneck: false,
    },
  ];

  return stages;
}

function getStageColor(s: Stage, currentStage: Stage, bottleneck: boolean): string {
  const idx = STAGE_ORDER.indexOf(s);
  const curIdx = STAGE_ORDER.indexOf(currentStage);
  if (bottleneck) return "#ef4444";
  if (idx < curIdx) return "#22c55e";
  if (idx === curIdx) return "#3b82f6";
  return "#334155";
}

export default function WorkflowTracker({ filename, metrics }: Props) {
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const [versions, setVersions] = useState<VersionEntry[]>([
    {
      version: "v1.0",
      date: today,
      holder: "Sponsor (Regeneron)",
      stage: "draft",
      note: "Initial upload — AI analysis complete",
      critical: metrics.critical,
      minor: metrics.minor,
    },
  ]);

  const [currentHolder, setCurrentHolder] = useState<Holder>("Sponsor (Regeneron)");
  const [note, setNote] = useState("");
  const [currentStage, setCurrentStage] = useState<Stage>("draft");
  const [showGantt, setShowGantt] = useState(true);

  const addVersion = () => {
    const nextVersion = `v${(versions.length + 1).toFixed(1)}`;
    setVersions((prev) => [
      ...prev,
      {
        version: nextVersion,
        date: today,
        holder: currentHolder,
        stage: currentStage,
        note: note || "Version updated",
        critical: metrics.critical,
        minor: metrics.minor,
      },
    ]);
    setNote("");
  };

  const stageIdx = STAGE_ORDER.indexOf(currentStage);
  const forecast = buildForecast(metrics.critical, metrics.minor);
  const totalEstimated = forecast.reduce((sum, s) => sum + s.estimatedDays, 0);
  const totalBaseline = forecast.reduce((sum, s) => sum + s.baseDays, 0);
  const daysSaved = 100 - totalEstimated; // vs industry avg 100 days
  const maxBarDays = Math.max(...forecast.map(s => s.estimatedDays));
  const bottleneckStages = forecast.filter(s => s.bottleneck);

  // Which 3 clauses are causing the most delay
  return (
    <div>
      <style>{`
        .wf-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 28px;
        }
        @media (max-width: 640px) { .wf-grid { grid-template-columns: 1fr; } }

        .wf-card {
          background: #0d1422;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          padding: 18px;
        }
        .wf-card-label {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #475569;
          margin-bottom: 8px;
        }
        .wf-card-value {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .wf-card-sub {
          font-size: 12px;
          color: #64748b;
          margin-top: 4px;
        }

        /* ── GANTT FORECAST ── */
        .gantt-section {
          background: #0d1422;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 22px;
          margin-bottom: 24px;
        }
        .gantt-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .gantt-title {
          font-size: 14px;
          font-weight: 800;
          letter-spacing: -0.2px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .gantt-total {
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .gantt-total-item {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .gantt-total-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
        }

        .gantt-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }
        .gantt-stage-name {
          font-size: 12px;
          font-weight: 600;
          width: 130px;
          flex-shrink: 0;
          color: #94a3b8;
        }
        .gantt-bar-wrap {
          flex: 1;
          position: relative;
          height: 28px;
          display: flex;
          align-items: center;
        }
        .gantt-bar-baseline {
          position: absolute;
          left: 0;
          height: 8px;
          border-radius: 4px;
          background: rgba(255,255,255,0.05);
          top: 50%;
          transform: translateY(-50%);
        }
        .gantt-bar-actual {
          position: absolute;
          left: 0;
          height: 18px;
          border-radius: 6px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          padding-left: 8px;
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          font-weight: 700;
          color: white;
          transition: width 0.8s ease;
          overflow: hidden;
          white-space: nowrap;
        }
        .gantt-days-label {
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          color: #64748b;
          width: 55px;
          text-align: right;
          flex-shrink: 0;
        }

        .bottleneck-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 4px;
          background: rgba(239,68,68,0.12);
          border: 1px solid rgba(239,68,68,0.25);
          font-family: var(--font-mono, monospace);
          font-size: 9px;
          color: #fca5a5;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-left: 4px;
          flex-shrink: 0;
        }

        .bottleneck-alert {
          margin-top: 16px;
          padding: 14px 16px;
          border-radius: 10px;
          background: rgba(239,68,68,0.06);
          border: 1px solid rgba(239,68,68,0.18);
        }
        .bottleneck-alert-title {
          font-size: 12px;
          font-weight: 700;
          color: #fca5a5;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .bottleneck-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .bottleneck-list li {
          font-size: 12px;
          color: #94a3b8;
          padding-left: 16px;
          position: relative;
        }
        .bottleneck-list li::before {
          content: '→';
          position: absolute;
          left: 0;
          color: #ef4444;
        }

        .gantt-toggle {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.08);
          color: #64748b;
          padding: 6px 12px;
          border-radius: 8px;
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .gantt-toggle:hover { border-color: rgba(255,255,255,0.2); color: #f1f5f9; }

        /* ── STEPPER ── */
        .stepper {
          display: flex;
          align-items: center;
          gap: 0;
          margin-bottom: 28px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          min-width: 100px;
          flex: 1;
          position: relative;
        }
        .step-item:not(:last-child)::after {
          content: '';
          position: absolute;
          top: 13px;
          left: calc(50% + 14px);
          right: calc(-50% + 14px);
          height: 2px;
          background: rgba(255,255,255,0.08);
        }
        .step-item.done:not(:last-child)::after { background: rgba(34,197,94,0.4); }
        .step-circle {
          width: 28px; height: 28px;
          border-radius: 50%;
          display: grid; place-items: center;
          font-size: 12px;
          border: 2px solid rgba(255,255,255,0.1);
          background: #080c14;
          font-family: var(--font-mono, monospace);
          font-weight: 700;
          z-index: 1;
          flex-shrink: 0;
        }
        .step-circle.done   { border-color: #22c55e; color: #22c55e; background: rgba(34,197,94,0.08); }
        .step-circle.active { border-color: #3b82f6; color: #3b82f6; background: rgba(59,130,246,0.08); }
        .step-circle.bottleneck { border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,0.08); }
        .step-circle.pending { border-color: rgba(255,255,255,0.08); color: #334155; }
        .step-label {
          font-size: 10px;
          font-family: var(--font-mono, monospace);
          text-align: center;
          color: #475569;
          line-height: 1.3;
        }
        .step-label.active { color: #93c5fd; }
        .step-label.done { color: #86efac; }
        .step-label.bottleneck { color: #fca5a5; }

        /* ── PEN HOLDER ── */
        .pen-section {
          background: #0d1422;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .pen-title {
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pen-form { display: flex; flex-direction: column; gap: 10px; }
        .pen-label {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }
        .pen-select, .pen-input {
          width: 100%;
          padding: 9px 12px;
          background: #080c14;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: #f1f5f9;
          font-family: var(--font-display, sans-serif);
          font-size: 13px;
          outline: none;
        }
        .pen-select:focus, .pen-input:focus { border-color: rgba(59,130,246,0.5); }
        .pen-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .pen-btn {
          padding: 9px 16px;
          background: #1d4ed8;
          color: white;
          border: none;
          border-radius: 8px;
          font-family: var(--font-display, sans-serif);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          align-self: flex-end;
        }
        .pen-btn:hover { background: #1e40af; }

        /* ── VERSION TABLE ── */
        .version-table {
          background: #0d1422;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          overflow: hidden;
        }
        .version-table-header {
          display: grid;
          grid-template-columns: 60px 1fr 140px 80px 80px;
          gap: 0;
          padding: 10px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          color: #334155;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .version-row {
          display: grid;
          grid-template-columns: 60px 1fr 140px 80px 80px;
          gap: 0;
          padding: 12px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          align-items: center;
          transition: background 0.1s;
        }
        .version-row:last-child { border-bottom: none; }
        .version-row:hover { background: rgba(255,255,255,0.02); }
        .version-tag {
          font-family: var(--font-mono, monospace);
          font-size: 12px;
          font-weight: 700;
          color: #3b82f6;
        }
        .version-note { font-size: 12px; color: #94a3b8; }
        .version-holder { font-size: 12px; color: #64748b; }
        .version-badge {
          display: inline-flex;
          padding: 2px 8px;
          border-radius: 4px;
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          font-weight: 700;
        }
        .latest-badge {
          margin-left: 6px;
          padding: 1px 6px;
          border-radius: 4px;
          background: rgba(59,130,246,0.15);
          color: #93c5fd;
          font-family: var(--font-mono, monospace);
          font-size: 9px;
          letter-spacing: 0.5px;
        }
      `}</style>

      {/* ── IMPACT CARDS ── */}
      <div className="wf-grid">
        <div className="wf-card">
          <div className="wf-card-label">Forecast: Days to Close</div>
          <div className="wf-card-value" style={{ color: totalEstimated > 60 ? "#ef4444" : totalEstimated > 30 ? "#f59e0b" : "#22c55e" }}>
            {totalEstimated} days
          </div>
          <div className="wf-card-sub">AI-forecast based on clause risk profile</div>
        </div>
        <div className="wf-card">
          <div className="wf-card-label">NPV Unlocked vs. Avg</div>
          <div className="wf-card-value" style={{ color: "#22c55e" }}>
            ${daysSaved > 0 ? `${(daysSaved * 0.8).toFixed(0)}M` : "0"}
          </div>
          <div className="wf-card-sub">vs. {100} day industry average ($800K/day)</div>
        </div>
        <div className="wf-card">
          <div className="wf-card-label">Currently Holds the Pen</div>
          <div className="wf-card-value" style={{ fontSize: 16, marginTop: 4 }}>{currentHolder}</div>
          <div className="wf-card-sub">Active negotiating party</div>
        </div>
        <div className="wf-card">
          <div className="wf-card-label">Contract File</div>
          <div className="wf-card-value" style={{ fontSize: 14, color: "#94a3b8", marginTop: 4, wordBreak: "break-all" }}>
            {filename}
          </div>
          <div className="wf-card-sub">{versions.length} version(s) logged</div>
        </div>
      </div>

      {/* ── GANTT FORECAST ── */}
      <div className="gantt-section">
        <div className="gantt-header">
          <div className="gantt-title">
            📊 Time-to-Close Forecast
            {bottleneckStages.length > 0 && (
              <span className="bottleneck-badge">⚠ {bottleneckStages.length} bottleneck{bottleneckStages.length > 1 ? "s" : ""}</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="gantt-total">
              <div className="gantt-total-item">
                <div className="gantt-total-dot" style={{ background: "#64748b" }} />
                <span>Baseline: {totalBaseline}d</span>
              </div>
              <div className="gantt-total-item">
                <div className="gantt-total-dot" style={{ background: totalEstimated > 60 ? "#ef4444" : "#3b82f6" }} />
                <span>Forecast: {totalEstimated}d</span>
              </div>
            </div>
            <button className="gantt-toggle" onClick={() => setShowGantt(!showGantt)}>
              {showGantt ? "▲ Hide" : "▼ Show"}
            </button>
          </div>
        </div>

        {showGantt && (
          <>
            {forecast.map((s) => {
              const pct = (s.estimatedDays / (maxBarDays * 1.2)) * 100;
              const basePct = (s.baseDays / (maxBarDays * 1.2)) * 100;
              const color = s.bottleneck ? "#ef4444" : getStageColor(s.stage, currentStage, s.bottleneck);
              const stIdx = STAGE_ORDER.indexOf(s.stage);
              const curIdx = STAGE_ORDER.indexOf(currentStage);
              const isDone = stIdx < curIdx;

              return (
                <div className="gantt-row" key={s.stage}>
                  <div className="gantt-stage-name" style={{ color: isDone ? "#22c55e" : stIdx === curIdx ? "#93c5fd" : undefined }}>
                    {isDone ? "✓ " : ""}{s.label}
                    {s.bottleneck && <span className="bottleneck-badge" style={{ marginLeft: 4 }}>bottleneck</span>}
                  </div>
                  <div className="gantt-bar-wrap">
                    {/* Baseline ghost bar */}
                    <div className="gantt-bar-baseline" style={{ width: `${basePct}%` }} />
                    {/* Actual forecast bar */}
                    <div className="gantt-bar-actual" style={{
                      width: `${pct}%`,
                      background: isDone
                        ? "rgba(34,197,94,0.4)"
                        : `linear-gradient(90deg, ${color}cc, ${color}88)`,
                      border: `1px solid ${color}44`,
                    }}>
                      {pct > 15 && `${s.estimatedDays}d`}
                    </div>
                  </div>
                  <div className="gantt-days-label" style={{ color: s.bottleneck ? "#ef4444" : undefined }}>
                    {s.estimatedDays}d
                  </div>
                </div>
              );
            })}

            {/* Bottleneck alerts */}
            {bottleneckStages.length > 0 && (
              <div className="bottleneck-alert">
                <div className="bottleneck-alert-title">
                  🔴 Bottleneck Forecast — These stages will cause delays
                </div>
                <ul className="bottleneck-list">
                  {bottleneckStages.map(s => (
                    <li key={s.stage}>
                      <strong>{s.label}</strong>: {s.bottleneckReason} (+{s.estimatedDays - s.baseDays} days over baseline)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── PROGRESS STEPPER ── */}
      <div style={{ marginBottom: 8, fontSize: 12, color: "#475569", fontFamily: "var(--font-mono, monospace)", letterSpacing: 1, textTransform: "uppercase" }}>
        Negotiation Stage
      </div>
      <div className="stepper">
        {STAGE_ORDER.map((s, i) => {
          const isBottleneck = forecast.find(f => f.stage === s)?.bottleneck && i >= stageIdx;
          const status = i < stageIdx ? "done" : i === stageIdx ? "active" : isBottleneck ? "bottleneck" : "pending";
          return (
            <div key={s} className={`step-item ${status}`}>
              <div className={`step-circle ${status}`}>
                {status === "done" ? "✓" : isBottleneck ? "⚠" : i + 1}
              </div>
              <div className={`step-label ${status}`}>{STAGE_LABELS[s]}</div>
            </div>
          );
        })}
      </div>

      {/* ── PEN HOLDER / UPDATE ── */}
      <div className="pen-section">
        <div className="pen-title">✏️ Update Negotiation Status</div>
        <div className="pen-form">
          <div className="pen-row">
            <div>
              <div className="pen-label">Who holds the pen?</div>
              <select className="pen-select" value={currentHolder} onChange={(e) => setCurrentHolder(e.target.value as Holder)}>
                <option>Sponsor (Regeneron)</option>
                <option>Site Legal</option>
                <option>IRB/Compliance</option>
                <option>Pending Review</option>
              </select>
            </div>
            <div>
              <div className="pen-label">Current Stage</div>
              <select className="pen-select" value={currentStage} onChange={(e) => setCurrentStage(e.target.value as Stage)}>
                {STAGE_ORDER.map((s) => (
                  <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <div className="pen-label">Note / Comment</div>
            <input className="pen-input" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Redlined indemnification clause, awaiting site feedback" />
          </div>
          <button className="pen-btn" onClick={addVersion}>+ Log Version</button>
        </div>
      </div>

      {/* ── VERSION HISTORY ── */}
      <div style={{ marginBottom: 10, fontSize: 12, color: "#475569", fontFamily: "var(--font-mono, monospace)", letterSpacing: 1, textTransform: "uppercase" }}>
        Version History
      </div>
      <div className="version-table">
        <div className="version-table-header">
          <span>Ver.</span><span>Note</span><span>Holder</span><span>Critical</span><span>Minor</span>
        </div>
        {[...versions].reverse().map((v, i) => (
          <div className="version-row" key={i}>
            <span className="version-tag">
              {v.version}
              {i === 0 && <span className="latest-badge">LATEST</span>}
            </span>
            <span className="version-note">{v.note}</span>
            <span className="version-holder">{v.holder}</span>
            <span>
              <span className="version-badge" style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5" }}>{v.critical}</span>
            </span>
            <span>
              <span className="version-badge" style={{ background: "rgba(245,158,11,0.12)", color: "#fcd34d" }}>{v.minor}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
