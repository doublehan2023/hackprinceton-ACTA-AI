"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "ai";
  text: string;
  ts: string;
};

interface Props {
  context: string;
}

export default function ChatBox({ context }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "I've analyzed your Clinical Trial Agreement. Ask me about any clause, risk area, or ACTA compliance question — I'll give you precise legal guidance.",
      ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!question.trim() || loading) return;

    const userMsg: Message = {
      role: "user",
      text: question,
      ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: data.answer || "No response received.",
          ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "❌ Connection error. Please check your backend.",
          ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Explain the indemnification clause",
    "Is our IP ownership ACTA-compliant?",
    "What's the publication rights risk?",
    "Summarize the critical issues",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)", minHeight: 500 }}>
      <style>{`
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 4px 0 16px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.08) transparent;
        }

        .msg-row {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }
        .msg-row.user { flex-direction: row-reverse; }

        .msg-avatar {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          font-size: 14px;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .msg-avatar.ai { background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.2); }
        .msg-avatar.user { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); }

        .msg-bubble {
          max-width: 78%;
          padding: 12px 15px;
          border-radius: 12px;
          font-size: 13.5px;
          line-height: 1.65;
          white-space: pre-wrap;
        }
        .msg-bubble.ai {
          background: #0d1422;
          border: 1px solid rgba(255,255,255,0.07);
          color: #cbd5e1;
          border-top-left-radius: 4px;
        }
        .msg-bubble.user {
          background: #1d4ed8;
          color: white;
          border-top-right-radius: 4px;
        }

        .msg-ts {
          font-family: var(--font-mono, monospace);
          font-size: 10px;
          color: #334155;
          margin-top: 4px;
        }
        .msg-row.user .msg-ts { text-align: right; }

        .suggestions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          padding: 12px 0;
          border-top: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          margin-bottom: 12px;
        }
        .suggestion-chip {
          padding: 6px 12px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.08);
          background: transparent;
          font-size: 12px;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s;
          font-family: var(--font-display, sans-serif);
        }
        .suggestion-chip:hover {
          border-color: rgba(59,130,246,0.4);
          color: #93c5fd;
          background: rgba(59,130,246,0.06);
        }

        .chat-input-row {
          display: flex;
          gap: 8px;
          padding-top: 12px;
        }
        .chat-input {
          flex: 1;
          padding: 11px 14px;
          background: #0d1422;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: #f1f5f9;
          font-family: var(--font-display, sans-serif);
          font-size: 13px;
          outline: none;
          transition: border-color 0.15s;
        }
        .chat-input:focus { border-color: rgba(59,130,246,0.5); }
        .chat-input::placeholder { color: #334155; }

        .chat-send-btn {
          padding: 11px 18px;
          background: #1d4ed8;
          border: none;
          border-radius: 10px;
          color: white;
          font-family: var(--font-display, sans-serif);
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .chat-send-btn:hover:not(:disabled) { background: #1e40af; }
        .chat-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .typing-indicator {
          display: flex;
          gap: 4px;
          align-items: center;
          padding: 4px 0;
        }
        .typing-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #3b82f6;
          animation: typing 1s infinite;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.15s; }
        .typing-dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes typing { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
      `}</style>

      {/* Quick suggestion chips */}
      <div className="suggestions">
        {suggestions.map((s) => (
          <button key={s} className="suggestion-chip" onClick={() => { setQuestion(s); }}>
            {s}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`msg-row ${msg.role}`}>
            <div className={`msg-avatar ${msg.role}`}>
              {msg.role === "ai" ? "⚖️" : "👤"}
            </div>
            <div>
              <div className={`msg-bubble ${msg.role}`}>{msg.text}</div>
              <div className="msg-ts">{msg.ts}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="msg-row ai">
            <div className="msg-avatar ai">⚖️</div>
            <div className="msg-bubble ai">
              <div className="typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-row">
        <input
          className="chat-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about clauses, risks, or ACTA compliance…"
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button className="chat-send-btn" onClick={sendMessage} disabled={loading || !question.trim()}>
          Send →
        </button>
      </div>
    </div>
  );
}