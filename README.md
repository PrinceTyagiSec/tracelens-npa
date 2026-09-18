# TraceLens Network Analyzer (TraceLens NPA)

> **A professional, free, offline-capable, web-based network traffic analysis workstation designed for Windows and inspired by Wireshark, with real-time live capture, deep protocol inspection, heuristic threat detection, and a local Ollama AI copilot.**

> **Platform:** TraceLens NPA is currently designed and tested for **Windows 10/11**. The application provides a web-based interface, while native Windows components such as Npcap, Wireshark/tshark, and PowerShell are used for live packet capture and system integration. Linux and macOS are not currently supported.

## Usage Rights

TraceLens NPA is source-available for personal, educational, research, and
non-commercial use.

You are welcome to:

- Use TraceLens NPA for learning and personal projects.
- Study and modify the source code.
- Create non-commercial forks.
- Submit improvements and bug fixes.
- Share non-commercial modified versions with proper attribution.

Commercial use is **not permitted without prior written permission** from the
copyright holder.

This includes selling TraceLens NPA, selling modified versions, offering it as
a paid service, incorporating it into a commercial product, or monetizing a
substantially equivalent version.

See [`LICENSE`](LICENSE) for complete terms and commercial licensing
information.

[![License: Non-Commercial](https://img.shields.io/badge/License-Non--Commercial-orange.svg)](LICENSE)
[![Python Version](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)
[![Node Version](https://img.shields.io/badge/node-18%2B-green.svg)](https://nodejs.org/)
[![Platform](<https://img.shields.io/badge/platform-Windows%2010%2F11-blue.svg>)](WINDOWS_SETUP.md)

---

## Key Features

1. **PCAP / PCAPNG File Upload & Ingestion**:
   - High-throughput indexing using `tshark` and Scapy.
   - Preserves packet order, timestamps, exact layer boundaries, and raw payloads.
2. **Live Packet Capture**:
   - Windows Npcap support with automatic interface enumeration.
   - BPF capture filters (e.g. `tcp port 80`, `udp port 53`, `host 192.168.1.1`).
   - Real-time packet streaming to the web frontend over WebSockets with live packet rate and throughput telemetry.
3. **Advanced Wireshark Display Filter Engine**:
   - Official Wireshark display filter syntax validation and execution (e.g., `tcp.port == 443`, `ip.src == 192.168.1.10`, `dns.qry.name contains "google"`).
   - Real-time syntax validation badge and autocomplete suggestions.
4. **Deep Protocol Dissection**:
   - Hierarchical layer inspection (Frame, Ethernet II, IPv4/IPv6, TCP/UDP/ICMP/ARP, HTTP, DNS, TLS).
   - Synchronized 16-byte hex dump and aligned ASCII representation with byte offsets.
5. **Follow TCP / UDP Stream**:
   - Reconstructs bi-directional client ↔ server message chunks in ASCII, Hex, and Raw formats with one-click export.
6. **Heuristic Security Analysis & Threat Detections**:
   - Detects plaintext credential exposure, TCP SYN port scans, DNS tunneling / DGA anomalies, and web path traversal probes.
   - Calculates a Heuristic Network Risk Score (0-100) and extracts IOCs (IPs, domains, URLs, user agents) for CSV/JSON/STIX export.
7. **Local Ollama AI Copilot**:
   - Fully local AI operation through Ollama (`http://localhost:11434`) using installed models (`llama3.1:8b`, `qwen`, etc.).
   - Targeted RAG context extraction designed to reduce AI hallucinations by grounding responses in captured traffic.
   - Clickable packet citations that navigate directly to matching rows in the packet table.
   - Natural language to Wireshark display filter generator.
   - Full AI Security & Traffic Analysis report generator with Markdown export.
8. **Command Palette (`Ctrl+K`) & Keyboard Shortcuts**:
   - Web-based workstation interface with keyboard-driven navigation and productivity features.

---

## Quick Start (Windows)

### Prerequisites

- **Python 3.11+** (ensure it's added to your system PATH)
- **Node.js 18+**
- **Wireshark / tshark & Npcap** (installed in default paths, typically `C:\Program Files\Wireshark`)
- **Ollama** (optional for AI copilot; run `ollama pull llama3.1:8b` beforehand)

### 1. Repository Setup

Clone the repository and set the PowerShell execution policy for the current session (if script execution is restricted):

```powershell
git clone https://github.com/PrinceTyagiSec/tracelens-npa.git
cd tracelens-npa
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### 2. Environment Setup

Run the setup script to install and verify Python and Node.js dependencies:

```powershell
./scripts/setup.ps1
```

### 3. Launching TraceLens NPA
#### 1-Click Launch (PowerShell)

```powershell
./scripts/start_all.ps1
```

This script launches both backend and frontend servers and opens `http://localhost:5173` in your default browser.

#### Manual Launch

**Backend**:

```powershell
./scripts/start_backend.ps1
```

**Frontend**:

```powershell
./scripts/start_frontend.ps1
```

Visit: **`http://localhost:5173`**

---

## System Architecture

```
TraceLens NPA
├── frontend/ (React + TypeScript + Vite + Tailwind CSS + Lucide + Recharts)
│   ├── components/    # PacketTable, PacketDetails, PacketBytes, FilterBar, AI, Security
│   ├── services/      # Typed REST API client & WebSocket client
│   └── types/         # Comprehensive network & analysis models
├── backend/ (FastAPI + Uvicorn + SQLAlchemy + SQLite)
│   ├── api/           # REST endpoints for captures, packets, filters, stats, AI, live capture
│   ├── parsers/       # tshark summary stream, layer dissector, follow stream engine
│   ├── analysis/      # HTTP/DNS/TLS extractors, security heuristics, risk score, IOCs
│   ├── capture/       # dumpcap/tshark Windows live capture manager
│   ├── ai/            # Async Ollama client, RAG context engine, safe tools, report generator
│   └── core/          # Windows dependency detector & structured logging
└── scripts/           # Sample PCAP generator and launch scripts
```

---

## Troubleshooting

- **`tshark` not found**: Ensure Wireshark is installed and `tshark.exe` is accessible via your system environment variables (or located in `C:\Program Files\Wireshark`).
- **Live capture permission errors**: Ensure Npcap is installed in "WinPcap API-compatible mode" and that you are running your terminal with appropriate privileges if capturing on restricted interfaces.

---

## Contributing

Contributions, issues, and feature requests are welcome!

Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) for development requirements,
contribution guidelines, security considerations, and pull request
instructions.

---

## Author & Owner

**Prince Tyagi**

Cybersecurity enthusiast and developer focused on cybersecurity, network security, penetration testing, security research, and security tooling.

* GitHub: [@PrinceTyagiSec](https://github.com/PrinceTyagiSec/)
* LinkedIn: [prince-tyagi1](https://www.linkedin.com/in/prince-tyagi1/)
* Portfolio: [prince-tyagi.netlify.app](https://prince-tyagi.netlify.app/)

---

## License

TraceLens NPA is distributed under a custom **Personal and Non-Commercial
Source-Available License**.

You may use, study, modify, and contribute to the project for personal,
educational, research, and other non-commercial purposes.

**Commercial use, commercial distribution, selling, monetization, or
incorporation into a paid product or service requires prior written permission
and a separate commercial license from Prince Tyagi.**

See the [LICENSE](LICENSE) file for the complete terms.
