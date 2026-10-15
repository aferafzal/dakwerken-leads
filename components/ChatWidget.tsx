'use client'

import { useState, useEffect, useRef } from 'react'

type Message = {
  id: string
  inhoud: string
  van: 'klant' | 'ons'
  created_at: string
}

interface Props {
  open: boolean
  onClose: () => void
}

// Chatpaneel — geopend vanuit de ContactKnop. Blijft gemount zodat een
// lopend gesprek bewaard blijft als het paneel even dicht gaat.
export default function ChatWidget({ open, onClose }: Props) {
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
      setError('Het gesprek kon niet starten. Probeer het opnieuw of stuur ons een WhatsApp.')
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
    <div
      role="dialog"
      aria-label="Chat met Dakwerken Oost-Vlaanderen"
      className={`w-80 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl ${open ? 'flex' : 'hidden'}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 bg-navy px-4 py-3 text-white">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Dakwerken Oost-Vlaanderen</p>
          <p className="text-xs text-white/75">Meestal antwoord binnen 2 uur</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluit de chat"
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
        >
          <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {step === 'form' ? (
        /* Stap 1: naam + e-mail */
        <form onSubmit={startConversation} className="space-y-3 p-4">
          <p className="text-sm text-gray-600">Stel uw vraag. We antwoorden zo snel mogelijk.</p>
          <input
            type="text"
            aria-label="Uw naam"
            placeholder="Uw naam *"
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            required
            minLength={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
          />
          <input
            type="email"
            aria-label="Uw e-mailadres (optioneel)"
            placeholder="E-mailadres (optioneel)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
          />
          {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-navy py-2.5 text-sm font-semibold text-white hover:bg-navy-light disabled:opacity-60"
          >
            {loading ? 'Bezig…' : 'Start gesprek →'}
          </button>
        </form>
      ) : (
        /* Stap 2: berichten */
        <>
          <div className="max-h-64 flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {messages.length === 0 && (
              <p className="text-center text-xs text-gray-600">
                Hallo {naam}! Stel gerust uw vraag.
              </p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.van === 'klant' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    m.van === 'klant'
                      ? 'rounded-br-sm bg-navy text-white'
                      : 'rounded-bl-sm bg-gray-100 text-gray-900'
                  }`}
                >
                  {m.inhoud}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={sendMessage} className="flex gap-2 border-t border-gray-100 p-3">
            <input
              type="text"
              aria-label="Uw bericht"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Typ een bericht…"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-navy"
            />
            <button
              type="submit"
              aria-label="Verstuur"
              className="rounded-lg bg-navy px-3 py-2 text-white hover:bg-navy-light"
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </>
      )}
    </div>
  )
}
