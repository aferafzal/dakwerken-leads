#!/usr/bin/env python3
"""
LOD2 Proof-of-Concept — Frankenberg 18, 2321 Hoogstraten

Pipeline:
  1. Haal DSM (oppervlak inc. dak) en DTM (terrein) op via Vlaamse WCS
  2. Bereken relatieve gebouwhoogte = DSM - DTM
  3. Filter op gebouwfootprint (alleen punten in gebouw)
  4. Genereer 3D mesh (triangulated grid) met juiste hoogte per pixel
  5. Export als glTF/glb voor browser-rendering

Resultaat: een mesh waarvan de bovenkant de echte dakvorm volgt.
Geen vlakke kubus meer — schuine daken, dakkapellen, complexe vormen
worden allemaal correct weergegeven.
"""
import os
import sys
import struct
import re
from pathlib import Path
import numpy as np
import requests
import rasterio
from rasterio.io import MemoryFile
from rasterio.features import geometry_mask
from shapely.geometry import shape
import pyproj
import trimesh

# ─── Configuratie ──────────────────────────────────────────────────
WCS_URL = "https://geo.api.vlaanderen.be/DHMV/wcs"
DAKMETING_URL = "https://dakwerken-oostvlaanderen.be/api/dakmeting"
TEST_ADRES = "Frankenberg 18, 2321 Hoogstraten"
BUFFER_M = 30  # buffer rond gebouw in meters
OUTPUT_DIR = Path(__file__).parent / "out"
OUTPUT_DIR.mkdir(exist_ok=True)


def parse_multipart_wcs(content: bytes) -> bytes:
    """WCS 2.0 GetCoverage geeft multipart MIME terug. Extract de TIFF-binary."""
    # Zoek naar "Content-Type: image/tiff" gevolgd door dubbele newline,
    # daarna komt de binary tot de volgende "--" boundary.
    match = re.search(rb"Content-Type:\s*image/tiff\s*\r?\n\r?\n", content)
    if not match:
        # Fallback — sommige servers gebruiken andere boundary
        match = re.search(rb"image/tiff[^\n]*\r?\n\r?\n", content)
    if not match:
        raise ValueError("Geen TIFF-deel gevonden in multipart response")
    tiff_start = match.end()
    # Vind volgende boundary (begint met "--")
    boundary_match = re.search(rb"\r?\n--", content[tiff_start:])
    tiff_end = tiff_start + boundary_match.start() if boundary_match else len(content)
    return content[tiff_start:tiff_end]


def fetch_coverage(layer: str, x_min: float, y_min: float, x_max: float, y_max: float) -> np.ndarray:
    """Haal hoogteraster op via WCS 2.0 GetCoverage."""
    params = {
        "service":     "WCS",
        "version":     "2.0.1",
        "request":     "GetCoverage",
        "coverageId":  layer,
        "subset":      [f"x({x_min},{x_max})", f"y({y_min},{y_max})"],
        "format":      "image/tiff",
    }
    r = requests.get(WCS_URL, params=params, timeout=30)
    r.raise_for_status()
    tiff_bytes = parse_multipart_wcs(r.content)
    with MemoryFile(tiff_bytes) as mem:
        with mem.open() as src:
            return src.read(1), src.transform, src.crs


def lookup_address(adres: str) -> dict:
    """Zoek capakey + Lambert72 coords + footprint via onze eigen API."""
    r = requests.get(DAKMETING_URL, params={"adres": adres}, timeout=15)
    r.raise_for_status()
    return r.json()


def fetch_perceelklik(lat: float, lng: float) -> dict:
    """Haal exacte gebouwgeometrie op door 'klik' te simuleren."""
    r = requests.get(DAKMETING_URL, params={"click_lat": lat, "click_lng": lng}, timeout=20)
    r.raise_for_status()
    return r.json()


def main():
    print(f"🔎 Zoek adres: {TEST_ADRES}")
    meting = lookup_address(TEST_ADRES)
    print(f"   capakey: {meting['capakey']}")
    print(f"   coords: {meting['lat']:.5f}, {meting['lng']:.5f}")
    print(f"   nokhoogte: {meting['hoogte3d']['nokhoogte']} m")

    # Haal exacte gebouwgrenzen
    print("\n🏠 Haal gebouwpolygon op")
    klik = fetch_perceelklik(meting["lat"], meting["lng"])
    if not klik.get("gebouwen"):
        print("❌ Geen gebouwen gevonden")
        return 1

    # Convert WGS84 → Lambert72 voor WCS-query
    transformer = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:31370", always_xy=True)

    # BBOX rond hoofdgebouw + buffer
    hoofd = max(klik["gebouwen"], key=lambda g: g["oppervlakte"])
    grenzen_wgs = hoofd["grenzen"]  # [[lat, lng], ...]
    print(f"   hoofdgebouw: {hoofd['oppervlakte']} m², {len(grenzen_wgs)} polygon-punten")

    grenzen_l72 = [transformer.transform(lng, lat) for lat, lng in grenzen_wgs]
    xs = [p[0] for p in grenzen_l72]
    ys = [p[1] for p in grenzen_l72]
    x_min, x_max = min(xs) - BUFFER_M, max(xs) + BUFFER_M
    y_min, y_max = min(ys) - BUFFER_M, max(ys) + BUFFER_M
    print(f"   bbox L72: x[{x_min:.0f}-{x_max:.0f}] y[{y_min:.0f}-{y_max:.0f}]")

    # Download DSM + DTM
    print("\n⛰  Download DSM (oppervlak)")
    dsm, transform, crs = fetch_coverage("DHMVII_DSM_1m", x_min, y_min, x_max, y_max)
    print(f"   DSM shape: {dsm.shape}, range: {dsm.min():.2f} → {dsm.max():.2f} m")

    print("\n🏞  Download DTM (terrein)")
    dtm, _, _ = fetch_coverage("DHMVII_DTM_1m", x_min, y_min, x_max, y_max)
    print(f"   DTM shape: {dtm.shape}, range: {dtm.min():.2f} → {dtm.max():.2f} m")

    # Relatieve hoogte = gebouw boven terrein
    height_above_ground = dsm - dtm
    height_above_ground = np.where(height_above_ground < 0, 0, height_above_ground)
    print(f"\n📏 Relatieve hoogte: max {height_above_ground.max():.2f} m")

    # Mask op gebouwfootprint
    print("\n✂  Filter op gebouwfootprint")
    geom = {"type": "Polygon", "coordinates": [grenzen_l72 + [grenzen_l72[0]]]}
    mask = geometry_mask(
        [geom], out_shape=dsm.shape, transform=transform, invert=True
    )
    print(f"   {mask.sum()} pixels binnen gebouw ({mask.sum()} m²)")

    # Genereer 3D mesh
    print("\n🧊 Genereer 3D mesh")
    h, w = dsm.shape
    vertices = []
    faces = []

    # Voor elke pixel binnen gebouw: maak een "kolom" van grond tot dak
    cell_size = 1.0  # 1m raster

    # Maak top-vertices (op dakhoogte) en bodem-vertices (op grondhoogte)
    vert_idx = {}  # (i, j, level) → vertex index
    levels = ["bottom", "top"]

    for i in range(h):
        for j in range(w):
            if not mask[i, j]:
                continue
            # World coords (Lambert72) — center pixel
            world_x = transform.c + (j + 0.5) * transform.a
            world_y = transform.f + (i + 0.5) * transform.e
            ground_z = float(dtm[i, j])
            roof_z = float(dsm[i, j])
            # local coords (gecentreerd rond gebouw-centrum voor numerical stability)
            local_x = world_x - (x_min + x_max) / 2
            local_y = world_y - (y_min + y_max) / 2

            # Bodem
            vert_idx[(i, j, "bottom")] = len(vertices)
            vertices.append([local_x, local_y, 0])
            # Top (relatieve hoogte boven grond)
            vert_idx[(i, j, "top")] = len(vertices)
            vertices.append([local_x, local_y, roof_z - ground_z])

    # Triangulate dak (top): voor elke 2x2 cel → 2 driehoeken
    for i in range(h - 1):
        for j in range(w - 1):
            corners = [(i, j), (i, j + 1), (i + 1, j + 1), (i + 1, j)]
            if not all(mask[c] for c in corners):
                continue
            v = [vert_idx[(c[0], c[1], "top")] for c in corners]
            faces.append([v[0], v[1], v[2]])
            faces.append([v[0], v[2], v[3]])

    # Triangulate muren: rand-pixels (waar mask grenst aan niet-mask)
    for i in range(h):
        for j in range(w):
            if not mask[i, j]:
                continue
            for di, dj in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                ni, nj = i + di, j + dj
                if 0 <= ni < h and 0 <= nj < w and mask[ni, nj]:
                    continue  # geen muur, buurpixel is ook gebouw
                # Muur tussen (i,j) en buurkant — maar simpeler: gebruik ribbe rond eigen pixel
                # We slaan dit hier even over: muren afleiden uit polygon (cleaner)

    # Cleaner: muren uit polygon-rand
    for k in range(len(grenzen_l72)):
        x1, y1 = grenzen_l72[k]
        x2, y2 = grenzen_l72[(k + 1) % len(grenzen_l72)]
        cx = (x_min + x_max) / 2
        cy = (y_min + y_max) / 2
        lx1, ly1 = x1 - cx, y1 - cy
        lx2, ly2 = x2 - cx, y2 - cy

        # Sample roof height aan beide kanten
        def sample_h(x_world, y_world):
            j = int((x_world - transform.c) / transform.a)
            i = int((y_world - transform.f) / transform.e)
            if 0 <= i < h and 0 <= j < w:
                return float(dsm[i, j] - dtm[i, j])
            return 0

        h1 = max(0, sample_h(x1, y1))
        h2 = max(0, sample_h(x2, y2))

        v_idx_start = len(vertices)
        vertices.append([lx1, ly1, 0])
        vertices.append([lx2, ly2, 0])
        vertices.append([lx2, ly2, h2])
        vertices.append([lx1, ly1, h1])
        faces.append([v_idx_start, v_idx_start + 1, v_idx_start + 2])
        faces.append([v_idx_start, v_idx_start + 2, v_idx_start + 3])

    print(f"   vertices: {len(vertices)}, faces: {len(faces)}")

    # Maak trimesh + export glb
    if not vertices or not faces:
        print("❌ Geen geldige geometrie gegenereerd")
        return 1

    mesh = trimesh.Trimesh(vertices=np.array(vertices), faces=np.array(faces))
    mesh.fix_normals()
    out_path = OUTPUT_DIR / f"{meting['capakey'].replace('/', '_')}.glb"
    mesh.export(str(out_path))
    print(f"\n✅ Export: {out_path}")
    print(f"   bestand: {out_path.stat().st_size / 1024:.1f} KB")
    print(f"\n🌐 Open in viewer: https://gltf-viewer.donmccurdy.com (drag & drop het .glb bestand)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
