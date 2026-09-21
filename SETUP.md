# TraceLens Network Analyzer Setup Guide

This guide details the setup and launch process for **TraceLens NPA** on supported platforms.

TraceLens NPA currently supports:

- **Windows 10/11**
- **Linux**

macOS is currently not supported.

---

# 1. Windows Setup

## Prerequisites

### A. Python 3.11+

Download and install Python from [python.org](https://www.python.org/downloads/).

During installation, ensure:

> **Add python.exe to PATH**

Verify:

```powershell
python --version
```

Python **3.11 or newer** is required.

---

### B. Node.js 18+

Download and install Node.js from [nodejs.org](https://nodejs.org/).

Verify:

```powershell
node --version
npm --version
```

Node.js **18 or newer** is required.

---

### C. Wireshark, tshark & Npcap

1. Download Wireshark from [wireshark.org](https://www.wireshark.org/download.html).
2. During installation:
   - Install **Npcap**.
   - Enable **WinPcap API-compatible mode** if required.
   - Ensure **TShark** is installed.
3. The default TShark location is typically:

```text
C:\Program Files\Wireshark\tshark.exe
```

Verify:

```powershell
tshark -v
```

If `tshark` is not available directly from PowerShell, TraceLens NPA can detect the standard Wireshark installation path.

---

### D. Ollama — Optional

Ollama is required only if you want to use the local AI copilot.

Download Ollama from [ollama.com](https://ollama.com/download/windows).

Install Ollama and pull a model:

```powershell
ollama pull llama3.1:8b
```

Verify the Ollama API:

```powershell
curl.exe http://localhost:11434/api/tags
```

Ollama runs locally and does not require an external AI API for TraceLens NPA's AI features.

---

## Windows Installation

Clone the repository:

```powershell
git clone https://github.com/PrinceTyagiSec/tracelens-npa.git
cd tracelens-npa
```

If PowerShell script execution is restricted, allow scripts for the current session:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Run the automated setup:

```powershell
./scripts/windows/setup.ps1
```

The setup script creates the Python virtual environment and installs the required backend and frontend dependencies.

---

## Windows Launch

### 1-Click Launch

```powershell
./scripts/windows/start_all.ps1
```

This starts:

- FastAPI backend on `http://127.0.0.1:8000`
- Vite frontend on `http://localhost:5173`

The default browser is opened automatically.

### Manual Launch

**Backend:**

```powershell
./scripts/windows/start_backend.ps1
```

**Frontend:**

```powershell
./scripts/windows/start_frontend.ps1
```

Open:

```text
http://localhost:5173
```

---

# 2. Linux Setup

## Prerequisites

### A. Python 3.11+

Install Python 3.11 or newer using your Linux distribution's package manager.

Verify:

```bash
python3 --version
```

---

### B. Node.js 18+

Install Node.js 18 or newer.

Verify:

```bash
node --version
npm --version
```

---

### C. Wireshark / tshark / dumpcap

TraceLens NPA uses Wireshark command-line components for packet capture and analysis.

On Debian/Ubuntu/Kali-based systems:

```bash
sudo apt update
sudo apt install wireshark tshark
```

Verify:

```bash
tshark -v
dumpcap -v
```

Depending on your Linux distribution and security configuration, packet capture may require additional permissions.

---

### D. Ollama — Optional

Install Ollama if you want to use the local AI copilot.

Pull a model:

```bash
ollama pull llama3.1:8b
```

Verify:

```bash
curl http://localhost:11434/api/tags
```

---

## Linux Installation

Clone the repository:

```bash
git clone https://github.com/PrinceTyagiSec/tracelens-npa.git
cd tracelens-npa
```

Make the Linux scripts executable:

```bash
chmod +x scripts/linux/*.sh
```

Run the automated setup:

```bash
./scripts/linux/setup.sh
```

The setup script:

- Checks Python
- Creates the `.venv` virtual environment
- Installs Python dependencies
- Checks Node.js and npm
- Installs frontend dependencies
- Checks packet-capture tools

---

## Linux Launch

### 1-Click Launch

```bash
./scripts/linux/start_all.sh
```

This starts:

- FastAPI backend on `http://127.0.0.1:8000`
- Vite frontend on `http://localhost:5173`

The script attempts to open the application in the default browser.

### Manual Launch

**Backend:**

```bash
./scripts/linux/start_backend.sh
```

**Frontend:**

```bash
./scripts/linux/start_frontend.sh
```

Open:

```text
http://localhost:5173
```

---

# 3. Project Structure

The platform-specific scripts are organized as follows:

```text
TraceLens NPA/
├── backend/
├── frontend/
├── requirements.txt
├── .venv/
└── scripts/
    ├── windows/
    │   ├── setup.ps1
    │   ├── start_all.ps1
    │   ├── start_backend.ps1
    │   └── start_frontend.ps1
    └── linux/
        ├── setup.sh
        ├── start_all.sh
        ├── start_backend.sh
        └── start_frontend.sh
```

---

# 4. Troubleshooting

## Windows

### `tshark` not found

Verify that Wireshark is installed:

```powershell
Test-Path "C:\Program Files\Wireshark\tshark.exe"
```

If the file exists but `tshark` is not available from the terminal, the standard Wireshark installation path can be used.

### Live capture permission errors

Ensure:

- Npcap is installed.
- WinPcap API-compatible mode is enabled if required.
- The terminal has appropriate privileges for the selected interface.

---

## Linux

### `tshark` or `dumpcap` not found

Install Wireshark:

```bash
sudo apt update
sudo apt install wireshark tshark
```

Verify:

```bash
tshark -v
dumpcap -v
```

### Live capture permission errors

Packet capture may require additional privileges.

Check:

```bash
dumpcap -D
```

If necessary, run the capture component with appropriate system permissions.

### Scripts are not executable

Run:

```bash
chmod +x scripts/linux/*.sh
```

---

# 5. Accessing the Application

Once the backend and frontend are running:

**Frontend:**

```text
http://localhost:5173
```

**Backend API:**

```text
http://127.0.0.1:8000
```

TraceLens NPA is designed to run locally. PCAP analysis, packet processing, and the optional Ollama AI copilot operate on the local system.
