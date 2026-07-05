"""FastAPI server exposing the digital factory model."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from cm_process_model.impact_model import build_export_bundle, build_impact_summary
from cm_process_model.plant_topology import build_plant_topology
from cm_process_model.process_guide import build_process_guide

app = FastAPI(title="Cultivated Meat Process Model", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/factory")
def get_factory() -> dict:
    return build_plant_topology()


@app.get("/api/guide")
def get_guide() -> dict:
    return build_process_guide()


@app.get("/api/impact")
def get_impact() -> dict:
    return build_impact_summary()


@app.get("/api/export")
def export_all() -> JSONResponse:
    bundle = build_export_bundle()
    return JSONResponse(
        content=bundle,
        headers={"Content-Disposition": "attachment; filename=cm-factory-export.json"},
    )


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _maybe_mount_frontend() -> None:
    dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
    if dist.is_dir():
        app.mount("/", StaticFiles(directory=str(dist), html=True), name="frontend")


_maybe_mount_frontend()


def main() -> None:
    import uvicorn

    uvicorn.run("cm_process_model.api:app", host="0.0.0.0", port=8000, reload=True)
