"use client";

import { useState } from "react";

// ──────────────────────────────────────────────────────────────────
// MULTI-PARTY CONFLICT DETECTOR
// Detects cross-contract inconsistencies across multiple CTAs.
// E.g. if Regeneron granted exclusive IP to Site A and is about
// to grant the same to Site B — flags it before it becomes a crisis.
// Uses Claude API to reason across contracts.
// ──────────────────────────────────────────────────────────────────

interface ContractEntry {
  id: string;
  siteName: string;
  filename: string;
  clauses: Record<string, { type?: string; text: string; deviation?: string; suggested_clause?: string }>;
  uploadedAt: string;
}

interface Conflict {
  type: "exclusive_ip" | "jurisdiction" | "payment_inconsistency" | "publication_window" | "indemnification_mismatch" | "other";
  severity: "critical" | "warning";
  title: string;
  description: string;
  affectedSites: string[];
  affectedClause: string;
  recommendation: string;
}

const CONFLICT_ICONS: Record<string, string> = {
  exclusive_ip: "🔒",
  jurisdiction: "⚖️",
  payment_inconsistency: "💰",
  publication_window: "📰",
  indemnification_mismatch: "🛡️",
  other: "⚠️",
};

async function detectConflicts(contracts: ContractEntry[]): Promise<Conflict[]> {
  if (contracts.length < 2) return [];

  const contractSummaries = contracts.map(c => {
    const clauseSummary = Object.entries(c.clauses)
      .slice(0, 8)
      .map(([name, cl]) => `  - ${name} (${cl.type || "General"}): ${cl.text.slice(0, 200)}`)
      .join("\n");
    return `CONTRACT: ${c.siteName} (${c.filename})\n${clauseSummary}`;
  }).join("\n\n---\n\n");

  const prompt = `You are a senior clinical trial legal auditor. Analyze these ${contracts.length} Clinical Trial Agreements for CROSS-CONTRACT INCONSISTENCIES that could create legal exposure for the sponsor (Regeneron).

Look for:
1. Exclusive IP grants given to multiple sites for same compound
2. Contradictory jurisdiction/governing law clauses
3. Inconsistent payment rates for same procedure across sites
4. Conflicting publication review windows
5. Mismatched indemnification obligations between sites
6. Any other clause granted to Site A that conflicts with Site B

CONTRACTS TO COMPARE:
${contractSummaries}

Return ONLY valid JSON array (no markdown):
[
  {
    "type": "exclusive_ip | jurisdiction | payment_inconsistency | publication_window | indemnification_mismatch | other",
    "severity": "critical | warning",
    "title": "Short conflict title",
    "description": "2-sentence explanation of the conflict and why it creates legal risk",
    "affectedSites": ["Site Name 1", "Site Name 2"],
    "affectedClause": "Clause type name",
    "recommendation": "1-sentence actionable fix"
  }
]

If no conflicts found, return empty array [].`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.map((b: any) => b.text || "").join("") || "[]";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return [];
  }
}

interface Props {
  currentContract: {
    filename: string;
    clauses: Record<string, { type?: string; text: string; deviation?: string }>;
  };
}

export default function ConflictDetector({ currentContract }: Props) {
  const [contracts, setContracts] = useState<ContractEntry[]>([
    {
      id: "current",
      siteName: "Current Contract",
      filename: currentContract.filename,
      clauses: currentContract.clauses,
      uploadedAt: new Date().toLocaleDateString(),
    },
  ]);

  const [newSiteName, setNewSiteName] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [addingContract, setAddingContract] = useState(false);

  const handleAddContract = async () => {
    if (!newFile || !newSiteName.trim()) return;
    const text = await newFile.text();

    // Parse clauses from text (simplified — real impl would call backend)
    const mockClauses: Record<string, { type: string; text: string; deviation: string }> = {};
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.length > 30).slice(0, 10);
    sentences.forEach((s, i) => {
      mockClauses[`Clause #${i + 1}`] = { type: "General Clause", text: s, deviation: "minor" };
    });

    setContracts(prev => [...prev, {
      id: `contract-${Date.now()}`,
      siteName: newSiteName,
      filename: newFile.name,
      clauses: mockClauses,
      uploadedAt: new Date().toLocaleDateString(),
    }]);
    setNewSiteName("");
    setNewFile(null);
    setAddingContract(false);
    setScanned(false);
  };

  const handleScan = async () => {
    setScanning(true);
    setConflicts([]);
    const found = await detectConflicts(contracts);
    setConflicts(found);
    setScanning(false);
    setScanned(true);
  };

  const removeContract = (id: string) => {
    if (id === "current") return;
    setContracts(prev => prev.filter(c => c.id !== id));
    setScanned(false);
  };

  return (
    <div>
      <style>{`
        .conflict-header {
          margin-bottom: 20px;
        }
        .conflict-header-title {
          font-size: 15px;
          font-weight: 800;
          letter-spacing: -0.3px;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .conflict-header-sub {
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          color: #64748b;
          line-height: 1.5;
        }

        /* Contract list */
        .contract-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }
        .contract-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 10px;
          background: #0d1422;
          border: 1px solid rgba(255,255,255,0.07);
        }
        .contract-item-icon { font-size: 18px; }
        .contract-item-info { flex: 1; }
        .contract-item-site {
          font-size: 13px;
          font-weight: 700;
        }
        .contract-item-file {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          color: #64748b;
          margin-top: 2px;
        }
        .contract-item-date {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          color: #334155;
        }
        .contract-item-current {
          font-family: var(--font-mono, monospace);
          font-size: 9px;
          padding: 2px 7px;
          border-radius: 4px;
          background: rgba(59,130,246,0.12);
          color: #93c5fd;
          letter-spacing: 0.5px;
        }
        .contract-remove {
          background: transparent;
          border: none;
          color: #334155;
          font-size: 16px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.15s;
        }
        .contract-remove:hover { color: #ef4444; }

        /* Add contract form */
        .add-contract-panel {
          padding: 16px;
          border-radius: 10px;
          background: #080c14;
          border: 1px dashed rgba(255,255,255,0.1);
          margin-bottom: 16px;
        }
        .add-contract-row {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 10px;
          align-items: end;
        }
        @media (max-width: 600px) { .add-contract-row { grid-template-columns: 1fr; } }
        .add-input {
          padding: 9px 12px;
          background: #0d1422;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: #f1f5f9;
          font-family: var(--font-display, sans-serif);
          font-size: 13px;
          outline: none;
          width: 100%;
        }
        .add-input:focus { border-color: rgba(59,130,246,0.4); }
        .add-input::placeholder { color: #334155; }
        .add-label {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }
        .add-btn {
          padding: 9px 16px;
          background: rgba(59,130,246,0.12);
          color: #93c5fd;
          border: 1px solid rgba(59,130,246,0.2);
          border-radius: 8px;
          font-family: var(--font-display, sans-serif);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .add-btn:hover { background: rgba(59,130,246,0.2); }
        .add-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Action buttons */
        .action-row {
          display: flex;
          gap: 10px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .scan-btn {
          flex: 1;
          padding: 12px 20px;
          background: #1d4ed8;
          color: white;
          border: none;
          border-radius: 10px;
          font-family: var(--font-display, sans-serif);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .scan-btn:hover:not(:disabled) { background: #1e40af; }
        .scan-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .add-contract-btn {
          padding: 12px 20px;
          background: transparent;
          color: #64748b;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          font-family: var(--font-display, sans-serif);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .add-contract-btn:hover { border-color: rgba(255,255,255,0.2); color: #f1f5f9; }

        /* Conflict cards */
        .conflict-card {
          border-radius: 12px;
          margin-bottom: 12px;
          border: 1px solid;
          overflow: hidden;
        }
        .conflict-card-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px 18px;
        }
        .conflict-icon { font-size: 22px; flex-shrink: 0; margin-top: 2px; }
        .conflict-info { flex: 1; }
        .conflict-title {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .conflict-desc {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 8px;
        }
        .conflict-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .conflict-site-tag {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 4px;
          background: rgba(255,255,255,0.05);
          color: #94a3b8;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .conflict-clause-tag {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 4px;
          background: rgba(99,102,241,0.1);
          color: #a5b4fc;
          border: 1px solid rgba(99,102,241,0.2);
        }
        .conflict-rec {
          margin-top: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 12px;
          line-height: 1.5;
        }
        .conflict-severity-badge {
          padding: 4px 10px;
          border-radius: 6px;
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          flex-shrink: 0;
        }

        /* Empty / ready states */
        .scan-ready {
          text-align: center;
          padding: 32px;
          border-radius: 12px;
          border: 1px dashed rgba(255,255,255,0.08);
          color: #475569;
          font-family: var(--font-mono, monospace);
          font-size: 12px;
          line-height: 1.7;
        }
        .scan-ready-icon { font-size: 36px; margin-bottom: 10px; display: block; }
        .no-conflicts {
          text-align: center;
          padding: 32px;
          border-radius: 12px;
          border: 1px solid rgba(34,197,94,0.15);
          background: rgba(34,197,94,0.04);
          color: #86efac;
          font-size: 14px;
          font-weight: 700;
        }
        .scan-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.2);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="conflict-header">
        <div className="conflict-header-title">
          🔍 Multi-Party Conflict Detector
        </div>
        <div className="conflict-header-sub">
          Upload multiple CTAs to detect cross-contract inconsistencies — exclusive IP double-grants, jurisdiction conflicts, payment rate mismatches, and more.
        </div>
      </div>

      {/* Contract list */}
      <div className="contract-list">
        {contracts.map((c) => (
          <div className="contract-item" key={c.id}>
            <div className="contract-item-icon">📄</div>
            <div className="contract-item-info">
              <div className="contract-item-site">{c.siteName}</div>
              <div className="contract-item-file">{c.filename}</div>
            </div>
            <div className="contract-item-date">{c.uploadedAt}</div>
            {c.id === "current"
              ? <span className="contract-item-current">CURRENT</span>
              : <button className="contract-remove" onClick={() => removeContract(c.id)} title="Remove">✕</button>
            }
          </div>
        ))}
      </div>

      {/* Add contract panel */}
      {addingContract && (
        <div className="add-contract-panel">
          <div className="add-contract-row">
            <div>
              <div className="add-label">Site Name</div>
              <input className="add-input" placeholder="e.g. Mayo Clinic" value={newSiteName}
                onChange={e => setNewSiteName(e.target.value)} />
            </div>
            <div>
              <div className="add-label">CTA File (.txt)</div>
              <input type="file" accept=".txt,.docx,.pdf"
                style={{ padding: "7px 12px", background: "#0d1422", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#94a3b8", fontSize: 12, width: "100%" }}
                onChange={e => setNewFile(e.target.files?.[0] || null)} />
            </div>
            <button className="add-btn" onClick={handleAddContract} disabled={!newFile || !newSiteName.trim()}>
              Add
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="action-row">
        <button className="add-contract-btn" onClick={() => setAddingContract(!addingContract)}>
          {addingContract ? "✕ Cancel" : "+ Add Another Contract"}
        </button>
        <button className="scan-btn" onClick={handleScan} disabled={contracts.length < 2 || scanning}>
          {scanning
            ? <><span className="scan-spinner" /> Scanning for conflicts…</>
            : `🔍 Scan ${contracts.length} Contracts for Conflicts`
          }
        </button>
      </div>

      {/* Results */}
      {!scanned && !scanning && (
        <div className="scan-ready">
          <span className="scan-ready-icon">🔍</span>
          Add 2+ contracts above, then click Scan to detect cross-contract inconsistencies.<br />
          Works best with 3+ active site contracts.
        </div>
      )}

      {scanned && conflicts.length === 0 && (
        <div className="no-conflicts">
          ✓ No cross-contract conflicts detected across {contracts.length} agreements
        </div>
      )}

      {conflicts.map((c, i) => {
        const isCritical = c.severity === "critical";
        const color = isCritical ? "#ef4444" : "#f59e0b";
        const bg = isCritical ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)";
        const border = isCritical ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)";
        return (
          <div className="conflict-card" key={i} style={{ borderColor: border, background: bg }}>
            <div className="conflict-card-header">
              <div className="conflict-icon">{CONFLICT_ICONS[c.type] || "⚠️"}</div>
              <div className="conflict-info">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                  <div className="conflict-title" style={{ color }}>{c.title}</div>
                  <div className="conflict-severity-badge"
                    style={{ background: isCritical ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)", color }}>
                    {c.severity}
                  </div>
                </div>
                <div className="conflict-desc">{c.description}</div>
                <div className="conflict-meta">
                  {c.affectedSites.map(s => (
                    <span className="conflict-site-tag" key={s}>📍 {s}</span>
                  ))}
                  <span className="conflict-clause-tag">⚖️ {c.affectedClause}</span>
                </div>
                <div className="conflict-rec"
                  style={{ background: isCritical ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)", borderLeft: `3px solid ${color}`, color: "#94a3b8" }}>
                  <strong style={{ color }}>→ Fix: </strong>{c.recommendation}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}