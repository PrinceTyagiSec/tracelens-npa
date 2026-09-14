from pydantic import BaseModel
from typing import Optional
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
