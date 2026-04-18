"use client";

import { useState, useRef, useCallback } from "react";
import RedlineViewer from "@/app/components/RedlineViewer";
import ChatBox from "@/app/components/ChatBox";
import WorkflowTracker from "@/app/components/WorkflowTracker";
import SitePersona from "@/app/components/SitePersona";
import ConflictDetector from "@/app/components/ConflictDetector";
import jsPDF from "jspdf";

// 5 tabs now: redlines | chat | workflow | personas | conflicts
type Tab = "redlines" | "chat" | "workflow" | "personas" | "conflicts";

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [contractText, setContractText] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("redlines");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setError(null);
  }, []);

  const uploadFile = async () => {
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("http://127.0.0.1:8000/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error(await uploadRes.text());
      const uploadData = await uploadRes.json();

      let text = uploadData.text_preview || "";
      if (file.name.endsWith(".txt") && !text) {
        text = await file.text();
      }
      setContractText(text);

      const analyzeRes = await fetch("http://127.0.0.1:8000/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: uploadData?.filename || file.name,
          text: uploadData.text_preview || text,
        }),
      });

      if (!analyzeRes.ok) throw new Error(await analyzeRes.text());
      const analyzeData = await analyzeRes.json();
      setResult(analyzeData);
      setActiveTab("redlines");
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("ACTA AI — Legal Contract Report", 20, 25);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 35);
    doc.setFontSize(14);
    doc.text("Risk Summary", 20, 50);
    doc.setFontSize(11);
    doc.text(`Risk Level: ${result?.metrics?.risk_level ?? "N/A"}`, 20, 60);
    doc.text(`Critical Issues: ${result?.metrics?.critical ?? 0}`, 20, 68);
    doc.text(`Minor Issues: ${result?.metrics?.minor ?? 0}`, 20, 76);
    doc.text(`Aligned Clauses: ${result?.metrics?.aligned ?? 0}`, 20, 84);
    doc.text(`Recommendation: ${result?.metrics?.recommendation ?? ""}`, 20, 95, { maxWidth: 170 });
    doc.save("ACTA_AI_Report.pdf");
  };

  const critical = result?.metrics?.critical ?? 0;
  const minor = result?.metrics?.minor ?? 0;
  const aligned = result?.metrics?.aligned ?? 0;
  const total = critical + minor + aligned;
  const riskLevel = result?.metrics?.risk_level ?? "—";
  const riskScore = critical >= 3 ? 88 : critical >= 1 ? 64 : aligned > 0 ? 22 : 0;

  const riskColor =
    riskLevel === "HIGH" ? "#ef4444" :
    riskLevel === "MEDIUM" ? "#f59e0b" :
    riskLevel === "LOW" ? "#22c55e" : "#64748b";

  return (
    <div className="app-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #080c14;
          --surface: #0d1422;
          --surface2: #111827;
          --border: rgba(255,255,255,0.06);
          --border-hover: rgba(255,255,255,0.14);
          --text: #f1f5f9;
          --muted: #64748b;
          --accent: #3b82f6;
          --accent-glow: rgba(59,130,246,0.18);
          --critical: #ef4444;
          --minor: #f59e0b;
          --aligned: #22c55e;
          --font-display: 'Syne', sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
        }

        body { background: var(--bg); color: var(--text); font-family: var(--font-display); }

        .app-shell {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 280px 1fr;
          grid-template-rows: auto 1fr;
        }

        /* ── TOPBAR ── */
        .topbar {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          height: 64px;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .logo-icon {
          width: 32px; height: 32px;
          background: var(--accent);
          border-radius: 8px;
          display: grid; place-items: center;
          font-size: 16px;
        }
        .logo-tag {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 400;
          color: var(--muted);
          letter-spacing: 1px;
          margin-left: 4px;
          text-transform: uppercase;
        }
        .topbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .status-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 20px;
          border: 1px solid var(--border);
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--muted);
        }
        .status-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--aligned);
          animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

        /* ── SIDEBAR ── */
        .sidebar {
          background: var(--surface);
          border-right: 1px solid var(--border);
          padding: 28px 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow-y: auto;
        }
        .sidebar-section-label {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--muted);
          letter-spacing: 1.5px;
          text-transform: uppercase;
          padding: 0 8px;
          margin-top: 8px;
          margin-bottom: 4px;
        }

        /* Drop Zone */
        .drop-zone {
          border: 1.5px dashed var(--border-hover);
          border-radius: 12px;
          padding: 24px 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: transparent;
          margin-bottom: 8px;
        }
        .drop-zone:hover, .drop-zone.active {
          border-color: var(--accent);
          background: var(--accent-glow);
        }
        .drop-zone-icon { font-size: 28px; margin-bottom: 8px; }
        .drop-zone-label {
          font-size: 12px;
          color: var(--muted);
          line-height: 1.5;
        }
        .drop-zone-label strong {
          color: var(--accent);
          display: block;
          font-size: 13px;
          margin-bottom: 3px;
        }

        .file-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 8px;
          background: var(--surface2);
          border: 1px solid var(--border);
          font-size: 12px;
          font-family: var(--font-mono);
          color: var(--muted);
          overflow: hidden;
        }
        .file-badge-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--text);
        }

        .btn-primary {
          width: 100%;
          padding: 11px;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: 8px;
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          letter-spacing: 0.3px;
        }
        .btn-primary:hover:not(:disabled) { background: #2563eb; transform: translateY(-1px); }
        .btn-primary:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

        .btn-ghost {
          width: 100%;
          padding: 9px;
          background: transparent;
          color: var(--muted);
          border: 1px solid var(--border);
          border-radius: 8px;
          font-family: var(--font-display);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-ghost:hover:not(:disabled) { border-color: var(--border-hover); color: var(--text); }
        .btn-ghost:disabled { opacity: 0.3; cursor: not-allowed; }

        .metric-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-radius: 8px;
          background: var(--surface2);
          border: 1px solid var(--border);
        }
        .metric-label {
          font-size: 12px;
          color: var(--muted);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .metric-dot { width: 7px; height: 7px; border-radius: 50%; }
        .metric-val { font-family: var(--font-mono); font-size: 13px; font-weight: 600; }

        .risk-gauge {
          padding: 16px;
          border-radius: 12px;
          background: var(--surface2);
          border: 1px solid var(--border);
          text-align: center;
        }
        .risk-score-big {
          font-size: 42px;
          font-weight: 800;
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }
        .risk-label {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-top: 4px;
          color: var(--muted);
        }
        .risk-bar-wrap {
          height: 4px;
          background: rgba(255,255,255,0.07);
          border-radius: 4px;
          margin-top: 12px;
          overflow: hidden;
        }
        .risk-bar-fill { height: 100%; border-radius: 4px; transition: width 1s ease; }

        /* ── MAIN ── */
        .main { display: flex; flex-direction: column; overflow: hidden; }

        /* Hero */
        .hero {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 60px;
          text-align: center;
        }
        .hero-icon { font-size: 56px; filter: drop-shadow(0 0 30px rgba(59,130,246,0.4)); }
        .hero-title { font-size: 36px; font-weight: 800; letter-spacing: -1px; line-height: 1.1; }
        .hero-title span { color: var(--accent); }
        .hero-sub { font-size: 15px; color: var(--muted); max-width: 480px; line-height: 1.7; font-weight: 400; }
        .hero-tags { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 8px; }
        .hero-tag {
          padding: 5px 12px;
          border-radius: 20px;
          border: 1px solid var(--border);
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--muted);
        }

        /* Tab bar */
        .tab-bar {
          display: flex;
          gap: 2px;
          padding: 12px 28px 0;
          border-bottom: 1px solid var(--border);
          overflow-x: auto;
        }
        .tab-btn {
          padding: 9px 16px;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          font-family: var(--font-display);
          font-size: 12px;
          font-weight: 600;
          color: var(--muted);
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: -1px;
          white-space: nowrap;
        }
        .tab-btn:hover { color: var(--text); }
        .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
        .tab-badge {
          padding: 2px 7px;
          border-radius: 10px;
          background: rgba(239,68,68,0.15);
          color: #ef4444;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 600;
        }
        .tab-badge.minor  { background: rgba(245,158,11,0.15);  color: #f59e0b; }
        .tab-badge.ok     { background: rgba(34,197,94,0.12);   color: #22c55e; }
        .tab-badge.purple { background: rgba(139,92,246,0.12);  color: #a78bfa; }
        .tab-badge.blue   { background: rgba(59,130,246,0.12);  color: #93c5fd; }

        /* Tab content */
        .tab-content { flex: 1; overflow-y: auto; padding: 28px; }

        /* Loading */
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 60px;
          flex: 1;
        }
        .loading-spinner {
          width: 44px; height: 44px;
          border: 3px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-steps { display: flex; flex-direction: column; gap: 8px; text-align: center; }
        .loading-step {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--muted);
          animation: fadeStep 0.5s ease forwards;
          opacity: 0;
        }
        .loading-step:nth-child(1) { animation-delay: 0.1s; }
        .loading-step:nth-child(2) { animation-delay: 0.6s; }
        .loading-step:nth-child(3) { animation-delay: 1.2s; }
        @keyframes fadeStep { to { opacity: 1; } }

        .error-box {
          margin: 28px;
          padding: 16px 20px;
          border-radius: 10px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.25);
          color: #fca5a5;
          font-size: 13px;
          font-family: var(--font-mono);
        }

        /* Rec banner */
        .rec-banner {
          padding: 14px 20px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--surface2);
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .rec-text { font-size: 13px; color: var(--muted); line-height: 1.5; }
        .rec-text strong { color: var(--text); }

        @media (max-width: 768px) {
          .app-shell { grid-template-columns: 1fr; }
          .sidebar { display: none; }
        }
      `}</style>

      {/* ── TOPBAR ── */}
      <header className="topbar">
        <div className="logo">
          <div className="logo-icon">⚖️</div>
          ACTA AI
          <span className="logo-tag">Clinical Trial Intelligence</span>
        </div>
        <div className="topbar-right">
          <div className="status-pill">
            <span className="status-dot" />
            Gemini 2.0 · K2 Legal · Claude Sonnet
          </div>
        </div>
      </header>

      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-section-label">Upload Contract</div>

        <div
          className={`drop-zone ${dragOver ? "active" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
        >
          <div className="drop-zone-icon">📄</div>
          <div className="drop-zone-label">
            <strong>Drop CTA file here</strong>
            PDF, DOCX, or TXT
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>

        {file && (
          <div className="file-badge">
            <span>📎</span>
            <span className="file-badge-name">{file.name}</span>
            <span style={{ color: "#22c55e", fontSize: 10 }}>✓</span>
          </div>
        )}

        <button className="btn-primary" onClick={uploadFile} disabled={!file || loading}>
          {loading ? (
            <><span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} /> Analyzing…</>
          ) : "Analyze Contract"}
        </button>

        <button className="btn-ghost" onClick={downloadPDF} disabled={!result}>
          📄 Download PDF Report
        </button>

        {result && (
          <>
            <div className="sidebar-section-label" style={{ marginTop: 16 }}>Risk Score</div>
            <div className="risk-gauge">
              <div className="risk-score-big" style={{ color: riskColor }}>{riskScore}</div>
              <div className="risk-label">/ 100 — {riskLevel} Risk</div>
              <div className="risk-bar-wrap">
                <div className="risk-bar-fill" style={{ width: `${riskScore}%`, background: riskColor }} />
              </div>
            </div>

            <div className="sidebar-section-label" style={{ marginTop: 8 }}>Clause Breakdown</div>
            <div className="metric-row">
              <div className="metric-label"><div className="metric-dot" style={{ background: "var(--critical)" }} />Critical</div>
              <div className="metric-val" style={{ color: "var(--critical)" }}>{critical}</div>
            </div>
            <div className="metric-row">
              <div className="metric-label"><div className="metric-dot" style={{ background: "var(--minor)" }} />Minor</div>
              <div className="metric-val" style={{ color: "var(--minor)" }}>{minor}</div>
            </div>
            <div className="metric-row">
              <div className="metric-label"><div className="metric-dot" style={{ background: "var(--aligned)" }} />Aligned</div>
              <div className="metric-val" style={{ color: "var(--aligned)" }}>{aligned}</div>
            </div>
            <div className="metric-row">
              <div className="metric-label" style={{ color: "var(--muted)" }}>Total Clauses</div>
              <div className="metric-val">{total}</div>
            </div>
          </>
        )}
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="main">

        {/* Empty state */}
        {!loading && !result && !error && (
          <div className="hero">
            <div className="hero-icon">⚖️</div>
            <h1 className="hero-title">
              Clinical Trial Contract<br /><span>Intelligence</span>
            </h1>
            <p className="hero-sub">
              Upload a Clinical Trial Agreement for AI-powered ACTA compliance analysis,
              automated redlines, site persona prediction, and multi-contract conflict detection.
            </p>
            <div className="hero-tags">
              <span className="hero-tag">ACTA Compliance</span>
              <span className="hero-tag">Auto Redlines</span>
              <span className="hero-tag">⚡ One-Click ACTA Reset</span>
              <span className="hero-tag">🎯 Site Personas</span>
              <span className="hero-tag">🔍 Conflict Detector</span>
              <span className="hero-tag">📊 Time-to-Close Forecast</span>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner" />
            <div className="loading-steps">
              <div className="loading-step">📄 Parsing document structure…</div>
              <div className="loading-step">⚖️ Comparing against ACTA baseline…</div>
              <div className="loading-step">🔴 Generating AI redlines & predictions…</div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && <div className="error-box">❌ {error}</div>}

        {/* Results */}
        {result && !loading && (
          <>
            <div className="tab-bar">
              {/* Tab 1 — Redlines */}
              <button className={`tab-btn ${activeTab === "redlines" ? "active" : ""}`} onClick={() => setActiveTab("redlines")}>
                🔴 Redlines
                {critical > 0 && <span className="tab-badge">{critical} critical</span>}
                {minor > 0 && <span className="tab-badge minor">{minor} minor</span>}
              </button>

              {/* Tab 2 — Chat */}
              <button className={`tab-btn ${activeTab === "chat" ? "active" : ""}`} onClick={() => setActiveTab("chat")}>
                💬 AI Chat
              </button>

              {/* Tab 3 — Workflow */}
              <button className={`tab-btn ${activeTab === "workflow" ? "active" : ""}`} onClick={() => setActiveTab("workflow")}>
                📊 Workflow
                <span className="tab-badge ok">Forecast</span>
              </button>

              {/* Tab 4 — NEW: Site Personas */}
              <button className={`tab-btn ${activeTab === "personas" ? "active" : ""}`} onClick={() => setActiveTab("personas")}>
                🎯 Site Personas
                <span className="tab-badge purple">Predictive</span>
              </button>

              {/* Tab 5 — NEW: Conflict Detector */}
              <button className={`tab-btn ${activeTab === "conflicts" ? "active" : ""}`} onClick={() => setActiveTab("conflicts")}>
                🔍 Conflicts
                <span className="tab-badge blue">Multi-Contract</span>
              </button>
            </div>

            <div className="tab-content">

              {/* Redlines tab */}
              {activeTab === "redlines" && (
                <>
                  <div className="rec-banner">
                    <div className="rec-text">
                      <strong>Recommendation: </strong>{result?.metrics?.recommendation}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {total} clauses analyzed
                    </div>
                  </div>
                  <RedlineViewer redlines={result.clauses ?? {}} />
                </>
              )}

              {/* Chat tab */}
              {activeTab === "chat" && (
                <ChatBox context={contractText || JSON.stringify(result.clauses ?? {})} />
              )}

              {/* Workflow + Gantt tab */}
              {activeTab === "workflow" && (
                <WorkflowTracker filename={result.filename} metrics={result.metrics} />
              )}

              {/* Site Persona tab — NEW */}
              {activeTab === "personas" && (
                <SitePersona clauses={result.clauses ?? {}} />
              )}

              {/* Conflict Detector tab — NEW */}
              {activeTab === "conflicts" && (
                <ConflictDetector
                  currentContract={{
                    filename: result.filename,
                    clauses: result.clauses ?? {},
                  }}
                />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}