import re
from typing import Dict, Any, List, Optional
from backend.app.parsers.pcap_parser import pcap_parser
from backend.app.filters.filter_engine import filter_engine
from backend.app.analysis.protocols import protocol_analyzer
from backend.app.analysis.security_rules import security_engine
from backend.app.parsers.stream_engine import stream_engine

class SafeAiTools:
    """
    Allowlisted backend tools callable by AI analysis queries.
    Never executes arbitrary commands or SQL.
    """
    def __init__(self, filepath: str, packets: List[Dict[str, Any]]):
        self.filepath = filepath
        self.packets = packets

    def get_packet(self, packet_no: int) -> Dict[str, Any]:
        pkt_summary = next((p for p in self.packets if p["packet_no"] == packet_no), None)
        detail = pcap_parser.get_packet_details(self.filepath, packet_no)
        return {
            "summary": pkt_summary,
            "layers": [l["summary"] for l in detail.get("layers", [])],
            "layer_fields": {l["name"]: l["fields"] for l in detail.get("layers", [])},
            "hex_preview": detail.get("hex_dump", "")[:400]
        }

    def search_packets(self, filter_expr: str, max_results: int = 15) -> List[Dict[str, Any]]:
        matching_nos = filter_engine.get_matching_packet_numbers(self.filepath, filter_expr)
        results = [p for p in self.packets if p["packet_no"] in matching_nos]
        return results[:max_results]

    def get_security_findings(self) -> List[Dict[str, Any]]:
        findings, risk = security_engine.analyze_capture(self.filepath, self.packets)
        return findings

    def get_dns_queries(self, query_substr: str = "") -> List[Dict[str, Any]]:
        records = protocol_analyzer.get_dns_records(self.filepath)
        if query_substr:
            records = [r for r in records if query_substr.lower() in r["query_name"].lower()]
        return records

    def get_http_requests(self) -> List[Dict[str, Any]]:
        return protocol_analyzer.get_http_transactions(self.filepath)

    def get_tls_sessions(self) -> List[Dict[str, Any]]:
        return protocol_analyzer.get_tls_sessions(self.filepath)

    def get_stream(self, stream_id: int = 0) -> Dict[str, Any]:
        return stream_engine.follow_stream(self.filepath, stream_id)

    def extract_referenced_packet_numbers(self, text: str) -> List[int]:
        """
        Extracts mentions of packet numbers from AI generated response (e.g. 'Packet 9', 'packet #11').
        """
        matches = re.findall(r"(?:packet|frame)\s*#?\s*(\d+)", text, re.IGNORECASE)
        valid_nos = {int(m) for m in matches if int(m) <= len(self.packets) and int(m) > 0}
        return sorted(list(valid_nos))
