import subprocess
from typing import List, Dict, Any, Tuple
from backend.app.core.detector import detector
from backend.app.core.logging import logger

COMMON_FILTER_COMPLETIONS = [
    {"filter": "ip.addr == ", "desc": "Filter by IP address (source or destination)"},
    {"filter": "ip.src == ", "desc": "Filter by source IP address"},
    {"filter": "ip.dst == ", "desc": "Filter by destination IP address"},
    {"filter": "tcp", "desc": "Show all TCP packets"},
    {"filter": "udp", "desc": "Show all UDP packets"},
    {"filter": "icmp", "desc": "Show all ICMP packets"},
    {"filter": "dns", "desc": "Show all DNS traffic"},
    {"filter": "http", "desc": "Show all HTTP traffic"},
    {"filter": "tls", "desc": "Show all TLS / SSL traffic"},
    {"filter": "tcp.port == 80", "desc": "Filter HTTP TCP port 80"},
    {"filter": "tcp.port == 443", "desc": "Filter HTTPS TCP port 443"},
    {"filter": "udp.port == 53", "desc": "Filter DNS UDP port 53"},
    {"filter": "tcp.flags.syn == 1", "desc": "Filter TCP SYN packets"},
    {"filter": "tcp.flags.reset == 1", "desc": "Filter TCP RST packets"},
    {"filter": "http.request.method == \"GET\"", "desc": "Filter HTTP GET requests"},
    {"filter": "http.request.method == \"POST\"", "desc": "Filter HTTP POST requests"},
    {"filter": "http.response.code == 200", "desc": "Filter successful HTTP responses"},
    {"filter": "dns.qry.name contains \"google\"", "desc": "Filter DNS queries containing string"},
    {"filter": "frame.len > 1000", "desc": "Filter frames larger than 1000 bytes"},
    {"filter": "arp", "desc": "Show ARP packets"}
]

class FilterEngine:
    def __init__(self):
        deps = detector.detect_all()
        self.tshark_path = deps["dependencies"]["tshark"]["path"] or "tshark"

    def validate_filter(self, filter_expr: str, sample_pcap: str) -> Tuple[bool, str]:
        """
        Validates filter syntax against tshark.
        Returns (is_valid, error_message).
        """
        if not filter_expr or not filter_expr.strip():
            return True, ""
            
        cmd = [
            self.tshark_path,
            "-r", sample_pcap,
            "-Y", filter_expr.strip(),
            "-c", "1"
        ]
        
        res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if res.returncode == 0:
            return True, ""
        
        # Extract meaningful error
        err = res.stderr.strip()
        lines = [line for line in err.splitlines() if "tshark:" in line]
        clean_err = lines[0] if lines else err
        return False, clean_err

    def get_matching_packet_numbers(self, filepath: str, filter_expr: str) -> List[int]:
        """
        Evaluates display filter on capture and returns list of matching frame numbers.
        """
        if not filter_expr or not filter_expr.strip():
            return []

        cmd = [
            self.tshark_path,
            "-r", filepath,
            "-Y", filter_expr.strip(),
            "-T", "fields",
            "-e", "frame.number"
        ]
        
        res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if res.returncode != 0:
            logger.warning(f"Filter evaluation error: {res.stderr}")
            return []

        numbers = []
        for line in res.stdout.strip().splitlines():
            line = line.strip()
            if line.isdigit():
                numbers.append(int(line))
        return numbers

    def get_completions(self, query: str = "") -> List[Dict[str, str]]:
        if not query:
            return COMMON_FILTER_COMPLETIONS
        q = query.lower()
        return [c for c in COMMON_FILTER_COMPLETIONS if q in c["filter"].lower() or q in c["desc"].lower()]

filter_engine = FilterEngine()
