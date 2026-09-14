import os
import sys
import shutil
import platform
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional

def find_executable(name: str, candidate_dirs: list[str]) -> Optional[str]:
    """Check PATH first, then well-known installation directories."""
    path = shutil.which(name)
    if path and os.path.exists(path):
        return str(Path(path).resolve())
    
    for c_dir in candidate_dirs:
        candidate = Path(c_dir) / (f"{name}.exe" if sys.platform == "win32" else name)
        if candidate.exists():
            return str(candidate.resolve())
    return None

class DependencyDetector:
    def __init__(self):
        self.os_type = platform.system()
        self.os_release = platform.release()
        self.arch = platform.machine()
        
        # Windows candidate directories
        self.wireshark_dirs = [
            r"C:\Program Files\Wireshark",
            r"C:\Program Files (x86)\Wireshark",
            r"D:\Program Files\Wireshark",
            r"C:\Wireshark"
        ]
        self.npcap_dirs = [
            r"C:\Program Files\Npcap",
            r"C:\Windows\System32\Npcap"
        ]
        
    def detect_all(self) -> Dict[str, Any]:
        tshark_path = find_executable("tshark", self.wireshark_dirs)
        dumpcap_path = find_executable("dumpcap", self.wireshark_dirs)
        wireshark_path = find_executable("Wireshark", self.wireshark_dirs)
        
        tshark_version = None
        if tshark_path:
            try:
                res = subprocess.run([tshark_path, "-v"], capture_output=True, text=True, timeout=5)
                first_line = res.stdout.strip().split("\n")[0] if res.stdout else ""
                tshark_version = first_line
            except Exception:
                tshark_version = "Detected (version query failed)"
                
        # Npcap detection (Windows)
        npcap_installed = False
        npcap_details = ""
        if self.os_type == "Windows":
            for n_dir in self.npcap_dirs:
                if Path(n_dir).exists():
                    npcap_installed = True
                    npcap_details = f"Found in {n_dir}"
                    break
            # Also check winpcap/npcap service / registry / dll
            if not npcap_installed:
                wpcap_dll = Path(r"C:\Windows\System32\wpcap.dll")
                npcap_dll = Path(r"C:\Windows\System32\Npcap\wpcap.dll")
                if wpcap_dll.exists() or npcap_dll.exists():
                    npcap_installed = True
                    npcap_details = "Npcap / WinPcap driver DLL detected"
        else:
            # On Linux/macOS, libpcap is standard
            npcap_installed = True
            npcap_details = "libpcap standard"
            
        # Ollama detection
        ollama_path = shutil.which("ollama")
        ollama_version = None
        if ollama_path:
            try:
                res = subprocess.run([ollama_path, "--version"], capture_output=True, text=True, timeout=3)
                ollama_version = res.stdout.strip()
            except Exception:
                ollama_version = "Detected"

        live_capture_ready = (tshark_path is not None or dumpcap_path is not None) and npcap_installed
        pcap_analysis_ready = (tshark_path is not None) or True # Scapy provides basic fallback

        return {
            "os": {
                "system": self.os_type,
                "release": self.os_release,
                "architecture": self.arch,
                "python_version": platform.python_version()
            },
            "dependencies": {
                "tshark": {
                    "installed": tshark_path is not None,
                    "path": tshark_path,
                    "version": tshark_version
                },
                "dumpcap": {
                    "installed": dumpcap_path is not None,
                    "path": dumpcap_path
                },
                "wireshark": {
                    "installed": wireshark_path is not None,
                    "path": wireshark_path
                },
                "npcap": {
                    "installed": npcap_installed,
                    "details": npcap_details
                },
                "ollama": {
                    "installed": ollama_path is not None,
                    "path": ollama_path,
                    "version": ollama_version
                }
            },
            "capabilities": {
                "live_capture_ready": live_capture_ready,
                "pcap_analysis_ready": pcap_analysis_ready,
                "notes": (
                    "All packet capture and dissection engines are ready."
                    if live_capture_ready
                    else "Npcap is required for live packet capture on Windows. PCAP file analysis is still available."
                )
            }
        }

detector = DependencyDetector()
