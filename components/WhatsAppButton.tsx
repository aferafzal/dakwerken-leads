'use client'

import { MessageCircle } from 'lucide-react'

interface WhatsAppButtonProps {
  phone: string
  message?: string
}

export default function WhatsAppButton({
  phone,
  message = 'Hallo, ik heb een vraag over dakwerken.',
}: WhatsAppButtonProps) {
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat via WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#1ebe5d]"
    >
      <MessageCircle className="h-6 w-6" />
      <span className="hidden text-sm font-semibold sm:inline">WhatsApp</span>
    </a>
  )
}
