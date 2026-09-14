import React from 'react';
import {
  Activity, Shield, FileUp, Sparkles, Settings, BarChart2,
  Play, Square, Terminal, HelpCircle, HardDrive, RefreshCw
} from 'lucide-react';
import { SystemHealth } from '../../types';

interface HeaderProps {
  health: SystemHealth | null;
  onOpenUpload: () => void;
  onLoadSample: () => void;
  onToggleLiveModal: () => void;
  onOpenStatistics: () => void;
  onOpenSecurity: () => void;
  onOpenAiChat: () => void;
  onOpenAiReport: () => void;
  onOpenSettings: () => void;
  onOpenStream: () => void;
  isCapturing: boolean;
  onStopCapture: () => void;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  onOpenUpload,
  onLoadSample,
  onToggleLiveModal,
  onOpenStatistics,
  onOpenSecurity,
  onOpenAiChat,
  onOpenAiReport,
  onOpenSettings,
  onOpenStream,
  isCapturing,
  onStopCapture,
  onRefresh
}) => {
  return (
    <header className="bg-[#0f172a] border-b border-slate-800 text-slate-200 select-none">
      {/* Top Brand & Health Row */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base tracking-wide text-white">TraceLens</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 font-mono font-semibold border border-sky-500/30">
                NPA v1.0
              </span>
              <span className="text-xs text-slate-400 hidden md:inline">Network Traffic Analyzer</span>
            </div>
          </div>
        </div>

        {/* System & Engine Health Badges */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <div className="flex items-center px-2 py-1 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-400 mr-1.5">Backend:</span>
            <span className={health?.backend === 'ok' ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>
              {health?.backend === 'ok' ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <div className="flex items-center px-2 py-1 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-400 mr-1.5">Capture:</span>
            <span className={health?.packet_engine === 'ok' ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
              {health?.packet_engine === 'ok' ? 'tshark ✓' : 'Degraded'}
            </span>
          </div>

          <div className="flex items-center px-2 py-1 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-400 mr-1.5">Npcap:</span>
            <span className={health?.live_capture === 'ok' ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
              {health?.live_capture === 'ok' ? 'READY' : 'N/A'}
            </span>
          </div>

          <div className="flex items-center px-2 py-1 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-400 mr-1.5">Ollama AI:</span>
            <span className={health?.ollama === 'ok' ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>
              {health?.ollama === 'ok' ? 'LOCAL ✓' : 'OFFLINE'}
            </span>
          </div>

          <button
            onClick={onRefresh}
            title="Refresh State"
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Menu / Action Toolbar */}
      <div className="flex items-center justify-between px-3 py-1 bg-slate-950/80 border-t border-slate-850 text-xs">
        <div className="flex items-center space-x-1">
          {/* File Actions */}
          <button
            onClick={onOpenUpload}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <FileUp className="w-3.5 h-3.5 text-sky-400" />
            <span>Open PCAP</span>
          </button>

          <button
            onClick={onLoadSample}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span>Load Sample</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Capture Actions */}
          {isCapturing ? (
            <button
              onClick={onStopCapture}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-colors"
            >
              <Square className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
              <span>Stop Capture</span>
            </button>
          ) : (
            <button
              onClick={onToggleLiveModal}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span>Live Capture</span>
            </button>
          )}

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Statistics */}
          <button
            onClick={onOpenStatistics}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Statistics</span>
          </button>

          {/* Security */}
          <button
            onClick={onOpenSecurity}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-rose-400" />
            <span>Security Findings</span>
          </button>

          {/* Stream Follower */}
          <button
            onClick={onOpenStream}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-purple-400" />
            <span>Follow Stream</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* AI Copilot */}
          <button
            onClick={onOpenAiChat}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-sky-500/10 text-sky-300 border border-sky-500/25 hover:bg-sky-500/20 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold">AI Copilot</span>
          </button>

          <button
            onClick={onOpenAiReport}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <span>AI Report</span>
          </button>
        </div>

        {/* Right Settings */}
        <div className="flex items-center space-x-1">
          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
