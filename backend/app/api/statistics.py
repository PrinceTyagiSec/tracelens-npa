from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.database.models import Capture, PacketRecord
from backend.app.statistics.stats_engine import stats_engine
from backend.app.schemas.analysis import EndpointStat, ConversationStat, IOGraphPoint

router = APIRouter(prefix="/captures/{capture_id}/statistics", tags=["Statistics"])

def load_capture_and_packets(capture_id: str, db: Session):
    capture = db.query(Capture).filter(Capture.id == capture_id).first()
    if not capture:
        raise HTTPException(status_code=404, detail="Capture not found")
    
    records = db.query(PacketRecord).filter(PacketRecord.capture_id == capture_id).order_by(PacketRecord.packet_no.asc()).all()
    packets = [
        {
            "packet_no": r.packet_no,
            "timestamp": r.timestamp,
            "time_delta": r.time_delta,
            "src_ip": r.src_ip,
            "dst_ip": r.dst_ip,
            "src_port": r.src_port,
            "dst_port": r.dst_port,
            "protocol": r.protocol,
            "length": r.length,
            "info": r.info
        }
        for r in records
    ]
    return capture, packets

@router.get("/endpoints", response_model=List[EndpointStat])
def get_endpoints(capture_id: str, db: Session = Depends(get_db)):
    _, packets = load_capture_and_packets(capture_id, db)
    return stats_engine.get_endpoints(packets)

@router.get("/conversations", response_model=List[ConversationStat])
def get_conversations(capture_id: str, db: Session = Depends(get_db)):
    _, packets = load_capture_and_packets(capture_id, db)
    return stats_engine.get_conversations(packets)

@router.get("/protocols")
def get_protocol_hierarchy(capture_id: str, db: Session = Depends(get_db)):
    capture, packets = load_capture_and_packets(capture_id, db)
    total_bytes = sum(p["length"] for p in packets)
    return stats_engine.get_protocol_hierarchy(capture.filepath, len(packets), total_bytes)

@router.get("/iograph", response_model=List[IOGraphPoint])
def get_iograph(capture_id: str, buckets: int = 25, db: Session = Depends(get_db)):
    _, packets = load_capture_and_packets(capture_id, db)
    return stats_engine.get_io_graph_points(packets, buckets)
