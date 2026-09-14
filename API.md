# TraceLens NPA - API Specification

TraceLens NPA provides a clean, typed REST and WebSocket interface for packet analysis and live telemetry.

Base URL: `http://127.0.0.1:8000/api`

---

## 1. System & Health

- `GET /api/health`
  - Returns backend, database, packet engine, live capture, and Ollama status.
- `GET /api/system/status`
  - Returns OS, Python, tshark path/version, dumpcap path, and Npcap status.
- `GET /api/system/logs`
  - Returns recent structured log lines from `logs/tracelens.log`.

---

## 2. Captures

- `POST /api/captures/upload`
  - Multi-part form upload for `.pcap`, `.pcapng`, or `.cap`.
- `POST /api/captures/sample`
  - Generates realistic multi-protocol sample PCAP (HTTP with plaintext creds, DNS tunneling, TCP SYN scan, TLS).
- `GET /api/captures`
  - Returns all registered captures.
- `GET /api/captures/{id}`
  - Returns capture details and ingestion status.
- `DELETE /api/captures/{id}`
  - Deletes capture records and associated PCAP files.

---

## 3. Packets

- `GET /api/captures/{id}/packets`
  - Query parameters: `offset`, `limit`, `search`, `protocol`, `marked_only`.
- `GET /api/captures/{id}/packets/{packet_no}`
  - Dissected hierarchical protocol layers and aligned 16-byte hex/ASCII dump.
- `PATCH /api/captures/{id}/packets/{packet_no}/comment`
  - Updates packet comment or bookmark marking.
- `POST /api/captures/{id}/packets/filter`
  - Evaluates Wireshark display filter and returns matching packet numbers.
- `GET /api/captures/{id}/packets/streams/{stream_id}`
  - Reconstructs bi-directional stream chunks (ASCII, Hex, Raw).

---

## 4. Statistics & Analysis

- `GET /api/captures/{id}/statistics/endpoints`
  - List of endpoints with packet/byte counts, sent/received breakdown, and locality.
- `GET /api/captures/{id}/statistics/conversations`
  - TCP and UDP conversations with duration and packet counts.
- `GET /api/captures/{id}/statistics/protocols`
  - Protocol hierarchy tree with packet and byte percentages.
- `GET /api/captures/{id}/statistics/iograph`
  - Time-series traffic data points for packets/sec and protocol rates.
- `GET /api/captures/{id}/analysis/http`
  - HTTP transactions with request methods, URIs, bodies, and security warnings.
- `GET /api/captures/{id}/analysis/dns`
  - DNS queries, response codes, Shannon entropy score, and tunneling indicators.
- `GET /api/captures/{id}/analysis/findings`
  - Heuristic security detections (Severity, Evidence, Affected Packets, Remediation).
- `GET /api/captures/{id}/analysis/risk`
  - Heuristic network risk score (0-100).
- `GET /api/captures/{id}/analysis/iocs`
  - Extracted indicators (IPs, domains, URLs, user-agents).
- `GET /api/captures/{id}/analysis/iocs/export?format=csv|json|txt|stix`
  - Exports indicators in selected format.

---

## 5. Live Capture & WebSockets

- `GET /api/capture/interfaces`
  - Enumerates network interfaces via `tshark -D`.
- `POST /api/capture/start`
  - Body: `{"interface": "3", "bpf_filter": "tcp port 80", "snaplen": 65535}`.
- `POST /api/capture/pause` / `POST /api/capture/resume` / `POST /api/capture/stop`
- `WS /ws/capture`
  - Real-time WebSocket streaming lightweight packet summaries and rate metrics.

---

## 6. AI Copilot (Ollama)

- `GET /api/ai/status`
  - Checks Ollama connectivity and lists installed models.
- `POST /api/ai/chat`
  - RAG-powered query with automatic context extraction and packet citations.
- `POST /api/ai/explain_packet`
  - Generates detailed protocol and security explanation for a selected frame.
- `POST /api/ai/generate_filter`
  - Translates natural language queries to validated Wireshark display filters.
- `POST /api/ai/report`
  - Generates comprehensive security and traffic analysis report.
