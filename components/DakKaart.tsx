'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Hoogte3D } from '@/app/api/dakmeting/route'

export interface PerceelSelectie {
  capakey:         string | null
  perceelnummer:   string | null
  afdeling:        string | null
  aantalAdressen:  number | null
  oppervlakte:     number | null
  dakOppervlak:    number | null
  gemeente:        string | null
  hoogte3d:        Hoogte3D | null
  perceelGrenzen:  [number, number][] | null
  gebouwGrenzen:   [number, number][] | null
  error?:          string
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

    // Kadastrale perceelgrenzen (achtergrond — alle percelen)
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

    // Polygonen voor geselecteerd perceel/gebouw
    let perceelPolygon: L.Polygon | null = null
    let gebouwPolygon: L.Polygon | null = null
    let selectieMarker: L.CircleMarker | null = null

    function clearOverlays() {
      if (perceelPolygon) { map.removeLayer(perceelPolygon); perceelPolygon = null }
      if (gebouwPolygon) { map.removeLayer(gebouwPolygon); gebouwPolygon = null }
      if (selectieMarker) { map.removeLayer(selectieMarker); selectieMarker = null }
    }

    function drawOverlays(data: PerceelSelectie) {
      // Perceelomlijning — gele stippellijn
      if (data.perceelGrenzen && data.perceelGrenzen.length > 2) {
        perceelPolygon = L.polygon(
          data.perceelGrenzen as L.LatLngExpression[],
          {
            color: '#f59e0b',
            weight: 3,
            dashArray: '8 5',
            fillColor: '#fbbf24',
            fillOpacity: 0.08,
          }
        ).addTo(map)
      }

      // Gebouwcontour — groene lijn
      if (data.gebouwGrenzen && data.gebouwGrenzen.length > 2) {
        gebouwPolygon = L.polygon(
          data.gebouwGrenzen as L.LatLngExpression[],
          {
            color: '#16a34a',
            weight: 2.5,
            fillColor: '#22c55e',
            fillOpacity: 0.2,
          }
        ).addTo(map)
      }
    }

    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng

      clearOverlays()

      // Tijdelijke klikmarker
      selectieMarker = L.circleMarker([clickLat, clickLng], {
        radius: 10,
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
          clearOverlays()
        } else {
          // Verwijder klikmarker — polygonen nemen het over
          if (selectieMarker) { map.removeLayer(selectieMarker); selectieMarker = null }

          drawOverlays(data)
          setSelectie(data)
          callbackRef.current(data)
        }
      } catch {
        setFout('Netwerkfout bij ophalen perceelgegevens')
        clearOverlays()
      }

      setKlikBezig(false)
    })

    return () => {
      map.remove()
      mapInstance.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const h = selectie?.hoogte3d

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
        <>
          {/* Dakoppervlakte hero */}
          {(selectie.dakOppervlak || selectie.oppervlakte) && (
            <div className="px-4 py-3 bg-green-700 text-white flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider opacity-80">
                  {selectie.dakOppervlak ? 'Geschatte dakoppervlakte' : 'Grondoppervlakte gebouw'}
                </p>
                <p className="text-2xl font-bold leading-tight">
                  ±{selectie.dakOppervlak ?? selectie.oppervlakte} m²
                </p>
                {selectie.dakOppervlak && selectie.oppervlakte && selectie.dakOppervlak !== selectie.oppervlakte && (
                  <p className="text-[10px] opacity-70 mt-0.5">
                    Grondvlak: {selectie.oppervlakte} m² + hellingcorrectie
                  </p>
                )}
              </div>
              {h?.nokhoogte && (
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider opacity-80">Nokhoogte</p>
                  <p className="text-xl font-bold">{h.nokhoogte} m</p>
                </div>
              )}
            </div>
          )}

          {/* Detail velden */}
          <div className="grid grid-cols-2 gap-px bg-green-100 text-xs">
            {h?.gebouwType && (
              <div className="bg-white px-3 py-2">
                <p className="text-gray-500 mb-0.5">Gebouwtype</p>
                <p className="font-semibold text-gray-800 capitalize">{h.gebouwType}</p>
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
            {h?.kwaliteit && (
              <div className="bg-white px-3 py-2">
                <p className="text-gray-500 mb-0.5">Data kwaliteit</p>
                <p className="font-semibold text-gray-800">{h.kwaliteit}</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Legenda */}
      {selectie && !selectie.error && (selectie.perceelGrenzen || selectie.gebouwGrenzen) && (
        <div className="px-3 py-1.5 flex gap-4 text-[10px] text-gray-600 bg-white border-t border-green-100">
          {selectie.perceelGrenzen && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-amber-500" /> Perceelgrens
            </span>
          )}
          {selectie.gebouwGrenzen && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-2 bg-green-500/30 border border-green-600 rounded-sm" /> Gebouw
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <p className="px-3 py-1.5 text-[10px] text-green-700 bg-green-50">
        {selectie && !selectie.error
          ? '✓ Perceel geselecteerd · 3D GRB & kadaster © Vlaanderen'
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
