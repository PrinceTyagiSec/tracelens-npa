import subprocess
import binascii
from typing import Dict, Any, List
from backend.app.core.detector import detector
from backend.app.core.logging import logger
from backend.app.schemas.packet import StreamData, StreamMessage

class StreamEngine:
    def __init__(self):
        deps = detector.detect_all()
        self.tshark_path = deps["dependencies"]["tshark"]["path"] or "tshark"

    def follow_stream(self, filepath: str, stream_id: int = 0, protocol: str = "tcp") -> Dict[str, Any]:
        """
        Reconstructs bi-directional stream using tshark follow,tcp,ascii and hex.
        """
        proto = "tcp" if protocol.lower() == "tcp" else "udp"
        
        # 1. Fetch ASCII stream
        cmd_ascii = [
            self.tshark_path,
            "-r", filepath,
            "-q",
            "-z", f"follow,{proto},ascii,{stream_id}"
        ]
        
        res_ascii = subprocess.run(cmd_ascii, capture_output=True, text=True, encoding="utf-8", errors="replace")
        output_text = res_ascii.stdout
        
        client = "Unknown Client"
        server = "Unknown Server"
        messages: List[Dict[str, Any]] = []
        
        lines = output_text.splitlines()
        inside_stream = False
        current_direction = None
        current_buffer = []
        
        for line in lines:
            if line.startswith(f"Node 0:"):
                client = line.replace("Node 0:", "").strip()
                continue
            elif line.startswith(f"Node 1:"):
                server = line.replace("Node 1:", "").strip()
                inside_stream = True
                continue
            elif line.startswith("===") and inside_stream:
                break
                
            if not inside_stream:
                continue

            # Check if line indicates client chunk (no indent) or server chunk (tab indent)
            if line.startswith("\t"):
                dir_type = "server_to_client"
                content = line[1:]
            else:
                dir_type = "client_to_server"
                content = line
                
            # If line is purely byte count header like "241" or "\t186"
            stripped = content.strip()
            if stripped.isdigit() and len(stripped) <= 6:
                if current_buffer and current_direction:
                    full_text = "\n".join(current_buffer)
                    raw_b = full_text.encode("utf-8", errors="replace")
                    hex_str = binascii.hexlify(raw_b).decode("ascii")
                    messages.append({
                        "direction": current_direction,
                        "payload_ascii": full_text,
                        "payload_hex": " ".join(hex_str[i:i+2] for i in range(0, len(hex_str), 2)),
                        "payload_raw": hex_str,
                        "src": client if current_direction == "client_to_server" else server,
                        "dst": server if current_direction == "client_to_server" else client,
                        "timestamp": 0.0,
                        "length": len(raw_b)
                    })
                    current_buffer = []
                current_direction = dir_type
                continue
                
            if current_direction is None:
                current_direction = dir_type
                
            if dir_type != current_direction:
                if current_buffer:
                    full_text = "\n".join(current_buffer)
                    raw_b = full_text.encode("utf-8", errors="replace")
                    hex_str = binascii.hexlify(raw_b).decode("ascii")
                    messages.append({
                        "direction": current_direction,
                        "payload_ascii": full_text,
                        "payload_hex": " ".join(hex_str[i:i+2] for i in range(0, len(hex_str), 2)),
                        "payload_raw": hex_str,
                        "src": client if current_direction == "client_to_server" else server,
                        "dst": server if current_direction == "client_to_server" else client,
                        "timestamp": 0.0,
                        "length": len(raw_b)
                    })
                    current_buffer = []
                current_direction = dir_type
                
            current_buffer.append(content)

        if current_buffer and current_direction:
            full_text = "\n".join(current_buffer)
            raw_b = full_text.encode("utf-8", errors="replace")
            hex_str = binascii.hexlify(raw_b).decode("ascii")
            messages.append({
                "direction": current_direction,
                "payload_ascii": full_text,
                "payload_hex": " ".join(hex_str[i:i+2] for i in range(0, len(hex_str), 2)),
                "payload_raw": hex_str,
                "src": client if current_direction == "client_to_server" else server,
                "dst": server if current_direction == "client_to_server" else client,
                "timestamp": 0.0,
                "length": len(raw_b)
            })

        total_bytes = sum(m["length"] for m in messages)
        
        return {
            "stream_id": stream_id,
            "protocol": proto.upper(),
            "client": client,
            "server": server,
            "total_packets": len(messages),
            "total_bytes": total_bytes,
            "messages": messages
        }

stream_engine = StreamEngine()
