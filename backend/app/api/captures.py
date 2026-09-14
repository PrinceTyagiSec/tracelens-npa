import os
import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.app.core.config import CAPTURES_DIR, settings
from backend.app.core.logging import logger
from backend.app.database.session import get_db
from backend.app.database.models import Capture, PacketRecord
from backend.app.parsers.pcap_parser import pcap_parser
from backend.app.schemas.capture import CaptureSummary
from backend.scripts.generate_sample_pcap import generate_rich_sample_pcap

router = APIRouter(prefix="/captures", tags=["Captures"])

def ingest_pcap_background(capture_id: str, filepath: str, db_factory):
    db: Session = db_factory()
    try:
        capture = db.query(Capture).filter(Capture.id == capture_id).first()
        if not capture:
            return

        capture.status = "processing"
        db.commit()

        # Parse summary stream
        packets = pcap_parser.parse_summary_stream(filepath)
        capture.packet_count = len(packets)
        
        if packets:
            capture.start_time = packets[0]["timestamp"]
            capture.end_time = packets[-1]["timestamp"]
            capture.duration = round(packets[-1]["time_delta"] - packets[0]["time_delta"], 4)
        
        capture.status = "indexing"
        db.commit()

        # Insert packet records in batches
        batch = []
        for p in packets:
            rec = PacketRecord(
                capture_id=capture_id,
                packet_no=p["packet_no"],
                timestamp=p["timestamp"],
                time_delta=p["time_delta"],
                src_ip=p["src_ip"],
                dst_ip=p["dst_ip"],
                src_port=p["src_port"],
                dst_port=p["dst_port"],
                protocol=p["protocol"],
                length=p["length"],
                info=p["info"],
                marked=False,
                comment=None
            )
            batch.append(rec)
            if len(batch) >= 1000:
                db.bulk_save_objects(batch)
                db.commit()
                batch = []

        if batch:
            db.bulk_save_objects(batch)
            db.commit()

        capture.status = "ready"
        db.commit()
        logger.info(f"Capture {capture_id} fully indexed ({len(packets)} packets).")
    except Exception as e:
        logger.error(f"Error ingesting PCAP {capture_id}: {e}")
        capture = db.query(Capture).filter(Capture.id == capture_id).first()
        if capture:
            capture.status = "error"
            capture.error_message = str(e)
            db.commit()
    finally:
        db.close()

@router.post("/upload", response_model=CaptureSummary)
async def upload_pcap(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    ext = Path(file.filename).suffix.lower()
    if ext not in [".pcap", ".pcapng", ".cap"]:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload .pcap or .pcapng")

    capture = Capture(
        filename=file.filename,
        filepath="",
        file_size=0,
        status="uploading",
        capture_type="file"
    )
    db.add(capture)
    db.commit()
    db.refresh(capture)

    saved_path = CAPTURES_DIR / f"{capture.id}_{file.filename}"
    size = 0
    with open(saved_path, "wb") as buf:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
                raise HTTPException(status_code=413, detail=f"File exceeds maximum upload size of {settings.MAX_UPLOAD_SIZE_MB}MB")
            buf.write(chunk)

    capture.filepath = str(saved_path.resolve())
    capture.file_size = size
    capture.status = "processing"
    db.commit()
    db.refresh(capture)

    from backend.app.database.session import SessionLocal
    background_tasks.add_task(ingest_pcap_background, capture.id, capture.filepath, SessionLocal)

    return capture

@router.post("/sample", response_model=CaptureSummary)
def generate_sample_capture(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Creates a sample multi-protocol capture for immediate testing."""
    sample_file = CAPTURES_DIR / "sample_traffic.pcap"
    generate_rich_sample_pcap(sample_file)
    file_size = sample_file.stat().st_size

    capture = Capture(
        filename="sample_traffic.pcap",
        filepath=str(sample_file.resolve()),
        file_size=file_size,
        status="processing",
        capture_type="file"
    )
    db.add(capture)
    db.commit()
    db.refresh(capture)

    from backend.app.database.session import SessionLocal
    background_tasks.add_task(ingest_pcap_background, capture.id, capture.filepath, SessionLocal)
    return capture

@router.get("", response_model=List[CaptureSummary])
def list_captures(db: Session = Depends(get_db)):
    return db.query(Capture).order_by(Capture.created_at.desc()).all()

@router.get("/{capture_id}", response_model=CaptureSummary)
def get_capture(capture_id: str, db: Session = Depends(get_db)):
    capture = db.query(Capture).filter(Capture.id == capture_id).first()
    if not capture:
        raise HTTPException(status_code=404, detail="Capture not found")
    return capture

@router.delete("/{capture_id}")
def delete_capture(capture_id: str, db: Session = Depends(get_db)):
    capture = db.query(Capture).filter(Capture.id == capture_id).first()
    if not capture:
        raise HTTPException(status_code=404, detail="Capture not found")
    
    if capture.filepath and os.path.exists(capture.filepath):
        try:
            os.remove(capture.filepath)
        except Exception:
            pass

    db.delete(capture)
    db.commit()
    return {"status": "deleted", "id": capture_id}
