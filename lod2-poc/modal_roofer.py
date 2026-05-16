#!/usr/bin/env python3
"""
Modal.com serverless roofer pipeline — multi-gebouw versie.

Flow per perceel:
  1. Ontvangt lijst van gebouwen (footprint WGS84, nokhoogte, gebouwType) per gebouw
  2. Per gebouw:
       a. Footprint → Lambert72
       b. Tile lookup (DHMV II COPC)
       c. Roofer probeert LOD 2.2 reconstructie
       d. Als roofer faalt of platte mesh oplevert → synthetic fallback
  3. Alle gebouw-meshes worden gecombineerd
  4. Eindresultaat gecentreerd op global zwaartepunt, Y-up voor glTF
  5. Upload als één GLB naar Vercel Blob

Deploy:  cd lod2-poc && modal deploy modal_roofer.py
"""
import io
import json
import math
import os
import re
import subprocess
import tempfile
from pathlib import Path

import modal

app = modal.App("dakwerken-roofer")
volume = modal.Volume.from_name("roofer-cache", create_if_missing=True)

roofer_image = (
    modal.Image
    .from_registry(
        "3dgi/roofer:v1.0.0",
        add_python="3.12",
        setup_dockerfile_commands=["ENTRYPOINT []"],
    )
    .pip_install("boto3", "numpy", "pyproj", "requests", "trimesh", "fastapi", "laspy[lazrs]")
)

S3_BUCKET = "open-lidar-data"
S3_PREFIX = "data/BE/EODaS/LiDAR_DHMV_II-2013-2015/copc/"
COPC_BASE = f"https://{S3_BUCKET}.s3.eu-central-1.amazonaws.com/{S3_PREFIX}"


# ─── Tile index ─────────────────────────────────────────────────────────
def _load_tile_index(cache_dir: Path) -> dict:
    idx_path = cache_dir / "tile_index.json"
    if idx_path.exists():
        return json.loads(idx_path.read_text())

    import boto3
    from botocore import UNSIGNED
    from botocore.config import Config

    print("Tile index opbouwen vanuit S3 (eenmalig)…")
    s3 = boto3.client("s3", config=Config(signature_version=UNSIGNED), region_name="eu-central-1")
    paginator = s3.get_paginator("list_objects_v2")
    index: dict[str, str] = {}
    for page in paginator.paginate(Bucket=S3_BUCKET, Prefix=S3_PREFIX):
        for obj in page.get("Contents", []):
            filename = obj["Key"].split("/")[-1]
            m = re.search(r"ES_(\d+)_(\d+)\.copc\.laz$", filename)
            if m:
                index[f"{m.group(1)}_{m.group(2)}"] = filename
    cache_dir.mkdir(parents=True, exist_ok=True)
    idx_path.write_text(json.dumps(index))
    print(f"Tile index klaar: {len(index)} tiles")
    return index


def _find_tile_url(index: dict, cx: float, cy: float) -> str | None:
    if not index:
        return None
    tile_x = int(cx // 500) * 500
    tile_y = int(cy // 500) * 500
    for dx in (0, -500, 500):
        for dy in (0, -500, 500):
            key = f"{tile_x + dx}_{tile_y + dy}"
            if key in index:
                return COPC_BASE + index[key]
    return None


def _download_tile(tile_url: str, cache_dir: Path) -> Path:
    import requests as req
    filename = tile_url.rsplit("/", 1)[-1]
    cache_path = cache_dir / "tiles" / filename
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    if cache_path.exists() and cache_path.stat().st_size > 1024 * 1024:
        return cache_path
    print(f"Tile downloaden: {tile_url}")
    with req.get(tile_url, stream=True, timeout=600) as r:
        r.raise_for_status()
        with open(cache_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=4 * 1024 * 1024):
                f.write(chunk)
    print(f"Tile gedownload: {cache_path.stat().st_size / 1024 / 1024:.1f} MB")
    return cache_path


# ─── Synthetic mesh (returns absolute Lambert72, Z-up, niet gecentreerd) ──
def _synthetic_mesh_abs(footprint_l72: list, nokhoogte: float, gebouwType: str | None = None):
    """Synthetische 3D-mesh op basis van footprint + nokhoogte.
    Vertices in absolute Lambert72 coords (Z = hoogte). Caller doet centering + rotatie.
    """
    import numpy as np
    import trimesh

    GOOT_RATIO = 0.6
    pts = np.array(footprint_l72, dtype=np.float64)
    if len(pts) > 1 and np.allclose(pts[0], pts[-1]):
        pts = pts[:-1]
    n_pts = len(pts)
    if n_pts < 3:
        return None

    # Oppervlakte (shoelace)
    opp = float(0.5 * abs(np.sum(pts[:, 0] * np.roll(pts[:, 1], -1) - np.roll(pts[:, 0], -1) * pts[:, 1])))

    # Plat-detectie — versterkt voor bijgebouwen, loodsen, garages
    gt = (gebouwType or "").lower()
    is_plat = (
        gt.startswith("bijgebouw")
        or gt in ("garage", "loods", "schuur", "stal", "aanbouw")
        or opp < 50                          # klein bijgebouw
        or nokhoogte < 4                     # te laag voor schilddak
        or (nokhoogte < 6 and opp > 80)      # garage / klein loods
        or (nokhoogte < 8 and opp > 200)     # bedrijfshal / grote loods
        or (nokhoogte > 12 and opp > 250)    # appartementsblok
    )

    vertices: list = []
    faces: list = []

    if is_plat:
        bot, top = [], []
        for x, y in pts:
            bot.append(len(vertices)); vertices.append([float(x), float(y), 0.0])
            top.append(len(vertices)); vertices.append([float(x), float(y), float(nokhoogte)])
        for i in range(n_pts):
            j = (i + 1) % n_pts
            faces.append([bot[i], bot[j], top[j]])
            faces.append([bot[i], top[j], top[i]])
        for i in range(1, n_pts - 1):
            faces.append([top[0], top[i], top[i + 1]])
            faces.append([bot[0], bot[i + 1], bot[i]])
    else:
        # Schilddak via oriented bounding box (centroïde-relatief om PCA te doen)
        centroid = pts.mean(axis=0)
        pts_centered = pts - centroid
        cov = np.cov(pts_centered.T)
        _, eigvecs = np.linalg.eigh(cov)
        long_axis = eigvecs[:, 1]
        angle = np.arctan2(long_axis[1], long_axis[0])
        rot = np.array([[np.cos(-angle), -np.sin(-angle)],
                        [np.sin(-angle), np.cos(-angle)]])
        rotated = pts_centered @ rot.T
        min_xy, max_xy = rotated.min(axis=0), rotated.max(axis=0)
        corners_rot = np.array([
            [min_xy[0], min_xy[1]], [max_xy[0], min_xy[1]],
            [max_xy[0], max_xy[1]], [min_xy[0], max_xy[1]],
        ])
        rot_inv = np.array([[np.cos(angle), -np.sin(angle)],
                            [np.sin(angle), np.cos(angle)]])
        obb = corners_rot @ rot_inv.T + centroid  # terug naar absolute coords
        long_len = float(np.linalg.norm(obb[3] - obb[0]))
        cl_a = (obb[0] + obb[3]) / 2
        cl_b = (obb[1] + obb[2]) / 2
        nok_dir = (cl_b - cl_a) / np.linalg.norm(cl_b - cl_a)
        nok_inset = long_len * 0.25
        nok_a = cl_a + nok_dir * nok_inset
        nok_b = cl_b - nok_dir * nok_inset
        goothoogte = nokhoogte * GOOT_RATIO

        bot, goot = [], []
        for x, y in pts:
            bot.append(len(vertices)); vertices.append([float(x), float(y), 0.0])
            goot.append(len(vertices)); vertices.append([float(x), float(y), float(goothoogte)])
        for i in range(n_pts):
            j = (i + 1) % n_pts
            faces.append([bot[i], bot[j], goot[j]])
            faces.append([bot[i], goot[j], goot[i]])
        nok_a_idx = len(vertices); vertices.append([float(nok_a[0]), float(nok_a[1]), float(nokhoogte)])
        nok_b_idx = len(vertices); vertices.append([float(nok_b[0]), float(nok_b[1]), float(nokhoogte)])
        long_total = float(np.linalg.norm(cl_b - cl_a))
        for i in range(n_pts):
            j = (i + 1) % n_pts
            t1 = float(np.dot(pts[i] - cl_a, nok_dir))
            t2 = float(np.dot(pts[j] - cl_a, nok_dir))
            idx_a1 = nok_a_idx if t1 < long_total / 2 else nok_b_idx
            idx_a2 = nok_a_idx if t2 < long_total / 2 else nok_b_idx
            g1, g2 = goot[i], goot[j]
            if idx_a1 == idx_a2:
                faces.append([g1, g2, idx_a1])
            else:
                faces.append([g1, g2, idx_a2])
                faces.append([g1, idx_a2, idx_a1])
        for i in range(1, n_pts - 1):
            faces.append([bot[0], bot[i + 1], bot[i]])

    return trimesh.Trimesh(
        vertices=np.array(vertices, dtype=np.float64),
        faces=np.array(faces, dtype=np.int32),
        process=False,
    )


# ─── CityJSON → (mesh, metadata) ───────────────────────────────────────
# Mesh in absolute Lambert72 (Z-up, niet gecentreerd).
# Metadata bevat rf_*-attributen + per-RoofSurface oppervlakte/hoek/azimuth.
def _parse_cityjson(cj_path: Path):
    import numpy as np
    import trimesh

    transform_info = None
    all_verts: list = []
    all_faces: list = []
    face_surface_idx: list = []   # per face: index in roof_surfaces (of None)
    rf_attrs: dict = {}
    roof_surfaces: list = []      # per RoofSurface: azimuth, inclination, ...

    def add_face(base: int, ring: list, sem_idx_for_face):
        for i in range(1, len(ring) - 1):
            all_faces.append([base + ring[0], base + ring[i], base + ring[i + 1]])
            face_surface_idx.append(sem_idx_for_face)

    with open(cj_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)

            if obj.get("type") == "CityJSON":
                transform_info = obj.get("transform")
            elif obj.get("type") == "CityJSONFeature":
                raw = obj.get("vertices", [])
                if not raw:
                    continue
                v = np.array(raw, dtype=np.float64)
                if transform_info:
                    sc = transform_info.get("scale", [1, 1, 1])
                    tr = transform_info.get("translate", [0, 0, 0])
                    v = v * sc + tr
                base = len(all_verts)
                all_verts.extend(v.tolist())

                # Building-attributen (rf_*)
                for co in obj.get("CityObjects", {}).values():
                    if co.get("type") == "Building":
                        for k, val in (co.get("attributes") or {}).items():
                            if k.startswith("rf_"):
                                rf_attrs[k] = val

                # Geometry: kies hoogste beschikbare LOD per CityObject
                preferred = ["2.2", "2.1", "1.3", "1.2", "0"]
                for co in obj.get("CityObjects", {}).values():
                    geoms_by_lod: dict[str, list] = {}
                    for geom in co.get("geometry", []):
                        lod = str(geom.get("lod", "0"))
                        geoms_by_lod.setdefault(lod, []).append(geom)
                    chosen_lod = next((l for l in preferred if l in geoms_by_lod), None)
                    if not chosen_lod:
                        continue

                    for geom in geoms_by_lod[chosen_lod]:
                        gtype = geom.get("type", "")
                        bounds = geom.get("boundaries", [])
                        semantics = geom.get("semantics") or {}
                        sem_surfaces = semantics.get("surfaces") or []
                        sem_values = semantics.get("values")

                        # Bouw lokale index-map: lokaal sem_index → globaal roof_surfaces index
                        local_to_global: dict[int, int] = {}
                        for local_idx, s in enumerate(sem_surfaces):
                            if s.get("type") == "RoofSurface":
                                global_idx = len(roof_surfaces)
                                local_to_global[local_idx] = global_idx
                                roof_surfaces.append({
                                    "azimuth": s.get("rf_azimuth"),
                                    "inclination": s.get("rf_inclination"),
                                    "h_roof_50p": s.get("rf_h_roof_50p"),
                                    "area_m2": 0.0,
                                })

                        def _map_sem(local_idx):
                            if local_idx is None:
                                return None
                            return local_to_global.get(local_idx)

                        if gtype == "Solid":
                            for shell_idx, shell in enumerate(bounds):
                                shell_sem = (sem_values[shell_idx] if sem_values and shell_idx < len(sem_values) else None)
                                for surf_idx, surf in enumerate(shell):
                                    sem_idx = shell_sem[surf_idx] if (shell_sem and surf_idx < len(shell_sem)) else None
                                    ring = surf[0] if surf else []
                                    add_face(base, ring, _map_sem(sem_idx))
                        elif gtype in ("MultiSurface", "CompositeSurface"):
                            for surf_idx, surf in enumerate(bounds):
                                sem_idx = sem_values[surf_idx] if (sem_values and surf_idx < len(sem_values)) else None
                                ring = surf[0] if surf else []
                                add_face(base, ring, _map_sem(sem_idx))

    if not all_verts or not all_faces:
        return None, {}

    mesh = trimesh.Trimesh(
        vertices=np.array(all_verts, dtype=np.float64),
        faces=np.array(all_faces, dtype=np.int32),
        process=False,
    )

    # Per-RoofSurface oppervlakte uit echte mesh-triangles
    if roof_surfaces and len(face_surface_idx) == len(mesh.faces):
        face_areas = mesh.area_faces  # ndarray
        for g_idx in range(len(roof_surfaces)):
            mask = np.array([fi == g_idx for fi in face_surface_idx], dtype=bool)
            if mask.any():
                roof_surfaces[g_idx]["area_m2"] = round(float(face_areas[mask].sum()), 2)

    metadata = {
        "rf_attributes": rf_attrs,
        "roof_surfaces": roof_surfaces,
        "total_roof_area_m2": round(sum(s["area_m2"] for s in roof_surfaces), 2),
    }
    return mesh, metadata


def _run_roofer_one(footprint_l72: list, laz_path: Path, capakey: str, idx: int):
    """Run roofer voor één gebouw. Returns (mesh, metadata) of (None, {})."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)
        fp_path = tmpdir / "footprint.geojson"
        out_dir = tmpdir / "out"
        out_dir.mkdir()

        fp_path.write_text(json.dumps({
            "type": "FeatureCollection",
            "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:EPSG::31370"}},
            "features": [{
                "type": "Feature",
                "properties": {"id": f"{capakey}_{idx}"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [footprint_l72 + [footprint_l72[0]]],
                },
            }],
        }))

        result = subprocess.run(
            ["roofer", "--bld-class", "1", "--grnd-class", "2",
             str(laz_path), str(fp_path), str(out_dir) + "/"],
            capture_output=True, text=True, timeout=120,
        )
        if result.returncode != 0:
            print(f"  roofer exit={result.returncode}: {result.stderr[-200:]}")
            return None, {}

        cj_files = (
            list(out_dir.glob("*.city.jsonl"))
            or list(out_dir.glob("*.jsonl"))
            or list(out_dir.glob("*.json"))
        )
        if not cj_files:
            return None, {}
        return _parse_cityjson(cj_files[0])


def _mesh_height(mesh) -> float:
    if mesh is None:
        return 0.0
    bb = mesh.bounds
    return float(bb[1][2] - bb[0][2])  # Z-as = hoogte (Z-up)


# ─── Vercel Blob upload ─────────────────────────────────────────────────
def _upload_blob(pathname: str, data: bytes, token: str, content_type: str = "model/gltf-binary") -> str:
    import requests as req
    r = req.put(
        f"https://blob.vercel-storage.com/{pathname}",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": content_type,
            "x-vercel-blob-add-random-suffix": "0",
        },
        data=data, timeout=60,
    )
    r.raise_for_status()
    return r.json()["url"]


def _build_aggregate_metadata(per_building: list, sources: list) -> dict:
    """Combineer per-gebouw metadata + bereken kwaliteitslabels voor het rapport."""
    total_area = round(sum(m.get("total_roof_area_m2", 0) for m in per_building), 1)

    roofer_metas = [m for m in per_building if m.get("source") == "roofer"]
    avg_rmse = avg_density = avg_nodata = None
    if roofer_metas:
        def _avg(key: str):
            vals = [
                m.get("rf_attributes", {}).get(key)
                for m in roofer_metas
                if m.get("rf_attributes", {}).get(key) is not None
            ]
            return round(sum(vals) / len(vals), 3) if vals else None

        avg_rmse = _avg("rf_rmse_lod22")
        avg_density = _avg("rf_pt_density")
        avg_nodata = _avg("rf_nodata_frac")

    n_roofer = sum(1 for s in sources if s == "roofer")
    n_syn = sum(1 for s in sources if s == "synthetic")

    # Kwaliteits-label: drempel-gebaseerd, transparant
    if n_roofer == 0:
        quality_label = "synthetisch"
    elif (
        avg_rmse is not None and avg_rmse < 1.0
        and (avg_density or 0) > 15
        and (avg_nodata if avg_nodata is not None else 1) < 0.10
    ):
        quality_label = "hoog"
    elif avg_rmse is not None and avg_rmse < 2.0 and (avg_density or 0) > 8:
        quality_label = "gemiddeld"
    else:
        quality_label = "beperkt"

    return {
        "version": "v5",
        "total_roof_area_m2": total_area,
        "n_buildings": len(per_building),
        "sources": sources,
        "quality": {
            "label": quality_label,
            "avg_rmse_m": avg_rmse,
            "avg_point_density": avg_density,
            "avg_nodata_fraction": avg_nodata,
            "n_roofer": n_roofer,
            "n_synthetic": n_syn,
        },
        "per_building": per_building,
    }


# ─── Hoofdfunctie ───────────────────────────────────────────────────────
@app.function(
    image=roofer_image,
    volumes={"/cache": volume},
    secrets=[modal.Secret.from_name("vercel-blob")],
    timeout=600,
    memory=8192,
)
def generate_and_store(capakey: str, gebouwen: list) -> dict:
    """
    gebouwen: lijst van dicts met:
      - footprint_wgs84: [[lat, lng], ...]
      - nokhoogte: float (default 7.0)
      - gebouwType: str | None
    Returns {"url": str, "sources": [...], "error": str|None}
    """
    import numpy as np
    import pyproj
    import trimesh

    blob_token = os.environ["BLOB_READ_WRITE_TOKEN"]
    safe = capakey.replace("/", "_")

    if not gebouwen:
        return {"url": None, "error": "Geen gebouwen meegegeven"}

    transformer = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:31370", always_xy=True)
    gebouwen_l72 = []
    for g in gebouwen:
        fp_wgs = g.get("footprint_wgs84", [])
        if not fp_wgs:
            continue
        fp_l72 = [list(transformer.transform(lng, lat)) for lat, lng in fp_wgs]
        gebouwen_l72.append({
            "footprint_l72": fp_l72,
            "nokhoogte": float(g.get("nokhoogte") or 7.0),
            "gebouwType": g.get("gebouwType"),
        })

    if not gebouwen_l72:
        return {"url": None, "error": "Geen geldige footprints"}

    # Master center voor finale positionering (zwaartepunt van alle vertices)
    all_pts = np.vstack([np.array(g["footprint_l72"]) for g in gebouwen_l72])
    global_cx = float(all_pts.mean(axis=0)[0])
    global_cy = float(all_pts.mean(axis=0)[1])

    # Tile index laden (zelfde voor alle gebouwen)
    tile_index = _load_tile_index(Path("/cache"))
    volume.commit()

    all_meshes: list = []
    sources: list = []
    per_building_meta: list = []

    for i, g in enumerate(gebouwen_l72):
        fp_l72 = g["footprint_l72"]
        nok = g["nokhoogte"]
        gt = g["gebouwType"]
        pts = np.array(fp_l72)
        cx = float(pts.mean(axis=0)[0])
        cy = float(pts.mean(axis=0)[1])

        # Footprint-oppervlakte (shoelace) voor synthetic-meta + fallback-rapport
        fp_arr = np.array(fp_l72)
        if len(fp_arr) > 1 and np.allclose(fp_arr[0], fp_arr[-1]):
            fp_arr = fp_arr[:-1]
        footprint_area = float(0.5 * abs(np.sum(
            fp_arr[:, 0] * np.roll(fp_arr[:, 1], -1)
            - np.roll(fp_arr[:, 0], -1) * fp_arr[:, 1]
        )))

        print(f"\n--- Gebouw {i + 1}/{len(gebouwen_l72)} (nok={nok}m, type={gt}, opp={footprint_area:.0f}m²) ---")

        mesh = None
        roofer_meta: dict = {}
        tile_url = _find_tile_url(tile_index, cx, cy)
        if tile_url:
            try:
                laz_path = _download_tile(tile_url, Path("/cache"))
                volume.commit()
                mesh, roofer_meta = _run_roofer_one(fp_l72, laz_path, capakey, i)
            except Exception as e:
                print(f"  roofer pipeline fout: {e}")

        h = _mesh_height(mesh) if mesh is not None else 0.0
        if mesh is None or h < 1.0:
            print(f"  → fallback synthetic (roofer h={h:.1f}m)")
            mesh = _synthetic_mesh_abs(fp_l72, nok, gt)
            sources.append("synthetic")
            # Voor synthetic: geschatte dakoppervlakte via hellingscorrectie
            if gt and "bijgebouw" in gt.lower():
                factor = 1.05
            elif nok < 5:
                factor = 1.05
            elif nok < 8:
                factor = 1.15
            elif nok < 12:
                factor = 1.30
            else:
                factor = 1.05
            per_building_meta.append({
                "source": "synthetic",
                "footprint_area_m2": round(footprint_area, 1),
                "total_roof_area_m2": round(footprint_area * factor, 1),
                "nokhoogte_used": nok,
                "gebouwType_used": gt,
                "roof_surfaces": [],
                "rf_attributes": {},
            })
        else:
            print(f"  → roofer (h={h:.1f}m, {len(roofer_meta.get('roof_surfaces', []))} dakvlakken)")
            sources.append("roofer")
            roofer_meta["source"] = "roofer"
            roofer_meta["footprint_area_m2"] = round(footprint_area, 1)
            per_building_meta.append(roofer_meta)

        if mesh is not None:
            all_meshes.append(mesh)

    if not all_meshes:
        return {"url": None, "error": "Geen mesh kunnen genereren"}

    # Combineer alle gebouw-meshes (vertices nog in absolute Lambert72)
    combined = trimesh.util.concatenate(all_meshes) if len(all_meshes) > 1 else all_meshes[0]

    # Centreer XY op global zwaartepunt, ground op Z=0
    z_min = float(combined.bounds[0][2])
    combined.vertices = combined.vertices - np.array([global_cx, global_cy, z_min])

    # Y-up voor glTF
    rot = trimesh.transformations.rotation_matrix(-math.pi / 2, [1, 0, 0])
    combined.apply_transform(rot)

    buf = io.BytesIO()
    combined.export(buf, file_type="glb")
    glb = buf.getvalue()

    # Aggregate metadata (kwaliteit + per-gebouw + per-RoofSurface)
    aggregate = _build_aggregate_metadata(per_building_meta, sources)

    print(f"\n✅ GLB: {len(glb) / 1024:.1f} KB · {len(all_meshes)} gebouwen · "
          f"sources={sources} · kwaliteit={aggregate['quality']['label']} · "
          f"dakopp={aggregate['total_roof_area_m2']}m²")

    glb_url = _upload_blob(f"lod2/v5/{safe}.glb", glb, blob_token)
    meta_bytes = json.dumps(aggregate, ensure_ascii=False, indent=2).encode("utf-8")
    meta_url = _upload_blob(f"lod2/v5/{safe}.meta.json", meta_bytes, blob_token,
                            content_type="application/json")
    print(f"Blob GLB:  {glb_url}")
    print(f"Blob meta: {meta_url}")
    return {"url": glb_url, "meta_url": meta_url, "sources": sources, "error": None}


@app.function(image=roofer_image)
@modal.fastapi_endpoint(method="POST")
def trigger(body: dict) -> dict:
    """HTTP endpoint vanuit Next.js. Verwacht: {capakey, gebouwen: [...]}."""
    capakey = body.get("capakey", "")
    gebouwen = body.get("gebouwen", [])

    if not capakey or not gebouwen:
        return {"error": "Ontbrekende params: capakey + gebouwen vereist"}

    generate_and_store.spawn(capakey, gebouwen)
    return {"status": "queued", "n_gebouwen": len(gebouwen)}
