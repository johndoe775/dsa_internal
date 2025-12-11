
import React, { useEffect, useRef, useState } from 'react'

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

type Msg = { role: 'user'|'assistant'; text: string; policy?: string }

export default function ChatbotUI({ policies = ["Definitions & Concepts",
            "Policies & Compliance",
            "Data Access & Security",
            "Roles & Responsibilities",
            "Data Quality & Usage",
            "Classification & Tagging",
            "Security & Compliance",
            "Contextual Examples"] }: { policies?: string[] }) {
  const [activePolicy, setActivePolicy] = useState(0)
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', text: 'Hello! Select a policy above and ask your question.' }
  ])

  const [prompt, setPrompt] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])           // <-- store File objects
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fileInputRef = useRef<HTMLInputElement|null>(null)
  const chatWindowRef = useRef<HTMLDivElement|null>(null)

  useEffect(() => {
    if (chatWindowRef.current) chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight
  }, [messages, attachments])

  const handleUploadClick = () => fileInputRef.current?.click()

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setError('')
    setAttachments(prev => [...prev, ...files])                        // <-- keep File[]
  }

  const handleSend = async () => {
    const trimmed = prompt.trim()
    if (!trimmed || loading) return
    setError('')

    const policy = policies[activePolicy]
    const userMsg: Msg = { role: 'user', text: trimmed, policy }
    setMessages(prev => [...prev, userMsg])
    setPrompt('')
    setLoading(true)

    try {
      // Build multipart/form-data in ONE request
      const form = new FormData()
      form.append('policy', policy)
      form.append('query', trimmed)

      // Optional: If your backend expects `question` instead of `prompt`
      // form.append('question', `${policy}: ${trimmed}`)

      // Append files as "files" array (backend should expect "files")
      attachments.forEach(file => form.append('files', file, file.name))

      const res = await fetch(`${BASE_URL}/qna`, {
        method: 'POST',
        body: form,                                                   // <-- DO NOT set Content-Type manually
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      // Expect backend to return messages or an answer
      const answer: string =
        data?.answer ??
        (Array.isArray(data?.messages)
          ? (data.messages.find((m: any) => m.role === 'assistant')?.text ?? 'No answer returned.')
          : 'No answer returned.')

      setMessages(prev => [...prev, { role: 'assistant', text: answer }])
    } catch (err: any) {
      console.error(err)
      setError(err?.message ?? 'Send failed')
      setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry — sending your message failed. Please try again.' }])
    } finally {
      setLoading(false)
      setAttachments([])                                             // clear attachments after send
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const removeAttachment = (i: number) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== i))
  }

  return (
    <>
      <div className="tabs">
        {policies.map((p, i) => (
          <div
            key={i}
            className={`tab ${i===activePolicy ? 'tabActive' : ''}`}
            onClick={() => setActivePolicy(i)}
            role="button"
            aria-selected={i===activePolicy}
            tabIndex={0}
          >
            {p}
          </div>
        ))}
      </div>

      <div className="chatWindow" ref={chatWindowRef} aria-live="polite">
        {messages.map((m, idx) => (
          <div key={idx} className={m.role === 'assistant' ? 'assistantMsg' : 'userMsg'}>
            {m.policy ? <div className="policyTag">{m.policy}</div> : null}
            {m.text}
          </div>
        ))}
        {attachments.length > 0 && (
          <div className="attachments">
            {attachments.map((file, i) => (
              <span key={i} className="attachmentBadge" title={file.name}>
                {file.name}
                <button className="removeBadge" onClick={() => removeAttachment(i)} aria-label={`Remove ${file.name}`}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="controls">
        <button className="uploadBtn" onClick={handleUploadClick}>Attach</button>
        <input type="file" multiple hidden ref={fileInputRef} onChange={handleFilesSelected} />
        <input
          className="input"
          placeholder="Type your question and press Enter"
          value={prompt}
          onChange={e=>setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button className="sendBtn" onClick={handleSend} disabled={loading}>
          {loading ? 'Sending…' : 'Send'}
        </button>
      </div>

      {error ? <div className="error">{error}</div> : null}
    </>
  )
}
