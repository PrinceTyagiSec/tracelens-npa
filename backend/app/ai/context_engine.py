import json
import re
from typing import Dict, Any, List, Optional
from backend.app.ai.tools import SafeAiTools
from backend.app.statistics.stats_engine import stats_engine
from backend.app.analysis.security_rules import security_engine

SYSTEM_PROMPT = """You are TraceLens AI, an expert offline network security analyst and packet dissection copilot.
Your job is to analyze captured network packets and assist security engineers with deep evidence-based insights.

CRITICAL RULES:
1. Ground every conclusion strictly in the provided network packet evidence. Do NOT hallucinate packets, IPs, or protocols that do not exist in the context.
2. Whenever discussing specific events, ALWAYS cite the exact packet number (e.g., 'Packet 9', 'Packets 16-25').
3. For security findings or alerts, structure your answer clearly with:
   - ### Summary
   - ### Evidence (citing exact packet numbers, protocols, and payloads)
   - ### Affected Hosts & Packets
   - ### Why It Matters
   - ### Recommended Next Steps
4. If asked about a display filter, propose a valid Wireshark display filter syntax enclosed in backticks (e.g. `tcp.port == 443`).
"""

class AiContextEngine:
    def build_context_for_query(
        self,
        query: str,
        filepath: str,
        packets: List[Dict[str, Any]],
        selected_packet_no: Optional[int] = None
    ) -> str:
        tools = SafeAiTools(filepath, packets)
        q_lower = query.lower()
        context_sections = []

        # 1. Base capture summary
        total_packets = len(packets)
        duration = packets[-1]["time_delta"] - packets[0]["time_delta"] if len(packets) > 1 else 0.0
        unique_ips = set()
        proto_counts = {}
        for p in packets:
            if p.get("src_ip"): unique_ips.add(p["src_ip"])
            if p.get("dst_ip"): unique_ips.add(p["dst_ip"])
            proto = p.get("protocol", "OTHER")
            proto_counts[proto] = proto_counts.get(proto, 0) + 1

        context_sections.append(
            f"=== CAPTURE OVERVIEW ===\n"
            f"Total Packets: {total_packets}\n"
            f"Duration: {duration:.2f} seconds\n"
            f"Active Hosts: {sorted(list(unique_ips))[:10]}\n"
            f"Protocol Distribution: {json.dumps(proto_counts)}\n"
        )

        # 2. Check if user asked about a specific packet or has a packet selected
        target_pkt = selected_packet_no
        pkt_match = re.search(r"(?:packet|frame)\s*#?\s*(\d+)", q_lower)
        if pkt_match:
            target_pkt = int(pkt_match.group(1))

        if target_pkt and 1 <= target_pkt <= len(packets):
            detail = tools.get_packet(target_pkt)
            context_sections.append(
                f"=== SELECTED PACKET {target_pkt} DETAILS ===\n"
                f"Summary: {json.dumps(detail['summary'])}\n"
                f"Decoded Layers: {json.dumps(detail['layers'], indent=2)}\n"
                f"Layer Fields: {json.dumps(detail['layer_fields'], indent=2)}\n"
                f"Hex/ASCII Dump:\n{detail['hex_preview']}\n"
            )

        # 3. Security Findings context if query is security-related
        if any(w in q_lower for w in ["suspicious", "security", "attack", "threat", "scan", "credential", "password", "malicious", "exfiltration", "risk"]):
            findings, risk = security_engine.analyze_capture(filepath, packets)
            context_sections.append(
                f"=== DETECTED SECURITY FINDINGS & RISK ===\n"
                f"Network Risk Score: {risk['score']}/100 ({risk['level']})\n"
                f"Findings Count: {len(findings)}\n"
                f"Details:\n" + "\n".join(
                    f"- [{f['severity']}] {f['title']}: {f['description']} (Affected Packets: {f['affected_packets']}, Evidence: {f['evidence']})"
                    for f in findings
                ) + "\n"
            )

        # 4. DNS context if query mentions DNS / domain
        if any(w in q_lower for w in ["dns", "domain", "query", "resolve", "tunnel"]):
            dns_recs = tools.get_dns_queries()
            context_sections.append(
                f"=== DNS ACTIVITY ({len(dns_recs)} records) ===\n" +
                "\n".join(
                    f"- Packet {d['packet_no']}: {d['query_type']} '{d['query_name']}' -> Answers: {d['answers']} (Entropy: {d['entropy']}, Warnings: {d['warnings']})"
                    for d in dns_recs[:15]
                ) + "\n"
            )

        # 5. HTTP context if query mentions HTTP / web / login / url
        if any(w in q_lower for w in ["http", "web", "get", "post", "url", "login", "cookie"]):
            http_txs = tools.get_http_requests()
            context_sections.append(
                f"=== HTTP TRANSACTIONS ({len(http_txs)} transactions) ===\n" +
                "\n".join(
                    f"- Packet {h['packet_no']}: {h.get('method', 'RESP')} {h.get('uri', '')} Status: {h.get('status_code', '')} Host: {h.get('host', '')} Body: {h.get('body_preview', '')} Warnings: {h.get('warnings')}"
                    for h in http_txs[:15]
                ) + "\n"
            )

        # 6. Endpoints / Talkers context
        if any(w in q_lower for w in ["talker", "endpoint", "traffic", "host", "who", "most"]):
            endpoints = stats_engine.get_endpoints(packets)
            context_sections.append(
                f"=== TOP ENDPOINTS ===\n" +
                "\n".join(
                    f"- {e['ip']}: {e['bytes']} bytes, {e['packets']} packets ({e['country']})"
                    for e in endpoints[:8]
                ) + "\n"
            )

        # If user asks a general question and no specialized context added, include sample packets & security
        if len(context_sections) == 1:
            findings, risk = security_engine.analyze_capture(filepath, packets)
            context_sections.append(
                f"=== SECURITY SUMMARY ===\nRisk Score: {risk['score']} ({risk['level']}), Findings: {len(findings)}\n"
            )
            context_sections.append(
                f"=== PACKET SAMPLE (First 15 packets) ===\n" +
                "\n".join(
                    f"Pkt #{p['packet_no']} [{p['protocol']}]: {p['src_ip']} -> {p['dst_ip']} | {p['info']}"
                    for p in packets[:15]
                ) + "\n"
            )

        return "\n".join(context_sections)

context_engine = AiContextEngine()
