"use client";

import { useState } from "react";
import RedlineViewer from "@/app/components/RedlineViewer";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // =========================
      // STEP 1: Upload file to backend
      // =========================
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("http://127.0.0.1:8000/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error(await uploadRes.text());
      }

      const uploadData = await uploadRes.json();

      // =========================
      // STEP 2: Extract text (temporary frontend parsing)
      // =========================
      const text = await file.text();

      // =========================
      // STEP 3: Send for AI analysis
      // =========================
      const analyzeRes = await fetch("http://127.0.0.1:8000/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: uploadData.filename || file.name,
          text: text,
        }),
      });

      if (!analyzeRes.ok) {
        throw new Error(await analyzeRes.text());
      }

      const analyzeData = await analyzeRes.json();

      setResult(analyzeData);
    } catch (err: any) {
      console.error("Upload/Analyze error:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // WINNING FEATURE: RISK SCORE
  // =========================
  const riskScore =
    result?.metrics?.critical >= 3
      ? 90
      : result?.metrics?.critical >= 1
      ? 70
      : 30;

  return (
    <div style={{ padding: 40, maxWidth: 900, margin: "0 auto" }}>
      
      {/* HEADER */}
      <h1 style={{ fontSize: 30, fontWeight: 800 }}>
        ⚖️ ACTA AI — Contract Intelligence System
      </h1>

      <p style={{ color: "#666", marginTop: 5 }}>
        Upload a Clinical Trial Agreement and get AI-powered legal risk + redline analysis.
      </p>

      {/* FILE INPUT */}
      <div style={{ marginTop: 25 }}>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>

      {/* BUTTON */}
      <button
        onClick={uploadFile}
        disabled={!file || loading}
        style={{
          marginTop: 15,
          padding: "10px 18px",
          background: loading ? "#555" : "#111",
          color: "white",
          borderRadius: 8,
          cursor: "pointer",
          border: "none",
        }}
      >
        {loading ? "🤖 AI Analyzing..." : "Upload & Analyze"}
      </button>

      {/* LOADING STATE */}
      {loading && (
        <div style={{ marginTop: 20, color: "#555" }}>
          🧠 Reading clauses... <br />
          ⚖️ Detecting legal risks... <br />
          🔴 Generating redlines...
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div style={{ marginTop: 20, color: "red" }}>
          ❌ {error}
        </div>
      )}

      {/* RESULTS */}
      {result && (
        <div style={{ marginTop: 40 }}>

          {/* RISK SCORE CARD (IMPORTANT FOR HACKATHON WIN) */}
          <div
            style={{
              background: "#111",
              color: "white",
              padding: 20,
              borderRadius: 12,
              marginBottom: 20,
            }}
          >
            <h3>⚠️ AI Risk Score</h3>
            <h1 style={{ fontSize: 36 }}>{riskScore}/100</h1>
          </div>

          {/* EXECUTIVE SUMMARY */}
          {result.summary && (
            <div
              style={{
                marginTop: 20,
                padding: 20,
                borderRadius: 12,
                background: "#0f172a",
                color: "white",
              }}
            >
              <h2 style={{ marginBottom: 10 }}>🧠 Executive Summary</h2>
              <p style={{ whiteSpace: "pre-wrap", color: "#cbd5e1" }}>
                {result.summary}
              </p>
            </div>
          )}

          {/* METRICS */}
          <div style={{ marginTop: 20 }}>
            <h3>📊 Metrics</h3>
            <ul>
              <li>Critical: {result.metrics?.critical}</li>
              <li>Minor: {result.metrics?.minor}</li>
              <li>Aligned: {result.metrics?.aligned}</li>
            </ul>
          </div>

          {/* REDLINES (CORE FEATURE) */}
          <h2 style={{ marginTop: 30 }}>🔴 AI Redline Report</h2>

          {result.clauses ? (
            <RedlineViewer redlines={result.clauses} />
          ) : (
            <p>No redlines generated</p>
          )}

        </div>
      )}
    </div>
  );
}