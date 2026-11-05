'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { archiveer } from '../../acties'
import WisDialoog from '../../WisDialoog'

/** Archiveren of terugzetten, en definitief wissen */
export default function AanvraagBeheer({ id, gearchiveerd, controlekamer }: { id: string; gearchiveerd: boolean; controlekamer: boolean }) {
  const router = useRouter()
  const [wisOpen, setWisOpen] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const [bezig, start] = useTransition()

  const wissel = () => start(async () => {
    setFout(null)
    const r = await archiveer([id], gearchiveerd)
    if (r.ok) router.refresh(); else setFout(r.fout)
  })

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {controlekamer && (
          <button type="button" disabled={bezig} onClick={wissel}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-900 hover:border-gray-500 disabled:opacity-60">
            {gearchiveerd ? <ArchiveRestore className="h-4 w-4" aria-hidden /> : <Archive className="h-4 w-4" aria-hidden />}
            {gearchiveerd ? 'Terugzetten uit archief' : 'Archiveren'}
          </button>
        )}
        <button type="button" onClick={() => setWisOpen(true)}
          className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50">
          <Trash2 className="h-4 w-4" aria-hidden />Definitief wissen
        </button>
      </div>
      {fout && <p role="alert" className="text-sm text-red-700">{fout}</p>}
      <WisDialoog ids={[id]} open={wisOpen} onSluit={() => setWisOpen(false)} onGewist={() => router.replace('/dashboard')} />
    </div>
  )
}
