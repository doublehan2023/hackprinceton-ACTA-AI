"use client";

import { useState } from "react";
import { analyzeCTA } from "@/lib/api";

export default function UploadZone() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFile = async (file: File) => {
    setLoading(true);

    const text = await file.text(); // works for .txt files first

    try {
      const res = await analyzeCTA(text, file.name);
      setResult(res);
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    }

    setLoading(false);
  };

  return (
    <div style={{ marginTop: 30 }}>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        style={{
          border: "2px dashed #aaa",
          padding: 40,
          borderRadius: 10,
          textAlign: "center",
          cursor: "pointer",
        }}
      >
        <input
          type="file"
          hidden
          id="fileInput"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        <label htmlFor="fileInput" style={{ cursor: "pointer" }}>
          Drag & Drop CTA file here or click to upload
        </label>
      </div>

      {loading && <p style={{ marginTop: 20 }}>Analyzing CTA...</p>}

      {result && (
        <div style={{ marginTop: 20 }}>
          <h3>Analysis Result</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}