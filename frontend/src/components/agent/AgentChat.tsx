'use client'
import { useState, useRef, useEffect } from 'react'
import apiClient from '@/services/apiClient'

interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  toolsUsed?: string[]
}

function ShieldIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path d="M32 4L8 16v16c0 14.4 10.24 27.84 24 32 13.76-4.16 24-17.6 24-32V16L32 4z" fill="white" opacity="0.95"/>
      <path d="M32 8L12 18v14c0 12.4 8.64 24 20 28 11.36-4 20-15.6 20-28V18L32 8z" fill="#3B82F6" opacity="0.2"/>
      <path d="M28 32l-4-4 2-2 2 2 8-8 2 2-10 10z" fill="#3B82F6" strokeWidth="1"/>
      <text x="32" y="48" textAnchor="middle" fill="#3B82F6" fontSize="8" fontWeight="bold">DG</text>
    </svg>
  )
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'inherit' }}>
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <div key={i} style={{ fontWeight: 700, fontSize: '13px', margin: '6px 0 3px' }}>{line.slice(4)}</div>
        if (line.startsWith('## ')) return <div key={i} style={{ fontWeight: 700, fontSize: '14px', margin: '8px 0 4px' }}>{line.slice(3)}</div>
        if (line.startsWith('# ')) return <div key={i} style={{ fontWeight: 700, fontSize: '15px', margin: '8px 0 4px' }}>{line.slice(2)}</div>
        if (line.startsWith('- ') || line.startsWith('* ')) return <div key={i} style={{ paddingLeft: '12px', marginBottom: '2px' }}>&#8226; {line.slice(2)}</div>
        if (line.startsWith('**') && line.endsWith('**')) return <div key={i} style={{ fontWeight: 700 }}>{line.slice(2, -2)}</div>
        if (line === '') return <div key={i} style={{ height: '6px' }} />
        const parts = line.split(/(\*\*[^*]+\*\*)/)
        return (
          <div key={i} style={{ marginBottom: '1px' }}>
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**')
                ? <strong key={j}>{part.slice(2, -2)}</strong>
                : part
            )}
          </div>
        )
      })}
    </div>
  )
}

const SUGGESTIONS = [
  "Show platform health",
  "List critical alerts",
  "What rules do I have?",
  "Show all domains",
  "Recent failed checks",
  "Search for customer tables",
]

const INITIAL_MSG: AgentMessage = {
  role: 'assistant',
  content: "Hi! I'm **DataGuard AI**\n\nI can help you:\n- **View platform health** and quality scores\n- **List rules, alerts, and connections**\n- **Search data assets** and browse domains\n- **Analyze quality trends** and get recommendations\n\nWhat would you like to know?",
  timestamp: '2026-01-01T00:00:00.000Z'
}

export default function AgentChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<AgentMessage[]>([INITIAL_MSG])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text?: string) {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')

    const userMsg: AgentMessage = { role: 'user', content: msg, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const res = await apiClient.post('/ai/agent', { messages: history })
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.response || 'No response received.',
        timestamp: new Date().toISOString(),
        toolsUsed: res.data.tools_used
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, the AI agent is not available right now. Please check that an LLM provider (Anthropic, OpenAI, or Ollama) is configured in Settings.',
        timestamp: new Date().toISOString()
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {open && (
        <div style={{
          position: 'fixed', bottom: '80px', right: '20px', width: '400px', height: '580px',
          background: 'var(--agent-bg, #fff)', borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column', zIndex: 1000,
          border: '1px solid rgba(59,130,246,0.15)', overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px', background: 'linear-gradient(135deg, #0f172a, #1e3a5f)',
            display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(37,99,235,0.4)'
            }}><ShieldIcon size={28} /></div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>DataGuard AI</div>
              <div style={{ color: '#10b981', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                Online
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none',
              color: '#94a3b8', width: '28px', height: '28px', borderRadius: '8px',
              cursor: 'pointer', fontSize: '14px'
            }}>&#10005;</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: '8px', marginTop: '2px' }}><ShieldIcon size={20} /></div>
                )}
                <div style={{
                  maxWidth: '85%',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#f8fafc',
                  color: msg.role === 'user' ? '#fff' : '#1e293b',
                  padding: '10px 14px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  fontSize: '13px', lineHeight: '1.5',
                  border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none'
                }}>
                  {msg.role === 'assistant' ? <MarkdownText text={msg.content} /> : msg.content}
                  {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                    <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {msg.toolsUsed.map((t, j) => (
                        <span key={j} style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 500 }}>
                          {t.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldIcon size={20} /></div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '16px 16px 16px 4px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {[0, 1, 2].map(j => (
                    <div key={j} style={{
                      width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6',
                      animation: `dataguard-bounce 1.2s ease-in-out ${j * 0.2}s infinite`
                    }} />
                  ))}
                </div>
              </div>
            )}

            {messages.length === 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)} style={{
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px',
                    padding: '6px 12px', fontSize: '12px', color: '#3b82f6', cursor: 'pointer',
                    fontWeight: 500, transition: 'all 0.2s'
                  }}>{s}</button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#fff' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Ask about data quality..."
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: '12px', fontSize: '13px',
                  border: '1px solid #e2e8f0', outline: 'none', background: '#f8fafc',
                  color: '#0f172a'
                }}
              />
              <button onClick={() => send()} disabled={!input.trim() || loading} style={{
                width: '38px', height: '38px', borderRadius: '10px', border: 'none',
                background: input.trim() && !loading ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#e2e8f0',
                color: input.trim() && !loading ? '#fff' : '#94a3b8',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s', flexShrink: 0
              }}>{'↑'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button onClick={() => setOpen(!open)} style={{
        position: 'fixed', bottom: '20px', right: '20px',
        width: '60px', height: '60px', borderRadius: '18px', border: 'none',
        background: open ? 'linear-gradient(145deg, #1e3a5f, #2563eb)' : 'linear-gradient(145deg, #1a2e4a, #1d4ed8)',
        cursor: 'pointer', zIndex: 1001,
        boxShadow: '0 8px 32px rgba(29,78,216,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.25s', transform: open ? 'scale(0.9)' : 'scale(1)'
      }}>
        {open
          ? <span style={{ color: '#fff', fontSize: '22px', fontWeight: 300, lineHeight: 1 }}>&#10005;</span>
          : <ShieldIcon size={38} />}
      </button>

      <style>{`
        @keyframes dataguard-bounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  )
}
