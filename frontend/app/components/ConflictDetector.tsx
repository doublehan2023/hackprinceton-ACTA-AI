"use client";

import { useState } from "react";

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

function findClauseText(contract: ContractEntry, keywords: string[]): string | null {
  const match = Object.entries(contract.clauses).find(([name, clause]) => {
    const haystack = `${name} ${clause.type || ""} ${clause.text}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(keyword));
  });
  return match?.[1].text || null;
}

function normalizeStateFromText(text: string | null): string | null {
  if (!text) return null;
  const match = text.match(
    /\b(?:new york|california|massachusetts|delaware|new jersey|illinois|texas|pennsylvania|florida|connecticut)\b/i,
  );
  return match ? match[0].toLowerCase() : null;
}

function extractDays(text: string | null): number | null {
  if (!text) return null;
  const match = text.match(/\b(\d{1,3})\s*day/i);
  return match ? Number(match[1]) : null;
}

function extractNetDays(text: string | null): number | null {
  if (!text) return null;
  const match = text.match(/\bnet[\s-]?(\d{1,3})\b/i) || text.match(/\bwithin\s+(\d{1,3})\s+days\b/i);
  return match ? Number(match[1]) : null;
}

function detectConflicts(contracts: ContractEntry[]): Conflict[] {
  if (contracts.length < 2) return [];

  const conflicts: Conflict[] = [];

  const jurisdictionStates = contracts
    .map(contract => ({
      siteName: contract.siteName,
      state: normalizeStateFromText(findClauseText(contract, ["governing law", "jurisdiction"])),
    }))
    .filter((entry): entry is { siteName: string; state: string } => Boolean(entry.state));

  const uniqueStates = [...new Set(jurisdictionStates.map(entry => entry.state))];
  if (uniqueStates.length > 1) {
    conflicts.push({
      type: "jurisdiction",
      severity: "warning",
      title: "Conflicting governing law positions",
      description: `The CTA set references multiple governing-law states: ${uniqueStates.join(", ")}.`,
      affectedSites: jurisdictionStates.map(entry => entry.siteName),
      affectedClause: "Governing Law",
      recommendation: "Standardize the governing-law fallback before parallel negotiations drift further apart.",
    });
  }

  const paymentTerms = contracts
    .map(contract => ({
      siteName: contract.siteName,
      days: extractNetDays(findClauseText(contract, ["payment", "invoice", "net-"])),
    }))
    .filter((entry): entry is { siteName: string; days: number } => entry.days !== null);

  const uniquePaymentDays = [...new Set(paymentTerms.map(entry => entry.days))];
  if (uniquePaymentDays.length > 1) {
    conflicts.push({
      type: "payment_inconsistency",
      severity: "warning",
      title: "Payment timing is inconsistent across sites",
      description: `The agreements use different invoice timing terms (${uniquePaymentDays.join(", ")} days), which can create budget and treasury friction.`,
      affectedSites: paymentTerms.map(entry => entry.siteName),
      affectedClause: "Payment Terms",
      recommendation: "Align the sponsor payment baseline before finalizing site-specific budgets.",
    });
  }

  const publicationWindows = contracts
    .map(contract => ({
      siteName: contract.siteName,
      days: extractDays(findClauseText(contract, ["publication", "manuscript", "patent delay"])),
    }))
    .filter((entry): entry is { siteName: string; days: number } => entry.days !== null);

  const uniquePublicationDays = [...new Set(publicationWindows.map(entry => entry.days))];
  if (uniquePublicationDays.length > 1) {
    conflicts.push({
      type: "publication_window",
      severity: "warning",
      title: "Publication review windows do not match",
      description: `Publication rights vary across the CTA set (${uniquePublicationDays.join(", ")} day review windows), which can undermine a uniform sponsor position.`,
      affectedSites: publicationWindows.map(entry => entry.siteName),
      affectedClause: "Publication Rights",
      recommendation: "Pick one publication-review standard and push that consistently across all sites.",
    });
  }

  const indemnificationProfiles = contracts
    .map(contract => {
      const text = (findClauseText(contract, ["indemnification", "indemnify"]) || "").toLowerCase();
      return {
        siteName: contract.siteName,
        profile: text.includes("mutual") ? "mutual" : text.includes("sponsor") ? "sponsor_only" : null,
      };
    })
    .filter((entry): entry is { siteName: string; profile: string } => Boolean(entry.profile));

  const uniqueProfiles = [...new Set(indemnificationProfiles.map(entry => entry.profile))];
  if (uniqueProfiles.length > 1) {
    conflicts.push({
      type: "indemnification_mismatch",
      severity: "critical",
      title: "Indemnification obligations diverge between contracts",
      description: "Some agreements appear mutual while others lean sponsor-only, creating uneven liability exposure across active sites.",
      affectedSites: indemnificationProfiles.map(entry => entry.siteName),
      affectedClause: "Indemnification",
      recommendation: "Re-anchor all sites to one indemnification fallback before further redline rounds.",
    });
  }

  const ipProfiles = contracts
    .map(contract => {
      const text = (findClauseText(contract, ["intellectual property", "ip ownership", "inventions"]) || "").toLowerCase();
      return {
        siteName: contract.siteName,
        profile: text.includes("site retains") || text.includes("site shall own")
          ? "site_favored"
          : text.includes("sponsor retains") || text.includes("sponsor shall own")
            ? "sponsor_favored"
            : null,
      };
    })
    .filter((entry): entry is { siteName: string; profile: string } => Boolean(entry.profile));

  const uniqueIpProfiles = [...new Set(ipProfiles.map(entry => entry.profile))];
  if (uniqueIpProfiles.length > 1) {
    conflicts.push({
      type: "exclusive_ip",
      severity: "critical",
      title: "IP ownership positions conflict across the CTA set",
      description: "Different sites appear to be receiving materially different IP ownership treatment, which can create overlapping rights if inventions arise.",
      affectedSites: ipProfiles.map(entry => entry.siteName),
      affectedClause: "Intellectual Property",
      recommendation: "Normalize IP ownership language now to avoid conflicting invention-right allocations.",
    });
  }

  return conflicts;
}

interface Props {
  currentContract: {
    filename: string;
    clauses: Record<string, { type?: string; text: string; deviation?: string }>;
  };
}

export default function ConflictDetector({ currentContract }: Props) {
  const [contracts, setContracts] = useState<ContractEntry[]>([{
    id: "current", siteName: "Current Contract",
    filename: currentContract.filename, clauses: currentContract.clauses,
    uploadedAt: new Date().toLocaleDateString(),
  }]);
  const [newSiteName, setNewSiteName] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [addingContract, setAddingContract] = useState(false);

  const handleAddContract = async () => {
    if (!newFile || !newSiteName.trim()) return;
    const text = await newFile.text();
    const mockClauses: Record<string, { type: string; text: string; deviation: string }> = {};
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.length > 30).slice(0, 10);
    sentences.forEach((s, i) => {
      mockClauses[`Clause #${i + 1}`] = { type: "General Clause", text: s, deviation: "minor" };
    });
    setContracts(prev => [...prev, {
      id: `contract-${Date.now()}`, siteName: newSiteName,
      filename: newFile.name, clauses: mockClauses,
      uploadedAt: new Date().toLocaleDateString(),
    }]);
    setNewSiteName(""); setNewFile(null); setAddingContract(false); setScanned(false);
  };

  const handleScan = async () => {
    setScanning(true); setConflicts([]);
    const found = detectConflicts(contracts);
    setConflicts(found); setScanning(false); setScanned(true);
  };

  const removeContract = (id: string) => {
    if (id === "current") return;
    setContracts(prev => prev.filter(c => c.id !== id));
    setScanned(false);
  };

  return (
    <div>
      <style>{`
        .cd-intro { margin-bottom: 20px; }
        .cd-intro-title { font-size: 14px; font-weight: 500; color: #2d3d38; margin-bottom: 5px; }
        .cd-intro-sub { font-family: 'DM Mono', monospace; font-size: 11px; color: #7a9088; line-height: 1.6; }

        .contract-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
        .contract-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px; border-radius: 10px;
          background: #f0efdf; border: 1px solid rgba(90,110,90,0.12);
        }
        .contract-item-site { font-size: 13px; font-weight: 500; color: #2d3d38; }
        .contract-item-file { font-family: 'DM Mono', monospace; font-size: 10px; color: #7a9088; margin-top: 2px; }
        .contract-item-date { font-family: 'DM Mono', monospace; font-size: 10px; color: #b0bfba; }
        .current-tag {
          font-family: 'DM Mono', monospace; font-size: 9px;
          padding: 2px 7px; border-radius: 4px;
          background: rgba(74,122,90,0.1); color: #4a7a5a;
        }
        .contract-remove {
          background: transparent; border: none; color: #b0bfba;
          font-size: 14px; cursor: pointer; padding: 4px; border-radius: 4px;
          transition: color 0.15s;
        }
        .contract-remove:hover { color: #b85450; }

        .add-panel {
          padding: 16px; border-radius: 10px;
          background: rgba(90,110,90,0.04);
          border: 1px dashed rgba(90,110,90,0.18);
          margin-bottom: 14px;
        }
        .add-row {
          display: grid; grid-template-columns: 1fr 1fr auto;
          gap: 10px; align-items: end;
        }
        @media (max-width: 600px) { .add-row { grid-template-columns: 1fr; } }
        .add-label { font-family: 'DM Mono', monospace; font-size: 10px; color: #7a9088; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
        .add-input {
          width: 100%; padding: 9px 12px;
          background: #fafaf4; border: 1px solid rgba(90,110,90,0.18);
          border-radius: 8px; color: #2d3d38;
          font-family: 'DM Sans', sans-serif; font-size: 13px; outline: none;
        }
        .add-input:focus { border-color: rgba(74,122,90,0.4); }
        .add-input::placeholder { color: #b0bfba; }
        .add-btn {
          padding: 9px 16px; background: rgba(74,122,90,0.1);
          color: #4a7a5a; border: 1px solid rgba(74,122,90,0.2);
          border-radius: 8px; font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s;
        }
        .add-btn:hover { background: rgba(74,122,90,0.18); }
        .add-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .action-row { display: flex; gap: 10px; margin-bottom: 24px; flex-wrap: wrap; }
        .scan-btn {
          flex: 1; padding: 11px 20px; background: #4a7a5a; color: white;
          border: none; border-radius: 10px; font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 500; cursor: pointer;
          transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .scan-btn:hover:not(:disabled) { background: #3d6a70; }
        .scan-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .add-contract-btn {
          padding: 11px 20px; background: transparent; color: #7a9088;
          border: 1px solid rgba(90,110,90,0.18); border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; transition: all 0.15s;
        }
        .add-contract-btn:hover { border-color: rgba(90,110,90,0.3); color: #2d3d38; }

        .scan-ready {
          text-align: center; padding: 36px;
          border-radius: 12px; border: 1px dashed rgba(90,110,90,0.18);
          color: #7a9088; font-family: 'DM Mono', monospace; font-size: 12px; line-height: 1.7;
        }
        .no-conflicts {
          text-align: center; padding: 32px; border-radius: 12px;
          border: 1px solid rgba(106,158,120,0.2); background: rgba(106,158,120,0.05);
          color: #4a7a5a; font-size: 14px; font-weight: 500;
        }

        .conflict-card { border-radius: 12px; margin-bottom: 10px; border: 1px solid; overflow: hidden; }
        .conflict-card-body { display: flex; align-items: flex-start; gap: 12px; padding: 16px 18px; }
        .conflict-title { font-size: 14px; font-weight: 500; margin-bottom: 6px; }
        .conflict-desc { font-size: 13px; color: #7a9088; line-height: 1.6; margin-bottom: 8px; }
        .conflict-meta { display: flex; gap: 8px; flex-wrap: wrap; }
        .site-tag {
          font-family: 'DM Mono', monospace; font-size: 10px;
          padding: 2px 8px; border-radius: 4px;
          background: rgba(90,110,90,0.08); color: #7a9088;
          border: 1px solid rgba(90,110,90,0.12);
        }
        .clause-tag {
          font-family: 'DM Mono', monospace; font-size: 10px;
          padding: 2px 8px; border-radius: 4px;
          background: rgba(93,138,144,0.1); color: #3d6a70;
          border: 1px solid rgba(93,138,144,0.18);
        }
        .severity-badge {
          padding: 3px 10px; border-radius: 4px;
          font-family: 'DM Mono', monospace; font-size: 10px;
          font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;
          flex-shrink: 0;
        }
        .conflict-rec {
          margin-top: 10px; padding: 10px 12px; border-radius: 8px;
          font-size: 12px; line-height: 1.5; color: #7a9088; border-left: 3px solid;
        }
        .spin-ring {
          width: 13px; height: 13px;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: white;
          border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="cd-intro">
        <div className="cd-intro-title">Multi-party conflict detector</div>
        <div className="cd-intro-sub">
          Upload multiple CTAs to detect cross-contract inconsistencies — exclusive IP double-grants, jurisdiction conflicts, payment rate mismatches.
        </div>
      </div>

      <div className="contract-list">
        {contracts.map((c) => (
          <div className="contract-item" key={c.id}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#7a9088" strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
              <path d="M4 2h6l4 4v8H4V2z" /><path d="M10 2v4h4" />
            </svg>
            <div style={{ flex: 1 }}>
              <div className="contract-item-site">{c.siteName}</div>
              <div className="contract-item-file">{c.filename}</div>
            </div>
            <div className="contract-item-date">{c.uploadedAt}</div>
            {c.id === "current"
              ? <span className="current-tag">current</span>
              : <button className="contract-remove" onClick={() => removeContract(c.id)}>✕</button>
            }
          </div>
        ))}
      </div>

      {addingContract && (
        <div className="add-panel">
          <div className="add-row">
            <div>
              <div className="add-label">Site name</div>
              <input className="add-input" placeholder="e.g. Mayo Clinic" value={newSiteName} onChange={e => setNewSiteName(e.target.value)} />
            </div>
            <div>
              <div className="add-label">CTA file</div>
              <input type="file" accept=".txt,.docx,.pdf"
                style={{ padding: "7px 12px", background: "#fafaf4", border: "1px solid rgba(90,110,90,0.18)", borderRadius: 8, color: "#7a9088", fontSize: 12, width: "100%" }}
                onChange={e => setNewFile(e.target.files?.[0] || null)} />
            </div>
            <button className="add-btn" onClick={handleAddContract} disabled={!newFile || !newSiteName.trim()}>Add</button>
          </div>
        </div>
      )}

      <div className="action-row">
        <button className="add-contract-btn" onClick={() => setAddingContract(!addingContract)}>
          {addingContract ? "Cancel" : "+ Add another contract"}
        </button>
        <button className="scan-btn" onClick={handleScan} disabled={contracts.length < 2 || scanning}>
          {scanning
            ? <><span className="spin-ring" /> Scanning for conflicts…</>
            : `Scan ${contracts.length} contracts for conflicts`
          }
        </button>
      </div>

      {!scanned && !scanning && (
        <div className="scan-ready">
          Add 2 or more contracts above, then click scan to detect cross-contract inconsistencies.<br />
          Works best with 3+ active site contracts.
        </div>
      )}

      {scanned && conflicts.length === 0 && (
        <div className="no-conflicts">
          No cross-contract conflicts detected across {contracts.length} agreements
        </div>
      )}

      {conflicts.map((c, i) => {
        const isCritical = c.severity === "critical";
        const color = isCritical ? "#b85450" : "#c9974a";
        const bg = isCritical ? "rgba(184,84,80,0.04)" : "rgba(201,151,74,0.04)";
        const border = isCritical ? "rgba(184,84,80,0.18)" : "rgba(201,151,74,0.18)";
        return (
          <div className="conflict-card" key={i} style={{ borderColor: border, background: bg }}>
            <div className="conflict-card-body">
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                  <div className="conflict-title" style={{ color }}>{c.title}</div>
                  <div className="severity-badge" style={{ background: isCritical ? "rgba(184,84,80,0.1)" : "rgba(201,151,74,0.1)", color }}>
                    {c.severity}
                  </div>
                </div>
                <div className="conflict-desc">{c.description}</div>
                <div className="conflict-meta">
                  {c.affectedSites.map(s => <span className="site-tag" key={s}>{s}</span>)}
                  <span className="clause-tag">{c.affectedClause}</span>
                </div>
                <div className="conflict-rec" style={{ background: bg, borderLeftColor: color }}>
                  <strong style={{ color }}>Fix: </strong>{c.recommendation}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
