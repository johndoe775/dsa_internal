import React, { useEffect, useRef, useState } from "react";
 
/**
 * Toggle this to false when your backend is available.
 * Backend expectations:
 *  - POST {BASE_URL}/chat/upload   (multipart/form-data) -> { files: ["fileA.pdf", ...] }
 *  - POST {BASE_URL}/chat/send     (application/json)    -> { messages: [{ role:"assistant", text:"..." }, ...] }
 */
const USE_MOCK_API = true;
const BASE_URL = "http://localhost:8080";
 
/* ----------------------------- Inline Icons ----------------------------- */
const PlusIcon = (props) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const ArrowIcon = (props) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
 
/* ----------------------------- Mini PolicyTabs -------------------------- */
function PolicyTabs({ policies, activeIndex, onChange }) {
  return (
    <div style={styles.tabs}>
      {policies.map((p, i) => (
        <button
          key={p + i}
          onClick={() => onChange(i)}
          style={{
            ...styles.tab,
            ...(i === activeIndex ? styles.tabActive : {}),
          }}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
 
/* ----------------------------- Helpers: API ----------------------------- */

async function postSubmit(url, formData) {
  if (USE_MOCK_API) {
    // Fake latency
    await new Promise((r) => setTimeout(r, 700));

    // Collect file names from the FormData for the mock reply
    const fileNames = [];
    for (const [key, val] of formData.entries()) {
      if (key === "files" && val && typeof val.name === "string") {
        fileNames.push(val.name);
      }
    }
    const prompt = formData.get("prompt") || "";
    const policy = formData.get("policy") || "";

    const reply =
      `You asked about "${policy}".\n\n` +
      `Here's a mock answer to: "${prompt}".\n` +
      (fileNames.length
        ? `I see ${fileNames.length} attachment(s): ${fileNames.join(", ")}`
        : "");

    return { messages: [{ role: "assistant", text: reply }] };
  }

  const res = await fetch(url, { method: "POST", body: formData });
  if (!res.ok) throw new Error(`Submit failed (${res.status})`);
  return res.json();
}

 
/* ----------------------------- Main Component --------------------------- */

export default function ChatbotUI({
  policies = [
    "Policy 1",
    "Policy 2",
    "Policy 3",
    "Policy 4",
    "Policy 5",
    "Policy 6",
    "Policy 7",
    "Policy 8",
  ],
}) {
  const [activePolicy, setActivePolicy] = useState(0);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hello! Select a policy above and ask your question." },
  ]);
  const [prompt, setPrompt] = useState("");
  const [attachments, setAttachments] = useState([]); // preview names of selected files
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false); // kept for UI parity; no network on select now
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const chatWindowRef = useRef(null);

  useEffect(() => {
    // Auto-scroll to bottom on new message or attachments
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages, attachments]);

  const handleUploadClick = () => fileInputRef.current?.click();

  /** No network call here.
   * Only update local preview of selected files to preserve UI behavior. */
  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setError("");
    setUploading(true);

    try {
      const names = files.map((f) => f.name);
      setAttachments((prev) => [...prev, ...names]);
    } catch (err) {
      console.error(err);
      setError(err?.message ?? "File selection failed.");
      // Optional: show message bubble for system error
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry — file selection failed. Please try again." },
      ]);
    } finally {
      setUploading(false);
      // keep the input value so files are available to send in handleSend
      // (If you want to allow re-selecting same files, you can clear it here)
      // if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /** Single send: builds FormData with files + prompt + policy and posts once */
  const handleSend = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;

    setError("");
    const policy = policies[activePolicy];

    // Append user's message immediately (optimistic UI)
    const userMsg = { role: "user", text: trimmed, policy };
    setMessages((prev) => [...prev, userMsg]);
    setPrompt("");
    setLoading(true);

    try {
      // Build multipart payload
      const form = new FormData();

      // Include selected files (from the input element)
      const inputFiles = Array.from(fileInputRef.current?.files ?? []);
      inputFiles.forEach((f) => form.append("files", f));

      // Include text fields
      form.append("prompt", trimmed);
      form.append("policy", policy);

      // Single POST
      const data = await postSubmit(`${BASE_URL}/chat/submit`, form);

      const msgs = Array.isArray(data?.messages) ? data.messages : [];
      const assistantMsgs = msgs
        .filter((m) => m && m.role === "assistant")
        .map((m) => ({
          role: "assistant",
          text: typeof m.text === "string" ? m.text : JSON.stringify(m),
        }));

      if (!assistantMsgs.length) {
        assistantMsgs.push({
          role: "assistant",
          text: "I couldn't parse the server response. Please check the API.",
        });
      }

      setMessages((prev) => [...prev, ...assistantMsgs]);
    } catch (err) {
      console.error(err);
      setError(err?.message ?? "Send failed.");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry — sending your message failed. Please try again." },
      ]);
    } finally {
      setLoading(false);
      setAttachments([]); // clear preview once used
      if (fileInputRef.current) fileInputRef.current.value = ""; // clear file input
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={styles.container}>
      <PolicyTabs
        policies={policies}
        activeIndex={activePolicy}
        onChange={setActivePolicy}
      />

      <div ref={chatWindowRef} style={styles.chatWindow}>
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={m.role === "assistant" ? styles.assistantMsg : styles.userMsg}
          >
            {m.policy ? <div style={styles.policyTag}>{m.policy}</div> : null}
            <div>{m.text}</div>
          </div>
        ))}

        {attachments.length > 0 && (
          <div style={styles.attachments}>
            {attachments.map((name, i) => (
              <span key={`${name}-${i}`} style={styles.attachmentBadge}>
                {name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={styles.controls}>
        <button
          type="button"
          onClick={handleUploadClick}
          disabled={loading}
          style={styles.uploadBtn}
          title="Attach files"
        >
          <PlusIcon /> Attach
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={handleFilesSelected}
        />

        <input
          type="text"
          placeholder="Type your question and press Enter…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading || uploading}
          style={styles.input}
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={loading || uploading || !prompt.trim()}
          style={styles.sendBtn}
          title="Send"
        >
          <ArrowIcon /> Send
        </button>
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}
    </div>
  );
}

/* ------------------------------- Styles -------------------------------- */
const styles = {
  container: { display: "flex", flexDirection: "column", gap: 8, height: "100%" },
  tabs: { display: "flex", gap: 6, borderBottom: "1px solid #eee", paddingBottom: 8 },
  tab: { padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", background: "#fafafa", cursor: "pointer" },
  tabActive: { background: "#e8f0fe", borderColor: "#94b3fd" },
  chatWindow: { flex: 1, overflowY: "auto", padding: 12, border: "1px solid #eee", borderRadius: 8 },
  assistantMsg: { background: "#f6f8fa", padding: 10, borderRadius: 6, marginBottom: 8 },
  userMsg: { background: "#fff", padding: 10, borderRadius: 6, marginBottom: 8, border: "1px solid #eee" },
  policyTag: { fontSize: 12, marginBottom: 4, color: "#555" },
  attachments: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 },
  attachmentBadge: { background: "#eef3ff", color: "#334", border: "1px solid #cfe0ff", padding: "4px 8px", borderRadius: 12, fontSize: 12 },
  controls: { display: "flex", gap: 8, alignItems: "center", marginTop: 8 },
  uploadBtn: { padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", background: "#fafafa", cursor: "pointer" },
  input: { flex: 1, padding: "8px 10px", borderRadius: 6, border: "1px solid #ddd" },
  sendBtn: { padding: "6px 10px", borderRadius: 6, border: "1px solid #2f6", background: "#2f6", color: "#fff", cursor: "pointer" },
  error: { marginTop: 10, color: "#b00020" },
};
