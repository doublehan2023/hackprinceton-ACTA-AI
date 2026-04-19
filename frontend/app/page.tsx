"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import RedlineViewer from "@/app/components/RedlineViewer";
import ChatBox from "@/app/components/ChatBox";
import WorkflowTracker from "@/app/components/WorkflowTracker";
import SitePersona from "@/app/components/SitePersona";
import DocumentViewer from "@/app/components/DocumentViewer";
import { analyzeContractFile, type AnalysisResult } from "@/lib/api";
import jsPDF from "jspdf";

type Tab = "document" | "redlines" | "chat" | "workflow" | "personas";

/* ─── Petal particle ──────────────────────────────────────────────────── */
interface Petal {
  id: number;
  x: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
  rotation: number;
  opacity: number;
}

function usePetals(count = 18) {
  const [petals, setPetals] = useState<Petal[]>([]);
  useEffect(() => {
    setPetals(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        size: 4 + Math.random() * 6,
        delay: Math.random() * 14,
        duration: 14 + Math.random() * 12,
        drift: (Math.random() - 0.5) * 120,
        rotation: Math.random() * 360,
        opacity: 0.35 + Math.random() * 0.35,
      }))
    );
  }, []);
  return petals;
}

export default function HomePage() {
  const [file, setFile]                 = useState<File | null>(null);
  const [contractText, setContractText] = useState<string>("");
  const [result, setResult]             = useState<AnalysisResult | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [activeTab, setActiveTab]       = useState<Tab>("document");
  const [dragOver, setDragOver]         = useState(false);
  const [jumpClause, setJumpClause]     = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const petals = usePetals(22);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setError(null);
    setContractText("");
  }, []);

  const uploadFile = async () => {
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { upload, analysis } = await analyzeContractFile(file);
      const fullText = upload.full_text || upload.text_preview || "";
      if (!fullText || fullText.trim().length < 20) {
        throw new Error("Could not extract readable text from this file. Ensure it's a text-based PDF, DOCX, or TXT.");
      }
      setContractText(fullText);
      setResult({
        ...analysis,
        filename: upload.filename || analysis.filename,
      });
      setActiveTab("document");
    } catch (err: any) {
      if (err.message?.includes("Failed to fetch")) {
        setError("Cannot reach the backend server. Please ensure the Python API is running on port 8000.");
      } else {
        setError(err?.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClauseClick = useCallback((clauseKey: string) => {
    setJumpClause(clauseKey);
    setActiveTab("redlines");
    setTimeout(() => setJumpClause(null), 1200);
  }, []);

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
    doc.text(`Risk Score: ${result?.metrics?.risk_score ?? 0} / 100`, 20, 60);
    doc.text(`Risk Level: ${result?.metrics?.risk_level ?? "N/A"}`, 20, 68);
    doc.text(`Critical Issues: ${result?.metrics?.critical ?? 0}`, 20, 76);
    doc.text(`Minor Issues: ${result?.metrics?.minor ?? 0}`, 20, 84);
    doc.text(`Aligned Clauses: ${result?.metrics?.aligned ?? 0}`, 20, 92);
    doc.text(`Recommendation: ${result?.metrics?.recommendation ?? ""}`, 20, 103, { maxWidth: 170 });
    let y = 120;
    doc.setFontSize(14);
    doc.text("Clause Analysis", 20, y); y += 12;
    doc.setFontSize(10);
    Object.entries(result.clauses ?? {}).forEach(([name, clause]: any) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold");
      doc.text(`${name} [${clause.deviation?.toUpperCase()}]`, 20, y, { maxWidth: 170 }); y += 7;
      doc.setFont("helvetica", "normal");
      if (clause.risk_reason) { doc.text(clause.risk_reason, 20, y, { maxWidth: 170 }); y += 10; }
      y += 3;
    });
    doc.save("ACTA_AI_Report.pdf");
  };

  const critical  = result?.metrics?.critical  ?? 0;
  const minor     = result?.metrics?.minor     ?? 0;
  const aligned   = result?.metrics?.aligned   ?? 0;
  const total     = critical + minor + aligned;
  const riskLevel = result?.metrics?.risk_level ?? "—";
  const riskScore = result?.metrics?.risk_score ?? 0;

  const riskColor =
    riskLevel === "CRITICAL" ? "#b85450" :
    riskLevel === "HIGH"     ? "#c9794a" :
    riskLevel === "MEDIUM"   ? "#c9974a" :
    riskLevel === "LOW"      ? "#6a9e78" : "#8fa89c";

  return (
    <div className="app-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Mono:wght@300;400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --cream: #f0efdf;
          --cream-dark: #e6e4d0;
          --cream-mid: #eae9d6;
          --sage: #8ab89a;
          --sage-dark: #6a9e78;
          --sage-deep: #4a7a5a;
          --teal: #5d8a90;
          --teal-dark: #3d6a70;
          --slate: #4a6068;
          --bg: #f4f3e8;
          --surface: #fafaf4;
          --surface2: #f0efdf;
          --border: rgba(90,110,90,0.10);
          --border-hover: rgba(90,110,90,0.22);
          --text: #2d3d38;
          --muted: #7a9088;
          --critical: #b85450;
          --minor: #c9974a;
          --aligned: #6a9e78;
          --font: 'DM Sans', sans-serif;
          --mono: 'DM Mono', monospace;
          --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
        }

        html { scroll-behavior: smooth; }
        body { background: var(--bg); color: var(--text); font-family: var(--font); overflow-x: hidden; }

        /* ── PETAL CANVAS ── */
        .petal-layer {
          position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden;
        }
        .petal {
          position: absolute; top: -20px;
          will-change: transform, opacity;
          animation: petalFall linear infinite;
        }
        .petal-shape {
          background: white;
          border-radius: 60% 40% 60% 40% / 50% 60% 40% 50%;
          box-shadow: 0 1px 3px rgba(138,184,154,0.18);
          animation: petalSway ease-in-out infinite alternate;
        }
        @keyframes petalFall {
          0%   { transform: translateY(-20px) translateX(0px) rotate(0deg); opacity: 0; }
          5%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { transform: translateY(105vh) translateX(var(--drift)) rotate(var(--rot)); opacity: 0; }
        }
        @keyframes petalSway {
          from { transform: rotate(-18deg) scaleX(0.85); }
          to   { transform: rotate(18deg)  scaleX(1.1); }
        }

        /* ── APP SHELL ── */
        .app-shell {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 290px 1fr;
          grid-template-rows: auto 1fr;
          position: relative;
          z-index: 1;
        }

        /* ── TOPBAR ── */
        .topbar {
          grid-column: 1 / -1;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 36px; height: 64px;
          border-bottom: 1px solid var(--border);
          background: rgba(250,250,244,0.82);
          backdrop-filter: blur(16px) saturate(1.4);
          -webkit-backdrop-filter: blur(16px) saturate(1.4);
          position: sticky; top: 0; z-index: 100;
        }
        .logo {
          display: flex; align-items: center; gap: 12px;
          font-size: 16px; font-weight: 600; color: var(--text);
          letter-spacing: -0.4px;
        }
        .logo-mark {
          width: 34px; height: 34px;
          background: linear-gradient(135deg, var(--sage-deep) 0%, var(--teal-dark) 100%);
          border-radius: 9px; display: grid; place-items: center;
          box-shadow: 0 2px 8px rgba(74,122,90,0.28);
        }
        .logo-mark svg { width: 16px; height: 16px; }
        .logo-sub {
          font-size: 10.5px; font-weight: 400; color: var(--muted);
          letter-spacing: 0.6px; margin-left: 1px;
          border-left: 1px solid var(--border-hover); padding-left: 12px;
        }
        .topbar-right { display: flex; align-items: center; gap: 10px; }
        .status-pill {
          display: flex; align-items: center; gap: 7px; padding: 5px 13px;
          border-radius: 20px; border: 1px solid var(--border);
          background: var(--surface2); font-family: var(--mono);
          font-size: 10.5px; color: var(--muted);
        }
        .status-dot {
          width: 5px; height: 5px; border-radius: 50%; background: var(--sage);
          box-shadow: 0 0 0 2px rgba(138,184,154,0.3);
          animation: pulse 2.5s ease-in-out infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1;box-shadow:0 0 0 2px rgba(138,184,154,0.3)} 50%{opacity:.4;box-shadow:0 0 0 4px rgba(138,184,154,0.1)} }

        /* ── SIDEBAR ── */
        .sidebar {
          background: var(--surface); border-right: 1px solid var(--border);
          padding: 28px 20px; display: flex; flex-direction: column; gap: 9px;
          overflow-y: auto; position: relative;
        }
        .sidebar::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(180deg, rgba(138,184,154,0.03) 0%, transparent 60%);
        }
        .section-label {
          font-family: var(--mono); font-size: 9.5px; color: var(--muted);
          letter-spacing: 1.8px; text-transform: uppercase;
          padding: 0 4px; margin-top: 8px; margin-bottom: 2px;
        }

        .drop-zone {
          border: 1.5px dashed rgba(90,110,90,0.2); border-radius: 14px;
          padding: 26px 18px; text-align: center; cursor: pointer;
          transition: all 0.25s var(--ease-out); background: transparent;
          margin-bottom: 2px; position: relative; overflow: hidden;
        }
        .drop-zone::after {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse at 50% 0%, rgba(138,184,154,0.10) 0%, transparent 70%);
          opacity: 0; transition: opacity 0.3s;
        }
        .drop-zone:hover::after, .drop-zone.active::after { opacity: 1; }
        .drop-zone:hover, .drop-zone.active {
          border-color: var(--sage); background: rgba(138,184,154,0.05);
          transform: translateY(-1px);
        }
        .drop-zone-icon {
          width: 42px; height: 42px;
          background: var(--cream-mid); border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 11px; transition: transform 0.2s var(--ease-out);
        }
        .drop-zone:hover .drop-zone-icon { transform: translateY(-2px) scale(1.05); }
        .drop-zone-icon svg { width: 18px; height: 18px; color: var(--sage-deep); }
        .drop-zone-title { font-size: 12.5px; font-weight: 500; color: var(--text); margin-bottom: 3px; }
        .drop-zone-sub { font-size: 10.5px; color: var(--muted); font-family: var(--mono); }

        .file-badge {
          display: flex; align-items: center; gap: 8px;
          padding: 9px 13px; border-radius: 10px;
          background: rgba(138,184,154,0.09); border: 1px solid rgba(138,184,154,0.25);
          font-size: 11.5px; font-family: var(--mono); color: var(--muted);
          animation: slideIn 0.3s var(--ease-out);
        }
        @keyframes slideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .file-badge-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--sage-deep); font-weight: 500; }
        .file-check { width: 15px; height: 15px; background: var(--sage-deep); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        .btn-primary {
          width: 100%; padding: 11.5px; background: var(--sage-deep); color: white;
          border: none; border-radius: 10px; font-family: var(--font); font-size: 13px;
          font-weight: 500; cursor: pointer; transition: all 0.2s var(--ease-out);
          display: flex; align-items: center; justify-content: center; gap: 7px;
          letter-spacing: 0.15px; position: relative; overflow: hidden;
        }
        .btn-primary::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%);
          pointer-events: none;
        }
        .btn-primary:hover:not(:disabled) { background: var(--sage-dark); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(74,122,90,0.22); }
        .btn-primary:active:not(:disabled) { transform: translateY(0); box-shadow: none; }
        .btn-primary:disabled { opacity: 0.38; cursor: not-allowed; transform: none; }

        .btn-ghost {
          width: 100%; padding: 9.5px; background: transparent; color: var(--muted);
          border: 1px solid var(--border-hover); border-radius: 10px; font-family: var(--font);
          font-size: 12px; font-weight: 400; cursor: pointer; transition: all 0.2s var(--ease-out);
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .btn-ghost:hover:not(:disabled) { border-color: var(--teal); color: var(--teal-dark); background: rgba(93,138,144,0.06); }
        .btn-ghost:disabled { opacity: 0.28; cursor: not-allowed; }

        /* ── METRIC ROWS ── */
        .metric-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 11px; border-radius: 8px;
          background: var(--surface2); border: 1px solid var(--border);
          transition: border-color 0.15s;
        }
        .metric-row:hover { border-color: var(--border-hover); }
        .metric-label { font-size: 11.5px; color: var(--muted); display: flex; align-items: center; gap: 7px; }
        .metric-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .metric-val { font-family: var(--mono); font-size: 14px; font-weight: 500; }

        /* ── RISK CARD ── */
        .risk-card {
          padding: 18px 16px; border-radius: 13px;
          background: var(--surface2); border: 1px solid var(--border);
          text-align: center; position: relative; overflow: hidden;
        }
        .risk-card::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse at 50% 100%, rgba(138,184,154,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .risk-score-big {
          font-size: 52px; font-weight: 600; line-height: 1;
          font-variant-numeric: tabular-nums; letter-spacing: -3px;
          transition: color 0.5s;
        }
        .risk-label-text {
          font-family: var(--mono); font-size: 9.5px; letter-spacing: 2px;
          text-transform: uppercase; margin-top: 5px; color: var(--muted);
        }
        .risk-bar-wrap { height: 2px; background: rgba(0,0,0,0.07); border-radius: 4px; margin-top: 14px; overflow: hidden; }
        .risk-bar-fill { height: 100%; border-radius: 4px; transition: width 1.2s var(--ease-out); }

        /* ── MAIN ── */
        .main { display: flex; flex-direction: column; overflow: hidden; min-height: 0; }

        /* ── HERO ── */
        .hero {
          flex: 1; display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 22px; padding: 80px 60px; text-align: center;
          position: relative;
        }
        .hero-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 5px 16px; border-radius: 20px;
          background: rgba(138,184,154,0.13); border: 1px solid rgba(138,184,154,0.28);
          font-size: 10.5px; font-family: var(--mono); color: var(--sage-deep); letter-spacing: 1px;
        }
        .hero-eyebrow-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--sage); }

        .hero-title {
          font-size: 44px; font-weight: 300; letter-spacing: -2px;
          line-height: 1.08; color: var(--text); max-width: 520px;
          font-style: italic;
        }
        .hero-title strong { font-weight: 600; font-style: normal; color: var(--sage-deep); }
        .hero-title em { font-style: italic; font-weight: 300; }

        .hero-sub {
          font-size: 14.5px; color: var(--muted); max-width: 440px;
          line-height: 1.8; font-weight: 300;
        }

        .hero-divider {
          width: 40px; height: 1px; background: var(--border-hover);
          margin: 0 auto;
        }

        .hero-features {
          display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;
        }
        .hero-feature {
          display: flex; align-items: center; gap: 6px;
          padding: 5px 13px; border-radius: 20px; border: 1px solid var(--border);
          font-size: 11.5px; color: var(--muted); background: rgba(250,250,244,0.7);
          transition: all 0.2s;
          backdrop-filter: blur(4px);
        }
        .hero-feature:hover { border-color: var(--border-hover); color: var(--text); }
        .hero-feature-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--sage); }

        /* ── TABS ── */
        .tab-bar {
          display: flex; gap: 0; padding: 0 28px;
          border-bottom: 1px solid var(--border);
          background: rgba(250,250,244,0.9);
          backdrop-filter: blur(8px);
          overflow-x: auto; flex-shrink: 0;
        }
        .tab-btn {
          padding: 15px 16px; background: transparent; border: none;
          border-bottom: 2px solid transparent;
          font-family: var(--font); font-size: 12.5px; font-weight: 400;
          color: var(--muted); cursor: pointer; transition: all 0.15s;
          display: flex; align-items: center; gap: 7px;
          margin-bottom: -1px; white-space: nowrap;
        }
        .tab-btn:hover { color: var(--text); }
        .tab-btn.active { color: var(--sage-deep); border-bottom-color: var(--sage-deep); font-weight: 500; }

        .tab-chip { padding: 2px 7px; border-radius: 10px; font-family: var(--mono); font-size: 9.5px; font-weight: 400; }
        .chip-critical { background: rgba(184,84,80,0.09);  color: var(--critical); }
        .chip-minor    { background: rgba(201,151,74,0.09);  color: var(--minor); }
        .chip-ok       { background: rgba(106,158,120,0.11); color: var(--sage-deep); }
        .chip-teal     { background: rgba(93,138,144,0.09);  color: var(--teal-dark); }
        .chip-slate    { background: rgba(74,96,104,0.09);   color: var(--slate); }
        .chip-doc      { background: rgba(74,122,90,0.09);   color: var(--sage-deep); }

        .tab-content { flex: 1; overflow-y: auto; min-height: 0; }
        .tab-content.padded { padding: 28px 32px; }
        .tab-content.full-bleed { padding: 0; display: flex; flex-direction: column; }

        /* ── LOADING ── */
        .loading-state {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 28px; padding: 80px; flex: 1;
        }
        .loading-ring-wrap { position: relative; width: 52px; height: 52px; }
        .loading-ring {
          width: 52px; height: 52px;
          border: 1.5px solid var(--cream-dark); border-top-color: var(--sage);
          border-right-color: rgba(138,184,154,0.4);
          border-radius: 50%; animation: spin 1.1s linear infinite;
        }
        .loading-dot {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%,-50%);
          width: 6px; height: 6px; background: var(--sage); border-radius: 50%;
          animation: dotPulse 1.1s ease-in-out infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes dotPulse { 0%,100%{transform:translate(-50%,-50%) scale(1)} 50%{transform:translate(-50%,-50%) scale(1.4)} }
        .loading-steps { display: flex; flex-direction: column; gap: 8px; text-align: center; }
        .loading-step {
          font-family: var(--mono); font-size: 11.5px; color: var(--muted);
          animation: fadeUp 0.6s var(--ease-out) forwards; opacity: 0;
        }
        .loading-step:nth-child(1) { animation-delay: 0.1s; }
        .loading-step:nth-child(2) { animation-delay: 0.8s; }
        .loading-step:nth-child(3) { animation-delay: 1.6s; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }

        .error-box {
          margin: 28px; padding: 18px 22px; border-radius: 10px;
          background: rgba(184,84,80,0.05); border: 1px solid rgba(184,84,80,0.18);
          color: var(--critical); font-size: 13px; line-height: 1.8; white-space: pre-wrap;
        }
        .error-box strong { display: block; margin-bottom: 5px; font-size: 13.5px; }

        .rec-banner {
          padding: 14px 18px; border-radius: 11px; border: 1px solid var(--border);
          background: rgba(138,184,154,0.06); margin-bottom: 22px;
          display: flex; align-items: flex-start; justify-content: space-between; gap: 14px;
        }
        .rec-text { font-size: 12.5px; color: var(--muted); line-height: 1.65; }
        .rec-text strong { color: var(--text); font-weight: 500; }
        .rec-count { font-family: var(--mono); font-size: 10.5px; color: var(--muted); white-space: nowrap; padding-top: 2px; }

        /* ── SCROLLBAR ── */
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(90,110,90,0.18); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(90,110,90,0.30); }

        @media (max-width: 768px) { .app-shell { grid-template-columns: 1fr; } .sidebar { display: none; } }
      `}</style>

      {/* ── PETALS ── */}
      <div className="petal-layer" aria-hidden="true">
        {petals.map((p) => (
          <div
            key={p.id}
            className="petal"
            style={{
              left: `${p.x}%`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              // @ts-ignore
              "--drift": `${p.drift}px`,
              "--rot": `${p.rotation + 360}deg`,
            }}
          >
            <div
              className="petal-shape"
              style={{
                width: p.size,
                height: p.size * 1.4,
                opacity: p.opacity,
                animationDuration: `${1.8 + Math.random() * 1.2}s`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          </div>
        ))}
      </div>

      {/* ── TOPBAR ── */}
      <header className="topbar">
        <div className="logo">
          <div className="logo-mark">
            <svg viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3v14M6 7l4-4 4 4M4 11h12M7 15l3 3 3-3" />
            </svg>
          </div>
          ACTA AI
          <span className="logo-sub">Clinical Trial Intelligence</span>
        </div>
      </header>

      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="section-label">Upload Contract</div>

        <div
          className={`drop-zone ${dragOver ? "active" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
        >
          <div className="drop-zone-icon">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 14v3h12v-3M10 3v10M7 6l3-3 3 3" />
            </svg>
          </div>
          <div className="drop-zone-title">Drop CTA file here</div>
          <div className="drop-zone-sub">PDF · DOCX · TXT</div>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>

        {file && (
          <div className="file-badge">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4 2h6l4 4v8H4V2z" /><path d="M10 2v4h4" />
            </svg>
            <span className="file-badge-name">{file.name}</span>
            <div className="file-check">
              <svg width="7" height="7" viewBox="0 0 8 8" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
                <path d="M1.5 4l2 2 3-3" />
              </svg>
            </div>
          </div>
        )}

        <button className="btn-primary" onClick={uploadFile} disabled={!file || loading}>
          {loading ? (
            <>
              <span style={{ width: 13, height: 13, border: "1.5px solid rgba(255,255,255,0.25)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.9s linear infinite", display: "inline-block", flexShrink: 0 }} />
              Analyzing…
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="8" cy="8" r="6" /><path d="M5.5 8l2 2 3-3" />
              </svg>
              Analyze Contract
            </>
          )}
        </button>

        <button className="btn-ghost" onClick={downloadPDF} disabled={!result}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M4 14v1h8v-1M8 2v9M5 8l3 3 3-3" />
          </svg>
          Download PDF Report
        </button>

        {result && (
          <>
            <div className="section-label" style={{ marginTop: 18 }}>Risk Score</div>
            <div className="risk-card">
              <div className="risk-score-big" style={{ color: riskColor }}>{riskScore}</div>
              <div className="risk-label-text">/ 100 · {riskLevel} Risk</div>
              <div className="risk-bar-wrap">
                <div className="risk-bar-fill" style={{ width: `${riskScore}%`, background: riskColor }} />
              </div>
            </div>

            <div className="section-label" style={{ marginTop: 12 }}>Breakdown</div>
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
              <div className="metric-label" style={{ color: "var(--muted)" }}>Total</div>
              <div className="metric-val">{total}</div>
            </div>
          </>
        )}
      </aside>

      {/* ── MAIN ── */}
      <main className="main">

        {/* Empty state */}
        {!loading && !result && !error && (
          <div className="hero">
            <div className="hero-eyebrow">
              <div className="hero-eyebrow-dot" />
              ACTA Compliance Platform
            </div>
            <h1 className="hero-title">
              Clinical trial contracts,<br /><strong>analyzed instantly</strong>
            </h1>
            <div className="hero-divider" />
            <p className="hero-sub">
              Upload a Clinical Trial Agreement for AI-powered ACTA compliance analysis,
              automated redlines, and multi-contract conflict detection.
            </p>
            <div className="hero-features">
              {["ACTA Compliance", "Document Viewer", "Auto Redlines", "Site Personas", "Workflow Forecast"].map(f => (
                <span key={f} className="hero-feature">
                  <span className="hero-feature-dot" />{f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="loading-state">
            <div className="loading-ring-wrap">
              <div className="loading-ring" />
              <div className="loading-dot" />
            </div>
            <div className="loading-steps">
              <div className="loading-step">Parsing document structure…</div>
              <div className="loading-step">Comparing against ACTA baseline…</div>
              <div className="loading-step">Generating redlines and predictions…</div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="error-box">
            <strong>⚠ Error</strong>
            {error}
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <>
            <div className="tab-bar">
              <button className={`tab-btn ${activeTab === "document" ? "active" : ""}`} onClick={() => setActiveTab("document")}>
                Document <span className="tab-chip chip-doc">Highlighted</span>
              </button>
              <button className={`tab-btn ${activeTab === "redlines" ? "active" : ""}`} onClick={() => setActiveTab("redlines")}>
                Redlines
                {critical > 0 && <span className="tab-chip chip-critical">{critical}</span>}
                {minor    > 0 && <span className="tab-chip chip-minor">{minor}</span>}
              </button>
              <button className={`tab-btn ${activeTab === "chat" ? "active" : ""}`} onClick={() => setActiveTab("chat")}>AI Chat</button>
              <button className={`tab-btn ${activeTab === "workflow" ? "active" : ""}`} onClick={() => setActiveTab("workflow")}>
                Workflow <span className="tab-chip chip-ok">Forecast</span>
              </button>
              <button className={`tab-btn ${activeTab === "personas" ? "active" : ""}`} onClick={() => setActiveTab("personas")}>
                Site Personas <span className="tab-chip chip-teal">Predictive</span>
              </button>
            </div>

            {activeTab === "document" && (
              <div className="tab-content full-bleed" style={{ flex: 1 }}>
                <DocumentViewer contractText={contractText} clauses={result.clauses ?? {}} onClauseClick={handleClauseClick} />
              </div>
            )}

            {activeTab !== "document" && (
              <div className="tab-content padded">
                {activeTab === "redlines" && (
                  <>
                    <div className="rec-banner">
                      <div className="rec-text">
                        <strong>Recommendation: </strong>{result?.metrics?.recommendation}
                      </div>
                      <div className="rec-count">{total} clauses analyzed</div>
                    </div>
                    <RedlineViewer redlines={result.clauses ?? {}} jumpToClause={jumpClause} />
                  </>
                )}
                {activeTab === "chat" && (
                  <ChatBox context={contractText || JSON.stringify(result.clauses ?? {})} />
                )}
                {activeTab === "workflow" && (
                  <WorkflowTracker filename={result.filename} metrics={result.metrics} />
                )}
                {activeTab === "personas" && (
                  <SitePersona clauses={result.clauses ?? {}} />
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
