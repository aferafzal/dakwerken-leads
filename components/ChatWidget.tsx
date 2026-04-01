'use client'

import { useState, useEffect, useRef } from 'react'

type Message = {
  id: string
  inhoud: string
  van: 'klant' | 'ons'
  created_at: string
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'form' | 'chat'>('form')
  const [naam, setNaam] = useState('')
  const [email, setEmail] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Scroll naar laatste bericht
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Poll voor nieuwe berichten
  useEffect(() => {
    if (!conversationId) return
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/chat/message?conversation_id=${conversationId}`)
      if (res.ok) {
        const data: Message[] = await res.json()
        setMessages(data)
      }
    }, 4000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [conversationId])

  async function startConversation(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/chat/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ naam, email }),
      })
      if (!res.ok) throw new Error()
      const { id } = await res.json()
      setConversationId(id)
      setStep('chat')
    } catch {
      setError('Kon gesprek niet starten. Probeer opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || !conversationId) return
    const tekst = input.trim()
    setInput('')
    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, inhoud: tekst, van: 'klant' }),
      })
      if (res.ok) {
        const msg: Message = { id: Date.now().toString(), inhoud: tekst, van: 'klant', created_at: new Date().toISOString() }
        setMessages((prev) => [...prev, msg])
      }
    } catch {
      // stil falen
    }
  }

  return (
    <>
      {/* Chat bubble knop — linksonder */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
        aria-label="Open chat"
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chat paneel */}
      {open && (
        <div className="fixed bottom-24 left-6 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">D</div>
            <div>
              <p className="font-semibold text-sm">Dakwerken Expert</p>
              <p className="text-xs text-blue-100">Meestal antwoord binnen 2u</p>
            </div>
          </div>

          {step === 'form' ? (
            /* Stap 1: naam + e-mail */
            <form onSubmit={startConversation} className="p-4 space-y-3">
              <p className="text-sm text-gray-600">Stel uw vraag — we antwoorden zo snel mogelijk.</p>
              <input
                type="text"
                placeholder="Uw naam *"
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
                required
                minLength={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
              <input
                type="email"
                placeholder="E-mailadres (optioneel)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? 'Bezig…' : 'Start gesprek →'}
              </button>
            </form>
          ) : (
            /* Stap 2: berichten */
            <>
              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-64">
                {messages.length === 0 && (
                  <p className="text-xs text-gray-400 text-center">
                    Hallo {naam}! Stel gerust uw vraag.
                  </p>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.van === 'klant' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                        m.van === 'klant'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                      }`}
                    >
                      {m.inhoud}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={sendMessage} className="border-t border-gray-100 p-3 flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Typ een bericht…"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  )
}
