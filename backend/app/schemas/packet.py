from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class CaptureSummary(BaseModel):
    id: str
    filename: str
    file_size: int
    packet_count: int
    duration: float
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    status: str
    error_message: Optional[str] = None
    capture_type: str
    interface: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class PacketSummary(BaseModel):
    id: str
    packet_no: int
    timestamp: float
    time_delta: float
    src_ip: str
    dst_ip: str
    src_port: Optional[int] = None
    dst_port: Optional[int] = None
    protocol: str
    length: int
    info: str
    marked: bool = False
    comment: Optional[str] = None

    class Config:
        from_attributes = True

class ProtocolLayerField(BaseModel):
    name: str
    value: str
    description: Optional[str] = None

class ProtocolLayer(BaseModel):
    name: str
    summary: str
    fields: Dict[str, Any] = {}
    expanded: bool = False

class PacketDetail(PacketSummary):
    raw_layers: List[ProtocolLayer] = []
    hex_dump: str = ""
    ascii_dump: str = ""
    raw_hex: str = ""

class PacketCommentUpdate(BaseModel):
    comment: Optional[str] = None
    marked: Optional[bool] = None

class DisplayFilterRequest(BaseModel):
    filter_expr: str

class DisplayFilterValidation(BaseModel):
    valid: bool
    filter_expr: str
    error: Optional[str] = None
    suggested_corrections: Optional[List[str]] = None

class StreamMessage(BaseModel):
    direction: str  # "client_to_server" | "server_to_client"
    payload_ascii: str
    payload_hex: str
    payload_raw: str
    src: str
    dst: str
    timestamp: float
    length: int

class StreamData(BaseModel):
    stream_id: int
    protocol: str
    client: str
    server: str
    total_packets: int
    total_bytes: int
    messages: List[StreamMessage]
