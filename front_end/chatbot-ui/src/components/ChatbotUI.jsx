
import React, { useRef, useState } from "react";
import PolicyTabs from "./PolicyTabs";
import plusIcon from "../assets/plus.svg";
import arrowIcon from "../assets/arrow.svg";
import "../styles/chatbot.css";

/**
 * Copilot-like Chatbot UI
 * - Top: 8 policies in two rows
 * - Middle: conversation area
 * - Bottom: prompt input with + upload and → send
 */
export default function ChatbotUI({
  policies = [
    "Policy 1", "Policy 2", "Policy 3", "Policy 4",
    "Policy 5", "Policy 6", "Policy 7", "Policy 8",
  ],
  onSend = (prompt, activePolicy, attachments) => {
    console.log("SEND", { prompt, activePolicy, attachments });
  },
  onUpload = (files) => {
    console.log("UPLOAD", files);
  },
}) {
  const [activePolicy, setActivePolicy] = useState(0);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hello! Select a policy above and ask your question." },
  ]);
  const [prompt, setPrompt] = useState("");
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    setAttachments(files);
    onUpload?.(files);
  };

  const handleSend = () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    const userMsg = { role: "user", text: trimmed, policy: policies[activePolicy] };
    setMessages((prev) => [...prev, userMsg]);

    onSend?.(trimmed, policies[activePolicy], attachments);

    // Simulate assistant echo (remove in real integration)
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "assistant", text: `Acknowledged under: ${policies[activePolicy]}` }]);
    }, 300);

    setPrompt("");
    setAttachments([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="chatbot-container">
      {/* Policies (two rows) */}
      <PolicyTabs
        policies={policies}
        activeIndex={activePolicy}
        onChange={setActivePolicy}
      />

      {/* Conversation */}
      <div className="chat-window" aria-live="polite">
        {messages.map((m, idx) => (
          <div key={idx} className={`msg ${m.role}`}>
            <div className="bubble">
              {m.policy ? <div className="badge">{m.policy}</div> : null}
              <div>{m.text}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Prompt input */}
      <div className="composer">
        <button className="icon-button" title="Upload" onClick={handleUploadClick} aria-label="Upload">
          <img src={plusIcon} alt="Upload" />
        </button>
        <input
          type="file"
          multiple
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFilesSelected}
        />
        <textarea
          className="prompt-input"
          rows={1}
          placeholder="Type your prompt..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button className="send-button" title="Send" onClick={handleSend} aria-label="Send">
          <img src={arrowIcon} alt="Send" />
        </button>
      </div>

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="attachments">
          {attachments.map((f, i) => (
            <div key={i} className="chip" title={f.name}>{f.name}</div>
          ))}
        </div>
      )}
    </div>
  );
}
