'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface PerceelSelectie {
  capakey:        string | null
  perceelnummer:  string | null
  afdeling:       string | null
  aantalAdressen: number | null
  oppervlakte:    number | null
  gemeente:       string | null
  error?:         string
}

interface DakKaartProps {
  lat: number
  lng: number
  initieleSelectie?: PerceelSelectie | null
  onPerceelSelect: (data: PerceelSelectie) => void
}

export default function DakKaart({ lat, lng, initieleSelectie, onPerceelSelect }: DakKaartProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const callbackRef = useRef(onPerceelSelect)
  callbackRef.current = onPerceelSelect

  const [klikBezig, setKlikBezig] = useState(false)
  const [selectie, setSelectie] = useState<PerceelSelectie | null>(initieleSelectie ?? null)
  const [fout, setFout] = useState<string | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 19,
      maxZoom: 21,
      zoomControl: true,
    })
    mapInstance.current = map

    // Luchtfoto achtergrond
    L.tileLayer.wms('https://geo.api.vlaanderen.be/OMWRGBMRVL/wms', {
      layers: 'Ortho',
      format: 'image/jpeg',
      transparent: false,
      maxZoom: 21,
      attribution: '© Vlaanderen',
    }).addTo(map)

    // Kadastrale perceelgrenzen
    L.tileLayer.wms('https://geo.api.vlaanderen.be/GRB/wms', {
      layers: 'GRB_ADP',
      format: 'image/png',
      transparent: true,
      maxZoom: 21,
      attribution: '© GRB',
    }).addTo(map)

    // Adresmarker
    L.circleMarker([lat, lng], {
      radius: 8,
      color: '#ffffff',
      fillColor: '#16a34a',
      fillOpacity: 0.9,
      weight: 2,
    }).addTo(map).bindTooltip('Uw adres', {
      permanent: true,
      direction: 'top',
      offset: [0, -10],
      className: 'leaflet-tooltip-adres',
    })

    let selectieMarker: L.CircleMarker | null = null

    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng

      // Verwijder vorige selectie
      if (selectieMarker) map.removeLayer(selectieMarker)

      // Nieuwe selectiemarker
      selectieMarker = L.circleMarker([clickLat, clickLng], {
        radius: 12,
        color: '#f59e0b',
        fillColor: '#fbbf24',
        fillOpacity: 0.5,
        weight: 3,
        dashArray: '6 4',
      }).addTo(map)

      setKlikBezig(true)
      setFout(null)
      setSelectie(null)

      try {
        const res = await fetch(
          `/api/dakmeting?click_lat=${clickLat}&click_lng=${clickLng}`
        )
        if (!res.ok) {
          setFout('Kon perceelgegevens niet ophalen')
          setKlikBezig(false)
          return
        }
        const data: PerceelSelectie = await res.json()

        if (data.error) {
          setFout(data.error)
          // Verwijder marker als geen perceel gevonden
          if (selectieMarker) map.removeLayer(selectieMarker)
          selectieMarker = null
        } else {
          setSelectie(data)
          callbackRef.current(data)

          // Marker aanpassen naar bevestigd
          if (selectieMarker) {
            selectieMarker.setStyle({
              color: '#16a34a',
              fillColor: '#22c55e',
              fillOpacity: 0.6,
              dashArray: undefined,
            })
          }
        }
      } catch {
        setFout('Netwerkfout bij ophalen perceelgegevens')
        if (selectieMarker) map.removeLayer(selectieMarker)
        selectieMarker = null
      }

      setKlikBezig(false)
    })

    return () => {
      map.remove()
      mapInstance.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mt-2 rounded-xl border border-green-200 bg-green-50 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-green-600 flex items-center gap-2">
        <svg className="h-4 w-4 text-white shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <span className="text-xs font-semibold text-white">
          Klik op uw perceel op de kaart
        </span>
      </div>

      {/* Kaart */}
      <div ref={mapRef} className="h-[350px] w-full" />

      {/* Laden indicator */}
      {klikBezig && (
        <div className="px-3 py-2 bg-amber-50 text-amber-800 text-xs flex items-center gap-2">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
          Perceelgegevens ophalen…
        </div>
      )}

      {/* Foutmelding */}
      {fout && (
        <div className="px-3 py-2 bg-red-50 text-red-700 text-xs">
          {fout}
        </div>
      )}

      {/* Geselecteerd perceel info */}
      {selectie && !selectie.error && (
        <div className="grid grid-cols-2 gap-px bg-green-100 text-xs">
          {selectie.oppervlakte && (
            <div className="bg-white px-3 py-2">
              <p className="text-gray-500 mb-0.5">Geschatte dakoppervlakte</p>
              <p className="font-bold text-green-700 text-base">±{selectie.oppervlakte} m²</p>
            </div>
          )}
          {selectie.afdeling && (
            <div className="bg-white px-3 py-2">
              <p className="text-gray-500 mb-0.5">Kadastrale afdeling</p>
              <p className="font-semibold text-gray-800">{selectie.afdeling}</p>
            </div>
          )}
          {selectie.perceelnummer && (
            <div className="bg-white px-3 py-2">
              <p className="text-gray-500 mb-0.5">Perceelnummer</p>
              <p className="font-semibold text-gray-800">{selectie.perceelnummer}</p>
            </div>
          )}
          {selectie.aantalAdressen && selectie.aantalAdressen > 1 && (
            <div className="bg-white px-3 py-2">
              <p className="text-gray-500 mb-0.5">Adressen op perceel</p>
              <p className="font-semibold text-gray-800">{selectie.aantalAdressen}</p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <p className="px-3 py-1.5 text-[10px] text-green-700 bg-green-50">
        {selectie && !selectie.error
          ? '✓ Perceel geselecteerd · Luchtfoto & kadaster © Vlaanderen'
          : 'Luchtfoto & kadaster © Vlaanderen · Klik op het juiste perceel'}
      </p>

      {/* Custom tooltip styling */}
      <style jsx global>{`
        .leaflet-tooltip-adres {
          background: #16a34a;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 600;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .leaflet-tooltip-adres::before {
          border-top-color: #16a34a;
        }
      `}</style>
    </div>
  )
}
