'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type KaartPunt = {
  id: string
  lat: number
  lng: number
  titel: string
  regel: string
  status: string
  statusLabel: string
}

// Kleur per opvolgstatus (zelfde betekenis als de badges in de lijst)
export const SPELD_KLEUR: Record<string, string> = {
  nieuw: '#f97316',
  gecontacteerd: '#0284c7',
  doorgestuurd: '#4f46e5',
  offerte: '#7c3aed',
  gewonnen: '#059669',
  verloren: '#6b7280',
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export default function AanvragenKaart({ punten, hoogte = 'h-[70vh]' }: { punten: KaartPunt[]; hoogte?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const kaart = useRef<L.Map | null>(null)
  const laag = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!ref.current || kaart.current) return
    const map = L.map(ref.current, { center: [51.05, 3.75], zoom: 10, maxZoom: 20 })
    kaart.current = map
    const straten = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap',
    }).addTo(map)
    const foto = L.tileLayer.wms('https://geo.api.vlaanderen.be/OMWRGBMRVL/wms', {
      layers: 'Ortho', format: 'image/jpeg', transparent: false, maxZoom: 20, attribution: '© Digitaal Vlaanderen',
    })
    L.control.layers({ Kaart: straten, Luchtfoto: foto }, undefined, { position: 'topright' }).addTo(map)
    laag.current = L.layerGroup().addTo(map)
    return () => { map.remove(); kaart.current = null }
  }, [])

  useEffect(() => {
    const map = kaart.current, groep = laag.current
    if (!map || !groep) return
    groep.clearLayers()
    for (const p of punten) {
      L.circleMarker([p.lat, p.lng], {
        radius: 9, color: '#ffffff', weight: 2, fillColor: SPELD_KLEUR[p.status] ?? '#0f172a', fillOpacity: 1,
      })
        .bindPopup(
          `<div style="font:14px/1.4 Inter,system-ui,sans-serif;min-width:180px">` +
          `<strong>${esc(p.titel)}</strong><br><span style="color:#475569">${esc(p.regel)}</span><br>` +
          `<span style="display:inline-block;margin:6px 0;padding:1px 8px;border-radius:999px;background:${SPELD_KLEUR[p.status] ?? '#0f172a'};color:#fff;font-size:12px;font-weight:600">${esc(p.statusLabel)}</span><br>` +
          `<a href="/dashboard/aanvraag/${p.id}" style="color:#0f172a;font-weight:700">Aanvraag openen →</a></div>`,
        )
        .addTo(groep)
    }
    if (punten.length === 1) map.setView([punten[0].lat, punten[0].lng], 16)
    else if (punten.length > 1) map.fitBounds(L.latLngBounds(punten.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 15 })
  }, [punten])

  return <div ref={ref} className={`${hoogte} w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100`} role="region" aria-label="Kaart met aanvragen" />
}
