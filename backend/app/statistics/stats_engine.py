import subprocess
from collections import defaultdict
from typing import Dict, Any, List
from backend.app.core.detector import detector
from backend.app.core.logging import logger

class StatsEngine:
    def __init__(self):
        deps = detector.detect_all()
        self.tshark_path = deps["dependencies"]["tshark"]["path"] or "tshark"

    def get_endpoints(self, packets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        stats = defaultdict(lambda: {
            "packets": 0, "bytes": 0,
            "packets_sent": 0, "packets_recv": 0,
            "bytes_sent": 0, "bytes_recv": 0
        })

        for p in packets:
            src = p.get("src_ip", "")
            dst = p.get("dst_ip", "")
            length = p.get("length", 0)

            if src and src != "Unknown":
                stats[src]["packets"] += 1
                stats[src]["bytes"] += length
                stats[src]["packets_sent"] += 1
                stats[src]["bytes_sent"] += length

            if dst and dst != "Unknown":
                stats[dst]["packets"] += 1
                stats[dst]["bytes"] += length
                stats[dst]["packets_recv"] += 1
                stats[dst]["bytes_recv"] += length

        endpoints_list = []
        for ip, s in stats.items():
            # Quick country / location tag
            country = "Local/Private"
            if ip.startswith("10.") or ip.startswith("192.168.") or ip.startswith("172.16.") or ip == "127.0.0.1":
                country = "Private Network"
            elif ip in ["8.8.8.8", "8.8.4.4", "1.1.1.1"]:
                country = "Public DNS"
            else:
                country = "External IP"

            endpoints_list.append({
                "ip": ip,
                "packets": s["packets"],
                "bytes": s["bytes"],
                "packets_sent": s["packets_sent"],
                "packets_recv": s["packets_recv"],
                "bytes_sent": s["bytes_sent"],
                "bytes_recv": s["bytes_recv"],
                "country": country
            })

        endpoints_list.sort(key=lambda x: x["bytes"], reverse=True)
        return endpoints_list

    def get_conversations(self, packets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        convs = {}
        for p in packets:
            src = p.get("src_ip", "")
            dst = p.get("dst_ip", "")
            proto = p.get("protocol", "RAW")
            sp = p.get("src_port")
            dp = p.get("dst_port")
            length = p.get("length", 0)
            time_delta = p.get("time_delta", 0.0)

            if not src or not dst or src == "Unknown" or dst == "Unknown":
                continue

            # Canonical order
            if (src, sp or 0) <= (dst, dp or 0):
                key = (src, sp, dst, dp, proto)
                ha, pa, hb, pb = src, sp, dst, dp
            else:
                key = (dst, dp, src, sp, proto)
                ha, pa, hb, pb = dst, dp, src, sp

            if key not in convs:
                convs[key] = {
                    "id": f"conv_{len(convs)+1}",
                    "protocol": proto,
                    "host_a": ha,
                    "host_b": hb,
                    "port_a": pa,
                    "port_b": pb,
                    "packets": 0,
                    "bytes": 0,
                    "first_time": time_delta,
                    "last_time": time_delta,
                    "stream_id": 0
                }

            c = convs[key]
            c["packets"] += 1
            c["bytes"] += length
            c["last_time"] = max(c["last_time"], time_delta)

        res = []
        for c in convs.values():
            duration = round(c["last_time"] - c["first_time"], 4)
            c["duration"] = duration
            res.append(c)

        res.sort(key=lambda x: x["bytes"], reverse=True)
        return res

    def get_protocol_hierarchy(self, filepath: str, total_packets: int, total_bytes: int) -> List[Dict[str, Any]]:
        """
        Uses tshark protocol hierarchy statistics (io,phs)
        """
        cmd = [
            self.tshark_path,
            "-r", filepath,
            "-q",
            "-z", "io,phs"
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if res.returncode != 0:
            return []

        # Parse tshark tree
        # Example output:
        # eth                frames:25 bytes:2560
        #   ip               frames:25 bytes:2560
        #     tcp            frames:18 bytes:1800
        #     udp            frames:3  bytes:400
        root_nodes: List[Dict[str, Any]] = []
        node_stack = []

        for line in res.stdout.splitlines():
            if "frames:" not in line or "bytes:" not in line:
                continue
            
            indent = len(line) - len(line.lstrip(" "))
            parts = line.strip().split()
            if not parts:
                continue
            proto_name = parts[0]
            
            frames_str = [p for p in parts if p.startswith("frames:") or p.startswith("frame:")]
            bytes_str = [p for p in parts if p.startswith("bytes:")]
            
            frames = int(frames_str[0].split(":")[1]) if frames_str else 0
            nbytes = int(bytes_str[0].split(":")[1]) if bytes_str else 0
            
            pct_p = round((frames / total_packets * 100), 1) if total_packets > 0 else 0
            pct_b = round((nbytes / total_bytes * 100), 1) if total_bytes > 0 else 0

            node = {
                "name": proto_name.upper(),
                "protocol": proto_name,
                "packets": frames,
                "bytes": nbytes,
                "percent_packets": pct_p,
                "percent_bytes": pct_b,
                "children": [],
                "indent": indent
            }

            while node_stack and node_stack[-1]["indent"] >= indent:
                node_stack.pop()

            if node_stack:
                node_stack[-1]["children"].append(node)
            else:
                root_nodes.append(node)

            node_stack.append(node)

        return root_nodes

    def get_io_graph_points(self, packets: List[Dict[str, Any]], buckets: int = 25) -> List[Dict[str, Any]]:
        if not packets:
            return []

        start_time = min(p["time_delta"] for p in packets)
        end_time = max(p["time_delta"] for p in packets)
        duration = max(end_time - start_time, 1.0)
        bucket_size = duration / buckets

        points = []
        for i in range(buckets):
            b_start = start_time + (i * bucket_size)
            b_end = b_start + bucket_size
            
            b_packets = [p for p in packets if b_start <= p["time_delta"] < b_end or (i == buckets - 1 and p["time_delta"] >= b_start)]
            
            tcp_cnt = sum(1 for p in b_packets if "TCP" in p["protocol"].upper() or "HTTP" in p["protocol"].upper() or "TLS" in p["protocol"].upper())
            udp_cnt = sum(1 for p in b_packets if "UDP" in p["protocol"].upper() or "DNS" in p["protocol"].upper())
            dns_cnt = sum(1 for p in b_packets if "DNS" in p["protocol"].upper())
            http_cnt = sum(1 for p in b_packets if "HTTP" in p["protocol"].upper())
            tls_cnt = sum(1 for p in b_packets if "TLS" in p["protocol"].upper())
            
            total_bytes = sum(p.get("length", 0) for p in b_packets)
            
            points.append({
                "timestamp": round(b_start, 2),
                "time_label": f"{b_start:.1f}s",
                "packets": len(b_packets),
                "bytes": total_bytes,
                "tcp_packets": tcp_cnt,
                "udp_packets": udp_cnt,
                "dns_packets": dns_cnt,
                "http_packets": http_cnt,
                "tls_packets": tls_cnt
            })
        return points

stats_engine = StatsEngine()
