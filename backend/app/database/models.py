import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Capture(Base):
    __tablename__ = "captures"

    id = Column(String, primary_key=True, default=generate_uuid)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    file_size = Column(Integer, default=0)
    packet_count = Column(Integer, default=0)
    duration = Column(Float, default=0.0)
    start_time = Column(Float, nullable=True)
    end_time = Column(Float, nullable=True)
    status = Column(String, default="uploaded")  # uploaded, processing, indexing, ready, error
    error_message = Column(Text, nullable=True)
    capture_type = Column(String, default="file")  # file, live
    interface = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    packets = relationship("PacketRecord", back_populates="capture", cascade="all, delete-orphan")
    findings = relationship("SecurityFindingRecord", back_populates="capture", cascade="all, delete-orphan")
    endpoints = relationship("EndpointRecord", back_populates="capture", cascade="all, delete-orphan")
    conversations = relationship("ConversationRecord", back_populates="capture", cascade="all, delete-orphan")

class PacketRecord(Base):
    __tablename__ = "packets"

    id = Column(String, primary_key=True, default=generate_uuid)
    capture_id = Column(String, ForeignKey("captures.id"), nullable=False, index=True)
    packet_no = Column(Integer, nullable=False, index=True)
    timestamp = Column(Float, nullable=False)
    time_delta = Column(Float, default=0.0)
    src_ip = Column(String, index=True, default="")
    dst_ip = Column(String, index=True, default="")
    src_port = Column(Integer, nullable=True, index=True)
    dst_port = Column(Integer, nullable=True, index=True)
    protocol = Column(String, index=True, default="")
    length = Column(Integer, default=0)
    info = Column(Text, default="")
    marked = Column(Boolean, default=False)
    comment = Column(Text, nullable=True)
    raw_layers_json = Column(Text, nullable=True)  # Full parsed protocol layer hierarchy

    capture = relationship("Capture", back_populates="packets")

    __table_args__ = (
        Index("idx_capture_packetno", "capture_id", "packet_no"),
        Index("idx_capture_protocol", "capture_id", "protocol"),
    )

class SecurityFindingRecord(Base):
    __tablename__ = "security_findings"

    id = Column(String, primary_key=True, default=generate_uuid)
    capture_id = Column(String, ForeignKey("captures.id"), nullable=False, index=True)
    category = Column(String, nullable=False)
    title = Column(String, nullable=False)
    severity = Column(String, nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    confidence = Column(String, default="MEDIUM")  # HIGH, MEDIUM, LOW
    description = Column(Text, nullable=False)
    evidence = Column(Text, default="")
    affected_packets = Column(Text, default="[]")  # JSON list of packet numbers
    affected_hosts = Column(Text, default="[]")    # JSON list of host strings
    why_it_matters = Column(Text, default="")
    recommendation = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    capture = relationship("Capture", back_populates="findings")

class EndpointRecord(Base):
    __tablename__ = "endpoints"

    id = Column(String, primary_key=True, default=generate_uuid)
    capture_id = Column(String, ForeignKey("captures.id"), nullable=False, index=True)
    ip = Column(String, nullable=False, index=True)
    packets = Column(Integer, default=0)
    bytes = Column(Integer, default=0)
    packets_sent = Column(Integer, default=0)
    packets_recv = Column(Integer, default=0)
    bytes_sent = Column(Integer, default=0)
    bytes_recv = Column(Integer, default=0)

    capture = relationship("Capture", back_populates="endpoints")

class ConversationRecord(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=generate_uuid)
    capture_id = Column(String, ForeignKey("captures.id"), nullable=False, index=True)
    protocol = Column(String, nullable=False)
    host_a = Column(String, nullable=False)
    host_b = Column(String, nullable=False)
    port_a = Column(Integer, nullable=True)
    port_b = Column(Integer, nullable=True)
    packets = Column(Integer, default=0)
    bytes = Column(Integer, default=0)
    duration = Column(Float, default=0.0)
    stream_id = Column(Integer, nullable=True)

    capture = relationship("Capture", back_populates="conversations")
