from typing import List, Dict, Any
from backend.app.analysis.protocols import protocol_analyzer

class IocExtractor:
    def extract_all(self, filepath: str, packets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        iocs: Dict[str, Dict[str, Any]] = {}

        # 1. IP Addresses
        for p in packets:
            for ip_key in ["src_ip", "dst_ip"]:
                ip = p.get(ip_key, "")
                if ip and ip != "Unknown" and not ip.startswith("127."):
                    key = f"ip:{ip}"
                    if key not in iocs:
                        iocs[key] = {
                            "type": "ip",
                            "value": ip,
                            "context": "Observed IP endpoint",
                            "first_seen_packet": p.get("packet_no", 1),
                            "count": 0
                        }
                    iocs[key]["count"] += 1

        # 2. Domains from DNS
        dns_recs = protocol_analyzer.get_dns_records(filepath)
        for d in dns_recs:
            qname = d.get("query_name")
            if qname:
                key = f"domain:{qname}"
                if key not in iocs:
                    ctx = "Suspicious DNS query" if d.get("tunneling_indicator") else "DNS query"
                    iocs[key] = {
                        "type": "domain",
                        "value": qname,
                        "context": ctx,
                        "first_seen_packet": d.get("packet_no", 1),
                        "count": 0
                    }
                iocs[key]["count"] += 1

        # 3. URLs and User Agents from HTTP
        http_txs = protocol_analyzer.get_http_transactions(filepath)
        for h in http_txs:
            uri = h.get("uri")
            host = h.get("host")
            if host and uri:
                url_val = f"http://{host}{uri}"
                key = f"url:{url_val}"
                if key not in iocs:
                    iocs[key] = {
                        "type": "url",
                        "value": url_val,
                        "context": "HTTP request destination",
                        "first_seen_packet": h.get("packet_no", 1),
                        "count": 0
                    }
                iocs[key]["count"] += 1

            ua = h.get("user_agent")
            if ua:
                key = f"user_agent:{ua}"
                if key not in iocs:
                    iocs[key] = {
                        "type": "user_agent",
                        "value": ua,
                        "context": "HTTP Client User-Agent",
                        "first_seen_packet": h.get("packet_no", 1),
                        "count": 0
                    }
                iocs[key]["count"] += 1

        res = list(iocs.values())
        res.sort(key=lambda x: x["count"], reverse=True)
        return res

ioc_extractor = IocExtractor()
