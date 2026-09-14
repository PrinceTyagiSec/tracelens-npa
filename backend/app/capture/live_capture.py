import os
import time
import asyncio
import subprocess
import threading
from pathlib import Path
from typing import Dict, Any, List, Optional, Callable
from backend.app.core.detector import detector
from backend.app.core.logging import logger
from backend.app.core.config import CAPTURES_DIR

class LiveCaptureManager:
    def __init__(self):
        deps = detector.detect_all()
        self.tshark_path = deps["dependencies"]["tshark"]["path"] or "tshark"
        self.active_process: Optional[subprocess.Popen] = None
        self.capture_thread: Optional[threading.Thread] = None
        self.is_capturing = False
        self.is_paused = False
        self.current_interface: Optional[str] = None
        self.current_filepath: Optional[str] = None
        self.capture_id: Optional[str] = None
        
        # Live metrics
        self.start_time: float = 0.0
        self.total_packets: int = 0
        self.total_bytes: int = 0
        self.recent_packets: int = 0
        self.recent_bytes: int = 0
        self.last_rate_calc: float = 0.0
        self.current_packet_rate: float = 0.0
        self.current_byte_rate: float = 0.0
        
        # Subscribers (WebSocket callback dispatchers)
        self.subscribers: List[Callable[[Dict[str, Any]], None]] = []

    def get_interfaces(self) -> List[Dict[str, Any]]:
        cmd = [self.tshark_path, "-D"]
        res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
        if res.returncode != 0:
            return []

        interfaces = []
        for line in res.stdout.strip().splitlines():
            line = line.strip()
            if not line or "." not in line:
                continue
            idx_str, rest = line.split(".", 1)
            idx = idx_str.strip()
            name_part = rest.strip()
            
            # Extract friendly label from parenthesis
            friendly_name = name_part
            device_name = name_part
            if "(" in name_part and ")" in name_part:
                device_name = name_part.split("(")[0].strip()
                friendly_name = name_part.split("(")[1].split(")")[0].strip()

            interfaces.append({
                "id": idx,
                "device": device_name,
                "name": friendly_name,
                "status": "Active" if "Loopback" in friendly_name or "Ethernet" in friendly_name else "Available"
            })
        return interfaces

    def add_subscriber(self, cb: Callable[[Dict[str, Any]], None]):
        if cb not in self.subscribers:
            self.subscribers.append(cb)

    def remove_subscriber(self, cb: Callable[[Dict[str, Any]], None]):
        if cb in self.subscribers:
            self.subscribers.remove(cb)

    def _broadcast(self, event: Dict[str, Any]):
        for cb in self.subscribers:
            try:
                cb(event)
            except Exception as e:
                logger.warning(f"Error broadcasting event: {e}")

    def start_capture(
        self,
        interface: str,
        bpf_filter: str = "",
        snaplen: int = 65535,
        packet_limit: int = 0,
        capture_id: str = ""
    ) -> Dict[str, Any]:
        if self.is_capturing:
            return {"status": "error", "message": "Capture already running"}

        self.capture_id = capture_id or f"live_{int(time.time())}"
        self.current_filepath = str(CAPTURES_DIR / f"{self.capture_id}.pcap")
        self.current_interface = interface
        self.start_time = time.time()
        self.last_rate_calc = self.start_time
        self.total_packets = 0
        self.total_bytes = 0
        self.recent_packets = 0
        self.recent_bytes = 0
        self.is_capturing = True
        self.is_paused = False

        cmd = [
            self.tshark_path,
            "-i", str(interface),
            "-l",  # Flush stdout after each packet
            "-P",  # Print summary while saving
            "-w", self.current_filepath,
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
            "-E", "separator=\t"
        ]

        if bpf_filter and bpf_filter.strip():
            cmd.extend(["-f", bpf_filter.strip()])
        if snaplen and snaplen > 0:
            cmd.extend(["-s", str(snaplen)])
        if packet_limit and packet_limit > 0:
            cmd.extend(["-c", str(packet_limit)])

        logger.info(f"Starting live capture on interface {interface} -> {self.current_filepath}")
        
        try:
            self.active_process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
                encoding="utf-8",
                errors="replace"
            )
        except Exception as e:
            self.is_capturing = False
            logger.error(f"Failed to start tshark process: {e}")
            return {"status": "error", "message": str(e)}

        self.capture_thread = threading.Thread(target=self._capture_worker, daemon=True)
        self.capture_thread.start()

        self._broadcast({
            "type": "capture_started",
            "capture_id": self.capture_id,
            "interface": interface,
            "filepath": self.current_filepath
        })

        return {
            "status": "started",
            "capture_id": self.capture_id,
            "interface": interface,
            "filepath": self.current_filepath
        }

    def _capture_worker(self):
        proc = self.active_process
        if not proc or not proc.stdout:
            return

        base_epoch = None

        while self.is_capturing and proc.poll() is None:
            line = proc.stdout.readline()
            if not line:
                if proc.poll() is not None:
                    break
                time.sleep(0.01)
                continue

            line = line.strip()
            if not line or "Capturing on" in line:
                continue

            if self.is_paused:
                continue

            parts = [p.strip('"') for p in line.split("\t")]
            while len(parts) < 14:
                parts.append("")

            try:
                pkt_no = int(parts[0]) if parts[0] and parts[0].isdigit() else self.total_packets + 1
                epoch = float(parts[1]) if parts[1] else time.time()
                if base_epoch is None:
                    base_epoch = epoch

                time_rel = round(epoch - base_epoch, 6)
                src = parts[3] or parts[4] or parts[5] or "Unknown"
                dst = parts[6] or parts[7] or parts[8] or "Unknown"
                proto = parts[9] or "RAW"
                
                src_port = int(parts[10]) if parts[10] and parts[10].isdigit() else (int(parts[11]) if parts[11] and parts[11].isdigit() else None)
                dst_port = int(parts[12]) if parts[12] and parts[12].isdigit() else (int(parts[13]) if parts[13] and parts[13].isdigit() else None)
                
                length = int(parts[14]) if len(parts) > 14 and parts[14].isdigit() else 0
                info = parts[15] if len(parts) > 15 else ""

                self.total_packets += 1
                self.total_bytes += length
                self.recent_packets += 1
                self.recent_bytes += length

                packet_summary = {
                    "id": f"{self.capture_id}_{pkt_no}",
                    "packet_no": pkt_no,
                    "timestamp": epoch,
                    "time_delta": time_rel,
                    "src_ip": src,
                    "dst_ip": dst,
                    "src_port": src_port,
                    "dst_port": dst_port,
                    "protocol": proto,
                    "length": length,
                    "info": info,
                    "marked": False,
                    "comment": None
                }

                self._broadcast({
                    "type": "packet",
                    "data": packet_summary
                })

                # Periodically broadcast rate stats
                now = time.time()
                elapsed = now - self.last_rate_calc
                if elapsed >= 1.0:
                    self.current_packet_rate = round(self.recent_packets / elapsed, 1)
                    self.current_byte_rate = round(self.recent_bytes / elapsed, 1)
                    self.recent_packets = 0
                    self.recent_bytes = 0
                    self.last_rate_calc = now

                    self._broadcast({
                        "type": "statistics_update",
                        "data": {
                            "total_packets": self.total_packets,
                            "total_bytes": self.total_bytes,
                            "packet_rate": self.current_packet_rate,
                            "byte_rate": self.current_byte_rate,
                            "duration": round(now - self.start_time, 1)
                        }
                    })

            except Exception as e:
                logger.warning(f"Error parsing live packet line: {e}")

        # Finish
        self.is_capturing = False
        self._broadcast({
            "type": "capture_stopped",
            "capture_id": self.capture_id,
            "total_packets": self.total_packets,
            "total_bytes": self.total_bytes
        })

    def pause_capture(self):
        self.is_paused = True

    def resume_capture(self):
        self.is_paused = False

    def stop_capture(self) -> Dict[str, Any]:
        self.is_capturing = False
        if self.active_process and self.active_process.poll() is None:
            try:
                self.active_process.terminate()
                self.active_process.wait(timeout=3)
            except Exception:
                try:
                    self.active_process.kill()
                except Exception:
                    pass
        self.active_process = None
        
        return {
            "status": "stopped",
            "capture_id": self.capture_id,
            "total_packets": self.total_packets,
            "total_bytes": self.total_bytes,
            "filepath": self.current_filepath
        }

live_capture_manager = LiveCaptureManager()
