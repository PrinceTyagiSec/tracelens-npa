import json
from datetime import datetime
from typing import Dict, Any, List
from backend.app.ai.ollama_client import ollama_client
from backend.app.statistics.stats_engine import stats_engine
from backend.app.analysis.security_rules import security_engine
from backend.app.analysis.protocols import protocol_analyzer
from backend.app.analysis.ioc_extractor import ioc_extractor

class ReportEngine:
    async def generate_comprehensive_report(
        self,
        filepath: str,
        packets: List[Dict[str, Any]],
        model: str = None
    ) -> Dict[str, Any]:
        endpoints = stats_engine.get_endpoints(packets)
        conversations = stats_engine.get_conversations(packets)
        findings, risk = security_engine.analyze_capture(filepath, packets)
        iocs = ioc_extractor.extract_all(filepath, packets)
        http_txs = protocol_analyzer.get_http_transactions(filepath)
        dns_recs = protocol_analyzer.get_dns_records(filepath)
        tls_sessions = protocol_analyzer.get_tls_sessions(filepath)

        total_packets = len(packets)
        duration = packets[-1]["time_delta"] - packets[0]["time_delta"] if len(packets) > 1 else 0.0
        total_bytes = sum(p.get("length", 0) for p in packets)

        # AI Executive Summary prompt
        prompt = (
            f"Generate a professional Executive Summary (2-3 paragraphs) for a network security analysis report.\n"
            f"Capture Statistics: {total_packets} packets, {total_bytes} bytes, {duration:.2f}s duration.\n"
            f"Risk Score: {risk['score']}/100 ({risk['level']}).\n"
            f"Security Findings: {json.dumps([{'title': f['title'], 'severity': f['severity'], 'affected_packets': f['affected_packets']} for f in findings])}.\n"
            f"Top Hosts: {[e['ip'] for e in endpoints[:5]]}.\n"
            f"Highlight specific packets and recommend immediate remediation."
        )

        ai_exec_summary = ""
        health = await ollama_client.check_health()
        if health.get("connected"):
            ai_exec_summary = await ollama_client.chat(
                messages=[{"role": "user", "content": prompt}],
                model=model,
                temperature=0.2
            )
        else:
            ai_exec_summary = (
                f"Automated analysis identified {len(findings)} security findings across {total_packets} captured frames. "
                f"The overall heuristic risk level is evaluated as {risk['level']} (Score: {risk['score']}/100). "
                f"Immediate attention is required for observed high-severity security events."
            )

        # Markdown formatted report
        md_lines = [
            f"# TraceLens Network Security & Traffic Analysis Report",
            f"*Generated on {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}*",
            "",
            "## 1. Executive Summary",
            ai_exec_summary,
            "",
            "## 2. Capture Overview & Network Topology",
            f"- **Total Captured Packets**: {total_packets:,}",
            f"- **Total Data Volume**: {total_bytes / 1024:.2f} KB ({total_bytes:,} bytes)",
            f"- **Capture Duration**: {duration:.2f} seconds",
            f"- **Heuristic Risk Score**: **{risk['score']} / 100 ({risk['level']})**",
            "",
            "### Top Active Endpoints",
            "| IP Address | Role / Locality | Total Packets | Bytes Transferred |",
            "| :--- | :--- | :--- | :--- |",
        ]

        for e in endpoints[:6]:
            md_lines.append(f"| `{e['ip']}` | {e['country']} | {e['packets']} | {e['bytes']:,} |")

        md_lines.extend([
            "",
            "## 3. Security Findings & Threat Detections",
        ])

        if not findings:
            md_lines.append("*No critical security anomalies detected.*")
        else:
            for idx, f in enumerate(findings, 1):
                md_lines.extend([
                    f"### {idx}. [{f['severity']}] {f['title']}",
                    f"- **Category**: {f['category']}",
                    f"- **Confidence**: {f['confidence']}",
                    f"- **Affected Packets**: {', '.join(f'Packet #{p}' for p in f['affected_packets'])}",
                    f"- **Affected Hosts**: {', '.join(f['affected_hosts'])}",
                    f"- **Description**: {f['description']}",
                    f"- **Evidence**: \n```\n{f['evidence']}\n```",
                    f"- **Why It Matters**: {f['why_it_matters']}",
                    f"- **Remediation**: {f['recommendation']}",
                    ""
                ])

        md_lines.extend([
            "## 4. Indicators of Interest (IOCs)",
            "| Indicator Type | Value | Context | First Seen Packet |",
            "| :--- | :--- | :--- | :--- |"
        ])
        for ioc in iocs[:15]:
            md_lines.append(f"| {ioc['type'].upper()} | `{ioc['value']}` | {ioc['context']} | Packet #{ioc['first_seen_packet']} |")

        md_lines.extend([
            "",
            "## 5. Timeline of Significant Events",
            f"- **0.00s**: Capture started.",
        ])
        for f in findings:
            pkts = f["affected_packets"]
            if pkts:
                md_lines.append(f"- **Event**: {f['title']} detected in Packet #{pkts[0]}.")

        md_lines.extend([
            "",
            "## 6. Recommendations & Action Items",
            "1. Invalidate any credentials exposed in cleartext HTTP transmissions.",
            "2. Enforce TLS 1.3 / HTTPS across internal and external web services.",
            "3. Investigate hosts exhibiting port scanning or automated vulnerability probing.",
            "4. Block and monitor high-entropy / tunneling domain queries at local DNS resolvers."
        ])

        report_markdown = "\n".join(md_lines)

        return {
            "title": f"TraceLens Security Report - {datetime.utcnow().strftime('%Y%m%d_%H%M')}",
            "generated_at": datetime.utcnow().isoformat(),
            "risk_score": risk,
            "findings_count": len(findings),
            "markdown": report_markdown,
            "raw_data": {
                "overview": {"packets": total_packets, "bytes": total_bytes, "duration": duration},
                "endpoints": endpoints[:10],
                "conversations": conversations[:10],
                "findings": findings,
                "iocs": iocs[:20]
            }
        }

report_engine = ReportEngine()
