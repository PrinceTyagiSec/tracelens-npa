from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.app.database.session import get_db
from backend.app.database.models import Capture, PacketRecord
from backend.app.schemas.packet import (
    PacketSummary, PacketDetail, PacketCommentUpdate, DisplayFilterRequest,
    DisplayFilterValidation, StreamData
)
from backend.app.parsers.pcap_parser import pcap_parser
from backend.app.filters.filter_engine import filter_engine
from backend.app.parsers.stream_engine import stream_engine

router = APIRouter(prefix="/captures/{capture_id}/packets", tags=["Packets"])

@router.get("", response_model=List[PacketSummary])
def get_packets(
    capture_id: str,
    offset: int = 0,
    limit: int = 1000,
    search: Optional[str] = None,
    protocol: Optional[str] = None,
    marked_only: bool = False,
    db: Session = Depends(get_db)
):
    query = db.query(PacketRecord).filter(PacketRecord.capture_id == capture_id)
    
    if marked_only:
        query = query.filter(PacketRecord.marked == True)
        
    if protocol:
        query = query.filter(PacketRecord.protocol.ilike(f"%{protocol}%"))
        
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                PacketRecord.src_ip.ilike(s),
                PacketRecord.dst_ip.ilike(s),
                PacketRecord.protocol.ilike(s),
                PacketRecord.info.ilike(s),
                PacketRecord.comment.ilike(s)
            )
        )
        
    packets = query.order_by(PacketRecord.packet_no.asc()).offset(offset).limit(limit).all()
    return packets

@router.get("/{packet_no}", response_model=PacketDetail)
def get_packet_detail(
    capture_id: str,
    packet_no: int,
    db: Session = Depends(get_db)
):
    capture = db.query(Capture).filter(Capture.id == capture_id).first()
    if not capture:
        raise HTTPException(status_code=404, detail="Capture not found")

    rec = db.query(PacketRecord).filter(
        PacketRecord.capture_id == capture_id,
        PacketRecord.packet_no == packet_no
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Packet record not found")

    # Get deep layers and hex
    details = pcap_parser.get_packet_details(capture.filepath, packet_no)

    return PacketDetail(
        id=rec.id,
        packet_no=rec.packet_no,
        timestamp=rec.timestamp,
        time_delta=rec.time_delta,
        src_ip=rec.src_ip,
        dst_ip=rec.dst_ip,
        src_port=rec.src_port,
        dst_port=rec.dst_port,
        protocol=rec.protocol,
        length=rec.length,
        info=rec.info,
        marked=rec.marked,
        comment=rec.comment,
        raw_layers=details.get("layers", []),
        hex_dump=details.get("hex_dump", ""),
        ascii_dump=details.get("ascii_dump", ""),
        raw_hex=details.get("raw_hex", "")
    )

@router.patch("/{packet_no}/comment", response_model=PacketSummary)
def update_packet_comment(
    capture_id: str,
    packet_no: int,
    body: PacketCommentUpdate,
    db: Session = Depends(get_db)
):
    rec = db.query(PacketRecord).filter(
        PacketRecord.capture_id == capture_id,
        PacketRecord.packet_no == packet_no
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Packet not found")

    if body.comment is not None:
        rec.comment = body.comment
    if body.marked is not None:
        rec.marked = body.marked

    db.commit()
    db.refresh(rec)
    return rec

@router.post("/filter")
def evaluate_display_filter(
    capture_id: str,
    body: DisplayFilterRequest,
    db: Session = Depends(get_db)
):
    capture = db.query(Capture).filter(Capture.id == capture_id).first()
    if not capture:
        raise HTTPException(status_code=404, detail="Capture not found")

    matching = filter_engine.get_matching_packet_numbers(capture.filepath, body.filter_expr)
    return {
        "filter_expr": body.filter_expr,
        "matching_count": len(matching),
        "matching_packet_numbers": matching
    }

@router.get("/streams/{stream_id}")
def get_stream(
    capture_id: str,
    stream_id: int = 0,
    protocol: str = "tcp",
    db: Session = Depends(get_db)
):
    capture = db.query(Capture).filter(Capture.id == capture_id).first()
    if not capture:
        raise HTTPException(status_code=404, detail="Capture not found")

    stream_data = stream_engine.follow_stream(capture.filepath, stream_id, protocol)
    return stream_data
