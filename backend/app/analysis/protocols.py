import subprocess
import math
from typing import List, Dict, Any
from backend.app.core.detector import detector
from backend.app.core.logging import logger

def calculate_shannon_entropy(data: str) -> float:
    if not data:
        return 0.0
    entropy = 0.0
    length = len(data)
    occ = {}
    for char in data:
        occ[char] = occ.get(char, 0) + 1
    for count in occ.values():
        p = count / length
        entropy -= p * math.log2(p)
    return round(entropy, 2)

class ProtocolAnalyzer:
    def __init__(self):
        deps = detector.detect_all()
        self.tshark_path = deps["dependencies"]["tshark"]["path"] or "tshark"

    def get_http_transactions(self, filepath: str) -> List[Dict[str, Any]]:
        cmd = [
            self.tshark_path,
            "-r", filepath,
            "-Y", "http",
            "-T", "fields",
            "-e", "frame.number",
            "-e", "frame.time_relative",
            "-e", "ip.src",
            "-e", "ip.dst",
            "-e", "http.request.method",
            "-e", "http.request.uri",
            "-e", "http.host",
            "-e", "http.response.code",
            "-e", "http.response.phrase",
            "-e", "http.user_agent",
            "-e", "http.content_type",
            "-e", "http.file_data",
            "-e", "http.cookie",
            "-E", "separator=\t",
            "-E", "quote=d"
        ]

        res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if res.returncode != 0:
            return []

        transactions = []
        for line in res.stdout.strip().splitlines():
            if not line.strip():
                continue
            parts = [p.strip('"') for p in line.split("\t")]
            while len(parts) < 13:
                parts.append("")

            pkt_no = int(parts[0]) if parts[0].isdigit() else 0
            time_rel = float(parts[1]) if parts[1] else 0.0
            src = parts[2]
            dst = parts[3]
            method = parts[4]
            uri = parts[5]
            host = parts[6]
            code = parts[7]
            phrase = parts[8]
            user_agent = parts[9]
            content_type = parts[10]
            raw_body = parts[11]
            body_preview = ""
            if raw_body:
                clean_hex = raw_body.replace(":", "").replace(" ", "").strip()
                try:
                    # If valid hex, decode it
                    decoded = bytes.fromhex(clean_hex).decode("utf-8", errors="replace")
                    body_preview = decoded[:200]
                except Exception:
                    body_preview = raw_body[:200]
            cookie = parts[12]

            # Security heuristics
            security_warnings = []
            if method:
                security_warnings.append("Plaintext HTTP transmission")
            if "passwd" in uri or "../" in uri or "win.ini" in uri:
                security_warnings.append("Potential Path Traversal in URI")
            if "union" in uri.lower() or "select" in uri.lower() or "'" in uri:
                security_warnings.append("Potential SQL Injection parameter")
            if "sqlmap" in user_agent.lower() or "nikto" in user_agent.lower():
                security_warnings.append(f"Known Scanner User-Agent: {user_agent}")
            if "password=" in body_preview.lower() or "passwd=" in body_preview.lower():
                security_warnings.append("Cleartext password in request body")

            transactions.append({
                "packet_no": pkt_no,
                "time_rel": time_rel,
                "src": src,
                "dst": dst,
                "type": "Request" if method else "Response",
                "method": method or None,
                "uri": uri or None,
                "host": host or None,
                "status_code": int(code) if code.isdigit() else None,
                "status_phrase": phrase or None,
                "user_agent": user_agent or None,
                "content_type": content_type or None,
                "body_preview": body_preview or None,
                "cookie": cookie or None,
                "warnings": security_warnings
            })
        return transactions

    def get_dns_records(self, filepath: str) -> List[Dict[str, Any]]:
        cmd = [
            self.tshark_path,
            "-r", filepath,
            "-Y", "dns",
            "-T", "fields",
            "-e", "frame.number",
            "-e", "frame.time_relative",
            "-e", "ip.src",
            "-e", "ip.dst",
            "-e", "dns.flags.response",
            "-e", "dns.qry.name",
            "-e", "dns.qry.type",
            "-e", "dns.resp.name",
            "-e", "dns.a",
            "-e", "dns.txt",
            "-e", "dns.flags.rcode",
            "-e", "dns.resp.ttl",
            "-E", "separator=\t",
            "-E", "quote=d"
        ]

        res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if res.returncode != 0:
            return []

        records = []
        dns_type_map = {"1": "A", "28": "AAAA", "16": "TXT", "5": "CNAME", "12": "PTR", "15": "MX"}

        for line in res.stdout.strip().splitlines():
            if not line.strip():
                continue
            parts = [p.strip('"') for p in line.split("\t")]
            while len(parts) < 12:
                parts.append("")

            pkt_no = int(parts[0]) if parts[0].isdigit() else 0
            time_rel = float(parts[1]) if parts[1] else 0.0
            src = parts[2]
            dst = parts[3]
            is_resp = parts[4] == "1"
            qname = parts[5]
            qtype_raw = parts[6]
            qtype = dns_type_map.get(qtype_raw, f"TYPE_{qtype_raw}" if qtype_raw else "A")
            answers = parts[8] or parts[9] or parts[7]
            rcode = parts[10]
            ttl = parts[11]

            # Heuristics: entropy & tunneling
            entropy = calculate_shannon_entropy(qname.split(".")[0]) if qname else 0.0
            tunneling_indicator = False
            warnings = []

            if len(qname) > 50:
                tunneling_indicator = True
                warnings.append("Unusually long DNS query name (>50 chars)")
            if entropy > 3.8 and len(qname.split(".")[0]) > 15:
                tunneling_indicator = True
                warnings.append(f"High Shannon entropy ({entropy}) in subdomain")
            if rcode == "3":
                warnings.append("NXDOMAIN response")

            records.append({
                "packet_no": pkt_no,
                "time_rel": time_rel,
                "src": src,
                "dst": dst,
                "is_response": is_resp,
                "query_name": qname,
                "query_type": qtype,
                "answers": answers or None,
                "response_code": "NOERROR" if rcode == "0" else (f"RCODE_{rcode}" if rcode else None),
                "ttl": int(ttl) if ttl.isdigit() else None,
                "entropy": entropy,
                "tunneling_indicator": tunneling_indicator,
                "warnings": warnings
            })
        return records

    def get_tls_sessions(self, filepath: str) -> List[Dict[str, Any]]:
        cmd = [
            self.tshark_path,
            "-r", filepath,
            "-Y", "tls.handshake",
            "-T", "fields",
            "-e", "frame.number",
            "-e", "frame.time_relative",
            "-e", "ip.src",
            "-e", "ip.dst",
            "-e", "tls.handshake.type",
            "-e", "tls.handshake.version",
            "-e", "tls.handshake.extensions_server_name",
            "-e", "tls.handshake.ciphersuite",
            "-e", "tls.handshake.alpn_str",
            "-E", "separator=\t",
            "-E", "quote=d"
        ]

        res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if res.returncode != 0:
            return []

        sessions = []
        for line in res.stdout.strip().splitlines():
            if not line.strip():
                continue
            parts = [p.strip('"') for p in line.split("\t")]
            while len(parts) < 9:
                parts.append("")

            pkt_no = int(parts[0]) if parts[0].isdigit() else 0
            time_rel = float(parts[1]) if parts[1] else 0.0
            src = parts[2]
            dst = parts[3]
            hs_type = parts[4]
            version = parts[5]
            sni = parts[6]
            ciphersuite = parts[7]
            alpn = parts[8]

            hs_name = "Client Hello" if hs_type == "1" else ("Server Hello" if hs_type == "2" else f"Handshake_{hs_type}")
            warnings = []
            if version in ["0x0300", "0x0301"]:
                warnings.append("Deprecated TLS version (SSL 3.0 / TLS 1.0)")

            sessions.append({
                "packet_no": pkt_no,
                "time_rel": time_rel,
                "src": src,
                "dst": dst,
                "handshake_type": hs_name,
                "version": version or "TLS 1.2/1.3",
                "sni": sni or None,
                "ciphersuite": ciphersuite or None,
                "alpn": alpn or None,
                "warnings": warnings
            })
        return sessions

protocol_analyzer = ProtocolAnalyzer()
