"use client";

import { useState, useRef, useEffect } from "react";
import { chatWithContract } from "@/lib/api";

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
      const data = await chatWithContract(question, context);
      setMessages((prev) => [...prev, {
        role: "ai",
        text: data.answer || "No response received.",
        ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "ai",
        text: "Connection error. Please check your backend.",
        ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
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
        .chat-suggestions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          padding: 0 0 16px;
          border-bottom: 1px solid rgba(90,110,90,0.1);
          margin-bottom: 16px;
        }
        .suggestion-chip {
          padding: 6px 14px;
          border-radius: 20px;
          border: 1px solid rgba(90,110,90,0.18);
          background: transparent;
          font-size: 12px;
          color: #7a9088;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'DM Sans', sans-serif;
        }
        .suggestion-chip:hover {
          border-color: rgba(74,122,90,0.4);
          color: #4a7a5a;
          background: rgba(138,184,154,0.08);
        }
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 4px 0 16px;
          scrollbar-width: thin;
          scrollbar-color: rgba(90,110,90,0.15) transparent;
        }
        .msg-row {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }
        .msg-row.user { flex-direction: row-reverse; }
        .msg-avatar {
          width: 30px; height: 30px;
          border-radius: 8px;
          display: grid; place-items: center;
          flex-shrink: 0;
          margin-top: 2px;
          font-size: 13px;
        }
        .msg-avatar.ai {
          background: rgba(138,184,154,0.15);
          border: 1px solid rgba(138,184,154,0.25);
          color: #4a7a5a;
        }
        .msg-avatar.user {
          background: rgba(93,138,144,0.12);
          border: 1px solid rgba(93,138,144,0.2);
          color: #3d6a70;
        }
        .msg-bubble {
          max-width: 78%;
          padding: 12px 15px;
          border-radius: 12px;
          font-size: 13.5px;
          line-height: 1.65;
          white-space: pre-wrap;
        }
        .msg-bubble.ai {
          background: #f0efdf;
          border: 1px solid rgba(90,110,90,0.12);
          color: #2d3d38;
          border-top-left-radius: 4px;
        }
        .msg-bubble.user {
          background: #4a7a5a;
          color: white;
          border-top-right-radius: 4px;
        }
        .msg-ts {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: #b0bfba;
          margin-top: 4px;
        }
        .msg-row.user .msg-ts { text-align: right; }
        .typing-indicator {
          display: flex;
          gap: 4px;
          align-items: center;
          padding: 4px 0;
        }
        .typing-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #8ab89a;
          animation: typing 1s infinite;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.15s; }
        .typing-dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes typing { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
        .chat-input-row {
          display: flex;
          gap: 8px;
          padding-top: 14px;
          border-top: 1px solid rgba(90,110,90,0.1);
        }
        .chat-input {
          flex: 1;
          padding: 11px 14px;
          background: #f0efdf;
          border: 1px solid rgba(90,110,90,0.18);
          border-radius: 10px;
          color: #2d3d38;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          outline: none;
          transition: border-color 0.15s;
        }
        .chat-input:focus { border-color: rgba(74,122,90,0.45); }
        .chat-input::placeholder { color: #b0bfba; }
        .chat-send-btn {
          padding: 11px 20px;
          background: #4a7a5a;
          border: none;
          border-radius: 10px;
          color: white;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .chat-send-btn:hover:not(:disabled) { background: #3d6a70; }
        .chat-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      <div className="chat-suggestions">
        {suggestions.map((s) => (
          <button key={s} className="suggestion-chip" onClick={() => setQuestion(s)}>{s}</button>
        ))}
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`msg-row ${msg.role}`}>
            <div className={`msg-avatar ${msg.role}`}>
              {msg.role === "ai" ? "⚖" : "✦"}
            </div>
            <div>
              <div className={`msg-bubble ${msg.role}`}>{msg.text}</div>
              <div className="msg-ts">{msg.ts}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="msg-row ai">
            <div className="msg-avatar ai">⚖</div>
            <div className="msg-bubble ai">
              <div className="typing-indicator">
                <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

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
