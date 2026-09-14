import React, { useState, useEffect, useCallback } from 'react';
import {
  Header, StatusBar, UploadModal, CommandPalette
} from './components/common';
import { DisplayFilterBar } from './components/filter/DisplayFilterBar';
import { PacketTable } from './components/packet/PacketTable';
import { PacketDetails } from './components/packet/PacketDetails';
import { PacketBytes } from './components/packet/PacketBytes';
import { LiveCaptureModal } from './components/capture/LiveCaptureModal';
import { StatisticsModal } from './components/statistics/StatisticsModal';
import { StreamModal } from './components/inspectors/StreamModal';
import { SecurityFindingsPanel } from './components/security/SecurityFindingsPanel';
import { AiAssistantDrawer } from './components/ai/AiAssistantDrawer';
import { AiReportModal } from './components/ai/AiReportModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { api } from './services/api';
import { wsClient, WsEvent } from './services/ws';
import {
  CaptureSummary, PacketSummary, PacketDetail, SystemHealth, SecurityFinding
} from './types';
import {
  FileUp, HardDrive, Play, Square, BarChart2, Shield, Terminal, Sparkles, Settings
} from 'lucide-react';

export const App: React.FC = () => {
  // Capture & Packets State
  const [currentCapture, setCurrentCapture] = useState<CaptureSummary | null>(null);
  const [packets, setPackets] = useState<PacketSummary[]>([]);
  const [filteredPackets, setFilteredPackets] = useState<PacketSummary[]>([]);
  const [displayFilter, setDisplayFilter] = useState('');
  const [selectedPacketNo, setSelectedPacketNo] = useState<number | null>(null);
  const [selectedPacketDetail, setSelectedPacketDetail] = useState<PacketDetail | null>(null);

  // Live Capture State
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [liveStats, setLiveStats] = useState({
    total_packets: 0,
    total_bytes: 0,
    packet_rate: 0,
    byte_rate: 0,
    duration: 0
  });

  // System & Health
  const [health, setHealth] = useState<SystemHealth | null>(null);

  // Modals & Panels Visibility
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [isStatisticsOpen, setIsStatisticsOpen] = useState(false);
  const [isStreamOpen, setIsStreamOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isAiReportOpen, setIsAiReportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | undefined>(undefined);

  // Vertical split ratio between packet table and details/hex panels
  const [splitRatio, setSplitRatio] = useState(55); // 55% table, 45% details

  // 1. Initial health & capture load
  useEffect(() => {
    checkHealth();
    loadLatestOrSampleCapture();
    wsClient.connect();

    const unsubscribe = wsClient.subscribe(handleWsEvent);
    return () => {
      unsubscribe();
      wsClient.disconnect();
    };
  }, []);

  const checkHealth = async () => {
    try {
      const h = await api.getHealth();
      setHealth(h);
    } catch {
      setHealth(null);
    }
  };

  const loadLatestOrSampleCapture = async () => {
    try {
      const list = await api.listCaptures();
      if (list.length > 0) {
        selectCapture(list[0]);
      } else {
        // Auto-generate sample capture if database is empty
        handleLoadSample();
      }
    } catch {
      // Ignore
    }
  };

  const selectCapture = async (cap: CaptureSummary) => {
    setCurrentCapture(cap);
    try {
      const pkts = await api.getPackets(cap.id, { limit: 10000 });
      setPackets(pkts);
      setFilteredPackets(pkts);
      if (pkts.length > 0) {
        handleSelectPacket(pkts[0].packet_no, cap.id);
      }
    } catch {
      // Ignore
    }
  };

  // 2. Load packet details when a packet is selected
  const handleSelectPacket = async (packetNo: number, captureId?: string) => {
    const cId = captureId || currentCapture?.id;
    if (!cId) return;
    setSelectedPacketNo(packetNo);
    try {
      const detail = await api.getPacketDetail(cId, packetNo);
      setSelectedPacketDetail(detail);
    } catch {
      setSelectedPacketDetail(null);
    }
  };

  // 3. WebSocket Event Handler for Live Capture
  const handleWsEvent = useCallback((event: WsEvent) => {
    if (event.type === 'packet') {
      setPackets((prev) => {
        const next = [...prev, event.data];
        // Apply display filter in real-time if active
        if (!displayFilter) {
          setFilteredPackets(next);
        }
        return next;
      });
    } else if (event.type === 'statistics_update') {
      setLiveStats(event.data);
    } else if (event.type === 'capture_started') {
      setIsCapturing(true);
      setIsPaused(false);
    } else if (event.type === 'capture_stopped') {
      setIsCapturing(false);
      setIsPaused(false);
    }
  }, [displayFilter]);

  // 4. Filter Evaluation
  const handleApplyFilter = async (filterExpr: string) => {
    setDisplayFilter(filterExpr);
    if (!filterExpr.trim()) {
      setFilteredPackets(packets);
      return;
    }
    if (!currentCapture) return;

    try {
      const res = await api.evaluateFilter(currentCapture.id, filterExpr);
      const matchSet = new Set(res.matching_packet_numbers);
      const matched = packets.filter((p) => matchSet.has(p.packet_no));
      setFilteredPackets(matched);
      if (matched.length > 0) {
        handleSelectPacket(matched[0].packet_no);
      }
    } catch {
      // Fallback
    }
  };

  const handleClearFilter = () => {
    setDisplayFilter('');
    setFilteredPackets(packets);
  };

  const handleAiGenerateFilter = async (prompt: string): Promise<string | null> => {
    if (!currentCapture) return null;
    try {
      const res = await api.generateFilterWithAi(prompt, currentCapture.id);
      return res.filter_expr;
    } catch {
      return null;
    }
  };

  // 5. Actions
  const handleLoadSample = async () => {
    try {
      const cap = await api.generateSampleCapture();
      // Poll until ready
      let ready = false;
      while (!ready) {
        await new Promise((r) => setTimeout(r, 600));
        const updated = await api.getCapture(cap.id);
        if (updated.status === 'ready') {
          ready = true;
          selectCapture(updated);
        }
      }
    } catch {
      // Ignore
    }
  };

  const handleToggleMark = async (packetNo: number, marked: boolean) => {
    if (!currentCapture) return;
    try {
      await api.updatePacketComment(currentCapture.id, packetNo, { marked });
      setPackets((prev) =>
        prev.map((p) => (p.packet_no === packetNo ? { ...p, marked } : p))
      );
      setFilteredPackets((prev) =>
        prev.map((p) => (p.packet_no === packetNo ? { ...p, marked } : p))
      );
    } catch {
      // Ignore
    }
  };

  const handleExplainWithAi = (packetNo: number) => {
    setSelectedPacketNo(packetNo);
    setAiInitialPrompt(`Explain packet #${packetNo} in detail. What is the source doing and are there any security implications?`);
    setIsAiChatOpen(true);
  };

  const handleAskAiAboutFinding = (finding: SecurityFinding) => {
    setAiInitialPrompt(
      `Please explain the security finding "${finding.title}" (${finding.severity} severity) detected in packet(s) ${finding.affected_packets.join(', ')}. Evidence:\n${finding.evidence}`
    );
    setIsAiChatOpen(true);
  };

  // Live capture controls
  const handleStartLiveCapture = async (interfaceId: string, bpfFilter: string, snaplen: number) => {
    try {
      setPackets([]);
      setFilteredPackets([]);
      setSelectedPacketNo(null);
      setSelectedPacketDetail(null);
      await api.startCapture(interfaceId, bpfFilter, snaplen);
      setIsCapturing(true);
      setIsPaused(false);
      setIsLiveModalOpen(false);
    } catch (err: any) {
      alert('Live capture error: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handlePauseCapture = async () => {
    await api.pauseCapture();
    setIsPaused(true);
  };

  const handleResumeCapture = async () => {
    await api.resumeCapture();
    setIsPaused(false);
  };

  const handleStopCapture = async () => {
    const res = await api.stopCapture();
    setIsCapturing(false);
    setIsPaused(false);
    // Reload capture from backend
    if (res.capture_id) {
      setTimeout(() => {
        loadLatestOrSampleCapture();
      }, 1000);
    }
  };

  // 6. Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        setIsUploadOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        if (isCapturing) {
          handleStopCapture();
        } else {
          setIsLiveModalOpen(true);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setIsAiChatOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsUploadOpen(false);
        setIsLiveModalOpen(false);
        setIsStatisticsOpen(false);
        setIsStreamOpen(false);
        setIsSecurityOpen(false);
        setIsAiChatOpen(false);
        setIsAiReportOpen(false);
        setIsSettingsOpen(false);
        setIsCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCapturing]);

  // Command palette items
  const commands = [
    {
      id: 'open-pcap',
      title: 'Open PCAP / PCAPNG File',
      category: 'File',
      shortcut: 'Ctrl+O',
      icon: <FileUp className="w-4 h-4 text-sky-400" />,
      action: () => setIsUploadOpen(true)
    },
    {
      id: 'load-sample',
      title: 'Load Multi-Protocol Sample PCAP',
      category: 'File',
      icon: <HardDrive className="w-4 h-4 text-emerald-400" />,
      action: handleLoadSample
    },
    {
      id: 'toggle-capture',
      title: isCapturing ? 'Stop Live Capture' : 'Start Live Packet Capture',
      category: 'Capture',
      shortcut: 'Ctrl+E',
      icon: isCapturing ? <Square className="w-4 h-4 text-rose-400" /> : <Play className="w-4 h-4 text-emerald-400" />,
      action: isCapturing ? handleStopCapture : () => setIsLiveModalOpen(true)
    },
    {
      id: 'statistics',
      title: 'View Network Statistics & I/O Graph',
      category: 'Analysis',
      icon: <BarChart2 className="w-4 h-4 text-amber-400" />,
      action: () => setIsStatisticsOpen(true)
    },
    {
      id: 'security-findings',
      title: 'View Threat Detections & Risk Score',
      category: 'Security',
      icon: <Shield className="w-4 h-4 text-rose-400" />,
      action: () => setIsSecurityOpen(true)
    },
    {
      id: 'follow-stream',
      title: 'Follow TCP / UDP Stream',
      category: 'Inspect',
      icon: <Terminal className="w-4 h-4 text-purple-400" />,
      action: () => setIsStreamOpen(true)
    },
    {
      id: 'ai-copilot',
      title: 'Open Local AI Security Copilot',
      category: 'AI',
      shortcut: 'Ctrl+Shift+A',
      icon: <Sparkles className="w-4 h-4 text-sky-400" />,
      action: () => setIsAiChatOpen(true)
    },
    {
      id: 'ai-report',
      title: 'Generate Full AI Security Report',
      category: 'AI',
      icon: <Shield className="w-4 h-4 text-sky-400" />,
      action: () => setIsAiReportOpen(true)
    },
    {
      id: 'settings',
      title: 'Workstation Diagnostics & Settings',
      category: 'System',
      icon: <Settings className="w-4 h-4 text-slate-400" />,
      action: () => setIsSettingsOpen(true)
    }
  ];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0b0f19] text-slate-100 select-none">
      {/* 1. Header Toolbar */}
      <Header
        health={health}
        onOpenUpload={() => setIsUploadOpen(true)}
        onLoadSample={handleLoadSample}
        onToggleLiveModal={() => setIsLiveModalOpen(true)}
        onOpenStatistics={() => setIsStatisticsOpen(true)}
        onOpenSecurity={() => setIsSecurityOpen(true)}
        onOpenAiChat={() => {
          setAiInitialPrompt(undefined);
          setIsAiChatOpen(true);
        }}
        onOpenAiReport={() => setIsAiReportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenStream={() => setIsStreamOpen(true)}
        isCapturing={isCapturing}
        onStopCapture={handleStopCapture}
        onRefresh={() => {
          checkHealth();
          if (currentCapture) selectCapture(currentCapture);
        }}
      />

      {/* 2. Display Filter Bar */}
      <DisplayFilterBar
        currentFilter={displayFilter}
        onApplyFilter={handleApplyFilter}
        onClearFilter={handleClearFilter}
        onAiGenerateFilter={handleAiGenerateFilter}
      />

      {/* 3. Main 3-Panel Workstation Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Panel: Packet Table */}
        <div style={{ height: `${splitRatio}%` }} className="flex flex-col overflow-hidden border-b border-slate-800">
          <PacketTable
            packets={filteredPackets}
            selectedPacketNo={selectedPacketNo}
            onSelectPacket={(pNo) => handleSelectPacket(pNo)}
            onToggleMark={handleToggleMark}
            onAddComment={(pNo) => {
              const comment = prompt('Enter packet comment:');
              if (comment !== null && currentCapture) {
                api.updatePacketComment(currentCapture.id, pNo, { comment }).then(() => {
                  setPackets((prev) =>
                    prev.map((p) => (p.packet_no === pNo ? { ...p, comment } : p))
                  );
                  setFilteredPackets((prev) =>
                    prev.map((p) => (p.packet_no === pNo ? { ...p, comment } : p))
                  );
                });
              }
            }}
            onExplainWithAi={handleExplainWithAi}
            onFollowStream={(pNo) => setIsStreamOpen(true)}
          />
        </div>

        {/* Resizer Handle */}
        <div
          onMouseDown={(e) => {
            const startY = e.clientY;
            const startRatio = splitRatio;
            const onMouseMove = (moveEvent: MouseEvent) => {
              const delta = moveEvent.clientY - startY;
              const newRatio = Math.min(80, Math.max(25, startRatio + (delta / window.innerHeight) * 100));
              setSplitRatio(newRatio);
            };
            const onMouseUp = () => {
              window.removeEventListener('mousemove', onMouseMove);
              window.removeEventListener('mouseup', onMouseUp);
            };
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
          }}
          className="h-1 bg-slate-800 hover:bg-sky-500 cursor-row-resize transition-colors z-10 shrink-0"
        />

        {/* Bottom Split: Packet Details (Left) + Packet Bytes (Right) */}
        <div style={{ height: `${100 - splitRatio}%` }} className="flex-1 flex flex-row overflow-hidden">
          {/* Packet Details Tree */}
          <div className="w-1/2 flex flex-col border-r border-slate-800 overflow-hidden">
            <PacketDetails
              layers={selectedPacketDetail?.raw_layers || []}
              packetNo={selectedPacketNo}
              onExplainWithAi={handleExplainWithAi}
            />
          </div>

          {/* Packet Bytes Hex / ASCII */}
          <div className="w-1/2 flex flex-col overflow-hidden">
            <PacketBytes
              hexDump={selectedPacketDetail?.hex_dump || ''}
              asciiDump={selectedPacketDetail?.ascii_dump || ''}
              rawHex={selectedPacketDetail?.raw_hex || ''}
              packetNo={selectedPacketNo}
            />
          </div>
        </div>
      </main>

      {/* 4. Bottom Status Bar */}
      <StatusBar
        totalPackets={packets.length}
        filteredPackets={filteredPackets.length}
        selectedPacket={
          selectedPacketNo ? packets.find((p) => p.packet_no === selectedPacketNo) || null : null
        }
        captureFilename={currentCapture?.filename || null}
        isCapturing={isCapturing}
        packetRate={liveStats.packet_rate}
        byteRate={liveStats.byte_rate}
      />

      {/* 5. Modals & Dialogs */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={(cap) => selectCapture(cap)}
      />

      <LiveCaptureModal
        isOpen={isLiveModalOpen}
        onClose={() => setIsLiveModalOpen(false)}
        isCapturing={isCapturing}
        isPaused={isPaused}
        onStartCapture={handleStartLiveCapture}
        onPauseCapture={handlePauseCapture}
        onResumeCapture={handleResumeCapture}
        onStopCapture={handleStopCapture}
        captureStats={liveStats}
      />

      <StatisticsModal
        isOpen={isStatisticsOpen}
        onClose={() => setIsStatisticsOpen(false)}
        captureId={currentCapture?.id || null}
        onApplyFilter={handleApplyFilter}
      />

      <StreamModal
        isOpen={isStreamOpen}
        onClose={() => setIsStreamOpen(false)}
        captureId={currentCapture?.id || null}
        initialStreamId={0}
      />

      <SecurityFindingsPanel
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
        captureId={currentCapture?.id || null}
        onSelectPacket={(pNo) => handleSelectPacket(pNo)}
        onAskAiAboutFinding={handleAskAiAboutFinding}
      />

      <AiAssistantDrawer
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
        captureId={currentCapture?.id || null}
        selectedPacketNo={selectedPacketNo}
        onSelectPacket={(pNo) => handleSelectPacket(pNo)}
        initialPrompt={aiInitialPrompt}
      />

      <AiReportModal
        isOpen={isAiReportOpen}
        onClose={() => setIsAiReportOpen(false)}
        captureId={currentCapture?.id || null}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={commands}
      />
    </div>
  );
};

export default App;
