from fastapi import APIRouter, Query
from backend.app.schemas.packet import DisplayFilterValidation, DisplayFilterRequest
from backend.app.filters.filter_engine import filter_engine
from backend.app.core.config import CAPTURES_DIR

router = APIRouter(prefix="/filter", tags=["Filter Engine"])

@router.post("/validate", response_model=DisplayFilterValidation)
def validate_filter(body: DisplayFilterRequest):
    # Use sample capture or existing PCAP to validate
    sample_pcap = str(CAPTURES_DIR / "sample_traffic.pcap")
    valid, err = filter_engine.validate_filter(body.filter_expr, sample_pcap)
    return DisplayFilterValidation(
        valid=valid,
        filter_expr=body.filter_expr,
        error=err if not valid else None
    )

@router.get("/autocomplete")
def get_autocomplete(q: str = Query(default="")):
    return filter_engine.get_completions(q)
