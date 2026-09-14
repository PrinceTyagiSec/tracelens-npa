from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from backend.app.capture.live_capture import live_capture_manager

router = APIRouter(prefix="/capture", tags=["Live Capture"])

class StartCaptureRequest(BaseModel):
    interface: str
    bpf_filter: Optional[str] = ""
    snaplen: Optional[int] = 65535
    packet_limit: Optional[int] = 0

@router.get("/interfaces")
def list_interfaces():
    return live_capture_manager.get_interfaces()

@router.post("/start")
def start_capture(body: StartCaptureRequest):
    res = live_capture_manager.start_capture(
        interface=body.interface,
        bpf_filter=body.bpf_filter or "",
        snaplen=body.snaplen or 65535,
        packet_limit=body.packet_limit or 0
    )
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res

@router.post("/pause")
def pause_capture():
    live_capture_manager.pause_capture()
    return {"status": "paused"}

@router.post("/resume")
def resume_capture():
    live_capture_manager.resume_capture()
    return {"status": "resumed"}

@router.post("/stop")
def stop_capture():
    return live_capture_manager.stop_capture()
