# LOD2 Proof-of-Concept

Genereert een echte 3D-mesh van een Vlaams gebouw op basis van DHMV II hoogtedata.

## Wat het doet

1. Adres lookup → coördinaten + capakey + footprint (via onze API)
2. Download DSM + DTM voor de bbox rond het gebouw (Vlaamse WCS)
3. Bereken relatieve gebouwhoogte (DSM - DTM)
4. Filter op gebouwfootprint
5. Triangulate naar 3D mesh
6. Exporteer als `.glb`

Resultaat: een mesh waarvan het dak de **werkelijke vorm** volgt — schuine daken, dakkapellen, complexe vormen — geen kubus meer.

## Setup

```bash
cd lod2-poc
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
python generate_lod2.py
```

## Resultaat bekijken

Output staat in `out/13020C0137_00E000.glb`.

Open het bestand in:
- https://gltf-viewer.donmccurdy.com (drag & drop)
- Of in MacOS: dubbelklik (Quick Look toont 3D-preview)
- Of in Blender / Three.js Editor

## Volgende stappen

Als de PoC werkt:
1. Pipeline porteren naar **Modal.com** als serverless API
2. Vercel function `/api/lod2/[capakey]` die Modal aanroept + cached in Vercel Blob
3. Frontend MapLibre + deck.gl SimpleMeshLayer die `.glb` laadt
4. Animatie van "opstijgen" zoals in 2D-mockup

## Bekende beperkingen

- Resolutie is **1m** (DSM_1m). Genoeg voor dakvorm, niet voor dakkapellen.
- Voor échte dakvlak-segmentatie (LOD2.2) zouden we **roofer** moeten draaien op de raw LAZ-data, niet de DSM. Dat is fase 2.
- Waarschijnlijk zien we een "vloeiend" dak in plaats van scherpe nokken — dit is inherent aan DSM-data.
