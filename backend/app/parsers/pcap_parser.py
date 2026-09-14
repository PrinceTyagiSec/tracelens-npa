import json
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
from backend.app.core.detector import detector
from backend.app.core.logging import logger

def format_hex_ascii(hex_string: str) -> Tuple[str, str]:
    """
    Given a continuous hex string (e.g. '4500003c...'), format into:
    1. Hex lines: '00000000  45 00 00 3c 1c 46 40 00  40 06 ...'
    2. ASCII lines: 'E..<...F@.@...'
    """
    try:
        raw_bytes = bytes.fromhex(hex_string.replace(":", "").replace(" ", "").strip())
    except Exception:
        return "", ""

    hex_lines = []
    ascii_lines = []
    
    for i in range(0, len(raw_bytes), 16):
        chunk = raw_bytes[i:i+16]
        offset = f"{i:08x}"
        
        # Hex representation with 8-byte split
        hex_part_1 = " ".join(f"{b:02x}" for b in chunk[:8])
        hex_part_2 = " ".join(f"{b:02x}" for b in chunk[8:])
        hex_combined = f"{hex_part_1:<23}  {hex_part_2:<23}"
        hex_line = f"{offset}  {hex_combined}"
        hex_lines.append(hex_line)
        
        # ASCII representation (. for non-printable)
        ascii_part = "".join(chr(b) if 32 <= b <= 126 else "." for b in chunk)
        ascii_lines.append(ascii_part)
        
    return "\n".join(hex_lines), "\n".join(ascii_lines)

class PcapParser:
    def __init__(self):
        deps = detector.detect_all()
        self.tshark_path = deps["dependencies"]["tshark"]["path"] or "tshark"

    def parse_summary_stream(self, filepath: str) -> List[Dict[str, Any]]:
        """
        Extract fast tabular packet summaries for the entire capture using tshark fields.
        """
        cmd = [
            self.tshark_path,
            "-r", filepath,
            "-T", "fields",
            "-e", "frame.number",
            "-e", "frame.time_epoch",
            "-e", "frame.time_delta",
            "-e", "ip.src",
            "-e", "ipv6.src",
            "-e", "eth.src",
            "-e", "ip.dst",
            "-e", "ipv6.dst",
            "-e", "eth.dst",
            "-e", "_ws.col.Protocol",
            "-e", "tcp.srcport",
            "-e", "udp.srcport",
            "-e", "tcp.dstport",
            "-e", "udp.dstport",
            "-e", "frame.len",
            "-e", "_ws.col.Info",
            "-E", "separator=\t",
            "-E", "quote=d",
            "-E", "occurrence=f"
        ]
        
        logger.info(f"Running tshark summary extraction on {filepath}")
        res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if res.returncode != 0:
            logger.error(f"tshark summary error: {res.stderr}")
            raise RuntimeError(f"Failed to parse PCAP summary: {res.stderr.strip()}")

        packets = []
        base_epoch = None

        for line in res.stdout.strip().splitlines():
            if not line.strip():
                continue
            parts = [p.strip('"') for p in line.split("\t")]
            # Ensure minimum column count
            while len(parts) < 14:
                parts.append("")

            try:
                pkt_no = int(parts[0]) if parts[0] else len(packets) + 1
                epoch = float(parts[1]) if parts[1] else 0.0
                if base_epoch is None and epoch > 0:
                    base_epoch = epoch
                
                time_rel = epoch - base_epoch if base_epoch and epoch > 0 else 0.0
                
                src = parts[3] or parts[4] or parts[5] or "Unknown"
                dst = parts[6] or parts[7] or parts[8] or "Unknown"
                proto = parts[9] or "RAW"
                
                src_port = int(parts[10]) if parts[10] else (int(parts[11]) if parts[11] else None)
                dst_port = int(parts[12]) if parts[12] else (int(parts[13]) if parts[13] else None)
                
                length = int(parts[14]) if len(parts) > 14 and parts[14].isdigit() else 0
                info = parts[15] if len(parts) > 15 else ""
                
                packets.append({
                    "packet_no": pkt_no,
                    "timestamp": epoch,
                    "time_delta": round(time_rel, 6),
                    "src_ip": src,
                    "dst_ip": dst,
                    "src_port": src_port,
                    "dst_port": dst_port,
                    "protocol": proto,
                    "length": length,
                    "info": info,
                    "marked": False,
                    "comment": None
                })
            except Exception as e:
                logger.warning(f"Error parsing packet row: {e}")
                continue

        return packets

    def get_packet_details(self, filepath: str, packet_no: int) -> Dict[str, Any]:
        """
        Fetch hierarchical layers and full hex/ASCII dump for a single packet.
        """
        cmd = [
            self.tshark_path,
            "-r", filepath,
            "-Y", f"frame.number == {packet_no}",
            "-T", "json",
            "-x"
        ]
        
        res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if res.returncode != 0 or not res.stdout.strip():
            return {"layers": [], "hex_dump": "", "ascii_dump": "", "raw_hex": ""}

        try:
            data = json.loads(res.stdout)
            if not data or not isinstance(data, list):
                return {"layers": [], "hex_dump": "", "ascii_dump": "", "raw_hex": ""}
            
            pkt_obj = data[0]
            layers_dict = pkt_obj.get("_source", {}).get("layers", {})
            
            # Extract raw frame hex
            raw_hex = ""
            frame_raw = layers_dict.get("frame_raw")
            if isinstance(frame_raw, list) and len(frame_raw) > 0:
                raw_hex = frame_raw[0]
            elif isinstance(frame_raw, str):
                raw_hex = frame_raw

            hex_dump, ascii_dump = format_hex_ascii(raw_hex)
            
            # Format layers tree
            layers_list = []
            layer_display_names = {
                "frame": "Frame",
                "eth": "Ethernet II",
                "ip": "Internet Protocol Version 4",
                "ipv6": "Internet Protocol Version 6",
                "arp": "Address Resolution Protocol",
                "icmp": "Internet Control Message Protocol",
                "icmpv6": "Internet Control Message Protocol v6",
                "tcp": "Transmission Control Protocol",
                "udp": "User Datagram Protocol",
                "dns": "Domain Name System",
                "http": "Hypertext Transfer Protocol",
                "tls": "Transport Layer Security",
                "data": "Data Payload"
            }

            for l_key, l_val in layers_dict.items():
                if l_key.endswith("_raw"):
                    continue
                display_name = layer_display_names.get(l_key, l_key.upper())
                summary_text = display_name
                fields = {}
                
                if isinstance(l_val, dict):
                    for fk, fv in l_val.items():
                        if fk.endswith("_raw") or fk.endswith("_tree"):
                            continue
                        fields[fk] = str(fv)
                    # Create helpful summary
                    if l_key == "frame":
                        summary_text = f"Frame {packet_no}: {fields.get('frame.len', '0')} bytes on wire"
                    elif l_key == "eth":
                        summary_text = f"Ethernet II, Src: {fields.get('eth.src', '')}, Dst: {fields.get('eth.dst', '')}"
                    elif l_key == "ip":
                        summary_text = f"Internet Protocol Version 4, Src: {fields.get('ip.src', '')}, Dst: {fields.get('ip.dst', '')}"
                    elif l_key == "tcp":
                        summary_text = f"Transmission Control Protocol, Src Port: {fields.get('tcp.srcport', '')}, Dst Port: {fields.get('tcp.dstport', '')}"
                    elif l_key == "udp":
                        summary_text = f"User Datagram Protocol, Src Port: {fields.get('udp.srcport', '')}, Dst Port: {fields.get('udp.dstport', '')}"
                    elif l_key == "dns":
                        summary_text = f"Domain Name System ({'response' if fields.get('dns.flags.response') == '1' else 'query'})"
                    elif l_key == "http":
                        summary_text = f"Hypertext Transfer Protocol ({fields.get('http.request.method', '') or fields.get('http.response.code', '')})"

                layers_list.append({
                    "name": display_name,
                    "summary": summary_text,
                    "fields": fields,
                    "expanded": False
                })

            return {
                "layers": layers_list,
                "hex_dump": hex_dump,
                "ascii_dump": ascii_dump,
                "raw_hex": raw_hex
            }
        except Exception as e:
            logger.error(f"Error parsing packet details: {e}")
            return {"layers": [], "hex_dump": "", "ascii_dump": "", "raw_hex": ""}

pcap_parser = PcapParser()
