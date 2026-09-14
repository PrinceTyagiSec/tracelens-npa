import re
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.app.database.session import get_db
from backend.app.database.models import Capture, PacketRecord
from backend.app.ai.ollama_client import ollama_client
from backend.app.ai.context_engine import context_engine, SYSTEM_PROMPT
from backend.app.ai.report_engine import report_engine
from backend.app.ai.tools import SafeAiTools
from backend.app.schemas.analysis import AiChatRequest, AiChatResponse, AiReportRequest
from backend.app.filters.filter_engine import filter_engine

router = APIRouter(prefix="/ai", tags=["AI Copilot"])

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

@router.get("/status")
async def get_ai_status():
    return await ollama_client.check_health()

@router.post("/chat", response_model=AiChatResponse)
async def ai_chat(body: AiChatRequest, db: Session = Depends(get_db)):
    capture, packets = load_capture_and_packets(body.capture_id, db)
    
    # 1. Build context via RAG engine
    context_text = context_engine.build_context_for_query(
        query=body.message,
        filepath=capture.filepath,
        packets=packets,
        selected_packet_no=body.selected_packet_no
    )

    messages = [
        {"role": "system", "content": f"{SYSTEM_PROMPT}\n\nRELEVANT CAPTURED NETWORK DATA:\n{context_text}"}
    ]

    # Include recent history if provided
    for h in body.history[-4:]:
        messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})

    messages.append({"role": "user", "content": body.message})

    # Query local Ollama
    health = await ollama_client.check_health()
    if not health.get("connected"):
        return AiChatResponse(
            reply="Local Ollama AI is currently offline. Please ensure Ollama is running on http://localhost:11434.",
            referenced_packets=[],
            model="offline"
        )

    model_name = health.get("default_model") or "llama3.1:8b"
    reply = await ollama_client.chat(messages=messages, model=model_name)

    # Extract referenced packets
    tools = SafeAiTools(capture.filepath, packets)
    referenced_packets = tools.extract_referenced_packet_numbers(reply)
    if body.selected_packet_no and body.selected_packet_no not in referenced_packets:
        referenced_packets.append(body.selected_packet_no)

    return AiChatResponse(
        reply=reply,
        referenced_packets=referenced_packets,
        model=model_name
    )

class ExplainPacketRequest(BaseModel):
    capture_id: str
    packet_no: int

@router.post("/explain_packet")
async def explain_packet(body: ExplainPacketRequest, db: Session = Depends(get_db)):
    capture, packets = load_capture_and_packets(body.capture_id, db)
    
    prompt = f"Explain packet #{body.packet_no} in detail. What protocol is it, what is the source/destination doing, and is there any security or diagnostic significance?"
    context_text = context_engine.build_context_for_query(
        query=prompt,
        filepath=capture.filepath,
        packets=packets,
        selected_packet_no=body.packet_no
    )

    messages = [
        {"role": "system", "content": f"{SYSTEM_PROMPT}\n\nRELEVANT CAPTURED NETWORK DATA:\n{context_text}"},
        {"role": "user", "content": prompt}
    ]

    health = await ollama_client.check_health()
    if not health.get("connected"):
        return {"explanation": "Ollama is offline. Start Ollama and try again.", "referenced_packets": [body.packet_no]}

    reply = await ollama_client.chat(messages=messages, model=health.get("default_model"))
    return {
        "packet_no": body.packet_no,
        "explanation": reply,
        "referenced_packets": [body.packet_no]
    }

class GenerateFilterRequest(BaseModel):
    prompt: str
    capture_id: str

@router.post("/generate_filter")
async def generate_filter(body: GenerateFilterRequest, db: Session = Depends(get_db)):
    capture, packets = load_capture_and_packets(body.capture_id, db)
    
    prompt = (
        f"The user wants a Wireshark display filter for the following request:\n"
        f"\"{body.prompt}\"\n\n"
        f"Return ONLY the exact valid Wireshark display filter string enclosed in backticks (e.g. `tcp.port == 443`). Do not include any explanations."
    )

    health = await ollama_client.check_health()
    if not health.get("connected"):
        return {"filter_expr": "", "valid": False, "error": "Ollama offline"}

    reply = await ollama_client.chat(
        messages=[{"role": "user", "content": prompt}],
        model=health.get("default_model")
    )

    # Extract filter from backticks or first line
    match = re.search(r"`([^`]+)`", reply)
    filter_candidate = match.group(1).strip() if match else reply.strip().splitlines()[0].strip()

    valid, err = filter_engine.validate_filter(filter_candidate, capture.filepath)
    return {
        "filter_expr": filter_candidate,
        "valid": valid,
        "error": err if not valid else None
    }

@router.post("/report")
async def generate_ai_report(body: AiReportRequest, db: Session = Depends(get_db)):
    capture, packets = load_capture_and_packets(body.capture_id, db)
    report = await report_engine.generate_comprehensive_report(capture.filepath, packets, body.model)
    return report
