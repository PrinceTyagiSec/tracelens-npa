from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class EndpointStat(BaseModel):
    ip: str
    packets: int
    bytes: int
    packets_sent: int
    packets_recv: int
    bytes_sent: int
    bytes_recv: int
    country: Optional[str] = "Local/Private"

    class Config:
        from_attributes = True

class ConversationStat(BaseModel):
    id: str
    protocol: str
    host_a: str
    host_b: str
    port_a: Optional[int] = None
    port_b: Optional[int] = None
    packets: int
    bytes: int
    duration: float
    stream_id: Optional[int] = None

    class Config:
        from_attributes = True

class ProtocolTreeNode(BaseModel):
    name: str
    protocol: str
    packets: int
    bytes: int
    percent_packets: float
    percent_bytes: float
    children: List["ProtocolTreeNode"] = []

class IOGraphPoint(BaseModel):
    timestamp: float
    time_label: str
    packets: int
    bytes: int
    tcp_packets: int
    udp_packets: int
    dns_packets: int
    http_packets: int
    tls_packets: int

class SecurityFinding(BaseModel):
    id: str
    category: str
    title: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    confidence: str  # HIGH, MEDIUM, LOW
    description: str
    evidence: str
    affected_packets: List[int] = []
    affected_hosts: List[str] = []
    why_it_matters: str
    recommendation: str
    created_at: datetime

    class Config:
        from_attributes = True

class RiskScore(BaseModel):
    score: int  # 0 - 100
    level: str  # LOW, MEDIUM, HIGH, CRITICAL
    findings_count: Dict[str, int]
    breakdown: Dict[str, int]
    label: str = "Heuristic assessment"

class IocItem(BaseModel):
    type: str  # ip, domain, url, user_agent, port, hash
    value: str
    context: str
    first_seen_packet: int
    count: int

class AiChatRequest(BaseModel):
    message: str
    capture_id: str
    selected_packet_no: Optional[int] = None
    history: List[Dict[str, str]] = []

class AiChatResponse(BaseModel):
    reply: str
    referenced_packets: List[int] = []
    model: str

class AiReportRequest(BaseModel):
    capture_id: str
    model: Optional[str] = None
