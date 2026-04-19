"use client";

import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

interface ReviewResult {
  review_id: string;
  status: string;
  contract_type: string;
  clauses_count: number;
  risk_summary: string;
  overall_risk_level: string;
  overall_compliance: string;
  suggestions_count: number;
  needs_human_review: boolean;
}

interface DetailedResult {
  review_id: string;
  status: string;
  contract_type: string;
  clauses: Array<{ id: string; title: string; content: string; category: string }>;
  risk_findings: Array<{
    clause_id: string;
    risk_level: string;
    risk_type: string;
    description: string;
    rationale: string;
  }>;
  risk_summary: string;
  overall_risk_level: string;
  compliance_findings: Array<{
    clause_id: string;
    status: string;
    regulation: string;
    issue: string;
    recommendation: string;
  }>;
  missing_clauses: string[];
  overall_compliance: string;
  suggestions: Array<{
    clause_id: string;
    original_text: string;
    suggested_text: string;
    reason: string;
    priority: string;
  }>;
  version_diff: string;
  needs_human_review: boolean;
  errors: string[];
}

const RISK_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-800 border-red-300",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  low: "bg-blue-100 text-blue-800 border-blue-300",
  none: "bg-green-100 text-green-800 border-green-300",
};

const COMPLIANCE_COLORS: Record<string, string> = {
  compliant: "bg-green-100 text-green-800",
  non_compliant: "bg-red-100 text-red-800",
  needs_review: "bg-yellow-100 text-yellow-800",
};

export default function Home() {
  const [contractText, setContractText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [detail, setDetail] = useState<DetailedResult | null>(null);
  const [activeTab, setActiveTab] = useState("clauses");
  const [feedbackStatus, setFeedbackStatus] = useState("");

  const handleSubmit = async () => {
    if (!contractText.trim()) return;
    setLoading(true);
    setResult(null);
    setDetail(null);
    try {
      const resp = await fetch(`${API_BASE}/api/v1/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: contractText, with_human_review: true }),
      });
      const data = await resp.json();
      setResult(data);

      const detailResp = await fetch(`${API_BASE}/api/v1/review/${data.review_id}`);
      const detailData = await detailResp.json();
      setDetail(detailData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (decision: string) => {
    if (!result) return;
    try {
      await fetch(`${API_BASE}/api/v1/review/${result.review_id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewer: "审核人",
          decision,
          comments: "",
        }),
      });
      setFeedbackStatus(decision === "approve" ? "已批准" : "已驳回");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            多Agent智能合同审查系统
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            条款提取 → 风险识别 → 合规检查 → 修改建议
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：输入区域 */}
          <div>
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">合同文本输入</h2>
              <textarea
                className="w-full h-96 border rounded-lg p-4 text-sm font-mono resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请粘贴合同文本内容..."
                value={contractText}
                onChange={(e) => setContractText(e.target.value)}
              />
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {contractText.length} 字符
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !contractText.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {loading ? "审查中..." : "开始审查"}
                </button>
              </div>
            </div>
          </div>

          {/* 右侧：结果区域 */}
          <div>
            {loading && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
                <p className="mt-4 text-gray-600">
                  多Agent流水线正在审查合同...
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  条款提取 → 风险识别 → 合规检查 → 修改建议
                </p>
              </div>
            )}

            {result && !loading && (
              <div className="space-y-4">
                {/* 概览卡片 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-4">审查概览</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <div className="text-2xl font-bold text-blue-600">
                        {result.clauses_count}
                      </div>
                      <div className="text-sm text-gray-500">识别条款</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <div className="text-2xl font-bold text-orange-600">
                        {result.suggestions_count}
                      </div>
                      <div className="text-sm text-gray-500">修改建议</div>
                    </div>
                    <div
                      className={`text-center p-3 rounded border ${RISK_COLORS[result.overall_risk_level] || ""}`}
                    >
                      <div className="text-sm font-semibold">风险等级</div>
                      <div className="text-lg font-bold uppercase">
                        {result.overall_risk_level}
                      </div>
                    </div>
                    <div
                      className={`text-center p-3 rounded ${COMPLIANCE_COLORS[result.overall_compliance] || ""}`}
                    >
                      <div className="text-sm font-semibold">合规状态</div>
                      <div className="text-lg font-bold">
                        {result.overall_compliance === "compliant"
                          ? "合规"
                          : result.overall_compliance === "non_compliant"
                            ? "不合规"
                            : "待审查"}
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-gray-600">
                    {result.risk_summary}
                  </p>
                </div>

                {/* 人工审核 */}
                {result.needs_human_review && !feedbackStatus && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h3 className="font-semibold text-amber-800">
                      需要人工审核
                    </h3>
                    <p className="text-sm text-amber-700 mt-1">
                      检测到高风险条款，请人工审核后决定。
                    </p>
                    <div className="mt-3 flex gap-3">
                      <button
                        onClick={() => handleFeedback("approve")}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      >
                        批准通过
                      </button>
                      <button
                        onClick={() => handleFeedback("reject")}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        驳回
                      </button>
                    </div>
                  </div>
                )}
                {feedbackStatus && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-semibold">
                      {feedbackStatus}
                    </p>
                  </div>
                )}

                {/* 详情标签页 */}
                {detail && (
                  <div className="bg-white rounded-lg shadow">
                    <div className="border-b flex">
                      {["clauses", "risks", "compliance", "suggestions"].map(
                        (tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                              activeTab === tab
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            {tab === "clauses"
                              ? "条款"
                              : tab === "risks"
                                ? "风险"
                                : tab === "compliance"
                                  ? "合规"
                                  : "建议"}
                          </button>
                        )
                      )}
                    </div>

                    <div className="p-4 max-h-96 overflow-y-auto">
                      {activeTab === "clauses" &&
                        detail.clauses.map((c, i) => (
                          <div key={i} className="mb-3 p-3 bg-gray-50 rounded">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-sm">
                                {c.title}
                              </span>
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                {c.category}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-3">
                              {c.content}
                            </p>
                          </div>
                        ))}

                      {activeTab === "risks" &&
                        detail.risk_findings.map((r, i) => (
                          <div
                            key={i}
                            className={`mb-3 p-3 rounded border ${RISK_COLORS[r.risk_level] || ""}`}
                          >
                            <div className="flex justify-between">
                              <span className="font-medium text-sm">
                                {r.risk_type}
                              </span>
                              <span className="text-xs font-bold uppercase">
                                {r.risk_level}
                              </span>
                            </div>
                            <p className="text-sm mt-1">{r.description}</p>
                            {r.rationale && (
                              <p className="text-xs mt-1 opacity-75">
                                依据: {r.rationale}
                              </p>
                            )}
                          </div>
                        ))}

                      {activeTab === "compliance" && (
                        <>
                          {detail.missing_clauses.length > 0 && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                              <p className="font-medium text-red-800 text-sm">
                                缺失条款:
                              </p>
                              <ul className="list-disc list-inside text-sm text-red-700">
                                {detail.missing_clauses.map((m, i) => (
                                  <li key={i}>{m}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {detail.compliance_findings.map((f, i) => (
                            <div
                              key={i}
                              className={`mb-3 p-3 rounded ${COMPLIANCE_COLORS[f.status] || ""}`}
                            >
                              <p className="font-medium text-sm">{f.issue}</p>
                              <p className="text-xs mt-1">
                                法规: {f.regulation}
                              </p>
                              {f.recommendation && (
                                <p className="text-xs mt-1">
                                  建议: {f.recommendation}
                                </p>
                              )}
                            </div>
                          ))}
                        </>
                      )}

                      {activeTab === "suggestions" &&
                        detail.suggestions.map((s, i) => (
                          <div
                            key={i}
                            className="mb-3 p-3 bg-gray-50 rounded border"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-sm">
                                {s.reason}
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded ${RISK_COLORS[s.priority] || ""}`}
                              >
                                {s.priority}
                              </span>
                            </div>
                            {s.original_text && (
                              <div className="mt-2 text-sm">
                                <span className="text-red-600 line-through">
                                  {s.original_text}
                                </span>
                              </div>
                            )}
                            <div className="mt-1 text-sm text-green-700">
                              {s.suggested_text}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
