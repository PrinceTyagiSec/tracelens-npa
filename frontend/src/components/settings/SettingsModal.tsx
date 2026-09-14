import React, { useState, useEffect } from 'react';
import { X, Settings, CheckCircle2, AlertCircle, FileText, Cpu, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'system' | 'logs' | 'ai'>('system');
  const [sysStatus, setSysStatus] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'system') {
        const data = await api.getSystemStatus();
        setSysStatus(data);
      } else if (activeTab === 'logs') {
        const data = await api.getSystemLogs();
        setLogs(data);
      } else if (activeTab === 'ai') {
        const data = await api.getAiStatus();
        setSysStatus((prev: any) => ({ ...prev, ai: data }));
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-xl w-full max-w-3xl h-[75vh] overflow-hidden shadow-2xl flex flex-col text-xs font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0f172a] border-b border-slate-800 text-slate-200">
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-sm text-white">Workstation Settings & Diagnostics</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 px-4 py-2 bg-slate-900 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('system')}
            className={`px-3 py-1.5 rounded transition-colors ${
              activeTab === 'system' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Packet Capture Engine
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-3 py-1.5 rounded transition-colors ${
              activeTab === 'ai' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Local Ollama AI
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded transition-colors ${
              activeTab === 'logs' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            System Logs
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-[#0a0e17]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              <span>Querying system...</span>
            </div>
          ) : activeTab === 'system' && sysStatus ? (
            <div className="space-y-4">
              <div className="border border-slate-800 rounded-lg p-3 bg-slate-900/50 space-y-2">
                <span className="font-bold text-slate-200 text-xs block mb-1">Host Operating System:</span>
                <div className="text-slate-400 text-[11px]">
                  OS: <span className="text-slate-200">{sysStatus.os?.system} {sysStatus.os?.release} ({sysStatus.os?.architecture})</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Python: <span className="text-slate-200">{sysStatus.os?.python_version}</span>
                </div>
              </div>

              <div className="border border-slate-800 rounded-lg p-3 bg-slate-900/50 space-y-2">
                <span className="font-bold text-slate-200 text-xs block mb-1">Packet Capture Engine Status:</span>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {sysStatus.dependencies?.tshark?.installed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span className="text-slate-200 font-semibold">tshark (Wireshark Dissector):</span>
                    <span className="text-slate-400 truncate text-[11px]">{sysStatus.dependencies?.tshark?.path || 'Not detected'}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {sysStatus.dependencies?.dumpcap?.installed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span className="text-slate-200 font-semibold">dumpcap (Live Capture Worker):</span>
                    <span className="text-slate-400 truncate text-[11px]">{sysStatus.dependencies?.dumpcap?.path || 'Not detected'}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {sysStatus.dependencies?.npcap?.installed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span className="text-slate-200 font-semibold">Npcap Driver:</span>
                    <span className="text-slate-400 truncate text-[11px]">{sysStatus.dependencies?.npcap?.details || 'Required for live Windows capture'}</span>
                  </div>
                </div>
              </div>

              <div className="border border-slate-800 rounded-lg p-3 bg-slate-900/50">
                <span className="text-emerald-400 font-semibold block">{sysStatus.capabilities?.notes}</span>
              </div>
            </div>
          ) : activeTab === 'ai' ? (
            <div className="space-y-4">
              <div className="border border-slate-800 rounded-lg p-3 bg-slate-900/50 space-y-2">
                <span className="font-bold text-slate-200 text-xs block mb-1">Local Ollama AI Endpoint:</span>
                <div className="text-slate-300 text-xs">
                  Default URL: <code className="bg-slate-950 px-2 py-0.5 rounded text-sky-300">http://localhost:11434</code>
                </div>
                <div className="text-slate-400 text-[11px]">
                  All AI processing runs 100% on your local machine. No packet data or telemetry is ever uploaded to external cloud APIs.
                </div>
              </div>
            </div>
          ) : (
            /* Logs */
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 h-full overflow-y-auto text-[11px] font-mono leading-relaxed select-text">
              {logs.length === 0 ? (
                <div className="text-slate-500">No log entries available.</div>
              ) : (
                logs.map((line, idx) => <div key={idx}>{line}</div>)
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
