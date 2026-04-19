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
  "site-review": "Site Legal",
  "irb": "IRB / Compliance",
  "executed": "Executed",
};

const STAGE_ORDER: Stage[] = ["draft", "sponsor-review", "site-review", "irb", "executed"];

interface StageEstimate {
  stage: Stage;
  label: string;
  baseDays: number;
  estimatedDays: number;
  bottleneck: boolean;
  bottleneckReason?: string;
}

function buildForecast(critical: number, minor: number): StageEstimate[] {
  return [
    { stage: "draft", label: "Initial Draft", baseDays: 3, estimatedDays: 3, bottleneck: false },
    { stage: "sponsor-review", label: "Sponsor Review", baseDays: 7, estimatedDays: Math.round(7 + critical * 4 + minor * 1.5), bottleneck: critical >= 2, bottleneckReason: critical >= 2 ? `${critical} critical clauses require senior legal escalation` : undefined },
    { stage: "site-review", label: "Site Legal Review", baseDays: 21, estimatedDays: Math.round(21 + critical * 8 + minor * 3), bottleneck: critical >= 3, bottleneckReason: critical >= 3 ? "High critical count — expect 3+ redline rounds" : undefined },
    { stage: "irb", label: "IRB / Compliance", baseDays: 14, estimatedDays: Math.round(14 + (critical > 0 ? 7 : 0)), bottleneck: false },
    { stage: "executed", label: "Final Execution", baseDays: 3, estimatedDays: 3, bottleneck: false },
  ];
}

export default function WorkflowTracker({ filename, metrics }: Props) {
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const [versions, setVersions] = useState<VersionEntry[]>([{
    version: "v1.0", date: today, holder: "Sponsor (Regeneron)", stage: "draft",
    note: "Initial upload — AI analysis complete", critical: metrics.critical, minor: metrics.minor,
  }]);
  const [currentHolder, setCurrentHolder] = useState<Holder>("Sponsor (Regeneron)");
  const [note, setNote] = useState("");
  const [currentStage, setCurrentStage] = useState<Stage>("draft");
  const [showGantt, setShowGantt] = useState(true);

  const forecast = buildForecast(metrics.critical, metrics.minor);
  const totalEstimated = forecast.reduce((sum, s) => sum + s.estimatedDays, 0);
  const totalBaseline = forecast.reduce((sum, s) => sum + s.baseDays, 0);
  const daysSaved = 100 - totalEstimated;
  const maxBarDays = Math.max(...forecast.map(s => s.estimatedDays));
  const bottleneckStages = forecast.filter(s => s.bottleneck);
  const stageIdx = STAGE_ORDER.indexOf(currentStage);

  const addVersion = () => {
    setVersions((prev) => [...prev, {
      version: `v${(prev.length + 1).toFixed(1)}`,
      date: today, holder: currentHolder, stage: currentStage,
      note: note || "Version updated", critical: metrics.critical, minor: metrics.minor,
    }]);
    setNote("");
  };

  const forecastColor = totalEstimated > 60 ? "#b85450" : totalEstimated > 30 ? "#c9974a" : "#6a9e78";

  return (
    <div>
      <style>{`
        .wf-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 24px;
        }
        @media (max-width: 640px) { .wf-grid { grid-template-columns: 1fr; } }
        .wf-card {
          background: #f0efdf;
          border: 1px solid rgba(90,110,90,0.12);
          border-radius: 12px;
          padding: 18px;
        }
        .wf-card-label {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #7a9088;
          margin-bottom: 8px;
        }
        .wf-card-value { font-size: 24px; font-weight: 600; letter-spacing: -0.5px; }
        .wf-card-sub { font-size: 11px; color: #7a9088; margin-top: 4px; font-family: 'DM Mono', monospace; }

        .gantt-section {
          background: #f0efdf;
          border: 1px solid rgba(90,110,90,0.12);
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
          font-size: 13px;
          font-weight: 500;
          color: #2d3d38;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .bottleneck-pill {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          padding: 2px 8px;
          border-radius: 4px;
          background: rgba(184,84,80,0.1);
          border: 1px solid rgba(184,84,80,0.2);
          color: #b85450;
          letter-spacing: 0.5px;
        }
        .gantt-totals {
          display: flex;
          gap: 16px;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: #7a9088;
          align-items: center;
        }
        .gantt-toggle {
          background: transparent;
          border: 1px solid rgba(90,110,90,0.15);
          color: #7a9088;
          padding: 5px 12px;
          border-radius: 8px;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          cursor: pointer;
          transition: all 0.15s;
          margin-left: 8px;
        }
        .gantt-toggle:hover { border-color: rgba(90,110,90,0.3); color: #2d3d38; }

        .gantt-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .gantt-stage-name {
          font-size: 12px;
          font-weight: 400;
          width: 130px;
          flex-shrink: 0;
          color: #7a9088;
        }
        .gantt-bar-wrap {
          flex: 1;
          position: relative;
          height: 28px;
          display: flex;
          align-items: center;
        }
        .gantt-bar-ghost {
          position: absolute; left: 0;
          height: 6px; border-radius: 4px;
          background: rgba(90,110,90,0.08);
          top: 50%; transform: translateY(-50%);
        }
        .gantt-bar-actual {
          position: absolute; left: 0;
          height: 16px; border-radius: 6px;
          top: 50%; transform: translateY(-50%);
          display: flex; align-items: center;
          padding-left: 8px;
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: white;
          transition: width 0.8s ease;
          overflow: hidden; white-space: nowrap;
        }
        .gantt-days { font-family: 'DM Mono', monospace; font-size: 11px; color: #7a9088; width: 40px; text-align: right; flex-shrink: 0; }

        .bottleneck-alert {
          margin-top: 14px;
          padding: 14px 16px;
          border-radius: 10px;
          background: rgba(184,84,80,0.04);
          border: 1px solid rgba(184,84,80,0.15);
        }
        .bottleneck-alert-title {
          font-size: 12px;
          font-weight: 500;
          color: #b85450;
          margin-bottom: 6px;
        }
        .bottleneck-list { list-style: none; display: flex; flex-direction: column; gap: 4px; }
        .bottleneck-list li {
          font-size: 12px; color: #7a9088;
          padding-left: 14px; position: relative;
        }
        .bottleneck-list li::before { content: '→'; position: absolute; left: 0; color: #b85450; }

        .stepper {
          display: flex;
          align-items: center;
          margin-bottom: 24px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .step-item {
          display: flex; flex-direction: column; align-items: center;
          gap: 6px; min-width: 90px; flex: 1; position: relative;
        }
        .step-item:not(:last-child)::after {
          content: ''; position: absolute; top: 13px;
          left: calc(50% + 14px); right: calc(-50% + 14px);
          height: 1px; background: rgba(90,110,90,0.15);
        }
        .step-item.done:not(:last-child)::after { background: rgba(106,158,120,0.4); }
        .step-circle {
          width: 28px; height: 28px; border-radius: 50%;
          display: grid; place-items: center;
          font-size: 11px; border: 1.5px solid rgba(90,110,90,0.2);
          background: #fafaf4;
          font-family: 'DM Mono', monospace;
          font-weight: 500; z-index: 1; flex-shrink: 0; color: #b0bfba;
        }
        .step-circle.done { border-color: #6a9e78; color: #6a9e78; background: rgba(106,158,120,0.08); }
        .step-circle.active { border-color: #4a7a5a; color: #4a7a5a; background: rgba(74,122,90,0.08); }
        .step-circle.bottleneck { border-color: #b85450; color: #b85450; background: rgba(184,84,80,0.06); }
        .step-label { font-size: 10px; font-family: 'DM Mono', monospace; text-align: center; color: #b0bfba; line-height: 1.3; }
        .step-label.active { color: #4a7a5a; }
        .step-label.done { color: #6a9e78; }
        .step-label.bottleneck { color: #b85450; }

        .pen-section {
          background: #f0efdf;
          border: 1px solid rgba(90,110,90,0.12);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .pen-title { font-size: 13px; font-weight: 500; color: #2d3d38; margin-bottom: 14px; }
        .pen-label {
          font-family: 'DM Mono', monospace; font-size: 10px;
          color: #7a9088; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;
        }
        .pen-select, .pen-input {
          width: 100%; padding: 9px 12px;
          background: #fafaf4;
          border: 1px solid rgba(90,110,90,0.18);
          border-radius: 8px; color: #2d3d38;
          font-family: 'DM Sans', sans-serif; font-size: 13px; outline: none;
        }
        .pen-select:focus, .pen-input:focus { border-color: rgba(74,122,90,0.4); }
        .pen-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        .pen-btn {
          padding: 9px 16px; background: #4a7a5a; color: white; border: none;
          border-radius: 8px; font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s;
        }
        .pen-btn:hover { background: #3d6a70; }

        .section-label-sm {
          font-family: 'DM Mono', monospace; font-size: 10px;
          color: #b0bfba; letter-spacing: 1.5px; text-transform: uppercase;
          margin-bottom: 10px;
        }
        .version-table {
          background: #f0efdf;
          border: 1px solid rgba(90,110,90,0.12);
          border-radius: 12px; overflow: hidden;
        }
        .version-header {
          display: grid;
          grid-template-columns: 60px 1fr 150px 70px 70px;
          padding: 10px 18px;
          border-bottom: 1px solid rgba(90,110,90,0.1);
          font-family: 'DM Mono', monospace;
          font-size: 10px; color: #b0bfba;
          letter-spacing: 1px; text-transform: uppercase;
        }
        .version-row {
          display: grid;
          grid-template-columns: 60px 1fr 150px 70px 70px;
          padding: 12px 18px;
          border-bottom: 1px solid rgba(90,110,90,0.06);
          align-items: center;
          transition: background 0.1s;
        }
        .version-row:last-child { border-bottom: none; }
        .version-row:hover { background: rgba(90,110,90,0.04); }
        .version-tag { font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 500; color: #4a7a5a; }
        .version-note { font-size: 12px; color: #7a9088; }
        .version-holder { font-size: 12px; color: #b0bfba; }
        .version-badge { display: inline-flex; padding: 2px 8px; border-radius: 4px; font-family: 'DM Mono', monospace; font-size: 10px; }
        .latest-tag {
          margin-left: 6px; padding: 1px 6px; border-radius: 4px;
          background: rgba(74,122,90,0.1); color: #4a7a5a;
          font-family: 'DM Mono', monospace; font-size: 9px;
        }
      `}</style>

      {/* Impact cards */}
      <div className="wf-grid">
        <div className="wf-card">
          <div className="wf-card-label">Forecast: Days to Close</div>
          <div className="wf-card-value" style={{ color: forecastColor }}>{totalEstimated} days</div>
          <div className="wf-card-sub">AI-forecast based on clause risk profile</div>
        </div>
        <div className="wf-card">
          <div className="wf-card-label">NPV Unlocked vs. Avg</div>
          <div className="wf-card-value" style={{ color: "#6a9e78" }}>
            ${daysSaved > 0 ? `${(daysSaved * 0.8).toFixed(0)}M` : "0"}
          </div>
          <div className="wf-card-sub">vs. 100-day industry average at $800K/day</div>
        </div>
        <div className="wf-card">
          <div className="wf-card-label">Currently holds the pen</div>
          <div className="wf-card-value" style={{ fontSize: 15, marginTop: 4, color: "#2d3d38" }}>{currentHolder}</div>
          <div className="wf-card-sub">Active negotiating party</div>
        </div>
        <div className="wf-card">
          <div className="wf-card-label">Contract file</div>
          <div className="wf-card-value" style={{ fontSize: 13, color: "#7a9088", marginTop: 4, wordBreak: "break-all", fontWeight: 400 }}>
            {filename}
          </div>
          <div className="wf-card-sub">{versions.length} version(s) logged</div>
        </div>
      </div>

      {/* Gantt */}
      <div className="gantt-section">
        <div className="gantt-header">
          <div className="gantt-title">
            Time-to-close forecast
            {bottleneckStages.length > 0 && (
              <span className="bottleneck-pill">{bottleneckStages.length} bottleneck{bottleneckStages.length > 1 ? "s" : ""}</span>
            )}
          </div>
          <div className="gantt-totals">
            <span>Baseline: {totalBaseline}d</span>
            <span style={{ color: forecastColor }}>Forecast: {totalEstimated}d</span>
            <button className="gantt-toggle" onClick={() => setShowGantt(!showGantt)}>
              {showGantt ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {showGantt && (
          <>
            {forecast.map((s) => {
              const pct = (s.estimatedDays / (maxBarDays * 1.2)) * 100;
              const basePct = (s.baseDays / (maxBarDays * 1.2)) * 100;
              const stIdx = STAGE_ORDER.indexOf(s.stage);
              const curIdx = STAGE_ORDER.indexOf(currentStage);
              const isDone = stIdx < curIdx;
              const barColor = s.bottleneck ? "#b85450" : isDone ? "#6a9e78" : stIdx === curIdx ? "#4a7a5a" : "#8ab89a";
              return (
                <div className="gantt-row" key={s.stage}>
                  <div className="gantt-stage-name" style={{ color: isDone ? "#6a9e78" : stIdx === curIdx ? "#4a7a5a" : undefined }}>
                    {isDone ? "✓ " : ""}{s.label}
                    {s.bottleneck && <span className="bottleneck-pill" style={{ marginLeft: 4 }}>bottleneck</span>}
                  </div>
                  <div className="gantt-bar-wrap">
                    <div className="gantt-bar-ghost" style={{ width: `${basePct}%` }} />
                    <div className="gantt-bar-actual" style={{ width: `${pct}%`, background: barColor, opacity: isDone ? 0.6 : 1 }}>
                      {pct > 15 && `${s.estimatedDays}d`}
                    </div>
                  </div>
                  <div className="gantt-days" style={{ color: s.bottleneck ? "#b85450" : undefined }}>{s.estimatedDays}d</div>
                </div>
              );
            })}
            {bottleneckStages.length > 0 && (
              <div className="bottleneck-alert">
                <div className="bottleneck-alert-title">Bottleneck forecast — these stages will cause delays</div>
                <ul className="bottleneck-list">
                  {bottleneckStages.map(s => (
                    <li key={s.stage}><strong>{s.label}</strong>: {s.bottleneckReason} (+{s.estimatedDays - s.baseDays} days over baseline)</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* Stepper */}
      <div className="section-label-sm">Negotiation stage</div>
      <div className="stepper">
        {STAGE_ORDER.map((s, i) => {
          const isBottleneck = forecast.find(f => f.stage === s)?.bottleneck && i >= stageIdx;
          const status = i < stageIdx ? "done" : i === stageIdx ? "active" : isBottleneck ? "bottleneck" : "pending";
          return (
            <div key={s} className={`step-item ${status}`}>
              <div className={`step-circle ${status}`}>{status === "done" ? "✓" : i + 1}</div>
              <div className={`step-label ${status}`}>{STAGE_LABELS[s]}</div>
            </div>
          );
        })}
      </div>

      {/* Pen holder */}
      <div className="pen-section">
        <div className="pen-title">Update negotiation status</div>
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
            <div className="pen-label">Current stage</div>
            <select className="pen-select" value={currentStage} onChange={(e) => setCurrentStage(e.target.value as Stage)}>
              {STAGE_ORDER.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div className="pen-label">Note</div>
          <input className="pen-input" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Redlined indemnification clause, awaiting site feedback" />
        </div>
        <button className="pen-btn" onClick={addVersion}>Log version</button>
      </div>

      {/* Version history */}
      <div className="section-label-sm">Version history</div>
      <div className="version-table">
        <div className="version-header">
          <span>Ver.</span><span>Note</span><span>Holder</span><span>Critical</span><span>Minor</span>
        </div>
        {[...versions].reverse().map((v, i) => (
          <div className="version-row" key={i}>
            <span className="version-tag">
              {v.version}
              {i === 0 && <span className="latest-tag">latest</span>}
            </span>
            <span className="version-note">{v.note}</span>
            <span className="version-holder">{v.holder}</span>
            <span><span className="version-badge" style={{ background: "rgba(184,84,80,0.08)", color: "#b85450" }}>{v.critical}</span></span>
            <span><span className="version-badge" style={{ background: "rgba(201,151,74,0.08)", color: "#c9974a" }}>{v.minor}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}