# Windows Setup Guide for TraceLens Network Analyzer

This guide details the complete step-by-step setup to run TraceLens NPA natively on Windows 10/11.

---

## 1. Prerequisites

### A. Python 3.10+
Download and install from [python.org](https://www.python.org/downloads/).
> Ensure you check **"Add python.exe to PATH"** during setup.

### B. Node.js (LTS or Latest)
Download and install from [nodejs.org](https://nodejs.org/).

### C. Wireshark & Npcap
1. Download Wireshark from [wireshark.org](https://www.wireshark.org/download.html).
2. During installation:
   - Check **"Install Npcap"** (select **"Support raw 802.11 traffic"** and **"WinPcap API-compatible mode"**).
   - Ensure `tshark` is selected under components.
   - Standard path: `C:\Program Files\Wireshark\tshark.exe`.
3. Verify in PowerShell:
   ```powershell
   tshark -v
   ```

### D. Ollama (Local AI Engine)
1. Download from [ollama.ai](https://ollama.ai/download/windows).
2. Start Ollama and pull your model of choice:
   ```powershell
   ollama pull llama3.1:8b
   ```
3. Test connectivity:
   ```powershell
   curl.exe http://localhost:11434/api/tags
   ```

---

## 2. Install Project Dependencies

From the repository root:

```powershell
# Python backend packages
pip install -r requirements.txt

# Frontend packages
cd frontend
npm install
cd ..
```

---

## 3. Launching TraceLens NPA

Run the launch script:
```powershell
./scripts/start_all.ps1
```

Or run in separate terminals:

**Terminal 1 (Backend)**:
```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

**Terminal 2 (Frontend)**:
```powershell
cd frontend
npm run dev
```

Open your browser at `http://localhost:5173`.
