import io
import csv
import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, Response
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.database.models import Capture, PacketRecord
from backend.app.analysis.protocols import protocol_analyzer
from backend.app.analysis.security_rules import security_engine
from backend.app.analysis.ioc_extractor import ioc_extractor
from backend.app.schemas.analysis import SecurityFinding, RiskScore, IocItem

router = APIRouter(prefix="/captures/{capture_id}/analysis", tags=["Analysis & Security"])

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

@router.get("/http")
def get_http_transactions(capture_id: str, db: Session = Depends(get_db)):
    capture, _ = load_capture_and_packets(capture_id, db)
    return protocol_analyzer.get_http_transactions(capture.filepath)

@router.get("/dns")
def get_dns_records(capture_id: str, db: Session = Depends(get_db)):
    capture, _ = load_capture_and_packets(capture_id, db)
    return protocol_analyzer.get_dns_records(capture.filepath)

@router.get("/tls")
def get_tls_sessions(capture_id: str, db: Session = Depends(get_db)):
    capture, _ = load_capture_and_packets(capture_id, db)
    return protocol_analyzer.get_tls_sessions(capture.filepath)

@router.get("/findings", response_model=List[SecurityFinding])
def get_security_findings(capture_id: str, db: Session = Depends(get_db)):
    capture, packets = load_capture_and_packets(capture_id, db)
    findings, _ = security_engine.analyze_capture(capture.filepath, packets)
    return findings

@router.get("/risk", response_model=RiskScore)
def get_risk_score(capture_id: str, db: Session = Depends(get_db)):
    capture, packets = load_capture_and_packets(capture_id, db)
    _, risk = security_engine.analyze_capture(capture.filepath, packets)
    return risk

@router.get("/iocs", response_model=List[IocItem])
def get_iocs(capture_id: str, db: Session = Depends(get_db)):
    capture, packets = load_capture_and_packets(capture_id, db)
    return ioc_extractor.extract_all(capture.filepath, packets)

@router.get("/iocs/export")
def export_iocs(
    capture_id: str,
    format: str = Query(default="csv", pattern="^(csv|json|txt|stix)$"),
    db: Session = Depends(get_db)
):
    capture, packets = load_capture_and_packets(capture_id, db)
    iocs = ioc_extractor.extract_all(capture.filepath, packets)

    if format == "json":
        return Response(
            content=json.dumps(iocs, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=iocs_{capture_id}.json"}
        )
    elif format == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["type", "value", "context", "first_seen_packet", "count"])
        writer.writeheader()
        for item in iocs:
            writer.writerow(item)
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=iocs_{capture_id}.csv"}
        )
    elif format == "txt":
        lines = [f"{item['type'].upper()}: {item['value']}" for item in iocs]
        return Response(
            content="\n".join(lines),
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename=iocs_{capture_id}.txt"}
        )
    elif format == "stix":
        stix_objects = []
        for item in iocs:
            stix_objects.append({
                "type": "indicator",
                "spec_version": "2.1",
                "id": f"indicator--{hash(item['value'])}",
                "name": f"Indicator for {item['value']}",
                "pattern": f"[{item['type']}-addr:value = '{item['value']}']",
                "pattern_type": "stix"
            })
        stix_bundle = {"type": "bundle", "id": f"bundle--{capture_id}", "objects": stix_objects}
        return Response(
            content=json.dumps(stix_bundle, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=stix_{capture_id}.json"}
        )
