import uuid
from typing import List, Dict, Any, Tuple
from backend.app.schemas.analysis import SecurityFinding, RiskScore
from backend.app.analysis.protocols import protocol_analyzer

class SecurityEngine:
    def analyze_capture(self, filepath: str, packets: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        findings = []

        # 1. Scan for Plaintext Credentials in HTTP
        http_txs = protocol_analyzer.get_http_transactions(filepath)
        for tx in http_txs:
            body = (tx.get("body_preview") or "").lower()
            uri = (tx.get("uri") or "").lower()
            if "password=" in body or "passwd=" in body or "pwd=" in body or "password=" in uri:
                findings.append({
                    "id": str(uuid.uuid4()),
                    "category": "Credential Exposure",
                    "title": "Plaintext Credentials in HTTP Transmission",
                    "severity": "HIGH",
                    "confidence": "HIGH",
                    "description": "Cleartext user authentication credentials were transmitted over unencrypted HTTP.",
                    "evidence": f"Packet {tx['packet_no']}: {tx.get('method')} {tx.get('uri')}\nBody sample: {tx.get('body_preview')}",
                    "affected_packets": [tx["packet_no"]],
                    "affected_hosts": [tx["src"], tx["dst"]],
                    "why_it_matters": "Credentials sent over unencrypted channels are vulnerable to packet sniffing, credential theft, and unauthorized account access.",
                    "recommendation": "Enforce HTTPS with TLS 1.3 across all authentication endpoints and invalidate any exposed credentials."
                })

            # Check web attack indicators in HTTP
            if any("Path Traversal" in w for w in tx.get("warnings", [])):
                findings.append({
                    "id": str(uuid.uuid4()),
                    "category": "Web Application Attack",
                    "title": "Directory / Path Traversal Probe Detected",
                    "severity": "MEDIUM",
                    "confidence": "MEDIUM",
                    "description": "HTTP request contains dot-dot-slash sequence ('../../') commonly used to access restricted system files.",
                    "evidence": f"Packet {tx['packet_no']}: {tx.get('method')} {tx.get('uri')}",
                    "affected_packets": [tx["packet_no"]],
                    "affected_hosts": [tx["src"], tx["dst"]],
                    "why_it_matters": "If the web application fails to sanitize input, directory traversal allows reading sensitive files such as /etc/passwd or application configurations.",
                    "recommendation": "Implement strict server-side filename validation and canonical path checks."
                })

            if any("Scanner" in w for w in tx.get("warnings", [])):
                findings.append({
                    "id": str(uuid.uuid4()),
                    "category": "Reconnaissance",
                    "title": "Security Scanner User-Agent Detected",
                    "severity": "LOW",
                    "confidence": "HIGH",
                    "description": f"Automated vulnerability scanner identified via User-Agent: {tx.get('user_agent')}.",
                    "evidence": f"Packet {tx['packet_no']}: User-Agent '{tx.get('user_agent')}'",
                    "affected_packets": [tx["packet_no"]],
                    "affected_hosts": [tx["src"]],
                    "why_it_matters": "Automated security scanners systematically probe for exploitable vulnerabilities.",
                    "recommendation": "Block scanner IP at firewall or WAF and audit access logs."
                })

        # 2. Scan for Port Scanning / Rapid TCP SYN Scans
        syn_packets = [p for p in packets if "SYN" in p.get("info", "") and "ACK" not in p.get("info", "")]
        scanners = {}
        for p in syn_packets:
            src = p.get("src_ip")
            dst = p.get("dst_ip")
            dport = p.get("dst_port")
            if src and dst and dport:
                scanners.setdefault(src, {}).setdefault(dst, []).append((p["packet_no"], dport))

        for src, targets in scanners.items():
            for dst, probed in targets.items():
                ports = {port for _, port in probed}
                if len(ports) >= 5:  # 5 or more unique probed ports
                    pkts = [no for no, _ in probed]
                    findings.append({
                        "id": str(uuid.uuid4()),
                        "category": "Reconnaissance",
                        "title": "TCP SYN Port Scan Detected",
                        "severity": "HIGH",
                        "confidence": "HIGH",
                        "description": f"Host {src} initiated rapid TCP SYN connections across {len(ports)} distinct ports targeting {dst}.",
                        "evidence": f"Targeted ports: {sorted(list(ports))[:15]}\nObserved packets: {pkts[:10]} (total: {len(pkts)})",
                        "affected_packets": pkts,
                        "affected_hosts": [src, dst],
                        "why_it_matters": "Port scanning is standard pre-attack reconnaissance used to identify open services and unpatched daemons.",
                        "recommendation": "Isolate the scanning host {src} if internal, or block at edge firewall if external."
                    })

        # 3. DNS Tunneling and High Entropy Anomaly
        dns_recs = protocol_analyzer.get_dns_records(filepath)
        for rec in dns_recs:
            if rec.get("tunneling_indicator"):
                findings.append({
                    "id": str(uuid.uuid4()),
                    "category": "Data Exfiltration / C2",
                    "title": "Suspicious DNS Tunneling / High-Entropy Query",
                    "severity": "HIGH",
                    "confidence": "MEDIUM",
                    "description": "DNS query exhibits high Shannon entropy and abnormal domain length characteristic of DNS tunneling or DGA (Domain Generation Algorithms).",
                    "evidence": f"Packet {rec['packet_no']}: Query '{rec['query_name']}' (Entropy: {rec['entropy']})",
                    "affected_packets": [rec["packet_no"]],
                    "affected_hosts": [rec["src"], rec["dst"]],
                    "why_it_matters": "DNS tunneling can bypass firewalls to exfiltrate sensitive data or establish covert Command-and-Control channels.",
                    "recommendation": "Investigate host {rec['src']} process telemetry and block the suspicious parent domain."
                })

        # 4. Calculate Heuristic Network Risk Score (0-100)
        sev_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
        for f in findings:
            sev_counts[f["severity"]] = sev_counts.get(f["severity"], 0) + 1

        raw_score = (sev_counts["CRITICAL"] * 30) + (sev_counts["HIGH"] * 20) + (sev_counts["MEDIUM"] * 10) + (sev_counts["LOW"] * 5)
        score = min(max(raw_score, 0), 100)

        level = "LOW"
        if score >= 75:
            level = "CRITICAL"
        elif score >= 50:
            level = "HIGH"
        elif score >= 25:
            level = "MEDIUM"

        risk_data = {
            "score": score,
            "level": level,
            "findings_count": sev_counts,
            "breakdown": {
                "credential_exposure": sum(1 for f in findings if f["category"] == "Credential Exposure"),
                "reconnaissance": sum(1 for f in findings if f["category"] == "Reconnaissance"),
                "dns_tunneling": sum(1 for f in findings if f["category"] == "Data Exfiltration / C2"),
                "web_attacks": sum(1 for f in findings if f["category"] == "Web Application Attack")
            },
            "label": "Heuristic assessment"
        }

        return findings, risk_data

security_engine = SecurityEngine()
